import json
import time
from unittest import mock

import pytest

import capability_import_jobs as jobs
import website_extractor as wx

BASE = 'https://acme-fed.com'

HOME = """
<html><head><title>Acme Federal Solutions | IT Services for Government</title>
<meta name="description" content="Acme Federal Solutions delivers cybersecurity, cloud migration and IT modernization services to federal agencies since 2005.">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Acme Federal Solutions",
 "telephone":"(703) 555-0142","email":"info@acme-fed.com",
 "address":{"@type":"PostalAddress","streetAddress":"123 Main St Suite 400","addressLocality":"Arlington","addressRegion":"VA","postalCode":"22201"}}</script>
</head><body>
<nav><a href="/about">About</a><a href="/services">Services</a><a href="/contact">Contact Us</a>
<a href="/blog/post-1">Blog</a><a href="/careers">Careers</a><a href="https://linkedin.com/company/acme">LinkedIn</a>
<a href="/docs/Acme-Capability-Statement.pdf">Capability Statement (PDF)</a></nav>
<main><h1>Mission-focused IT for federal agencies</h1><p>We help agencies modernize.</p>
<img src="/img/hubzone-seal.png" alt="HUBZone Certified Small Business">
<div style="display:none">Hidden 999999 nonsense</div>
</main>
<footer>123 Main St Suite 400, Arlington, VA 22201 &middot; UEI: ABCD1234EFGH &middot; CAGE: 1A2B3</footer>
</body></html>
"""

SERVICES = """
<html><head><title>Services - Acme Federal Solutions</title></head><body>
<main><h2>Core Competencies</h2>
<ul><li>Cybersecurity &amp; Zero Trust Architecture</li><li>Cloud Migration (AWS GovCloud)</li><li>Agile Software Development</li></ul>
<h2>NAICS Codes</h2><table><tr><td>541512</td><td>Computer Systems Design Services</td></tr>
<tr><td>541519</td><td>Other Computer Related Services</td></tr></table>
<h2>Certifications</h2><p>SBA 8(a) certified, ISO 9001:2015, CMMI Level 3</p>
</main></body></html>
"""

CONTACT = """
<html><head><title>Contact</title></head><body>
<main><h1>Contact Us</h1><p>Jane Doe, Director of Business Development</p>
<p><a href="mailto:jane.doe@acme-fed.com">jane.doe@acme-fed.com</a> | <a href="tel:+17035550142">703-555-0142</a></p>
</main></body></html>
"""

SITE = {
    f'{BASE}/': HOME,
    f'{BASE}/services': SERVICES,
    f'{BASE}/contact': CONTACT,
}


def ok_validator(url):
    return True, None


def make_fetch(site, failures=(), slow=()):
    def fake_fetch(url, url_validator, max_bytes=None, timeout=None):
        ok, err = url_validator(url)
        if not ok:
            raise ValueError(err)
        key = url.rstrip('/') + '/' if url.rstrip('/') == BASE else url.rstrip('/')
        if key in failures:
            raise ConnectionError('boom')
        if key in slow:
            time.sleep(3)
        if key not in site:
            raise ValueError('404')
        return 'html', site[key].encode('utf-8'), url
    return fake_fetch


def crawl_texts(pages):
    return ' '.join(p['url'] for p in pages)


# --------------------------------------------------------------------------
# Link prioritisation / crawl
# --------------------------------------------------------------------------
def test_discover_internal_links_prioritises_and_filters():
    soup = wx.BeautifulSoup(HOME, 'html.parser')
    links, pdfs = wx.discover_internal_links(soup, f'{BASE}/')
    assert links[:3] == [f'{BASE}/about', f'{BASE}/services', f'{BASE}/contact']
    assert all('linkedin' not in l and '/blog/' not in l and '/careers' not in l for l in links)
    assert pdfs == [f'{BASE}/docs/Acme-Capability-Statement.pdf']


def test_round_robin_prevents_one_section_dominating():
    html = '<html><body>' + ''.join(
        f'<a href="/about/sub{i}">About {i}</a>' for i in range(10)
    ) + '<a href="/services">Services</a><a href="/contact">Contact</a></body></html>'
    links, _ = wx.discover_internal_links(wx.BeautifulSoup(html, 'html.parser'), f'{BASE}/')
    top = links[:wx.MAX_PAGES - 1]
    assert f'{BASE}/services' in top and f'{BASE}/contact' in top


def test_crawl_limits_pages_and_survives_failed_internal_pages():
    with mock.patch.object(wx, 'fetch_url', make_fetch(SITE, failures={f'{BASE}/about'})):
        pages = wx.crawl_site(f'{BASE}/', ok_validator, max_pages=3)
    urls = [p['url'] for p in pages]
    assert urls[0] == f'{BASE}/'
    assert f'{BASE}/services' in urls and f'{BASE}/about' not in urls
    assert len(pages) <= 3


def test_crawl_respects_deadline():
    slow_site = dict(SITE)
    slow_site[f'{BASE}/about'] = '<html><body>about</body></html>'
    with mock.patch.object(wx, 'fetch_url', make_fetch(slow_site, slow={f'{BASE}/about', f'{BASE}/services'})):
        started = time.monotonic()
        pages = wx.crawl_site(f'{BASE}/', ok_validator, deadline_s=1.0)
    assert time.monotonic() - started < 2.5
    assert pages[0]['url'] == f'{BASE}/'


def test_crawl_ssrf_blocks_internal_pages():
    def validator(url):
        return ('/contact' not in url), 'blocked'
    with mock.patch.object(wx, 'fetch_url', make_fetch(SITE)):
        pages = wx.crawl_site(f'{BASE}/', validator)
    assert all('/contact' not in p['url'] for p in pages)


def test_landing_failure_raises_extraction_error():
    with mock.patch.object(wx, 'fetch_url', make_fetch({})):
        with pytest.raises((wx.ExtractionError, ValueError)):
            wx.extract_capability_from_website(f'{BASE}/', url_validator=ok_validator)


# --------------------------------------------------------------------------
# Structure-preserving HTML -> text
# --------------------------------------------------------------------------
def test_soup_to_text_keeps_headings_lists_tables_and_drops_hidden():
    soup = wx.BeautifulSoup(SERVICES, 'html.parser')
    wx.clean_soup(soup)
    text, _ = wx.extract_page_text(soup)
    assert '## Core Competencies' in text
    assert '- Cybersecurity & Zero Trust Architecture' in text
    assert '541512 | Computer Systems Design Services' in text

    home = wx.BeautifulSoup(HOME, 'html.parser')
    wx.clean_soup(home)
    home_text, footer = wx.extract_page_text(home)
    assert '999999' not in home_text
    assert 'HUBZone Certified' in home_text  # alt text of certification seal
    assert 'UEI: ABCD1234EFGH' in footer


def test_structured_data_from_jsonld_and_contact_links():
    data = wx.structured_data_from_soup(wx.BeautifulSoup(HOME, 'html.parser'), f'{BASE}/')
    assert data['companyName'] == 'Acme Federal Solutions'
    assert data['email'] == 'info@acme-fed.com'
    assert data['city'] == 'Arlington' and data['state'] == 'VA' and data['zipCode'] == '22201'
    contact = wx.structured_data_from_soup(wx.BeautifulSoup(CONTACT, 'html.parser'), f'{BASE}/contact')
    assert contact['email'] == 'jane.doe@acme-fed.com'
    assert '7035550142' in wx._digits(contact['phone'])


def test_regex_fields_naics_certs_uei_cage():
    soup = wx.BeautifulSoup(SERVICES, 'html.parser')
    wx.clean_soup(soup)
    text, _ = wx.extract_page_text(soup)
    data = wx.regex_fields_from_text(text + '\nUEI: ABCD1234EFGH CAGE: 1A2B3')
    assert '541512' in ' '.join(data['naicsCodes']) and '541519' in ' '.join(data['naicsCodes'])
    assert {'8(a)', 'ISO 9001', 'CMMI'} <= set(data['certifications'])
    assert data['ueiCode'] == 'ABCD1234EFGH' and data['cageCode'] == '1A2B3'


# --------------------------------------------------------------------------
# End to end (deterministic only)
# --------------------------------------------------------------------------
def test_extract_without_ai_fills_fields_from_multiple_pages():
    with mock.patch.object(wx, 'fetch_url', make_fetch(SITE)):
        result = wx.extract_capability_from_website(BASE, url_validator=ok_validator)
    data = result['data']
    assert data['companyName'] == 'Acme Federal Solutions'
    assert data['website'] == BASE
    assert data['email'] == 'info@acme-fed.com'
    assert data['phone'] == '(703) 555-0142'
    assert data['city'] == 'Arlington' and data['state'] == 'VA' and data['zipCode'] == '22201'
    assert data['ueiCode'] == 'ABCD1234EFGH' and data['cageCode'] == '1A2B3'
    assert any(n.startswith('541512') for n in data['naicsCodes'])
    assert {'8(a)', 'HUBZone', 'ISO 9001', 'CMMI'} <= set(data['certifications'])
    assert result['used_ai'] is False
    assert f'{BASE}/services' in result['pages']
    assert result['sources']['email'] == 'structured'


# --------------------------------------------------------------------------
# AI grounding
# --------------------------------------------------------------------------
class FakeOpenAI:
    def __init__(self, payload=None, error=None):
        self.payload = payload
        self.error = error
        self.calls = []

    def with_options(self, **kw):
        self.calls.append(kw)
        return self

    class _Completions:
        def __init__(self, outer):
            self.outer = outer

        def create(self, **kwargs):
            self.outer.calls.append(kwargs)
            if self.outer.error:
                raise self.outer.error
            content = json.dumps(self.outer.payload)
            msg = mock.Mock()
            msg.message.content = content
            return mock.Mock(choices=[msg])

    @property
    def chat(self):
        return mock.Mock(completions=self._Completions(self))


def test_ai_output_is_grounded_and_hallucinations_dropped():
    payload = {
        'companyDescription': 'Acme Federal Solutions delivers cybersecurity, cloud migration and IT modernization services to federal agencies.',
        'competencies': ['Cybersecurity & Zero Trust Architecture', 'Cloud Migration (AWS GovCloud)',
                         'Quantum Computing Research'],          # last one not on the site
        'pastPerformance': ['Department of Defense - $50M ERP modernization'],  # invented
        'naicsCodes': ['541512 - Computer Systems Design Services', '236220 - Commercial Building Construction'],
        'certifications': ['8(a)', 'SDVOSB'],                    # SDVOSB not on the site
        'email': 'ceo@acme-fed.com',                             # not on the site
        'phone': '(703) 555-9999',
        'contactName': 'Jane Doe',
        'contactTitle': 'Director of Business Development',
        'ueiCode': 'ZZZZZZZZZZZZ',
        'state': 'TX',
        'industryFocus': 'Federal agencies',
    }
    client = FakeOpenAI(payload)
    with mock.patch.object(wx, 'fetch_url', make_fetch(SITE)):
        result = wx.extract_capability_from_website(BASE, openai_client=client, url_validator=ok_validator)
    data = result['data']
    assert result['used_ai'] is True
    assert client.calls and client.calls[-1]['response_format'] == {'type': 'json_object'}
    assert client.calls[-1]['temperature'] == 0
    assert data['competencies'] == ['Cybersecurity & Zero Trust Architecture', 'Cloud Migration (AWS GovCloud)']
    assert 'pastPerformance' not in data
    assert all(not n.startswith('236220') for n in data['naicsCodes'])
    assert 'SDVOSB' not in data['certifications'] and '8(a)' in data['certifications']
    assert data['email'] == 'info@acme-fed.com'      # deterministic wins
    assert data['phone'] == '(703) 555-0142'
    assert data['state'] == 'VA'
    assert data['ueiCode'] == 'ABCD1234EFGH'
    assert data['contactName'] == 'Jane Doe'
    assert data['contactTitle'] == 'Director of Business Development'
    assert result['sources']['competencies'] == 'ai'


def test_ai_failure_keeps_deterministic_result():
    client = FakeOpenAI(error=TimeoutError('llm timeout'))
    with mock.patch.object(wx, 'fetch_url', make_fetch(SITE)):
        result = wx.extract_capability_from_website(BASE, openai_client=client, url_validator=ok_validator)
    assert result['used_ai'] is False
    assert result['data']['companyName'] == 'Acme Federal Solutions'
    assert result['data']['email'] == 'info@acme-fed.com'


def test_ai_skipped_when_time_budget_exhausted():
    client = FakeOpenAI({'competencies': ['Cybersecurity & Zero Trust Architecture']})
    with mock.patch.object(wx, 'fetch_url', make_fetch(SITE)):
        result = wx.extract_capability_from_website(BASE, openai_client=client, url_validator=ok_validator,
                                                    time_budget=5)
    assert result['used_ai'] is False
    assert not any('response_format' in c for c in client.calls)


def test_validate_llm_output_rejects_garbage_types():
    g = wx.Grounder('Acme 541512 Arlington VA')
    assert wx.validate_llm_output('not a dict', g) == {}
    out = wx.validate_llm_output({'naicsCodes': 'NAICS 541512', 'state': 'va', 'zipCode': '99999',
                                  'competencies': [{'x': 1}, None]}, g)
    assert out == {'naicsCodes': ['541512'], 'state': 'VA'}


# --------------------------------------------------------------------------
# Job plumbing (fake Firebase)
# --------------------------------------------------------------------------
class FakeRef:
    def __init__(self, store, path):
        self.store = store
        self.path = path

    def _node(self):
        node = self.store
        for part in self.path.split('/'):
            if part:
                node = node.setdefault(part, {})
        return node

    def set(self, value):
        parent, key = self._parent()
        parent[key] = value

    def _parent(self):
        parts = [p for p in self.path.split('/') if p]
        node = self.store
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        return node, parts[-1]

    def get(self):
        parent, key = self._parent()
        return parent.get(key)

    def update(self, values):
        self._node().update(values)

    def transaction(self, fn):
        parent, key = self._parent()
        current = parent.get(key)
        result = fn(dict(current) if isinstance(current, dict) else current)
        if result is not None:
            parent[key] = result
        return result

    def order_by_child(self, child):
        raise RuntimeError('Index not defined')


class FakeDB:
    def __init__(self):
        self.store = {}

    def reference(self, path):
        return FakeRef(self.store, path)


def test_job_lifecycle_completed():
    db = FakeDB()
    job_id = jobs.create_job(db, 'user-1', BASE)
    assert db.reference(f'{jobs.JOB_PATH}/{job_id}').get()['status'] == 'queued'
    assert jobs.claim_job(db, job_id, 'worker-a')
    assert not jobs.claim_job(db, job_id, 'worker-b')  # lease held
    with mock.patch.object(wx, 'fetch_url', make_fetch(SITE)):
        jobs.process_job(db, job_id, 'worker-a', url_validator=ok_validator)
    job = db.reference(f'{jobs.JOB_PATH}/{job_id}').get()
    assert job['status'] == 'completed'
    assert job['result']['data']['companyName'] == 'Acme Federal Solutions'
    status = jobs.public_status(job_id, job)
    assert status['status'] == 'completed' and 'claimed_by' not in status
    assert status['result']['pages']


def test_job_error_is_controlled_not_raised():
    db = FakeDB()
    job_id = jobs.create_job(db, 'user-1', 'https://does-not-exist.example')
    assert jobs.claim_job(db, job_id, 'w')
    with mock.patch.object(wx, 'fetch_url', make_fetch({})):
        jobs.process_job(db, job_id, 'w', url_validator=ok_validator)
    job = db.reference(f'{jobs.JOB_PATH}/{job_id}').get()
    assert job['status'] == 'error' and job['error']
    assert jobs.public_status(job_id, job)['error'] == job['error']


def test_expired_lease_can_be_reclaimed_and_stale_cleanup():
    db = FakeDB()
    job_id = jobs.create_job(db, 'user-1', BASE)
    assert jobs.claim_job(db, job_id, 'dead-worker', lease_seconds=-1)
    assert jobs.find_and_process_one.__name__  # smoke
    with mock.patch.object(jobs, 'process_job') as proc:
        assert jobs.find_and_process_one(db, 'live-worker')
        proc.assert_called_once()
    job = db.reference(f'{jobs.JOB_PATH}/{job_id}').get()
    assert job['claimed_by'] == 'live-worker'

    job['last_heartbeat'] = time.time() - jobs.STALE_SECONDS - 5
    jobs.cleanup_stale(db)
    assert db.reference(f'{jobs.JOB_PATH}/{job_id}').get()['status'] == 'error'

"""Capability-statement extraction from a company website.

Standalone (no Flask) so it can run either in the web service or in the
background worker. Pipeline:

1. Bounded same-domain crawl: the landing page plus a handful of internal
   pages that usually hold capability-statement content (about, services,
   contact, certifications, past performance...). Pages are fetched
   concurrently under a hard global deadline and a per-page size cap.
2. Structure-preserving HTML -> text conversion (headings, list items and
   table rows survive) so both the regexes and the LLM see real sections.
3. Deterministic extraction from well-known conventions (JSON-LD, Open Graph,
   microdata, mailto:/tel:, footer address, UEI/CAGE/NAICS/certification
   patterns).
4. Optional LLM pass over the combined corpus (JSON mode, temperature 0) whose
   output is validated against the corpus: any value that cannot be grounded
   in the crawled text is discarded, so nothing is invented.

Deterministic values always win over LLM values.
"""

import ipaddress
import json
import logging
import re
import socket
import time
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup, Comment

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tunables (all bounded so a slow site can never hang a request or a worker)
# ---------------------------------------------------------------------------
MAX_PAGES = 8                 # landing page + up to 7 internal pages
MAX_PAGE_BYTES = 1_500_000    # per HTML page
MAX_PDF_BYTES = 6_000_000     # linked capability-statement PDF
PAGE_TIMEOUT = (6, 10)        # (connect, read) seconds per page
CRAWL_DEADLINE = 22.0         # seconds for the whole crawl
LLM_TIMEOUT = 35.0            # seconds for the OpenAI call
LLM_MAX_CORPUS_CHARS = 28_000
FETCH_WORKERS = 4
DEFAULT_TIME_BUDGET = 70.0

USER_AGENT = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
              '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

# Keyword -> priority. Lower sorts first. Matched against the URL path and the
# anchor text of internal links.
LINK_PRIORITIES = [
    (('capability', 'capabilities'), 0),
    (('about', 'who-we-are', 'who_we_are', 'company', 'overview', 'our-story', 'history', 'mission'), 1),
    (('service', 'solution', 'what-we-do', 'what_we_do', 'expertise', 'offering', 'practice', 'competenc'), 2),
    (('contact', 'location', 'office'), 3),
    (('certification', 'certified', 'naics', 'government', 'federal', 'gsa', 'contract-vehicle', 'contract_vehicle', 'set-aside', '8a', 'hubzone', 'sdvosb', 'wosb'), 4),
    (('past-performance', 'past_performance', 'performance', 'project', 'portfolio', 'client', 'customer', 'case-stud', 'case_stud', 'work', 'experience'), 5),
    (('team', 'leadership', 'management', 'staff', 'people', 'founder'), 6),
    (('differentiator', 'why-us', 'why_us', 'why-choose', 'advantage', 'approach', 'value'), 7),
    (('industr', 'market', 'sector'), 8),
]

SKIP_LINK_PATTERNS = re.compile(
    r'(login|sign-?in|sign-?up|register|cart|checkout|account|privacy|terms|cookie|'
    r'sitemap|feed|rss|wp-json|wp-admin|wp-login|\.xml$|\.jpg$|\.jpeg$|\.png$|\.gif$|'
    r'\.svg$|\.webp$|\.zip$|\.mp4$|\.mp3$|\.css$|\.js$|/tag/|/category/|/author/|'
    r'/page/\d|\?replytocom|#|mailto:|tel:|javascript:)', re.IGNORECASE)

STRIP_TAGS = ('script', 'style', 'noscript', 'svg', 'canvas', 'iframe', 'form',
              'button', 'input', 'select', 'textarea', 'template')
NOISE_CLASS_RE = re.compile(
    r'(cookie|consent|gdpr|popup|pop-up|modal|newsletter|subscribe|breadcrumb|'
    r'social-share|share-buttons|skip-link|screen-reader|sr-only|visually-hidden|'
    r'carousel-control|slick-dots|menu-toggle|hamburger|search-form|comment)', re.IGNORECASE)

CERTIFICATION_PATTERNS = [
    # (canonical label, regex)
    ('8(a)', r'\b8\s?\(\s?a\s?\)|\b8a\s+(?:certified|program|business|firm)|\bSBA\s+8\(a\)'),
    ('HUBZone', r'\bHUB\s?Zone\b'),
    ('SDVOSB', r'\bSDVOSB\b|Service[\s-]Disabled\s+Veteran[\s-]Owned'),
    ('VOSB', r'\bVOSB\b|\bVeteran[\s-]Owned\s+(?:Small\s+)?Business'),
    ('WOSB', r'\bWOSB\b|\bWoman[\s-]Owned\s+Small\s+Business|\bWomen[\s-]Owned\s+Small\s+Business'),
    ('EDWOSB', r'\bEDWOSB\b|Economically\s+Disadvantaged\s+Wom[ae]n[\s-]Owned'),
    ('SDB', r'\bSDB\b|\bSmall\s+Disadvantaged\s+Business\b'),
    ('WBENC', r'\bWBENC\b'),
    ('WBE', r'\bWBE\b|\bWoman[\s-]Owned\s+Business\s+Enterprise|\bWomen[\s-]Business\s+Enterprise'),
    ('MBE', r'\bMBE\b|\bMinority[\s-]Owned\s+Business\s+Enterprise|\bMinority\s+Business\s+Enterprise'),
    ('DBE', r'\bDBE\b|\bDisadvantaged\s+Business\s+Enterprise'),
    ('NMSDC', r'\bNMSDC\b'),
    ('GSA Schedule', r'\bGSA\s+(?:Schedule|MAS|Multiple\s+Award)\b'),
    ('ISO 9001', r'\bISO\s?9001'),
    ('ISO 14001', r'\bISO\s?14001'),
    ('ISO 27001', r'\bISO\s?27001'),
    ('ISO 20000', r'\bISO\s?20000'),
    ('ISO 45001', r'\bISO\s?45001'),
    ('AS9100', r'\bAS\s?9100'),
    ('CMMI', r'\bCMMI(?:\s*(?:Level|Maturity\s+Level|ML)?\s*[1-5])?\b'),
    ('CMMC', r'\bCMMC\b'),
    ('SOC 2', r'\bSOC\s?2\b'),
    ('FedRAMP', r'\bFedRAMP\b'),
    ('ITAR', r'\bITAR\b'),
    ('OSHA', r'\bOSHA\s+(?:certified|compliant|10|30)\b'),
    ('LEED', r'\bLEED\s+(?:AP|Certified|Gold|Silver|Platinum)\b'),
    ('MBE/DBE (state)', r'\bMBE/DBE\b'),
]

STOPWORDS = frozenset('''
a about above after again all also an and any are as at be because been before
being below between both but by can could did do does doing down during each few
for from further had has have having he her here hers him his how i if in into is
it its itself just me more most my no nor not of off on once only or other our
ours out over own same she should so some such than that the their theirs them
then there these they this those through to too under until up very was we were
what when where which while who whom why will with would you your yours
company companies business services service solutions provide provides providing
including include includes across within offer offers offering clients customers
'''.split())

US_STATES = {
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
    'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV',
    'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN',
    'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'PR', 'GU', 'VI', 'AS', 'MP',
}

SOCIAL_HOSTS = ('facebook.com', 'fb.com', 'linkedin.com', 'twitter.com', 'x.com',
                'instagram.com', 'youtube.com', 'youtu.be', 'tiktok.com', 'pinterest.com',
                'yelp.com', 'glassdoor.com', 'indeed.com', 'google.com', 'goo.gl', 'bing.com')

LIST_FIELDS = ('competencies', 'differentiators', 'naicsCodes', 'certifications', 'pastPerformance')
SCALAR_FIELDS = ('companyName', 'website', 'contactName', 'contactTitle', 'phone', 'email',
                 'address', 'city', 'state', 'zipCode', 'companyDescription', 'industryFocus',
                 'ueiCode', 'cageCode')


class ExtractionError(Exception):
    """Raised when the landing page itself cannot be fetched."""


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------
def normalize_url(url):
    url = (url or '').strip()
    if not url:
        return ''
    if not re.match(r'^[a-z][a-z0-9+.-]*://', url, re.IGNORECASE):
        url = 'https://' + url
    parsed = urlparse(url)
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path or '/',
                       parsed.params, parsed.query, ''))


def default_url_validator(url):
    """Minimal SSRF guard: http(s) only, no private / loopback / link-local IPs.

    Mirrors ``is_safe_url_for_ssrf`` in app.py; callers may pass their own.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False, f'Invalid URL scheme: {parsed.scheme}'
        host = parsed.hostname
        if not host:
            return False, 'No hostname'
        if host.lower() in ('localhost', 'localhost.localdomain', 'metadata', 'metadata.google.internal',
                            '169.254.169.254', 'instance-data'):
            return False, f'Blocked hostname: {host}'
        try:
            for info in socket.getaddrinfo(host, None):
                try:
                    ip = ipaddress.ip_address(info[4][0])
                except ValueError:
                    continue
                if (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
                        or ip.is_multicast or str(ip).startswith('169.254.')):
                    return False, f'Blocked address: {ip}'
        except socket.gaierror:
            pass
        return True, None
    except Exception as exc:  # pragma: no cover - defensive
        return False, f'URL validation error: {exc}'


def _registrable_host(netloc):
    host = (netloc or '').lower().split(':')[0]
    return host[4:] if host.startswith('www.') else host


def _same_site(url_a, url_b):
    return _registrable_host(urlparse(url_a).netloc) == _registrable_host(urlparse(url_b).netloc)


def _is_social(url):
    host = _registrable_host(urlparse(url).netloc)
    return any(host == s or host.endswith('.' + s) for s in SOCIAL_HOSTS)


def _base_site_url(url):
    parsed = urlparse(url)
    return f'{parsed.scheme}://{parsed.netloc}' if parsed.scheme and parsed.netloc else ''


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------
def _read_limited(response, max_bytes):
    chunks, total = [], 0
    for chunk in response.iter_content(chunk_size=16_384):
        if not chunk:
            continue
        total += len(chunk)
        if total > max_bytes:
            break
        chunks.append(chunk)
    return b''.join(chunks)


def fetch_url(url, url_validator, max_bytes=MAX_PAGE_BYTES, timeout=PAGE_TIMEOUT):
    """GET ``url`` and return (kind, body_bytes, final_url) with kind in
    {'html', 'pdf', 'other'}; raises on network errors / non-200."""
    ok, err = url_validator(url)
    if not ok:
        raise ValueError(f'SSRF protection: {err}')
    headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    with requests.get(url, headers=headers, timeout=timeout, stream=True, allow_redirects=True) as resp:
        if resp.status_code != 200:
            raise requests.HTTPError(f'HTTP {resp.status_code}', response=resp)
        final_url = resp.url or url
        ok, err = url_validator(final_url)
        if not ok:
            raise ValueError(f'SSRF protection (redirect): {err}')
        ctype = (resp.headers.get('content-type') or '').lower()
        if 'pdf' in ctype or final_url.lower().split('?')[0].endswith('.pdf'):
            return 'pdf', _read_limited(resp, MAX_PDF_BYTES), final_url
        if 'html' in ctype or 'xml' in ctype or not ctype:
            return 'html', _read_limited(resp, max_bytes), final_url
        return 'other', b'', final_url


def pdf_bytes_to_text(data):
    try:
        import fitz  # PyMuPDF
    except ImportError:  # pragma: no cover
        logger.warning('PyMuPDF not installed; skipping linked PDF')
        return ''
    try:
        with fitz.open(stream=data, filetype='pdf') as doc:
            return '\n'.join(page.get_text() for page in doc).strip()
    except Exception as exc:
        logger.warning(f'PDF text extraction failed: {exc}')
        return ''


# ---------------------------------------------------------------------------
# HTML -> structured text
# ---------------------------------------------------------------------------
BLOCK_TAGS = {'p', 'div', 'section', 'article', 'main', 'aside', 'header', 'footer',
              'ul', 'ol', 'li', 'table', 'tr', 'blockquote', 'pre', 'address', 'figure',
              'figcaption', 'dl', 'dt', 'dd', 'nav', 'body', 'html', 'br', 'hr', 'details',
              'summary'}
HEADING_TAGS = {'h1': 1, 'h2': 2, 'h3': 3, 'h4': 4, 'h5': 5, 'h6': 5}


def _class_str(tag):
    classes = tag.get('class') or []
    if isinstance(classes, str):
        classes = [classes]
    return ' '.join(classes) + ' ' + str(tag.get('id') or '')


def clean_soup(soup, drop_nav=True):
    for element in soup(list(STRIP_TAGS)):
        element.decompose()
    for comment in soup.find_all(string=lambda s: isinstance(s, Comment)):
        comment.extract()
    for tag in soup.find_all(True):
        if tag.decomposed or tag.attrs is None:
            continue
        if tag.get('hidden') is not None or tag.get('aria-hidden') == 'true':
            tag.decompose()
            continue
        style = (tag.get('style') or '').replace(' ', '').lower()
        if 'display:none' in style or 'visibility:hidden' in style:
            tag.decompose()
            continue
        if tag.name not in ('body', 'html', 'main') and NOISE_CLASS_RE.search(_class_str(tag)):
            tag.decompose()
    if drop_nav:
        for element in soup.find_all('nav'):
            element.decompose()
        for element in soup.find_all(attrs={'role': 'navigation'}):
            element.decompose()
    return soup


def soup_to_text(root):
    """Render ``root`` as Markdown-ish text: headings become ``#`` lines, list
    items ``- `` lines, table rows ``|``-joined lines, paragraphs blank-line
    separated."""
    lines = []
    buf = []

    def flush():
        text = re.sub(r'\s+', ' ', ''.join(buf)).strip()
        buf.clear()
        if text:
            lines.append(text)

    def walk(node, list_depth=0):
        for child in node.children:
            name = getattr(child, 'name', None)
            if name is None:
                if isinstance(child, Comment):
                    continue
                buf.append(str(child))
                continue
            if name in HEADING_TAGS:
                flush()
                text = re.sub(r'\s+', ' ', child.get_text(' ', strip=True))
                if text:
                    lines.append('')
                    lines.append('#' * HEADING_TAGS[name] + ' ' + text)
                continue
            if name == 'li':
                flush()
                nested = [c for c in child.find_all(['ul', 'ol'], recursive=False)]
                for sub in nested:
                    sub.extract()
                text = re.sub(r'\s+', ' ', child.get_text(' ', strip=True))
                if text:
                    lines.append('  ' * list_depth + '- ' + text)
                for sub in nested:
                    walk(sub, list_depth + 1)
                continue
            if name == 'tr':
                flush()
                cells = [re.sub(r'\s+', ' ', c.get_text(' ', strip=True)) for c in child.find_all(['td', 'th'])]
                cells = [c for c in cells if c]
                if cells:
                    lines.append(' | '.join(cells))
                continue
            if name == 'img':
                alt = (child.get('alt') or '').strip()
                if alt and 2 < len(alt) < 120:
                    buf.append(f' [image: {alt}] ')
                continue
            if name in ('ul', 'ol'):
                flush()
                walk(child, list_depth)
                flush()
                continue
            if name in BLOCK_TAGS:
                flush()
                if name in ('p', 'blockquote', 'section', 'article'):
                    lines.append('')
                walk(child, list_depth)
                flush()
                continue
            walk(child, list_depth)

    walk(root)
    flush()

    out = []
    for line in lines:
        if line == '' and (not out or out[-1] == ''):
            continue
        out.append(line)
    return '\n'.join(out).strip()


def extract_page_text(soup):
    """Return (main_text, footer_text) for an already-cleaned soup."""
    footer_text = ''
    footers = soup.find_all('footer')
    if not footers:
        footers = [t for t in soup.find_all(['div', 'section'])
                   if re.search(r'\bfooter\b', _class_str(t), re.IGNORECASE)]
    if footers:
        footer_text = '\n'.join(soup_to_text(f) for f in footers[:2])
        for f in footers:
            f.extract()
    body = soup.body or soup
    return soup_to_text(body), footer_text


# ---------------------------------------------------------------------------
# Structured data helpers
# ---------------------------------------------------------------------------
def _first_str(value):
    if isinstance(value, list):
        for item in value:
            s = _first_str(item)
            if s:
                return s
        return ''
    if isinstance(value, dict):
        return _first_str(value.get('name') or value.get('@id') or '')
    return str(value).strip() if value is not None else ''


def _iter_json_ld(soup):
    for script in soup.find_all('script', type=lambda t: t and 'ld+json' in t.lower()):
        raw = script.string or script.get_text() or ''
        raw = raw.strip()
        if not raw:
            continue
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            try:
                payload = json.loads(re.sub(r',\s*([}\]])', r'\1', raw))
            except json.JSONDecodeError:
                continue
        stack = [payload]
        while stack:
            item = stack.pop()
            if isinstance(item, list):
                stack.extend(item)
            elif isinstance(item, dict):
                yield item
                if isinstance(item.get('@graph'), list):
                    stack.extend(item['@graph'])


def _type_matches(obj, names):
    types = obj.get('@type') or ''
    if isinstance(types, str):
        types = [types]
    return any(str(t).lower() in names for t in types)


def _map_postal_address(address, data):
    if isinstance(address, list):
        address = address[0] if address else None
    if not isinstance(address, dict):
        return
    mapping = (('streetAddress', 'address'), ('addressLocality', 'city'),
               ('addressRegion', 'state'), ('postalCode', 'zipCode'))
    for src, dst in mapping:
        value = _first_str(address.get(src))
        if value and dst not in data:
            data[dst] = value


def _collect_meta(soup):
    meta = {}
    for tag in soup.find_all('meta'):
        key = (tag.get('property') or tag.get('name') or '').strip().lower()
        content = (tag.get('content') or '').strip()
        if key and content and key not in meta:
            meta[key] = content
    return meta


def structured_data_from_soup(soup, page_url):
    """JSON-LD / Open Graph / microdata / mailto / tel -> field dict."""
    data = {}
    ld_objects = list(_iter_json_ld(soup))
    org = next((o for o in ld_objects if _type_matches(
        o, {'organization', 'corporation', 'localbusiness', 'professionalservice',
            'homeandconstructionbusiness', 'generalcontractor', 'store', 'ngo'})), None)
    if org:
        for src, dst in (('name', 'companyName'), ('legalName', 'companyName'),
                         ('description', 'companyDescription'), ('telephone', 'phone'),
                         ('email', 'email')):
            value = _first_str(org.get(src))
            if dst == 'companyDescription' and len(value) <= 40:
                continue
            if value and dst not in data:
                data[dst] = value.replace('mailto:', '')
        _map_postal_address(org.get('address'), data)
        url_value = _first_str(org.get('url'))
        if url_value.startswith(('http://', 'https://')) and not _is_social(url_value):
            data['website'] = url_value
        contact_points = org.get('contactPoint')
        if isinstance(contact_points, dict):
            contact_points = [contact_points]
        for cp in contact_points or []:
            if not isinstance(cp, dict):
                continue
            phone = _first_str(cp.get('telephone'))
            email = _first_str(cp.get('email'))
            if phone and 'phone' not in data:
                data['phone'] = phone
            if email and 'email' not in data:
                data['email'] = email.replace('mailto:', '')
        founder = org.get('founder') or org.get('employee')
        founder_name = _first_str(founder)
        if founder_name and 'contactName' not in data:
            data['contactName'] = founder_name
            if isinstance(founder, dict) and _first_str(founder.get('jobTitle')):
                data['contactTitle'] = _first_str(founder.get('jobTitle'))

    meta = _collect_meta(soup)
    site_name = meta.get('og:site_name', '')
    if site_name and 'companyName' not in data:
        data['companyName'] = site_name
    description = meta.get('og:description') or meta.get('description') or ''
    if description and 'companyDescription' not in data and len(description) > 40:
        data['companyDescription'] = description

    itemprop_map = {'email': 'email', 'telephone': 'phone', 'streetaddress': 'address',
                    'addresslocality': 'city', 'addressregion': 'state', 'postalcode': 'zipCode'}
    for element in soup.find_all(attrs={'itemprop': True}):
        field = itemprop_map.get(str(element.get('itemprop')).lower().strip())
        if not field or field in data:
            continue
        value = (element.get('content') or element.get_text(' ', strip=True) or '').strip()
        if field == 'email':
            value = value.replace('mailto:', '')
            if '@' not in value:
                continue
        if value:
            data[field] = value

    site_host = _registrable_host(urlparse(page_url).netloc)
    for anchor in soup.find_all('a', href=True):
        href = (anchor.get('href') or '').strip()
        low = href.lower()
        if low.startswith('mailto:') and 'email' not in data:
            email = href[7:].split('?')[0].strip()
            if '@' in email:
                email_host = email.split('@')[-1].lower()
                # Prefer an address on the company's own domain.
                if site_host and (email_host == site_host or email_host.endswith('.' + site_host)):
                    data['email'] = email
                else:
                    data.setdefault('_email_other_domain', email)
        elif low.startswith('tel:') and 'phone' not in data:
            phone = re.sub(r'[^\d+()\-.\s]', '', href[4:]).strip()
            if len(re.sub(r'\D', '', phone)) >= 10:
                data['phone'] = phone
    if 'email' not in data and data.get('_email_other_domain'):
        data['email'] = data['_email_other_domain']
    data.pop('_email_other_domain', None)
    return data


# ---------------------------------------------------------------------------
# Text regex extraction
# ---------------------------------------------------------------------------
PHONE_RE = re.compile(r'(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)')
EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
ZIP_LINE_RE = re.compile(r'([A-Z][A-Za-z.\' -]{1,40}?),?\s+([A-Z]{2})\.?\s+(\d{5}(?:-\d{4})?)\b')
STREET_RE = re.compile(
    r'(?<![\d)\-.])\b(\d{1,6}[A-Za-z]?\s+(?:[NSEW]\.?\s+|North\s+|South\s+|East\s+|West\s+)?[A-Za-z0-9.\' -]{2,50}?\s'
    r'(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?|'
    r'Circle|Cir\.?|Place|Pl\.?|Parkway|Pkwy\.?|Highway|Hwy\.?|Trail|Terrace|Plaza|Loop|Route|Rte\.?|Turnpike|Pike)'
    r'(?:\s+(?:Suite|Ste\.?|Unit|Bldg\.?|Building|Floor|Fl\.?|#)\s*[A-Za-z0-9-]+)?)', re.IGNORECASE)
UEI_RE = re.compile(r'\b(?:UEI|Unique\s+Entity\s+(?:ID|Identifier)|SAM\s+UEI)\s*(?:#|:|No\.?|Number)?\s*[:\-]?\s*([A-Z0-9]{12})\b', re.IGNORECASE)
CAGE_RE = re.compile(r'\b(?:CAGE|Commercial\s+and\s+Government\s+Entity)\s*(?:Code)?\s*(?:#|:|No\.?|Number)?\s*[:\-]?\s*([A-Z0-9]{5})\b', re.IGNORECASE)
DUNS_RE = re.compile(r'\bDUNS\b', re.IGNORECASE)
NAICS_CODE_RE = re.compile(r'(?<!\d)(\d{6})(?!\d)')
NAICS_LINE_RE = re.compile(r'(?<!\d)(\d{6})(?!\d)\s*[-–—:|(]?\s*([A-Z][A-Za-z,&/ ()-]{8,120}?)(?=\s*(?:\)|\||\n|$|\d{6}))')


def regex_fields_from_text(text, footer_text=''):
    data = {}
    contact_zone = footer_text or ''

    m = UEI_RE.search(text)
    if m:
        data['ueiCode'] = m.group(1).upper()
    m = CAGE_RE.search(text)
    if m:
        data['cageCode'] = m.group(1).upper()

    # NAICS: only inside a section that mentions NAICS, to avoid random 6-digit numbers.
    naics = []
    for section in re.finditer(r'(?is)\bNAICS\b(.{0,1500})', text):
        chunk = section.group(1)
        chunk = re.split(r'(?i)\n#{1,3} (?!.*naics)', chunk)[0]  # stop at next heading
        for code, desc in NAICS_LINE_RE.findall(chunk):
            if not code.startswith(('0', '9')) or code.startswith('92'):
                entry = f'{code} ({" ".join(desc.split()).strip(" -–—:|(")})' if desc else code
                if not any(e.startswith(code) for e in naics):
                    naics.append(entry)
        for code in NAICS_CODE_RE.findall(chunk):
            if not code.startswith(('0', '9')) or code.startswith('92'):
                if not any(e.startswith(code) for e in naics):
                    naics.append(code)
    if naics:
        data['naicsCodes'] = naics[:15]

    certs = []
    for label, pattern in CERTIFICATION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE) and label not in certs:
            certs.append(label)
    if certs:
        data['certifications'] = certs

    for zone in (contact_zone, text):
        if not zone:
            continue
        m = ZIP_LINE_RE.search(zone)
        if m and m.group(2) in US_STATES:
            data.setdefault('city', m.group(1).strip(' ,'))
            data.setdefault('state', m.group(2))
            data.setdefault('zipCode', m.group(3))
            before = zone[max(0, m.start() - 160):m.start()]
            streets = STREET_RE.findall(before)
            if streets:
                data.setdefault('address', ' '.join(streets[-1].split()))
            break

    if contact_zone:
        m = EMAIL_RE.search(contact_zone)
        if m:
            data.setdefault('email', m.group(0))
        m = PHONE_RE.search(contact_zone)
        if m:
            data.setdefault('phone', m.group(0).strip())
    return data


# ---------------------------------------------------------------------------
# Crawl
# ---------------------------------------------------------------------------
def _link_priority(href, text):
    hay = (urlparse(href).path + ' ' + text).lower().replace('_', '-')
    for keywords, prio in LINK_PRIORITIES:
        if any(k in hay for k in keywords):
            return prio
    return None


def discover_internal_links(soup, base_url):
    """Return prioritized (priority, url) internal links and capability PDFs."""
    candidates = {}
    pdfs = []
    for anchor in soup.find_all('a', href=True):
        href = (anchor.get('href') or '').strip()
        if not href or SKIP_LINK_PATTERNS.search(href):
            continue
        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if parsed.scheme not in ('http', 'https'):
            continue
        text = anchor.get_text(' ', strip=True)
        if absolute.lower().split('?')[0].endswith('.pdf'):
            if re.search(r'capabilit|statement|brochure|overview|line\s*card', (href + ' ' + text), re.IGNORECASE):
                pdfs.append(absolute)
            continue
        if not _same_site(absolute, base_url):
            continue
        normalized = urlunparse((parsed.scheme, parsed.netloc.lower(), parsed.path.rstrip('/') or '/', '', '', ''))
        if normalized.rstrip('/') == normalize_url(base_url).rstrip('/'):
            continue
        prio = _link_priority(normalized, text)
        if prio is None:
            continue
        depth = normalized.count('/') - 2
        score = (prio, depth)
        if normalized not in candidates or candidates[normalized] > score:
            candidates[normalized] = score
    # Round-robin across priority buckets so one large section (e.g. eight
    # "about" sub-pages) cannot crowd out services/contact/certification pages.
    buckets = {}
    for url_, (prio, depth) in sorted(candidates.items(), key=lambda kv: (kv[1], kv[0])):
        buckets.setdefault(prio, []).append(url_)
    ranked = []
    while any(buckets.values()):
        for prio in sorted(buckets):
            if buckets[prio]:
                ranked.append(buckets[prio].pop(0))
    return ranked, pdfs[:2]


def crawl_site(start_url, url_validator, deadline_s=CRAWL_DEADLINE, max_pages=MAX_PAGES, progress_cb=None):
    """Fetch the landing page then the most relevant internal pages.

    Returns a list of dicts ``{'url', 'kind', 'soup'|'text'}`` in priority
    order (landing page first). Never exceeds ``deadline_s`` seconds.
    """
    started = time.monotonic()
    kind, body, final_url = fetch_url(start_url, url_validator)
    if kind == 'pdf':
        return [{'url': final_url, 'kind': 'pdf', 'text': pdf_bytes_to_text(body)}]
    if kind != 'html' or not body:
        raise ExtractionError('The URL did not return an HTML page or a PDF.')

    landing = BeautifulSoup(body, 'html.parser')
    links, pdf_links = discover_internal_links(landing, final_url)
    pages = [{'url': final_url, 'kind': 'html', 'soup': landing}]
    if progress_cb:
        progress_cb(f'Landing page fetched; {len(links)} relevant internal pages found')

    targets = [(u, 'html') for u in links[:max_pages - 1]] + [(p, 'pdf') for p in pdf_links]
    if not targets:
        return pages

    remaining = deadline_s - (time.monotonic() - started)
    if remaining <= 1:
        return pages

    results = {}
    executor = ThreadPoolExecutor(max_workers=FETCH_WORKERS)
    futures = {}
    try:
        for target, expected in targets:
            futures[executor.submit(fetch_url, target, url_validator)] = (target, expected)
        pending = set(futures)
        while pending:
            budget = deadline_s - (time.monotonic() - started)
            if budget <= 0:
                break
            done, pending = wait(pending, timeout=budget, return_when=FIRST_COMPLETED)
            for fut in done:
                target, expected = futures[fut]
                try:
                    k, b, fu = fut.result()
                except Exception as exc:
                    logger.info(f'Skipping {target}: {exc}')
                    continue
                if k == 'html' and b:
                    results[target] = {'url': fu, 'kind': 'html', 'soup': BeautifulSoup(b, 'html.parser')}
                elif k == 'pdf' and b:
                    text = pdf_bytes_to_text(b)
                    if len(text) > 200:
                        results[target] = {'url': fu, 'kind': 'pdf', 'text': text}
        for fut in pending:
            fut.cancel()
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    for target, _ in targets:
        if target in results:
            pages.append(results[target])
    if progress_cb:
        progress_cb(f'Crawled {len(pages)} page(s) in {time.monotonic() - started:.1f}s')
    return pages


# ---------------------------------------------------------------------------
# Corpus + deterministic pass
# ---------------------------------------------------------------------------
def build_corpus(pages):
    """Convert crawled pages to text. Returns (sections, structured, footer_text)
    where sections is a list of (url, text)."""
    sections = []
    structured = {}
    footer_texts = []
    seen_footers = set()
    for page in pages:
        if page['kind'] == 'pdf':
            sections.append((page['url'], page['text']))
            continue
        soup = page['soup']
        page_struct = structured_data_from_soup(soup, page['url'])
        for key, value in page_struct.items():
            structured.setdefault(key, value)
        title = (soup.title.string or '').strip() if soup.title and soup.title.string else ''
        clean_soup(soup)
        main_text, footer_text = extract_page_text(soup)
        if footer_text and footer_text not in seen_footers:
            seen_footers.add(footer_text)
            footer_texts.append(footer_text)
        if title:
            main_text = f'TITLE: {title}\n{main_text}'
        if main_text.strip():
            sections.append((page['url'], main_text))
    return sections, structured, '\n'.join(footer_texts)


ABOUT_URL_RE = re.compile(r'(?i)(about|who-we-are|who_we_are|whoweare|our-story|our_story|our-company|our_company|overview|mission|history)')
ABOUT_HEADING_RE = re.compile(r'(?i)\b(about( us)?|who we are|our (story|company|history|mission)|company (overview|profile)|mission)\b')
BOILERPLATE_RE = re.compile(r'(?i)(cookie|privacy policy|terms of|all rights reserved|©|click here|read more|learn more|subscribe|newsletter|sign up|log ?in)')


def _description_paragraphs(text, max_chars=650):
    """Verbatim prose paragraphs from Markdown-ish page text (no headings,
    bullets, table rows or boilerplate), stopping at ``max_chars``."""
    picked = []
    total = 0
    for line in text.split('\n'):
        line = line.strip()
        if not line or line.startswith(('#', '- ', 'TITLE:')) or ' | ' in line:
            continue
        if len(line) < 60 or not re.search(r'[.!?]"?$', line) or BOILERPLATE_RE.search(line):
            continue
        if len(line.split()) < 10 or len(line) > 900:
            continue
        if picked and total + len(line) > max_chars:
            break
        picked.append(line)
        total += len(line)
    return ' '.join(picked)


def about_description_from_sections(sections):
    """Return the company description as written on the site's About page (or an
    About section of the landing page), or '' when none is found."""
    for url, text in sections:
        if ABOUT_URL_RE.search(urlparse(url).path or ''):
            body = '\n'.join(l for l in text.split('\n') if not l.startswith('#'))
            desc = _description_paragraphs(body)
            if len(desc) >= 80:
                return desc
    for _, text in sections[:1]:
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('#') and ABOUT_HEADING_RE.search(line):
                block = []
                for nxt in lines[i + 1:]:
                    if nxt.startswith('#'):
                        break
                    block.append(nxt)
                desc = _description_paragraphs('\n'.join(block))
                if len(desc) >= 80:
                    return desc
    return ''


def _company_name_from_title(title):
    title = re.sub(r'(?i)\b(home|homepage|welcome|official site|official website)\b', '', title)
    parts = re.split(r'\s[|\-\u2013\u2014\u00b7:]\s', title)
    parts = [p.strip(' -|') for p in parts if p.strip(' -|')]
    if not parts:
        return ''
    # Brand is usually the shortest meaningful segment.
    parts.sort(key=len)
    return parts[0][:100]


# ---------------------------------------------------------------------------
# LLM pass with grounding
# ---------------------------------------------------------------------------
LLM_SYSTEM_PROMPT = """You extract capability-statement data for a US government contractor from the text of its own website.

STRICT RULES:
- Use ONLY information explicitly present in the provided text. Never guess, infer or use outside knowledge.
- If a field is not clearly stated in the text, return null (or an empty list for list fields).
- Copy wording closely from the text; do not embellish. Keep list items short (max ~15 words).
- companyDescription: 2-3 sentences describing what the company does, composed from sentences in the text.
- competencies: 4-10 concrete services/capabilities the company offers (from services/what-we-do sections).
- differentiators: 3-6 reasons the company says it stands out (why us / our approach / values).
- pastPerformance: notable named clients, agencies or projects that are explicitly mentioned. Empty list if none.
- naicsCodes: only 6-digit NAICS codes that appear in the text, formatted "123456 (title as written)" or just "123456".
- certifications: only certifications/set-asides explicitly claimed (8(a), HUBZone, SDVOSB, WOSB, MBE, DBE, ISO 9001, GSA Schedule...).
- contactName/contactTitle: the primary contact or owner/president if named. Otherwise null.
- state: 2-letter US state code if determinable from an explicit address.
- industryFocus: the markets/industries served, as a short phrase.

Return ONLY a JSON object with exactly these keys:
companyName, website, contactName, contactTitle, phone, email, address, city, state, zipCode,
companyDescription, industryFocus, ueiCode, cageCode, competencies, differentiators, naicsCodes,
certifications, pastPerformance"""


def _corpus_for_llm(sections, footer_text, limit=LLM_MAX_CORPUS_CHARS):
    parts = []
    if footer_text:
        parts.append('=== SITE FOOTER (contact details) ===\n' + footer_text[:2500])
    n = len(sections) or 1
    # Give the landing page and the first few internal pages more room.
    weights = [3] + [2] * min(3, n - 1) + [1] * max(0, n - 4)
    total_w = sum(weights[:n]) or 1
    budget = limit - sum(len(p) for p in parts)
    for (url, text), w in zip(sections, weights):
        share = max(1500, int(budget * w / total_w))
        parts.append(f'=== PAGE: {url} ===\n{text[:share]}')
    return '\n\n'.join(parts)[:limit]


def call_llm(openai_client, corpus, model='gpt-4o-mini', timeout=LLM_TIMEOUT):
    """Return the parsed JSON dict or {} on any failure (never raises)."""
    if openai_client is None or not corpus.strip():
        return {}
    try:
        completion = openai_client.with_options(timeout=timeout).chat.completions.create(
            model=model,
            messages=[{'role': 'system', 'content': LLM_SYSTEM_PROMPT},
                      {'role': 'user', 'content': 'WEBSITE TEXT:\n\n' + corpus}],
            temperature=0,
            max_tokens=1800,
            response_format={'type': 'json_object'},
        )
        raw = (completion.choices[0].message.content or '').strip()
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception as exc:
        logger.warning(f'LLM extraction failed (continuing with deterministic data): {exc}')
        return {}


_TOKEN_RE = re.compile(r'[a-z0-9]+')


def _tokens(text):
    return {t for t in _TOKEN_RE.findall((text or '').lower()) if len(t) > 2 and t not in STOPWORDS}


def _norm(text):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9@.+ ]', ' ', (text or '').lower())).strip()


def _digits(text):
    return re.sub(r'\D', '', text or '')


class Grounder:
    """Checks that LLM output is supported by the crawled corpus."""

    def __init__(self, corpus_text):
        self.raw = corpus_text or ''
        self.norm = _norm(self.raw)
        self.digits = _digits(self.raw)
        self.tokens = _tokens(self.raw)
        self.lower = self.raw.lower()

    def literal(self, value):
        value = _norm(value)
        return bool(value) and value in self.norm

    def digits_present(self, value):
        d = _digits(value)
        return len(d) >= 5 and d in self.digits

    def token_ratio(self, value):
        toks = _tokens(value)
        if not toks:
            return 0.0
        return sum(1 for t in toks if t in self.tokens) / len(toks)

    def grounded_phrase(self, value, min_ratio=0.75):
        """Short phrases must appear (almost) literally; longer ones need most
        of their content tokens present in the corpus."""
        if not value or not str(value).strip():
            return False
        toks = _tokens(value)
        if len(toks) <= 2:
            return self.literal(value) or all(t in self.tokens for t in toks)
        return self.token_ratio(value) >= min_ratio

    def certification(self, label):
        for canonical, pattern in CERTIFICATION_PATTERNS:
            if canonical.lower() == str(label).lower().strip() or re.fullmatch(pattern, str(label).strip(), re.IGNORECASE):
                return bool(re.search(pattern, self.raw, re.IGNORECASE))
        return self.grounded_phrase(label, 0.9)


def validate_llm_output(llm, grounder):
    """Drop every LLM value that is not grounded in the corpus."""
    out = {}
    if not isinstance(llm, dict):
        return out

    def s(key):
        v = llm.get(key)
        return str(v).strip() if isinstance(v, (str, int, float)) and str(v).strip() and str(v).lower() != 'null' else ''

    def lst(key):
        v = llm.get(key)
        if isinstance(v, str):
            v = [v]
        return [str(i).strip() for i in v if isinstance(i, (str, int, float)) and str(i).strip()] if isinstance(v, list) else []

    for key in ('email',):
        v = s(key)
        if v and '@' in v and v.lower() in grounder.lower:
            out[key] = v
    for key in ('phone', 'zipCode', 'ueiCode', 'cageCode'):
        v = s(key)
        if not v:
            continue
        if key == 'phone' and grounder.digits_present(v) and len(_digits(v)) in (10, 11):
            out[key] = v
        elif key == 'zipCode' and re.fullmatch(r'\d{5}(-\d{4})?', v) and v.split('-')[0] in grounder.raw:
            out[key] = v
        elif key in ('ueiCode', 'cageCode') and v.upper() in grounder.raw.upper():
            out[key] = v.upper()
    v = s('state')
    if v and v.upper() in US_STATES and re.search(r'\b' + re.escape(v.upper()) + r'\b', grounder.raw):
        out['state'] = v.upper()
    for key in ('city', 'address', 'contactName', 'contactTitle', 'companyName'):
        v = s(key)
        if v and grounder.grounded_phrase(v, 0.99 if key != 'companyName' else 0.6):
            out[key] = v
    v = s('website')
    if v.startswith(('http://', 'https://')) and not _is_social(v):
        out['website'] = v
    for key in ('companyDescription', 'industryFocus'):
        v = s(key)
        if v and grounder.grounded_phrase(v, 0.7):
            out[key] = v

    for key in ('competencies', 'differentiators', 'pastPerformance'):
        items = [i for i in lst(key) if grounder.grounded_phrase(i, 0.7)]
        if items:
            out[key] = _dedupe(items)[:12]

    naics = []
    for item in lst('naicsCodes'):
        m = re.search(r'\b(\d{6})\b', item)
        if m and m.group(1) in grounder.raw and not any(n.startswith(m.group(1)) for n in naics):
            desc = re.sub(r'^\D*\d{6}\s*[-–—:(]?\s*', '', item).strip(' )')
            naics.append(f'{m.group(1)} ({desc})' if desc and grounder.grounded_phrase(desc, 0.6) else m.group(1))
    if naics:
        out['naicsCodes'] = naics[:15]

    certs = [c for c in lst('certifications') if grounder.certification(c)]
    if certs:
        out['certifications'] = _dedupe(certs)
    return out


def _dedupe(items):
    seen, out = set(), []
    for item in items:
        key = _norm(item)
        if key and key not in seen:
            seen.add(key)
            out.append(item)
    return out


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def extract_capability_from_website(url, openai_client=None, model='gpt-4o-mini',
                                    url_validator=None, progress_cb=None,
                                    time_budget=DEFAULT_TIME_BUDGET):
    """Crawl ``url`` and return::

        {'data': {...capability fields...}, 'sources': {field: 'structured'|'regex'|'ai'},
         'pages': [urls], 'used_ai': bool, 'warnings': [...]}

    Raises ``ExtractionError`` if the landing page cannot be fetched.
    """
    started = time.monotonic()
    url_validator = url_validator or default_url_validator
    start_url = normalize_url(url)
    if not start_url:
        raise ExtractionError('No URL provided')
    ok, err = url_validator(start_url)
    if not ok:
        raise ExtractionError(f'URL not allowed: {err}')

    def progress(msg):
        if progress_cb:
            try:
                progress_cb(msg)
            except Exception:  # pragma: no cover
                pass

    progress('Fetching website...')
    try:
        pages = crawl_site(start_url, url_validator, deadline_s=min(CRAWL_DEADLINE, time_budget * 0.4),
                           progress_cb=progress)
    except ExtractionError:
        raise
    except requests.exceptions.RequestException as exc:
        raise ExtractionError(f'Could not fetch the website: {exc}')
    except ValueError as exc:
        raise ExtractionError(str(exc))

    sections, structured, footer_text = build_corpus(pages)
    full_text = '\n\n'.join(t for _, t in sections) + '\n\n' + footer_text
    warnings = []
    if len(full_text.strip()) < 200:
        warnings.append('Very little readable text found on the site (it may be rendered with JavaScript).')

    data, sources = {}, {}
    for key, value in structured.items():
        if value:
            data[key] = value
            sources[key] = 'structured'

    landing = pages[0]
    if landing['kind'] == 'html':
        data.setdefault('website', _base_site_url(landing['url']))
        sources.setdefault('website', 'structured')
        if 'companyName' not in data and sections:
            m = re.match(r'TITLE: (.+)', sections[0][1])
            name = _company_name_from_title(m.group(1)) if m else ''
            if name:
                data['companyName'] = name
                sources['companyName'] = 'structured'

    regex_data = regex_fields_from_text(full_text, footer_text)
    for key, value in regex_data.items():
        if value and key not in data:
            data[key] = value
            sources[key] = 'regex'

    about_description = about_description_from_sections(sections)
    if about_description:
        data['companyDescription'] = about_description
        sources['companyDescription'] = 'website'

    used_ai = False
    elapsed = time.monotonic() - started
    if openai_client is not None and time_budget - elapsed > 8 and len(full_text.strip()) >= 200:
        progress('Analyzing website content...')
        corpus = _corpus_for_llm(sections, footer_text)
        llm_raw = call_llm(openai_client, corpus, model=model,
                           timeout=min(LLM_TIMEOUT, max(8.0, time_budget - elapsed - 2)))
        if llm_raw:
            used_ai = True
            grounded = validate_llm_output(llm_raw, Grounder(full_text))
            dropped = sorted(set(k for k, v in llm_raw.items() if v) - set(grounded))
            if dropped:
                logger.info(f'Ungrounded LLM fields dropped: {dropped}')
            for key, value in grounded.items():
                if key in LIST_FIELDS:
                    existing = data.get(key) or []
                    merged = _dedupe(list(existing) + list(value)) if key in ('certifications', 'naicsCodes') else (existing or value)
                    if merged and merged != existing:
                        data[key] = merged
                        sources[key] = 'ai' if not existing else sources.get(key, 'ai')
                elif key == 'companyDescription':
                    # Text copied from the About page wins; otherwise a grounded
                    # multi-sentence AI summary beats a one-line meta description.
                    if sources.get(key) != 'website' and len(value) > len(data.get(key, '')) * 1.2:
                        data[key] = value
                        sources[key] = 'ai'
                elif key not in data:
                    data[key] = value
                    sources[key] = 'ai'
    elif openai_client is None:
        warnings.append('AI analysis unavailable (no OpenAI client); deterministic extraction only.')

    data = sanitize_fields(data)
    sources = {k: v for k, v in sources.items() if k in data}
    return {
        'data': data,
        'sources': sources,
        'pages': [p['url'] for p in pages],
        'used_ai': used_ai,
        'warnings': warnings,
        'elapsed_seconds': round(time.monotonic() - started, 2),
    }


def sanitize_fields(data):
    out = {}
    for key in SCALAR_FIELDS:
        value = data.get(key)
        if value is None:
            continue
        value = re.sub(r'\s+', ' ', str(value)).strip()
        if not value:
            continue
        if key == 'companyName':
            value = re.sub(r'(?i)^(capability\s+statement|about\s+us|company\s+name)[:\s]*', '', value)[:100].strip()
        elif key == 'website':
            parsed = urlparse(value if value.startswith('http') else 'https://' + value)
            if not parsed.netloc:
                continue
            value = f'{parsed.scheme}://{parsed.netloc}'
        elif key == 'companyDescription':
            value = value[:700].strip()
        elif key == 'state':
            value = value.upper()[:2] if len(value) == 2 else value
        elif key == 'phone':
            digits = _digits(value)
            if len(digits) == 11 and digits.startswith('1'):
                digits = digits[1:]
            if len(digits) == 10:
                value = f'({digits[:3]}) {digits[3:6]}-{digits[6:]}'
        elif key in ('ueiCode', 'cageCode'):
            value = value.upper()
        if value:
            out[key] = value
    for key in LIST_FIELDS:
        value = data.get(key)
        if isinstance(value, str):
            value = [value]
        if isinstance(value, list):
            cleaned = _dedupe([re.sub(r'\s+', ' ', str(v)).strip(' -•*') for v in value if v and str(v).strip()])
            if cleaned:
                out[key] = cleaned
    return out

"""Async job plumbing for website -> capability statement extraction.

Shared by the Flask web service (job creation, status, inline fallback) and
``proposal_worker.py`` (preferred executor). Job records live in Firebase
Realtime Database under ``capability_import_jobs/<job_id>`` and follow the
same lease/heartbeat conventions as ``contract_analysis_jobs``.

Job record::

    {
        user_id, url, status: queued|running|completed|error,
        progress, created_at, started_at, completed_at, failed_at,
        claimed_by, lease_expires_at, last_heartbeat,
        result: {data, sources, pages, used_ai, warnings, elapsed_seconds},
        error
    }
"""
import logging
import time
import uuid

from website_extractor import (
    DEFAULT_TIME_BUDGET,
    ExtractionError,
    extract_capability_from_website,
)

logger = logging.getLogger(__name__)

JOB_PATH = 'capability_import_jobs'
# Extraction is bounded by DEFAULT_TIME_BUDGET; the lease is comfortably
# larger so a healthy run is never stolen, but an abandoned one is recovered
# quickly instead of leaving the user waiting for minutes.
LEASE_SECONDS = 240
STALE_SECONDS = LEASE_SECONDS * 2
# How long the web service waits for the worker to claim a job before it
# processes the job itself.
WORKER_GRACE_SECONDS = 12.0
MAX_URL_LENGTH = 2048


def _now():
    return time.time()


def create_job(db, user_id, url):
    job_id = str(uuid.uuid4())
    db.reference(f'{JOB_PATH}/{job_id}').set({
        'user_id': user_id,
        'url': url,
        'status': 'queued',
        'progress': 'Queued; waiting for a worker...',
        'created_at': _now(),
        'claimed_by': None,
        'lease_expires_at': 0,
        'last_heartbeat': 0,
    })
    return job_id


def claim_job(db, job_id, claimant, lease_seconds=LEASE_SECONDS):
    """Atomically claim a queued (or lease-expired running) job."""
    job_ref = db.reference(f'{JOB_PATH}/{job_id}')

    def _txn(current):
        if current is None:
            return None
        status = current.get('status')
        lease_expires = current.get('lease_expires_at') or 0
        if status == 'queued' and lease_expires > _now():
            return None
        if status == 'running' and lease_expires > _now():
            return None
        if status not in ('queued', 'running'):
            return None
        now = _now()
        current['status'] = 'running'
        current['claimed_by'] = claimant
        current['lease_expires_at'] = now + lease_seconds
        current['started_at'] = now
        current['last_heartbeat'] = now
        current['progress'] = 'Starting website crawl...'
        return current

    try:
        result = job_ref.transaction(_txn)
    except Exception as exc:
        logger.error('capability import: claim failed for %s: %s', job_id, exc)
        return False
    return bool(result) and result.get('claimed_by') == claimant


def process_job(db, job_id, claimant, openai_client=None, url_validator=None,
                model='gpt-4o-mini', time_budget=DEFAULT_TIME_BUDGET):
    """Run the extraction for an already-claimed job. Never raises."""
    job_ref = db.reference(f'{JOB_PATH}/{job_id}')
    try:
        job = job_ref.get() or {}
    except Exception as exc:
        logger.error('capability import: cannot read job %s: %s', job_id, exc)
        return
    if job.get('claimed_by') != claimant or job.get('status') != 'running':
        return
    url = job.get('url') or ''

    def progress(message):
        try:
            job_ref.update({'progress': message, 'last_heartbeat': _now(),
                            'lease_expires_at': _now() + LEASE_SECONDS})
        except Exception as exc:
            logger.warning('capability import: heartbeat failed for %s: %s', job_id, exc)

    try:
        result = extract_capability_from_website(
            url,
            openai_client=openai_client,
            model=model,
            url_validator=url_validator,
            progress_cb=progress,
            time_budget=time_budget,
        )
        job_ref.update({
            'status': 'completed',
            'progress': 'Done',
            'completed_at': _now(),
            'result': result,
            'error': None,
        })
        logger.info('capability import %s completed by %s in %.1fs (%d fields, ai=%s)',
                    job_id, claimant, result.get('elapsed_seconds', 0),
                    len(result.get('data') or {}), result.get('used_ai'))
    except ExtractionError as exc:
        _fail(job_ref, job_id, str(exc))
    except Exception as exc:  # noqa: BLE001 - job must always settle
        logger.error('capability import %s crashed: %s', job_id, exc, exc_info=True)
        _fail(job_ref, job_id, 'Unexpected error while analyzing the website. Please try again.')


def _fail(job_ref, job_id, message):
    try:
        job_ref.update({'status': 'error', 'error': message, 'failed_at': _now(),
                        'progress': 'Failed'})
    except Exception as exc:
        logger.error('capability import: cannot mark %s failed: %s', job_id, exc)


def active_jobs(db):
    """Queued/running jobs, cheapest query available."""
    ref = db.reference(JOB_PATH)
    jobs = {}
    try:
        for status in ('queued', 'running'):
            jobs.update(ref.order_by_child('status').equal_to(status).get() or {})
        return jobs
    except Exception as exc:
        # Missing ".indexOn": ["status"] rule -> fall back to a full read.
        logger.debug('capability import: indexed query unavailable (%s); full read', exc)
    try:
        everything = ref.get() or {}
    except Exception as exc:
        logger.error('capability import: cannot list jobs: %s', exc)
        return {}
    return {jid: j for jid, j in everything.items()
            if isinstance(j, dict) and j.get('status') in ('queued', 'running')}


def find_and_process_one(db, claimant, openai_client=None, url_validator=None,
                         model='gpt-4o-mini'):
    """Claim and process at most one job. Returns True if a job was processed."""
    now = _now()
    candidates = []
    for job_id, job in active_jobs(db).items():
        status = job.get('status')
        lease_expires = job.get('lease_expires_at') or 0
        if status == 'queued' or (status == 'running' and lease_expires < now):
            candidates.append((job.get('created_at') or 0, job_id))
    for _, job_id in sorted(candidates):
        if claim_job(db, job_id, claimant):
            process_job(db, job_id, claimant, openai_client=openai_client,
                        url_validator=url_validator, model=model)
            return True
    return False


def cleanup_stale(db):
    """Fail running jobs whose heartbeat is far beyond the lease."""
    now = _now()
    for job_id, job in active_jobs(db).items():
        if job.get('status') != 'running':
            continue
        last = job.get('last_heartbeat') or job.get('started_at') or 0
        if now - last > STALE_SECONDS:
            logger.warning('capability import: marking stale job %s as failed', job_id)
            _fail(db.reference(f'{JOB_PATH}/{job_id}'), job_id,
                  'Worker timeout - job was abandoned')


def public_status(job_id, job):
    """Shape a job record for the status endpoint (no internal fields)."""
    response = {
        'success': True,
        'job_id': job_id,
        'status': job.get('status'),
        'progress': job.get('progress'),
        'created_at': job.get('created_at'),
        'started_at': job.get('started_at'),
        'completed_at': job.get('completed_at'),
    }
    if job.get('status') == 'completed':
        result = job.get('result') or {}
        response['result'] = {
            'data': result.get('data') or {},
            'sources': result.get('sources') or {},
            'pages': result.get('pages') or [],
            'used_ai': bool(result.get('used_ai')),
            'warnings': result.get('warnings') or [],
            'elapsed_seconds': result.get('elapsed_seconds'),
        }
    elif job.get('status') == 'error':
        response['error'] = job.get('error') or 'Extraction failed'
    return response

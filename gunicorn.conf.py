"""
Gunicorn configuration for Contract Radar Maximizer.
Tuned for AI-heavy workloads with long-running OpenAI API calls.
"""

import os
import multiprocessing

# Bind to PORT from environment (Render sets this)
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"

# Workers: use 2-4 sync workers. More workers = more concurrent requests
# but also more memory. For AI workloads, fewer workers with longer timeouts
# is better than many workers that get killed.
workers = int(os.getenv('WEB_CONCURRENCY', min(multiprocessing.cpu_count() + 1, 4)))

# Timeout: 120s to accommodate GPT-4 calls (can take 30-90s).
# This is the single most important setting to prevent 502 errors.
timeout = 120

# Graceful timeout: how long to wait for workers to finish after SIGTERM
graceful_timeout = 30

# Keep-alive: how long to wait for next request on a keep-alive connection
keepalive = 5

# Worker class: sync is simplest and most compatible
worker_class = "sync"

# Preload app to share memory between workers (faster startup, less RAM)
preload_app = True

# Access log
accesslog = "-"
errorlog = "-"
loglevel = os.getenv('LOG_LEVEL', 'info')

# Max requests per worker before restart (prevents memory leaks)
max_requests = 500
max_requests_jitter = 50

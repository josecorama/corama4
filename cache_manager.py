"""
Cache Manager for Contract Radar Maximizer
Provides in-memory caching with TTL support, with optional Redis backend.
Caches expensive operations like CSV reads, analytics computations, and API responses.
"""

import time
import threading
import hashlib
import json
import logging
import os

logger = logging.getLogger(__name__)


class InMemoryCache:
    """Thread-safe in-memory cache with TTL support."""

    def __init__(self):
        self._store = {}
        self._lock = threading.Lock()

    def get(self, key):
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if entry['expires_at'] and time.time() > entry['expires_at']:
                del self._store[key]
                return None
            return entry['value']

    def set(self, key, value, ttl=300):
        with self._lock:
            self._store[key] = {
                'value': value,
                'expires_at': time.time() + ttl if ttl else None,
            }

    def delete(self, key):
        with self._lock:
            self._store.pop(key, None)

    def clear(self):
        with self._lock:
            self._store.clear()

    def clear_prefix(self, prefix):
        with self._lock:
            keys_to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._store[k]


class RedisCache:
    """Redis-backed cache. Falls back to InMemoryCache if Redis is unavailable."""

    def __init__(self, redis_url=None):
        self._fallback = InMemoryCache()
        self._redis = None
        try:
            import redis as redis_lib
            url = redis_url or os.getenv('REDIS_URL')
            if url:
                self._redis = redis_lib.from_url(url, decode_responses=True, socket_timeout=2)
                self._redis.ping()
                logger.info("Redis cache connected successfully")
            else:
                logger.info("No REDIS_URL configured, using in-memory cache")
        except Exception as e:
            logger.warning(f"Redis unavailable ({e}), using in-memory cache")
            self._redis = None

    @property
    def is_redis(self):
        return self._redis is not None

    def get(self, key):
        if self._redis:
            try:
                raw = self._redis.get(key)
                if raw is None:
                    return None
                return json.loads(raw)
            except Exception:
                return self._fallback.get(key)
        return self._fallback.get(key)

    def set(self, key, value, ttl=300):
        if self._redis:
            try:
                self._redis.setex(key, ttl, json.dumps(value, default=str))
                return
            except Exception:
                pass
        self._fallback.set(key, value, ttl)

    def delete(self, key):
        if self._redis:
            try:
                self._redis.delete(key)
                return
            except Exception:
                pass
        self._fallback.delete(key)

    def clear_prefix(self, prefix):
        if self._redis:
            try:
                cursor = 0
                while True:
                    cursor, keys = self._redis.scan(cursor, match=f"{prefix}*", count=100)
                    if keys:
                        self._redis.delete(*keys)
                    if cursor == 0:
                        break
                return
            except Exception:
                pass
        self._fallback.clear_prefix(prefix)


def make_cache_key(*args):
    raw = json.dumps(args, sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()


# Singleton cache instance
_cache = None


def get_cache():
    global _cache
    if _cache is None:
        _cache = RedisCache()
    return _cache

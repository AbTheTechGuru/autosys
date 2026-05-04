'use strict';

const Redis = require('ioredis');
const env   = require('./env');

let redis;

if (env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 2000),
    lazyConnect:     true,
    reconnectOnError:(err) => err.message.includes('READONLY'),
  });

  redis.on('error',   (err) => console.error('[Redis] Connection error:', err.message));
  redis.on('connect', ()    => console.info('[Redis] Connected'));

} else if (env.NODE_ENV === 'production') {
  // Hard fail in production — token revocation REQUIRES Redis
  console.error('\n❌  REDIS_URL is required in production. Token revocation will not work without Redis.\n');
  process.exit(1);

} else {
  // Development fallback: in-memory store (single-process only, lost on restart)
  console.warn('[Redis] REDIS_URL not set — using in-memory store (development only)');

  const store = new Map();
  const timers = new Map();

  redis = {
    get:   async (k)          => store.get(k) ?? null,
    set:   async (k, v)       => { store.set(k, v); return 'OK'; },
    setex: async (k, ttl, v)  => {
      store.set(k, v);
      if (timers.has(k)) clearTimeout(timers.get(k));
      timers.set(k, setTimeout(() => { store.delete(k); timers.delete(k); }, ttl * 1000));
      return 'OK';
    },
    del:   async (k)           => { store.delete(k); timers.delete(k); return 1; },
    incr:  async (k)           => { const n = (parseInt(store.get(k)) || 0) + 1; store.set(k, String(n)); return n; },
    expire:async (k, ttl)      => {
      if (!store.has(k)) return 0;
      if (timers.has(k)) clearTimeout(timers.get(k));
      timers.set(k, setTimeout(() => { store.delete(k); timers.delete(k); }, ttl * 1000));
      return 1;
    },
    quit:  async ()            => {},
    _isMock: true,
  };
}

module.exports = { redis };

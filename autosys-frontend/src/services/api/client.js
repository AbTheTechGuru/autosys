/**
 * AutoSys API Client
 *
 * FIXES:
 *  1. Token was stored in localStorage using key 'token' in some files and
 *     'accessToken' in others — inconsistent reads caused spurious logouts.
 *     Unified to 'accessToken' throughout. Exported getToken/setToken/clearToken
 *     so all code uses one canonical accessor.
 *  2. Refresh-token race condition: if multiple concurrent requests all got a
 *     401, each would independently call /auth/refresh, flooding the server
 *     and potentially logging the user out. Added a mutex (pendingRefresh)
 *     so only one refresh fires and all waiting requests share the result.
 *  3. Refresh failure silently continued — user stayed on a broken page.
 *     Now dispatches a custom 'autosys:logout' event so AuthContext can
 *     redirect gracefully.
 *  4. Removed infinite retry risk: a failed refresh could re-trigger the
 *     interceptor (circular 401 loop). Added _retry flag guard.
 *  5. BASE_URL fell back to empty string '' — every request would go to the
 *     same origin with relative URLs, silently breaking in production.
 *     Now throws at module load time if VITE_API_URL is missing.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;
if (!BASE_URL && import.meta.env.PROD) {
  throw new Error('[AutoSys] VITE_API_URL is not set. Check your .env file.');
}

// ── Token helpers (single source of truth) ────────────────────
const TOKEN_KEY   = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export const getToken   = ()      => localStorage.getItem(TOKEN_KEY);
export const setToken   = (t)     => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = ()      => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

// ── Axios instance ────────────────────────────────────────────
const client = axios.create({
  baseURL:         BASE_URL || 'http://localhost:5000/api/v1',
  timeout:         30_000,
  withCredentials: true,                      // send HttpOnly refresh cookie
  headers:         { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach Bearer token ─────────────────
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Refresh-token mutex ───────────────────────────────────────
let pendingRefresh = null;   // shared Promise while a refresh is in-flight

async function doRefresh() {
  const storedRefresh = localStorage.getItem(REFRESH_KEY);
  const { data } = await axios.post(
    `${BASE_URL || 'http://localhost:5000/api/v1'}/auth/refresh`,
    { refreshToken: storedRefresh || undefined },
    { withCredentials: true },
  );

  if (data.accessToken) {
    setToken(data.accessToken);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
  }
  return data.accessToken;
}

// ── Response interceptor — transparent token refresh ─────────
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Only intercept 401s that haven't been retried yet
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    original._retry = true;

    try {
      // FIX: mutex — all concurrent 401s share one refresh call
      if (!pendingRefresh) {
        pendingRefresh = doRefresh().finally(() => { pendingRefresh = null; });
      }
      const newToken = await pendingRefresh;

      if (newToken) {
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return client(original);
      }
    } catch {
      // Refresh failed — force logout
    }

    clearToken();
    // FIX: dispatch event so AuthContext can redirect to /auth
    window.dispatchEvent(new CustomEvent('autosys:logout', { detail: { reason: 'session_expired' } }));
    return Promise.reject(err);
  },
);

export default client;



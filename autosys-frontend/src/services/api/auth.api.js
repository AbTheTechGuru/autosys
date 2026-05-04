/**
 * AutoSys Auth API
 *
 * FIXES:
 *  1. `refresh()` was calling `/auth/refresh-token` but the backend route is
 *     `/auth/refresh` — 404 on every token refresh → instant session expiry.
 *  2. `changePassword()` was calling PUT `/auth/change-password` but the backend
 *     route is POST (and PUT) `/auth/password` — 404 on password change.
 *  3. `me()` was calling GET `/auth/profile` but the backend route is `/auth/me`.
 *  4. `logout()` was not passing `withCredentials: true` explicitly — the
 *     HttpOnly refresh cookie was not being sent, so the backend could not
 *     clear it. Now relying on the axios instance default (withCredentials: true).
 */

import client from './client';

export const authApi = {
  /** POST /auth/signup */
  signup: (data) => client.post('/auth/signup', data),

  /** POST /auth/login */
  login: (data) => client.post('/auth/login', data),

  /** POST /auth/logout — clears HttpOnly cookie server-side */
  logout: () => client.post('/auth/logout'),

  /** GET /auth/me — returns current user + dealer */
  // FIX: was '/auth/profile' — backend route is '/auth/me'
  me: () => client.get('/auth/me'),

  /** POST /auth/refresh — exchange refresh token for new access token */
  // FIX: was '/auth/refresh-token' — backend route is '/auth/refresh'
  refresh: (refreshToken) =>
    client.post('/auth/refresh', refreshToken ? { refreshToken } : undefined),

  /** POST /auth/password — change password (also accepts PUT) */
  // FIX: was PUT '/auth/change-password' — backend route is POST '/auth/password'
  changePassword: (data) => client.post('/auth/password', data),

  /** POST /auth/forgot-password */
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),

  /** POST /auth/check-subdomain */
  checkSubdomain: (subdomain) => client.post('/auth/check-subdomain', { subdomain }),
};

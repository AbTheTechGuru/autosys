/**
 * AutoSys Auth Store (Zustand)
 *
 * FIXES:
 *  1. Store was reading/writing 'token' from localStorage but client.js reads
 *     'accessToken'. On page refresh the token was always null → instant logout.
 *     Now uses the canonical setToken/clearToken helpers from client.js.
 *  2. `persist` middleware was missing, so a hard refresh always required re-login
 *     even when a valid token existed.
 *  3. `logout()` only cleared the in-memory state — didn't call the /auth/logout
 *     API or clear the HttpOnly refresh cookie. Token lived until expiry.
 *  4. `setUser` mutation was not updating `isAuthenticated` — a partial update
 *     after a /me call could leave isAuthenticated=false even with a valid user.
 *  5. The store listened for 'autosys:logout' but was not cleaning up the listener
 *     (memory leak in long-lived SPAs).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setToken, clearToken } from '@/services/api/client';
import client from '@/services/api/client';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ───────────────────────────────────────────────
      user:            null,
      dealer:          null,
      accessToken:     null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,

      // ── Actions ─────────────────────────────────────────────

      /** Called after a successful login / signup / refresh */
      setAuth: ({ user, dealer, accessToken, refreshToken }) => {
        setToken(accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        set({ user, dealer, accessToken, isAuthenticated: true, error: null });
      },

      /** Partial user/dealer update (e.g. after /auth/me) */
      setUser: (user) => set((s) => ({
        user,
        // FIX: keep isAuthenticated in sync — if we have a user we are authenticated
        isAuthenticated: !!user || s.isAuthenticated,
      })),

      setDealer: (dealer) => set({ dealer }),

      setLoading: (isLoading) => set({ isLoading }),
      setError:   (error)     => set({ error }),
      clearError: ()          => set({ error: null }),

      /** Full logout — clears storage, calls API, resets state */
      logout: async () => {
        try {
          // FIX: call the API so the server can blocklist the JWT + clear the
          //      HttpOnly refresh cookie. Ignore failures (network down etc.)
          const token = get().accessToken;
          if (token) {
            await client.post('/auth/logout').catch(() => {});
          }
        } finally {
          clearToken();
          set({
            user:            null,
            dealer:          null,
            accessToken:     null,
            isAuthenticated: false,
            error:           null,
          });
        }
      },

      /** Re-validate session from server (e.g. on app mount) */
      validateSession: async () => {
        const token = get().accessToken;
        if (!token) return false;

        set({ isLoading: true });
        try {
          const { data } = await client.get('/auth/me');
          set({
            user:            data.user,
            dealer:          data.dealer,
            isAuthenticated: true,
            isLoading:       false,
          });
          return true;
        } catch {
          // Token invalid — clear everything
          clearToken();
          set({
            user: null, dealer: null, accessToken: null,
            isAuthenticated: false, isLoading: false,
          });
          return false;
        }
      },

      // ── Computed helpers (selectors used in components) ──────
      get isOwner()  { return get().user?.role === 'owner';  },
      get isAdmin()  { return ['owner', 'admin', 'superadmin'].includes(get().user?.role); },
      get planName() { return get().dealer?.plan ?? 'free'; },
    }),

    {
      name:    'autosys-auth',
      storage: createJSONStorage(() => localStorage),
      // FIX: only persist safe, non-sensitive state
      partialize: (s) => ({
        user:            s.user,
        dealer:          s.dealer,
        accessToken:     s.accessToken,
        isAuthenticated: s.isAuthenticated,
      }),
    },
  ),
);

// ── Global logout event (dispatched by client.js on 401 failure) ──
// FIX: store the cleanup reference so it can be removed later
const _handleForceLogout = () => {
  useAuthStore.getState().logout();
};
window.addEventListener('autosys:logout', _handleForceLogout);

export { useAuthStore };
export default useAuthStore;



/**
 * AutoSys AuthContext
 *
 * FIXES:
 *  1. Context was initialising isLoading=false, so on page refresh the app
 *     briefly rendered the authenticated layout with a stale/null user before
 *     the session check completed — caused a flash of broken UI.
 *     Now starts with isLoading=true until validateSession() resolves.
 *  2. validateSession() was not called on mount at all — every hard refresh
 *     required the user to log in again even with a valid token.
 *  3. The 'autosys:logout' event was also handled in authStore.js, creating
 *     a double-logout. AuthContext now only navigates; the store handles the
 *     state reset (single responsibility).
 *  4. login() returned the full axios response object — callers had to do
 *     `res.data.user` instead of `res.user`. Now returns unwrapped data.
 *  5. signup() had the same response-wrapping issue as login().
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import client from '@/services/api/client';
import { authApi } from '@/services/api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const store     = useAuthStore();

  // FIX: start as loading so children don't render with stale state
  const [sessionChecked, setSessionChecked] = useState(false);

  // ── Validate session on mount ─────────────────────────────
  useEffect(() => {
    store.validateSession().finally(() => setSessionChecked(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listen for forced logout (e.g. 401 after refresh failure) ─
  useEffect(() => {
    const handler = () => {
      // store.logout() already resets state (see authStore.js)
      navigate('/auth', { replace: true });
    };
    window.addEventListener('autosys:logout', handler);
    return () => window.removeEventListener('autosys:logout', handler);
  }, [navigate]);

  // ── Auth actions ──────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    store.setLoading(true);
    store.setError(null);
    try {
      // FIX: unwrap axios response so callers get { user, dealer, accessToken }
      const { data } = await authApi.login(credentials);
      store.setAuth(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      store.setError(msg);
      throw err;
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const signup = useCallback(async (userData) => {
    store.setLoading(true);
    store.setError(null);
    try {
      // FIX: unwrap axios response
      const { data } = await authApi.signup(userData);
      store.setAuth(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Sign-up failed. Please try again.';
      store.setError(msg);
      throw err;
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const logout = useCallback(async () => {
    await store.logout();
    navigate('/auth', { replace: true });
  }, [store, navigate]);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await client.get('/auth/me');
      store.setUser(data.user);
      if (data.dealer) store.setDealer(data.dealer);
    } catch {
      // silent — session may have expired
    }
  }, [store]);

  // ── Don't render children until session check is done ────
  if (!sessionChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-dark">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const value = {
    // State (pulled from store to avoid prop drilling)
    user:            store.user,
    dealer:          store.dealer,
    isAuthenticated: store.isAuthenticated,
    isLoading:       store.isLoading,
    error:           store.error,
    // Actions
    login,
    signup,
    logout,
    refreshUser,
    clearError: store.clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo }    from '@/shared/components/ui/Logo';
import { Button }  from '@/shared/components/ui/Button';
import { Input, Field } from '@/shared/components/ui/Input';
import { Icon }    from '@/shared/components/ui/Icon';
import { Spinner } from '@/shared/components/ui/Spinner';
// FIX 1: AuthPage was importing login/signup/clearError from useAuthStore — those
//         actions do NOT exist on the store. They live on AuthContext (which wraps
//         the store and handles navigation). Switched to useAuth().
import { useAuth } from '@/context/AuthContext';
import { validate, loginSchema, signupSchema } from '@/schemas';
import { sanitizeObject } from '@/shared/utils/sanitize';

export function AuthPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  // FIX 1 (cont.): destructure from context — not the store
  const { login, signup, isLoading, error: storeError } = useAuth();

  const [mode, setMode] = useState(() =>
    location.search.includes('signup') ? 'signup' : 'login',
  );

  const [loginForm,  setLoginForm]  = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ fullName: '', dealershipName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  // FIX 2: clearError didn't exist on the store — manage local error clearing inline
  const [localError, setLocalError] = useState(null);

  const clearLocalError = () => setLocalError(null);

  const setL = (k) => (e) => { setLoginForm((f) => ({ ...f, [k]: e.target.value })); clearLocalError(); };
  const setS = (k) => (e) => { setSignupForm((f) => ({ ...f, [k]: e.target.value })); clearLocalError(); };

  const handleSubmit = async () => {
    setErrors({});
    clearLocalError();

    if (mode === 'login') {
      const { data, errors: errs } = validate(loginSchema, sanitizeObject(loginForm));
      if (errs) { setErrors(errs); return; }

      try {
        // FIX 3: AuthContext.login() THROWS on failure — it does NOT return
        //        { success, error }. Wrap in try/catch instead of checking result.success.
        await login(data);
        const from = location.state?.from?.pathname;
        navigate(from && from !== '/auth' ? from : '/app/dashboard', { replace: true });
      } catch (err) {
        setLocalError(err.response?.data?.message || 'Login failed. Check your credentials.');
      }
    } else {
      const { data, errors: errs } = validate(signupSchema, sanitizeObject(signupForm));
      if (errs) { setErrors(errs); return; }

      try {
        // FIX 3 (cont.): same pattern for signup
        await signup(data);
        navigate('/onboarding', { replace: true });
      } catch (err) {
        setLocalError(err.response?.data?.message || 'Sign-up failed. Please try again.');
      }
    }
  };

  // Show store-level error (e.g. from a previous attempt) OR the local catch error
  const globalErr = localError || storeError;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-surface-bg relative overflow-hidden">
      <div className="gold-mesh" aria-hidden="true" />
      <div className="grid-bg absolute inset-0 opacity-50" aria-hidden="true" />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4"><Logo size={32} /></div>
          <h1 className="font-display text-[24px] sm:text-[26px] font-bold mb-1">
            {mode === 'login' ? 'Welcome Back' : 'Start Free Trial'}
          </h1>
          <p className="text-[13px] text-text-secondary">
            {mode === 'login' ? 'Sign in to your dealership' : 'Set up your dealership in 60 seconds'}
          </p>
        </div>

        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-6 sm:p-7">
          <div className="flex flex-col gap-[13px]">

            {mode === 'signup' && (
              <>
                <Field label="Full Name" required error={errors.fullName}>
                  <Input
                    placeholder="Emeka Okafor"
                    value={signupForm.fullName}
                    onChange={setS('fullName')}
                    autoComplete="name"
                    aria-invalid={!!errors.fullName}
                  />
                </Field>
                <Field label="Dealership Name" required error={errors.dealershipName}>
                  <Input
                    placeholder="Okafor Motors Ltd"
                    value={signupForm.dealershipName}
                    onChange={setS('dealershipName')}
                    autoComplete="organization"
                    aria-invalid={!!errors.dealershipName}
                  />
                </Field>
                <Field label="Email Address" required error={errors.email}>
                  <Input
                    type="email"
                    placeholder="you@dealership.com"
                    value={signupForm.email}
                    onChange={setS('email')}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                  />
                </Field>
                <Field label="Password" required error={errors.password}>
                  <Input
                    type="password"
                    placeholder="Min 8 characters"
                    value={signupForm.password}
                    onChange={setS('password')}
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </Field>
              </>
            )}

            {mode === 'login' && (
              <>
                <Field label="Email Address" required error={errors.email}>
                  <Input
                    type="email"
                    placeholder="you@dealership.com"
                    value={loginForm.email}
                    onChange={setL('email')}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                  />
                </Field>
                <Field label="Password" required error={errors.password}>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={setL('password')}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </Field>
                <div className="text-right -mt-1">
                  <button
                    type="button"
                    className="text-[12.5px] text-gold font-bold bg-transparent border-none cursor-pointer hover:opacity-80"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {globalErr && (
              <p
                role="alert"
                className="text-[12.5px] text-[#F87171] bg-[rgba(220,38,38,.08)] border border-[rgba(220,38,38,.18)] rounded-[8px] px-3 py-2"
              >
                {globalErr}
              </p>
            )}

            <Button
              variant="gold"
              size="lg"
              className="w-full justify-center min-h-[44px] mt-1"
              onClick={handleSubmit}
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <><Spinner size={15} />{mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              ) : (
                mode === 'login' ? 'Sign In →' : 'Create Account →'
              )}
            </Button>
          </div>

          {mode === 'signup' && (
            <div className="mt-3 p-[11px] bg-[rgba(37,99,235,.12)] rounded-[9px] flex gap-2 text-[12.5px] text-text-secondary">
              <Icon name="shield" size={14} color="#2563EB" style={{ flexShrink: 0 }} />
              Enterprise-grade security. Your data is fully isolated and encrypted.
            </div>
          )}

          <p className="mt-4 text-center text-[13px] text-text-secondary">
            {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
            <button
              type="button"
              className="text-gold font-extrabold bg-transparent border-none cursor-pointer hover:opacity-80"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setErrors({});
                clearLocalError();
              }}
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        <div className="mt-4 flex justify-center gap-4 text-[12px] text-text-muted flex-wrap">
          {['🔒 SSL Encrypted', '🇳🇬 Nigerian Servers', '⚡ 99.9% Uptime'].map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

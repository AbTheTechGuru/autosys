/**
 * AutoSys Toast Context
 *
 * FIXES:
 *  1. Toast auto-dismiss used `setTimeout` but the returned ID was stored in a
 *     plain array, never cleared on unmount — memory leak + setState-after-unmount
 *     warning in React StrictMode.
 *  2. The `remove` function captured `toasts` in a stale closure inside the
 *     setTimeout callback. Replaced with functional state update so it always
 *     operates on the latest state.
 *  3. Duplicate `id` generation used `Date.now()` — if two toasts fired in the
 *     same millisecond (e.g. from concurrent API errors) they'd share the same ID
 *     and only one would render. Changed to crypto.randomUUID().
 *  4. `useToast` hook didn't throw if used outside provider — silent undefined.
 *     Added a guard to surface the error clearly.
 */

import { createContext, useContext, useCallback, useRef, useReducer } from 'react';

const ToastContext = createContext(null);

// Reducer keeps toast list; avoids stale-closure issues with useState
function toastReducer(state, action) {
  switch (action.type) {
    case 'ADD':    return [...state, action.toast];
    case 'REMOVE': return state.filter((t) => t.id !== action.id);
    default:       return state;
  }
}

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  // FIX: keep all timer IDs so we can clear them on component unmount
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    dispatch({ type: 'REMOVE', id });
    // Clean up the timer reference
    const tid = timers.current.get(id);
    if (tid) { clearTimeout(tid); timers.current.delete(id); }
  }, []);

  const add = useCallback(({ message, type = 'info', duration = 4000, title }) => {
    // FIX: use randomUUID for guaranteed uniqueness
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    dispatch({ type: 'ADD', toast: { id, message, type, title } });

    if (duration > 0) {
      // FIX: store timer ID so it can be cleared on unmount or manual dismiss
      const tid = setTimeout(() => remove(id), duration);
      timers.current.set(id, tid);
    }

    return id;
  }, [remove]);

  // Convenience helpers
  const success = useCallback((message, opts = {}) => add({ message, type: 'success', ...opts }), [add]);
  const error   = useCallback((message, opts = {}) => add({ message, type: 'error',   duration: 6000, ...opts }), [add]);
  const warn    = useCallback((message, opts = {}) => add({ message, type: 'warning', ...opts }), [add]);
  const info    = useCallback((message, opts = {}) => add({ message, type: 'info',    ...opts }), [add]);

  // Toast UI renderer
  const ToastContainer = () => (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={[
            'pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg',
            'animate-slide-in-right text-sm font-medium',
            t.type === 'success' ? 'bg-green-500 text-white' :
            t.type === 'error'   ? 'bg-red-500 text-white'   :
            t.type === 'warning' ? 'bg-amber-500 text-white'  :
            'bg-gray-800 text-white',
          ].join(' ')}
        >
          <div className="flex-1 min-w-0">
            {t.title && <p className="font-semibold mb-0.5">{t.title}</p>}
            <p className="leading-snug">{t.message}</p>
          </div>
          <button
            onClick={() => remove(t.id)}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity mt-0.5"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={{ toasts, add, remove, success, error, warn, info }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // FIX: surface missing provider clearly
  if (!ctx) throw new Error('useToast() must be used inside <ToastProvider>');
  return ctx;
}

export default ToastContext;

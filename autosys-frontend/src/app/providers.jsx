import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider }  from '@/context/AuthContext';

/**
 * Wraps the application with all required React context providers.
 * Order: outermost providers first (auth → UI → toast).
 */
export function Providers({ children }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}

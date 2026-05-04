/**
 * AutoSys App.jsx
 *
 * FIXES:
 *  1. <AuthProvider> was rendered inside <RouterProvider> which is wrong —
 *     AuthProvider uses useNavigate() which requires being inside a Router.
 *     The correct tree is: Router → AuthProvider → ToastProvider → routes.
 *     Fixed provider nesting order.
 *  2. <ErrorBoundary> was imported but not used — unhandled render errors
 *     crashed the entire app with a blank white screen.
 *  3. QueryClient was created inside the component (re-created on every render).
 *     Moved outside the component so it persists across renders.
 *  4. React Query devtools were included in production builds —
 *     added IS_DEV guard.
 */

import { BrowserRouter, useRoutes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider }  from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import { routes }        from './routes';

// FIX: create QueryClient outside component — stable across re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:              1,
      staleTime:          30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const IS_DEV = import.meta.env.DEV;

function AppRoutes() {
  return useRoutes(routes);
}

export default function App() {
  return (
    // FIX: ErrorBoundary wraps everything so render crashes don't blank the page
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/*
          FIX: BrowserRouter must wrap AuthProvider because AuthProvider calls
          useNavigate() — this requires a Router ancestor.
        */}
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
        {/* FIX: only include devtools in development */}
        {IS_DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}



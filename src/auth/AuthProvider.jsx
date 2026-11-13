import { createContext, lazy, Suspense, useContext } from 'react';

export const AuthContext = createContext({
  isConfigured: false,
  isAuthenticated: false,
  isLoading: false,
  user: null,
  loginWithRedirect: () => {},
  logout: () => {},
  getIdTokenClaims: async () => null,
  getAccessTokenSilently: async () => null,
});

/**
 * Custom hook to access Auth0 state or fallback when Auth0 is unconfigured.
 */
export function useAuth() {
  return useContext(AuthContext);
}

// The Auth0 SDK is only downloaded when it is configured (Auth0Shell.jsx); the demo never pays for it.
const Auth0Shell = lazy(() => import('./Auth0Shell'));

const fallbackValue = {
  isConfigured: false,
  isAuthenticated: false,
  isLoading: false,
  user: null,
  loginWithRedirect: () => {
    console.info('Auth0 is in demo mode. Configure VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID to enable live Universal Login.');
  },
  logout: () => {},
  getIdTokenClaims: async () => null,
  getAccessTokenSilently: async () => null,
  error: null,
};

/**
 * AppAuthProvider wraps the app with Auth0Provider if VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID
 * are provided in environment variables. Otherwise, provides a graceful offline/demo fallback.
 */
export function AppAuthProvider({ children }) {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  const isConfigured = Boolean(domain && clientId && domain !== 'your-tenant.auth0.com');

  if (!isConfigured) {
    return (
      <AuthContext.Provider value={fallbackValue}>
        {children}
      </AuthContext.Provider>
    );
  }

  // While the SDK arrives the app renders in demo mode, then re-renders signed in (or not) once it is there.
  return (
    <Suspense fallback={<AuthContext.Provider value={{ ...fallbackValue, isConfigured: true, isLoading: true }}>{children}</AuthContext.Provider>}>
      <Auth0Shell domain={domain} clientId={clientId} audience={audience}>{children}</Auth0Shell>
    </Suspense>
  );
}

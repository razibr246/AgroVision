import { createContext, useContext, useMemo } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';

const AuthContext = createContext({
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

function Auth0Bridge({ children, isConfigured }) {
  const auth0 = useAuth0();
  const value = useMemo(() => ({
    isConfigured,
    isAuthenticated: auth0.isAuthenticated,
    isLoading: auth0.isLoading,
    user: auth0.user,
    loginWithRedirect: auth0.loginWithRedirect,
    logout: auth0.logout,
    getIdTokenClaims: auth0.getIdTokenClaims,
    getAccessTokenSilently: auth0.getAccessTokenSilently,
    error: auth0.error,
  }), [isConfigured, auth0]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

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
    return (
      <AuthContext.Provider value={fallbackValue}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Safe redirect URI compatible with HashRouter and hosted subpaths
  const redirectUri = window.location.origin + window.location.pathname;

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        ...(audience ? { audience } : {}),
        scope: 'openid profile email',
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <Auth0Bridge isConfigured={isConfigured}>
        {children}
      </Auth0Bridge>
    </Auth0Provider>
  );
}

// The real Auth0 wrapper. Loaded on demand by AuthProvider.jsx only when VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID
// are set, so the ~240 KB Auth0 SDK never reaches a visitor of the demo (where sign-in is a no-op).
import { useMemo } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { AuthContext } from './AuthProvider';

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

export default function Auth0Shell({ domain, clientId, audience, children }) {
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
      <Auth0Bridge isConfigured={true}>
        {children}
      </Auth0Bridge>
    </Auth0Provider>
  );
}

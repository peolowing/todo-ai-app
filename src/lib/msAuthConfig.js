/**
 * Microsoft Authentication Configuration
 * Konfigurerar MSAL för Microsoft Graph integration
 */

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MS_CLIENT_ID || '2f527d59-6740-4c86-9d75-1a1a7d4590d3',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MS_TENANT_ID || '52607fdf-0d52-432d-9c87-602bcfd101b5'}`,
    redirectUri: import.meta.env.VITE_MS_REDIRECT_URI || 'http://localhost:3001',
    navigateToLoginRequestUrl: false,
    postLogoutRedirectUri: import.meta.env.VITE_MS_REDIRECT_URI || 'http://localhost:3001'
  },
  cache: {
    cacheLocation: 'localStorage', // Använd localStorage för persistent login
    storeAuthStateInCookie: false
  },
  system: {
    allowNativeBroker: false, // Förhindra native broker som kan orsaka problem
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    asyncPopups: false // Förhindra async popup-problem
  }
}

/**
 * Scopes som krävs för Microsoft Graph API
 */
export const loginRequest = {
  scopes: [
    'User.Read',        // Läsa användarinfo
    'Mail.Read',        // Läsa mail
    'Mail.ReadWrite',   // Markera mail som lästa
    'offline_access'    // Refresh tokens
  ],
  prompt: 'select_account' // Låt användaren välja account
}

/**
 * Graph API endpoints
 */
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphMailEndpoint: 'https://graph.microsoft.com/v1.0/me/messages',
  graphSubscriptionsEndpoint: 'https://graph.microsoft.com/v1.0/subscriptions'
}

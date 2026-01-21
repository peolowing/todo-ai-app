import React from 'react'
import ReactDOM from 'react-dom/client'
import { PublicClientApplication, EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './lib/msAuthConfig'
import App from './App.jsx'
import './index.css'

// Skapa MSAL-instans för Microsoft authentication
const msalInstance = new PublicClientApplication(msalConfig)

// Initiera MSAL och hantera redirect
msalInstance.initialize().then(() => {
  // Hantera redirect response
  msalInstance.handleRedirectPromise().then((response) => {
    if (response) {
      console.log('Login successful:', response)
    }
  }).catch((error) => {
    console.error('Redirect error:', error)
  })

  // Registrera event callbacks
  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      console.log('Login success event:', event.payload)
    }
  })

  // Rendera appen efter MSAL är redo
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>,
  )
})

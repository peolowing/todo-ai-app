import React from 'react'
import ReactDOM from 'react-dom/client'
import { PublicClientApplication, EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './lib/msAuthConfig'
import App from './App.jsx'
import './index.css'

// Skapa MSAL-instans för Microsoft authentication
const msalInstance = new PublicClientApplication(msalConfig)

// Funktion för att rendera appen
function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>,
  )
}

// Timeout för MSAL-initiering (rendera appen ändå efter 3 sekunder)
const initTimeout = setTimeout(() => {
  console.warn('MSAL initialization took too long, rendering app anyway')
  renderApp()
}, 3000)

// Initiera MSAL och hantera redirect
msalInstance.initialize().then(() => {
  clearTimeout(initTimeout)

  // Hantera redirect response med timeout
  const redirectPromise = msalInstance.handleRedirectPromise()
  const redirectTimeout = setTimeout(() => {
    console.warn('Redirect handling took too long, rendering app anyway')
    renderApp()
  }, 2000)

  redirectPromise.then((response) => {
    clearTimeout(redirectTimeout)
    if (response) {
      console.log('Login successful:', response)
    }

    // Registrera event callbacks
    msalInstance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        console.log('Login success event:', event.payload)
      }
    })

    // Rendera appen efter MSAL är redo
    renderApp()
  }).catch((error) => {
    clearTimeout(redirectTimeout)
    console.error('Redirect error:', error)
    // Rendera appen ändå, även om redirect misslyckades
    renderApp()
  })
}).catch((error) => {
  clearTimeout(initTimeout)
  console.error('MSAL initialization error:', error)
  // Rendera appen ändå, MSAL kan initieras senare
  renderApp()
})

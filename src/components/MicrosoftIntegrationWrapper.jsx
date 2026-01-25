import { useState, useEffect } from 'react'
import { PublicClientApplication, EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from '../lib/msAuthConfig'
import MicrosoftIntegration from './MicrosoftIntegration'

// Skapa MSAL-instans lazy (bara när komponenten används)
let msalInstance = null

function getMsalInstance() {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig)
  }
  return msalInstance
}

export default function MicrosoftIntegrationWrapper({ user }) {
  const [msalReady, setMsalReady] = useState(false)
  const instance = getMsalInstance()

  useEffect(() => {
    // Initiera MSAL när komponenten mountas
    instance.initialize().then(() => {
      // Hantera redirect response
      instance.handleRedirectPromise().then((response) => {
        if (response) {
          console.log('Login successful:', response)
        }
        setMsalReady(true)
      }).catch((error) => {
        console.error('Redirect error:', error)
        setMsalReady(true) // Rendera ändå
      })

      // Registrera event callbacks
      instance.addEventCallback((event) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          console.log('Login success event:', event.payload)
        }
      })
    }).catch((error) => {
      console.error('MSAL initialization error:', error)
      setMsalReady(true) // Rendera ändå
    })
  }, [])

  if (!msalReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Laddar Microsoft-integration...</div>
      </div>
    )
  }

  return (
    <MsalProvider instance={instance}>
      <MicrosoftIntegration user={user} />
    </MsalProvider>
  )
}

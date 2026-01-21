import { useState, useEffect } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest, graphConfig } from '../lib/msAuthConfig'
import { supabase } from '../lib/supabase'
import { Mail, CheckCircle, AlertCircle, Loader, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MicrosoftIntegration({ user }) {
  const { instance, accounts } = useMsal()
  const isMsAuthenticated = useIsAuthenticated()
  const [isConnecting, setIsConnecting] = useState(false)
  const [subscriptionActive, setSubscriptionActive] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState({
    msAuth: false,
    tokenSaved: false,
    subscription: false
  })
  const [debugInfo, setDebugInfo] = useState(null)

  // Hantera redirect response efter Microsoft login
  useEffect(() => {
    const handleRedirectResponse = async () => {
      const wasLoggingIn = sessionStorage.getItem('msLoginInProgress')

      if (wasLoggingIn && isMsAuthenticated && accounts.length > 0) {
        setIsConnecting(true)
        try {
          const account = accounts[0]
          const response = await instance.acquireTokenSilent({
            ...loginRequest,
            account
          })

          await handleLoginSuccess(response)
        } catch (error) {
          console.error('Error after redirect:', error)
          toast.error('Fel efter inloggning: ' + error.message)
        } finally {
          sessionStorage.removeItem('msLoginInProgress')
          setIsConnecting(false)
        }
      }
    }

    handleRedirectResponse()
  }, [isMsAuthenticated, accounts, user])

  // Kontrollera anslutningsstatus
  useEffect(() => {
    if (user) {
      checkConnectionStatus()
    }
  }, [user, isMsAuthenticated])

  // Kontrollera om subscription är aktiv
  useEffect(() => {
    if (user && isMsAuthenticated) {
      checkSubscriptionStatus()
    }
  }, [user, isMsAuthenticated])

  async function checkConnectionStatus() {
    const status = {
      msAuth: isMsAuthenticated,
      tokenSaved: false,
      subscription: false,
      accountEmail: accounts[0]?.username || 'Ingen'
    }

    try {
      // Verifiera att användaren är inloggad i Supabase
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.warn('No Supabase session found')
        setConnectionStatus(status)
        return
      }

      // Kontrollera om token finns i Supabase
      const { data: tokenData, error: tokenError } = await supabase
        .from('microsoft_tokens')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (tokenError) {
        console.error('Token query error:', tokenError)
      }

      if (tokenData) {
        status.tokenSaved = true
        status.tokenExpires = new Date(tokenData.expires_at).toLocaleString('sv-SE')
      }

      // Kontrollera subscription
      const { data: subData, error: subError } = await supabase
        .from('microsoft_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (subError) {
        console.error('Subscription query error:', subError)
      }

      if (subData) {
        const expirationDate = new Date(subData.expiration_date_time)
        status.subscription = expirationDate > new Date()
        status.subscriptionExpires = expirationDate.toLocaleString('sv-SE')
        setSubscriptionActive(status.subscription)
      }

      setConnectionStatus(status)
      setDebugInfo(status)
    } catch (error) {
      console.error('Error checking connection status:', error)
      setConnectionStatus(status)
    }
  }

  async function checkSubscriptionStatus() {
    try {
      const { data, error } = await supabase
        .from('microsoft_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Subscription status error:', error)
        return
      }

      if (data) {
        const expirationDate = new Date(data.expiration_date_time)
        if (expirationDate > new Date()) {
          setSubscriptionActive(true)
        } else {
          setSubscriptionActive(false)
          // Förnya om den har gått ut
          await renewSubscription()
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  async function handleMicrosoftLogin() {
    // Förhindra multipla login-försök
    if (isConnecting) {
      toast.error('Login pågår redan...')
      return
    }

    try {
      // Kontrollera om det redan finns en aktiv interaktion
      const activeAccount = instance.getActiveAccount()

      if (activeAccount) {
        // Försök silent token först
        try {
          setIsConnecting(true)
          const loginResponse = await instance.acquireTokenSilent({
            ...loginRequest,
            account: activeAccount
          })

          await handleLoginSuccess(loginResponse)
        } catch (silentError) {
          // Om silent misslyckas, använd redirect
          console.log('Silent token failed, using redirect')
          // Spara state innan redirect
          sessionStorage.setItem('msLoginInProgress', 'true')
          await instance.loginRedirect(loginRequest)
        }
      } else {
        // Ingen aktiv account, använd redirect
        console.log('No active account, using redirect')
        // Spara state innan redirect
        sessionStorage.setItem('msLoginInProgress', 'true')
        await instance.loginRedirect(loginRequest)
      }
    } catch (error) {
      console.error('Microsoft login error:', error)
      setIsConnecting(false)

      if (error.errorCode === 'interaction_in_progress') {
        toast.error('En inloggning pågår redan. Vänta och försök igen.')
      } else if (error.errorCode === 'user_cancelled') {
        toast.error('Inloggning avbruten')
      } else {
        toast.error('Kunde inte ansluta till Microsoft: ' + (error.errorMessage || error.message))
      }
    }
  }

  async function handleLoginSuccess(loginResponse) {
    try {
      const accessToken = loginResponse.accessToken
      console.log('✅ Login successful, got access token')

      // Spara token i Supabase
      await saveToken(accessToken, loginResponse)
      console.log('✅ Token saved to Supabase')

      // Försök skapa webhook subscription (ignorera fel om det misslyckas)
      try {
        await createSubscription(accessToken)
        console.log('✅ Webhook subscription created')
        setSubscriptionActive(true)
      } catch (webhookError) {
        console.warn('Webhook subscription failed (detta är OK):', webhookError)
        setSubscriptionActive(false)
        // Fortsätt ändå - manuell synk fungerar utan webhooks
      }

      toast.success('Microsoft Outlook ansluten! Använd "Synka nu" för att hämta flaggade mail.')

      // Uppdatera status
      await checkConnectionStatus()

      // Rensa login state
      sessionStorage.removeItem('msLoginInProgress')
    } catch (error) {
      console.error('Error handling login success:', error)
      toast.error('Fel vid anslutning: ' + error.message)
    } finally {
      setIsConnecting(false)
    }
  }

  async function handleMicrosoftLogout() {
    try {
      // Ta bort subscription (ignorera fel om den inte finns)
      try {
        await removeSubscription()
      } catch (subError) {
        console.log('Subscription removal error (ignoring):', subError)
      }

      // Ta bort token från Supabase
      try {
        await supabase
          .from('microsoft_tokens')
          .delete()
          .eq('user_id', user.id)
      } catch (tokenError) {
        console.log('Token removal error (ignoring):', tokenError)
      }

      // Logga ut från Microsoft lokalt (utan redirect till Microsoft)
      const account = accounts[0]
      if (account) {
        // Använd logout utan redirect - rensar bara lokal cache
        await instance.logoutPopup({
          account,
          mainWindowRedirectUri: window.location.origin
        }).catch(() => {
          // Om popup misslyckas, rensa bara lokalt
          instance.setActiveAccount(null)
        })
      }

      // Uppdatera state
      setSubscriptionActive(false)
      setConnectionStatus({
        msAuth: false,
        tokenSaved: false,
        subscription: false
      })

      toast.success('Microsoft Outlook frånkopplad')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Fel vid frånkoppling: ' + error.message)
    }
  }

  async function saveToken(accessToken, loginResponse) {
    const expiresAt = new Date(Date.now() + (loginResponse.expiresIn || 3600) * 1000)

    const { error } = await supabase
      .from('microsoft_tokens')
      .upsert({
        user_id: user.id,
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        scope: loginResponse.scopes?.join(' ') || '',
        updated_at: new Date().toISOString()
      })

    if (error) throw error
  }

  async function createSubscription(accessToken) {
    // Anropa Supabase Edge Function för att skapa subscription
    const { data: { session } } = await supabase.auth.getSession()

    const { data, error } = await supabase.functions.invoke('create-ms-subscription', {
      body: {
        accessToken,
        userId: user.id
      },
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      }
    })

    if (error) throw error
    return data
  }

  async function removeSubscription() {
    const { data: { session } } = await supabase.auth.getSession()

    const { error } = await supabase.functions.invoke('remove-ms-subscription', {
      body: { userId: user.id },
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      }
    })

    if (error) throw error
  }

  async function renewSubscription() {
    try {
      // Hämta nytt access token
      const account = accounts[0]
      if (!account) return

      const silentRequest = {
        ...loginRequest,
        account
      }

      const response = await instance.acquireTokenSilent(silentRequest)
      await createSubscription(response.accessToken)
      setSubscriptionActive(true)
    } catch (error) {
      console.error('Error renewing subscription:', error)
      setSubscriptionActive(false)
    }
  }

  async function manualSync() {
    setIsSyncing(true)
    try {
      const account = accounts[0]
      if (!account) {
        toast.error('Inte inloggad på Microsoft')
        return
      }

      const silentRequest = {
        ...loginRequest,
        account
      }

      const response = await instance.acquireTokenSilent(silentRequest)

      // Hämta flaggade mail
      const mailResponse = await fetch(
        `${graphConfig.graphMailEndpoint}?$filter=flag/flagStatus eq 'flagged'&$select=id,subject,bodyPreview,from,webLink,receivedDateTime&$top=20`,
        {
          headers: {
            Authorization: `Bearer ${response.accessToken}`
          }
        }
      )

      if (!mailResponse.ok) throw new Error('Kunde inte hämta mail')

      const mailData = await mailResponse.json()
      const emails = mailData.value || []

      console.log(`📧 Hittade ${emails.length} flaggade mail`)

      // Skapa tasks från mail
      let createdCount = 0
      for (const email of emails) {
        // Kontrollera om mail redan är synkat
        const { data: existingSync } = await supabase
          .from('synced_emails')
          .select('id')
          .eq('user_id', user.id)
          .eq('email_id', email.id)
          .single()

        if (!existingSync) {
          // Skapa task
          const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
              user_id: user.id,
              title: `📧 ${email.subject}`,
              description: email.bodyPreview,
              priority: 'medium',
              category: 'Emails',
              completed: false
            })
            .select()
            .single()

          if (!taskError && task) {
            // Logga synk
            await supabase
              .from('synced_emails')
              .insert({
                user_id: user.id,
                task_id: task.id,
                email_id: email.id,
                email_subject: email.subject,
                email_from: email.from?.emailAddress?.address
              })

            createdCount++
            console.log(`✅ Skapade task: ${email.subject}`)
          }
        }
      }

      setLastSyncTime(new Date())
      if (createdCount > 0) {
        toast.success(`${createdCount} nya mail synkade som tasks!`)
      } else {
        toast.success('Inga nya flaggade mail')
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Synkningsfel: ' + error.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Microsoft Outlook Integration
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Synka flaggade mail automatiskt som tasks
          </p>
        </div>

        {subscriptionActive && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Aktiv</span>
          </div>
        )}
      </div>

      {!isMsAuthenticated ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Hur det fungerar:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Anslut ditt Microsoft Outlook-konto</li>
              <li>Flagga mail i Outlook som du vill bli tasks</li>
              <li>Mail synkas automatiskt till din todo-lista</li>
            </ol>
          </div>

          <button
            onClick={handleMicrosoftLogin}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Ansluter...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Anslut Microsoft Outlook
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">
                Ansluten som {accounts[0]?.username}
              </span>
            </div>
            <p className="text-sm text-green-800">
              {subscriptionActive
                ? 'Flaggade mail synkas automatiskt var 5:e minut'
                : 'Manuell synk tillgänglig (webhook ej aktiverad lokalt)'}
            </p>
          </div>

          {/* Connection Status Debug Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900 text-sm">Anslutningsstatus</span>
              <button
                onClick={checkConnectionStatus}
                className="ml-auto text-xs text-blue-600 hover:text-blue-700"
              >
                Uppdatera
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                {connectionStatus.msAuth ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-600" />
                )}
                <span className="text-gray-700">
                  Microsoft Auth: <strong>{connectionStatus.msAuth ? 'Ja' : 'Nej'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {connectionStatus.tokenSaved ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-600" />
                )}
                <span className="text-gray-700">
                  Token sparad: <strong>{connectionStatus.tokenSaved ? 'Ja' : 'Nej'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {connectionStatus.subscription ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-600" />
                )}
                <span className="text-gray-700">
                  Webhook: <strong>{connectionStatus.subscription ? 'Aktiv' : 'Inaktiv'}</strong>
                </span>
              </div>
              {debugInfo && (
                <>
                  <div className="pt-2 mt-2 border-t border-gray-300">
                    <p className="text-gray-600">Email: <strong>{debugInfo.accountEmail}</strong></p>
                    {debugInfo.tokenExpires && (
                      <p className="text-gray-600">Token går ut: {debugInfo.tokenExpires}</p>
                    )}
                    {debugInfo.subscriptionExpires && (
                      <p className="text-gray-600">Webhook går ut: {debugInfo.subscriptionExpires}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {lastSyncTime && (
            <p className="text-sm text-gray-600">
              Senaste synk: {lastSyncTime.toLocaleTimeString('sv-SE')}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={manualSync}
              disabled={isSyncing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Synkar...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Synka nu
                </>
              )}
            </button>

            <button
              onClick={handleMicrosoftLogout}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Koppla bort
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Tips:</strong> Flagga mail i Outlook genom att högerklicka på ett mail och välja "Flagga".
              Mailet kommer då automatiskt att synkas som en task här.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

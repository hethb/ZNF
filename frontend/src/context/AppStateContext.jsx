import { createContext, useContext, useMemo, useState } from 'react'
import { setAuthToken, workflowLogin, workflowRbacRoutes, workflowSignup } from '../services/api'

const AppStateContext = createContext(null)

const SESSION_KEY = 'pathiq.session.v1'
const SETTINGS_KEY = 'pathiq.settings.v1'

const defaultSettings = {
  labName: 'PathIQ Demo Lab',
  confidenceThreshold: 80,
  requireManualReview: true,
  mockModelMode: false,
  anonymizeCaseIds: true,
  reportTemplate: 'Default Clinical Draft'
}

function parseStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    if (!value) return fallback
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function AppStateProvider({ children }) {
  const [user, setUser] = useState(() => parseStorage(SESSION_KEY, null))
  const [settings, setSettings] = useState(() => ({ ...defaultSettings, ...parseStorage(SETTINGS_KEY, {}) }))
  const [accessToken, setAccessTokenState] = useState(() => localStorage.getItem('pathiq.access_token'))
  const [allowedPrefixes, setAllowedPrefixes] = useState(() => parseStorage('pathiq.rbac.prefixes', []))
  const [authMode, setAuthMode] = useState(() => (localStorage.getItem('pathiq.access_token') ? 'server' : 'offline'))

  const loginOffline = ({ name, role }) => {
    setAuthToken(null)
    setAccessTokenState(null)
    const next = { name: name || 'Demo User', role: role || 'Pathologist', offline: true }
    setUser(next)
    setAuthMode('offline')
    setAllowedPrefixes([])
    localStorage.setItem(SESSION_KEY, JSON.stringify(next))
  }

  const finalizeServerSession = async (data) => {
    const token = data.access_token
    setAuthToken(token)
    setAccessTokenState(token)
    const u = data.user || {}
    const next = {
      id: u.id,
      username: u.username,
      name: u.name || u.username,
      role: u.role || 'Pathologist',
      offline: false
    }
    setUser(next)
    setAuthMode('server')
    localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    try {
      const rbac = await workflowRbacRoutes()
      const prefs = rbac.allowed_prefixes || []
      setAllowedPrefixes(prefs)
      localStorage.setItem('pathiq.rbac.prefixes', JSON.stringify(prefs))
    } catch {
      setAllowedPrefixes([])
    }
    return next
  }

  const loginWithServer = async (username, password) => {
    const data = await workflowLogin(username, password)
    return finalizeServerSession(data)
  }

  const signupWithServer = async (payload) => {
    const data = await workflowSignup(payload)
    return finalizeServerSession(data)
  }

  const logout = () => {
    setUser(null)
    setAuthToken(null)
    setAccessTokenState(null)
    setAllowedPrefixes([])
    setAuthMode('offline')
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem('pathiq.rbac.prefixes')
  }

  const updateSettings = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }

  const value = useMemo(
    () => ({
      user,
      loginOffline,
      loginWithServer,
      signupWithServer,
      logout,
      settings,
      updateSettings,
      accessToken,
      allowedPrefixes,
      authMode
    }),
    [user, settings, accessToken, allowedPrefixes, authMode]
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

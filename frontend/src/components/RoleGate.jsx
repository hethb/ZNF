import { Navigate, useLocation } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext'

function pathAllowed(pathname, prefixes) {
  if (!prefixes?.length) return true
  const p = pathname.split('?')[0].replace(/\/$/, '') || '/'
  return prefixes.some((pref) => {
    const base = pref.replace(/\/$/, '') || '/'
    return p === base || p.startsWith(`${base}/`)
  })
}

export default function RoleGate({ children }) {
  const { accessToken, allowedPrefixes, authMode } = useAppState()
  const location = useLocation()

  if (authMode !== 'server' || !accessToken) {
    return children
  }

  if (!pathAllowed(location.pathname, allowedPrefixes)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)

const WORKSPACE_KEYS = ['scriptmark_active_session', 'scriptmark_active_session_title', 'scriptmark_active_script']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  // False until the server has confirmed the saved role, so a page that
  // depends on the role does not act on an old copy.
  const [roleChecked, setRoleChecked] = useState(false)

  useEffect(() => {
    const savedToken = localStorage.getItem('scriptmark_token')
    const savedUser = localStorage.getItem('scriptmark_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      // The server decides the role. If the owner made this account an
      // Admin (or removed it) since sign in, pick that up now.
      api
        .getMe(savedToken)
        .then(({ user: fresh }) => {
          // Also brings in the lecturer profile (ID, faculty, department).
          const saved = JSON.parse(localStorage.getItem('scriptmark_user') || 'null')
          if (!saved || saved.id !== fresh.id) return
          const next = { ...saved, ...fresh }
          localStorage.setItem('scriptmark_user', JSON.stringify(next))
          setUser(next)
        })
        .catch(() => {})
        .finally(() => setRoleChecked(true))
    } else {
      setRoleChecked(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    window.addEventListener('scriptmark:signed-out', logout)
    return () => window.removeEventListener('scriptmark:signed-out', logout)
  }, [])

  // What one person last had open must never carry over to the next
  // person who signs in on the same browser.
  function clearWorkspace() {
    for (const key of WORKSPACE_KEYS) localStorage.removeItem(key)
  }

  function persist(nextToken, nextUser) {
    const previous = JSON.parse(localStorage.getItem('scriptmark_user') || 'null')
    if (previous?.id !== nextUser.id) clearWorkspace()
    localStorage.setItem('scriptmark_token', nextToken)
    localStorage.setItem('scriptmark_user', JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }

  async function signup({ name, email, password, departmentId }) {
    const data = await api.signup({ name, email, password, departmentId })
    persist(data.token, data.user)
    return data.user
  }

  async function login({ email, password }) {
    const data = await api.login({ email, password })
    if (data.otpRequired) {
      return { otpRequired: true, pendingToken: data.pendingToken, email: data.email }
    }
    persist(data.token, data.user)
    return { otpRequired: false, user: data.user }
  }

  async function verifyOtp({ pendingToken, code }) {
    const data = await api.verifyOtp({ pendingToken, code })
    persist(data.token, data.user)
    return data.user
  }

  // Settings: a name or department change comes back with a fresh token.
  async function updateProfile(changes) {
    const data = await api.updateProfile(changes, token)
    persist(data.token, data.user)
    return data.user
  }

  function logout() {
    clearWorkspace()
    localStorage.removeItem('scriptmark_token')
    localStorage.removeItem('scriptmark_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, roleChecked, signup, login, verifyOtp, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
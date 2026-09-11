import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('scriptmark_token')
    const savedUser = localStorage.getItem('scriptmark_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  function persist(nextToken, nextUser) {
    localStorage.setItem('scriptmark_token', nextToken)
    localStorage.setItem('scriptmark_user', JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }

  async function signup({ name, email, password, role }) {
    const data = await api.signup({ name, email, password, role })
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

  function logout() {
    localStorage.removeItem('scriptmark_token')
    localStorage.removeItem('scriptmark_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
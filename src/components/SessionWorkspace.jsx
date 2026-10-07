import { useState, useEffect } from 'react'
import { useParams, NavLink, Outlet } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { SessionProvider } from '../context/SessionContext.jsx'
import { Badge } from './ui.jsx'

export default function SessionWorkspace() {
  const { id } = useParams()
  const { token } = useAuth()
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .getSession(id, token)
      .then((data) => {
        if (cancelled) return
        setSession(data)
        // Soft hint only, read by the AI assistant so "how's this session
        // doing" resolves without asking - never the source of truth for
        // routing, which always comes from the URL.
        localStorage.setItem('scriptmark_active_session', data.id)
        localStorage.setItem('scriptmark_active_session_title', data.title)
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id, token])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" /> Loading session...
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500">
        <AlertCircle size={20} className="text-rose-400" />
        {error || 'That session could not be found.'}
      </div>
    )
  }

  const isCoordinator = session.accessLevel === 'FULL'
  const isMarker = true // any approved member of a session can review claimed questions

  const tabs = [
    isCoordinator && { to: 'scan', label: 'Scan Scripts' },
    { to: 'marking', label: 'Marking Progress' },
    isMarker && { to: 'claim-questions', label: 'Claim Questions' },
    isMarker && { to: 'my-queue', label: 'My Queue' },
    isCoordinator && { to: 'coordinator', label: 'Coordinator Overview' },
    { to: 'results', label: 'Results' },
    { to: 'analytics', label: 'Analytics' },
  ].filter(Boolean)

  return (
    <SessionProvider value={{ session, sessionId: session.id, isCoordinator }}>
      <div className="flex h-full flex-col">
        <header className="border-b border-slate-200 bg-white px-6 pt-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{session.title}</h2>
            {session.courseCode && <Badge tone="slate">{session.courseCode}</Badge>}
            <Badge tone={session.status === 'ACTIVE' ? 'green' : 'slate'}>{session.status}</Badge>
          </div>
          <nav className="mt-3 flex items-center gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `whitespace-nowrap pb-3 text-sm border-b-2 transition-colors ${
                    isActive
                      ? 'border-sky-500 text-sky-600 font-medium'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </SessionProvider>
  )
}

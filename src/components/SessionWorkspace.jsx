import { useState, useEffect, useRef } from 'react'
import { useParams, NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import {
  AlertCircle,
  Loader2,
  ScanLine,
  Activity,
  Hand,
  Inbox,
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  ChevronRight,
} from 'lucide-react'
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
  const navRef = useRef(null)
  const location = useLocation()
  const [moreToRight, setMoreToRight] = useState(false)

  function updateFade() {
    const el = navRef.current
    setMoreToRight(!!el && el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  // On narrow screens the tab row scrolls sideways; keep the active tab in
  // view, and fade the right edge only while more tabs are hidden there.
  useEffect(() => {
    const active = navRef.current?.querySelector('[aria-current="page"]')
    active?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
    updateFade()
    window.addEventListener('resize', updateFade)
    return () => window.removeEventListener('resize', updateFade)
  }, [location.pathname, session])

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
    isCoordinator && { to: 'scan', label: 'Scan Scripts', icon: ScanLine },
    { to: 'marking', label: 'Marking Progress', icon: Activity },
    isMarker && { to: 'claim-questions', label: 'Claim Questions', icon: Hand },
    isMarker && { to: 'my-queue', label: 'My Queue', icon: Inbox },
    isCoordinator && { to: 'coordinator', label: 'Coordinator Overview', icon: LayoutDashboard },
    { to: 'results', label: 'Results', icon: ClipboardCheck },
    { to: 'analytics', label: 'Analytics', icon: BarChart3 },
  ].filter(Boolean)

  return (
    <SessionProvider value={{ session, sessionId: session.id, isCoordinator }}>
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-slate-200 bg-white">
          <div className="px-4 sm:px-6 pt-4">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-400">
              <Link to="/" className="hover:text-slate-600">Sessions</Link>
              <ChevronRight size={12} />
              <span className="truncate text-slate-500">{session.courseCode || session.title}</span>
            </nav>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="min-w-0 truncate text-lg sm:text-xl font-semibold tracking-tight text-slate-900">{session.title}</h2>
              <div className="flex items-center gap-2">
                {session.courseCode && <Badge tone="slate">{session.courseCode}</Badge>}
                <Badge tone={session.status === 'ACTIVE' ? 'green' : 'slate'}>{session.status}</Badge>
              </div>
            </div>
          </div>
          <nav
            ref={navRef}
            onScroll={updateFade}
            aria-label="Session sections"
            className={`mt-3 flex items-center gap-1 overflow-x-auto px-3 sm:px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              moreToRight ? '[mask-image:linear-gradient(to_right,black_85%,transparent)]' : ''
            }`}
          >
            {tabs.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-medium shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={15} className="shrink-0 opacity-80" />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </SessionProvider>
  )
}

import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { LayoutGrid, BookOpen, Settings, Plus, HelpCircle, LogOut, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const toolItems = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/guides', label: 'Marking Guides', icon: BookOpen, restrictedTo: ['LECTURER', 'ADMIN'] },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles },
]

function statusDot(status) {
  if (status === 'ACTIVE') return 'bg-emerald-400'
  if (status === 'DRAFT') return 'bg-slate-500'
  return 'bg-slate-600'
}

function titleCase(role) {
  if (!role) return ''
  return role.charAt(0) + role.slice(1).toLowerCase()
}

export default function Sidebar({ user, onSignOut }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id: activeSessionId } = useParams()
  const [creating, setCreating] = useState(false)
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  // Refresh the list whenever a session is opened, so a session created
  // elsewhere (e.g. from Marking Guides) shows up without a full reload.
  useEffect(() => {
    if (activeSessionId) loadSessions()
  }, [activeSessionId])

  function loadSessions() {
    api
      .getSessions(token)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoadingSessions(false))
  }

  async function handleNewSession() {
    setCreating(true)
    try {
      const session = await api.createSession({ title: `Marking Session, ${new Date().toLocaleDateString()}` }, token)
      setSessions((prev) => [session, ...prev])
      navigate(`/sessions/${session.id}/marking`)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const canManage = user?.role === 'LECTURER' || user?.role === 'ADMIN'
  const visibleToolItems = toolItems.filter((item) => !item.restrictedTo || canManage)

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-ink-950 text-slate-100 px-4 py-5">
      <div className="mb-6 px-2">
        <h1 className="text-xl font-bold tracking-tight">ScriptMark</h1>
        <p className="text-xs text-slate-400 mt-0.5">AI Grading Assistant</p>
      </div>

      <nav className="space-y-1">
        {visibleToolItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-white/5 text-sky-400 border-l-2 border-sky-400 -ml-0.5 pl-3.5'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {canManage && (
        <button
          onClick={handleNewSession}
          disabled={creating}
          className="mt-5 mb-3 flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 transition-colors text-white font-medium text-sm py-2.5 disabled:opacity-60"
        >
          <Plus size={16} />
          {creating ? 'Creating...' : 'New Marking Session'}
        </button>
      )}

      <p className="px-2 mt-2 mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Sessions</p>
      <div className="flex-1 space-y-0.5 overflow-y-auto">
        {loadingSessions ? (
          <p className="px-3 py-2 text-xs text-slate-500">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="px-3 py-2 text-xs text-slate-500">No sessions yet.</p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/sessions/${s.id}/marking`)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                s.id === activeSessionId
                  ? 'bg-white/5 text-sky-400 border-l-2 border-sky-400 -ml-0.5 pl-3.5'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(s.status)}`} />
              <span className="truncate">{s.title}</span>
            </button>
          ))
        )}
      </div>

      <div className="space-y-1 border-t border-white/10 pt-4 mt-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive ? 'bg-white/5 text-sky-400' : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
          <HelpCircle size={18} />
          Help
        </button>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
        {user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 mt-2">
            <div className="h-8 w-8 rounded-full bg-sky-500 flex items-center justify-center text-xs font-semibold">
              {user.initials}
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-slate-400 leading-tight">{titleCase(user.role)}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

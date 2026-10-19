import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { LayoutGrid, BookOpen, Settings, Plus, HelpCircle, LogOut, Sparkles, PanelLeftClose, PanelLeftOpen, X, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import NewSessionDialog from './NewSessionDialog.jsx'

const toolItems = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/guides', label: 'Marking Guides', icon: BookOpen, restrictedTo: ['LECTURER', 'ADMIN'] },
  { to: '/cohorts', label: 'Cohort Analytics', icon: Users },
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

// Claude style sidebar. On desktop it can collapse to an icon rail; below
// md it becomes a drawer that slides over the page (mobileOpen), opened
// from the mobile top bar in App.jsx.
export default function Sidebar({ user, onSignOut, collapsed = false, onToggleCollapse, mobileOpen = false, onCloseMobile }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id: activeSessionId } = useParams()
  const [showNew, setShowNew] = useState(false)
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


  const canManage = user?.role === 'LECTURER' || user?.role === 'ADMIN'
  const visibleToolItems = toolItems.filter((item) => !item.restrictedTo || canManage)

  // The rail only applies on desktop; the mobile drawer always shows labels.
  const rail = collapsed && !mobileOpen
  const itemBase = `flex items-center rounded-lg text-sm transition-colors ${rail ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-2'}`
  const itemIdle = 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
  const itemActive = 'bg-white/[0.08] text-white font-medium'

  function handleCreated(session) {
    setShowNew(false)
    setSessions((prev) => [session, ...prev])
    onCloseMobile?.()
    navigate(`/guides?session=${session.id}`)
  }

  return (
    <>
      <NewSessionDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={handleCreated}
        onOpenExisting={(s) => {
          setShowNew(false)
          navigate(`/guides?session=${s.id}`)
        }}
      />
      {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-950/50 md:hidden" onClick={onCloseMobile} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col bg-ink-950 text-slate-100 transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transition-[width] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${rail ? 'md:w-[68px]' : 'md:w-64'}`}
      >
        <div className={`flex h-14 shrink-0 items-center ${rail ? 'justify-center' : 'justify-between pl-5 pr-3'}`}>
          {!rail && (
            <div className="min-w-0">
              <h1 className="text-[17px] font-semibold tracking-tight leading-none">ScriptMark</h1>
              <p className="mt-1 text-[11px] text-slate-400 leading-none">AI Grading Assistant</p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            onClick={onCloseMobile}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className={`flex min-h-0 flex-1 flex-col ${rail ? 'px-2' : 'px-3'} pb-3`}>
          {canManage && (
            <button
              onClick={() => setShowNew(true)}
              title="New Marking Session"
              className={`mb-3 flex items-center rounded-lg bg-sky-500 hover:bg-sky-400 transition-colors text-white font-medium text-sm disabled:opacity-60 ${
                rail ? 'justify-center h-10 w-10 mx-auto' : 'justify-center gap-2 py-2.5'
              }`}
            >
              <Plus size={16} />
              {!rail && 'New Marking Session'}
            </button>
          )}

          <nav className="space-y-0.5">
            {visibleToolItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                title={rail ? label : undefined}
                className={({ isActive }) => `${itemBase} ${isActive ? itemActive : itemIdle}`}
              >
                <Icon size={18} className="shrink-0" />
                {!rail && label}
              </NavLink>
            ))}
          </nav>

          {!rail && (
            <>
              <p className="px-3 mt-6 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Sessions</p>
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
                      title={s.title}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        s.id === activeSessionId ? itemActive : itemIdle
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(s.status)}`} />
                      <span className="truncate">{s.title}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
          {rail && <div className="flex-1" />}

          <div className="space-y-0.5 border-t border-white/10 pt-3 mt-3">
            <NavLink
              to="/settings"
              title={rail ? 'Settings' : undefined}
              className={({ isActive }) => `${itemBase} ${isActive ? itemActive : itemIdle}`}
            >
              <Settings size={18} className="shrink-0" />
              {!rail && 'Settings'}
            </NavLink>
            <button title={rail ? 'Help' : undefined} className={`${itemBase} ${itemIdle} ${rail ? '' : 'w-full'}`}>
              <HelpCircle size={18} className="shrink-0" />
              {!rail && 'Help'}
            </button>
            <button onClick={onSignOut} title={rail ? 'Sign Out' : undefined} className={`${itemBase} ${itemIdle} ${rail ? '' : 'w-full'}`}>
              <LogOut size={18} className="shrink-0" />
              {!rail && 'Sign Out'}
            </button>
            {user && (
              <div className={`flex items-center mt-2 ${rail ? 'justify-center py-1' : 'gap-3 px-3 py-2'}`} title={rail ? user.name : undefined}>
                <div className="h-8 w-8 shrink-0 rounded-full bg-sky-500 flex items-center justify-center text-xs font-semibold">
                  {user.initials}
                </div>
                {!rail && (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
                    <p className="text-xs text-slate-400 leading-tight">{titleCase(user.role)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

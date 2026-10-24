import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { LayoutGrid, BookOpen, Settings, Plus, HelpCircle, LogOut, Sparkles, PanelLeftClose, PanelLeftOpen, X, ChevronUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import NewSessionDialog from './NewSessionDialog.jsx'
import HelpDialog from './HelpDialog.jsx'

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

// Claude style sidebar. On desktop it can collapse to an icon rail; below
// md it becomes a drawer that slides over the page (mobileOpen), opened
// from the mobile top bar in App.jsx.
export default function Sidebar({ user, onSignOut, collapsed = false, onToggleCollapse, mobileOpen = false, onCloseMobile }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id: activeSessionId } = useParams()
  const [showNew, setShowNew] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef(null)
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

  // The profile menu closes on a click anywhere else or on Escape, like
  // any other dropdown.
  useEffect(() => {
    if (!showProfile) return
    function onDown(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setShowProfile(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [showProfile])

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
      <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />
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
          {!rail && <h1 className="text-[17px] font-semibold tracking-tight">ScriptMark</h1>}
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
              className={`mb-3 flex items-center rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors text-white font-medium text-sm disabled:opacity-60 ${
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

          {/* Settings, Help and Sign Out live in a menu under the profile,
              the way Claude's own sidebar does it, so the sidebar itself
              only holds places to go. */}
          {user && (
            <div ref={profileRef} className="relative mt-3 border-t border-white/10 pt-3">
              {showProfile && (
                <div
                  role="menu"
                  className={`absolute z-50 w-60 rounded-xl bg-white p-1.5 text-slate-800 shadow-xl ring-1 ring-slate-900/10 ${
                    rail ? 'bottom-0 left-full ml-2' : 'bottom-full left-0 right-0 mb-2 w-auto'
                  }`}
                >
                  {user.email && <p className="truncate px-3 pb-1.5 pt-2 text-xs text-slate-500">{user.email}</p>}
                  <NavLink
                    to="/settings"
                    role="menuitem"
                    onClick={() => setShowProfile(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100"
                  >
                    <Settings size={17} className="shrink-0 text-slate-500" /> Settings
                  </NavLink>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowProfile(false)
                      setShowHelp(true)
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100"
                  >
                    <HelpCircle size={17} className="shrink-0 text-slate-500" /> Help
                  </button>
                  <div className="mx-2 my-1 h-px bg-slate-200" />
                  <button
                    role="menuitem"
                    onClick={onSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100"
                  >
                    <LogOut size={17} className="shrink-0 text-slate-500" /> Sign Out
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowProfile((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={showProfile}
                title={rail ? user.name : undefined}
                className={`flex w-full items-center rounded-lg transition-colors hover:bg-white/[0.06] ${rail ? 'justify-center py-1.5' : 'gap-3 px-2 py-2 text-left'}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-500 text-xs font-semibold text-ink-950">
                  {user.initials}
                </span>
                {!rail && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium leading-tight">{user.name}</span>
                      <span className="block text-xs leading-tight text-slate-400">{titleCase(user.role)}</span>
                    </span>
                    <ChevronUp size={16} className={`shrink-0 text-slate-400 transition-transform ${showProfile ? '' : 'rotate-180'}`} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

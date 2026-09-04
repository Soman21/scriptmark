import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  BookOpen,
  CheckSquare,
  BarChart2,
  Settings,
  Plus,
  HelpCircle,
  LogOut,
  ScanLine,
  Archive as ArchiveIcon,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/scan', label: 'Scan Scripts', icon: ScanLine },
  { to: '/guides', label: 'Marking Guides', icon: BookOpen },
  { to: '/results', label: 'Results', icon: CheckSquare },
  { to: '/archive', label: 'Export Results', icon: ArchiveIcon },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ user, onSignOut }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  async function handleNewSession() {
    setCreating(true)
    try {
      await api.createSession({ title: `Marking Session — ${new Date().toLocaleDateString()}` }, token)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
      navigate('/scan')
    }
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-ink-950 text-slate-100 px-4 py-5">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold tracking-tight">ScriptMark</h1>
        <p className="text-xs text-slate-400 mt-0.5">AI Grading Assistant</p>
      </div>

      <button
        onClick={handleNewSession}
        disabled={creating}
        className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 transition-colors text-white font-medium text-sm py-2.5 disabled:opacity-60"
      >
        <Plus size={16} />
        {creating ? 'Creating...' : 'New Marking Session'}
      </button>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
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

      <div className="space-y-1 border-t border-white/10 pt-4 mt-4">
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
              <p className="text-xs text-slate-400 leading-tight">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

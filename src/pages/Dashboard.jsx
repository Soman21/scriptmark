import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ScanLine,
  BookOpen,
  CheckSquare,
  Download,
  Users,
  CheckCircle2,
  Clock,
  Flag,
  ArrowRight,
} from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, SecondaryButton, StatCard } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

export default function Dashboard() {
  const { user, token } = useAuth()
  const navigate = useNavigate()

  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(localStorage.getItem('scriptmark_active_session') || '')
  const [activeSessionTitle, setActiveSessionTitle] = useState(
    localStorage.getItem('scriptmark_active_session_title') || ''
  )
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEverything()
  }, [])

  async function loadEverything() {
    setLoading(true)
    try {
      const sessionList = await api.getSessions(token)
      setSessions(sessionList)

      if (activeSessionId) {
        const scripts = await api.getSessionScripts(activeSessionId, token)
        setStats({
          total: scripts.length,
          reviewed: scripts.filter((s) => s.status === 'REVIEWED').length,
          pending: scripts.filter((s) => s.status === 'DIGITIZED' || s.status === 'PENDING').length,
          flagged: scripts.filter((s) => s.status === 'FLAGGED').length,
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function switchSession(session) {
    localStorage.setItem('scriptmark_active_session', session.id)
    localStorage.setItem('scriptmark_active_session_title', session.title)
    localStorage.removeItem('scriptmark_active_script')
    setActiveSessionId(session.id)
    setActiveSessionTitle(session.title)
    loadEverything()
  }

  const quickActions = [
    { label: 'Scan Scripts', icon: ScanLine, to: '/scan', color: 'bg-sky-500 hover:bg-sky-400' },
    { label: 'Marking Guides', icon: BookOpen, to: '/guides', color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Review Scores', icon: CheckSquare, to: '/results', color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Export Results', icon: Download, to: '/archive', color: 'bg-slate-700 hover:bg-slate-600' },
  ]

  return (
    <div className="flex h-full flex-col">
      <Topbar title={`Welcome${user ? `, ${user.name.split(' ')[0]}` : ''}`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          {activeSessionId ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Active Session</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{activeSessionTitle}</p>
                </div>
                <SecondaryButton onClick={() => navigate('/scan')}>
                  Continue Scanning <ArrowRight size={14} />
                </SecondaryButton>
              </div>

              {loading ? (
                <p className="text-sm text-slate-400 mt-4">Loading stats...</p>
              ) : (
                stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                    <StatCard icon={<Users size={16} className="text-sky-500" />} label="Total Scripts" value={stats.total} />
                    <StatCard
                      icon={<CheckCircle2 size={16} className="text-emerald-500" />}
                      label="Reviewed"
                      value={stats.reviewed}
                    />
                    <StatCard icon={<Clock size={16} className="text-amber-500" />} label="Pending" value={stats.pending} />
                    <StatCard icon={<Flag size={16} className="text-rose-500" />} label="Flagged" value={stats.flagged} />
                  </div>
                )
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-slate-500">No active session yet.</p>
              <PrimaryButton onClick={() => navigate('/scan')} className="mt-3 mx-auto bg-sky-500 hover:bg-sky-400">
                Start a Session <ArrowRight size={14} />
              </PrimaryButton>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickActions.map(({ label, icon: Icon, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`rounded-xl ${color} text-white p-4 flex flex-col items-center gap-2 transition-colors`}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="font-semibold text-sm text-slate-900">Your Sessions</p>
          </div>
          {sessions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">
              No sessions yet — start one from Scan Scripts or Marking Guides.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-400">
                      {s.guide?.title ? `Guide: ${s.guide.title}` : 'No guide linked yet'} &bull; {s._count?.scripts ?? 0}{' '}
                      scripts
                    </p>
                  </div>
                  {s.id === activeSessionId ? (
                    <span className="text-xs font-medium text-sky-600">Active</span>
                  ) : (
                    <button
                      onClick={() => switchSession(s)}
                      className="text-xs font-medium text-slate-500 hover:text-sky-600"
                    >
                      Switch to this
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

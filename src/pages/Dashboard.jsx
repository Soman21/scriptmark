import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Sparkles, Plus, ArrowRight } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import NewSessionDialog from '../components/NewSessionDialog.jsx'

export default function Dashboard() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    api
      .getSessions(token)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const canManage = user?.role === 'LECTURER' || user?.role === 'ADMIN'

  const recent = sessions.slice(0, 6)

  return (
    <div className="flex h-full flex-col">
      <NewSessionDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(session) => navigate(`/guides?session=${session.id}`)}
        onOpenExisting={(session) => navigate(`/guides?session=${session.id}`)}
      />
      <Topbar title={`Welcome${user ? `, ${user.name.split(' ')[0]}` : ''}`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {canManage && (
            <button
              onClick={() => setShowNew(true)}
              className="rounded-xl bg-sky-500 hover:bg-sky-400 text-white p-4 flex flex-col items-center gap-2 transition-colors disabled:opacity-60"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">New Marking Session</span>
            </button>
          )}
          {canManage && (
            <button
              onClick={() => navigate('/guides')}
              className="rounded-xl bg-slate-700 hover:bg-slate-600 text-white p-4 flex flex-col items-center gap-2 transition-colors"
            >
              <BookOpen size={20} />
              <span className="text-sm font-medium">Marking Guides</span>
            </button>
          )}
          <button
            onClick={() => navigate('/assistant')}
            className="rounded-xl bg-slate-700 hover:bg-slate-600 text-white p-4 flex flex-col items-center gap-2 transition-colors"
          >
            <Sparkles size={20} />
            <span className="text-sm font-medium">AI Assistant</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="font-semibold text-sm text-slate-900">Your Sessions</p>
          </div>
          {loading ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">
              No sessions yet — start one above, or from Marking Guides.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => navigate(`/sessions/${s.id}/marking`)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.title}</p>
                      <p className="text-xs text-slate-400">
                        {s.guide?.title ? `Guide: ${s.guide.title}` : 'No guide linked yet'} &bull; {s._count?.scripts ?? 0}{' '}
                        scripts
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

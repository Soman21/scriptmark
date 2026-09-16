import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, Users } from 'lucide-react'
import { StatCard } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

export default function CoordinatorDashboard() {
  const { token } = useAuth()
  const sessionId = localStorage.getItem('scriptmark_active_session')
  const sessionTitle = localStorage.getItem('scriptmark_active_session_title')

  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) return
    api
      .getCoordinatorOverview(sessionId, token)
      .then(setOverview)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId, token])

  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No active session. Start or select a session from the Dashboard first.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" /> Loading overview...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-rose-600">
        <AlertCircle size={14} /> {error}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Coordinator Overview</h1>
        <p className="text-sm text-slate-500">{sessionTitle || 'Active session'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Scripts" value={overview.scriptCount} />
        <StatCard label="AI Marked" value={overview.aiMarked} />
        <StatCard label="Auto-accepted" value={overview.autoAccepted} subColor="text-emerald-600" />
        <StatCard label="Review Completed" value={overview.humanReviewCompleted} subColor="text-emerald-600" />
        <StatCard label="Pending Review" value={overview.pendingReview} subColor="text-amber-600" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Users size={16} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Marker Progress</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Marker</th>
              <th className="px-4 py-2 font-medium">Assigned</th>
              <th className="px-4 py-2 font-medium">Reviewed</th>
              <th className="px-4 py-2 font-medium">Pending</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {overview.perMarker.map((m) => (
              <tr key={m.user.id}>
                <td className="px-4 py-2.5 text-slate-800">{m.user.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{m.assigned}</td>
                <td className="px-4 py-2.5 text-slate-600">{m.reviewed}</td>
                <td className={`px-4 py-2.5 font-medium ${m.pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {m.pending}
                </td>
              </tr>
            ))}
            {overview.perMarker.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                  No markers are attached to this session yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
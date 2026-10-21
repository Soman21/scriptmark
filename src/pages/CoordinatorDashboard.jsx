import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, AlertTriangle, Loader2, Users } from 'lucide-react'
import { StatCard } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { api } from '../lib/api.js'

export default function CoordinatorDashboard() {
  const { token, user } = useAuth()
  const { sessionId } = useSession()

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

  const confirmed = overview.autoAccepted + overview.humanReviewCompleted
  const percent = overview.aiMarked ? Math.round((confirmed / overview.aiMarked) * 100) : 0

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Coordinator Overview</h1>
        <p className="text-sm text-slate-500">Progress per lecturer.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
          <span>
            {confirmed} of {overview.aiMarked} answers confirmed
          </span>
          <span className="text-slate-400">{percent}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {overview.pendingReview > 0
            ? `${overview.pendingReview} answers still need a marker to confirm them.`
            : overview.aiMarked > 0
              ? 'Every answer is confirmed. Results are ready to export.'
              : 'Nothing has been marked yet.'}
        </p>
      </div>

      {overview.unclaimedQuestions?.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Nobody has claimed {overview.unclaimedQuestions.length === 1 ? 'question' : 'questions'}{' '}
              {overview.unclaimedQuestions.join(', ')} yet, so those answers have no one to confirm them.
            </span>
          </p>
          <Link to={`/sessions/${sessionId}/claim-questions`} className="shrink-0 font-medium underline">
            Go to Claim Questions
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Scripts" value={overview.scriptCount} />
        <StatCard label="Answers marked by AI" value={overview.aiMarked} />
        <StatCard label="Auto accepted" value={overview.autoAccepted} subColor="text-emerald-600" />
        <StatCard label="Confirmed by lecturers" value={overview.humanReviewCompleted} subColor="text-emerald-600" />
        <StatCard label="Left to confirm" value={overview.pendingReview} subColor="text-amber-600" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Users size={16} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Lecturer progress</p>
        </div>
        <div className="divide-y divide-slate-100">
          {overview.perMarker.map((m) => {
            const done = m.assigned ? Math.round((m.reviewed / m.assigned) * 100) : 0
            return (
              <div key={m.user.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-slate-800">{m.user.name}</p>
                  <p className={`text-xs font-medium ${m.assigned && !m.pending ? 'text-emerald-600' : m.pending ? 'text-amber-600' : 'text-slate-400'}`}>
                    {!m.assigned ? 'No questions claimed' : m.pending ? `${m.pending} left to confirm` : 'All done'}
                  </p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${done}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {m.questions} {m.questions === 1 ? 'question' : 'questions'} claimed, {m.assigned} answers: {m.confirmedByMarker} confirmed by{' '}
                  {m.user.id === user?.id ? 'you' : 'them'}, {m.autoAccepted} auto accepted
                </p>
              </div>
            )
          })}
          {overview.perMarker.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">No lecturers have joined yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, UserCheck, Users, X } from 'lucide-react'
import { Badge } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

export default function ClaimQuestions() {
  const { token, user } = useAuth()
  const sessionId = localStorage.getItem('scriptmark_active_session')
  const sessionTitle = localStorage.getItem('scriptmark_active_session_title')

  const [questions, setQuestions] = useState([])
  const [markers, setMarkers] = useState([])
  const [isCoordinator, setIsCoordinator] = useState(false)
  const [guideId, setGuideId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyQuestionId, setBusyQuestionId] = useState(null)
  const [reassigningId, setReassigningId] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    loadEverything()
  }, [sessionId])

  async function loadEverything() {
    setLoading(true)
    setError('')
    try {
      const session = await api.getSession(sessionId, token)
      if (!session.guideId) {
        setError('This session does not have a marking guide yet.')
        setLoading(false)
        return
      }
      setGuideId(session.guideId)
      const status = await api.getClaimStatus(session.guideId, token)
      setQuestions(status.questions)
      setMarkers(status.markers)
      setIsCoordinator(status.isCoordinator)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleClaim(question) {
    setBusyQuestionId(question.id)
    setError('')
    try {
      await api.claimQuestion(guideId, question.id, token)
      await loadEverything()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyQuestionId(null)
    }
  }

  async function handleUnclaim(question) {
    setBusyQuestionId(question.id)
    setError('')
    try {
      await api.claimQuestion(guideId, question.id, token, null)
      await loadEverything()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyQuestionId(null)
    }
  }

  async function handleReassign(question, targetUserId) {
    setBusyQuestionId(question.id)
    setError('')
    try {
      await api.claimQuestion(guideId, question.id, token, targetUserId || null)
      setReassigningId(null)
      await loadEverything()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyQuestionId(null)
    }
  }

  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No active session. Start or select a session from the Dashboard first.
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Claim Questions</h1>
        <p className="text-sm text-slate-500">{sessionTitle || 'Active session'}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {markers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <Users size={16} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Markers on this session:</span>
          {markers.map((m) => (
            <Badge key={m.id} tone={m.id === user?.id ? 'blue' : 'slate'}>
              {m.name}
              {m.id === user?.id ? ' (you)' : ''}
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Loading questions...
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const isMine = q.assignedMarkerId === user?.id
            const isTaken = q.assignedMarkerId && !isMine
            const busy = busyQuestionId === q.id

            return (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Question {q.number}
                      {q.subLabel || ''} ({q.maxMarks} marks)
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{q.text}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {!q.assignedMarkerId && (
                      <button
                        onClick={() => handleClaim(q)}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Claim
                      </button>
                    )}

                    {isMine && (
                      <div className="flex items-center gap-2">
                        <Badge tone="green">
                          <UserCheck size={10} /> Claimed by you
                        </Badge>
                        <button
                          onClick={() => handleUnclaim(q)}
                          disabled={busy}
                          className="text-xs text-slate-400 hover:text-rose-500"
                        >
                          Unclaim
                        </button>
                      </div>
                    )}

                    {isTaken && (
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge tone="slate">Claimed by {q.assignedMarker?.name || 'another marker'}</Badge>
                        {isCoordinator && reassigningId !== q.id && (
                          <button
                            onClick={() => setReassigningId(q.id)}
                            className="text-xs font-medium text-sky-600 hover:text-sky-700"
                          >
                            Reassign
                          </button>
                        )}
                        {isCoordinator && reassigningId === q.id && (
                          <div className="flex items-center gap-1.5">
                            <select
                              onChange={(e) => handleReassign(q, e.target.value)}
                              defaultValue=""
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-sky-400"
                            >
                              <option value="" disabled>
                                Choose a marker
                              </option>
                              {markers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                            <button onClick={() => setReassigningId(null)} className="text-slate-400 hover:text-slate-600">
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {questions.length === 0 && !error && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No questions found for this session's guide.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
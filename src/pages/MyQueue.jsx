import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

function confidenceTone(confidence) {
  if (confidence === 'high') return 'green'
  if (confidence === 'medium') return 'amber'
  if (confidence === 'low') return 'red'
  return 'slate'
}

export default function MyQueue() {
  const { token, user } = useAuth()
  const sessionId = localStorage.getItem('scriptmark_active_session')
  const sessionTitle = localStorage.getItem('scriptmark_active_session_title')

  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState({}) // answerId -> { score, reason }
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    loadQueue()
  }, [sessionId])

  async function loadQueue() {
    setLoading(true)
    setError('')
    try {
      const data = await api.getMyQueue(sessionId, token)
      setAnswers(data.answers)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateDraft(answerId, field, value) {
    setDrafts((prev) => ({ ...prev, [answerId]: { ...prev[answerId], [field]: value } }))
  }

  async function handleConfirm(answer) {
    const draft = drafts[answer.id] || {}
    const score = draft.score !== undefined ? draft.score : answer.confirmedScore ?? answer.suggestedScore
    const isOverride = !!answer.confirmedAt

    if (isOverride && !draft.reason?.trim()) {
      setError('This score was already reviewed once. Please give a reason for changing it.')
      return
    }

    setSavingId(answer.id)
    setError('')
    try {
      await api.confirmScore(
        answer.id,
        { confirmedScore: Number(score), extractedText: answer.extractedText, reason: draft.reason },
        token
      )
      await loadQueue()
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[answer.id]
        return next
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  // Group flat answers by question, so each question shows once with every
  // student's response underneath it, instead of one script at a time.
  const grouped = answers.reduce((acc, a) => {
    const key = a.question.id
    if (!acc[key]) acc[key] = { question: a.question, items: [] }
    acc[key].items.push(a)
    return acc
  }, {})

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
        <h1 className="text-xl font-semibold text-slate-900">My Marking Queue</h1>
        <p className="text-sm text-slate-500">{sessionTitle || 'Active session'}, questions assigned to you</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Loading your queue...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No questions are currently assigned to you in this session.
        </div>
      ) : (
        Object.values(grouped).map(({ question, items }) => (
          <div key={question.id} className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">
                Question {question.number}
                {question.subLabel || ''} ({question.maxMarks} marks)
              </p>
              <p className="mt-1 text-sm text-slate-600">{question.text}</p>
            </div>

            <div className="space-y-3 pl-2">
              {items.map((a) => {
                const draft = drafts[a.id] || {}
                const isOverride = !!a.confirmedAt
                const displayScore = draft.score !== undefined ? draft.score : a.confirmedScore ?? a.suggestedScore

                return (
                  <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {a.script.regNumber || a.script.studentIdentifier || 'Student'}
                      </span>
                      <div className="flex items-center gap-2">
                        {a.autoAccepted && (
                          <Badge tone="green">
                            <Sparkles size={10} /> Auto-accepted
                          </Badge>
                        )}
                        <Badge tone={confidenceTone(a.confidence)}>{a.confidence || 'unscored'} confidence</Badge>
                        {a.confirmedAt && !a.autoAccepted && <Badge tone="green">Reviewed</Badge>}
                      </div>
                    </div>

                    <p className="text-xs font-medium text-slate-500">Student's answer</p>
                    <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      {a.extractedText || 'No text extracted yet.'}
                    </p>

                    {a.reasoning && (
                      <>
                        <p className="mt-2 text-xs font-medium text-slate-500">AI reasoning</p>
                        <p className="mt-1 text-sm text-slate-500">{a.reasoning}</p>
                      </>
                    )}

                    {a.changeReason && (
                      <p className="mt-2 text-xs text-amber-600">
                        Previously changed from {a.previousScore} by another reviewer, reason: {a.changeReason}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500">
                          Score (out of {question.maxMarks})
                        </label>
                        <input
                          type="number"
                          max={question.maxMarks}
                          value={displayScore ?? ''}
                          onChange={(e) => updateDraft(a.id, 'score', e.target.value)}
                          className="mt-1 w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>

                      {isOverride && (
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-xs font-medium text-slate-500">
                            Reason for changing an already-reviewed score
                          </label>
                          <input
                            value={draft.reason || ''}
                            onChange={(e) => updateDraft(a.id, 'reason', e.target.value)}
                            placeholder="Required to change this score again"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                      )}

                      <button
                        onClick={() => handleConfirm(a)}
                        disabled={savingId === a.id}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {savingId === a.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        {isOverride ? 'Save Change' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
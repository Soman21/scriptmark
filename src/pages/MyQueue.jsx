import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { api } from '../lib/api.js'
import PageAssistant from '../components/PageAssistant.jsx'
import { queueShortcuts } from '../lib/chatShortcuts.js'

function confidenceTone(confidence) {
  if (confidence === 'high') return 'green'
  if (confidence === 'medium') return 'amber'
  if (confidence === 'low') return 'red'
  return 'slate'
}

export default function MyQueue() {
  const { token, user } = useAuth()
  const { sessionId } = useSession()

  const [answers, setAnswers] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState({}) // answerId -> { score, reason }
  const [savingId, setSavingId] = useState(null)
  const [showDone, setShowDone] = useState({}) // questionId -> true when its confirmed answers are open

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

  // Scores the chat helper prepared, saved only after the lecturer taps Confirm.
  async function runAssistantAction(action) {
    for (const it of action.items) {
      await api.confirmScore(it.answerId, { confirmedScore: it.score, extractedText: it.extractedText }, token)
    }
    await loadQueue()
    return `Confirmed ${action.items.length} score${action.items.length === 1 ? '' : 's'}.`
  }

  // Group flat answers by question, so each question shows once with every
  // student's response underneath it, instead of one script at a time.
  const grouped = answers.reduce((acc, a) => {
    const key = a.question.id
    if (!acc[key]) acc[key] = { question: a.question, items: [] }
    acc[key].items.push(a)
    return acc
  }, {})
  // A fixed order by reg number, so a card never jumps after it is confirmed.
  const byReg = (x, y) => (x.script.regNumber || '').localeCompare(y.script.regNumber || '')
  const toConfirm = answers.filter((a) => !a.confirmedAt).length


  return (
    <div className={`h-full overflow-y-auto p-6 pb-24 space-y-6 ${chatOpen ? 'sm:pr-[424px]' : ''}`}>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">My Marking Queue</h1>
        <p className="text-sm text-slate-500">Questions assigned to you in this session</p>
      </div>

      {!loading && answers.length > 0 && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            toConfirm ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <CheckCircle2 size={16} className="shrink-0" />
          {toConfirm
            ? `${toConfirm} of ${answers.length} answers left to confirm.`
            : `All ${answers.length} answers in your queue are confirmed.`}
        </div>
      )}

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
        Object.values(grouped).map(({ question, items }) => {
          const todo = items.filter((a) => !a.confirmedAt).sort(byReg)
          const done = items.filter((a) => a.confirmedAt).sort(byReg)
          const open = showDone[question.id] || todo.length === 0
          return (
          <div key={question.id} className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  Question {question.number}
                  {question.subLabel || ''} ({question.maxMarks} marks)
                </p>
                <span className={`text-xs font-medium ${todo.length ? 'text-sky-700' : 'text-emerald-700'}`}>
                  {todo.length ? `${todo.length} to confirm, ${done.length} done` : `All ${done.length} done`}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{question.text}</p>
            </div>

            <div className="space-y-3 pl-2">
              {[...todo, ...(open ? done : [])].map((a) => {
                const draft = drafts[a.id] || {}
                const isOverride = !!a.confirmedAt
                const displayScore = draft.score !== undefined ? draft.score : a.confirmedScore ?? a.suggestedScore

                return (
                  <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {a.script.studentName || a.script.studentIdentifier || 'Student'}
                        {a.script.regNumber && a.script.studentName && (
                          <span className="ml-2 font-normal text-slate-400">{a.script.regNumber}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {a.autoAccepted && (
                          <Badge tone="green">
                            <Sparkles size={10} /> Auto accepted
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
                            Reason for changing a reviewed score
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
              {done.length > 0 && todo.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDone((prev) => ({ ...prev, [question.id]: !prev[question.id] }))}
                  className="text-xs font-medium text-sky-600 hover:text-sky-700"
                >
                  {open ? 'Hide confirmed answers' : `Show ${done.length} confirmed answer${done.length === 1 ? '' : 's'}`}
                </button>
              )}
            </div>
          </div>
          )
        })
      )}

      <PageAssistant
        open={chatOpen}
        onOpenChange={setChatOpen}
        page="queue"
        sessionId={sessionId}
        title="Queue assistant"
        intro="Ask about your answers. Scores it prepares wait for your tap."
        quick={queueShortcuts(answers)}
        runAction={runAssistantAction}
        hidden={answers.length === 0}
      />
    </div>
  )
}

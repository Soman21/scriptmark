import { useState, useEffect } from 'react'
import { CheckCircle2, ArrowRight, ArrowLeft, AlertCircle, ImageIcon } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, Badge } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

export default function Results() {
  const { token } = useAuth()
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftScores, setDraftScores] = useState({})
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    loadScripts()
  }, [])

  async function loadScripts() {
    setLoading(true)
    setError('')
    const sessionId = localStorage.getItem('scriptmark_active_session')
    if (!sessionId) {
      setError('No scanning session found yet — go scan a script first.')
      setLoading(false)
      return
    }
    try {
      const data = await api.getSessionScripts(sessionId, token)
      const scored = data.filter((s) => s.answers && s.answers.length > 0)
      // Low-confidence scripts need a closer look — put them first in the queue.
      scored.sort((a, b) => (b.hasLowConfidenceScore ? 1 : 0) - (a.hasLowConfidenceScore ? 1 : 0))
      setScripts(scored)

      const drafts = {}
      scored.forEach((s) => {
        s.answers.forEach((a) => {
          drafts[a.id] = a.confirmedScore ?? a.suggestedScore ?? 0
        })
      })
      setDraftScores(drafts)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const currentScript = scripts[currentIndex]
  const sessionTitle = localStorage.getItem('scriptmark_active_session_title')

  function updateDraft(answerId, value) {
    setDraftScores((prev) => ({ ...prev, [answerId]: value }))
  }

  async function handleConfirmAll() {
    if (!currentScript) return
    setConfirming(true)
    setError('')
    try {
      for (const answer of currentScript.answers) {
        await api.confirmScore(
          answer.id,
          { confirmedScore: Number(draftScores[answer.id] ?? answer.suggestedScore ?? 0) },
          token
        )
      }
      await loadScripts()
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  const confirmedTotal = currentScript
    ? currentScript.answers.reduce((sum, a) => sum + Number(draftScores[a.id] ?? 0), 0)
    : 0
  const maxPossible = currentScript
    ? currentScript.answers.reduce((sum, a) => sum + (a.question?.maxMarks || 0), 0)
    : 0

  return (
    <div className="flex h-full flex-col">
      <Topbar title={sessionTitle ? `Review: ${sessionTitle}` : 'Review Suggested Scores'} />

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading scripts...</p>
        ) : scripts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No scored scripts yet. Go to <strong>Scan Scripts</strong>, upload one, select a marking guide, and click
            "Commit to Grading Queue" — it will show up here for review.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <span className="rounded-full bg-ink-950 text-white text-xs font-medium px-3 py-1">
                  Script {currentIndex + 1} of {scripts.length}
                </span>
                <div className="flex items-center gap-2">
                  {currentScript.hasLowConfidenceScore && (
                    <span className="flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 bg-amber-50 text-amber-600">
                      <AlertCircle size={12} /> Needs a closer look
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${
                      currentScript.status === 'REVIEWED'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {currentScript.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
                <div className="rounded-lg bg-slate-50 border border-slate-200 aspect-[4/3] overflow-hidden flex items-center justify-center">
                  {currentScript.imageUrl ? (
                    <img src={currentScript.imageUrl} alt="Script" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="text-slate-300" size={32} />
                  )}
                </div>
                <div className="text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Extracted Text</p>
                  <p className="whitespace-pre-wrap max-h-56 overflow-y-auto">{currentScript.ocrText}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Suggested Scores — edit if needed, then confirm
                </p>
                {currentScript.answers.map((answer) => {
                  const q = answer.question
                  const label = q ? `Question ${q.number}${q.subLabel || ''}` : 'Question'
                  const confidenceTone =
                    answer.confidence === 'low' ? 'red' : answer.confidence === 'medium' ? 'amber' : 'green'
                  return (
                    <div key={answer.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-sky-600">{label}</span>
                          {answer.confidence && <Badge tone={confidenceTone}>{answer.confidence} confidence</Badge>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            value={draftScores[answer.id] ?? ''}
                            onChange={(e) => updateDraft(answer.id, e.target.value)}
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-sky-400"
                          />
                          <span className="text-sm text-slate-400">/ {q?.maxMarks}</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-800 mt-1">{q?.text}</p>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Expected Answer</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{q?.modelAnswer}</p>
                        </div>
                        <div className="rounded-lg bg-sky-50/50 border border-sky-100 p-2.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Student's Answer</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{answer.extractedText}</p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 mt-2">
                        <span className="text-slate-400">Suggested reasoning: </span>
                        {answer.reasoning}
                      </p>
                      {answer.confirmedAt && (
                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Confirmed
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  Total: {confirmedTotal} / {maxPossible}
                </p>
                <PrimaryButton onClick={handleConfirmAll} disabled={confirming} className="bg-emerald-600 hover:bg-emerald-500">
                  {confirming ? 'Confirming...' : 'Confirm All Scores'}
                </PrimaryButton>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">All Scripts</p>
                <ul className="space-y-2">
                  {scripts.map((s, i) => (
                    <li key={s.id}>
                      <button
                        onClick={() => setCurrentIndex(i)}
                        className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                          i === currentIndex ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s.hasLowConfidenceScore && <AlertCircle size={12} className="inline mr-1 text-amber-500" />}
                        {s.studentName || s.studentIdentifier || 'Unnamed script'}
                        <span
                          className={`ml-2 text-xs ${s.status === 'REVIEWED' ? 'text-emerald-500' : 'text-amber-500'}`}
                        >
                          {s.status}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <PrimaryButton
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="flex-1 justify-center bg-slate-600 hover:bg-slate-500"
                >
                  <ArrowLeft size={16} /> Prev
                </PrimaryButton>
                <PrimaryButton
                  onClick={() => setCurrentIndex((i) => Math.min(scripts.length - 1, i + 1))}
                  disabled={currentIndex === scripts.length - 1}
                  className="flex-1 justify-center bg-sky-500 hover:bg-sky-400"
                >
                  Next <ArrowRight size={16} />
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { CheckCircle2, ArrowRight, ArrowLeft, AlertCircle, ImageIcon, Expand, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, Badge } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

function ImageViewerModal({ pages, startIndex, onClose, onIndexChange }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndexChange((i) => Math.min(i + 1, pages.length - 1))
      if (e.key === 'ArrowLeft') onIndexChange((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [pages.length, onClose, onIndexChange])

  if (startIndex == null) return null
  const page = pages[startIndex]
  if (!page) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90">
      <div className="flex items-center justify-between px-4 py-3 text-slate-200">
        <span className="text-sm font-medium">
          Page {startIndex + 1} of {pages.length}
        </span>
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10" title="Close (Esc)">
          <X size={20} />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-auto px-4 pb-4">
        <button
          onClick={() => onIndexChange((i) => Math.max(i - 1, 0))}
          disabled={startIndex === 0}
          className="absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30 md:left-6"
        >
          <ChevronLeft size={22} />
        </button>
        <img
          src={page.imageUrl}
          alt={`Page ${page.pageNumber}`}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
        <button
          onClick={() => onIndexChange((i) => Math.min(i + 1, pages.length - 1))}
          disabled={startIndex === pages.length - 1}
          className="absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30 md:right-6"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  )
}

export default function Results() {
  const { token } = useAuth()
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftScores, setDraftScores] = useState({})
  const [draftReasons, setDraftReasons] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(null)

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
      setDraftReasons({})
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

  function updateReason(answerId, value) {
    setDraftReasons((prev) => ({ ...prev, [answerId]: value }))
  }

  // An answer needs a reason only when it was ALREADY confirmed once before,
  // and the score is now being changed to something different.
  function needsReason(answer) {
    if (!answer.confirmedAt) return false
    const draft = Number(draftScores[answer.id] ?? answer.suggestedScore ?? 0)
    return draft !== Number(answer.confirmedScore)
  }

  async function handleConfirmAll() {
    if (!currentScript) return

    const missingReasons = currentScript.answers.filter((a) => needsReason(a) && !draftReasons[a.id]?.trim())
    if (missingReasons.length > 0) {
      setError('Some scores were already confirmed once. Please give a reason for each one you changed before confirming.')
      return
    }

    setConfirming(true)
    setError('')
    try {
      for (const answer of currentScript.answers) {
        const payload = { confirmedScore: Number(draftScores[answer.id] ?? answer.suggestedScore ?? 0) }
        if (needsReason(answer)) payload.reason = draftReasons[answer.id].trim()
        await api.confirmScore(answer.id, payload, token)
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

  const currentPages = currentScript?.pages?.length
    ? currentScript.pages
    : currentScript?.imageUrl
    ? [{ pageNumber: 1, imageUrl: currentScript.imageUrl }]
    : []

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
            No scored scripts yet. Upload scripts and let Marking finish, they will show up here for review.
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
                <div>
                  <button
                    onClick={() => currentPages.length > 0 && setViewerIndex(0)}
                    disabled={currentPages.length === 0}
                    className="group relative block w-full rounded-lg bg-slate-50 border border-slate-200 aspect-[4/3] overflow-hidden"
                  >
                    {currentPages[0] ? (
                      <img src={currentPages[0].imageUrl} alt="Script" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="text-slate-300" size={32} />
                      </div>
                    )}
                    {currentPages.length > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 text-transparent transition group-hover:bg-black/30 group-hover:text-white">
                        <Expand size={18} /> View {currentPages.length > 1 ? `all ${currentPages.length} pages` : 'full size'}
                      </span>
                    )}
                  </button>
                  {currentPages.length > 1 && (
                    <p className="mt-1.5 text-center text-xs text-slate-400">{currentPages.length} pages, click to view all</p>
                  )}
                </div>
                <div className="text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Extracted Text</p>
                  <p className="whitespace-pre-wrap max-h-[28rem] overflow-y-auto leading-relaxed">{currentScript.ocrText}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Suggested Scores — edit if needed, then confirm
                </p>
                {currentScript.answers.map((answer) => {
                  const q = answer.question
                  const label = q ? `Question ${q.number}${q.subLabel || ''}` : 'Question'
                  const confidenceTone =
                    answer.confidence === 'low' ? 'red' : answer.confidence === 'medium' ? 'amber' : 'green'
                  const showReasonBox = needsReason(answer)
                  return (
                    <div key={answer.id} className="rounded-lg border border-slate-200 p-4">
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
                      <p className="text-sm font-medium text-slate-800 mt-1.5">{q?.text}</p>

                      <div className="mt-3 space-y-3">
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Expected Answer</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{q?.modelAnswer}</p>
                        </div>
                        <div className="rounded-lg bg-sky-50/50 border border-sky-100 p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Student's Answer</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{answer.extractedText}</p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 mt-2">
                        <span className="text-slate-400">Suggested reasoning: </span>
                        {answer.reasoning}
                      </p>
                      {answer.confirmedAt && !showReasonBox && (
                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Confirmed
                        </p>
                      )}

                      {showReasonBox && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <label className="text-xs font-medium text-amber-800">
                            This score was already confirmed. Say why you're changing it, to confirm again.
                          </label>
                          <input
                            value={draftReasons[answer.id] || ''}
                            onChange={(e) => updateReason(answer.id, e.target.value)}
                            placeholder="Reason for the change"
                            className="mt-1.5 w-full rounded-lg border border-amber-200 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
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

      <ImageViewerModal pages={currentPages} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} onIndexChange={setViewerIndex} />
    </div>
  )
}
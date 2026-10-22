import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ArrowRight, ArrowLeft, AlertCircle, ImageIcon, Expand, X, ChevronLeft, ChevronRight, Download, Sparkles, MessageCircle } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, Badge } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { api } from '../lib/api.js'
import PageAssistant from '../components/PageAssistant.jsx'
import { resultsShortcuts } from '../lib/chatShortcuts.js'
import ReviewAssistant from '../components/ReviewAssistant.jsx'

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
  const { session, sessionId } = useSession()
  const navigate = useNavigate()
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftScores, setDraftScores] = useState({})
  const [draftReasons, setDraftReasons] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantAsk, setAssistantAsk] = useState(null)
  const [finderOpen, setFinderOpen] = useState(false)

  useEffect(() => {
    loadScripts()
  }, [])

  async function loadScripts() {
    setLoading(true)
    setError('')
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
  const reviewedCount = scripts.filter((s) => s.status === 'REVIEWED').length

  // Each script opens on its first page.
  useEffect(() => setPageIndex(0), [currentIndex])

  function updateDraft(answerId, value) {
    setDraftScores((prev) => ({ ...prev, [answerId]: value }))
  }

  function updateReason(answerId, value) {
    setDraftReasons((prev) => ({ ...prev, [answerId]: value }))
  }

  // A score the marking assistant suggested goes into the box like a typed
  // one; if that answer was confirmed before, its reason becomes the default
  // explanation for the change, which the lecturer can edit.
  function applySuggestedScore(proposal) {
    updateDraft(proposal.answerId, String(proposal.score))
    const answer = currentScript?.answers.find((a) => a.id === proposal.answerId)
    if (answer?.confirmedAt && Number(answer.confirmedScore) !== proposal.score) {
      updateReason(proposal.answerId, `Marking assistant: ${proposal.reason || 'suggested on review'}`)
    }
  }

  // Opens the script the chat helper found.
  async function runAssistantAction(action) {
    const index = scripts.findIndex((x) => x.id === action.scriptId)
    if (index < 0) throw new Error(`${action.student} has not been marked yet, so there is nothing to open.`)
    setCurrentIndex(index)
    return `Opened ${action.student}.`
  }

  function askAbout(label) {
    setFinderOpen(false)
    setAssistantOpen(true)
    setAssistantAsk({ text: `Check ${label} again against the guide. Is the score right?`, at: Date.now() })
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
    <div className={`flex h-full flex-col transition-[padding] ${assistantOpen || finderOpen ? 'xl:pr-[420px]' : ''}`}>
      <Topbar
        title="Review Suggested Scores"
        right={
          <button
            onClick={() => navigate(`/sessions/${sessionId}/export`)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-3.5 py-2 transition-colors"
          >
            <Download size={14} /> Export Results
          </button>
        }
      />

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Loading scripts...</p>
        ) : scripts.length === 0 ? (
          <div className="m-4 sm:m-6 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No scored scripts yet. Upload scripts and let Marking finish, they will show up here for review.
          </div>
        ) : (
          <div className="flex min-h-full flex-col">
            {/* Script navigator: who this is, where they are in the pile, and a jump list */}
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {currentScript.studentName || currentScript.studentIdentifier || 'Unnamed script'}
                  </p>
                  {currentScript.regNumber && <span className="text-sm text-slate-500">{currentScript.regNumber}</span>}
                  <Badge tone={currentScript.status === 'REVIEWED' ? 'green' : 'amber'}>
                    {currentScript.status === 'REVIEWED' ? 'Reviewed' : 'Needs review'}
                  </Badge>
                  {currentScript.hasLowConfidenceScore && (
                    <Badge tone="amber">
                      <AlertCircle size={12} /> Low confidence
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Script {currentIndex + 1} of {scripts.length}, {reviewedCount} reviewed
                </p>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Previous script"
                >
                  <ArrowLeft size={16} />
                </button>
                <select
                  value={currentIndex}
                  onChange={(e) => setCurrentIndex(Number(e.target.value))}
                  aria-label="Jump to script"
                  className="h-9 min-w-0 flex-1 sm:max-w-[12rem] sm:flex-none rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {scripts.map((s, i) => (
                    <option key={s.id} value={i}>
                      {i + 1}. {s.studentName || s.studentIdentifier || 'Unnamed script'}
                      {s.status === 'REVIEWED' ? ' (reviewed)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(scripts.length - 1, i + 1))}
                  disabled={currentIndex === scripts.length - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Next script"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              {/* The script itself, kept in view beside the scores while scrolling */}
              <div className="lg:sticky lg:top-[84px] lg:self-start space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <button
                    onClick={() => currentPages.length > 0 && setViewerIndex(pageIndex)}
                    disabled={currentPages.length === 0}
                    className="group relative block w-full overflow-hidden rounded-lg border border-slate-100 bg-slate-50 aspect-[3/4] lg:aspect-auto lg:h-[calc(100vh-380px)] lg:min-h-[320px]"
                  >
                    {currentPages[pageIndex] ? (
                      <img src={currentPages[pageIndex].imageUrl} alt={`Page ${pageIndex + 1}`} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="text-slate-300" size={32} />
                      </div>
                    )}
                    {currentPages.length > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 text-transparent transition group-hover:bg-black/30 group-hover:text-white">
                        <Expand size={18} /> View full size
                      </span>
                    )}
                  </button>
                  {currentPages.length > 1 && (
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                        disabled={pageIndex === 0}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="flex items-center gap-1.5">
                        {currentPages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setPageIndex(i)}
                            className={`h-7 min-w-[28px] rounded-md px-1.5 text-xs font-medium ${
                              i === pageIndex ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setPageIndex((i) => Math.min(currentPages.length - 1, i + 1))}
                        disabled={pageIndex === currentPages.length - 1}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Full extracted text
                  </summary>
                  <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">{currentScript.ocrText}</p>
                </details>
              </div>

              <div className="min-w-0 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Suggested scores. Edit any you disagree with, then confirm.
                </p>
                {currentScript.answers.map((answer) => {
                  const q = answer.question
                  const label = q ? `Question ${q.number}${q.subLabel || ''}` : 'Question'
                  const confidenceTone =
                    answer.confidence === 'low' ? 'red' : answer.confidence === 'medium' ? 'amber' : 'green'
                  const showReasonBox = needsReason(answer)
                  return (
                    <div key={answer.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-brand-600">{label}</span>
                            {answer.confidence && (
                              <Badge tone={confidenceTone}>
                                {answer.confidence.charAt(0).toUpperCase() + answer.confidence.slice(1)} confidence
                              </Badge>
                            )}
                            <button
                              onClick={() => askAbout(label)}
                              className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                            >
                              <Sparkles size={12} /> Ask the assistant
                            </button>
                            {answer.confirmedAt && !showReasonBox && (
                              <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 size={12} /> Confirmed
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-slate-800">{q?.text}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <input
                            type="number"
                            value={draftScores[answer.id] ?? ''}
                            onChange={(e) => updateDraft(answer.id, e.target.value)}
                            aria-label={`Score for ${label}`}
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-400"
                          />
                          <span className="text-sm text-slate-400">/ {q?.maxMarks}</span>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Expected Answer</p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{q?.modelAnswer}</p>
                        </div>
                        <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3.5">
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Student's Answer</p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{answer.extractedText}</p>
                        </div>
                      </div>
                      {answer.visionTranscript && (
                        <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/50 p-3.5">
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-violet-400">
                            Recalculated From Page Image
                          </p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{answer.visionTranscript}</p>
                          <p className="mt-1.5 text-xs text-slate-400">
                            This question was flagged calculation heavy, so this is what the AI read directly from
                            the page image rather than the standard extracted text.
                          </p>
                        </div>
                      )}

                      {Array.isArray(answer.stepBreakdown) && answer.stepBreakdown.length > 0 && (
                        <div className="mt-3 rounded-lg border border-slate-200 p-3.5">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Step Breakdown</p>
                          <div className="divide-y divide-slate-100">
                            {answer.stepBreakdown.map((step, si) => (
                              <div key={si} className="flex items-start justify-between gap-3 py-1.5 text-sm">
                                <div>
                                  <p className="text-slate-700">{step.description}</p>
                                  {step.reasoning && <p className="mt-0.5 text-xs text-slate-400">{step.reasoning}</p>}
                                </div>
                                <span className="shrink-0 font-medium text-slate-700">
                                  {step.awarded} / {step.marks}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="mt-3 text-sm text-slate-600">
                        <span className="text-slate-400">AI reasoning: </span>
                        {answer.reasoning}
                      </p>

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
            </div>

            {/* Always reachable: the running total and the confirm button */}
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
              <p className="text-sm text-slate-500">
                Total <span className="ml-1 text-lg font-semibold text-slate-900">{confirmedTotal}</span> / {maxPossible}
              </p>
              <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAssistantOpen(false)
                  setFinderOpen(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <MessageCircle size={15} /> <span className="hidden sm:inline">Find scripts</span>
              </button>
              <button
                onClick={() => {
                  setFinderOpen(false)
                  setAssistantOpen(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                <Sparkles size={15} /> <span className="hidden sm:inline">Marking assistant</span>
              </button>
              <PrimaryButton onClick={handleConfirmAll} disabled={confirming} className="bg-emerald-600 hover:bg-emerald-500">
                <CheckCircle2 size={16} /> {confirming ? 'Confirming...' : 'Confirm All Scores'}
              </PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>

      <ReviewAssistant
        script={currentScript}
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onUseScore={applySuggestedScore}
        ask={assistantAsk}
      />
      <PageAssistant
        page="results"
        sessionId={sessionId}
        title="Find scripts"
        intro="Ask about the scripts here, or say whose script to open."
        quick={resultsShortcuts(scripts)}
        runAction={runAssistantAction}
        open={finderOpen}
        onOpenChange={setFinderOpen}
        onOpen={() => setAssistantOpen(false)}
        noLauncher
      />
      <ImageViewerModal pages={currentPages} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} onIndexChange={setViewerIndex} />
    </div>
  )
}
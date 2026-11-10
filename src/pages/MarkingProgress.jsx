import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, Pencil, Trash2, AlertCircle, AlertTriangle, PauseCircle } from 'lucide-react'
import { Badge, SecondaryButton } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { api } from '../lib/api.js'
import { warningText } from '../lib/points.js'

const POLL_INTERVAL_MS = 3000

function timeAgo(dateString) {
  if (!dateString) return 'N/A'
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function statusTone(status) {
  switch (status) {
    case 'PENDING':
      return 'slate'
    case 'DIGITIZED':
      return 'blue'
    case 'SCORED':
      return 'green'
    case 'REVIEWED':
      return 'green'
    case 'FLAGGED':
      return 'red'
    default:
      return 'slate'
  }
}

function statusLabel(status) {
  switch (status) {
    case 'PENDING':
      return 'Queued'
    case 'DIGITIZED':
      return 'Digitizing done, scoring next'
    case 'SCORED':
      return 'Marked, awaiting review'
    case 'REVIEWED':
      return 'Reviewed'
    case 'FLAGGED':
      return 'Needs attention'
    default:
      return status
  }
}

export default function MarkingProgress() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const { sessionId } = useSession()

  const [scripts, setScripts] = useState([])
  const [total, setTotal] = useState(0)
  const [markedCount, setMarkedCount] = useState(0)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  // Errors from Remark and Delete. Kept apart from polling errors: every
  // poll clears its own error, and used to wipe these within 3 seconds.
  const [actionError, setActionError] = useState('')
  // Scripts being marked again, by id. Each row has its own spinner, so
  // the other rows stay usable while one script is marked.
  const [remarking, setRemarking] = useState(() => new Set())
  const [guideId, setGuideId] = useState(null)
  const redirectedRef = useRef(false)
  const sawUnmarkedRef = useRef(false)
  const [showDuplicates, setShowDuplicates] = useState(false)
  // Set by the server when marking stopped because the AI's daily allowance
  // ran out; the remaining scripts wait, unflagged, until marking resumes.
  const [paused, setPaused] = useState(null)
  const [resuming, setResuming] = useState(false)
  // Guide arithmetic problems (points vs part, parts vs question total).
  const [guideWarnings, setGuideWarnings] = useState([])

  useEffect(() => {
    if (!sessionId) return
    api
      .getSession(sessionId, token)
      .then(async (s) => {
        setGuideId(s.guideId)
        if (s.guideId) setGuideWarnings((await api.getGuide(s.guideId, token)).warnings || [])
      })
      .catch(() => {})
  }, [sessionId, token])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false

    async function poll() {
      try {
        const data = await api.getMarkingStatus(sessionId, token)
        if (cancelled) return
        setScripts(data.scripts)
        setTotal(data.total)
        setMarkedCount(data.markedCount)
        setPaused(data.paused || null)
        setError('')

        // Move on to Results only when marking finishes while the lecturer
        // watches; a session that was already marked stays here to browse.
        if (data.markedCount < data.total) sawUnmarkedRef.current = true
        if (sawUnmarkedRef.current && data.total > 0 && data.markedCount === data.total && !redirectedRef.current) {
          redirectedRef.current = true
          setTimeout(() => navigate(`/sessions/${sessionId}/results`), 1200)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [sessionId, token, navigate])

  // A script that failed before any answer was saved goes back through
  // Mark, which reads its pages again if needed. One with answers is scored
  // again from its saved text.
  async function handleRemark(s) {
    if (!guideId) return
    setRemarking((prev) => new Set(prev).add(s.id))
    setActionError('')
    try {
      if (!s.answerCount) await api.startMarking(sessionId, token)
      else await api.scoreScript(s.id, guideId, token)
      const data = await api.getMarkingStatus(sessionId, token)
      setScripts(data.scripts)
      setTotal(data.total)
      setMarkedCount(data.markedCount)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setRemarking((prev) => {
        const next = new Set(prev)
        next.delete(s.id)
        return next
      })
    }
  }

  async function handleResume() {
    setResuming(true)
    try {
      await api.startMarking(sessionId, token)
      setPaused(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setResuming(false)
    }
  }

  async function handleDelete(scriptId) {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return
    try {
      await api.deleteScript(sessionId, scriptId, token)
      setScripts((prev) => prev.filter((s) => s.id !== scriptId))
      setTotal((t) => t - 1)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const scannedTwice = scripts.filter((s) => s.duplicateOf?.length)
  const filtered = scripts.filter((s) => {
    if (showDuplicates && !s.duplicateOf?.length) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (s.studentName || '').toLowerCase().includes(q) || (s.regNumber || '').toLowerCase().includes(q)
  })

  const percent = total > 0 ? Math.round((markedCount / total) * 100) : 0


  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Marking Progress</h1>

      {[error, actionError].filter(Boolean).map((msg) => (
        <div key={msg} className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          <AlertCircle size={14} className="shrink-0" /> <span className="min-w-0 break-words">{msg}</span>
          {msg === actionError && (
            <button type="button" onClick={() => setActionError('')} className="ml-auto shrink-0 text-xs underline">
              Dismiss
            </button>
          )}
        </div>
      ))}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
          <span>
            {markedCount} of {total} submission{total === 1 ? '' : 's'} marked
          </span>
          <span className="text-slate-400">{percent}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        {total > 0 && markedCount === total && (
          <p className="mt-2 text-xs text-emerald-600">
            All submissions marked.{sawUnmarkedRef.current ? ' Taking you to Results...' : ''}
          </p>
        )}
      </div>

      {guideWarnings.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">Guide totals do not match.</span> {guideWarnings.map(warningText).join('. ')}.
            </span>
          </p>
          <button
            type="button"
            onClick={() => navigate(`/guides?session=${sessionId}`)}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
          >
            Edit guide
          </button>
        </div>
      )}

      {paused?.reason === 'AI_DAILY_LIMIT' && markedCount < total && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2">
            <PauseCircle size={16} className="mt-0.5 shrink-0" />
            <span>Marking paused. Daily AI limit reached.</span>
          </p>
          <button type="button" onClick={handleResume} disabled={resuming} className="shrink-0 font-medium underline disabled:opacity-50">
            {resuming ? 'Resuming...' : 'Resume'}
          </button>
        </div>
      )}

      {scannedTwice.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              {scannedTwice.length} scripts share a reg number, so a student may have been scanned twice. Keep the copy that is already marked and delete the other, or fix a misread reg number in Results, before you export.
            </span>
          </p>
          <button type="button" onClick={() => setShowDuplicates((v) => !v)} className="shrink-0 font-medium underline">
            {showDuplicates ? 'Show all' : 'Show them'}
          </button>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or reg number"
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Reg Number / Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <tr
                key={s.id}
                onClick={() => s.answerCount > 0 && navigate(`/sessions/${sessionId}/results?script=${s.id}`)}
                className={`hover:bg-slate-50 ${s.answerCount > 0 ? 'cursor-pointer' : ''}`}
                title={s.answerCount > 0 ? 'Open in Results' : undefined}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 font-medium text-slate-800">
                    {s.regNumber || 'Reg number pending'}
                    {s.duplicateOf?.length > 0 && <Badge tone="amber">Scanned twice</Badge>}
                  </div>
                  <div className="text-xs text-slate-400">{s.studentName || 'Name pending'}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                  {s.failReason && <div className="mt-1 text-xs text-rose-500">{s.failReason}</div>}
                </td>
                <td className="px-4 py-3 text-slate-700">{s.totalScore != null ? s.totalScore : 'N/A'}</td>
                <td className="px-4 py-3 text-slate-400">{timeAgo(s.updatedAt)}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRemark(s)}
                      disabled={remarking.has(s.id)}
                      className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50"
                      title="Score again"
                    >
                      <RefreshCw size={12} className={remarking.has(s.id) ? 'animate-spin' : ''} /> {remarking.has(s.id) ? 'Marking...' : 'Remark'}
                    </button>
                    {s.answerCount > 0 && (
                      <button
                        onClick={() => navigate(`/sessions/${sessionId}/results?script=${s.id}`)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                        title="Edit in Results"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                    {user?.role !== 'REVIEWER' && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600"
                        title="Delete this submission"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  No submissions match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SecondaryButton onClick={() => navigate(`/sessions/${sessionId}/results`)}>Go to Results now</SecondaryButton>
    </div>
  )
}
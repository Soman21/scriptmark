import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { Badge, SecondaryButton } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const POLL_INTERVAL_MS = 3000

function timeAgo(dateString) {
  if (!dateString) return '—'
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
      return 'Marked — awaiting review'
    case 'REVIEWED':
      return 'Reviewed'
    case 'FLAGGED':
      return 'Needs attention'
    default:
      return status
  }
}

export default function MarkingProgress() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const sessionId = localStorage.getItem('scriptmark_active_session')
  const sessionTitle = localStorage.getItem('scriptmark_active_session_title')

  const [scripts, setScripts] = useState([])
  const [total, setTotal] = useState(0)
  const [markedCount, setMarkedCount] = useState(0)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [guideId, setGuideId] = useState(null)
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (!sessionId) return
    api.getSession(sessionId, token).then((s) => setGuideId(s.guideId)).catch(() => {})
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
        setError('')

        if (data.total > 0 && data.markedCount === data.total && !redirectedRef.current) {
          redirectedRef.current = true
          setTimeout(() => navigate('/results'), 1200)
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

  async function handleRemark(scriptId) {
    if (!guideId) return
    try {
      await api.scoreScript(scriptId, guideId, token)
      const data = await api.getMarkingStatus(sessionId, token)
      setScripts(data.scripts)
      setTotal(data.total)
      setMarkedCount(data.markedCount)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(scriptId) {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return
    try {
      await api.deleteScript(sessionId, scriptId, token)
      setScripts((prev) => prev.filter((s) => s.id !== scriptId))
      setTotal((t) => t - 1)
    } catch (err) {
      setError(err.message)
    }
  }

  const filtered = scripts.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (s.studentName || '').toLowerCase().includes(q) || (s.regNumber || '').toLowerCase().includes(q)
  })

  const percent = total > 0 ? Math.round((markedCount / total) * 100) : 0

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
        <h1 className="text-xl font-semibold text-slate-900">Marking Progress</h1>
        <p className="text-sm text-slate-500">{sessionTitle || 'Active session'}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}

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
          <p className="mt-2 text-xs text-emerald-600">All submissions marked — taking you to Results...</p>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or reg number"
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
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
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{s.regNumber || 'Reg number pending'}</div>
                  <div className="text-xs text-slate-400">{s.studentName || 'Name pending'}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-700">{s.totalScore != null ? s.totalScore : '—'}</td>
                <td className="px-4 py-3 text-slate-400">{timeAgo(s.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRemark(s.id)}
                      className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700"
                      title="Re-run scoring for this submission"
                    >
                      <RefreshCw size={12} /> Remark
                    </button>
                    <button
                      onClick={() => navigate('/results')}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                      title="Edit in Results"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600"
                      title="Delete this submission"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
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

      <SecondaryButton onClick={() => navigate('/results')}>Go to Results now</SecondaryButton>
    </div>
  )
}

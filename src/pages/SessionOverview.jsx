import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Loader2, Copy, Check, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { api } from '../lib/api.js'

function initials(name) {
  return (name || '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-3 text-sm last:border-0">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-right text-slate-800">{children}</span>
    </div>
  )
}

// The first tab of every session: join code, counts, details and who is
// marking. One request to /overview fills the whole page.
export default function SessionOverview() {
  const { token } = useAuth()
  const { sessionId, openAddLecturers } = useSession()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState('')

  function load() {
    api
      .getSessionOverview(sessionId, token)
      .then(setData)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [sessionId])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(data.joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  async function decide(userId, approve) {
    setBusy(userId)
    try {
      if (approve) await api.approveMarker(sessionId, userId, token)
      else await api.denyMarker(sessionId, userId, token)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
          <AlertCircle size={16} /> {error}
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" /> Loading...
      </div>
    )
  }

  const { counts } = data
  const semester = [data.academicSession, data.semester].filter(Boolean).join(', ')

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        {data.joinCode && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-950 p-4 text-white">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-400">Join code</p>
              <p className="text-2xl font-semibold tracking-[0.2em]">{data.joinCode}</p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-2 text-sm font-semibold text-ink-950 hover:bg-gold-400"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Lecturers" value={counts.lecturers} />
          <Stat label="Students" value={counts.students} />
          <Stat label="Scripts scanned" value={counts.scriptsScanned} />
          <Stat label="Marked" value={`${counts.markedPercent}%`} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4">
            <Row label="Type">{data.examinationType || 'N/A'}</Row>
            <Row label="Session">{semester || 'N/A'}</Row>
            <Row label="Department">{data.department || 'N/A'}</Row>
            <Row label="Faculty">{data.faculty || 'N/A'}</Row>
            <Row label="Marking guide">
              {data.guide ? (
                <span className={data.guide.published ? 'font-medium text-emerald-700' : 'text-gold-700'}>
                  {data.guide.published ? 'Published' : 'Draft'}
                </span>
              ) : (
                <Link to={`/guides?session=${data.id}`} className="font-medium text-brand-600 hover:underline">
                  Not set
                </Link>
              )}
            </Row>
            <Row label="Unclaimed questions">{counts.unclaimedQuestions}</Row>
            <Row label="Created">
              {new Date(data.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              {data.createdBy ? ` by ${data.createdBy.name}` : ''}
            </Row>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 pb-2">
            <div className="flex items-center justify-between py-3">
              <p className="font-semibold text-slate-900">Lecturers</p>
              {data.canManage && (
                <button
                  type="button"
                  onClick={openAddLecturers}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UserPlus size={15} /> Add lecturers
                </button>
              )}
            </div>
            {data.pending.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 border-t border-slate-100 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-semibold text-gold-700">
                  {initials(p.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-gold-700">Join request</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => decide(p.id, true)}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    Grant access
                  </button>
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => decide(p.id, false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
            {data.lecturers.map((l) => (
              <div key={l.id} className="flex items-center gap-3 border-t border-slate-100 py-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    l.isCoordinator ? 'bg-gold-500 text-ink-950' : 'bg-brand-100 text-brand-700'
                  }`}
                >
                  {initials(l.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{l.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {l.isCoordinator ? 'Coordinator' : l.accessLevel === 'FULL' ? 'Full access' : 'Lecturer'}
                    {' · '}
                    {l.questions.length ? l.questions.join(', ') : 'No questions claimed'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

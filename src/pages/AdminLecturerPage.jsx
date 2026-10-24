import { useState, useEffect } from 'react'
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom'
import { AlertCircle, ChevronLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { timeAgo } from '../lib/time.js'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, SecondaryButton, Badge } from '../components/ui.jsx'

const date = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const STATUS = { ACTIVE: ['Active', 'green'], DRAFT: ['Draft', 'slate'], COMPLETED: ['Completed', 'slate'] }

function Card({ title, right, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  )
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
    <div className="flex items-baseline justify-between gap-4 px-5 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-800">{children}</span>
    </div>
  )
}

function SessionList({ sessions, empty, navigate }) {
  if (!sessions.length) return <p className="px-5 py-6 text-center text-sm text-slate-400">{empty}</p>
  return (
    <ul className="divide-y divide-slate-100">
      {sessions.map((s) => {
        const [label, tone] = STATUS[s.status] || STATUS.DRAFT
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => navigate(`/sessions/${s.id}`)}
              className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm hover:bg-slate-50"
            >
              <span className="min-w-0 truncate text-slate-800">{s.title}</span>
              <Badge tone={tone}>{label}</Badge>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// One lecturer, for Admins: profile, work, activity, and suspend or restore.
export default function AdminLecturerPage() {
  const { id } = useParams()
  const { user, token, roleChecked } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [suspending, setSuspending] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  function load() {
    api
      .getLecturer(id, token)
      .then(setData)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    if (user?.role === 'ADMIN') load()
  }, [id, token, user?.role])

  if (user && user.role !== 'ADMIN') {
    if (!roleChecked) return null
    return <Navigate to="/" replace />
  }

  async function act(fn) {
    setBusy(true)
    setActionError('')
    try {
      await fn()
      setSuspending(false)
      setReason('')
      load()
    } catch (err) {
      setActionError(err.message)
    }
    setBusy(false)
  }

  const l = data?.lecturer

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Lecturer" />
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ChevronLeft size={16} /> Admin
        </Link>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {!data && !error && (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {data && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">{l.name}</h2>
                  {l.owner ? <Badge tone="amber">Owner</Badge> : l.admin && <Badge tone="blue">Admin</Badge>}
                  <Badge tone={l.suspendedAt ? 'red' : 'green'}>{l.suspendedAt ? 'Suspended' : 'Active'}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {l.lecturerId} · {l.email}
                </p>
              </div>
              {data.canSuspend && !suspending && (
                l.suspendedAt ? (
                  <PrimaryButton disabled={busy} onClick={() => act(() => api.restoreLecturer(l.id, token))}>
                    Restore access
                  </PrimaryButton>
                ) : (
                  <SecondaryButton onClick={() => setSuspending(true)}>Suspend</SecondaryButton>
                )
              )}
            </div>

            {l.suspendedAt && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                Suspended {date(l.suspendedAt)}: {l.suspendReason}
              </div>
            )}

            {suspending && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  act(() => api.suspendLecturer(l.id, reason.trim(), token))
                }}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
              >
                <label htmlFor="suspend-reason" className="text-sm font-medium text-slate-700">
                  Reason
                </label>
                <textarea
                  id="suspend-reason"
                  value={reason}
                  maxLength={300}
                  rows={2}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <div className="flex gap-2">
                  <PrimaryButton type="submit" disabled={busy || !reason.trim()}>
                    Suspend lecturer
                  </PrimaryButton>
                  <SecondaryButton type="button" onClick={() => setSuspending(false)}>
                    Cancel
                  </SecondaryButton>
                </div>
              </form>
            )}
            {actionError && <p className="text-sm text-rose-600">{actionError}</p>}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <Stat label="Sessions created" value={data.stats.sessionsCreated} />
              <Stat label="Sessions joined" value={data.stats.sessionsJoined} />
              <Stat label="Marking guides" value={data.stats.guides} />
              <Stat label="Questions claimed" value={data.stats.questionsClaimed} />
              <Stat label="Answers marked" value={data.stats.answersMarked} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="Profile">
                <div className="divide-y divide-slate-100">
                  <Row label="ScriptMark ID">{l.lecturerId || 'None'}</Row>
                  <Row label="Institution">{l.institution || 'Not set'}</Row>
                  <Row label="Faculty">{l.faculty || 'Not set'}</Row>
                  <Row label="Department">{l.department || 'Not set'}</Row>
                  <Row label="Joined">{date(l.createdAt)}</Row>
                  <Row label="Last active">{l.lastActiveAt ? timeAgo(l.lastActiveAt) : 'Never'}</Row>
                </div>
              </Card>
              <Card title="Sessions created" right={<span className="text-sm text-slate-500">{data.sessionsCreated.length}</span>}>
                <SessionList sessions={data.sessionsCreated} empty="None yet" navigate={navigate} />
              </Card>
              <Card title="Sessions joined" right={<span className="text-sm text-slate-500">{data.sessionsJoined.length}</span>}>
                <SessionList sessions={data.sessionsJoined} empty="None yet" navigate={navigate} />
              </Card>
            </div>

            <Card title="Activity">
              {data.activity.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No activity yet</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.activity.map((a) => (
                    <li key={a.id} className="flex items-baseline justify-between gap-4 px-5 py-3 text-sm">
                      <span className="text-slate-700">{a.text}</span>
                      <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

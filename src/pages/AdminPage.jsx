import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { timeAgo } from '../lib/time.js'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, Badge } from '../components/ui.jsx'
import AdminAnalytics from '../components/AdminAnalytics.jsx'

const TABS = ['Overview', 'Analytics', 'Lecturers', 'Sessions', 'Admins']

const date = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function uptime(seconds) {
  const h = Math.floor(seconds / 3600)
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h`
  return `${h} h ${Math.floor((seconds % 3600) / 60)} min`
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function Card({ title, children, right }) {
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

function StatusRow({ label, ok, detail }) {
  return (
    <li className="flex items-center justify-between px-5 py-3 text-sm">
      <span className="flex items-center gap-2.5 text-slate-700">
        <span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        {label}
      </span>
      <span className="text-slate-500">{detail}</span>
    </li>
  )
}

function Table({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}

const filterClass =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

const SOURCE = { OWNER: 'Owner', EMAIL_LIST: 'Email list', GRANTED: 'Admin' }

// Only for Admins. The server refuses everyone else (403), so the redirect
// below is only for a tidy screen, not the protection.
export default function AdminPage() {
  const { user, token, roleChecked } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [data, setData] = useState(null)
  const [admins, setAdmins] = useState(null)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [adminError, setAdminError] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [faculty, setFaculty] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')

  function loadAdmins() {
    api
      .getAdmins(token)
      .then(setAdmins)
      .catch((err) => setAdminError(err.message))
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') return
    api
      .getAdminOverview(token)
      .then(setData)
      .catch((err) => setError(err.message))
    loadAdmins()
  }, [token, user?.role])

  if (user && user.role !== 'ADMIN') {
    // Wait for the server's answer: the owner may have just made this account an Admin.
    if (!roleChecked)
      return (
        <div className="flex h-full items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      )
    return <Navigate to="/" replace />
  }

  async function addAdmin(e) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setAdminError('')
    try {
      await api.addAdmin(email.trim(), token)
      setEmail('')
      loadAdmins()
    } catch (err) {
      setAdminError(err.message)
    }
    setBusy(false)
  }

  async function removeAdmin(id) {
    setBusy(true)
    setAdminError('')
    try {
      await api.removeAdmin(id, token)
      loadAdmins()
    } catch (err) {
      setAdminError(err.message)
    }
    setBusy(false)
  }

  const q = query.trim().toLowerCase()
  const match = (...fields) => !q || fields.some((f) => (f || '').toLowerCase().includes(q))

  // Filter choices come from the lecturers themselves, so only faculties and
  // departments that have someone in them are offered.
  const lecturers = data?.lecturers || []
  const faculties = [...new Set(lecturers.map((l) => l.faculty).filter(Boolean))].sort()
  const departments = [
    ...new Set(lecturers.filter((l) => !faculty || l.faculty === faculty).map((l) => l.department).filter(Boolean)),
  ].sort()
  const shownLecturers = lecturers.filter(
    (l) =>
      match(l.name, l.email, l.lecturerId) &&
      (!faculty || l.faculty === faculty) &&
      (!department || l.department === department) &&
      (!status || (status === 'suspended') === l.suspended)
  )

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Admin" />
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <nav className="flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t)
                setQuery('')
              }}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                tab === t ? 'bg-ink-950 font-medium text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

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

        {data && tab === 'Overview' && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <Stat label="Lecturers" value={data.totals.users} />
              <Stat label="Sessions" value={data.totals.sessions} sub={`${data.totals.activeSessions} active`} />
              <Stat label="Marking guides" value={data.totals.guides} />
              <Stat label="Scripts" value={data.totals.scripts} />
              <Stat label="Answers marked" value={data.totals.marked} />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="System status">
                <ul className="divide-y divide-slate-100">
                  <StatusRow label="Database" ok={data.status.database.ok} detail={`${data.status.database.ms} ms`} />
                  {data.status.services.map((s) => (
                    <StatusRow key={s.name} label={s.name} ok={s.ok} detail={s.ok ? 'Connected' : 'Not set'} />
                  ))}
                  <StatusRow label="Server" ok detail={`Up ${uptime(data.status.uptimeSeconds)}`} />
                </ul>
              </Card>
              <div className="lg:col-span-2">
                <Card title="Activity">
                  {data.activity.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-400">No activity yet</p>
                  ) : (
                    <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
                      {data.activity.map((a) => (
                        <li key={a.id} className="flex items-baseline justify-between gap-4 px-5 py-3 text-sm">
                          <span className="text-slate-700">{a.text}</span>
                          <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}

        {tab === 'Analytics' && <AdminAnalytics />}

        {data && (tab === 'Lecturers' || tab === 'Sessions') && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        )}

        {data && tab === 'Lecturers' && (
          <div className="flex flex-wrap gap-2">
            <select aria-label="Faculty" value={faculty} onChange={(e) => { setFaculty(e.target.value); setDepartment('') }} className={filterClass}>
              <option value="">All faculties</option>
              {faculties.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <select aria-label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className={filterClass}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={filterClass}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        )}

        {data && tab === 'Lecturers' && (
          <Card title="Lecturers" right={<span className="text-sm text-slate-500">{shownLecturers.length}</span>}>
            <Table head={['ID', 'Name', 'Faculty', 'Department', 'Status', 'Last active', 'Sessions']}>
              {shownLecturers.map((l) => (
                <tr key={l.id} onClick={() => navigate(`/admin/lecturers/${l.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">{l.lecturerId || ''}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <p className="text-slate-800">{l.name}</p>
                    <p className="text-xs text-slate-500">{l.email}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{l.faculty || <span className="text-slate-400">Not set</span>}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{l.department || <span className="text-slate-400">Not set</span>}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={l.suspended ? 'red' : 'green'}>{l.suspended ? 'Suspended' : 'Active'}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{l.lastActiveAt ? timeAgo(l.lastActiveAt) : 'Never'}</td>
                  <td className="px-4 py-2.5 text-slate-700">{l.sessionsCreated + l.sessionsJoined}</td>
                </tr>
              ))}
            </Table>
            {shownLecturers.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">No lecturers match</p>}
          </Card>
        )}

        {data && tab === 'Sessions' && (
          <Card title="Sessions" right={<span className="text-sm text-slate-500">{data.sessions.length}</span>}>
            <Table head={['Session', 'Coordinator', 'Scripts', 'Lecturers', 'Status', 'Created']}>
              {data.sessions
                .filter((s) => match(s.title, s.courseCode, s.coordinator))
                .map((s) => (
                  <tr key={s.id} onClick={() => navigate(`/sessions/${s.id}`)} className="cursor-pointer hover:bg-slate-50">
                    <td className="max-w-xs truncate px-4 py-2.5 text-slate-800">{s.title}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{s.coordinator}</td>
                    <td className="px-4 py-2.5 text-slate-700">{s.scripts}</td>
                    <td className="px-4 py-2.5 text-slate-700">{s.lecturers}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={s.status === 'ACTIVE' ? 'green' : 'slate'}>{s.status === 'ACTIVE' ? 'Active' : s.status === 'DRAFT' ? 'Draft' : 'Completed'}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{date(s.createdAt)}</td>
                  </tr>
                ))}
            </Table>
          </Card>
        )}

        {tab === 'Admins' && admins && (
          <Card title="Admins">
            <ul className="divide-y divide-slate-100">
              {admins.admins.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-800">{a.name}</p>
                    <p className="truncate text-xs text-slate-500">{a.email}</p>
                  </div>
                  <Badge tone={a.source === 'OWNER' ? 'amber' : 'blue'}>{SOURCE[a.source]}</Badge>
                  {admins.canChange && a.removable && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeAdmin(a.id)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {admins.canChange && (
              <form onSubmit={addAdmin} className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email of an existing account"
                  aria-label="Admin email"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <PrimaryButton type="submit" disabled={busy || !email.trim()} className="justify-center">
                  Make admin
                </PrimaryButton>
              </form>
            )}
            {adminError && <p className="px-5 pb-4 text-sm text-rose-600">{adminError}</p>}
          </Card>
        )}
      </div>
    </div>
  )
}

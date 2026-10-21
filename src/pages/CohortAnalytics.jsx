import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const pct = (x) => (x == null ? 'N/A' : `${Math.round(x * 1000) / 10}%`)
const ALL = 'All'

// Every session the user can see, side by side, so a lecturer can compare
// courses, semesters and academic sessions. Clicking a row opens that
// session's own Analytics for the detail.
export default function CohortAnalytics() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [academicSession, setAcademicSession] = useState(ALL)
  const [semester, setSemester] = useState(ALL)

  useEffect(() => {
    api.compareSessions(token).then(setRows).catch((err) => setError(err.message))
  }, [])

  const options = (key) => [ALL, ...new Set((rows || []).map((r) => r[key]).filter(Boolean))]
  const visible = useMemo(
    () =>
      (rows || []).filter(
        (r) => (academicSession === ALL || r.academicSession === academicSession) && (semester === ALL || r.semester === semester)
      ),
    [rows, academicSession, semester]
  )

  const select = (label, value, onChange, opts) => (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-400"
      >
        {opts.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Cohort Analytics" />
      <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          {select('Academic session', academicSession, setAcademicSession, options('academicSession'))}
          {select('Semester', semester, setSemester, options('semester'))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Session</th>
                <th className="px-5 py-3">Academic session</th>
                <th className="px-5 py-3">Semester</th>
                <th className="px-5 py-3">Scored</th>
                <th className="px-5 py-3">Average</th>
                <th className="px-5 py-3">Std dev</th>
                <th className="px-5 py-3">Pass rate</th>
              </tr>
            </thead>
            <tbody>
              {!rows && !error && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-slate-400">Loading sessions...</td>
                </tr>
              )}
              {rows && visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-slate-500">No sessions match these filters.</td>
                </tr>
              )}
              {visible.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/sessions/${r.id}/analytics`)}
                  className="cursor-pointer border-b border-slate-50 hover:bg-slate-50"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{r.title}</p>
                    {r.courseCode && <p className="text-xs text-slate-400">{r.courseCode}</p>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{r.academicSession || 'N/A'}</td>
                  <td className="px-5 py-3 text-slate-600">{r.semester || 'N/A'}</td>
                  <td className="px-5 py-3 text-slate-600">{r.scoredScripts}</td>
                  <td className="px-5 py-3 text-slate-800">{r.mean ?? 'N/A'}</td>
                  <td className="px-5 py-3 text-slate-600">{r.sd ?? 'N/A'}</td>
                  <td className="px-5 py-3">
                    {r.passRate == null ? (
                      <span className="text-slate-400">N/A</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.passRate * 100}%` }} />
                        </div>
                        <span className="text-slate-700">{pct(r.passRate)}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">Averages use final totals (exam plus CA). Open a session for its grade spread and question quality.</p>
      </div>
    </div>
  )
}

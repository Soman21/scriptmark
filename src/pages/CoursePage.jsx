import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AlertCircle, Loader2, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { downloadCourseExport } from '../lib/download.js'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, SecondaryButton } from '../components/ui.jsx'

const fmt = (n) => (n == null ? '' : Number.isInteger(n) ? n : n.toFixed(1))

function Cell({ cell }) {
  if (cell.status === 'ABSENT') return <span className="text-slate-400">Absent</span>
  if (cell.status === 'PENDING') return <span className="text-amber-600">Pending</span>
  return fmt(cell.score)
}

// A typed CA is saved on the student's exam script. Leaving the box empty
// goes back to the CA worked out from the Test and Assignment sessions.
function CaInput({ row, token, onSaved, max }) {
  const [value, setValue] = useState(row.caTyped ? String(row.ca) : '')
  useEffect(() => setValue(row.caTyped ? String(row.ca) : ''), [row.ca, row.caTyped])

  async function save() {
    const typed = value.trim()
    if (typed === (row.caTyped ? String(row.ca) : '')) return
    if (typed !== '' && (!Number.isFinite(Number(typed)) || Number(typed) < 0 || (max != null && Number(typed) > max))) {
      setValue(row.caTyped ? String(row.ca) : '')
      return
    }
    await api.updateCaScore(row.caScriptId, typed, token).catch(() => {})
    onSaved()
  }

  return (
    <input
      aria-label={`CA for ${row.name}`}
      inputMode="decimal"
      value={value}
      placeholder={row.caTyped ? '' : fmt(row.ca)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="w-16 rounded-md border border-slate-200 px-2 py-1 text-right text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
    />
  )
}

// One course: every Test, Assignment and Exam session with the same course
// code, academic session and semester, and the combined Result Sheet.
export default function CoursePage() {
  const { token } = useAuth()
  const { code } = useParams()
  const [params] = useSearchParams()
  const query = useMemo(() => {
    const q = new URLSearchParams({ code })
    if (params.get('session')) q.set('session', params.get('session'))
    if (params.get('semester')) q.set('semester', params.get('semester'))
    return q.toString()
  }, [code, params])

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [weights, setWeights] = useState({})
  const [saving, setSaving] = useState(false)
  const [weightError, setWeightError] = useState('')
  const [exporting, setExporting] = useState(false)

  function apply(sheet) {
    setData(sheet)
    setWeights(Object.fromEntries(sheet.assessments.map((a) => [a.sessionId, String(a.weight)])))
  }

  function load() {
    api
      .getCourseResults(query, token)
      .then(apply)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [query])

  const hasCaSessions = data?.assessments.some((a) => a.kind === 'CA')
  const weightTotal = Object.values(weights).reduce((sum, w) => sum + (Number(w) || 0), 0)
  const changed = data?.assessments.some((a) => Number(weights[a.sessionId]) !== a.weight)

  async function saveWeights() {
    setSaving(true)
    setWeightError('')
    try {
      const body = { code, session: params.get('session'), semester: params.get('semester'), weights }
      apply(await api.saveCourseWeights(body, token))
    } catch (err) {
      setWeightError(err.message)
    }
    setSaving(false)
  }

  async function exportSheet() {
    setExporting(true)
    try {
      await downloadCourseExport(query, data.course.courseCode, token)
    } catch (err) {
      setError(err.message)
    }
    setExporting(false)
  }

  if (error && !data) {
    return (
      <div className="flex h-full flex-col">
        <Topbar title={code} />
        <div className="m-6 flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={16} /> {error}
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  const { course, assessments, rows, canEdit, typedCaMax } = data
  const subtitle = [course.academicSession, course.semester && `${course.semester} Semester`].filter(Boolean).join(' · ')
  const caMax = hasCaSessions ? assessments.filter((a) => a.kind === 'CA').reduce((s, a) => s + a.weight, 0) : typedCaMax
  const examMax = assessments.filter((a) => a.kind === 'EXAM').reduce((s, a) => s + a.weight, 0)

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title={course.courseCode}
        right={
          <PrimaryButton onClick={exportSheet} disabled={exporting}>
            <Download size={16} /> {exporting ? 'Generating...' : 'Export to Excel'}
          </PrimaryButton>
        }
      />
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="font-semibold text-slate-900">Assessments</h3>
            {hasCaSessions && (
              <span className={`text-sm ${Math.abs(weightTotal - 100) > 0.01 ? 'text-rose-600' : 'text-slate-500'}`}>
                Total {fmt(weightTotal)}
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-100">
            {assessments.map((a) => (
              <li key={a.sessionId} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className={`w-24 shrink-0 font-medium ${a.kind === 'CA' ? 'text-gold-700' : 'text-brand-700'}`}>{a.type}</span>
                <Link to={`/sessions/${a.sessionId}`} className="min-w-0 flex-1 truncate text-slate-700 hover:text-brand-600">
                  {a.title}
                </Link>
                {canEdit ? (
                  <input
                    aria-label={`Weight for ${a.type}`}
                    inputMode="decimal"
                    value={weights[a.sessionId] ?? ''}
                    onChange={(e) => setWeights((w) => ({ ...w, [a.sessionId]: e.target.value }))}
                    className="w-16 rounded-md border border-slate-200 px-2 py-1 text-right focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                ) : (
                  <span className="w-16 text-right text-slate-700">{fmt(a.weight)}</span>
                )}
              </li>
            ))}
            {!hasCaSessions && (
              <li className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="w-24 shrink-0 font-medium text-gold-700">CA</span>
                <span className="flex-1 text-slate-500">Entered by hand</span>
                <span className="w-16 text-right text-slate-700">{fmt(canEdit ? Math.max(0, 100 - weightTotal) : typedCaMax)}</span>
              </li>
            )}
          </ul>
          {canEdit && (changed || weightError) && (
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">
              {weightError && <span className="text-sm text-rose-600">{weightError}</span>}
              <SecondaryButton onClick={() => apply(data)} disabled={saving}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={saveWeights} disabled={saving}>
                {saving ? 'Saving...' : 'Save weights'}
              </PrimaryButton>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="font-semibold text-slate-900">Result Sheet</h3>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No scripts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Reg Number</th>
                    {assessments.map((a) => (
                      <th key={a.sessionId} className="px-4 py-2.5 text-right">
                        {a.type} ({fmt(a.weight)})
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right">CA ({fmt(caMax)})</th>
                    <th className="px-4 py-2.5 text-right">Exam ({fmt(examMax)})</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-center">Grade</th>
                    <th className="px-4 py-2.5">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={`${r.regNumber}:${r.name}`}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-800">{r.name}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{r.regNumber}</td>
                      {assessments.map((a) => (
                        <td key={a.sessionId} className="px-4 py-2.5 text-right text-slate-700">
                          <Cell cell={r.cells[a.sessionId]} />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right">
                        {canEdit && r.caScriptId ? <CaInput row={r} token={token} onSaved={load} max={caMax} /> : fmt(r.ca)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{r.exam == null ? '' : fmt(r.exam)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{fmt(r.total)}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-slate-900">{r.grade}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

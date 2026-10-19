import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { Badge } from './ui.jsx'

const pct = (x) => (x == null ? 'N/A' : `${Math.round(x * 1000) / 10}%`)
const val = (x) => (x == null ? 'N/A' : x)

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function GroupTable({ title, rows }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-900">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-1.5">Group</th>
            <th className="py-1.5">Students</th>
            <th className="py-1.5">Average</th>
            <th className="py-1.5">Pass rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.group} className="border-t border-slate-100">
              <td className="py-1.5 text-slate-700">{r.group}</td>
              <td className="py-1.5 text-slate-500">{r.n}</td>
              <td className="py-1.5 text-slate-700">{val(r.mean)}</td>
              <td className="py-1.5 text-slate-700">{pct(r.passRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Cohort view of one session: grades as they will appear on the result
// sheet (exam plus CA), groups read from reg numbers, and item analysis.
export default function CohortPanel({ sessionId }) {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getCohort(sessionId, token).then(setData).catch((err) => setError(err.message))
  }, [sessionId])

  if (error) return <p className="text-sm text-rose-600">{error}</p>
  if (!data || data.scoredScripts === 0) return null
  const s = data.summary

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="font-semibold text-slate-900">Cohort</p>
        <p className="text-sm text-slate-500">Final totals (exam plus CA) on the institution grading scale, pass at 40</p>
      </div>
      <div className="space-y-6 p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Pass rate" value={pct(s.passRate)} />
          <Stat label="Average" value={val(s.mean)} />
          <Stat label="Median" value={val(s.median)} />
          <Stat label="Standard deviation" value={val(s.sd)} />
          <Stat label="Range" value={s.min == null ? 'N/A' : `${s.min} to ${s.max}`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-900">Grade distribution</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.gradeDistribution}>
                <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Students" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-5">
            <GroupTable title="By programme" rows={data.byProgramme} />
            <GroupTable title="By entry year" rows={data.byEntryYear} />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-900">Question quality</p>
          <p className="mb-3 text-xs text-slate-500">
            Facility is the share of marks the class earned. Discrimination compares the top and bottom 27% of
            students; under 0.2 the question barely separates strong from weak answers.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-1.5">Question</th>
                  <th className="py-1.5">Responses</th>
                  <th className="py-1.5">Facility</th>
                  <th className="py-1.5">Discrimination</th>
                  <th className="py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((q) => (
                  <tr key={q.question} className="border-t border-slate-100">
                    <td className="py-2">
                      <span className="text-xs font-semibold text-sky-600">{q.question}</span>
                      <p className="max-w-md truncate text-slate-700">{q.text}</p>
                    </td>
                    <td className="py-2 text-slate-500">{q.responses}</td>
                    <td className="py-2 text-slate-700">{pct(q.facility)}</td>
                    <td className="py-2 text-slate-700">{q.discrimination == null ? 'Too few scripts' : q.discrimination.toFixed(2)}</td>
                    <td className="py-2">{q.needsReview && <Badge tone="amber">Review question</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { LayoutGrid, Trophy, Flag, FileText, AlertCircle, AlertTriangle } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { StatCard } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

export default function Analytics() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const sessionTitle = localStorage.getItem('scriptmark_active_session_title')

  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    setLoading(true)
    setError('')
    const sessionId = localStorage.getItem('scriptmark_active_session')
    if (!sessionId) {
      setError('No active session found — go start one on the Scan Scripts page first.')
      setLoading(false)
      return
    }
    try {
      const result = await api.getAnalytics(sessionId, token)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar title={sessionTitle ? `Analytics: ${sessionTitle}` : 'Analytics Report'} />

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading analytics...</p>
        ) : !data || data.totalScripts === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No scripts in this session yet.
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Performance Overview</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {data.scoredCount} of {data.totalScripts} scripts scored
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={<LayoutGrid size={16} className="text-sky-500" />}
                label="Class Average"
                value={data.average != null ? `${data.average}%` : '—'}
              />
              <StatCard
                icon={<Trophy size={16} className="text-amber-500" />}
                label="Highest Score"
                value={data.highest != null ? `${data.highest}` : '—'}
              />
              <StatCard icon={<Flag size={16} className="text-rose-500" />} label="Flagged Scripts" value={data.flaggedCount} />
              <StatCard icon={<FileText size={16} className="text-slate-500" />} label="Total Scripts" value={data.totalScripts} />
            </div>

            {data.lowConfidenceCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                <AlertTriangle size={16} />
                {data.lowConfidenceCount} script{data.lowConfidenceCount !== 1 ? 's have' : ' has'} at least one
                low-confidence AI score — worth a closer look in Results.
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="font-semibold text-slate-900">Score Distribution</p>
              <p className="text-sm text-slate-500 mb-4">Percentage of max marks, across scored scripts</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.distribution}>
                  <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="font-semibold text-sm text-slate-900">Per-Question Performance</p>
                <p className="text-xs text-slate-500">Average score as a percentage of that question's max marks</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-3">Question</th>
                    <th className="px-5 py-3">Responses</th>
                    <th className="px-5 py-3">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perQuestion.map((q) => (
                    <tr key={`${q.number}${q.subLabel || ''}`} className="border-b border-slate-50">
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold text-sky-600">
                          Q{q.number}
                          {q.subLabel || ''}
                        </span>
                        <p className="text-sm text-slate-700">{q.text}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{q.responseCount}</td>
                      <td className="px-5 py-3">
                        {q.averagePercent != null ? (
                          <span
                            className={`text-sm font-medium ${
                              q.averagePercent < 50 ? 'text-rose-600' : q.averagePercent < 70 ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {q.averagePercent}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

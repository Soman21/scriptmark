import { useState, useEffect } from 'react'
import { Download, AlertCircle, Users, CheckCircle2, Clock } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, StatCard, Badge } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function computeGrade(total) {
  if (total == null) return ''
  if (total >= 70) return 'A'
  if (total >= 60) return 'B'
  if (total >= 50) return 'C'
  if (total >= 45) return 'D'
  if (total >= 40) return 'E'
  return 'F'
}

export default function Archive() {
  const { token } = useAuth()
  const [session, setSession] = useState(null)
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [caScores, setCaScores] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    const sessionId = localStorage.getItem('scriptmark_active_session')
    if (!sessionId) {
      setError('No active session found — go start one on the Scan Scripts page first.')
      setLoading(false)
      return
    }
    try {
      const [sessions, scriptData] = await Promise.all([
        api.getSessions(token),
        api.getSessionScripts(sessionId, token),
      ])
      setSession(sessions.find((s) => s.id === sessionId) || { title: localStorage.getItem('scriptmark_active_session_title') })
      setScripts(scriptData)

      const initialCa = {}
      scriptData.forEach((s) => {
        initialCa[s.id] = s.caScore ?? ''
      })
      setCaScores(initialCa)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateCaLocal(scriptId, value) {
    setCaScores((prev) => ({ ...prev, [scriptId]: value }))
  }

  async function saveCaScore(scriptId) {
    try {
      await api.updateCaScore(scriptId, caScores[scriptId], token)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleExport(format) {
    const sessionId = localStorage.getItem('scriptmark_active_session')
    setExporting(format)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Could not generate the export.')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      a.download = `${(session?.title || 'results').replace(/[^a-z0-9]/gi, '_')}_results.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const reviewed = scripts.filter((s) => s.status === 'REVIEWED').length
  const pending = scripts.length - reviewed

  return (
    <div className="flex h-full flex-col">
      <Topbar title={session ? `Results: ${session.title}` : 'Student Results'} />

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading results...</p>
        ) : scripts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No scripts in this session yet.
          </div>
        ) : (
          <>
            {session && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">{session.title}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {session.department || 'Department not set'} &bull; {session.faculty || 'Faculty not set'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard icon={<Users size={16} className="text-sky-500" />} label="Total Scripts" value={scripts.length} />
              <StatCard icon={<CheckCircle2 size={16} className="text-emerald-500" />} label="Reviewed" value={reviewed} />
              <StatCard icon={<Clock size={16} className="text-amber-500" />} label="Pending Review" value={pending} />
            </div>

            <div className="flex justify-end gap-2">
              <PrimaryButton onClick={() => handleExport('xlsx')} disabled={!!exporting}>
                <Download size={16} /> {exporting === 'xlsx' ? 'Generating...' : 'Export to Excel'}
              </PrimaryButton>
              <PrimaryButton onClick={() => handleExport('pdf')} disabled={!!exporting} className="bg-slate-700 hover:bg-slate-600">
                <Download size={16} /> {exporting === 'pdf' ? 'Generating...' : 'Export to PDF'}
              </PrimaryButton>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3">Reg Number</th>
                    <th className="px-5 py-3">CA Score</th>
                    <th className="px-5 py-3">Exam Score</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Grade</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scripts.map((s) => {
                    const ca = caScores[s.id] === '' ? null : Number(caScores[s.id])
                    const exam = s.totalScore ?? null
                    const total = exam != null ? exam + (ca || 0) : null
                    const grade = exam != null ? computeGrade(total) : ''
                    return (
                      <tr key={s.id} className="border-b border-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {s.studentName || s.studentIdentifier || 'Unnamed'}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{s.regNumber || '—'}</td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            value={caScores[s.id] ?? ''}
                            onChange={(e) => updateCaLocal(s.id, e.target.value)}
                            onBlur={() => saveCaScore(s.id)}
                            placeholder="—"
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </td>
                        <td className="px-5 py-3 text-slate-700">{exam ?? '—'}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{total ?? '—'}</td>
                        <td className="px-5 py-3">{grade && <Badge tone={grade === 'F' ? 'red' : 'green'}>{grade}</Badge>}</td>
                        <td className="px-5 py-3">
                          <Badge tone={s.status === 'REVIEWED' ? 'green' : 'amber'}>{s.status}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

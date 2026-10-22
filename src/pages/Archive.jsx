import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, AlertCircle, Users, CheckCircle2, Clock, Upload, X, AlertTriangle, ArrowLeft } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, StatCard, Badge } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { api } from '../lib/api.js'
import { downloadSessionExport } from '../lib/download.js'
import { resultRow } from '../lib/resultRows.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Archive() {
  const { token } = useAuth()
  const { session, sessionId } = useSession()
  const navigate = useNavigate()
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [scoresMode, setScoresMode] = useState('total') // 'exam' = exam scores only
  const [caScores, setCaScores] = useState({})
  const [classList, setClassList] = useState([])
  const [classListUploads, setClassListUploads] = useState([])
  const [uploadingRoster, setUploadingRoster] = useState(false)
  const [rosterMsg, setRosterMsg] = useState('')
  const [reviewEntry, setReviewEntry] = useState(null)
  const [resolveName, setResolveName] = useState('')
  const [resolveRegNumber, setResolveRegNumber] = useState('')
  const [showSourcePreview, setShowSourcePreview] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [scriptData, rosterData] = await Promise.all([
        api.getSessionScripts(sessionId, token),
        api.getClassList(sessionId, token),
      ])
      setScripts(scriptData)
      setClassList(rosterData.classList || [])
      setClassListUploads(rosterData.classListUploads || [])

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

  async function handleUploadRoster(file) {
    if (!file) return
    setUploadingRoster(true)
    setRosterMsg('')
    setError('')
    try {
      const formData = new FormData()
      formData.append('document', file)
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/classList`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not process that document.')

      setClassList(data.classList || [])
      setClassListUploads(data.classListUploads || [])

      const parts = []
      if (data.addedCount) parts.push(`${data.addedCount} student${data.addedCount !== 1 ? 's' : ''} added`)
      if (data.rematchedCount) parts.push(`${data.rematchedCount} already-scanned script${data.rematchedCount !== 1 ? 's' : ''} matched`)
      if (data.flaggedCount) parts.push(`${data.flaggedCount} name conflict${data.flaggedCount !== 1 ? 's' : ''} need review`)
      setRosterMsg(parts.length ? parts.join(', ') + '.' : 'No new students found in that document.')

      loadData() // refresh scripts, since names on already-matched ones may have changed
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingRoster(false)
    }
  }

  function openReview(entry) {
    setReviewEntry(entry)
    setResolveName(entry.name)
    setResolveRegNumber(entry.regNumber)
    setShowSourcePreview(false)
  }

  async function handleResolveEntry() {
    if (!resolveName.trim() || !resolveRegNumber.trim()) return
    try {
      const data = await api.resolveClassListEntry(
        sessionId,
        reviewEntry.id,
        { name: resolveName, regNumber: resolveRegNumber },
        token
      )
      setClassList(data.classList || [])
      setReviewEntry(null)
      loadData() // pick up the corrected name on any already-matched script
    } catch (err) {
      setError(err.message)
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
    setExporting(format)
    setError('')
    try {
      await downloadSessionExport(sessionId, format, session?.title, token, scoresMode)
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
      <Topbar
        title="Export Results"
        right={
          <button
            onClick={() => navigate(`/sessions/${sessionId}/results`)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={14} /> Back to Results
          </button>
        }
      />

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
              <StatCard icon={<Users size={16} className="text-brand-500" />} label="Total Scripts" value={scripts.length} />
              <StatCard icon={<CheckCircle2 size={16} className="text-emerald-500" />} label="Reviewed" value={reviewed} />
              <StatCard icon={<Clock size={16} className="text-amber-500" />} label="Pending Review" value={pending} />
            </div>

            {scripts.some((s) => s.duplicateOf?.length) && (
              <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    {[...new Set(scripts.filter((s) => s.duplicateOf?.length).map((s) => s.regNumber))].join(', ')} appear more than once, so the sheet would list them twice.
                  </span>
                </p>
                <button type="button" onClick={() => navigate(`/sessions/${sessionId}/marking`)} className="shrink-0 font-medium underline">
                  Fix in Marking Progress
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">What goes on the sheet</p>
                <div className="mt-2 inline-flex rounded-lg border border-slate-200 p-0.5" role="radiogroup" aria-label="What goes on the sheet">
                  {[
                    ['exam', 'Exam scores only'],
                    ['total', 'CA plus exam, with grades'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      role="radio"
                      aria-checked={scoresMode === key}
                      onClick={() => setScoresMode(key)}
                      className={`rounded-md px-3 py-1.5 text-sm ${scoresMode === key ? 'bg-slate-900 font-medium text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {scoresMode === 'exam'
                    ? 'No CA and no grades, for when the CA is recorded elsewhere.'
                    : 'A grade is given only to students whose CA is entered below.'}
                </p>
              </div>
              <div className="flex gap-2">
              <PrimaryButton onClick={() => handleExport('xlsx')} disabled={!!exporting}>
                <Download size={16} /> {exporting === 'xlsx' ? 'Generating...' : 'Export to Excel'}
              </PrimaryButton>
              <PrimaryButton onClick={() => handleExport('pdf')} disabled={!!exporting} className="bg-slate-700 hover:bg-slate-600">
                <Download size={16} /> {exporting === 'pdf' ? 'Generating...' : 'Export to PDF'}
              </PrimaryButton>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Class List / Attendance</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload the attendance sheet, the official class list, or both, in either order. Student names and
                    reg numbers extracted from it replace guessed ones on matching scripts.
                  </p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {uploadingRoster ? 'Processing...' : (
                    <>
                      <Upload size={14} /> Upload document
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    className="hidden"
                    disabled={uploadingRoster}
                    onChange={(e) => handleUploadRoster(e.target.files?.[0])}
                  />
                </label>
              </div>
              {rosterMsg && <p className="mt-3 text-xs text-slate-500">{rosterMsg}</p>}

              {classList.some((e) => e.flagged) && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                    <AlertTriangle size={15} />
                    {classList.filter((e) => e.flagged).length} name conflict
                    {classList.filter((e) => e.flagged).length !== 1 ? 's' : ''} need review before export
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {classList
                      .filter((e) => e.flagged)
                      .map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => openReview(entry)}
                          className="flex w-full items-center justify-between rounded-md bg-white px-3 py-2 text-left text-sm hover:bg-amber-100/50"
                        >
                          <span>
                            <span className="font-medium text-slate-800">{entry.name}</span>
                            <span className="text-slate-400"> vs </span>
                            <span className="font-medium text-slate-800">{entry.conflict?.name}</span>
                            <span className="text-slate-400 ml-1.5">({entry.regNumber})</span>
                          </span>
                          <span className="text-xs font-medium text-amber-700">Review</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3">Reg Number</th>
                    {scoresMode === 'total' && <th className="px-5 py-3">CA Score</th>}
                    <th className="px-5 py-3">Exam Score</th>
                    {scoresMode === 'total' && <th className="px-5 py-3">Total</th>}
                    {scoresMode === 'total' && <th className="px-5 py-3">Grade</th>}
                    <th className="px-5 py-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {scripts.map((s) => {
                    const ca = caScores[s.id] === '' || caScores[s.id] == null ? null : Number(caScores[s.id])
                    const row = resultRow({ ...s, caScore: ca }, scoresMode)
                    return (
                      <tr key={s.id} className="border-b border-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {s.studentName || s.studentIdentifier || 'Unnamed'}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{s.regNumber}</td>
                        {scoresMode === 'total' && (
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            value={caScores[s.id] ?? ''}
                            onChange={(e) => updateCaLocal(s.id, e.target.value)}
                            onBlur={() => saveCaScore(s.id)}
                            placeholder="Enter"
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-brand-400"
                          />
                        </td>
                        )}
                        <td className="px-5 py-3 text-slate-700">{row.exam ?? ''}</td>
                        {scoresMode === 'total' && <td className="px-5 py-3 font-medium text-slate-800">{row.total ?? ''}</td>}
                        {scoresMode === 'total' && (
                          <td className="px-5 py-3">{row.grade && <Badge tone={row.grade === 'F' ? 'red' : 'green'}>{row.grade}</Badge>}</td>
                        )}
                        <td className="px-5 py-3 text-xs text-amber-700">{row.note}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {reviewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">Resolve name conflict</p>
              <button onClick={() => setReviewEntry(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-sm text-slate-500">
                Reg number <span className="font-medium text-slate-700">{reviewEntry.regNumber}</span> appears with two
                different names across the documents uploaded for this session. Pick one, or type the correct name below.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setResolveName(reviewEntry.name)
                    setResolveRegNumber(reviewEntry.regNumber)
                  }}
                  className={`rounded-lg border p-3 text-left text-sm ${resolveName === reviewEntry.name ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <p className="text-xs text-slate-400 mb-1">Currently saved</p>
                  <p className="font-medium text-slate-800">{reviewEntry.name}</p>
                </button>
                <button
                  onClick={() => {
                    setResolveName(reviewEntry.conflict?.name || '')
                    setResolveRegNumber(reviewEntry.conflict?.regNumber || reviewEntry.regNumber)
                  }}
                  className={`rounded-lg border p-3 text-left text-sm ${resolveName === reviewEntry.conflict?.name ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <p className="text-xs text-slate-400 mb-1">From the newer upload</p>
                  <p className="font-medium text-slate-800">{reviewEntry.conflict?.name}</p>
                </button>
              </div>

              {(() => {
                const upload = classListUploads.find((u) => u.id === reviewEntry.conflict?.uploadId)
                if (!upload) return null
                return (
                  <div>
                    {!showSourcePreview ? (
                      <button
                        onClick={() => setShowSourcePreview(true)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        View the source document this came from
                      </button>
                    ) : (
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        {upload.mimeType.startsWith('image/') ? (
                          <img src={upload.documentUrl} alt="Source document" className="w-full" />
                        ) : upload.mimeType === 'application/pdf' ? (
                          <iframe src={upload.documentUrl} title="Source document" className="h-96 w-full" />
                        ) : (
                          <div className="max-h-96 overflow-y-auto p-4">
                            <p className="mb-2 text-xs text-slate-500">
                              Word documents cannot be rendered in the browser, this is the text ScriptMark read from it.
                            </p>
                            <pre className="whitespace-pre-wrap text-xs text-slate-700">{upload.previewText || 'No preview text available.'}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-slate-500">Name</label>
                  <input
                    value={resolveName}
                    onChange={(e) => setResolveName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Reg Number</label>
                  <input
                    value={resolveRegNumber}
                    onChange={(e) => setResolveRegNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setReviewEntry(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <PrimaryButton onClick={handleResolveEntry}>Save and resolve</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

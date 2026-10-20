import { useEffect, useState } from 'react'
import { X, FileText, Copy, Download, RotateCcw, Check, Pencil } from 'lucide-react'
import { api } from '../lib/api.js'
import { PrimaryButton, SecondaryButton } from './ui.jsx'
import { reportRows, reportToText, reportToWordHtml, applyEdits, editsFrom } from '../lib/reportText.js'

function Table({ head = [], rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {head.length > 0 && (
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h} className="border border-slate-300 px-2.5 py-1.5 text-left font-medium text-slate-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="border border-slate-300 px-2.5 py-1.5 align-top text-slate-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const box = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-sky-400'

// Each session's last report and the lecturer's edits stay in this browser,
// so closing the dialog does not lose what they typed.
const savedKey = (id) => `scriptmark_report_${id}`
function loadSaved(id) {
  try {
    return JSON.parse(localStorage.getItem(savedKey(id))) || null
  } catch {
    return null
  }
}

export default function ReportDialog({ token, onClose }) {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [report, setReport] = useState(null)
  const [drafting, setDrafting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [edits, setEdits] = useState(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    const saved = loadSaved(sessionId)
    setReport(saved?.report || null)
    setEdits(saved?.edits || null)
    setEditing(false)
  }, [sessionId])

  useEffect(() => {
    if (!report || !sessionId) return
    try {
      localStorage.setItem(savedKey(sessionId), JSON.stringify({ report, edits }))
    } catch {}
  }, [report, edits, sessionId])

  useEffect(() => {
    api
      .getSessions(token)
      .then((list) => {
        setSessions(list)
        let active = ''
        try {
          active = localStorage.getItem('scriptmark_active_session') || ''
        } catch {}
        setSessionId(list.some((s) => s.id === active) ? active : list[0]?.id || '')
      })
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function draft() {
    setDrafting(true)
    setError('')
    try {
      const fresh = await api.draftReport(sessionId, token)
      setReport(fresh)
      // A new draft replaces the AI wording but keeps the lecturer's notes.
      setEdits((prev) => ({ ...editsFrom(fresh), notes: prev?.notes || '' }))
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setDrafting(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(reportToText(final))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Copying is blocked in this browser. Use Download Word instead.')
    }
  }

  function download() {
    const blob = new Blob(['\ufeff', reportToWordHtml(final)], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.facts.title.replace(/[^a-z0-9]+/gi, '_')}_examiners_report.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  const final = report && applyEdits(report, edits || editsFrom(report))
  const rows = final && reportRows(final)
  const current = edits || (report && editsFrom(report))
  const edit = (patch) => setEdits({ ...current, ...patch })
  const label = (s) => (s.courseCode && !String(s.title || '').startsWith(s.courseCode) ? `${s.courseCode} ${s.title}` : s.title)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-heading"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-3xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 id="report-heading" className="text-lg font-semibold text-slate-900">
              Examiner's report
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Figures from marked scripts. Text is editable.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:px-6">
          <label className="flex-1">
            <span className="block text-xs font-medium text-slate-500">Session</span>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            >
              {sessions.length === 0 && <option value="">No sessions yet</option>}
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
          <PrimaryButton onClick={draft} disabled={!sessionId || drafting} className="justify-center">
            {report ? <RotateCcw size={15} /> : <FileText size={15} />}
            {drafting ? 'Drafting...' : report ? 'Draft again' : 'Draft report'}
          </PrimaryButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {error && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
          {drafting && <p className="mb-3 text-sm text-slate-400">Drafting...</p>}
          {!report && !drafting && !error && (
            <p className="text-sm text-slate-500">Select a session to draft the report.</p>
          )}
          {report && (
            <article className="space-y-4 text-sm text-slate-700" data-testid="report">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{report.facts.title}</h3>
                <p className="text-xs text-slate-500">{[report.facts.examinationType, report.facts.semester, report.facts.academicSession].filter(Boolean).join(', ')}</p>
              </div>
              <section>
                <h4 className="mb-1 font-semibold text-slate-900">Overview</h4>
                {editing ? (
                  <textarea aria-label="Overview" rows={5} value={current.overview} onChange={(e) => edit({ overview: e.target.value })} className={box} />
                ) : (
                  <p className="whitespace-pre-line leading-relaxed">{final.overview}</p>
                )}
              </section>
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900">At a glance</h4>
                <Table rows={rows.glance} />
              </section>
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900">Score bands</h4>
                <Table head={['Band', 'Scripts']} rows={rows.bands} />
              </section>
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900">Questions</h4>
                <Table
                  head={['Question', 'Marks', 'Average', 'Answers', 'Comment']}
                  rows={
                    editing
                      ? rows.questions.map((r) => [
                          ...r.slice(0, 4),
                          <textarea
                            key={r[0]}
                            aria-label={`Comment on ${r[0]}`}
                            rows={2}
                            value={current.comments?.[r[0]] ?? ''}
                            placeholder="Add a comment"
                            onChange={(e) => edit({ comments: { ...current.comments, [r[0]]: e.target.value } })}
                            className={`${box} min-w-[180px]`}
                          />,
                        ])
                      : rows.questions
                  }
                />
              </section>
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900">How the marking went</h4>
                <Table rows={rows.marking} />
              </section>
              {(editing || final.recommendations.length > 0) && (
                <section>
                  <h4 className="mb-1 font-semibold text-slate-900">Recommendations</h4>
                  {editing ? (
                    <>
                      <textarea aria-label="Recommendations" rows={4} value={current.recommendations} onChange={(e) => edit({ recommendations: e.target.value })} className={box} />
                      <p className="mt-1 text-xs text-slate-400">One recommendation per line.</p>
                    </>
                  ) : (
                    <ul className="list-disc space-y-1 pl-5">
                      {final.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
              <section>
                <h4 className="mb-1 font-semibold text-slate-900">Your own notes</h4>
                {editing ? (
                  <textarea
                    aria-label="Your own notes"
                    rows={5}
                    value={current.notes}
                    placeholder="Add notes"
                    onChange={(e) => edit({ notes: e.target.value })}
                    className={box}
                  />
                ) : final.notes?.trim() ? (
                  <p className="whitespace-pre-line leading-relaxed">{final.notes}</p>
                ) : (
                  <button onClick={() => setEditing(true)} className="text-sm font-medium text-sky-600 hover:text-sky-700">
                    Add your own notes
                  </button>
                )}
              </section>
            </article>
          )}
        </div>

        {report && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3 sm:px-6">
            <SecondaryButton onClick={() => setEditing((v) => !v)} className={editing ? 'border-sky-300 bg-sky-50 text-sky-700' : ''}>
              {editing ? <Check size={15} /> : <Pencil size={15} />} {editing ? 'Done editing' : 'Edit text'}
            </SecondaryButton>
            <SecondaryButton onClick={copy}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
            </SecondaryButton>
            <PrimaryButton onClick={download}>
              <Download size={15} /> Download Word
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Download, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api.js'
import { downloadMarkedGroup } from '../lib/download.js'

// Export page card: the marked scripts for the whole session.
// The server makes at most `perDownload` scripts per file (memory on the
// free Render plan), so a big class is saved as several files, one after
// another, with a progress bar. The lecturer only picks a format and which
// scripts; the grouping happens here.

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-16 text-xs font-semibold text-slate-600">{label}</span>
      <div className="inline-flex rounded-lg border border-slate-200 p-0.5" role="radiogroup" aria-label={label}>
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            onClick={() => onChange(key)}
            className={`rounded-md px-3 py-1.5 text-sm ${value === key ? 'bg-slate-900 font-medium text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function courseCode(title) {
  return (title || 'Session').split(/[,\s]+/).slice(0, 2).join('').replace(/[^A-Za-z0-9]/g, '') || 'Session'
}

// Splits ids into groups of `size`, keeping the order.
export function groupsOf(ids, size) {
  const out = []
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size))
  return out
}

export default function MarkedDownloads({ sessionId, sessionTitle, token }) {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [format, setFormat] = useState('separate')
  const [which, setWhich] = useState('all')
  const [chosen, setChosen] = useState(new Set())
  const [progress, setProgress] = useState(null) // { file, files, done, total }
  const [saved, setSaved] = useState([])
  const abortRef = useRef(null)

  useEffect(() => {
    api
      .getMarkedReady(sessionId, token)
      .then(setInfo)
      .catch((err) => setError(err.message))
  }, [sessionId, token])

  useEffect(() => () => abortRef.current?.abort(), [])

  if (!info && !error) return null
  const scripts = info?.scripts || []
  const ready = scripts.filter((s) => s.ready)
  const notReady = scripts.length - ready.length
  const ids = which === 'all' ? ready.map((s) => s.id) : ready.filter((s) => chosen.has(s.id)).map((s) => s.id)
  const busy = Boolean(progress)

  function toggle(id) {
    setChosen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function start() {
    if (!ids.length) return
    const groups = groupsOf(ids, info.perDownload || 10)
    const ext = format === 'combined' ? 'pdf' : 'zip'
    const code = courseCode(sessionTitle)
    const controller = new AbortController()
    abortRef.current = controller
    setError('')
    setSaved([])
    let done = 0
    try {
      for (let i = 0; i < groups.length; i++) {
        setProgress({ file: i + 1, files: groups.length, done, total: ids.length })
        const name = groups.length === 1 ? `${code}_Marked_Scripts.${ext}` : `${code}_Marked_Scripts_${i + 1}.${ext}`
        await downloadMarkedGroup(sessionId, groups[i], format, name, token, controller.signal)
        done += groups[i].length
        setSaved((prev) => [...prev, name])
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      abortRef.current = null
      setProgress(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-900">Marked Scripts</p>
      {info && (
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{ready.length}</span> of {scripts.length} ready
          {notReady > 0 && <span className="text-slate-400"> · {notReady} need confirming</span>}
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        <Segmented
          label="Format"
          value={format}
          onChange={setFormat}
          options={[
            ['separate', 'One PDF per student'],
            ['combined', 'One PDF for printing'],
          ]}
        />
        <Segmented
          label="Scripts"
          value={which}
          onChange={setWhich}
          options={[
            ['all', `All ready (${ready.length})`],
            ['choose', 'Choose'],
          ]}
        />
      </div>

      {which === 'choose' && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-100">
          {ready.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">No scripts ready.</p>
          ) : (
            ready.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2.5 border-b border-slate-50 px-3 py-2 text-sm last:border-0 hover:bg-slate-50">
                <input type="checkbox" checked={chosen.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 accent-brand-600" />
                <span className="text-slate-800">{s.studentName || 'Unnamed'}</span>
                <span className="text-slate-400">{s.regNumber}</span>
              </label>
            ))
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={start}
          disabled={busy || ids.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={15} /> {busy ? 'Downloading' : 'Download'}
        </button>
        {busy && (
          <button type="button" onClick={() => abortRef.current?.abort()} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
        )}
      </div>

      {progress && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            Preparing file {progress.file} of {progress.files} · {progress.done} of {progress.total} scripts
          </p>
        </div>
      )}
      {saved.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-500">
          {saved.map((name) => (
            <li key={name} className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" /> {name}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  )
}

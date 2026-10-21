import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, RefreshCw, ChevronRight, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api.js'

const DOT = {
  join: 'bg-violet-500',
  guide: 'bg-amber-500',
  scan: 'bg-amber-500',
  mark: 'bg-sky-500',
  queue: 'bg-sky-500',
  confirm: 'bg-sky-500',
  others: 'bg-sky-500',
  claim: 'bg-amber-500',
  flagged: 'bg-rose-500',
  names: 'bg-rose-500',
  duplicates: 'bg-rose-500',
  export: 'bg-emerald-500',
}

// "Today's tasks": one list across every open session, each item a
// link straight to the page where it gets done.
export default function TodayList({ token }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  function load() {
    setError('')
    api
      .getToday(token)
      .then((d) => setItems(d.items))
      .catch((err) => setError(err.message))
  }
  useEffect(load, [token])

  const groups = []
  for (const item of items || []) {
    let g = groups.find((x) => x.sessionId === item.sessionId)
    if (!g) groups.push((g = { sessionId: item.sessionId, session: item.session, items: [] }))
    g.items.push(item)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="today-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="today-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ListChecks size={16} className="text-sky-600" /> Today's tasks
        </h2>
        <button onClick={load} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" aria-label="Refresh the list">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {!items && !error && <p className="mt-3 text-sm text-slate-400">Checking your sessions...</p>}
      {items && items.length === 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <CheckCircle2 size={16} className="text-emerald-500" /> No pending tasks.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <div key={g.sessionId}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{g.session}</p>
            <ul className="mt-1 divide-y divide-slate-100">
              {g.items.map((item) => (
                <li key={item.kind}>
                  <Link to={item.link} className="flex items-center gap-3 rounded-lg px-1 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[item.kind] || 'bg-slate-400'}`} />
                    <span className="flex-1">{item.text}</span>
                    <ChevronRight size={14} className="shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

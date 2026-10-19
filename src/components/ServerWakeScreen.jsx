import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { getServerState, subscribeServer, wakeServer, resetServerState } from '../lib/serverWake.js'

// Shown only when the server is slow to answer, so a warm server never
// flashes it. Tips about the app keep the wait useful.
export const WAKE_TIPS = [
  { title: 'Snap the front page first', body: 'ScriptMark reads the reg number from the cover, then fills the name from your class list.' },
  { title: 'Upload many scripts at once', body: 'Batch upload takes a whole pile of photos and starts marking as soon as they are in.' },
  { title: 'Share the marking', body: 'Invite colleagues from Add lecturers, and each one claims the questions they will mark.' },
  { title: 'You always have the final say', body: 'The AI only suggests a score. Nothing counts until a lecturer confirms it.' },
  { title: 'Ask about any answer', body: 'On Results, Ask the assistant explains a score and can recheck it against your guide.' },
  { title: 'Only review what matters', body: 'Turn on automatic acceptance and high confidence scores are accepted, so you check the uncertain ones.' },
  { title: 'Export your way', body: 'Download exam scores only, or add CA for totals and grades, in Excel or PDF.' },
  { title: 'Let the AI draft the guide', body: 'Upload the question paper and ScriptMark can suggest model answers for you to edit.' },
]

const SHOW_AFTER_MS = 1500
const TIP_MS = 6000

export function useServerState() {
  const [s, setS] = useState(getServerState())
  useEffect(() => subscribeServer(setS), [])
  return s
}

export default function ServerWakeScreen() {
  const server = useServerState()
  const [visible, setVisible] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [tip, setTip] = useState(() => Math.floor(Math.random() * WAKE_TIPS.length))

  const waiting = server.status === 'waking' || server.status === 'down'

  useEffect(() => {
    if (!waiting) {
      setVisible(false)
      return
    }
    const t = setTimeout(() => setVisible(true), Math.max(0, SHOW_AFTER_MS - (Date.now() - (server.startedAt || Date.now()))))
    return () => clearTimeout(t)
  }, [waiting, server.startedAt])

  useEffect(() => {
    if (!visible) return
    const clock = setInterval(() => setElapsed(Math.floor((Date.now() - server.startedAt) / 1000)), 1000)
    const tips = setInterval(() => setTip((i) => (i + 1) % WAKE_TIPS.length), TIP_MS)
    return () => {
      clearInterval(clock)
      clearInterval(tips)
    }
  }, [visible, server.startedAt])

  if (!visible) return null

  const down = server.status === 'down'
  // Eases toward 95 percent over about a minute, the usual start up time.
  const percent = Math.round(95 * (1 - Math.exp(-elapsed / 25)))
  const current = WAKE_TIPS[tip]

  function retry() {
    resetServerState()
    setElapsed(0)
    wakeServer()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-50/95 px-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0">
            <div className={`absolute inset-0 rounded-full border-4 border-sky-100 ${down ? '' : 'border-t-sky-500 animate-spin'}`} />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-sky-600">S</div>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{down ? 'Still starting up' : 'Getting ScriptMark ready'}</h2>
            <p className="text-sm text-slate-500">
              {down ? 'This is taking longer than usual.' : 'The server rests when nobody is using it. It usually starts in under a minute.'}
            </p>
          </div>
        </div>

        {!down && (
          <div className="mt-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500 transition-all duration-1000" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1.5 text-right text-xs text-slate-400">{elapsed}s</p>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-sky-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-600">While you wait</p>
          <p className="mt-1 font-medium text-slate-900">{current.title}</p>
          <p className="mt-1 min-h-[2.5rem] text-sm text-slate-600">{current.body}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {WAKE_TIPS.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === tip ? 'w-4 bg-sky-500' : 'w-1.5 bg-sky-200'}`} />
              ))}
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => setTip((i) => (i - 1 + WAKE_TIPS.length) % WAKE_TIPS.length)} aria-label="Previous tip" className="rounded-md p-1 text-sky-600 hover:bg-sky-100">
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => setTip((i) => (i + 1) % WAKE_TIPS.length)} aria-label="Next tip" className="rounded-md p-1 text-sky-600 hover:bg-sky-100">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {down && (
          <button
            type="button"
            onClick={retry}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <RefreshCw size={16} /> Try again
          </button>
        )}
      </div>
    </div>
  )
}

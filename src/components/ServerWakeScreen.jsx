import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, RefreshCw } from 'lucide-react'
import { getServerState, subscribeServer, wakeServer, resetServerState } from '../lib/serverWake.js'
import { GET_STARTED_STEPS as STEPS } from '../lib/gettingStarted.js'

// Shown only when the server is slow to answer, so a warm server never
// flashes it. The wait doubles as a short intro to the marking flow, which
// the lecturer can step through or skip.

const SHOW_AFTER_MS = 1500

export function useServerState() {
  const [s, setS] = useState(getServerState())
  useEffect(() => subscribeServer(setS), [])
  return s
}

export default function ServerWakeScreen() {
  const server = useServerState()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [touched, setTouched] = useState(false)
  const [skipped, setSkipped] = useState(false)

  const waiting = server.status === 'waking' || server.status === 'down'
  const ready = server.status === 'ready'

  useEffect(() => {
    if (!waiting) return
    const t = setTimeout(() => setVisible(true), Math.max(0, SHOW_AFTER_MS - (Date.now() - (server.startedAt || Date.now()))))
    return () => clearTimeout(t)
  }, [waiting, server.startedAt])

  // Close by itself once ready, unless the lecturer is reading the intro;
  // then they finish or press Continue.
  useEffect(() => {
    if (ready && (!touched || skipped)) setVisible(false)
  }, [ready, touched, skipped])

  if (!visible) return null

  const down = server.status === 'down'
  const last = step === STEPS.length - 1
  const [title, text] = STEPS[step]

  function go(to) {
    setTouched(true)
    setStep(to)
  }

  function retry() {
    resetServerState()
    wakeServer()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-50 px-4" role="status" aria-live="polite">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5">
          {ready ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check size={14} />
            </span>
          ) : (
            <span className={`h-6 w-6 rounded-full border-[3px] border-sky-100 ${down ? '' : 'border-t-sky-500 animate-spin'}`} />
          )}
          <h2 className="text-lg font-semibold text-slate-900">
            {ready ? 'ScriptMark is ready' : down ? 'Still getting ScriptMark ready' : 'Getting ScriptMark ready'}
          </h2>
        </div>

        {down && (
          <button
            type="button"
            onClick={retry}
            className="mx-auto mt-4 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <RefreshCw size={15} /> Try again
          </button>
        )}

        {!skipped && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Get started in {STEPS.length} easy steps</p>
              <button type="button" onClick={() => setSkipped(true)} className="text-xs font-medium text-slate-400 hover:text-slate-600">
                Skip intro
              </button>
            </div>

            <div className="mt-4 flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-sm font-semibold text-white">
                {step + 1}
              </span>
              <div className="min-h-[5.5rem] min-w-0">
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Step ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-sky-500' : 'w-1.5 bg-slate-200 hover:bg-slate-300'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button type="button" onClick={() => go(step - 1)} aria-label="Back" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                    <ArrowLeft size={16} />
                  </button>
                )}
                {last ? (
                  <button
                    type="button"
                    onClick={() => (ready ? setVisible(false) : setSkipped(true))}
                    className="rounded-lg bg-sky-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-400"
                  >
                    {ready ? 'Continue' : 'Done'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => go(step + 1)}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-400"
                  >
                    Next <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {ready && !skipped && !last && (
          <button type="button" onClick={() => setVisible(false)} className="mx-auto mt-4 block text-sm font-medium text-sky-600 hover:text-sky-700">
            Continue to ScriptMark
          </button>
        )}
      </div>
    </div>
  )
}

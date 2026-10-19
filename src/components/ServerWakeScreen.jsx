import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react'
import { getServerState, subscribeServer, wakeServer, resetServerState } from '../lib/serverWake.js'
import { GET_STARTED_STEPS as STEPS } from '../lib/gettingStarted.js'

// Shown only when the server is slow to answer, so a warm server never
// flashes it. The wait doubles as a short intro to the marking flow: the
// steps move on by themselves, timed so the last one lands about when a cold
// server is up, and the screen closes as soon as the server answers.

const SHOW_AFTER_MS = 1500
const STEP_MS = 7000

export function useServerState() {
  const [s, setS] = useState(getServerState())
  useEffect(() => subscribeServer(setS), [])
  return s
}

export default function ServerWakeScreen() {
  const server = useServerState()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [stepStarted, setStepStarted] = useState(Date.now())
  const [now, setNow] = useState(Date.now())
  const [skipped, setSkipped] = useState(false)

  const waiting = server.status === 'waking' || server.status === 'down'
  const ready = server.status === 'ready'

  useEffect(() => {
    if (!waiting) return
    const t = setTimeout(() => setVisible(true), Math.max(0, SHOW_AFTER_MS - (Date.now() - (server.startedAt || Date.now()))))
    return () => clearTimeout(t)
  }, [waiting, server.startedAt])

  useEffect(() => {
    if (ready) setVisible(false)
  }, [ready])

  // Moves to the next step on a timer and stops on the last one.
  useEffect(() => {
    if (!visible) return
    go(0)
    const tick = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(tick)
  }, [visible])

  useEffect(() => {
    if (now - stepStarted >= STEP_MS && step < STEPS.length - 1) go(step + 1)
  }, [now])

  if (!visible) return null

  const down = server.status === 'down'
  const last = step === STEPS.length - 1
  const [title, text] = STEPS[step]

  function go(to) {
    setStep(to)
    setStepStarted(Date.now())
  }

  // Fills across all the steps, so a full bar means the last step.
  const within = Math.min(1, (now - stepStarted) / STEP_MS)
  const percent = Math.round(Math.min(98, ((step + (last ? Math.min(within, 0.9) : within)) / STEPS.length) * 100))

  function retry() {
    resetServerState()
    wakeServer()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-50 px-4" role="status" aria-live="polite">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5">
          <span className={`h-6 w-6 rounded-full border-[3px] border-sky-100 ${down ? '' : 'border-t-sky-500 animate-spin'}`} />
          <h2 className="text-lg font-semibold text-slate-900">
            {down ? 'Still getting ScriptMark ready' : 'Getting ScriptMark ready'}
          </h2>
        </div>

        {!down && (
          <div className="mx-auto mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-sky-500 transition-all duration-200 ease-linear" style={{ width: `${percent}%` }} />
          </div>
        )}

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
                {!last && (
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

      </div>
    </div>
  )
}

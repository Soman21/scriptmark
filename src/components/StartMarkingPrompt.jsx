import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, UserPlus, X } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { api } from '../lib/api.js'

// One way to finish an upload and start marking, shared by Single Script,
// Bulk PDF Upload and Batch Upload so they all behave the same.
//
// Before marking starts it asks the server whether the coordinator is
// marking alone with questions nobody holds. If so it shows a small prompt:
//   Add lecturers  -> opens the invite dialog; marking starts anyway, and
//                     the questions stay free for colleagues to claim.
//   Skip for now   -> every unclaimed question goes to the coordinator, so
//                     My Queue fills straight away.
// If the check itself fails, marking just starts; the prompt is a
// convenience and must never block marking.
export function useStartMarking() {
  const { token } = useAuth()
  const { sessionId, openAddLecturers } = useSession()
  const navigate = useNavigate()
  const [ask, setAsk] = useState(null)

  async function go() {
    await api.startMarking(sessionId, token)
    navigate(`/sessions/${sessionId}/marking`)
  }

  // Resolves once marking has started, or once the prompt is showing.
  async function start() {
    let check = null
    try {
      check = await api.teamCheck(sessionId, token)
    } catch {
      check = null
    }
    if (check?.askToAddLecturers) {
      setAsk(check)
      return
    }
    await go()
  }

  const prompt = ask ? (
    <AddLecturersPrompt
      unclaimed={ask.unclaimed}
      onClose={() => setAsk(null)}
      onAdd={async () => {
        await go()
        setAsk(null)
        openAddLecturers?.()
      }}
      onSkip={async () => {
        await api.assignUnclaimed(sessionId, { onlyIfAlone: true }, token)
        await go()
        setAsk(null)
      }}
    />
  ) : null

  return { start, prompt }
}

function AddLecturersPrompt({ unclaimed, onAdd, onSkip, onClose }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function run(which, fn) {
    setBusy(which)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-marking-heading"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <UserPlus size={18} />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="start-marking-heading" className="mt-3 text-lg font-semibold text-slate-900">
          Add other lecturers?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Skip to assign all {unclaimed} unclaimed {unclaimed === 1 ? 'question' : 'questions'} to you.
        </p>
        {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" disabled={!!busy} onClick={() => run('skip', onSkip)} className="justify-center">
            {busy === 'skip' && <Loader2 size={15} className="animate-spin" />} Skip for now
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={!!busy}
            onClick={() => run('add', onAdd)}
            className="justify-center bg-brand-500 hover:bg-brand-600"
          >
            {busy === 'add' ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Add lecturers
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

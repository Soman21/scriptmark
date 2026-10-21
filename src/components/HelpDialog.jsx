import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { CONTACT } from '../lib/site.js'
import { GET_STARTED_STEPS as STEPS } from '../lib/gettingStarted.js'


// The sidebar's Help: the whole marking flow on one screen.
export default function HelpDialog({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-heading"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-slate-700 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="help-heading" className="text-lg font-semibold text-slate-900">How marking works</h2>
            <p className="mt-0.5 text-sm text-slate-500">Seven steps from a new course to a result sheet.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <ol className="mt-5 space-y-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-semibold text-sky-700">{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-slate-900">{title}</p>
                <p className="text-sm text-slate-500">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          Stuck on something else? Ask the{' '}
          <Link to="/assistant" onClick={onClose} className="font-medium text-sky-600 hover:text-sky-700">
            AI Assistant
          </Link>{' '}
          or email{' '}
          <a href={`mailto:${CONTACT.email}`} className="font-medium text-sky-600 hover:text-sky-700">
            {CONTACT.email}
          </a>
          .
        </p>
      </div>
    </div>
  )
}

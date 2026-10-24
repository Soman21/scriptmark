import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Copy, Check, Send } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <SecondaryButton type="button" onClick={copy} className="shrink-0 px-3">
      {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
      {copied ? 'Copied' : label}
    </SecondaryButton>
  )
}

// Everything a Coordinator needs to bring colleagues into a session: the
// code, a link that signs them in and joins in one go, and an email invite.
export default function AddLecturersDialog({ session, open, onClose }) {
  const { token } = useAuth()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setEmail('')
    setSentTo('')
    setError('')
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const link = `${window.location.origin}/join/${session.joinCode}`

  async function invite(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')
    try {
      await api.inviteByEmail(session.id, email.trim(), token)
      setSentTo(email.trim())
      setEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-lecturers-heading"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-lecturers-heading" className="text-lg font-semibold text-slate-900">
              Add lecturers
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">They sign in or create an account, then land in this session ready to claim questions.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={invite} className="mt-5">
          <label htmlFor="al-email" className="block text-xs font-medium text-slate-500">
            Invite by email
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="al-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@unizik.edu.ng"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-400"
            />
            <PrimaryButton type="submit" disabled={sending || !email.trim()} className="shrink-0 bg-brand-500 hover:bg-brand-600">
              <Send size={15} /> {sending ? 'Sending...' : 'Send'}
            </PrimaryButton>
          </div>
          {sentTo && <p className="mt-2 text-xs text-emerald-600">Invite sent to {sentTo}.</p>}
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </form>

        <div className="mt-5">
          <span className="block text-xs font-medium text-slate-500">Or share the invite link</span>
          <div className="mt-1 flex gap-2">
            <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Invite link" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none" />
            <CopyButton text={link} label="Copy" />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <div>
            <span className="block text-xs font-medium text-slate-500">Join code</span>
            <span className="text-xl font-semibold tracking-[0.25em] text-slate-900">{session.joinCode}</span>
          </div>
          <CopyButton text={session.joinCode} label="Copy code" />
        </div>

        <p className="mt-4 text-xs text-slate-400">
          New markers start with limited access to their claimed questions. Change access or remove someone in{' '}
          <Link to="claim-questions" onClick={onClose} className="font-medium text-brand-600 hover:text-brand-700">
            Claim Questions
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

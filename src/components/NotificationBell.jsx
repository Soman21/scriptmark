import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Hand, UserPlus, CheckCircle2, XCircle, ListChecks } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const POLL_MS = 60000

// Loads the bell once for the whole app and refreshes it every minute, so
// the mobile top bar and the desktop sidebar share one copy of the data.
export function useNotifications() {
  const { token } = useAuth()
  const [data, setData] = useState({ items: [], reminders: [], unread: 0 })

  const refresh = useCallback(() => {
    if (!token) return
    api
      .getNotifications(token)
      .then(setData)
      .catch(() => {})
  }, [token])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const markRead = useCallback(() => {
    if (!token) return
    setData((d) => ({ ...d, items: d.items.map((i) => ({ ...i, read: true })), unread: d.reminders.length }))
    api.markNotificationsRead(token).catch(() => {})
  }, [token])

  return { ...data, refresh, markRead }
}

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

const ICONS = {
  JOIN_REQUEST: UserPlus,
  JOINED: UserPlus,
  REQUEST_APPROVED: CheckCircle2,
  REQUEST_DECLINED: XCircle,
  SESSION_CONFIRMED: ListChecks,
  REMINDER_CLAIM: Hand,
  REMINDER_UNCLAIMED: Hand,
}

export default function NotificationBell({ bell, tone = 'light' }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      bell.refresh()
      if (bell.items.some((i) => !i.read)) bell.markRead()
    }
  }

  function go(link) {
    if (!link) return
    setOpen(false)
    navigate(link)
  }

  async function decide(item, approve) {
    setBusy(item.id)
    try {
      if (approve) await api.approveMarker(item.sessionId, item.actorId, token)
      else await api.denyMarker(item.sessionId, item.actorId, token)
    } catch {}
    setBusy('')
    bell.refresh()
  }

  const rows = [...bell.reminders.map((r) => ({ ...r, reminder: true })), ...bell.items]
  const button =
    tone === 'dark'
      ? 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
      : 'text-slate-600 hover:bg-slate-100'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={bell.unread ? `Notifications, ${bell.unread} new` : 'Notifications'}
        aria-expanded={open}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg ${button}`}
      >
        <Bell size={19} />
        {bell.unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-semibold text-ink-950">
            {bell.unread > 9 ? '9+' : bell.unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/40 md:hidden" aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Notifications"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl bg-white text-slate-800 shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:top-full md:mt-2 md:max-h-[70vh] md:w-96 md:rounded-xl md:ring-1 md:ring-slate-900/10"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="font-semibold text-slate-900">Notifications</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {rows.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-400">No notifications</p>}
              {rows.map((n) => {
                const Icon = ICONS[n.type] || Bell
                return (
                  <div key={n.id} className={`rounded-lg px-3 py-3 ${n.reminder || !n.read ? 'bg-brand-50/60' : ''}`}>
                    <div className="flex gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          n.reminder ? 'bg-gold-100 text-gold-700' : 'bg-brand-100 text-brand-700'
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <button type="button" onClick={() => go(n.link)} className="min-w-0 flex-1 text-left">
                        <p className="text-sm text-slate-800">{n.text}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{n.reminder ? 'Reminder' : timeAgo(n.createdAt)}</p>
                      </button>
                    </div>
                    {n.type === 'JOIN_REQUEST' && n.pending && (
                      <div className="mt-2 flex gap-2 pl-11">
                        <button
                          type="button"
                          disabled={busy === n.id}
                          onClick={() => decide(n, true)}
                          className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                        >
                          Grant access
                        </button>
                        <button
                          type="button"
                          disabled={busy === n.id}
                          onClick={() => decide(n, false)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

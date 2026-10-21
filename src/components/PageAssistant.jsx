import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Loader2, Check, AlertCircle } from 'lucide-react'
import AssistantText from './AssistantText.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import VoiceButton from './VoiceButton.jsx'

// The chat helper on a session page. The lecturer types what they want and
// the page carries it out with the same calls its buttons make. Claiming
// and opening happen straight away; scores wait for one tap, because the
// lecturer approves every score.
//
// runAction(action) does the work and resolves to a short line saying what
// happened, or throws with the reason it could not.
export default function PageAssistant({ page, sessionId, title, intro, quick = [], runAction, hidden, onOpen, open: openProp, onOpenChange, noLauncher }) {
  const { token } = useAuth()
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = (v) => (onOpenChange ? onOpenChange(v) : setOpenState(v))
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => endRef.current?.scrollIntoView?.({ block: 'end' }), [messages, sending])

  // "/" opens the chat from anywhere on the page, unless someone is typing.
  useEffect(() => {
    if (hidden) return
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen(true)
        onOpen?.()
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hidden, open])
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  function patch(index, change) {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, ...change } : m)))
  }

  async function carryOut(index, action, key) {
    patch(index, { [key]: { state: 'running' } })
    try {
      const text = await runAction(action)
      patch(index, { [key]: { state: 'done', text } })
    } catch (err) {
      patch(index, { [key]: { state: 'failed', text: err.message } })
    }
  }

  async function send(text) {
    const content = text.trim()
    if (!content || sending) return
    const history = [...messages, { role: 'user', content }]
    setMessages(history)
    setInput('')
    setSending(true)
    setError('')
    try {
      const r = await api.askPageAssistant(
        sessionId,
        page,
        history.map((m) => ({ role: m.role, content: m.content })),
        token
      )
      const index = history.length
      setMessages((prev) => [...prev, { role: 'assistant', content: r.reply, actions: r.actions || [] }])
      ;(r.actions || []).forEach((action, i) => {
        if (action.type !== 'confirm') carryOut(index, action, `run${i}`)
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (hidden) return null

  if (!open) {
    if (noLauncher) return null
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          onOpen?.()
        }}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-sky-500 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-sky-400"
      >
        <MessageCircle size={18} /> {title}
      </button>
    )
  }

  return (
    <aside
      aria-label={title}
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[400px]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <MessageCircle size={15} className="text-sky-500" /> {title}
          </p>
          <p className="text-xs text-slate-500">{intro}</p>
        </div>
        <button onClick={() => setOpen(false)} aria-label={`Close ${title}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Tap a shortcut, type, or use the mic. Press / to open.
          </p>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="ml-8 rounded-2xl rounded-br-sm bg-sky-500 px-3.5 py-2 text-sm text-white">
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-4 space-y-2">
              <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5">
                <AssistantText text={m.content} />
              </div>
              {m.actions?.map((action, j) => {
                const run = m[`run${j}`]
                if (action.type === 'confirm') {
                  return (
                    <div key={j} className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                      <p className="text-sm font-medium text-sky-900">
                        Confirm {action.items.length} score{action.items.length === 1 ? '' : 's'}?
                      </p>
                      <ul className="mt-1.5 space-y-0.5 text-xs text-sky-900">
                        {action.items.map((it) => (
                          <li key={it.answerId}>
                            {it.student}, question {it.label}: {it.score} / {it.maxMarks}
                          </li>
                        ))}
                      </ul>
                      <ActionStatus run={run}>
                        <button
                          onClick={() => carryOut(i, action, `run${j}`)}
                          className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                        >
                          Confirm {action.items.length === 1 ? 'it' : `all ${action.items.length}`}
                        </button>
                      </ActionStatus>
                    </div>
                  )
                }
                return <ActionStatus key={j} run={run} />
              })}
            </div>
          )
        )}
        {sending && (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Working on it...
          </p>
        )}
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div ref={endRef} />
      </div>

      {quick.length > 0 && (
        <div className="border-t border-slate-200 px-3 pt-2.5">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Shortcuts</p>
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:flex-wrap sm:overflow-visible">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={sending}
                className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex gap-2 p-3"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a request or tap the mic"
          aria-label={`Message the ${title}`}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
        />
        <VoiceButton onText={(t) => setInput((prev) => (prev ? `${prev} ${t}` : t))} disabled={sending} />
        <button type="submit" disabled={sending || !input.trim()} aria-label="Send" className="rounded-lg bg-sky-500 px-3 text-white hover:bg-sky-400 disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
    </aside>
  )
}

function ActionStatus({ run, children }) {
  if (!run) return children || null
  if (run.state === 'running')
    return (
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 size={12} className="animate-spin" /> Doing it...
      </p>
    )
  if (run.state === 'failed')
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
        <AlertCircle size={12} /> {run.text}
      </p>
    )
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
      <Check size={13} /> {run.text}
    </p>
  )
}

// "question 2", "questions 1a and 1b", "questions 1a, 1b and 2".
export function questionsText(labels) {
  if (labels.length === 1) return `question ${labels[0]}`
  return `questions ${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`
}

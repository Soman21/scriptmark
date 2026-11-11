import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, Loader2, Check, Minus, Maximize2 } from 'lucide-react'
import AssistantText from './AssistantText.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import VoiceButton from './VoiceButton.jsx'

const MIN_WIDTH = 320
const MAX_WIDTH = 720
const WIDTH_KEY = 'scriptmark.reviewAssistantWidth'

function savedWidth() {
  try {
    const w = Number(localStorage.getItem(WIDTH_KEY))
    if (w >= MIN_WIDTH && w <= MAX_WIDTH) return w
  } catch {
    // Storage can be blocked (private window); the default width is fine.
  }
  return 380
}

const QUICK = ['Why did each question get its score?', 'Check every answer again against the guide.', 'What did this student miss?']

// The marking assistant beside a script in Results. It explains and checks
// scores and can suggest a new one, which only fills the score box: the
// lecturer still confirms. The conversation starts fresh for each script.
//
// Layout: on a laptop (lg and up) the panel sits beside the page as a
// column of its own, under the session tabs, so it pushes the page over
// instead of covering it. Its left edge can be dragged to make it wider or
// narrower. On a phone it is a sheet over the bottom of the screen. On both,
// Minimise folds it down to a small bar and keeps the conversation.
export default function ReviewAssistant({ script, open, onClose, onUseScore, ask }) {
  const { token } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [used, setUsed] = useState({})
  const [minimised, setMinimised] = useState(false)
  const [width, setWidth] = useState(savedWidth)
  const endRef = useRef(null)

  // Dragging the left edge: the panel grows as the pointer moves left.
  function startResize(e) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    let latest = startWidth
    function move(ev) {
      const limit = Math.min(MAX_WIDTH, Math.round(window.innerWidth * 0.6))
      latest = Math.min(Math.max(startWidth + (startX - ev.clientX), MIN_WIDTH), limit)
      setWidth(latest)
    }
    function stop() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try {
        localStorage.setItem(WIDTH_KEY, String(latest))
      } catch {
        // Not saved; the width still holds for this visit.
      }
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  // Opening it again, or asking from an answer card, unfolds it.
  useEffect(() => {
    if (open) setMinimised(false)
  }, [open, ask])

  useEffect(() => {
    setMessages([])
    setUsed({})
    setError('')
  }, [script?.id])

  // A question sent from an answer card's "Ask the assistant" link.
  useEffect(() => {
    if (open && ask?.text) send(ask.text)
  }, [ask])

  // scrollIntoView now returns a Promise in Chrome; an effect may only
  // return a clean up function, so the call is wrapped in braces.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages, sending])

  async function send(text) {
    const content = text.trim()
    if (!content || sending || !script) return
    const history = [...messages, { role: 'user', content }]
    setMessages(history)
    setInput('')
    setSending(true)
    setError('')
    try {
      const r = await api.reviewWithAssistant(
        script.id,
        history.map((m) => ({ role: m.role, content: m.content })),
        token
      )
      setMessages((prev) => [...prev, { role: 'assistant', content: r.reply, proposal: r.proposal }])
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  const who = script?.studentName || script?.regNumber || 'This script'

  if (minimised) {
    return (
      <>
        {/* Phone: a small bar at the bottom of the screen */}
        <button
          onClick={() => setMinimised(false)}
          aria-label="Open the marking assistant"
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-brand-500 lg:hidden"
        >
          <Sparkles size={15} /> Marking assistant
          {sending && <Loader2 size={14} className="animate-spin" />}
        </button>
        {/* Laptop: a thin strip down the right side of the page */}
        <aside aria-label="Marking assistant, minimised" className="hidden w-11 shrink-0 flex-col items-center gap-3 border-l border-slate-200 bg-white py-3 lg:flex">
          <button onClick={() => setMinimised(false)} aria-label="Open the marking assistant" title="Open" className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50">
            <Maximize2 size={16} />
          </button>
          <button onClick={() => setMinimised(false)} className="flex flex-1 flex-col items-center gap-2 text-xs font-medium text-slate-600 hover:text-brand-700">
            <Sparkles size={15} className="text-brand-500" />
            <span className="[writing-mode:vertical-rl]">Marking assistant</span>
            {sending && <Loader2 size={14} className="animate-spin text-brand-500" />}
          </button>
          <button onClick={onClose} aria-label="Close the marking assistant" title="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </aside>
      </>
    )
  }

  return (
    <aside
      aria-label="Marking assistant"
      style={{ '--panel-w': `${width}px` }}
      className="fixed inset-x-0 bottom-0 z-40 flex h-[75dvh] flex-col rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:h-auto lg:w-[var(--panel-w)] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"
    >
      <div
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the marking assistant"
        title="Drag to resize"
        className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize hover:bg-brand-200/60 lg:block"
      />
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Sparkles size={15} className="text-brand-500" /> Marking assistant
          </p>
          <p className="truncate text-xs text-slate-500">
            {who}. Suggestions only fill the score box; you confirm.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button onClick={() => setMinimised(true)} aria-label="Minimise the marking assistant" title="Minimise" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Minus size={18} />
          </button>
          <button onClick={onClose} aria-label="Close the marking assistant" title="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Ask about any answer on this script, or start with one of these.</p>
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="ml-8 rounded-2xl rounded-br-sm bg-brand-500 px-3.5 py-2 text-sm text-white">
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-4 space-y-2">
              <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5">
                <AssistantText text={m.content} />
              </div>
              {m.proposal && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
                  <p className="text-sm font-medium text-brand-900">
                    Suggests {m.proposal.score} / {m.proposal.maxMarks} for {m.proposal.label}
                  </p>
                  {m.proposal.reason && <p className="mt-0.5 text-xs text-brand-800">{m.proposal.reason}</p>}
                  {used[i] ? (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <Check size={13} /> Put in the score box. Confirm it when you're happy.
                    </p>
                  ) : (
                    <button
                      onClick={() => {
                        onUseScore(m.proposal)
                        setUsed((u) => ({ ...u, [i]: true }))
                      }}
                      className="mt-2 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
                    >
                      Use this score
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        )}
        {sending && (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Reading the script...
          </p>
        )}
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this script or tap the mic"
          aria-label="Ask the marking assistant"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-400"
        />
        <VoiceButton onText={(t) => setInput((prev) => (prev ? `${prev} ${t}` : t))} disabled={sending} />
        <button type="submit" disabled={sending || !input.trim()} aria-label="Send" className="rounded-lg bg-brand-500 px-3 text-white hover:bg-brand-600 disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
    </aside>
  )
}

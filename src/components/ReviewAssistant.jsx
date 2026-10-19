import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, Loader2, Check } from 'lucide-react'
import AssistantText from './AssistantText.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const QUICK = ['Why did each question get its score?', 'Check every answer again against the guide.', 'What did this student miss?']

// The marking assistant beside a script in Results. It explains and checks
// scores and can suggest a new one, which only fills the score box: the
// lecturer still confirms. The conversation starts fresh for each script.
export default function ReviewAssistant({ script, open, onClose, onUseScore, ask }) {
  const { token } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [used, setUsed] = useState({})
  const endRef = useRef(null)

  useEffect(() => {
    setMessages([])
    setUsed({})
    setError('')
  }, [script?.id])

  // A question sent from an answer card's "Ask the assistant" link.
  useEffect(() => {
    if (open && ask?.text) send(ask.text)
  }, [ask])

  useEffect(() => endRef.current?.scrollIntoView?.({ block: 'end' }), [messages, sending])

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

  return (
    <aside
      aria-label="Marking assistant"
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[420px]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Sparkles size={15} className="text-sky-500" /> Marking assistant
          </p>
          <p className="truncate text-xs text-slate-500">
            {script?.studentName || script?.regNumber || 'This script'}. Suggestions only fill the score box; you confirm.
          </p>
        </div>
        <button onClick={onClose} aria-label="Close the marking assistant" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={18} />
        </button>
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
            <div key={i} className="ml-8 rounded-2xl rounded-br-sm bg-sky-500 px-3.5 py-2 text-sm text-white">
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-4 space-y-2">
              <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5">
                <AssistantText text={m.content} />
              </div>
              {m.proposal && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <p className="text-sm font-medium text-sky-900">
                    Suggests {m.proposal.score} / {m.proposal.maxMarks} for {m.proposal.label}
                  </p>
                  {m.proposal.reason && <p className="mt-0.5 text-xs text-sky-800">{m.proposal.reason}</p>}
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
                      className="mt-2 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
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
          placeholder="Ask about this script"
          aria-label="Ask the marking assistant"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
        />
        <button type="submit" disabled={sending || !input.trim()} aria-label="Send" className="rounded-lg bg-sky-500 px-3 text-white hover:bg-sky-400 disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
    </aside>
  )
}

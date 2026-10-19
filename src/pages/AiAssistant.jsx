import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, User, Download } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { downloadSessionExport } from '../lib/download.js'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi! I'm the ScriptMark Assistant. Ask me about any of your sessions, such as marking progress, a student's scores, analytics or marking guides, or how to use the app.",
}

// Replies are asked for in plain text, but models still slip into
// markdown now and then, so strip emphasis and show list lines as bullets.
function AssistantText({ text }) {
  const lines = String(text || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').split('\n')
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-slate-800">
      {lines.map((line, i) => {
        const item = line.match(/^\s*([•*-]|\d+[.)])\s+(.*)$/)
        if (item) {
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="shrink-0 text-sky-500">{/\d/.test(item[1]) ? item[1].replace(')', '.') : '•'}</span>
              <span>{item[2]}</span>
            </p>
          )
        }
        return line.trim() ? <p key={i}>{line}</p> : <div key={i} className="h-1" />
      })}
    </div>
  )
}

export default function AiAssistant() {
  const { token } = useAuth()
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceReplies, setVoiceReplies] = useState(() => {
    try {
      return localStorage.getItem('scriptmark_voice_replies') === '1' // default set in Settings
    } catch {
      return false
    }
  })
  const [speechSupported, setSpeechSupported] = useState(true)
  const [downloading, setDownloading] = useState(null)

  const recognitionRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function toggleListening() {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
    }
  }

  function speak(text) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    window.speechSynthesis.speak(utterance)
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    const nextMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setSending(true)

    try {
      // The greeting is shown here only; the server never needs it.
      const historyForApi = nextMessages.filter((m) => m !== WELCOME_MESSAGE).map((m) => ({ role: m.role, content: m.content }))
      const activeSessionId = localStorage.getItem('scriptmark_active_session')
      const data = await api.chatWithAssistant(historyForApi, activeSessionId, token)
      const updated = [...nextMessages, { role: 'assistant', content: data.reply, action: data.action }]
      setMessages(updated)
      if (voiceReplies) speak(data.reply)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDownload(action, format) {
    setDownloading(`${action.sessionId}-${format}`)
    setError('')
    try {
      await downloadSessionExport(action.sessionId, format, action.sessionTitle, token)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloading(null)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="AI Assistant"
        right={
          <button
            onClick={() => setVoiceReplies((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              voiceReplies ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {voiceReplies ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {voiceReplies ? 'Voice replies on' : 'Voice replies off'}
          </button>
        }
      />

      {!speechSupported && (
        <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Voice input is not supported in this browser. Try Chrome or Edge, or just type.
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-xl rounded-2xl bg-slate-100 px-5 py-3 flex items-start gap-2">
                <p className="text-sm text-slate-800">{m.content}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-950 text-white">
                <Sparkles size={16} />
              </div>
              <div className="max-w-xl rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3">
                <AssistantText text={m.content} />
                {m.action?.type === 'export' && (
                  <div className="mt-3 flex gap-2 border-t border-sky-100 pt-3">
                    {(m.action.format === 'xlsx' || m.action.format === 'both') && (
                      <button
                        onClick={() => handleDownload(m.action, 'xlsx')}
                        disabled={!!downloading}
                        className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Download size={12} /> {downloading === `${m.action.sessionId}-xlsx` ? 'Preparing...' : 'Download Excel'}
                      </button>
                    )}
                    {(m.action.format === 'pdf' || m.action.format === 'both') && (
                      <button
                        onClick={() => handleDownload(m.action, 'pdf')}
                        disabled={!!downloading}
                        className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Download size={12} /> {downloading === `${m.action.sessionId}-pdf` ? 'Preparing...' : 'Download PDF'}
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => speak(m.content)}
                  className="mt-2 flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700"
                >
                  <Volume2 size={12} /> Read aloud
                </button>
              </div>
            </div>
          )
        )}
        {sending && (
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-950 text-white">
              <Sparkles size={16} />
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-sm text-slate-400">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-6 py-4">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a session, a student, or anything else..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {speechSupported && (
            <button
              onClick={toggleListening}
              className={`rounded-full p-2 ${listening ? 'bg-rose-100 text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
              title={listening ? 'Stop listening' : 'Speak your question'}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="rounded-full bg-ink-950 p-2 text-white hover:bg-ink-900 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">AI can make mistakes. Check important info.</p>
      </div>
    </div>
  )
}

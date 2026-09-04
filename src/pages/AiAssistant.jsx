import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, User } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi! I'm the ScriptMark Assistant. Ask me anything about creating marking guides, scanning scripts, reviewing scores, or exporting results.",
}

export default function AiAssistant() {
  const { token } = useAuth()
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceReplies, setVoiceReplies] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)

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
      const historyForApi = nextMessages.map((m) => ({ role: m.role, content: m.content }))
      const data = await api.chatWithAssistant(historyForApi, token)
      const updated = [...nextMessages, { role: 'assistant', content: data.reply }]
      setMessages(updated)
      if (voiceReplies) speak(data.reply)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
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
          Voice input is not supported in this browser — try Chrome or Edge. Typing still works fine.
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
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.content}</p>
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
            placeholder="Ask about ScriptMark..."
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

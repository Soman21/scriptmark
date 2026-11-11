import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

// A mic button for the page chats. What is heard goes into the text box,
// so the lecturer can check it before sending. Hidden in browsers without
// speech recognition (Firefox, some Safari versions).
//
// It keeps listening until the lecturer taps it again (or stops talking for
// a while), shows the words live through onInterim, and hands the whole
// sentence to onText at the end. If the browser blocks the mic or has no
// internet for speech, a short note says so instead of failing silently.
const ERRORS = {
  'not-allowed': 'Allow the microphone for this site',
  'service-not-allowed': 'Allow the microphone for this site',
  'audio-capture': 'No microphone found',
  network: 'Voice needs an internet connection',
  'no-speech': 'Nothing heard. Try again',
}

function speechLang() {
  const lang = typeof navigator !== 'undefined' ? navigator.language || '' : ''
  return /^en/i.test(lang) ? lang : 'en-NG'
}

export default function VoiceButton({ onText, onInterim, disabled = false }) {
  const [listening, setListening] = useState(false)
  const [note, setNote] = useState('')
  const recognitionRef = useRef(null)
  const finalRef = useRef('')
  const interimRef = useRef('')
  const handlers = useRef({ onText, onInterim })
  handlers.current = { onText, onInterim }

  const Speech = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

  useEffect(() => () => recognitionRef.current?.abort?.(), [])
  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(''), 4000)
    return () => clearTimeout(t)
  }, [note])

  if (!Speech) return null

  function finish() {
    const text = `${finalRef.current} ${interimRef.current}`.replace(/\s+/g, ' ').trim()
    finalRef.current = ''
    interimRef.current = ''
    handlers.current.onInterim?.('')
    if (text) handlers.current.onText(text)
    setListening(false)
    recognitionRef.current = null
  }

  function start() {
    // A fresh recogniser each time: reusing one after an error can leave
    // Chrome unable to start again.
    const recognition = new Speech()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = speechLang()
    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex || 0; i < event.results.length; i++) {
        const result = event.results[i]
        const words = result[0]?.transcript || ''
        if (result.isFinal) finalRef.current = `${finalRef.current} ${words}`
        else interim += words
      }
      interimRef.current = interim
      handlers.current.onInterim?.(`${finalRef.current} ${interim}`.replace(/\s+/g, ' ').trim())
    }
    recognition.onerror = (event) => {
      if (event?.error && event.error !== 'aborted') setNote(ERRORS[event.error] || 'Voice input stopped. Try again')
    }
    recognition.onend = finish
    recognitionRef.current = recognition
    finalRef.current = ''
    interimRef.current = ''
    setNote('')
    try {
      recognition.start()
      setListening(true)
    } catch {
      setListening(false)
      setNote('Voice input could not start. Try again')
    }
  }

  function toggle() {
    if (listening) recognitionRef.current?.stop()
    else start()
  }

  return (
    <span className="relative flex">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={listening ? 'Stop listening' : 'Speak your request'}
        title={listening ? 'Stop listening' : 'Speak your request'}
        className={`rounded-lg px-2.5 disabled:opacity-50 ${listening ? 'animate-pulse bg-rose-100 text-rose-600' : 'border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
      {(note || listening) && (
        <span role="status" className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow">
          {note || 'Listening. Tap to stop'}
        </span>
      )}
    </span>
  )
}

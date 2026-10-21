import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

// A mic button for the page chats. What is heard goes into the text box,
// so the lecturer can check it before sending. Hidden in browsers without
// speech recognition (Firefox, some Safari versions).
export default function VoiceButton({ onText, disabled = false }) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => onTextRef.current(event.results[0][0].transcript)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [])

  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) return null

  function toggle() {
    const r = recognitionRef.current
    if (!r) return
    if (listening) {
      r.stop()
      setListening(false)
    } else {
      try {
        r.start()
        setListening(true)
      } catch {
        setListening(false)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? 'Stop listening' : 'Speak your request'}
      title={listening ? 'Stop listening' : 'Speak your request'}
      className={`rounded-lg px-2.5 disabled:opacity-50 ${listening ? 'bg-rose-100 text-rose-600' : 'border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
    >
      {listening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  )
}

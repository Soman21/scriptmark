import { useEffect, useState } from 'react'
import { X, Loader2, ChevronRight } from 'lucide-react'
import { api } from '../lib/api.js'
import { PrimaryButton, SecondaryButton } from './ui.jsx'

// The lecturer types what an answer really says, starting from the text
// the AI marked. Each saved answer adds to the WER and CER figures.
export default function TranscriptionCheckDialog({ sessionId, token, onClose }) {
  const [batch, setBatch] = useState(null)
  const [index, setIndex] = useState(0)
  const [page, setPage] = useState(0)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getTranscriptionSample(sessionId, 10, token)
      .then((d) => {
        setBatch(d)
        setText(d.answers[0]?.markedText || '')
      })
      .catch((err) => setError(err.message))
  }, [sessionId, token])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose(saved)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saved])

  const answer = batch?.answers[index]

  function next() {
    const i = index + 1
    setIndex(i)
    setPage(0)
    setText(batch.answers[i]?.markedText || '')
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      await api.saveReferenceText(answer.id, text, token)
      setSaved((n) => n + 1)
      next()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" onClick={() => onClose(saved)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transcription-heading"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-5xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="transcription-heading" className="text-base font-semibold text-slate-900">
              Transcription check
            </h2>
            <p className="text-xs text-slate-500">Correct the text to match the handwriting.</p>
          </div>
          <div className="flex items-center gap-3">
            {batch?.answers.length > 0 && answer && (
              <span className="text-xs text-slate-500">
                {index + 1} of {batch.answers.length}
              </span>
            )}
            <button type="button" onClick={() => onClose(saved)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
          {!batch && !error && <p className="text-sm text-slate-400">Loading...</p>}
          {batch && !answer && (
            <p className="text-sm text-slate-600">
              {saved ? `${saved} saved. ` : ''}
              {batch.answers.length === 0 ? 'No answers left to check.' : 'Batch complete.'}
            </p>
          )}
          {answer && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {answer.pages[page] ? (
                    <img src={answer.pages[page]} alt={`Page ${page + 1}`} className="max-h-[60vh] w-full object-contain" />
                  ) : (
                    <p className="p-6 text-sm text-slate-400">No page image</p>
                  )}
                </div>
                {answer.pages.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Pages">
                    {answer.pages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${i === page ? 'bg-ink-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        Page {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-slate-900">
                  {answer.question}
                  {answer.student && <span className="ml-2 font-normal text-slate-500">{answer.student}</span>}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{answer.questionText}</p>
                <label htmlFor="reference-text" className="mt-3 text-xs font-medium text-slate-500">
                  What the student wrote
                </label>
                <textarea
                  id="reference-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={14}
                  className="mt-1 w-full flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>
          )}
        </div>

        {answer && (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <SecondaryButton onClick={next} disabled={saving}>
              Skip
            </SecondaryButton>
            <PrimaryButton onClick={save} disabled={saving || !text.trim()}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />} Save and next
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  )
}

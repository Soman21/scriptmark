import { Eye, FileText, RefreshCw, Trash2, X } from 'lucide-react'

// The files a guide was read from (question paper, marking guide), kept on
// the guide with the text read from each. A file is
// { url, mimeType, name, text, scanned, uploadedAt }; a guide loaded from a
// list carries hasText instead of text, and the text is fetched on demand.

// Only PDFs and pictures can be shown in the browser; Word shows its text.
export const canViewFile = (file) => /^(application\/pdf|image\/)/.test(file?.mimeType || '')

const fmtDate = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const badge = (file) => {
  if (/pdf/.test(file.mimeType || '')) return 'PDF'
  if (/^image\//.test(file.mimeType || '')) return 'IMG'
  return 'DOC'
}

export function SourceFileRow({ file, onView, onText, onReplace, onRemove }) {
  const meta = [file.scanned ? 'Scanned' : null, fmtDate(file.uploadedAt)].filter(Boolean).join(' · ')
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-700">
        {badge(file)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
        {meta && <p className="text-xs text-slate-500">{meta}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {canViewFile(file) && (
          <button onClick={onView} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
            <Eye size={14} /> View file
          </button>
        )}
        <button onClick={onText} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
          <FileText size={14} /> Text
        </button>
        <button onClick={onReplace} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
          <RefreshCw size={14} /> Replace
        </button>
        <button onClick={onRemove} className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600">
          <Trash2 size={14} /> Remove
        </button>
      </div>
    </div>
  )
}

// Full screen view of a file or of its read text (read only).
export function SourceViewer({ file, mode, text, loading, onClose }) {
  if (!file) return null
  const showFile = mode === 'file' && canViewFile(file)
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/80 p-4 md:p-10">
      <div className="flex items-center justify-between pb-3">
        <span className="truncate text-sm font-medium text-white">
          {showFile ? file.name : `Text · ${file.name}`}
        </span>
        <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-white hover:bg-white/10">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-auto rounded-xl bg-white">
        {showFile ? (
          /^image\//.test(file.mimeType) ? (
            <img src={file.url} alt={file.name} className="mx-auto max-w-full" />
          ) : (
            <iframe src={file.url} title={file.name} className="h-full w-full" />
          )
        ) : (
          <pre className="whitespace-pre-wrap p-6 font-mono text-[13px] leading-relaxed text-slate-700">
            {loading ? 'Loading...' : text || 'No text was read from this file.'}
          </pre>
        )}
      </div>
    </div>
  )
}

// Asked before a file is replaced, because reading the new file fills the
// questions in again.
export function ReplaceDialog({ kind, onCancel, onConfirm }) {
  if (!kind) return null
  const paper = kind === 'questionPaper'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <p className="font-semibold text-slate-900">{paper ? 'Replace the question paper?' : 'Replace the marking guide?'}</p>
        <p className="mt-1.5 text-sm text-slate-600">
          {paper
            ? 'The questions will be read again from the new file. Your edits to them will be replaced.'
            : 'Answers and marking points will be filled in again from the new file. Your edits to them will be replaced.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
            Choose file
          </button>
        </div>
      </div>
    </div>
  )
}

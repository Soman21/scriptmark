import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Files, ChevronDown, ChevronUp, Loader2, AlertCircle, X, FileText, Image as ImageIcon, CheckCircle2, UploadCloud } from 'lucide-react'
import { PrimaryButton } from './ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Lets a lecturer select several separate files in one go, where EACH FILE
// is already one individual student's complete script (a single page image,
// or a PDF, short or long). Unlike Bulk PDF Upload, there is no grouping
// step, since each file already is one whole submission. No OCR happens
// here either, digitizing and detection happen automatically in Marking.
// Files sent per request, so a big batch never hits the server's limit of
// 50 files and the lecturer sees progress as it goes.
const CHUNK = 10
const isAccepted = (f) => f.type === 'application/pdf' || f.type.startsWith('image/')

export default function MultiDocUploadPanel({ sessionId, onScriptsCreated, embedded = false }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(embedded)
  const [progress, setProgress] = useState(null)
  const [skipped, setSkipped] = useState([])
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  function addFiles(fileList) {
    const picked = Array.from(fileList || [])
    const left = picked.filter((f) => !isAccepted(f)).map((f) => f.name)
    if (left.length) setSkipped(left)
    setFiles((prev) => {
      // The same file picked twice would become two scripts for one student.
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
      return [...prev, ...picked.filter((f) => isAccepted(f) && !seen.has(`${f.name}:${f.size}`))]
    })
  }

  function handleFilesSelected(e) {
    addFiles(e.target.files)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleUpload() {
    if (files.length === 0) return
    setUploading(true)
    setError('')
    const created = []
    try {
      for (let i = 0; i < files.length; i += CHUNK) {
        setProgress({ done: i, total: files.length })
        const formData = new FormData()
        files.slice(i, i + CHUNK).forEach((f) => formData.append('files', f))
        const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/scripts/batchUpload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        created.push(...data.scripts)
      }

      onScriptsCreated?.(created)
      setFiles([])
      setSkipped([])
      setExpanded(false)

      await api.startMarking(sessionId, token).catch(() => {})
      navigate(`/sessions/${sessionId}/marking`)
    } catch (err) {
      // Files already sent are saved; keep only the ones still to go.
      if (created.length) {
        onScriptsCreated?.(created)
        setFiles((prev) => prev.slice(created.length))
      }
      setError(created.length ? `${err.message} ${created.length} file${created.length !== 1 ? 's were' : ' was'} saved. Press Upload All to send the rest.` : err.message)
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => !embedded && setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left ${embedded ? 'cursor-default' : ''}`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Files size={16} className="text-violet-500" /> One file per student
        </span>
        {!embedded && (expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />)}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Each file becomes one student's script: a PDF of any length, or a single photo. If a student's script is
            several photos, put them in one PDF first, or use One script at a time, otherwise each photo becomes its
            own script.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
              dragOver ? 'border-violet-400 bg-violet-50' : 'border-slate-300 bg-white'
            }`}
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-500">
              <UploadCloud size={20} />
            </div>
            <p className="text-sm font-medium text-slate-800">Drag files here, as many as you like at once</p>
            <p className="mt-1 text-xs text-slate-400">PDFs and photos only. You can add more files as many times as you like before uploading.</p>
            <label className="mt-3 inline-block cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100">
              Choose files
              <input
                type="file"
                multiple
                accept="application/pdf,image/*"
                onChange={handleFilesSelected}
                className="hidden"
              />
            </label>
          </div>

          {skipped.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" /> Left out {skipped.join(', ')}. Only PDFs and photos can be uploaded.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {files.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {f.type === 'application/pdf' ? (
                        <FileText size={14} className="shrink-0 text-rose-500" />
                      ) : (
                        <ImageIcon size={14} className="shrink-0 text-sky-500" />
                      )}
                      <span className="truncate text-sm text-slate-700">{f.name}</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-500" title="Remove">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <PrimaryButton
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="bg-violet-500 hover:bg-violet-400"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {progress ? `Uploading ${Math.min(progress.done + CHUNK, progress.total)} of ${progress.total}...` : 'Uploading...'}
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Upload All{files.length ? ` (${files.length} script${files.length !== 1 ? 's' : ''})` : ''}
              </>
            )}
          </PrimaryButton>
        </div>
      )}
    </div>
  )
}
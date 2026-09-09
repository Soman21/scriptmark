import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Files, ChevronDown, ChevronUp, Loader2, AlertCircle, X, FileText, Image as ImageIcon, CheckCircle2 } from 'lucide-react'
import { PrimaryButton } from './ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Lets a lecturer select several separate files in one go, where EACH FILE
// is already one individual student's complete script (a single page image,
// or a PDF, short or long). Unlike Bulk PDF Upload, there is no grouping
// step, since each file already is one whole submission. No OCR happens
// here either, digitizing and detection happen automatically in Marking.
export default function MultiDocUploadPanel({ sessionId, onScriptsCreated }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function handleFilesSelected(e) {
    const picked = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...picked])
    e.target.value = ''
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleUpload() {
    if (files.length === 0) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))

      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/scripts/batchUpload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      onScriptsCreated?.(data.scripts)
      setFiles([])
      setExpanded(false)

      await api.startMarking(sessionId, token).catch(() => {})
      navigate('/marking')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Files size={16} className="text-violet-500" /> Batch Upload (Multiple Students)
        </span>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Select several files at once, each one being one student's complete script. A file can be a single page
            image, or a PDF of any length belonging to just that student. Use this when you already have separate
            files per student, not one big PDF that still needs splitting.
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <input
            type="file"
            multiple
            accept="application/pdf,image/*"
            onChange={handleFilesSelected}
            className="block w-full text-sm text-slate-600"
          />

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
                <Loader2 size={16} className="animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Upload All
              </>
            )}
          </PrimaryButton>
        </div>
      )}
    </div>
  )
}
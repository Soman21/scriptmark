import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Users, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Attendance sheet upload at scan time. Posts to the same classList endpoint
// as the Export page, so the sheet merges into the session's one roster.
// Uploading it before the scripts means every front page that follows is
// matched to a student by reg number as it comes in; uploading it after
// still re matches the scripts already scanned.
export default function AttendanceUploadCard({ sessionId, onUploaded }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [classList, setClassList] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getClassList(sessionId, token)
      .then((data) => setClassList(data.classList || []))
      .catch(() => {}) // the count is only informative; uploading still works without it
  }, [sessionId])

  async function handleUpload(file) {
    if (!file) return
    setUploading(true)
    setMessage('')
    setError('')
    try {
      const formData = new FormData()
      formData.append('document', file)
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/classList`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not read that attendance sheet.')

      setClassList(data.classList || [])
      const parts = []
      if (data.addedCount) parts.push(`${data.addedCount} student${data.addedCount !== 1 ? 's' : ''} added`)
      if (data.rematchedCount) {
        parts.push(`${data.rematchedCount} scanned script${data.rematchedCount !== 1 ? 's' : ''} matched`)
      }
      setMessage(parts.length ? parts.join(', ') + '.' : 'No new students found on that sheet.')
      onUploaded?.(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const conflictCount = classList.filter((e) => e.flagged).length

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Attendance Sheet</p>
          <p className="text-xs text-slate-500 mt-1">
            Upload the attendance sheet for this exam, as a photo, PDF or Word file. Scripts are matched to students
            by reg number, so names come from the sheet instead of being guessed.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
            <Users size={13} />
            {classList.length === 0
              ? 'No students on the class list yet.'
              : `${classList.length} student${classList.length !== 1 ? 's' : ''} on the class list.`}
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {uploading ? 'Reading...' : (
            <>
              <Upload size={14} /> Upload sheet
            </>
          )}
          <input
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            className="hidden"
            aria-label="Upload attendance sheet"
            disabled={uploading}
            onChange={(e) => {
              handleUpload(e.target.files?.[0])
              e.target.value = '' // allow picking the same file again
            }}
          />
        </label>
      </div>
      {message && <p className="mt-3 text-xs text-slate-500">{message}</p>}
      {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
      {conflictCount > 0 && (
        <button
          onClick={() => navigate(`/sessions/${sessionId}/export`)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800"
        >
          <AlertTriangle size={13} />
          {conflictCount} name conflict{conflictCount !== 1 ? 's' : ''} to review before export. Open Export
        </button>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Camera, CheckCircle2, Loader2, AlertCircle, FilePlus2, UserPlus, X, Sparkles } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import BulkUploadPanel from '../components/BulkUploadPanel.jsx'
import MultiDocUploadPanel from '../components/MultiDocUploadPanel.jsx'
import { PrimaryButton, SecondaryButton } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function ScanScripts() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')

  // Session (course/exam) state
  const [sessionId, setSessionId] = useState(null)
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionNameInput, setSessionNameInput] = useState('')
  const [departmentInput, setDepartmentInput] = useState('')
  const [facultyInput, setFacultyInput] = useState('')
  const [startingSession, setStartingSession] = useState(false)

  // Current student / script in progress across multiple pages
  const [studentNameInput, setStudentNameInput] = useState('')
  const [regNumberInput, setRegNumberInput] = useState('')
  const [detectedFields, setDetectedFields] = useState({ name: false, regNumber: false })
  const [activeScript, setActiveScript] = useState(null)

  const [scripts, setScripts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('scriptmark_active_session')
    const title = localStorage.getItem('scriptmark_active_session_title')

    if (id && title) {
      setSessionId(id)
      setSessionTitle(title)
      restoreProgress(id)
    }
  }, [])

  async function restoreProgress(activeSessionId) {
    try {
      const scriptData = await api.getSessionScripts(activeSessionId, token)
      setScripts(scriptData)

      const inProgressId = localStorage.getItem('scriptmark_active_script')
      if (inProgressId) {
        const found = scriptData.find((s) => s.id === inProgressId)
        if (found) {
          setActiveScript(found)
          setStudentNameInput(found.studentName || '')
          setRegNumberInput(found.regNumber || '')
        } else {
          localStorage.removeItem('scriptmark_active_script')
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (activeScript) {
      localStorage.setItem('scriptmark_active_script', activeScript.id)
    } else {
      localStorage.removeItem('scriptmark_active_script')
    }
  }, [activeScript])

  async function handleStartSession() {
    if (!sessionNameInput.trim()) {
      setError('Give this session a name (e.g. the course code and exam name).')
      return
    }
    setStartingSession(true)
    setError('')
    try {
      const session = await api.createSession(
        { title: sessionNameInput.trim(), department: departmentInput.trim(), faculty: facultyInput.trim() },
        token
      )
      localStorage.setItem('scriptmark_active_session', session.id)
      localStorage.setItem('scriptmark_active_session_title', session.title)
      setSessionId(session.id)
      setSessionTitle(session.title)
    } catch (err) {
      setError('Could not start a scanning session: ' + err.message)
    } finally {
      setStartingSession(false)
    }
  }

  function handleEndSession() {
    localStorage.removeItem('scriptmark_active_session')
    localStorage.removeItem('scriptmark_active_session_title')
    localStorage.removeItem('scriptmark_active_script')
    setSessionId(null)
    setSessionTitle('')
    setScripts([])
    setActiveScript(null)
  }

  // Uploads a page (given as a File or Blob). If activeScript is set, it's appended
  // as the NEXT page of that student's script. Otherwise it starts a brand new script,
  // and student name/reg number are optional — left blank, they get auto detected
  // from the front page's text if possible.
  async function uploadPage(fileOrBlob, filename) {
    if (!fileOrBlob || !sessionId) return

    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', fileOrBlob, filename || 'page.jpg')
      if (activeScript) {
        formData.append('scriptId', activeScript.id)
      } else {
        if (studentNameInput.trim()) formData.append('studentName', studentNameInput.trim())
        if (regNumberInput.trim()) formData.append('regNumber', regNumberInput.trim())
      }

      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/scripts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok && res.status !== 207) throw new Error(data.error || 'Upload failed')

      const updatedScript = data.script || data
      const detected = data.detectedStudentInfo

      setActiveScript(updatedScript)
      setStudentNameInput(updatedScript.studentName || '')
      setRegNumberInput(updatedScript.regNumber || '')
      setDetectedFields({ name: !!detected?.name, regNumber: !!detected?.regNumber })
      setScoreResult(null)

      setScripts((prev) => {
        const withoutThis = prev.filter((s) => s.id !== updatedScript.id)
        return [updatedScript, ...withoutThis]
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    uploadPage(file, file?.name)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Live camera capture: works on a phone's or laptop's own camera, via the browser
  async function openCamera() {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not support camera capture. Use "Select File" instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraOpen(true)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 0)
    } catch (err) {
      setCameraError('Could not access the camera. Check your browser permission for this site.')
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
  }

  async function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (blob) uploadPage(blob, `capture_${Date.now()}.jpg`)
      },
      'image/jpeg',
      0.92
    )
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  async function saveStudentInfo() {
    if (!activeScript) return
    try {
      const updated = await api.updateStudentInfo(
        activeScript.id,
        { studentName: studentNameInput.trim(), regNumber: regNumberInput.trim() },
        token
      )
      setActiveScript(updated)
      setDetectedFields({ name: false, regNumber: false })
      setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch (err) {
      setError(err.message)
    }
  }

  function handleNewStudent() {
    setActiveScript(null)
    setStudentNameInput('')
    setRegNumberInput('')
    setDetectedFields({ name: false, regNumber: false })
    setScoreResult(null)
  }

  async function handleDiscard() {
    if (!activeScript) return
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/scripts/${activeScript.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok && res.status !== 204) throw new Error('Could not discard the script.')
      setScripts((prev) => prev.filter((s) => s.id !== activeScript.id))
      handleNewStudent()
    } catch (err) {
      setError(err.message)
    }
  }

  // Scoring is deferred to the Marking pipeline now, same as every other
  // upload path — this just tells that pipeline to start, for the whole
  // session, once the lecturer is done scanning.
  async function handleFinishAndMark() {
    if (!sessionId) return
    setFinishing(true)
    setError('')
    try {
      await api.startMarking(sessionId, token)
      navigate('/marking')
    } catch (err) {
      setError(err.message)
      setFinishing(false)
    }
  }

  const pageCount = activeScript?.pages?.length || 0

  if (user && user.role === 'REVIEWER') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm font-medium text-slate-700">Only Lecturers and Admins can upload or scan scripts.</p>
          <p className="text-sm text-slate-500 mt-1">You can review and confirm scores for scripts that have already been uploaded, from Results.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Scan Student Scripts"
        right={
          sessionTitle && (
            <div className="flex items-center gap-2">
              <span className="hidden md:flex items-center gap-2 rounded-full bg-sky-50 text-sky-700 text-xs font-medium px-3 py-1">
                SESSION: {sessionTitle.toUpperCase()}
              </span>
              <button onClick={handleEndSession} className="text-xs text-slate-400 hover:text-rose-500 underline">
                End Session
              </button>
            </div>
          )
        }
        search="Search sessions..."
      />

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!sessionId ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-semibold text-slate-900 text-center">Set up this scanning session</p>
            <p className="text-sm text-slate-500 mt-1 text-center">
              This information appears at the top of your exported results sheet.
            </p>

            <label className="block text-xs font-medium text-slate-500 mt-4">Course / Exam Title</label>
            <input
              value={sessionNameInput}
              onChange={(e) => setSessionNameInput(e.target.value)}
              placeholder="CS101 Midterm"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            />

            <label className="block text-xs font-medium text-slate-500 mt-3">Department</label>
            <input
              value={departmentInput}
              onChange={(e) => setDepartmentInput(e.target.value)}
              placeholder="Computer Science"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            />

            <label className="block text-xs font-medium text-slate-500 mt-3">Faculty</label>
            <input
              value={facultyInput}
              onChange={(e) => setFacultyInput(e.target.value)}
              placeholder="Physical Sciences"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            />

            <PrimaryButton
              onClick={handleStartSession}
              disabled={startingSession}
              className="mt-4 w-full justify-center bg-sky-500 hover:bg-sky-400"
            >
              {startingSession ? 'Starting...' : 'Start Scanning Session'}
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Student</label>
                {activeScript && (
                  <button
                    onClick={handleNewStudent}
                    className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                  >
                    <UserPlus size={12} /> New Student
                  </button>
                )}
              </div>

              {!activeScript && (
                <p className="text-xs text-slate-400 mb-2">
                  Leave blank to try automatic detection from the front page, or type it in now.
                </p>
              )}

              {(detectedFields.name || detectedFields.regNumber) && (
                <div className="mb-2 space-y-1">
                  {detectedFields.regNumber && (
                    <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 size={12} /> Reg number detected automatically, usually reliable.
                    </p>
                  )}
                  {detectedFields.name && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600">
                      <Sparkles size={12} /> Name guessed by position, no printed label to anchor on. Please double check it.
                    </p>
                  )}
                </div>
              )}

              <input
                value={studentNameInput}
                onChange={(e) => setStudentNameInput(e.target.value)}
                onBlur={saveStudentInfo}
                placeholder="Student full name"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              />
              <input
                value={regNumberInput}
                onChange={(e) => setRegNumberInput(e.target.value)}
                onBlur={saveStudentInfo}
                placeholder="Registration number"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              />
              {activeScript && (
                <>
                  <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {pageCount} page{pageCount !== 1 ? 's' : ''} captured for this script
                  </p>
                  {pageCount > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {activeScript.pages.map((p) => (
                        <div key={p.id} className="rounded-lg bg-slate-50 border border-slate-200 aspect-[3/4] overflow-hidden">
                          <img src={p.imageUrl} alt={`Page ${p.pageNumber}`} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mb-1">
              <p className="text-sm font-semibold text-slate-900">Scan One Script</p>
              <p className="text-xs text-slate-500">
                Use this when you have one physical script in front of you right now. Type the student's details once below, then add each page as you go, by camera or photo.
              </p>
            </div>

            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                <UploadCloud size={22} />
              </div>
              <p className="font-semibold text-slate-900">
                {activeScript ? `Add page ${pageCount + 1}` : 'Upload page 1'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                A full script can be many pages. Upload them one at a time, in order.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="scriptUploadInput"
              />
              <PrimaryButton
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !sessionId}
                className="mt-4 mx-auto bg-sky-500 hover:bg-sky-400"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <FilePlus2 size={16} /> {activeScript ? 'Add Another Page' : 'Select File'}
                  </>
                )}
              </PrimaryButton>
            </div>

            {cameraError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                <AlertCircle size={14} /> {cameraError}
              </div>
            )}

            {!cameraOpen ? (
              <button
                onClick={openCamera}
                disabled={!sessionId}
                className="relative rounded-xl bg-ink-950 overflow-hidden aspect-video flex items-center justify-center w-full hover:opacity-90 transition-opacity"
              >
                <div className="flex flex-col items-center gap-2 text-white">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                    <Camera size={22} />
                  </div>
                  <p className="text-xs text-slate-300">Tap to use your camera (phone or webcam)</p>
                </div>
              </button>
            ) : (
              <div className="relative rounded-xl bg-ink-950 overflow-hidden aspect-video">
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-medium text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
                </span>
                <button
                  onClick={closeCamera}
                  className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={capturePhoto}
                  disabled={uploading}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink-950 shadow-lg disabled:opacity-60"
                >
                  {uploading ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
                </button>
              </div>
            )}

            {activeScript && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs text-slate-500">Status: {activeScript.status}</p>
                <SecondaryButton onClick={handleDiscard} className="px-3 py-1.5 text-xs">
                  Discard Scan
                </SecondaryButton>
              </div>
            )}

            <BulkUploadPanel
              sessionId={sessionId}
              onScriptsCreated={(newScripts) => {
                setScripts((prev) => [...newScripts, ...prev])
              }}
            />

            <MultiDocUploadPanel
              sessionId={sessionId}
              onScriptsCreated={(newScripts) => {
                setScripts((prev) => [...newScripts, ...prev])
              }}
            />

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="font-semibold text-sm text-slate-900">Scripts This Session ({scripts.length})</p>
              </div>
              {scripts.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-400 text-center">No scripts uploaded yet in this session.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {scripts.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          s.status === 'DIGITIZED'
                            ? 'bg-emerald-50 text-emerald-500'
                            : s.status === 'FLAGGED'
                            ? 'bg-rose-50 text-rose-500'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {s.status === 'DIGITIZED' ? <CheckCircle2 size={16} /> : <div className="h-2 w-2 rounded-full bg-current" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate">
                          {s.studentName || s.studentIdentifier || 'Unnamed script'}
                        </p>
                        <p className="text-xs text-slate-400">{s.regNumber}</p>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          s.status === 'DIGITIZED' ? 'text-emerald-500' : s.status === 'FLAGGED' ? 'text-rose-500' : 'text-slate-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {scripts.length > 0 && (
              <PrimaryButton
                onClick={handleFinishAndMark}
                disabled={finishing}
                className="w-full justify-center bg-emerald-600 hover:bg-emerald-500"
              >
                {finishing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Starting...
                  </>
                ) : (
                  'Done Scanning, Start Marking'
                )}
              </PrimaryButton>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
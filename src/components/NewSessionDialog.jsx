import { useEffect, useRef, useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import {
  SEMESTERS,
  EXAM_TYPES,
  guessSessionStart,
  guessSemester,
  academicSessionFrom,
  twoDigitsFrom,
  normalizeCourseCode,
  buildSessionTitle,
  lastOwnSession,
  findDuplicate,
} from '../lib/sessionForm.js'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400'
const labelClass = 'block text-xs font-medium text-slate-500'

// One short form for a new marking session. Semester and year are picked, not
// typed, and department, faculty and the year are carried over from the
// lecturer's last session, so most sessions need only a course code.
export default function NewSessionDialog({ open, onClose, onCreated, onOpenExisting }) {
  const { token, user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [semester, setSemester] = useState(guessSemester())
  const [yearDigits, setYearDigits] = useState(guessSessionStart())
  const [examinationType, setExaminationType] = useState('Examination')
  const [department, setDepartment] = useState('')
  const [faculty, setFaculty] = useState('')
  const [autoAccept, setAutoAccept] = useState(true)
  const [showMore, setShowMore] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const codeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setCourseCode('')
    setCourseTitle('')
    setExaminationType('Examination')
    setError('')
    setCreating(false)
    setTimeout(() => codeRef.current?.focus(), 0)
    api
      .getSessions(token)
      .then((list) => {
        setSessions(list)
        const last = lastOwnSession(list, user?.id)
        if (last) {
          setDepartment(last.department || '')
          setFaculty(last.faculty || '')
          if (last.semester) setSemester(last.semester)
          if (twoDigitsFrom(last.academicSession)) setYearDigits(twoDigitsFrom(last.academicSession))
          setAutoAccept(last.autoAcceptHighConfidence !== false)
        }
        setShowMore(!last || (!last.department && !last.faculty))
      })
      .catch(() => setShowMore(true))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const academicSession = academicSessionFrom(yearDigits)
  const endYear = academicSession ? academicSession.slice(-2) : ''
  const form = { courseCode, courseTitle, examinationType, semester, academicSession }
  const title = buildSessionTitle(form)
  const duplicate = findDuplicate(sessions, form)

  async function handleCreate(e) {
    e.preventDefault()
    if (!courseCode.trim()) {
      setError('Enter the course code.')
      codeRef.current?.focus()
      return
    }
    if (!academicSession) {
      setError('Type the last two digits of the year the session starts, for example 26.')
      return
    }
    setCreating(true)
    setError('')
    try {
      const session = await api.createSession(
        {
          title,
          courseCode: normalizeCourseCode(courseCode),
          semester,
          academicSession,
          examinationType,
          department: department.trim(),
          faculty: faculty.trim(),
          autoAcceptHighConfidence: autoAccept,
        },
        token
      )
      onCreated(session)
    } catch (err) {
      setError(err.message)
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-session-heading"
        onSubmit={handleCreate}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="new-session-heading" className="text-lg font-semibold text-slate-900">
              New marking session
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Pick the course and the semester. You set up the marking guide next.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-3">
          <div className="col-span-2">
            <label htmlFor="ns-code" className={labelClass}>
              Course code
            </label>
            <input
              id="ns-code"
              ref={codeRef}
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
              placeholder="ECE 512"
              autoComplete="off"
              className={`${inputClass} uppercase`}
            />
          </div>
          <div className="col-span-3">
            <label htmlFor="ns-title" className={labelClass}>
              Course title <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="ns-title"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="Digital Signal Processing"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ns-semester" className={labelClass}>
              Semester
            </label>
            <select id="ns-semester" value={semester} onChange={(e) => setSemester(e.target.value)} className={inputClass}>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  {s} Semester
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ns-year" className={labelClass}>
              Academic session
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus-within:ring-2 focus-within:ring-sky-400">
              <span className="text-slate-500">20</span>
              <input
                id="ns-year"
                value={yearDigits}
                onChange={(e) => setYearDigits(e.target.value.replace(/\D/g, '').slice(0, 2))}
                inputMode="numeric"
                maxLength={2}
                aria-label="Last two digits of the starting year"
                className="mx-1 my-1.5 w-10 rounded-md border border-slate-300 bg-white py-1 text-center font-medium text-slate-900 outline-none focus:border-sky-400"
              />
              <span className="text-slate-500">/ 20{endYear || '..'}</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <span className={labelClass}>Type</span>
          <div className="mt-1 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type">
            {EXAM_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={examinationType === t}
                onClick={() => setExaminationType(t)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  examinationType === t
                    ? 'border-sky-500 bg-sky-50 font-medium text-sky-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="mt-4 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
        >
          <span className="min-w-0 truncate text-slate-600">
            {department || faculty ? [department, faculty].filter(Boolean).join(', ') : 'Department and faculty'}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-sky-600">
            {showMore ? 'Hide' : 'Change'} <ChevronDown size={14} className={showMore ? 'rotate-180' : ''} />
          </span>
        </button>

        {showMore && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ns-dept" className={labelClass}>
                  Department
                </label>
                <input id="ns-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Electronic and Computer Engineering" className={inputClass} />
              </div>
              <div>
                <label htmlFor="ns-faculty" className={labelClass}>
                  Faculty
                </label>
                <input id="ns-faculty" value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Engineering" className={inputClass} />
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5" checked={autoAccept} onChange={(e) => setAutoAccept(e.target.checked)} />
              Accept high confidence AI scores automatically, so you only review flagged or uncertain answers
            </label>
          </div>
        )}

        {courseCode.trim() && (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Saved as <span className="font-medium text-slate-800">{title}</span>
          </p>
        )}

        {duplicate && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You already have this session.{' '}
            {onOpenExisting && (
              <button type="button" onClick={() => onOpenExisting(duplicate)} className="font-medium underline">
                Open it instead
              </button>
            )}
          </div>
        )}

        {error && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <p className="mt-4 text-xs text-slate-400">Other lecturers join with a code you get right after creating the session.</p>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose} className="justify-center">
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={creating} className="justify-center bg-sky-500 hover:bg-sky-400">
            {creating ? 'Creating...' : 'Create and set up guide'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}

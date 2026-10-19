// Small helpers behind the New Session form, kept apart so they can be tested.

export const SEMESTERS = ['First', 'Second']
export const EXAM_TYPES = ['Examination', 'Test', 'Assignment']

// Nigerian academic sessions start around September, so from September on
// the session that starts this year is the likely one; before that, last year's.
export function guessSessionStart(date = new Date()) {
  const year = date.getFullYear()
  return String(date.getMonth() >= 8 ? year : year - 1).slice(2)
}

// First semester runs roughly September to February, second from March.
export function guessSemester(date = new Date()) {
  const m = date.getMonth()
  return m >= 8 || m <= 1 ? 'First' : 'Second'
}

// "26" becomes "2026/2027". Anything that is not two digits gives ''.
export function academicSessionFrom(twoDigits) {
  if (!/^\d{2}$/.test(twoDigits || '')) return ''
  const start = 2000 + Number(twoDigits)
  return `${start}/${start + 1}`
}

// "2026/2027" back to "26", for prefilling from an earlier session.
export function twoDigitsFrom(academicSession) {
  const m = /^20(\d{2})\//.exec(academicSession || '')
  return m ? m[1] : ''
}

// "ece512" or "ece  512" becomes "ECE 512"; a code typed with no space keeps none.
export function normalizeCourseCode(code) {
  return String(code || '').toUpperCase().replace(/\s+/g, ' ').trim()
}

export function buildSessionTitle({ courseCode, courseTitle, examinationType, semester, academicSession }) {
  let base = [normalizeCourseCode(courseCode), String(courseTitle || '').trim()].filter(Boolean).join(' ')
  if (examinationType && examinationType !== 'Examination') base += ` ${examinationType}`
  const when = [semester ? `${semester} Semester` : '', academicSession].filter(Boolean).join(' ')
  return when ? `${base}, ${when}` : base
}

// The lecturer's own most recent session, used to prefill the form.
export function lastOwnSession(sessions, userId) {
  return (sessions || []).find((s) => s.createdById === userId) || null
}

const codeKey = (c) => normalizeCourseCode(c).replace(/\s/g, '')

export function findDuplicate(sessions, { courseCode, semester, academicSession, examinationType }) {
  if (!courseCode) return null
  return (
    (sessions || []).find(
      (s) =>
        codeKey(s.courseCode) === codeKey(courseCode) &&
        (s.semester || '') === semester &&
        (s.academicSession || '') === academicSession &&
        (s.examinationType || 'Examination') === examinationType
    ) || null
  )
}

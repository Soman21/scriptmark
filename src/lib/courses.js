// Same rule as the backend (src/lib/courses.js there): sessions with the
// same course code, academic session and semester are one course.
export const normalizeCode = (code) => (code || '').toUpperCase().replace(/\s+/g, '')
const displayCode = (code) => (code || '').trim().toUpperCase().replace(/\s+/g, ' ')

const TYPE_ORDER = { Test: 0, Assignment: 1, Examination: 2 }

export function courseLink(course) {
  const params = new URLSearchParams()
  if (course.academicSession) params.set('session', course.academicSession)
  if (course.semester) params.set('semester', course.semester)
  const q = params.toString()
  return `/courses/${encodeURIComponent(course.courseCode)}${q ? `?${q}` : ''}`
}

// Splits the sidebar's session list into courses (with their sessions
// nested, Test, Assignment, then Exam) and sessions with no course code.
export function groupForMenu(sessions) {
  const courses = new Map()
  const loose = []
  for (const s of sessions) {
    const code = normalizeCode(s.courseCode)
    if (!code) {
      loose.push(s)
      continue
    }
    const key = [code, s.academicSession || '', s.semester || ''].join('|')
    if (!courses.has(key)) {
      courses.set(key, { key, courseCode: displayCode(s.courseCode), academicSession: s.academicSession || null, semester: s.semester || null, sessions: [] })
    }
    courses.get(key).sessions.push(s)
  }
  for (const c of courses.values()) {
    c.sessions.sort((a, b) => (TYPE_ORDER[a.examinationType || 'Examination'] ?? 2) - (TYPE_ORDER[b.examinationType || 'Examination'] ?? 2))
  }
  return { courses: [...courses.values()], loose }
}

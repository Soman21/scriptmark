import { describe, it, expect } from 'vitest'
import {
  guessSessionStart,
  guessSemester,
  academicSessionFrom,
  twoDigitsFrom,
  normalizeCourseCode,
  buildSessionTitle,
  findDuplicate,
  lastOwnSession,
} from '../lib/sessionForm.js'

describe('new session form helpers', () => {
  it('guesses the academic session from the date', () => {
    expect(guessSessionStart(new Date(2026, 9, 19))).toBe('26')
    expect(guessSessionStart(new Date(2027, 2, 1))).toBe('26')
    expect(guessSemester(new Date(2026, 9, 19))).toBe('First')
    expect(guessSemester(new Date(2027, 4, 1))).toBe('Second')
  })

  it('fills the second year from two typed digits', () => {
    expect(academicSessionFrom('26')).toBe('2026/2027')
    expect(academicSessionFrom('99')).toBe('2099/2100')
    expect(academicSessionFrom('2')).toBe('')
    expect(twoDigitsFrom('2025/2026')).toBe('25')
    expect(twoDigitsFrom('')).toBe('')
  })

  it('builds the title so nobody has to type one', () => {
    expect(normalizeCourseCode('  ece   512 ')).toBe('ECE 512')
    expect(
      buildSessionTitle({ courseCode: 'ece 512', courseTitle: 'Digital Signal Processing', examinationType: 'Examination', semester: 'First', academicSession: '2026/2027' })
    ).toBe('ECE 512 Digital Signal Processing, First Semester 2026/2027')
    expect(buildSessionTitle({ courseCode: 'ECE512', examinationType: 'Test', semester: 'Second', academicSession: '2026/2027' })).toBe(
      'ECE512 Test, Second Semester 2026/2027'
    )
  })

  it('spots the same course already set up for that semester', () => {
    const sessions = [{ id: 's1', courseCode: 'ECE 512', semester: 'First', academicSession: '2026/2027', examinationType: 'Examination', createdById: 'u1' }]
    const form = { courseCode: 'ece512', semester: 'First', academicSession: '2026/2027', examinationType: 'Examination' }
    expect(findDuplicate(sessions, form)?.id).toBe('s1')
    expect(findDuplicate(sessions, { ...form, semester: 'Second' })).toBeNull()
    expect(lastOwnSession(sessions, 'u1')?.id).toBe('s1')
    expect(lastOwnSession(sessions, 'u2')).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { reportToText, reportToWordHtml } from '../lib/reportText.js'

const report = {
  facts: {
    title: 'ECE 301 Signals',
    examinationType: 'Exam',
    semester: 'First',
    academicSession: '2025/2026',
    scripts: 3,
    scored: 3,
    average: 21.3,
    highest: 30,
    distribution: [{ range: '0-20', value: 1 }],
    perQuestion: [{ question: 'Q2', maxMarks: 20, averagePercent: 35, responses: 3 }],
    hardest: ['Q2'],
    easiest: ['Q2'],
    marking: { humanConfirmed: 9, autoAccepted: 3, exactAgreement: 67, withinOneMark: null, changedAfterConfirm: 1 },
  },
  overview: 'The class found the derivation hard.',
  questions: [{ question: 'Q2', comment: 'Most missed the <boundary> condition.' }],
  recommendations: ['Revise limits'],
}

describe('examiner report text', () => {
  it('plain text carries the numbers, comments and recommendations', () => {
    const text = reportToText(report)
    expect(text).toContain("Examiner's report: ECE 301 Signals")
    expect(text).toContain('Q2 (20 marks): average 35 percent over 3 answers. Most missed the <boundary> condition.')
    expect(text).toContain('AI score within one mark: Not enough data')
    expect(text).toContain('• Revise limits')
    expect(text).not.toMatch(/\n\n\n/)
  })

  it('the Word version escapes text and uses outlined tables', () => {
    const html = reportToWordHtml(report)
    expect(html).toContain('&lt;boundary&gt;')
    expect(html).toContain('border:1px solid #999')
    expect(html).not.toContain('background')
  })
})

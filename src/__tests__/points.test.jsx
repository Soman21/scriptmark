import { render, screen, fireEvent } from '@testing-library/react'
import PointRows, { DrawingNote } from '../components/PointRows.jsx'
import { sumMarks, warningText, startingPointScores, missingAnswers, totalText, countBestFrom, bestTotal, countedPoints, pointsTotalText } from '../lib/points.js'

const answer = {
  stepBreakdown: [
    { description: 'Analog Signals', marks: 1.25, awarded: 1.25, result: 'full', reasoning: 'Continuous, noise.' },
    { description: 'Digital Signals', marks: 1.25, awarded: 0.5, result: 'partial', reasoning: 'Binary only.', confirmed: 0.75 },
  ],
}

test('helpers', () => {
  expect(sumMarks([{ marks: 1.25 }, { marks: '1.25' }, { marks: 0.1 }])).toBe(2.6)
  expect(warningText({ label: 'Q3ii', kind: 'POINTS', expected: 5, actual: 1.5 })).toBe('Q3 ii: points total 1.5 / 5 marks')
  expect(warningText({ label: 'Q4', kind: 'PARTS', expected: 20, actual: 21 })).toBe('Q4: parts total 21 / 20 marks')
  expect(totalText(3, 3)).toBe('3 / 3 marks')
  expect(totalText(1.25 + 1.25, '2.5')).toBe('2.5 / 2.5 marks')
  expect(warningText({ label: 'Q4', kind: 'PARTS', expected: 20, actual: 18 })).toBe('Q4: parts total 18 / 20 marks')
  expect(startingPointScores(answer)).toEqual([1.25, 0.75])
})

test('point rows show AI and lecturer marks and report edits', () => {
  const changes = []
  render(<PointRows answer={answer} label="Q1i" values={[1.25, 0.75]} onChange={(i, v) => changes.push([i, v])} />)
  expect(screen.getByText('Full')).toBeTruthy()
  expect(screen.getByText('Partial')).toBeTruthy()
  expect(screen.getByText('1.75')).toBeTruthy() // AI total
  expect(screen.getByText('2')).toBeTruthy() // lecturer total
  fireEvent.change(screen.getByLabelText('Q1i point 2 mark'), { target: { value: '1' } })
  expect(changes).toEqual([[1, '1']])
})

test('no rows without points; drawing note marks missing labels', () => {
  const { container } = render(<PointRows answer={{}} label="x" values={[]} onChange={() => {}} />)
  expect(container.innerHTML).toBe('')
  render(<DrawingNote description="No labels. Five boxes in a row." />)
  expect(screen.getByText('No labels.')).toBeTruthy()
})

describe('missingAnswers', () => {
  const part = (text, extra = {}) => ({ text, modelAnswer: '', steps: [], subLabel: null, ...extra })
  const groups = [
    { number: '1', parts: [part('Define terms', { subLabel: 'a' }), part('Components', { subLabel: 'b' }), part('Characteristics', { subLabel: 'c' })] },
    { number: '2', parts: [part('OSI vs TCP/IP'), part('Seven layers')] },
    { number: '3', parts: [part('Explain FDM', { modelAnswer: 'typed already' })] },
  ]

  it('names every part the guide did not answer', () => {
    const incoming = [
      { number: '1', subLabel: 'a', modelAnswer: 'x' },
      { number: '1', subLabel: 'b', modelAnswer: '', steps: [{ description: 'p', marks: 1 }] },
    ]
    expect(missingAnswers(groups, incoming)).toEqual({ total: 6, missing: ['1c', '2a', '2b'] })
  })

  it('ignores an empty editor', () => {
    expect(missingAnswers([{ number: '', parts: [part('')] }], [])).toEqual({ total: 0, missing: [] })
  })
})

describe('DrawingNote with a table', () => {
  it('names what was seen', () => {
    const { rerender } = render(<DrawingNote description={'Table written by the student (copied cell by cell):\n| | LAN |\n| Cost | Low |'} />)
    expect(screen.getByText('Table')).toBeTruthy()
    rerender(<DrawingNote description={'Star topology.\n\nTable written by the student (copied cell by cell):\n| a | b |'} />)
    expect(screen.getByText('Drawing and table')).toBeTruthy()
    rerender(<DrawingNote description="Five boxes in a row." />)
    expect(screen.getByText('Drawing')).toBeTruthy()
  })
})

// "State and explain any five characteristics": 7 points listed, best 5 count.
const seven = Array.from({ length: 7 }, (_, i) => ({ description: `c${i + 1}`, marks: 1 }))

test('count best helpers', () => {
  expect(countBestFrom('State and explain any five characteristics of effective data communication.', 7)).toBe(5)
  expect(countBestFrom('Draw any three topologies', 3)).toBe(null)
  expect(countBestFrom('State five characteristics', 7)).toBe(null)
  expect(bestTotal([1, 1, 0, 1, 1, 1, 1], 5)).toBe(5)
  expect(bestTotal([1, 1, 1], '')).toBe(3)
  expect(countedPoints([1, 1, 0, 1, 1, 1, 1], 5)).toEqual([0, 1, 3, 4, 5])
  expect(pointsTotalText(seven, 5, 5)).toBe('5 / 5 marks (best 5 of 7)')
  expect(pointsTotalText(seven, 5, '')).toBe('7 / 5 marks')
})

test('point rows grey out points that do not count', () => {
  const any5 = {
    question: { countBest: 5 },
    stepBreakdown: [1, 1, 0, 1, 1, 1, 1].map((awarded, i) => ({ description: `c${i + 1}`, marks: 1, awarded, result: awarded ? 'full' : 'none' })),
  }
  render(<PointRows answer={any5} label="Q1b" values={[1, 1, 0, 1, 1, 1, 1]} onChange={() => {}} />)
  expect(screen.getAllByText('Not counted')).toHaveLength(2)
  expect(screen.getByText('(best 5 of 7)')).toBeTruthy()
  expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(2)
})

test('guide totals: live checks, answer rule and what a student can score', async () => {
  const { checkGuideTotals, studentMax, cleanAnswerRule } = await import('../lib/points.js')
  const qs = [
    { number: '1', subLabel: 'c', maxMarks: 4.38, questionTotal: 17.5, steps: [{ marks: 2 }, { marks: 2 }] },
    { number: '1', subLabel: 'd', maxMarks: 13.12, questionTotal: 17.5, steps: [] },
    { number: '2', maxMarks: 20 }, { number: '3', maxMarks: 15 },
  ]
  expect(checkGuideTotals(qs)).toEqual([{ label: 'Q1c', kind: 'POINTS', expected: 4.38, actual: 4 }])
  expect(cleanAnswerRule({ compulsory: '1, 2', any: '3' })).toEqual({ compulsory: ['1', '2'], any: 3 })
  expect(cleanAnswerRule({ compulsory: '1', any: '' })).toBe(null)
  expect(studentMax(qs, { compulsory: ['1'], any: 1 })).toBe(37.5)
  expect(studentMax(qs, null)).toBe(52.5)
})

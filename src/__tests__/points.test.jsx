import { render, screen, fireEvent } from '@testing-library/react'
import PointRows, { DrawingNote } from '../components/PointRows.jsx'
import { sumMarks, warningText, startingPointScores, missingAnswers } from '../lib/points.js'

const answer = {
  stepBreakdown: [
    { description: 'Analog Signals', marks: 1.25, awarded: 1.25, result: 'full', reasoning: 'Continuous, noise.' },
    { description: 'Digital Signals', marks: 1.25, awarded: 0.5, result: 'partial', reasoning: 'Binary only.', confirmed: 0.75 },
  ],
}

test('helpers', () => {
  expect(sumMarks([{ marks: 1.25 }, { marks: '1.25' }, { marks: 0.1 }])).toBe(2.6)
  expect(warningText({ label: 'Q3ii', kind: 'POINTS', expected: 5, actual: 1.5 })).toBe('Q3 ii: points 1.5 of 5')
  expect(warningText({ label: 'Q4', kind: 'PARTS', expected: 20, actual: 18 })).toBe('Q4: parts 18 of 20')
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

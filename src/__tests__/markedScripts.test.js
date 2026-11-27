import { describe, it, expect } from 'vitest'
import { composeInk, inkItemsToShapes, movesFrom, remarkConflict, pathOf } from '../lib/markInk.js'
import { groupsOf, courseCode } from '../components/MarkedDownloads.jsx'

const pages = [{ pageNumber: 1, aspect: 1.4 }, { pageNumber: 2, aspect: 1.4 }]
const answer = (over) => ({ id: 'a1', number: '1', subLabel: 'a', score: 4, max: 5, remark: 'Good', answered: true, counted: true, ...over })

describe('remarkConflict', () => {
  it('flags a full score with a remark that says something is missing', () => {
    expect(remarkConflict(5, 5, 'Diagram missing labels')).toBe(true)
  })
  it('flags a zero with praise', () => {
    expect(remarkConflict(0, 5, 'Correct and complete')).toBe(true)
  })
  it('does not flag words like incorrect on a zero', () => {
    expect(remarkConflict(0, 5, 'Incorrect formula')).toBe(false)
  })
  it('ignores an empty remark', () => {
    expect(remarkConflict(5, 5, '')).toBe(false)
  })
})

describe('composeInk', () => {
  it('draws a tick, circle, score and remark at the anchor, scaled by the page shape', () => {
    const { pages: out, unplaced } = composeInk({ pages, anchors: { a1: { page: 2, x: 0.9, y: 0.5 } }, answers: [answer()] })
    expect(unplaced).toEqual([])
    const kinds = out[2].map((s) => s.t)
    expect(kinds).toContain('tick')
    expect(kinds).toContain('loop')
    const texts = out[2].filter((s) => s.t === 'text').map((s) => s.text)
    expect(texts).toEqual(expect.arrayContaining(['4', '5', 'Good']))
    expect(out[2].find((s) => s.t === 'loop').y).toBeCloseTo(0.7)
  })
  it('uses a cross for zero and adds NC when not counted', () => {
    const { pages: out } = composeInk({ pages, anchors: { a1: { page: 2, x: 0.9, y: 0.5 } }, answers: [answer({ score: 0, counted: false, remark: '' })] })
    expect(out[2].some((s) => s.t === 'cross')).toBe(true)
    expect(out[2].some((s) => s.text === 'NC')).toBe(true)
  })
  it('a dragged mark wins over the anchor', () => {
    const { pages: out } = composeInk({ pages, anchors: { a1: { page: 2, x: 0.9, y: 0.5 } }, moves: { a1: { page: 1, x: 0.8, y: 0.2 } }, answers: [answer()] })
    expect(out[2].length).toBe(0)
    expect(out[1].some((s) => s.answerId === 'a1')).toBe(true)
  })
  it('lists marks it cannot place and skips unanswered parts', () => {
    const { unplaced, pages: out } = composeInk({ pages, answers: [answer(), answer({ id: 'a2', answered: false })] })
    expect(unplaced).toEqual(['a1'])
    // The cover still gets the circled total when the booklet is unknown.
    expect(out[1].some((s) => s.t === 'loop' && s.seed === 'total')).toBe(true)
  })
  it('redraws the same wobble every time', () => {
    const shape = { t: 'loop', x: 0.5, y: 0.5, rx: 0.04, ry: 0.03, seed: 'a1' }
    expect(pathOf(shape)).toEqual(pathOf(shape))
  })
})

describe('lecturer ink', () => {
  it('turns items into shapes and finds moved marks', () => {
    const shapes = inkItemsToShapes([{ k: 'pen', pts: [[0.1, 0.1], [0.2, 0.2]] }, { k: 'text', x: 0.3, y: 0.5, t: 'See me' }], 2)
    expect(shapes[0].pts[1]).toEqual([0.2, 0.4])
    expect(shapes[1].text).toBe('See me')
    expect(movesFrom({ 3: [{ k: 'move', a: 'x', x: 0.5, y: 0.6 }] })).toEqual({ x: { page: 3, x: 0.5, y: 0.6 } })
  })
})

describe('Marked Scripts download', () => {
  it('splits a class into files of ten', () => {
    const ids = Array.from({ length: 23 }, (_, i) => i)
    expect(groupsOf(ids, 10).map((g) => g.length)).toEqual([10, 10, 3])
  })
  it('names files after the course', () => {
    expect(courseCode('ECE 542, Database Systems')).toBe('ECE542')
  })
})

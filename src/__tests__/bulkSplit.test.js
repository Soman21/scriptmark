import { describe, it, expect } from 'vitest'
import { oddGroups, resolveCover } from '../components/BulkUploadPanel.jsx'

const g = (...sizes) => sizes.map((n) => ({ pages: Array.from({ length: n }, (_, i) => ({ imageUrl: `p${i}` })) }))

describe('scripts worth a second look after auto split', () => {
  it('flags a script twice as long or half as short as usual', () => {
    expect([...oddGroups(g(3, 3, 7, 3, 1, 4))]).toEqual([2, 4])
  })
  it('stays quiet when lengths are close or there are too few scripts', () => {
    expect(oddGroups(g(3, 4, 3, 2)).size).toBe(0)
    expect(oddGroups(g(1, 9)).size).toBe(0)
  })
})

describe('answering a Cover? flag', () => {
  const pg = (id, unsure = false) => ({ imageUrl: id, unsure })
  it('starts a new script at a flagged page inside a script', () => {
    const out = resolveCover([{ studentName: 'A', pages: [pg('a'), pg('b'), pg('c', true), pg('d')] }], 0, 2)
    expect(out.map((x) => x.pages.map((p) => p.imageUrl))).toEqual([['a', 'b'], ['c', 'd']])
    expect(out[1].pages[0].unsure).toBe(false)
  })
  it('joins a flagged first page to the script before it', () => {
    const out = resolveCover([{ pages: [pg('a'), pg('b')] }, { pages: [pg('c', true), pg('d')] }], 1, 0)
    expect(out.map((x) => x.pages.map((p) => p.imageUrl))).toEqual([['a', 'b', 'c', 'd']])
    expect(out[0].pages[2].unsure).toBe(false)
  })
})

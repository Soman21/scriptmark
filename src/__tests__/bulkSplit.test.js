import { describe, it, expect } from 'vitest'
import { oddGroups, resolveCover, addPdfs } from '../components/BulkUploadPanel.jsx'

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

describe('addPdfs', () => {
  const pdf = (name, size = 1000) => ({ name, size, type: 'application/pdf' })

  it('adds a second pick to the first instead of replacing it', () => {
    const first = addPdfs([], [pdf('a.pdf'), pdf('b.pdf')])
    const second = addPdfs(first.files, [pdf('c.pdf')])
    expect(second.files.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf', 'c.pdf'])
  })

  it('keeps the same file once', () => {
    const r = addPdfs([pdf('a.pdf')], [pdf('a.pdf'), pdf('a.pdf', 2000)])
    expect(r.files.map((f) => `${f.name}:${f.size}`)).toEqual(['a.pdf:1000', 'a.pdf:2000'])
  })

  it('skips files that are not PDFs or are over the limit', () => {
    const r = addPdfs([], [{ name: 'x.jpg', size: 10, type: 'image/jpeg' }, pdf('big.pdf', 61 * 1024 * 1024), pdf('ok.pdf')])
    expect(r.files.map((f) => f.name)).toEqual(['ok.pdf'])
    expect(r.notPdf).toEqual(['x.jpg'])
    expect(r.tooBig).toEqual(['big.pdf'])
  })
})

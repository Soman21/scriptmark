import { describe, it, expect } from 'vitest'
import { oddGroups } from '../components/BulkUploadPanel.jsx'

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

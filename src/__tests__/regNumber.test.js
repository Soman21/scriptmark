import { describe, it, expect } from 'vitest'
import { regNumberNeedsCheck } from '../lib/regNumber.js'

const now = new Date('2026-11-11')

describe('reg number check', () => {
  it('passes normal UNIZIK reg numbers', () => {
    expect(regNumberNeedsCheck('2021364030', now)).toBe(false)
    expect(regNumberNeedsCheck('2021/245678', now)).toBe(false)
    expect(regNumberNeedsCheck('2025366001FN', now)).toBe(false)
  })
  it('flags a missing number, an odd shape, or a year no student could have', () => {
    expect(regNumberNeedsCheck('', now)).toBe(true)
    expect(regNumberNeedsCheck('25/B1/89487', now)).toBe(true)
    expect(regNumberNeedsCheck('2001364080', now)).toBe(true)
    expect(regNumberNeedsCheck('2031364080', now)).toBe(true)
  })
})

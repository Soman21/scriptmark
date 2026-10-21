import { describe, it, expect } from 'vitest'
import { claimShortcuts, queueShortcuts, resultsShortcuts } from '../lib/chatShortcuts.js'

const q = (number, subLabel, assignedMarkerId = null) => ({ number, subLabel, assignedMarkerId })

describe('chat shortcuts', () => {
  it('offers to claim each question number that still has a free part', () => {
    const chips = claimShortcuts([q('1', 'a'), q('1', 'b', 'other'), q('2', null), q('3', null, 'me')], 'me', false)
    expect(chips).toEqual(['Claim question 1', 'Claim question 2', 'Claim everything that is free', 'Release question 3', 'Which questions are still free?'])
  })

  it('only offers the coordinator a look at who has what', () => {
    const qs = [q('1', null, 'other')]
    expect(claimShortcuts(qs, 'me', true)).toContain('Who has claimed what?')
    expect(claimShortcuts(qs, 'me', false)).not.toContain('Who has claimed what?')
  })

  it('queue chips follow what is left to confirm', () => {
    expect(queueShortcuts([{ confidence: 'high', confirmedAt: null }])).toEqual(['Confirm all the high confidence answers', 'Confirm everything as the AI suggested', 'How many are left?'])
    expect(queueShortcuts([{ confidence: 'high', confirmedAt: '2026' }])).toEqual(['Is everything confirmed?'])
  })

  it('results chips appear only when they apply', () => {
    const chips = resultsShortcuts([{ hasLowConfidenceScore: true, answers: [{ confirmedAt: null }], duplicateOf: [] }])
    expect(chips).toContain('Open a script with low confidence answers')
    expect(chips).not.toContain('Which students were scanned twice?')
  })
})

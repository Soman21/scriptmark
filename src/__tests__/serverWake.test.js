import { describe, it, expect, beforeEach } from 'vitest'
import { wakeServer, getServerState, resetServerState } from '../lib/serverWake.js'

function clock() {
  let t = 0
  return { now: () => t, wait: async (ms) => { t += ms } }
}

describe('wakeServer', () => {
  beforeEach(() => resetServerState())

  it('is ready at once when the server answers', async () => {
    const c = clock()
    expect(await wakeServer({ fetchFn: async () => ({ ok: true }), ...c })).toBe('ready')
    expect(getServerState().status).toBe('ready')
  })

  it('keeps retrying while the server starts up', async () => {
    const c = clock()
    let calls = 0
    const fetchFn = async () => { calls += 1; if (calls < 4) throw new Error('asleep'); return { ok: true } }
    expect(await wakeServer({ fetchFn, ...c })).toBe('ready')
    expect(calls).toBe(4)
  })

  it('gives up after two minutes so the page can offer a retry', async () => {
    const c = clock()
    expect(await wakeServer({ fetchFn: async () => ({ ok: false }), ...c })).toBe('down')
    expect(getServerState().status).toBe('down')
  })

  it('does not start a second attempt once ready', async () => {
    const c = clock()
    await wakeServer({ fetchFn: async () => ({ ok: true }), ...c })
    let called = false
    await wakeServer({ fetchFn: async () => { called = true; return { ok: true } }, ...c })
    expect(called).toBe(false)
  })
})

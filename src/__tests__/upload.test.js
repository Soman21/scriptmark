import { describe, it, expect } from 'vitest'
import { readJson } from '../lib/upload'

describe('readJson', () => {
  it('reads a normal JSON reply', async () => {
    const res = new Response(JSON.stringify({ error: 'File is larger than 50 MB.' }), { status: 413 })
    expect(await readJson(res)).toEqual({ error: 'File is larger than 50 MB.' })
  })

  it('gives a readable error when the server sends an HTML page', async () => {
    const res = new Response('<html>Bad Gateway</html>', { status: 502 })
    expect((await readJson(res)).error).toBe('Server error (502). Try again in a minute.')
  })

  it('names a size problem when a proxy refuses a large file', async () => {
    const res = new Response('<html>Too large</html>', { status: 413 })
    expect((await readJson(res)).error).toBe('File is too large.')
  })
})

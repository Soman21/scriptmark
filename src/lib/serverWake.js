import { BASE_URL } from './api.js'

// The free backend host puts the server to sleep after a quiet spell and
// takes up to a minute to start again. The app pings the health check as soon
// as it loads, so the server is usually awake by the time anyone signs in,
// and pages can show a loader instead of failing while it starts.

const RETRY_MS = 3000
const GIVE_UP_MS = 120000
const ATTEMPT_TIMEOUT_MS = 8000

let state = { status: 'idle', startedAt: null }
const listeners = new Set()

function set(next) {
  state = { ...state, ...next }
  listeners.forEach((fn) => fn(state))
}

export function getServerState() {
  return state
}

export function subscribeServer(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function ping(fetchFn) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller && setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS)
  try {
    const res = await fetchFn(`${BASE_URL}/api/health`, { signal: controller?.signal })
    return res.ok
  } catch {
    return false
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// Starts waking the server once; later calls reuse the same attempt.
export async function wakeServer({ fetchFn = fetch, wait = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now } = {}) {
  if (state.status === 'waking' || state.status === 'ready') return state.status
  set({ status: 'waking', startedAt: now() })
  while (now() - state.startedAt < GIVE_UP_MS) {
    if (await ping(fetchFn)) {
      set({ status: 'ready' })
      return 'ready'
    }
    await wait(RETRY_MS)
  }
  set({ status: 'down' })
  return 'down'
}

export function resetServerState() {
  state = { status: 'idle', startedAt: null }
}

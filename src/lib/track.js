import { BASE_URL } from './api.js'

// The app's own visitor counter. Each browser gets a random id (no name,
// no email); page views and clicks are queued and sent in small batches,
// so tracking never slows a page down. Nothing here ever shows an error.

const KEY = 'scriptmark_visitor'
let queue = []
let timer = null

function visitorId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'v-anonymous-visitor'
  }
}

function device() {
  const w = window.innerWidth
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
}

export function flush() {
  if (!queue.length) return
  const events = queue
  queue = []
  clearTimeout(timer)
  timer = null
  let token = null
  try {
    token = localStorage.getItem('scriptmark_token')
  } catch {}
  // keepalive lets the request finish even when the tab is closing.
  fetch(`${BASE_URL}/api/track`, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ visitorId: visitorId(), events }),
  }).catch(() => {})
}

function push(event) {
  queue.push({ ...event, device: device() })
  if (queue.length >= 20) flush()
  else if (!timer) timer = setTimeout(flush, 5000)
}

let sentReferrer = false
export function trackPage(path = '/') {
  if (path.startsWith('/admin')) return
  const referrer = !sentReferrer && document.referrer ? document.referrer : undefined
  sentReferrer = true
  push({ type: 'PAGE_VIEW', path, referrer })
}

// Records clicks on buttons, links, tabs and menu items, by their visible
// name. Anything inside data-track-ignore is skipped, and the server drops
// any label with a number in it (reg numbers).
export function startClickTracking() {
  function onClick(e) {
    const el = e.target.closest?.('button, a, [role="tab"], [role="menuitem"]')
    if (!el || el.closest('[data-track-ignore]')) return
    const label = el.getAttribute('data-track') || el.getAttribute('aria-label') || el.textContent
    const path = window.location?.pathname || '/'
    if (!label?.trim() || path.startsWith('/admin')) return
    push({ type: 'CLICK', path, label: label.trim().slice(0, 60) })
  }
  function onHide() {
    if (document.visibilityState === 'hidden') flush()
  }
  document.addEventListener('click', onClick, true)
  document.addEventListener('visibilitychange', onHide)
  return () => {
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('visibilitychange', onHide)
  }
}

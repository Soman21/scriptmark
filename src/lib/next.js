// Where to go after signing in. Only paths inside the app are allowed, so a
// crafted ?next= link cannot send someone to another site.
export function safeNext(search) {
  const next = new URLSearchParams(search).get('next') || ''
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export const withNext = (path, search) => {
  const next = new URLSearchParams(search).get('next')
  return next ? `${path}?next=${encodeURIComponent(next)}` : path
}

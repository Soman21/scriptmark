const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Downloads a session's result sheet. Throws with the backend's actual error
// message on failure (e.g. the 409 roster-conflict block), so callers can
// surface it directly rather than a generic "could not export" string.
export async function downloadSessionExport(sessionId, format, sessionTitle, token) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/export?format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const isJson = res.headers.get('content-type')?.includes('application/json')
    const data = isJson ? await res.json() : null
    throw new Error(data?.error || 'Could not generate the export.')
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ext = format === 'pdf' ? 'pdf' : 'xlsx'
  a.download = `${(sessionTitle || 'results').replace(/[^a-z0-9]/gi, '_')}_results.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Downloads a session's result sheet. Throws with the backend's actual error
// message on failure (e.g. the 409 roster-conflict block), so callers can
// surface it directly rather than a generic "could not export" string.
export async function downloadSessionExport(sessionId, format, sessionTitle, token, scores = 'total') {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/export?format=${format}&scores=${scores}`, {
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

// Downloads the raw AI vs lecturer score pairs behind the AI Agreement
// panel, one row per answer, for the thesis analysis in Excel or SPSS.
export async function downloadEvaluationCsv(sessionId, sessionTitle, token) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/evaluation?format=csv`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not download the evaluation data.')
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(sessionTitle || 'session').replace(/[^a-z0-9]/gi, '_')}_evaluation.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

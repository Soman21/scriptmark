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

// Downloads a course's combined result sheet (Test, Assignment and Exam).
export async function downloadCourseExport(query, courseCode, token) {
  const res = await fetch(`${API_BASE}/api/courses/export?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not generate the export.')
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(courseCode || 'course').replace(/[^a-z0-9]/gi, '_')}_result_sheet.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

function saveBlob(blob, name) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

async function blobOrError(res, fallback) {
  if (res.ok) return res.blob()
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : null
  throw new Error(data?.error || fallback)
}

function fileNameFrom(res, fallback) {
  const m = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')
  return m ? m[1] : fallback
}

// One student's marked script as a PDF, drawn by the server from the
// confirmed scores.
export async function downloadMarkedScript(scriptId, token) {
  const res = await fetch(`${API_BASE}/api/marked/scripts/${scriptId}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
  saveBlob(await blobOrError(res, 'Could not make the marked script.'), fileNameFrom(res, 'Marked Script.pdf'))
}

// Opens the marked script in a hidden frame and shows the print window.
export async function printMarkedScript(scriptId, token) {
  const res = await fetch(`${API_BASE}/api/marked/scripts/${scriptId}/pdf?inline=1`, { headers: { Authorization: `Bearer ${token}` } })
  const blob = await blobOrError(res, 'Could not make the marked script.')
  const url = window.URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  frame.src = url
  frame.onload = () => {
    try {
      frame.contentWindow.focus()
      frame.contentWindow.print()
    } catch {
      window.open(url, '_blank')
    }
  }
  document.body.appendChild(frame)
  // Left long enough for the print window to use it.
  setTimeout(() => {
    frame.remove()
    window.URL.revokeObjectURL(url)
  }, 10 * 60 * 1000)
}

// One group of marked scripts: a zip of PDFs, or one PDF for printing.
export async function downloadMarkedGroup(sessionId, scriptIds, format, fileName, token, signal) {
  const res = await fetch(`${API_BASE}/api/marked/sessions/${sessionId}/download`, {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ scriptIds, format }),
  })
  saveBlob(await blobOrError(res, 'Could not make the download.'), fileName)
}

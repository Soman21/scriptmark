// Upload size limits, matching the server. Checking in the browser first
// means a lecturer is told straight away, before a long upload.
export const MB = 1024 * 1024
export const SPLIT_PDF_LIMIT_MB = 50
export const BATCH_FILE_LIMIT_MB = 25

// Reads a JSON reply. When the server is down or restarting, the reply is an
// HTML error page, and res.json() fails with "Unexpected token <". This
// returns an object with a readable error instead.
export async function readJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    if (res.status === 413) return { error: 'File is too large.' }
    return { error: res.ok ? 'Unexpected reply from server.' : `Server error (${res.status}). Try again in a minute.` }
  }
}

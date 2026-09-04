const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : null

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),

  getGuides: (token) => request('/api/guides', { token }),
  getGuide: (id, token) => request(`/api/guides/${id}`, { token }),
  createGuide: (payload, token) => request('/api/guides', { method: 'POST', body: payload, token }),
  updateGuide: (id, payload, token) => request(`/api/guides/${id}`, { method: 'PUT', body: payload, token }),

  getSessions: (token) => request('/api/sessions', { token }),
  getSession: (id, token) => request(`/api/sessions/${id}`, { token }),
  createSession: (payload, token) => request('/api/sessions', { method: 'POST', body: payload, token }),
  updateSession: (id, payload, token) => request(`/api/sessions/${id}`, { method: 'PUT', body: payload, token }),
  getSessionScripts: (sessionId, token) => request(`/api/sessions/${sessionId}/scripts`, { token }),
  getScript: (scriptId, token) => request(`/api/sessions/scripts/${scriptId}`, { token }),
  updateCaScore: (scriptId, caScore, token) =>
    request(`/api/sessions/scripts/${scriptId}/caScore`, { method: 'PUT', body: { caScore }, token }),
  updateStudentInfo: (scriptId, payload, token) =>
    request(`/api/sessions/scripts/${scriptId}/studentInfo`, { method: 'PUT', body: payload, token }),

  confirmScore: (answerId, payload, token) =>
    request(`/api/results/${answerId}/confirm`, { method: 'PUT', body: payload, token }),
  scoreScript: (scriptId, guideId, token) =>
    request(`/api/results/scripts/${scriptId}/score`, { method: 'POST', body: { guideId }, token }),

  chatWithAssistant: (messages, token) =>
    request('/api/assistant/chat', { method: 'POST', body: { messages }, token }),
}

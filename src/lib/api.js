export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

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
    // A signed in request rejected as unauthorised means the saved sign in
    // has expired or was revoked; AuthContext signs out and shows the login.
    if (res.status === 401 && token) window.dispatchEvent(new Event('scriptmark:signed-out'))
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  verifyOtp: (payload) => request('/api/auth/verifyOtp', { method: 'POST', body: payload }),
  forgotPassword: (email) => request('/api/auth/forgotPassword', { method: 'POST', body: { email } }),
  resetPassword: (payload) => request('/api/auth/resetPassword', { method: 'POST', body: payload }),
  updateProfile: (payload, token) => request('/api/auth/me', { method: 'PUT', body: payload, token }),
  changePassword: (payload, token) => request('/api/auth/password', { method: 'PUT', body: payload, token }),

  getGuides: (token) => request('/api/guides', { token }),
  getGuide: (id, token) => request(`/api/guides/${id}`, { token }),
  createGuide: (payload, token) => request('/api/guides', { method: 'POST', body: payload, token }),
  updateGuide: (id, payload, token) => request(`/api/guides/${id}`, { method: 'PUT', body: payload, token }),
  generateGuideAnswers: (questions, token) =>
    request('/api/guides/generateAnswers', { method: 'POST', body: { questions }, token }),

  getSessions: (token) => request('/api/sessions', { token }),
  getSession: (id, token) => request(`/api/sessions/${id}`, { token }),
  createSession: (payload, token) => request('/api/sessions', { method: 'POST', body: payload, token }),
  getLecturers: (token) => request('/api/sessions/lecturers', { token }),
  getSessionMarkers: (sessionId, token) => request(`/api/sessions/${sessionId}/markers`, { token }),
  updateSessionMarkers: (sessionId, markerUserIds, token) =>
    request(`/api/sessions/${sessionId}/markers`, { method: 'PUT', body: { markerUserIds }, token }),
  joinSession: (code, token) => request('/api/sessions/join', { method: 'POST', body: { code }, token }),
  getBrowsableSessions: (token) => request('/api/sessions/browsable', { token }),
  requestAccess: (sessionId, token) => request(`/api/sessions/${sessionId}/requestAccess`, { method: 'POST', token }),
  getPendingRequests: (sessionId, token) => request(`/api/sessions/${sessionId}/pendingRequests`, { token }),
  approveMarker: (sessionId, userId, token) =>
    request(`/api/sessions/${sessionId}/markers/${userId}/approve`, { method: 'PUT', token }),
  denyMarker: (sessionId, userId, token) =>
    request(`/api/sessions/${sessionId}/markers/${userId}/deny`, { method: 'PUT', token }),
  updateAccessLevel: (sessionId, userId, accessLevel, token) =>
    request(`/api/sessions/${sessionId}/markers/${userId}/accessLevel`, { method: 'PUT', body: { accessLevel }, token }),
  revokeMarker: (sessionId, userId, token) =>
    request(`/api/sessions/${sessionId}/markers/${userId}`, { method: 'DELETE', token }),
  inviteByEmail: (sessionId, email, token) =>
    request(`/api/sessions/${sessionId}/inviteByEmail`, { method: 'POST', body: { email }, token }),
  getClaimStatus: (guideId, token) => request(`/api/guides/${guideId}/claimStatus`, { token }),
  claimQuestion: (guideId, questionId, token, targetUserId) =>
    request(`/api/guides/${guideId}/questions/${questionId}/claim`, {
      method: 'PUT',
      body: targetUserId === undefined ? {} : { targetUserId },
      token,
    }),
  getMyQueue: (sessionId, token) => request(`/api/results/myQueue?sessionId=${sessionId}`, { token }),
  getCoordinatorOverview: (sessionId, token) => request(`/api/sessions/${sessionId}/coordinatorOverview`, { token }),
  getSessionOverview: (sessionId, token) => request(`/api/sessions/${sessionId}/overview`, { token }),
  getNotifications: (token) => request('/api/notifications', { token }),
  markNotificationsRead: (token) => request('/api/notifications/read', { method: 'POST', token }),
  updateSession: (id, payload, token) => request(`/api/sessions/${id}`, { method: 'PUT', body: payload, token }),
  getSessionScripts: (sessionId, token) => request(`/api/sessions/${sessionId}/scripts`, { token }),
  getScript: (scriptId, token) => request(`/api/sessions/scripts/${scriptId}`, { token }),
  getMe: (token) => request('/api/auth/me', { token }),
  getAdminOverview: (token) => request('/api/admin/overview', { token }),
  getSiteAnalytics: (days, token) => request(`/api/admin/analytics?days=${days}`, { token }),
  getAdmins: (token) => request('/api/admin/admins', { token }),
  addAdmin: (email, token) => request('/api/admin/admins', { method: 'POST', body: { email }, token }),
  removeAdmin: (userId, token) => request(`/api/admin/admins/${userId}`, { method: 'DELETE', token }),
  getCourses: (token) => request('/api/courses', { token }),
  getCourseResults: (query, token) => request(`/api/courses/results?${query}`, { token }),
  saveCourseWeights: (body, token) => request('/api/courses/weights', { method: 'PUT', body, token }),
  updateCaScore: (scriptId, caScore, token) =>
    request(`/api/sessions/scripts/${scriptId}/caScore`, { method: 'PUT', body: { caScore }, token }),
  updateStudentInfo: (scriptId, payload, token) =>
    request(`/api/sessions/scripts/${scriptId}/studentInfo`, { method: 'PUT', body: payload, token }),
  getClassList: (sessionId, token) => request(`/api/sessions/${sessionId}/classList`, { token }),
  resolveClassListEntry: (sessionId, entryId, payload, token) =>
    request(`/api/sessions/${sessionId}/classList/${entryId}`, { method: 'PUT', body: payload, token }),
  bulkConfirm: (sessionId, groups, token) =>
    request(`/api/sessions/${sessionId}/scripts/bulkConfirm`, { method: 'POST', body: { groups }, token }),
  deleteScript: (sessionId, scriptId, token) =>
    request(`/api/sessions/${sessionId}/scripts/${scriptId}`, { method: 'DELETE', token }),
  getAnalytics: (sessionId, token) => request(`/api/sessions/${sessionId}/analytics`, { token }),
  getEvaluation: (sessionId, token) => request(`/api/sessions/${sessionId}/evaluation`, { token }),
  getTranscriptionSample: (sessionId, n, token) => request(`/api/results/transcriptionSample?sessionId=${sessionId}&n=${n}`, { token }),
  saveReferenceText: (answerId, text, token) => request(`/api/results/${answerId}/reference`, { method: 'PUT', body: { text }, token }),
  getCohort: (sessionId, token) => request(`/api/sessions/${sessionId}/cohort`, { token }),
  compareSessions: (token) => request('/api/sessions/cohort/compare', { token }),

  remarkQuestions: (sessionId, questionIds, token) =>
    request(`/api/sessions/${sessionId}/remark`, { method: 'POST', body: { questionIds }, token }),
  startMarking: (sessionId, token) =>
    request(`/api/sessions/${sessionId}/mark`, { method: 'POST', token }),
  getMarkingStatus: (sessionId, token) =>
    request(`/api/sessions/${sessionId}/markingStatus`, { token }),

  confirmScore: (answerId, payload, token) =>
    request(`/api/results/${answerId}/confirm`, { method: 'PUT', body: payload, token }),
  scoreScript: (scriptId, guideId, token) =>
    request(`/api/results/scripts/${scriptId}/score`, { method: 'POST', body: { guideId }, token }),

  reviewWithAssistant: (scriptId, messages, token) =>
    request('/api/assistant/review', { method: 'POST', body: { scriptId, messages }, token }),
  askPageAssistant: (sessionId, page, messages, token) =>
    request('/api/assistant/page', { method: 'POST', body: { sessionId, page, messages }, token }),
  getToday: (token) => request('/api/assistant/today', { token }),
  draftReport: (sessionId, token) => request('/api/assistant/report', { method: 'POST', body: { sessionId }, token }),
  chatWithAssistant: (messages, activeSessionId, token) =>
    request('/api/assistant/chat', { method: 'POST', body: { messages, activeSessionId }, token }),
}
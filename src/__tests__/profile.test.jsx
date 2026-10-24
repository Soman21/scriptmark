import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext.jsx'
import SignUp from '../pages/SignUp.jsx'
import Login from '../pages/Login.jsx'
import AdminPage from '../pages/AdminPage.jsx'
import AdminLecturerPage from '../pages/AdminLecturerPage.jsx'
import ProfilePrompt from '../components/ProfilePrompt.jsx'
import { api } from '../lib/api.js'

const STRUCTURE = {
  institution: { name: 'Nnamdi Azikiwe University', code: 'NAU' },
  faculties: [
    { id: 'f-eng', name: 'Engineering', departments: [{ id: 'd-cpe', name: 'Computer Engineering' }, { id: 'd-ece', name: 'Electronics Engineering' }] },
    { id: 'f-sci', name: 'Physical Sciences', departments: [{ id: 'd-csc', name: 'Computer Science' }] },
  ],
}
const LECTURER = { id: 'u1', name: 'Ann Okeke', email: 'ann@unizik.edu.ng', role: 'LECTURER', lecturerId: 'NAU0007', department: null, faculty: null }

let handlers
let calls
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  handlers = { 'GET /api/auth/structure': () => [200, STRUCTURE], 'POST /api/track': () => [204, null] }
  global.fetch = vi.fn(async (url, opts = {}) => {
    const method = opts.method || 'GET'
    const path = url.replace('http://localhost:4000', '').split('?')[0]
    const body = opts.body ? JSON.parse(opts.body) : null
    calls.push({ method, path, body })
    const h = handlers[`${method} ${path}`]
    const [status, data] = h ? h(body) : [404, { error: `unmocked ${method} ${path}` }]
    return { ok: status < 400, status, headers: { get: () => 'application/json' }, json: async () => data }
  })
})

function signIn(user) {
  localStorage.setItem('scriptmark_token', 'tok')
  localStorage.setItem('scriptmark_user', JSON.stringify(user))
}

const pick = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('Sign up', () => {
  it('asks for faculty, then department, and sends the department', async () => {
    handlers['POST /api/auth/signup'] = (b) => [201, { token: 't', user: { ...LECTURER, department: { id: b.departmentId, name: 'Computer Engineering' } } }]
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AuthProvider>
          <Routes>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/" element={<p>Home</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
    await screen.findByRole('option', { name: 'Engineering' })
    expect(screen.getByLabelText('Department').disabled).toBe(true)
    pick('Faculty', 'f-eng')
    const depts = within(screen.getByLabelText('Department')).getAllByRole('option').map((o) => o.textContent)
    expect(depts).toEqual(['Select department', 'Computer Engineering', 'Electronics Engineering'])
    pick('Department', 'd-cpe')
    fireEvent.change(screen.getByPlaceholderText('Dr. Julian Reed'), { target: { value: 'Ann Okeke' } })
    fireEvent.change(screen.getByPlaceholderText('j.reed@university.edu'), { target: { value: 'ann@unizik.edu.ng' } })
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /Create Account/ }))
    await screen.findByText('Home')
    expect(calls.find((c) => c.path === '/api/auth/signup').body.departmentId).toBe('d-cpe')
  })
})

describe('One time department prompt', () => {
  it('asks a lecturer with no department once, and goes away after saving', async () => {
    signIn(LECTURER)
    handlers['GET /api/auth/me'] = () => [200, { user: LECTURER }]
    handlers['PUT /api/auth/me'] = (b) => [200, { token: 'tok2', user: { ...LECTURER, department: { id: b.departmentId, name: 'Computer Science' }, faculty: { id: 'f-sci', name: 'Physical Sciences' } } }]
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProfilePrompt />
        </AuthProvider>
      </MemoryRouter>
    )
    await screen.findByRole('dialog', { name: 'Your department' })
    pick('Faculty', 'f-sci')
    pick('Department', 'd-csc')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.find((c) => c.method === 'PUT').body).toEqual({ departmentId: 'd-csc' })
    expect(JSON.parse(localStorage.getItem('scriptmark_user')).department.name).toBe('Computer Science')
  })

  it('does not show for a lecturer who already has a department', async () => {
    const done = { ...LECTURER, department: { id: 'd-cpe', name: 'Computer Engineering' } }
    signIn(done)
    handlers['GET /api/auth/me'] = () => [200, { user: done }]
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProfilePrompt />
        </AuthProvider>
      </MemoryRouter>
    )
    await waitFor(() => expect(calls.some((c) => c.path === '/api/auth/me')).toBe(true))
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Suspended account', () => {
  it('is signed out on the next request and told why on the sign in page', async () => {
    signIn(LECTURER)
    handlers['GET /api/auth/me'] = () => [403, { error: 'This account has been suspended. Contact the ScriptMark admin.', code: 'SUSPENDED' }]
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
    await waitFor(() => expect(localStorage.getItem('scriptmark_token')).toBeNull())
    expect(sessionStorage.getItem('scriptmark_suspended')).toBe('1')
  })

  it('shows the message on the sign in page', () => {
    sessionStorage.setItem('scriptmark_suspended', '1')
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByText('This account has been suspended. Contact the ScriptMark admin.')).toBeTruthy()
    expect(sessionStorage.getItem('scriptmark_suspended')).toBeNull()
  })
})

describe('Admin lecturers', () => {
  const ADMIN = { id: 'o', name: 'Soma', email: 'somancreatives@gmail.com', role: 'ADMIN', department: { id: 'd-cpe', name: 'Computer Engineering' } }
  const row = (id, name, faculty, department, suspended = false) => ({
    id, name, email: `${id}@unizik.edu.ng`, lecturerId: `NAU000${id.slice(1)}`, faculty, department, suspended,
    lastActiveAt: null, createdAt: '2026-10-01T00:00:00Z', sessionsCreated: 1, sessionsJoined: 0,
  })
  const overview = {
    totals: { users: 3, sessions: 1, activeSessions: 1, guides: 1, scripts: 1, marked: 1 },
    status: { database: { ok: true, ms: 3 }, uptimeSeconds: 60, services: [] },
    activity: [],
    lecturers: [
      row('u1', 'Ifeoma Eze', 'Engineering', 'Electronics Engineering'),
      row('u2', 'Obinna Nnaji', 'Engineering', 'Computer Engineering', true),
      row('u3', 'Kemi Bello', 'Physical Sciences', 'Computer Science'),
    ],
    sessions: [],
  }

  function renderAt(path) {
    signIn(ADMIN)
    handlers['GET /api/auth/me'] = () => [200, { user: ADMIN }]
    handlers['GET /api/admin/overview'] = () => [200, overview]
    handlers['GET /api/admin/admins'] = () => [200, { admins: [], canChange: true }]
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/lecturers/:id" element={<AdminLecturerPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
  }

  it('shows ID, faculty, department and status, and filters by them', async () => {
    renderAt('/admin')
    fireEvent.click(await screen.findByRole('tab', { name: 'Lecturers' }))
    expect(screen.getByText('NAU0001')).toBeTruthy()
    expect(within(screen.getByRole('table')).getByText('Suspended')).toBeTruthy()
    pick('Faculty', 'Engineering')
    expect(screen.queryByText('Kemi Bello')).toBeNull()
    pick('Department', 'Computer Engineering')
    expect(screen.queryByText('Ifeoma Eze')).toBeNull()
    expect(screen.getByText('Obinna Nnaji')).toBeTruthy()
    pick('Department', '')
    pick('Status', 'active')
    expect(screen.queryByText('Obinna Nnaji')).toBeNull()
    expect(screen.getByText('Ifeoma Eze')).toBeTruthy()
    handlers['GET /api/admin/lecturers/u1'] = () => [200, lecturerPage(false)]
    fireEvent.click(screen.getByText('Ifeoma Eze'))
    await screen.findByText('EEE 501 Exam')
  })

  const lecturerPage = (suspended) => ({
    lecturer: {
      id: 'u1', name: 'Ifeoma Eze', email: 'u1@unizik.edu.ng', lecturerId: 'NAU0001', institution: 'Nnamdi Azikiwe University',
      faculty: 'Engineering', department: 'Electronics Engineering', admin: false, owner: false, createdAt: '2026-10-01T00:00:00Z',
      lastActiveAt: null, suspendedAt: suspended ? '2026-10-24T00:00:00Z' : null, suspendReason: suspended ? 'Left the department' : null,
    },
    stats: { sessionsCreated: 1, sessionsJoined: 0, guides: 2, questionsClaimed: 3, answersMarked: 40 },
    sessionsCreated: [{ id: 's1', title: 'EEE 501 Exam', status: 'ACTIVE' }],
    sessionsJoined: [],
    activity: [{ id: 'a1', text: 'Ifeoma Eze created the guide EEE 501', createdAt: new Date().toISOString() }],
    canSuspend: true,
  })

  it('lecturer page: suspend needs a reason, then restore', async () => {
    let suspended = false
    handlers['GET /api/admin/lecturers/u1'] = () => [200, lecturerPage(suspended)]
    handlers['POST /api/admin/lecturers/u1/suspend'] = () => {
      suspended = true
      return [200, { ok: true }]
    }
    handlers['POST /api/admin/lecturers/u1/restore'] = () => {
      suspended = false
      return [200, { ok: true }]
    }
    renderAt('/admin/lecturers/u1')
    expect(await screen.findByText('EEE 501 Exam')).toBeTruthy()
    expect(screen.getByText('40')).toBeTruthy()
    expect(screen.getByText('Ifeoma Eze created the guide EEE 501')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }))
    const confirm = screen.getByRole('button', { name: 'Suspend lecturer' })
    expect(confirm.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Left the department' } })
    fireEvent.click(confirm)
    expect(await screen.findByText(/Left the department/)).toBeTruthy()
    expect(calls.find((c) => c.path.endsWith('/suspend')).body).toEqual({ reason: 'Left the department' })

    fireEvent.click(screen.getByRole('button', { name: 'Restore access' }))
    await screen.findByRole('button', { name: 'Suspend' })
  })

  it('hides Suspend when the server says it is not allowed', async () => {
    handlers['GET /api/admin/lecturers/u1'] = () => [200, { ...lecturerPage(false), canSuspend: false }]
    renderAt('/admin/lecturers/u1')
    await screen.findByText('EEE 501 Exam')
    expect(screen.queryByRole('button', { name: 'Suspend' })).toBeNull()
  })
})

it('api exposes the lecturer calls', () => {
  expect(typeof api.getLecturer).toBe('function')
})

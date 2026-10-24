import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext.jsx'
import SignUp from '../pages/SignUp.jsx'
import AiAssistant from '../pages/AiAssistant.jsx'
import App from '../App.jsx'
import ReviewAssistant from '../components/ReviewAssistant.jsx'

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, headers: { get: () => 'application/json' }, json: async () => body })

let calls
function mockFetch(handler) {
  calls = []
  global.fetch = vi.fn((url, opts) => {
    const path = url.replace('http://localhost:4000', '')
    calls.push({ path, body: opts?.body ? JSON.parse(opts.body) : null })
    return handler(path)
  })
}

beforeEach(() => {
  localStorage.clear()
  Element.prototype.scrollTo ||= () => {} // jsdom has no layout
  global.ResizeObserver ||= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('Sign up', () => {
  it('signs everyone up as a Lecturer with no role to pick, and links the privacy policy', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SignUp />
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.queryByText(/Select your role/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Admin|Reviewer/ })).toBeNull()
    expect(screen.queryByText(/SSO/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('/privacy')
  })
})

describe('Switching accounts on one browser', () => {
  function Probe() {
    const { user, verifyOtp, logout } = useAuth()
    return (
      <div>
        <span>{user ? user.name : 'nobody'}</span>
        <button onClick={() => verifyOtp({ pendingToken: 'p', code: '123456' })}>finish sign in</button>
        <button onClick={logout}>sign out</button>
      </div>
    )
  }

  function renderProbe() {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>
    )
  }

  it("forgets the last person's open session when someone else signs in", async () => {
    localStorage.setItem('scriptmark_token', 'old')
    localStorage.setItem('scriptmark_user', JSON.stringify({ id: 'u1', name: 'Bola' }))
    localStorage.setItem('scriptmark_active_session', 's_bola')
    localStorage.setItem('scriptmark_active_session_title', 'ECE512')
    mockFetch(() => json({ token: 'new', user: { id: 'u2', name: 'Chidi', role: 'LECTURER' } }))
    renderProbe()
    fireEvent.click(screen.getByText('finish sign in'))
    await screen.findByText('Chidi')
    expect(localStorage.getItem('scriptmark_active_session')).toBeNull()
    expect(localStorage.getItem('scriptmark_active_session_title')).toBeNull()
  })

  it('keeps your own open session when you sign back in', async () => {
    localStorage.setItem('scriptmark_token', 'old')
    localStorage.setItem('scriptmark_user', JSON.stringify({ id: 'u1', name: 'Bola' }))
    localStorage.setItem('scriptmark_active_session', 's_bola')
    mockFetch(() => json({ token: 'new', user: { id: 'u1', name: 'Bola', role: 'LECTURER' } }))
    renderProbe()
    fireEvent.click(screen.getByText('finish sign in'))
    await waitFor(() => expect(localStorage.getItem('scriptmark_token')).toBe('new'))
    expect(localStorage.getItem('scriptmark_active_session')).toBe('s_bola')
  })

  it('clears the open session on sign out', async () => {
    localStorage.setItem('scriptmark_token', 'old')
    localStorage.setItem('scriptmark_user', JSON.stringify({ id: 'u1', name: 'Bola' }))
    localStorage.setItem('scriptmark_active_session', 's_bola')
    renderProbe()
    await screen.findByText('Bola')
    fireEvent.click(screen.getByText('sign out'))
    await screen.findByText('nobody')
    expect(localStorage.getItem('scriptmark_active_session')).toBeNull()
    expect(localStorage.getItem('scriptmark_token')).toBeNull()
  })

  it('signs out when the saved sign in has expired', async () => {
    localStorage.setItem('scriptmark_token', 'expired')
    localStorage.setItem('scriptmark_user', JSON.stringify({ id: 'u1', name: 'Bola', role: 'LECTURER' }))
    mockFetch(() => json({ error: 'Invalid or expired token. Please log in again.' }, 401))
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(await screen.findByText(/The new standard for marking/)).toBeTruthy()
    expect(localStorage.getItem('scriptmark_token')).toBeNull()
  })
})

describe('AI Assistant screen', () => {
  it('sends only the real conversation and shows list replies as clean bullets', async () => {
    localStorage.setItem('scriptmark_token', 'tok')
    localStorage.setItem('scriptmark_user', JSON.stringify({ id: 'u1', name: 'Bola', role: 'LECTURER' }))
    localStorage.setItem('scriptmark_active_session', 's1')
    mockFetch((path) =>
      path === '/api/assistant/today'
        ? json({ items: [{ sessionId: 's1', session: 'ECE512', kind: 'queue', text: '3 answers are waiting for you to confirm', link: '/sessions/s1/my-queue' }] })
        : json({ reply: 'Your sessions:\n- **ECE512** Digital Signal Processing\n- ECE305 Control Systems', action: null })
    )
    render(
      <MemoryRouter>
        <AuthProvider>
          <AiAssistant />
        </AuthProvider>
      </MemoryRouter>
    )
    fireEvent.change(screen.getByPlaceholderText(/Ask about a session/), { target: { value: 'What sessions do I have?' } })
    await act(async () => {
      fireEvent.keyDown(screen.getByPlaceholderText(/Ask about a session/), { key: 'Enter' })
    })
    expect(await screen.findByText('ECE512 Digital Signal Processing')).toBeTruthy()
    expect(screen.queryByText(/\*\*/)).toBeNull()
    expect(screen.getByText('3 answers are waiting for you to confirm').closest('a').getAttribute('href')).toBe('/sessions/s1/my-queue')
    const chat = calls.find((c) => c.path === '/api/assistant/chat')
    expect(chat.body.messages).toEqual([{ role: 'user', content: 'What sessions do I have?' }])
    expect(chat.body.activeSessionId).toBe('s1')
  })
})

describe('Marking assistant beside a script', () => {
  it('sends the script id, and a suggested score only goes to the score box', async () => {
    localStorage.setItem('scriptmark_token', 'tok')
    localStorage.setItem('scriptmark_user', JSON.stringify({ id: 'u1', name: 'Bola', role: 'LECTURER' }))
    const proposal = { answerId: 'a2', questionId: 'q2', label: 'Question 2', score: 3, maxMarks: 5, reason: 'Misses the condition.' }
    mockFetch(() => json({ reply: 'It misses the condition.', proposal }))
    const onUseScore = vi.fn()
    render(
      <AuthProvider>
        <ReviewAssistant script={{ id: 'sc1', studentName: 'Ada Obi' }} open onClose={() => {}} onUseScore={onUseScore} />
      </AuthProvider>
    )
    await act(async () => {
      fireEvent.click(screen.getByText('What did this student miss?'))
    })
    expect(await screen.findByText('Suggests 3 / 5 for Question 2')).toBeTruthy()
    // The app also asks /api/auth/me on open, so find the review call by path.
    const review = calls.find((c) => c.path === '/api/assistant/review')
    expect(review.body).toEqual({ scriptId: 'sc1', messages: [{ role: 'user', content: 'What did this student miss?' }] })
    fireEvent.click(screen.getByText('Use this score'))
    expect(onUseScore).toHaveBeenCalledWith(proposal)
    expect(calls.filter((c) => c.path !== '/api/auth/me').length).toBe(1)
  })
})

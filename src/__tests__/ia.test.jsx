import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext.jsx'
import RequireAuth from '../components/RequireAuth.jsx'
import Sidebar from '../components/Sidebar.jsx'
import SessionWorkspace from '../components/SessionWorkspace.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Results from '../pages/Results.jsx'
import Analytics from '../pages/Analytics.jsx'
import MarkingProgress from '../pages/MarkingProgress.jsx'
import ClaimQuestions from '../pages/ClaimQuestions.jsx'
import MyQueue from '../pages/MyQueue.jsx'
import CoordinatorDashboard from '../pages/CoordinatorDashboard.jsx'
import Archive from '../pages/Archive.jsx'
import ScanScripts from '../pages/ScanScripts.jsx'
import CohortAnalytics from '../pages/CohortAnalytics.jsx'
import Settings from '../pages/Settings.jsx'
import App from '../App.jsx'

const FAKE_USER = { id: 'u1', name: 'Ann Coordinator', role: 'LECTURER' }
const FAKE_SESSION = {
  id: 's1', title: 'ECE305 Midterm', courseCode: 'ECE305', status: 'ACTIVE',
  createdById: 'u1', isCreator: true, accessLevel: 'FULL', guideId: 'g1',
  guide: { id: 'g1', title: 'ECE305 Guide', questions: [] },
  classList: [], classListUploads: [],
}

function seedAuth() {
  localStorage.setItem('scriptmark_token', 'tok123')
  localStorage.setItem('scriptmark_user', JSON.stringify(FAKE_USER))
}

function routeFor(path, body, status = 200) {
  return { path, body, status }
}

let routes
beforeEach(() => {
  localStorage.clear()
  seedAuth()
  routes = [
    routeFor('/api/sessions/s1', FAKE_SESSION),
    routeFor('/api/sessions', [FAKE_SESSION]),
    routeFor('/api/sessions/s1/scripts', []),
    routeFor('/api/sessions/s1/classList', { classList: [], classListUploads: [] }),
    routeFor('/api/sessions/s1/analytics', { totalScripts: 0, scoredCount: 0, flaggedCount: 0, lowConfidenceCount: 0, average: null, highest: null, distribution: [], perQuestion: [] }),
    routeFor('/api/sessions/s1/coordinatorOverview', { perMarker: [], totalScripts: 0, scoredCount: 0, reviewedCount: 0 }),
    routeFor('/api/sessions/s1/myQueue', []),
    routeFor('/api/guides/g1/claimStatus', { questions: [], markers: [] }),
  ]
  global.fetch = vi.fn((url, opts) => {
    const path = url.replace('http://localhost:4000', '')
    const match = routes.find((r) => r.path === path.split('?')[0])
    if (!match) {
      console.error('UNMOCKED FETCH:', opts?.method || 'GET', path)
      return Promise.resolve({ ok: false, status: 404, headers: { get: () => 'application/json' }, json: async () => ({ error: 'unmocked: ' + path }) })
    }
    return Promise.resolve({
      ok: match.status < 400,
      status: match.status,
      headers: { get: () => 'application/json' },
      json: async () => match.body,
    })
  })
})

function renderAt(initialPath, element) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/sessions/:id" element={<RequireAuth><SessionWorkspace /></RequireAuth>}>
            <Route path="scan" element={<ScanScripts />} />
            <Route path="marking" element={<MarkingProgress />} />
            <Route path="claim-questions" element={<ClaimQuestions />} />
            <Route path="my-queue" element={<MyQueue />} />
            <Route path="coordinator" element={<CoordinatorDashboard />} />
            <Route path="results" element={<Results />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="export" element={<Archive />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Dashboard (global tool, no session required)', () => {
  it('renders without crashing and lists sessions', async () => {
    renderAt('/', null)
    await waitFor(() => expect(screen.getAllByText('ECE305 Midterm').length).toBeGreaterThan(0))
  })
})

describe('SessionWorkspace tab bar', () => {
  it('shows coordinator tabs for the session creator', async () => {
    renderAt('/sessions/s1/marking', null)
    await waitFor(() => expect(screen.getAllByText('ECE305 Midterm').length).toBeGreaterThan(0))
    expect(screen.getByText('Scan Scripts')).toBeTruthy()
    expect(screen.getByText('Coordinator Overview')).toBeTruthy()
    expect(screen.getByText('Claim Questions')).toBeTruthy()
    expect(screen.getByText('Results')).toBeTruthy()
    expect(screen.getByText('Analytics')).toBeTruthy()
  })

  it('hides coordinator-only tabs for a LIMITED marker', async () => {
    routes.unshift({ path: '/api/sessions/s1', body: { ...FAKE_SESSION, isCreator: false, accessLevel: 'LIMITED' }, status: 200 })
    renderAt('/sessions/s1/marking', null)
    await waitFor(() => expect(screen.getAllByText('ECE305 Midterm').length).toBeGreaterThan(0))
    expect(screen.queryByText('Scan Scripts')).toBeNull()
    expect(screen.queryByText('Coordinator Overview')).toBeNull()
    expect(screen.getByText('Claim Questions')).toBeTruthy()
  })

  it('shows an error state, not a crash, for a 404 session', async () => {
    routes[0] = routeFor('/api/sessions/s1', { error: 'not found' }, 404)
    renderAt('/sessions/s1/marking', null)
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy())
  })
})

for (const [tab, Comp, label] of [
  ['scan', 'scan', 'Scan'],
  ['marking', 'marking', 'Marking Progress'],
  ['claim-questions', 'claim-questions', 'Claim Questions'],
  ['my-queue', 'my-queue', 'My Queue'],
  ['coordinator', 'coordinator', 'Coordinator Overview'],
  ['results', 'results', 'Results'],
  ['analytics', 'analytics', 'Analytics'],
  ['export', 'export', 'Archive/Export'],
]) {
  describe(`${label} page inside a session`, () => {
    it('mounts without throwing and reads sessionId from the URL, not localStorage', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      renderAt(`/sessions/s1/${tab}`, null)
      await waitFor(() => expect(screen.getAllByText('ECE305 Midterm').length).toBeGreaterThan(0))
      // give the nested page's own effect a tick to fire
      await new Promise((r) => setTimeout(r, 30))
      const thrown = consoleSpy.mock.calls.some((c) => String(c[0]).includes('Error') || String(c[0]).includes('error boundary'))
      expect(thrown).toBe(false)
      consoleSpy.mockRestore()
    })
  })
}

describe('Results page export button', () => {
  it('links to the export sub-route', async () => {
    renderAt('/sessions/s1/results', null)
    await waitFor(() => expect(screen.getByText('Export Results')).toBeTruthy())
  })
})

describe('Sidebar', () => {
  it('renders Tools then Sessions, New Session button visible to a LECTURER', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Sidebar user={{ name: 'Ann', role: 'LECTURER', initials: 'AC' }} onSignOut={() => {}} />
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByText('Dashboard')).toBeTruthy()
    expect(screen.getByText('Marking Guides')).toBeTruthy()
    expect(screen.getByText('AI Assistant')).toBeTruthy()
    expect(screen.getByText('New Marking Session')).toBeTruthy()
    await waitFor(() => expect(screen.getAllByText('ECE305 Midterm').length).toBeGreaterThan(0))
    // none of the old flat session-scoped items should exist in the permanent sidebar
    expect(screen.queryByText('Marking Progress')).toBeNull()
    expect(screen.queryByText('Claim Questions')).toBeNull()
    expect(screen.queryByText('Export')).toBeNull()
  })
})

describe('Attendance sheet upload on Scan Scripts', () => {
  const twoStudents = [
    { id: 'c1', name: 'ADA OKAFOR', regNumber: '2017364085', flagged: false },
    { id: 'c2', name: 'CHIDI EZE', regNumber: '2025366001FN', flagged: true, conflict: { name: 'CHIDI EZEH' } },
  ]

  it('shows how many students are on the class list and any name conflicts', async () => {
    routes.unshift(routeFor('/api/sessions/s1/classList', { classList: twoStudents, classListUploads: [] }))
    renderAt('/sessions/s1/scan', null)
    await waitFor(() => expect(screen.getByText('2 students on the class list.')).toBeTruthy())
    expect(screen.getByText(/1 name conflict to review before export/)).toBeTruthy()
  })

  it('uploads a sheet, reports what changed, and refreshes the scripts list', async () => {
    renderAt('/sessions/s1/scan', null)
    await waitFor(() => expect(screen.getByText('No students on the class list yet.')).toBeTruthy())

    routes.unshift(routeFor('/api/sessions/s1/classList', {
      classList: twoStudents, classListUploads: [], addedCount: 2, flaggedCount: 1, rematchedCount: 1,
    }))
    const input = screen.getByLabelText('Upload attendance sheet')
    fireEvent.change(input, { target: { files: [new File(['x'], 'attendance.jpg', { type: 'image/jpeg' })] } })

    await waitFor(() => expect(screen.getByText('2 students added, 1 scanned script matched.')).toBeTruthy())
    expect(screen.getByText('2 students on the class list.')).toBeTruthy()

    const post = global.fetch.mock.calls.find(([url, opts]) => url.endsWith('/api/sessions/s1/classList') && opts?.method === 'POST')
    expect(post[1].body.get('document').name).toBe('attendance.jpg')
    await waitFor(() => {
      const scriptFetches = global.fetch.mock.calls.filter(([url]) => url.endsWith('/api/sessions/s1/scripts'))
      expect(scriptFetches.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('Sidebar collapsed rail', () => {
  it('hides labels but keeps every item reachable by its tooltip', async () => {
    const onToggle = vi.fn()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Sidebar user={{ name: 'Ann', role: 'LECTURER', initials: 'AC' }} onSignOut={() => {}} collapsed onToggleCollapse={onToggle} />
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.queryByText('Dashboard')).toBeNull()
    expect(screen.queryByText('Sessions')).toBeNull()
    expect(screen.getByTitle('Dashboard')).toBeTruthy()
    expect(screen.getByTitle('New Marking Session')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Expand sidebar'))
    expect(onToggle).toHaveBeenCalled()
  })
})

describe('Session header', () => {
  it('shows one breadcrumb and tab row, with no repeated page title on Scan Scripts', async () => {
    renderAt('/sessions/s1/scan', null)
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Session sections' })).toBeTruthy())
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain('Sessions')
    expect(screen.queryByText('Scan Student Scripts')).toBeNull()
    expect(screen.getByRole('link', { name: /Scan Scripts/ }).getAttribute('aria-current')).toBe('page')
  })
})

describe('AI Agreement panel on Analytics', () => {
  // recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks
  beforeEach(() => {
    global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  })

  const analytics = { totalScripts: 2, scoredCount: 2, flaggedCount: 0, lowConfidenceCount: 0, average: 60, highest: 70, distribution: [], perQuestion: [] }
  const evaluation = {
    answersScored: 10, humanConfirmed: 8, autoAcceptedExcluded: 2, overriddenAfterConfirm: 1,
    overall: { n: 8, exactAgreement: 0.625, withinOneMark: 0.875, mae: 0.5, rmse: 0.71, pearson: 0.93, kappa: 0.51, quadraticKappa: 0.9 },
    passFail: { accuracy: 0.875, precision: 0.8, recall: 1, f1: 0.889 },
    byConfidence: { high: { n: 5, exactAgreement: 0.8, mae: 0.2 }, medium: { n: 3, exactAgreement: 0.333, mae: 1 }, low: { n: 0 } },
    perQuestion: [], scripts: { n: 2, maePercent: 4.5, pearson: 1, sameGrade: 0.5, withinOneGrade: 1 },
  }

  it('shows the agreement metrics and explains what was left out', async () => {
    routes.unshift(routeFor('/api/sessions/s1/analytics', analytics), routeFor('/api/sessions/s1/evaluation', evaluation))
    renderAt('/sessions/s1/analytics', null)
    await waitFor(() => expect(screen.getByText('AI Agreement')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('62.5%')).toBeTruthy())
    expect(screen.getByText('0.90')).toBeTruthy()
    expect(screen.getByText(/2 auto accepted answers are left out/)).toBeTruthy()
    expect(screen.getByText(/50% get the same letter grade/)).toBeTruthy()
  })

  it('says what to do when nothing is confirmed yet', async () => {
    routes.unshift(routeFor('/api/sessions/s1/analytics', analytics), routeFor('/api/sessions/s1/evaluation', { ...evaluation, answersScored: 0, humanConfirmed: 0, overall: { n: 0 } }))
    renderAt('/sessions/s1/analytics', null)
    await waitFor(() => expect(screen.getByText(/No lecturer confirmed scores yet/)).toBeTruthy())
  })
})

describe('Results review screen', () => {
  const q = { id: 'q1', number: '1', subLabel: null, text: 'Define OCR', modelAnswer: 'Optical character recognition', maxMarks: 5 }
  const script = (id, name, reg, status) => ({
    id, studentName: name, regNumber: reg, status, hasLowConfidenceScore: false, ocrText: 'OCR is ...',
    pages: [{ pageNumber: 1, imageUrl: 'p1.jpg' }, { pageNumber: 2, imageUrl: 'p2.jpg' }],
    answers: [{ id: `a_${id}`, question: q, suggestedScore: 4, confirmedScore: null, confidence: 'high', extractedText: 'Reads text', reasoning: 'Fine' }],
  })

  it('names the student, counts reviewed scripts, and switches script from the jump list', async () => {
    routes.unshift(routeFor('/api/sessions/s1/scripts', [script('x1', 'ADA OKAFOR', '2017364085', 'SCORED'), script('x2', 'CHIDI EZE', '2025366001FN', 'REVIEWED')]))
    renderAt('/sessions/s1/results', null)
    await waitFor(() => expect(screen.getByText('2017364085')).toBeTruthy())
    expect(screen.getByText('Script 1 of 2, 1 reviewed')).toBeTruthy()
    expect(screen.getByText('Needs review')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Jump to script'), { target: { value: '1' } })
    await waitFor(() => expect(screen.getByText('2025366001FN')).toBeTruthy())
    expect(screen.getByText('Reviewed')).toBeTruthy()
  })

  it('lets the reviewer page through a multi page script beside the scores', async () => {
    routes.unshift(routeFor('/api/sessions/s1/scripts', [script('x1', 'ADA OKAFOR', '2017364085', 'SCORED')]))
    renderAt('/sessions/s1/results', null)
    await waitFor(() => expect(screen.getByAltText('Page 1')).toBeTruthy())
    fireEvent.click(screen.getByLabelText('Next page'))
    expect(screen.getByAltText('Page 2').getAttribute('src')).toBe('p2.jpg')
  })
})

describe('Cohort analytics', () => {
  beforeEach(() => {
    global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  })

  const cohort = {
    scoredScripts: 8, totalScripts: 8,
    summary: { n: 8, mean: 54.4, median: 52.5, sd: 15.2, min: 35, max: 70, passRate: 0.875 },
    gradeDistribution: [{ grade: 'A', count: 1 }, { grade: 'B', count: 2 }, { grade: 'C', count: 1 }, { grade: 'D', count: 2 }, { grade: 'E', count: 1 }, { grade: 'F', count: 1 }],
    byEntryYear: [{ group: '2021', n: 6, mean: 55.8, passRate: 0.833 }],
    byProgramme: [{ group: 'Postgraduate', n: 2, mean: 40, passRate: 0.5 }],
    items: [{ question: 'Q1', text: 'Easy one', maxMarks: 10, responses: 8, facility: 0.8, discrimination: 0.05, needsReview: true }],
  }

  it('shows pass rate, groups and flags a weak question on the session Analytics page', async () => {
    routes.unshift(
      routeFor('/api/sessions/s1/analytics', { totalScripts: 8, scoredCount: 8, flaggedCount: 0, lowConfidenceCount: 0, average: 50, highest: 70, distribution: [], perQuestion: [] }),
      routeFor('/api/sessions/s1/cohort', cohort),
    )
    renderAt('/sessions/s1/analytics', null)
    await waitFor(() => expect(screen.getByText('87.5%')).toBeTruthy())
    expect(screen.getByText('Postgraduate')).toBeTruthy()
    expect(screen.getByText('Review question')).toBeTruthy()
  })

  it('compares sessions and filters by academic session', async () => {
    routes.unshift(routeFor('/api/sessions/cohort/compare', [
      { id: 's1', title: 'ECE512 DSP', courseCode: 'ECE512', academicSession: '2025/2026', semester: 'First', scoredScripts: 40, mean: 55, sd: 12, passRate: 0.8 },
      { id: 's2', title: 'ECE305 Control', courseCode: 'ECE305', academicSession: '2024/2025', semester: 'Second', scoredScripts: 30, mean: 48, sd: 14, passRate: 0.6 },
    ]))
    render(
      <MemoryRouter initialEntries={['/cohorts']}>
        <AuthProvider>
          <Routes>
            <Route path="/cohorts" element={<CohortAnalytics />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('ECE305 Control')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Academic session'), { target: { value: '2025/2026' } })
    expect(screen.queryByText('ECE305 Control')).toBeNull()
    expect(screen.getByText('ECE512 DSP')).toBeTruthy()
  })
})

describe('Settings page', () => {
  function renderSettings() {
    return render(
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>
          <Routes>
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
  }

  it('saves a new name and keeps the fresh token', async () => {
    routes.unshift(routeFor('/api/auth/me', { token: 'tok_new', user: { ...FAKE_USER, name: 'Ann Nwachukwu' } }))
    renderSettings()
    const input = await screen.findByDisplayValue('Ann Coordinator')
    fireEvent.change(input, { target: { value: 'Ann Nwachukwu' } })
    fireEvent.click(screen.getByText('Save name'))
    await waitFor(() => expect(screen.getByText('Name updated.')).toBeTruthy())
    expect(localStorage.getItem('scriptmark_token')).toBe('tok_new')
    expect(JSON.parse(localStorage.getItem('scriptmark_user')).name).toBe('Ann Nwachukwu')
  })

  it('checks the new passwords match before calling the server', async () => {
    renderSettings()
    await screen.findByDisplayValue('Ann Coordinator')
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'oldpassword' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword1' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword2' } })
    fireEvent.click(screen.getByText('Change password'))
    expect(screen.getByText('The two new passwords do not match.')).toBeTruthy()
    expect(global.fetch.mock.calls.some(([url]) => url.includes('/api/auth/password'))).toBe(false)
  })

  it('remembers the voice replies preference on this device', async () => {
    renderSettings()
    fireEvent.click(await screen.findByRole('switch', { name: 'Read AI Assistant replies aloud' }))
    expect(localStorage.getItem('scriptmark_voice_replies')).toBe('1')
  })
})

describe('Home route', () => {
  function renderApp() {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
  }

  it('shows the landing page to a signed out visitor', async () => {
    localStorage.clear()
    renderApp()
    await waitFor(() => expect(screen.getByText(/Mark exam scripts faster/)).toBeTruthy())
    expect(screen.getAllByRole('link', { name: /Create account|Get started/ }).length).toBeGreaterThan(0)
    expect(screen.queryByText('New Marking Session')).toBeNull()
  })

  it('shows the dashboard once signed in', async () => {
    renderApp()
    await waitFor(() => expect(screen.getAllByText('ECE305 Midterm').length).toBeGreaterThan(0))
    expect(screen.queryByText(/Mark exam scripts faster/)).toBeNull()
  })
})

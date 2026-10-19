import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import Sidebar from './components/Sidebar.jsx'
import SessionWorkspace from './components/SessionWorkspace.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ScanScripts from './pages/ScanScripts.jsx'
import MarkingGuides from './pages/MarkingGuides.jsx'
import Results from './pages/Results.jsx'
import MarkingProgress from './pages/MarkingProgress.jsx'
import MyQueue from './pages/MyQueue.jsx'
import ClaimQuestions from './pages/ClaimQuestions.jsx'
import CoordinatorDashboard from './pages/CoordinatorDashboard.jsx'
import Analytics from './pages/Analytics.jsx'
import Archive from './pages/Archive.jsx'
import AiAssistant from './pages/AiAssistant.jsx'
import SignUp from './pages/SignUp.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Settings from './pages/Settings.jsx'

function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const currentUser = user
    ? {
        name: user.name,
        role: user.role,
        initials: user.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join(''),
      }
    : null

  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('scriptmark_sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })

  // The mobile drawer closes itself once the user picks somewhere to go.
  useEffect(() => setMobileOpen(false), [location.pathname])

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem('scriptmark_sidebar_collapsed', c ? '0' : '1')
      } catch {}
      return !c
    })
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        user={currentUser}
        onSignOut={logout}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">ScriptMark</span>
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

function Protected({ children }) {
  return (
    <RequireAuth>
      <AppLayout>{children}</AppLayout>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgotPassword" element={<ForgotPassword />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Tools: global, not tied to any one session */}
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/guides" element={<Protected><MarkingGuides /></Protected>} />
        <Route path="/assistant" element={<Protected><AiAssistant /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />

        {/* A session's own workspace: tab bar + nested pages, all scoped to :id */}
        <Route path="/sessions/:id" element={<Protected><SessionWorkspace /></Protected>}>
          <Route index element={<Navigate to="marking" replace />} />
          <Route path="scan" element={<ScanScripts />} />
          <Route path="marking" element={<MarkingProgress />} />
          <Route path="claim-questions" element={<ClaimQuestions />} />
          <Route path="my-queue" element={<MyQueue />} />
          <Route path="coordinator" element={<CoordinatorDashboard />} />
          <Route path="results" element={<Results />} />
          <Route path="analytics" element={<Analytics />} />
          {/* Reached only via the "Export Results" button on Results, not a tab */}
          <Route path="export" element={<Archive />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

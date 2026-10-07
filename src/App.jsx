import { Routes, Route, Navigate } from 'react-router-dom'
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

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={currentUser} onSignOut={logout} />
      <main className="flex-1 overflow-hidden">{children}</main>
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

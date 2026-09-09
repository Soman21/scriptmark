import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ScanScripts from './pages/ScanScripts.jsx'
import MarkingGuides from './pages/MarkingGuides.jsx'
import Results from './pages/Results.jsx'
import MarkingProgress from './pages/MarkingProgress.jsx'
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
        role: user.role.charAt(0) + user.role.slice(1).toLowerCase(),
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
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/scan" element={<Protected><ScanScripts /></Protected>} />
        <Route path="/guides" element={<Protected><MarkingGuides /></Protected>} />
        <Route path="/results" element={<Protected><Results /></Protected>} />
        <Route path="/marking" element={<Protected><MarkingProgress /></Protected>} />
        <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
        <Route path="/archive" element={<Protected><Archive /></Protected>} />
        <Route path="/assistant" element={<Protected><AiAssistant /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
      </Routes>
    </AuthProvider>
  )
}

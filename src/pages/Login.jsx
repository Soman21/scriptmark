import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { PrimaryButton } from '../components/ui.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">ScriptMark</h1>
          <p className="text-sm text-slate-500 mt-1">Institutional AI Assessment Infrastructure</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1">Welcome back — enter your academic credentials.</p>

          {error && (
            <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-600">
              {error}
            </div>
          )}

          <form className="space-y-4 mt-6" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Academic Email</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                <Mail size={16} className="text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="j.reed@university.edu"
                  className="flex-1 text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Link to="/forgotPassword" className="text-xs text-sky-600 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                <Lock size={16} className="text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="flex-1 text-sm outline-none placeholder:text-slate-400"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="text-slate-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <PrimaryButton type="submit" disabled={submitting} className="w-full justify-center py-2.5">
              {submitting ? 'Signing in...' : 'Sign In'} <ArrowRight size={16} />
            </PrimaryButton>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Do not have an account?{' '}
            <Link to="/signup" className="text-sky-600 font-medium">
              Create one
            </Link>
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} /> FERPA Compliant
          </span>
          <span className="flex items-center gap-1.5">
            <Lock size={14} /> 256-bit Encryption
          </span>
        </div>
      </div>
    </div>
  )
}

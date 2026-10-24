import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { safeNext, withNext } from '../lib/next.js'
import { User, GraduationCap, ShieldCheck, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { PrimaryButton } from '../components/ui.jsx'

export default function SignUp() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!agreed) {
      setError('Please agree to the Privacy Policy to continue.')
      return
    }

    setSubmitting(true)
    try {
      await signup({ name, email, password })
      navigate(safeNext(location.search))
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
          <p className="text-sm text-slate-500 mt-1">The AI marking assistant for handwritten exams</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="h-1 bg-slate-100">
            <div className="h-1 w-1/3 bg-brand-500" />
          </div>

          <div className="p-8">
            <h2 className="text-xl font-semibold text-slate-900">Create your account</h2>
            <p className="text-sm text-slate-500 mt-1">Takes a minute. Your sessions and guides stay private to you.</p>

            <div className="mt-6" />

            {error && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-600">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                  <User size={16} className="text-slate-400" />
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Julian Reed"
                    className="flex-1 text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Academic Email</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                  <GraduationCap size={16} className="text-slate-400" />
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
                <label className="text-sm font-medium text-slate-700">Password</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                  <Lock size={16} className="text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="flex-1 text-sm outline-none placeholder:text-slate-400"
                  />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="text-slate-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                I agree to the{' '}
                <Link to="/privacy" target="_blank" className="text-brand-600 underline">
                  Privacy Policy
                </Link>
                .
              </label>

              <PrimaryButton type="submit" disabled={submitting} className="w-full justify-center py-2.5">
                {submitting ? 'Creating account...' : 'Create Account'} <ArrowRight size={16} />
              </PrimaryButton>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an academic account?{' '}
              <Link to={withNext('/login', location.search)} className="text-brand-600 font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} /> Email code at every sign in
          </span>
          <span className="flex items-center gap-1.5">
            <Lock size={14} /> Encrypted connection
          </span>
        </div>
      </div>
    </div>
  )
}

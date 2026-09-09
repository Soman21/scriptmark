import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Landmark, User, GraduationCap, ShieldCheck, ClipboardCheck, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { PrimaryButton } from '../components/ui.jsx'

const roles = [
  { key: 'LECTURER', label: 'Lecturer', icon: User },
  { key: 'REVIEWER', label: 'Reviewer', icon: ClipboardCheck },
  { key: 'ADMIN', label: 'Admin', icon: ShieldCheck },
]

export default function SignUp() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('LECTURER')
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
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }

    setSubmitting(true)
    try {
      await signup({ name, email, password, role })
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

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="h-1 bg-slate-100">
            <div className="h-1 w-1/3 bg-sky-500" />
          </div>

          <div className="p-8">
            <h2 className="text-xl font-semibold text-slate-900">Create your account</h2>
            <p className="text-sm text-slate-500 mt-1">Join thousands of educators streamlining their grading workflow.</p>

            <button
              type="button"
              onClick={() => setError('Institutional SSO is not configured yet — use email for now.')}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Landmark size={16} /> Sign up with Institutional SSO
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">OR USE EMAIL</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

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
                <label className="text-sm font-medium text-slate-700">Select your role</label>
                <div className="mt-1.5 grid grid-cols-3 gap-3">
                  {roles.map(({ key, label, icon: Icon }) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setRole(key)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 text-sm ${
                        role === key ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
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
                I agree to the <a className="text-sky-600 underline">Terms of Service</a> and{' '}
                <a className="text-sky-600 underline">Privacy Policy</a>.
              </label>

              <PrimaryButton type="submit" disabled={submitting} className="w-full justify-center py-2.5">
                {submitting ? 'Creating account...' : 'Create Account'} <ArrowRight size={16} />
              </PrimaryButton>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an academic account?{' '}
              <Link to="/login" className="text-sky-600 font-medium">
                Sign In
              </Link>
            </p>
          </div>
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

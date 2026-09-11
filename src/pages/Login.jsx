import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { PrimaryButton } from '../components/ui.jsx'

export default function Login() {
  const { login, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [pendingToken, setPendingToken] = useState(null)
  const [otpEmail, setOtpEmail] = useState('')
  const [code, setCode] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await login({ email, password })
      if (result.otpRequired) {
        setPendingToken(result.pendingToken)
        setOtpEmail(result.email)
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await verifyOtp({ pendingToken, code })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function backToPasswordStep() {
    setPendingToken(null)
    setOtpEmail('')
    setCode('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">ScriptMark</h1>
          <p className="text-sm text-slate-500 mt-1">Institutional AI Assessment Infrastructure</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          {!pendingToken ? (
            <>
              <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
              <p className="text-sm text-slate-500 mt-1">Welcome back. Enter your academic credentials.</p>

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
            </>
          ) : (
            <>
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                <KeyRound size={18} />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 text-center">Enter your login code</h2>
              <p className="text-sm text-slate-500 mt-1 text-center">
                We sent a 6 digit code to {otpEmail}. It expires in 10 minutes.
              </p>

              {error && (
                <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <form className="space-y-4 mt-6" onSubmit={handleVerifyOtp}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-sky-400"
                />

                <PrimaryButton type="submit" disabled={submitting || code.length !== 6} className="w-full justify-center py-2.5">
                  {submitting ? 'Verifying...' : 'Verify & Sign In'} <ArrowRight size={16} />
                </PrimaryButton>
              </form>

              <button onClick={backToPasswordStep} className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700">
                Use a different account
              </button>
            </>
          )}
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
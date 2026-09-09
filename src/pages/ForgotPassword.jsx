import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api.js'
import { PrimaryButton } from '../components/ui.jsx'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState('request') // "request" | "reset"
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleRequestCode(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await api.forgotPassword(email)
      setMessage(data.message)
      setStep('reset')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.resetPassword({ email, code, newPassword })
      navigate('/login')
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
          {step === 'request' ? (
            <>
              <h2 className="text-xl font-semibold text-slate-900">Reset your password</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter your academic email and we will send you a reset code.
              </p>

              {error && (
                <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <form className="space-y-4 mt-6" onSubmit={handleRequestCode}>
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

                <PrimaryButton type="submit" disabled={submitting} className="w-full justify-center py-2.5">
                  {submitting ? 'Sending...' : 'Send Reset Code'} <ArrowRight size={16} />
                </PrimaryButton>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-900">Enter your code</h2>
              <p className="text-sm text-slate-500 mt-1">{message || 'Check your email for a 6-digit code.'}</p>

              {error && (
                <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <form className="space-y-4 mt-6" onSubmit={handleResetPassword}>
                <div>
                  <label className="text-sm font-medium text-slate-700">Reset Code</label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                    <KeyRound size={16} className="text-slate-400" />
                    <input
                      required
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="flex-1 text-sm tracking-widest outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">New Password</label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                    <Lock size={16} className="text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="flex-1 text-sm outline-none placeholder:text-slate-400"
                    />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="text-slate-400">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <PrimaryButton type="submit" disabled={submitting} className="w-full justify-center py-2.5">
                  {submitting ? 'Resetting...' : 'Reset Password'} <ArrowRight size={16} />
                </PrimaryButton>
              </form>

              <button
                onClick={() => setStep('request')}
                className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600"
              >
                Did not get a code? Try again
              </button>
            </>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Remembered it?{' '}
            <Link to="/login" className="text-sky-600 font-medium">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

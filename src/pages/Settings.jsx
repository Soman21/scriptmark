import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

// Same scale as the backend's grading.js and the result sheet.
const GRADE_SCALE = [
  ['A', '70 to 100'],
  ['B', '60 to 69'],
  ['C', '50 to 59'],
  ['D', '45 to 49'],
  ['E', '40 to 44'],
  ['F', 'Below 40'],
]

function readPref(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writePref(key, on) {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {}
}

function Section({ title, description, children }) {
  return (
    <section className="grid gap-4 border-b border-slate-200 py-6 last:border-b-0 md:grid-cols-[220px_1fr] md:gap-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-slate-50 disabled:text-slate-500'

function Toggle({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3.5 max-w-md">
      <div>
        <p className="text-sm text-slate-800">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export default function Settings() {
  const { user, token, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState('')
  const [nameError, setNameError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [voiceReplies, setVoiceReplies] = useState(() => readPref('scriptmark_voice_replies'))

  // The signed in user can arrive a moment after first render.
  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user?.name])

  async function handleSaveName(e) {
    e.preventDefault()
    setNameMsg('')
    setNameError('')
    if (!name.trim()) return setNameError('Name cannot be empty.')
    setSavingName(true)
    try {
      await updateProfile({ name: name.trim() })
      setNameMsg('Name updated.')
    } catch (err) {
      setNameError(err.message)
    } finally {
      setSavingName(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordMsg('')
    setPasswordError('')
    if (newPassword.length < 8) return setPasswordError('New password must be at least 8 characters.')
    if (newPassword !== confirmPassword) return setPasswordError('The two new passwords do not match.')
    setSavingPassword(true)
    try {
      await api.changePassword({ currentPassword, newPassword }, token)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMsg('Password changed.')
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  const success = (msg) =>
    msg && (
      <p className="flex items-center gap-1.5 text-sm text-emerald-600">
        <CheckCircle2 size={14} /> {msg}
      </p>
    )
  const failure = (msg) => msg && <p className="text-sm text-rose-600">{msg}</p>

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Section title="Profile" description="How your name appears to other lecturers.">
            <form onSubmit={handleSaveName} className="space-y-3">
              <Field label="Full name">
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Email">
                <input value={user?.email || ''} disabled className={inputClass} />
              </Field>
              <Field label="Role">
                <input value={user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : ''} disabled className={inputClass} />
              </Field>
              <div className="flex items-center gap-3">
                <PrimaryButton type="submit" disabled={savingName || name.trim() === user?.name}>
                  {savingName ? 'Saving...' : 'Save name'}
                </PrimaryButton>
                {success(nameMsg)}
                {failure(nameError)}
              </div>
            </form>
          </Section>

          <Section title="Password" description="At least 8 characters. You stay signed in on this device after changing it.">
            <form onSubmit={handleChangePassword} className="space-y-3">
              <Field label="Current password">
                <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} />
              </Field>
              <Field label="New password">
                <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Confirm new password">
                <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
              </Field>
              <div className="flex items-center gap-3">
                <PrimaryButton type="submit" disabled={savingPassword || !currentPassword || !newPassword}>
                  {savingPassword ? 'Changing...' : 'Change password'}
                </PrimaryButton>
                {success(passwordMsg)}
                {failure(passwordError)}
              </div>
            </form>
          </Section>

          <Section title="Preferences" description="Saved on this device only.">
            <Toggle
              label="Read AI Assistant replies aloud"
              hint="When on, the AI Assistant opens with voice replies switched on. You can still turn them off there."
              checked={voiceReplies}
              onChange={(on) => {
                setVoiceReplies(on)
                writePref('scriptmark_voice_replies', on)
              }}
            />
          </Section>

          <Section title="Grading scale" description="Used for grades on the result sheet and in analytics. Pass is 40 (grade E).">
            <div className="max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <tbody>
                  {GRADE_SCALE.map(([grade, range]) => (
                    <tr key={grade} className="border-b border-slate-100 last:border-b-0">
                      <td className="w-16 px-4 py-2 font-semibold text-slate-900">{grade}</td>
                      <td className="px-4 py-2 text-slate-600">{range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useStructure } from '../lib/structure.js'
import DepartmentPicker from './DepartmentPicker.jsx'
import { PrimaryButton } from './ui.jsx'

// Accounts made before faculties and departments existed are asked once,
// after the server has confirmed their profile. It cannot be skipped,
// because the Admin page groups lecturers by department.
export default function ProfilePrompt() {
  const { user, roleChecked, updateProfile } = useAuth()
  const { structure } = useStructure()
  const [departmentId, setDepartmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!user || !roleChecked || user.department || !structure?.faculties.length) return null

  async function save(e) {
    e.preventDefault()
    if (!departmentId) return setError('Select your faculty and department.')
    setSaving(true)
    setError('')
    try {
      await updateProfile({ departmentId })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-prompt-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="profile-prompt-title" className="text-lg font-semibold text-slate-900">
          Your department
        </h2>
        <p className="mt-1 text-sm text-slate-500">{structure.institution?.name}</p>
        <div className="mt-5">
          <DepartmentPicker structure={structure} value={departmentId} onChange={setDepartmentId} required />
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end">
          <PrimaryButton type="submit" disabled={saving || !departmentId}>
            {saving ? 'Saving...' : 'Save'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}

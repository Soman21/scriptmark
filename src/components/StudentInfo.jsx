import { useEffect, useState } from 'react'
import { Pencil, Check, X, AlertCircle } from 'lucide-react'
import { Badge } from './ui.jsx'
import { api } from '../lib/api.js'
import { regNumberNeedsCheck } from '../lib/regNumber.js'

// The student's name and reg number at the top of a script in Results,
// with an edit button: the front page is read by OCR, so a misread reg
// number can be put right here. A corrected reg number is matched to the
// class list again on the server, which may fill in the name.
export default function StudentInfo({ script, token, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [reg, setReg] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setEditing(false)
    setError('')
  }, [script.id])

  function edit() {
    setName(script.studentName || '')
    setReg(script.regNumber || '')
    setError('')
    setEditing(true)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const updated = await api.updateStudentInfo(script.id, { studentName: name.trim(), regNumber: reg.trim() }, token)
      onSaved({ studentName: updated.studentName, regNumber: updated.regNumber, studentIdentifier: updated.studentIdentifier, classListEntryId: updated.classListEntryId })
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-wrap items-center gap-2">
        <input
          value={reg}
          onChange={(e) => setReg(e.target.value)}
          placeholder="Reg number"
          aria-label="Reg number"
          autoFocus
          className="w-40 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-400"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          aria-label="Student name"
          className="w-44 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-400"
        />
        <button type="submit" disabled={saving} aria-label="Save" title="Save" className="rounded-lg bg-brand-600 p-1.5 text-white hover:bg-brand-500 disabled:opacity-50">
          <Check size={16} />
        </button>
        <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" title="Cancel" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
          <X size={16} />
        </button>
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </form>
    )
  }

  const check = regNumberNeedsCheck(script.regNumber)
  return (
    <>
      <p className="truncate text-base font-semibold text-slate-900">
        {script.studentName || script.regNumber || 'Unnamed script'}
      </p>
      {script.studentName && script.regNumber && <span className="text-sm text-slate-500">{script.regNumber}</span>}
      {check && (
        <Badge tone="amber">
          <AlertCircle size={12} /> Check reg no.
        </Badge>
      )}
      <button onClick={edit} aria-label="Edit name and reg number" title="Edit name and reg number" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
        <Pencil size={14} />
      </button>
    </>
  )
}

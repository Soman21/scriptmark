import { useEffect, useId, useState } from 'react'
import { facultyOf } from '../lib/structure.js'

const selectClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400'

// Faculty first, then the departments of that faculty.
export default function DepartmentPicker({ structure, value, onChange, required = false }) {
  const [facultyId, setFacultyId] = useState(() => facultyOf(structure, value)?.id || '')
  // Unique ids, so two pickers on one screen never share a label.
  const uid = useId()

  useEffect(() => {
    const f = facultyOf(structure, value)
    if (f) setFacultyId(f.id)
  }, [structure, value])

  const faculty = structure?.faculties.find((f) => f.id === facultyId)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${uid}faculty`} className="text-sm font-medium text-slate-700">
          Faculty
        </label>
        <select
          id={`${uid}faculty`}
          required={required}
          value={facultyId}
          disabled={!structure}
          onChange={(e) => {
            setFacultyId(e.target.value)
            onChange('')
          }}
          className={`mt-1.5 ${selectClass}`}
        >
          <option value="">{structure ? 'Select faculty' : 'Loading...'}</option>
          {structure?.faculties.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}department`} className="text-sm font-medium text-slate-700">
          Department
        </label>
        <select
          id={`${uid}department`}
          required={required}
          value={value || ''}
          disabled={!faculty}
          onChange={(e) => onChange(e.target.value)}
          className={`mt-1.5 ${selectClass}`}
        >
          <option value="">Select department</option>
          {faculty?.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

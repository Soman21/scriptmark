import { useEffect, useState } from 'react'
import { api } from './api.js'

// Faculties and departments change rarely, so they are fetched once per
// page load and shared by every form that needs them.
let cached = null
let pending = null

export function loadStructure() {
  if (cached) return Promise.resolve(cached)
  if (!pending) {
    pending = api
      .getStructure()
      .then((s) => (cached = s))
      .finally(() => (pending = null))
  }
  return pending
}

export function useStructure() {
  const [structure, setStructure] = useState(cached)
  const [error, setError] = useState('')
  useEffect(() => {
    if (cached) return
    loadStructure()
      .then(setStructure)
      .catch((err) => setError(err.message))
  }, [])
  return { structure, error }
}

export const facultyOf = (structure, departmentId) =>
  structure?.faculties.find((f) => f.departments.some((d) => d.id === departmentId)) || null

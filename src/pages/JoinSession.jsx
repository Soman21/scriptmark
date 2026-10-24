import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

// The link in an invite email. Once signed in (or signed up), the lecturer
// lands here, joins with the code in the link and goes straight to the session.
export default function JoinSession() {
  const { code } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .joinSession(code, token)
      .then((session) => {
        if (cancelled) return
        localStorage.setItem('scriptmark_active_session', session.id)
        localStorage.setItem('scriptmark_active_session_title', session.title)
        navigate(`/sessions/${session.id}/claim-questions`, { replace: true })
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-500">
      {error ? (
        <>
          <AlertCircle size={20} className="text-rose-400" />
          <p className="max-w-sm">{error}</p>
          <Link to="/" className="font-medium text-brand-600 hover:text-brand-700">
            Go to your dashboard
          </Link>
        </>
      ) : (
        <>
          <Loader2 size={18} className="animate-spin" /> Joining the session...
        </>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import LogoMark from './LogoMark.jsx'
import { CONTACT } from '../lib/site.js'

const PRODUCT = [
  ['Why ScriptMark', '#why'],
  ['How it works', '#how'],
  ['Features', '#features'],
  ['Accuracy', '#accuracy'],
]

// Footer shared by the landing page and the public Contact and Privacy
// pages. On the landing page onSection scrolls in place; elsewhere the
// section links go back to the landing page at that section.
export default function SiteFooter({ onSection }) {
  const linkClass = 'text-sm text-slate-500 hover:text-slate-900'
  const section = (label, hash) =>
    onSection ? (
      <a href={hash} onClick={(e) => onSection(e, hash)} className={linkClass}>
        {label}
      </a>
    ) : (
      <Link to={{ pathname: '/', hash }} className={linkClass}>
        {label}
      </Link>
    )

  return (
    <footer className="border-t border-slate-200 bg-white font-body">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-xl font-semibold tracking-tight text-slate-900">ScriptMark</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
            The AI marking assistant for handwritten exams. The AI suggests, the lecturer decides.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Product</p>
          <ul className="mt-4 space-y-2.5">
            {PRODUCT.map(([l, h]) => (
              <li key={l}>{section(l, h)}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Company</p>
          <ul className="mt-4 space-y-2.5">
            <li>{section('For departments', '#institutions')}</li>
            <li>{section('FAQ', '#faq')}</li>
            <li>
              <Link to="/contact" className={linkClass}>Contact</Link>
            </li>
            <li>
              <Link to="/privacy" className={linkClass}>Privacy policy</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Account</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link to="/login" className={linkClass}>Sign in</Link>
            </li>
            <li>
              <Link to="/signup" className={linkClass}>Create account</Link>
            </li>
            <li>
              <Link to="/forgotPassword" className={linkClass}>Reset password</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} ScriptMark</span>
          <span>Built at {CONTACT.institution}, Awka</span>
        </div>
      </div>
    </footer>
  )
}

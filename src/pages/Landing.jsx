import { Link } from 'react-router-dom'
import {
  ScanLine,
  Sparkles,
  CheckCircle2,
  Users,
  BarChart3,
  FileSpreadsheet,
  Calculator,
  ShieldCheck,
  ArrowRight,
  Contact,
} from 'lucide-react'

// Public home page for signed out visitors. Signed in users get the
// Dashboard at the same address (see HomeRoute in App.jsx).

const STEPS = [
  { icon: ScanLine, title: 'Scan', text: 'Photograph or upload each answer booklet, one page at a time or as a whole PDF.' },
  { icon: Contact, title: 'Identify', text: 'The reg number is read off the front page and matched to the class list or attendance sheet.' },
  { icon: Sparkles, title: 'Suggest', text: 'Handwriting is read and every answer gets a suggested score, a reason and a confidence level.' },
  { icon: CheckCircle2, title: 'Confirm', text: 'A lecturer checks each suggestion beside the script and confirms or corrects it.' },
]

const FEATURES = [
  { icon: Calculator, title: 'Step by step marking', text: 'Calculation questions are marked step by step against your rubric, and reread from the page image when the working is mathematical.' },
  { icon: ShieldCheck, title: 'Lecturers stay in charge', text: 'Every score is a suggestion until a person confirms it. Changes to a confirmed score need a reason and are kept on record.' },
  { icon: Users, title: 'Mark as a team', text: 'Invite colleagues with a join code, split questions between markers, and follow progress from one overview.' },
  { icon: BarChart3, title: 'Analytics that matter', text: 'Grade spread, pass rate, question quality and how closely the AI agrees with the lecturers who confirmed its scores.' },
  { icon: FileSpreadsheet, title: 'Ready result sheets', text: 'Export to Excel or PDF with CA added and grades on the institution scale, once any name clashes are resolved.' },
  { icon: Sparkles, title: 'Ask the assistant', text: 'Ask in plain words how a session is going, how a student did, or which question the class found hardest.' },
]

function Preview() {
  // A small, static picture of the review screen, drawn in markup so it
  // stays sharp at any size and needs no image file.
  return (
    <div className="relative mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white p-4 text-left shadow-2xl shadow-sky-950/40">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">ADA OKAFOR</p>
          <p className="text-xs text-slate-500">2017364085</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Needs review</span>
      </div>
      <div className="mt-4 space-y-3">
        {[
          { q: 'Question 1a', conf: 'High confidence', tone: 'bg-emerald-100 text-emerald-700', score: '4', max: '5' },
          { q: 'Question 2', conf: 'Medium confidence', tone: 'bg-amber-100 text-amber-700', score: '7', max: '10' },
        ].map((row) => (
          <div key={row.q} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-sky-600">{row.q}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${row.tone}`}>{row.conf}</span>
              </div>
              <span className="rounded-md border border-slate-200 px-2 py-0.5 text-sm font-semibold text-slate-900">
                {row.score} <span className="font-normal text-slate-400">/ {row.max}</span>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="h-10 rounded-md bg-slate-100" />
              <div className="h-10 rounded-md bg-sky-50" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="text-sm text-slate-500">
          Total <span className="font-semibold text-slate-900">11</span> / 15
        </p>
        <span className="rounded-lg bg-ink-950 px-3 py-1.5 text-xs font-medium text-white">Confirm All Scores</span>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="h-screen overflow-y-auto bg-white text-slate-900">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <span className="text-lg font-semibold tracking-tight text-white">ScriptMark</span>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">
              Sign in
            </Link>
            <Link to="/signup" className="rounded-lg bg-sky-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-400">
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-ink-950">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-28 sm:px-6 lg:grid-cols-2 lg:pb-28 lg:pt-36">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-300">
              <Sparkles size={13} /> AI assisted marking for handwritten scripts
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Mark exam scripts faster, <span className="text-sky-400">without giving up the final say.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              ScriptMark reads handwritten answer booklets, suggests a score for every answer with its reasons, and
              leaves the decision to the lecturer. It works the way Nigerian universities mark, with reg numbers, CA and the A to F scale.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400"
              >
                Get started <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
                Sign in
              </Link>
            </div>
          </div>
          <Preview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-sm font-semibold text-sky-600">How it works</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">From answer booklet to result sheet</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Icon size={18} />
                </span>
                <span className="text-xs font-semibold text-slate-400">Step {i + 1}</span>
              </div>
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-sm font-semibold text-sky-600">Features</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Everything a marking session needs</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <Icon size={20} className="text-sky-600" />
                <p className="mt-4 font-semibold">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-ink-950 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">The AI suggests. The lecturer decides.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Create a session, upload your marking guide, and scan your first script in a few minutes.
          </p>
          <Link
            to="/signup"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400"
          >
            Create your account <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-semibold text-slate-700">ScriptMark</span>
          <span>A Master's research project in Electronic and Computer Engineering.</span>
        </div>
      </footer>
    </div>
  )
}

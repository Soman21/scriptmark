import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import LogoMark from '../components/LogoMark.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import {
  ArrowRight,
  Clock,
  Scale,
  Building2,
  XCircle,
  Target,
  FileCheck2,
  Layers,
  Check,
  CheckCircle2,
  Contact,
  Sparkles,
  ShieldCheck,
  BarChart3,
  FileSpreadsheet,
  Smartphone,
  Menu,
  X,
  ChevronDown,
  Eye,
  History,
  Gauge,
  KeyRound,
} from 'lucide-react'

// Public home page for signed out visitors. Signed in users get the
// Dashboard at the same address (see HomeRoute in App.jsx). Every product
// picture here is drawn in markup rather than a screenshot, so it stays
// sharp, loads instantly and never shows a real student's details.

/* ---------- small building blocks ---------- */

// Fades a section up the first time it scrolls into view.
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return setShown(true)
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

function Eyebrow({ children, dark = false }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? 'text-sky-300' : 'text-sky-600'}`}>{children}</p>
  )
}

// Serif italic accent inside a display headline.
function Accent({ children, dark = false }) {
  return <span className={`block font-serif font-normal italic tracking-normal ${dark ? 'text-sky-300' : 'text-sky-600'}`}>{children}</span>
}

function SectionHeading({ eyebrow, title, text, dark = false, center = false }) {
  return (
    <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h2
        className={`mt-4 font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-5xl ${
          dark ? 'text-white' : 'text-slate-950'
        }`}
      >
        {title}
      </h2>
      {text && <p className={`mt-5 text-base leading-relaxed sm:text-lg ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{text}</p>}
    </div>
  )
}

const Hand = ({ children, className = '' }) => (
  <span className={`font-hand text-[1.15em] leading-snug text-indigo-900 ${className}`}>{children}</span>
)

function Pill({ tone = 'slate', children }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  }
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>
}

/* ---------- product mockups ---------- */

function BrowserFrame({ children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(2,8,23,0.55)] ring-1 ring-slate-900/10 ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="ml-3 hidden rounded-md bg-white px-3 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200 sm:block">
          scriptmark.app/sessions/ece512/results
        </span>
      </div>
      {children}
    </div>
  )
}

// A drawn answer booklet page with "handwriting", used in several mockups.
function ScriptPage({ compact = false }) {
  return (
    <div className="relative h-full overflow-hidden rounded-lg bg-[#fffdf7] p-4 ring-1 ring-amber-900/10 [background-image:repeating-linear-gradient(transparent,transparent_27px,#e8eef6_28px)]">
      <div className="absolute inset-y-0 left-8 w-px bg-rose-200" />
      <div className="relative space-y-2 pl-6 text-sm">
        <Hand className="block font-semibold">Q2.</Hand>
        <Hand className="block">X[k] = Σ x[n] e^(−j2πkn/4)</Hand>
        <Hand className="block">X[0] = 1 + 2 + 0 + 1 = 4</Hand>
        <Hand className="block">X[1] = 1 − 2j + 0 + j = 1 − j</Hand>
        {!compact && (
          <>
            <Hand className="block">X[2] = 1 − 2 + 0 − 1 = −2</Hand>
            <Hand className="block">X[3] = 1 + j</Hand>
            <Hand className="mt-3 block font-semibold">Q3.</Hand>
            <Hand className="block">H(s) = ωc / (s + ωc)</Hand>
            <Hand className="block">s = 2/T · (z − 1)/(z + 1)</Hand>
          </>
        )}
      </div>
    </div>
  )
}

function ScoreCard({ q, conf, tone, score, max, steps, highlight = false }) {
  return (
    <div className={`rounded-xl border bg-white p-3.5 ${highlight ? 'border-sky-300 ring-4 ring-sky-100' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs font-semibold text-sky-600">{q}</span>
          <Pill tone={tone}>{conf}</Pill>
        </div>
        <span className="whitespace-nowrap rounded-md border border-slate-200 px-2 py-0.5 text-sm font-semibold text-slate-900">
          {score} <span className="font-normal text-slate-400">/ {max}</span>
        </span>
      </div>
      {steps && (
        <div className="mt-2.5 space-y-1.5">
          {steps.map(([label, got, of]) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className={`h-1.5 w-1.5 rounded-full ${got === of ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                {label}
              </span>
              <span className="font-medium text-slate-700">
                {got} / {of}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HeroMockup() {
  return (
    <div className="relative">
      <BrowserFrame>
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr]">
          <div className="hidden min-h-full bg-ink-950 p-3 sm:block">
            <div className="flex items-center gap-2">
              <LogoMark className="h-5 w-5" />
              <span className="text-xs font-semibold text-white">ScriptMark</span>
            </div>
            <div className="mt-4 rounded-md bg-sky-500 py-1.5 text-center text-[10px] font-medium text-white">New session</div>
            <div className="mt-4 space-y-1.5">
              {['Dashboard', 'Marking Guides', 'Cohort Analytics', 'AI Assistant'].map((t) => (
                <div key={t} className="rounded px-2 py-1 text-[10px] text-slate-400">{t}</div>
              ))}
            </div>
            <p className="mt-4 px-2 text-[9px] uppercase tracking-wider text-slate-600">Sessions</p>
            <div className="mt-1 rounded bg-white/10 px-2 py-1 text-[10px] text-white">ECE512 Digital Signal…</div>
            <div className="px-2 py-1 text-[10px] text-slate-400">ECE305 Control Systems</div>
          </div>
          <div className="bg-slate-50">
            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] text-slate-400">Sessions › ECE512</p>
              <p className="text-sm font-semibold text-slate-900">ECE512 Digital Signal Processing</p>
              <div className="mt-2 flex gap-1 overflow-hidden whitespace-nowrap text-[10px]">
                {['Scan Scripts', 'Marking Progress', 'Results', 'Analytics'].map((t) => (
                  <span key={t} className={`rounded-md px-2 py-1 ${t === 'Results' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{t}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900">ADA OKAFOR</span>
                <span className="text-[11px] text-slate-500">2017364085</span>
                <Pill tone="amber">Needs review</Pill>
              </div>
              <span className="hidden text-[10px] text-slate-400 sm:block">Script 12 of 46</span>
            </div>
            <div className="grid gap-3 p-3 sm:grid-cols-[1fr_1.1fr] sm:p-4">
              <div className="h-56 sm:h-72">
                <ScriptPage />
              </div>
              <div className="space-y-2.5">
                <ScoreCard q="Question 1a" conf="High confidence" tone="green" score="4" max="5" />
                <ScoreCard
                  q="Question 2"
                  conf="Medium confidence"
                  tone="amber"
                  score="7"
                  max="10"
                  highlight
                  steps={[
                    ['States the DFT formula', 3, 3],
                    ['Computes all four values', 4, 7],
                  ]}
                />
                <div className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-slate-200">
                  <span className="text-xs text-slate-500">
                    Total <span className="text-sm font-semibold text-slate-900">11</span> / 15
                  </span>
                  <span className="rounded-md bg-ink-950 px-2.5 py-1 text-[10px] font-medium text-white">Confirm All Scores</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BrowserFrame>

      <div className="absolute -left-4 top-24 hidden w-56 rounded-xl bg-white p-3 shadow-xl ring-1 ring-slate-900/10 lg:block xl:-left-14">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <Contact size={13} className="text-sky-500" /> Front page read
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">2017364085</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
          <CheckCircle2 size={12} /> Matched to class list
        </p>
      </div>
      <div className="absolute -bottom-6 -right-3 hidden w-60 rounded-xl bg-white p-3 shadow-xl ring-1 ring-slate-900/10 lg:block xl:-right-10">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <Sparkles size={13} className="text-violet-500" /> AI reasoning
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">All four values are right, but the working for X[1] skips the sum. 4 of 7 for this step.</p>
      </div>
    </div>
  )
}

/* ---------- question type tabs ---------- */

const QUESTION_TYPES = [
  {
    key: 'short',
    label: 'Short answer',
    question: 'Define the z transform of a discrete time signal and state one property.',
    answer: ['X(z) = Σ x[n] z^−n over all n.', 'It is linear: a x₁ + b x₂ → a X₁ + b X₂.'],
    score: '4 / 5',
    conf: ['High confidence', 'green'],
    reason: 'Correct definition and a valid property. The region of convergence is not mentioned, so one mark is held back.',
  },
  {
    key: 'calc',
    label: 'Calculation',
    question: 'Find the DFT of x[n] = {1, 2, 0, 1}.',
    answer: ['X[0] = 4', 'X[1] = 1 − j', 'X[2] = −2', 'X[3] = 1 + j'],
    score: '7 / 10',
    conf: ['Medium confidence', 'amber'],
    reason: 'Marked step by step against the rubric, and reread straight from the page image because the working is mathematical.',
    steps: [
      ['States the DFT formula', '3 / 3'],
      ['Computes all four values', '4 / 7'],
    ],
  },
  {
    key: 'essay',
    label: 'Explain or discuss',
    question: 'Explain why aliasing occurs and how it is prevented in practice.',
    answer: ['Aliasing happens when a signal is sampled', 'below twice its highest frequency, so high', 'frequencies fold back as false low ones.', 'An anti aliasing low pass filter is used.'],
    score: '8 / 10',
    conf: ['High confidence', 'green'],
    reason: 'Covers the Nyquist condition and the filter. No example frequencies are given, which the marking guide asks for.',
  },
]

function QuestionTypes() {
  const [active, setActive] = useState(QUESTION_TYPES[1].key)
  const t = QUESTION_TYPES.find((x) => x.key === active)
  return (
    <div>
      <div role="tablist" aria-label="Question types" className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {QUESTION_TYPES.map((x) => (
          <button
            key={x.key}
            role="tab"
            aria-selected={x.key === active}
            onClick={() => setActive(x.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              x.key === active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Student's script</p>
          <div className="mt-2 rounded-lg bg-[#fffdf7] p-4 ring-1 ring-amber-900/10 [background-image:repeating-linear-gradient(transparent,transparent_27px,#e8eef6_28px)]">
            {t.answer.map((line) => (
              <Hand key={line} className="block">
                {line}
              </Hand>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">What the lecturer sees</p>
          <div className="mt-2 rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">{t.question}</p>
              <span className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-sm font-semibold text-slate-900">{t.score}</span>
            </div>
            <div className="mt-2">
              <Pill tone={t.conf[1]}>{t.conf[0]}</Pill>
            </div>
            {t.steps && (
              <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {t.steps.map(([s, m]) => (
                  <div key={s} className="flex justify-between px-3 py-2 text-sm">
                    <span className="text-slate-600">{s}</span>
                    <span className="font-medium text-slate-800">{m}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              <span className="text-slate-400">AI reasoning: </span>
              {t.reason}
            </p>
            <div className="mt-4 flex gap-2">
              <span className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">Confirm</span>
              <span className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">Change score</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- feature rows ---------- */

function IdentifyMockup() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="rounded-lg border border-slate-300 bg-[#fbfbf8] p-4">
        <p className="text-center text-[11px] font-bold tracking-wide text-slate-700">ANSWER BOOKLET</p>
        <div className="mt-3 space-y-3">
          <div>
            <div className="rounded border-2 border-sky-400 bg-sky-50/60 px-3 py-1.5">
              <Hand>2025366001 FN</Hand>
            </div>
            <p className="mt-0.5 text-center text-[9px] font-semibold tracking-wide text-slate-500">STUDENT'S REG. NO</p>
          </div>
          <div>
            <div className="rounded border border-slate-300 px-3 py-1.5">
              <Hand>ECE 512</Hand>
            </div>
            <p className="mt-0.5 text-center text-[9px] font-semibold tracking-wide text-slate-500">COURSE CODE</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
        <CheckCircle2 className="shrink-0 text-emerald-600" size={20} />
        <div className="text-sm">
          <p className="font-semibold text-slate-900">CHIDI EZE</p>
          <p className="text-slate-600">2025366001FN, postgraduate, matched from the attendance sheet</p>
        </div>
      </div>
    </div>
  )
}

function AnalyticsMockup() {
  const bars = [7, 9, 12, 6, 5, 7]
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Pass rate', '84.8%'],
          ['Average', '54.6'],
          ['Quadratic kappa', '0.89'],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-slate-200 p-3">
            <p className="text-[11px] text-slate-500">{l}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex h-32 items-end gap-3 border-b border-slate-200 px-2">
        {bars.map((b, i) => (
          <div key={i} className="flex h-full flex-1 items-end">
            <div className={`w-full rounded-t-md ${i === 5 ? 'bg-rose-400' : 'bg-sky-500'}`} style={{ height: `${(b / 12) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-3 px-2 text-center text-[11px] text-slate-400">
        {['A', 'B', 'C', 'D', 'E', 'F'].map((g) => (
          <span key={g} className="flex-1">{g}</span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs ring-1 ring-amber-200">
        <span className="text-slate-700">Q1a barely separates strong and weak answers</span>
        <Pill tone="amber">Review question</Pill>
      </div>
    </div>
  )
}

function TeamMockup() {
  const markers = [
    ['Dr. A. Obi', 'Q1 to Q3', 82],
    ['Mr. K. Eze', 'Q4 and Q5', 64],
    ['Mrs. N. Uche', 'Q6', 41],
  ]
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Coordinator Overview</p>
        <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
          <KeyRound size={12} /> K3M7QZ
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {markers.map(([n, q, p]) => (
          <div key={n}>
            <div className="flex justify-between text-sm">
              <span className="text-slate-800">{n}</span>
              <span className="text-slate-500">{q}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${p}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeatureRow({ eyebrow, title, text, points, visual, flip = false }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal className={flip ? 'lg:order-2' : ''}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-4 font-display text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.02em] text-slate-950 sm:text-4xl">{title}</h3>
        <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">{text}</p>
        <ul className="mt-6 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-sm text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <Check size={12} strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={120} className={flip ? 'lg:order-1' : ''}>
        {visual}
      </Reveal>
    </div>
  )
}

/* ---------- FAQ ---------- */

const FAQS = [
  ['Does the AI give the final mark?', 'No. Every score is a suggestion with its reasoning until a lecturer confirms it. A coordinator can choose to auto accept only high confidence scores for a session, and can switch that off at any time.'],
  ['Do students need special answer sheets?', 'No. ScriptMark reads the answer booklets you already use. There are no bubble sheets, QR codes or templates to print. Scan with a phone camera, upload photos, or upload a whole PDF.'],
  ['Which universities is it built for?', 'ScriptMark was designed around the answer booklets and reg number formats of Nigerian universities, starting with Nnamdi Azikiwe University. Any booklet with a reg number on the cover works.'],
  ['How does it know whose script it is?', 'It reads the reg number from the front page, including undergraduate numbers like 2017364085 and postgraduate numbers like 2025366001FN, then takes the name from your class list or attendance sheet.'],
  ['Can it mark calculations and derivations?', 'Yes. Questions can carry a step by step rubric, so correct working earns credit even when the final answer is wrong. Mathematical answers are reread straight from the page image.'],
  ['What if the AI gets a score wrong?', 'You change it before confirming. If a confirmed score is changed later, a reason is required and the old score stays on record. The Analytics page shows exactly how often the AI agreed with you.'],
  ['Can several lecturers mark one exam?', 'Yes. The coordinator shares a join code, markers claim the questions they will mark, and the coordinator follows everyone from one overview.'],
  ['Is there anything to install?', 'No. ScriptMark runs in the browser on a laptop, tablet or phone. Create a session, add your marking guide, and start scanning.'],
]

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {FAQS.map(([q, a], i) => (
        <div key={q}>
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
          >
            <span className="font-medium text-slate-900">{q}</span>
            <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600 sm:px-6">{a}</p>}
        </div>
      ))}
    </div>
  )
}

/* ---------- page ---------- */

const NAV = [
  ['Why ScriptMark', '#why'],
  ['How it works', '#how'],
  ['Features', '#features'],
  ['For institutions', '#institutions'],
  ['FAQ', '#faq'],
]

const PAINS = [
  {
    icon: Layers,
    title: 'The pile never shrinks',
    text: 'One course can mean hundreds of booklets, each with several answers to read, judge and total by hand, all inside a tight results deadline.',
  },
  {
    icon: Scale,
    title: 'Fatigue moves the mark',
    text: 'The two hundredth script rarely gets the attention the first one did. Students feel the difference, and so do moderators.',
  },
  {
    icon: Clock,
    title: 'Results stall after marking',
    text: 'Scores are retyped into spreadsheets, CA is added by hand, and every transfer is another chance for an error or a delay.',
  },
]

const COMPARE = [
  ['Reading the scripts', 'Every answer read line by line, by hand', 'Every answer read and scored for you, with its reasons'],
  ['Applying the guide', 'Drifts with fatigue across the pile', 'The same guide applied to the first script and the last'],
  ['Knowing whose script it is', 'Names copied from covers, one by one', 'Reg number read off the cover and matched to the class list'],
  ['Totals, CA and grades', 'Added up and retyped by hand', 'Calculated and graded automatically'],
  ['The result sheet', 'Built in a spreadsheet after marking ends', 'Ready to export the moment you confirm'],
  ['Moderation', 'Hard to see who changed what, or why', 'Every change recorded, with a reason'],
]

const PILLARS = [
  { icon: Clock, title: 'Results out sooner', text: 'Hours of reading become a focused review. The result sheet builds itself as you confirm.' },
  { icon: Target, title: 'One standard for every script', text: 'Your marking guide is applied the same way to every student, so position in the pile never decides a grade.' },
  { icon: ShieldCheck, title: 'The lecturer decides', text: 'Nothing counts until you confirm it. Every suggestion comes with its reasons and an honest confidence level.' },
  { icon: FileCheck2, title: 'Evidence for every mark', text: 'Reasons, confidence and a full change history sit behind every score, ready for moderation and appeals.' },
]

const STEPS = [
  { icon: Smartphone, title: 'Scan', text: 'Photograph booklets with a phone or upload a PDF. Your usual booklets, nothing special to print.' },
  { icon: Contact, title: 'Identify', text: 'The reg number is read off the cover and matched to your class list, so every script has a name.' },
  { icon: Sparkles, title: 'Suggest', text: 'Every answer is marked against your guide, with a score, its reasons and a confidence level.' },
  { icon: CheckCircle2, title: 'Confirm', text: 'Review beside the script, adjust anything you disagree with, confirm, and export the result sheet.' },
]

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef(null)

  // Arriving from another page at /#section (for example from the footer
  // on the Contact page) scrolls to that section.
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView())
  }, [hash])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 12)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  function goTo(e, hash) {
    e.preventDefault()
    setMenuOpen(false)
    // Scroll once the mobile menu has closed, otherwise its height is
    // counted in and the page lands past the section.
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })))
  }

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto scroll-smooth bg-white font-body text-slate-900 antialiased">
      {/* Navigation */}
      <header
        className={`sticky top-0 z-40 transition-colors ${
          scrolled || menuOpen ? 'border-b border-white/10 bg-ink-950/[0.97] shadow-lg shadow-black/10 backdrop-blur-md' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" onClick={(e) => goTo(e, '#top')} className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-xl font-semibold tracking-tight text-white">ScriptMark</span>
          </a>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map(([label, hash]) => (
              <a key={hash} href={hash} onClick={(e) => goTo(e, hash)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:text-white">
              Sign in
            </Link>
            <Link to="/signup" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-100">
              Start marking
            </Link>
          </div>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 px-4 pb-5 pt-2 lg:hidden">
            {NAV.map(([label, hash]) => (
              <a key={hash} href={hash} onClick={(e) => goTo(e, hash)} className="block rounded-lg px-3 py-2.5 text-base font-medium text-slate-200">
                {label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/login" className="rounded-full border border-white/15 py-2.5 text-center text-sm font-semibold text-white">
                Sign in
              </Link>
              <Link to="/signup" className="rounded-full bg-white py-2.5 text-center text-sm font-semibold text-slate-950">
                Start marking
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="top" className="relative -mt-16 overflow-hidden bg-ink-950 pt-16">
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[560px] w-[1100px] -translate-x-1/2 rounded-full bg-sky-500/25 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 sm:pt-24 lg:px-8 lg:pb-32">
          <div className="mx-auto max-w-5xl text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-sky-200 sm:text-sm">
                <Sparkles size={14} /> The AI marking assistant for universities that examine on paper
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-8 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.6rem]">
                The new standard for marking <br className="hidden md:block" />
                <span className="bg-gradient-to-r from-sky-300 via-sky-400 to-cyan-300 bg-clip-text pr-2 font-serif font-normal italic tracking-normal text-transparent">
                  handwritten exams.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-xl">
                ScriptMark reads every answer booklet, marks each answer against your own guide, explains every score and
                hands you a finished result sheet. Students get results sooner, departments get marks they can defend, and
                the lecturer signs off on every one.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-sky-500/30 transition hover:bg-sky-400 sm:w-auto"
                >
                  Start your first session <ArrowRight size={18} />
                </Link>
                <a
                  href="#how"
                  onClick={(e) => goTo(e, '#how')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto"
                >
                  See it in action
                </a>
              </div>
            </Reveal>
            <Reveal delay={300}>
              <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-slate-400">
                {['Works with the booklets you already use', 'Every mark confirmed by a lecturer', 'Nothing to install'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-sky-400" /> {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={200} className="mx-auto mt-16 max-w-5xl">
            <HeroMockup />
          </Reveal>
        </div>
      </section>

      {/* The problem */}
      <section id="why" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <Reveal>
            <SectionHeading
              center
              eyebrow="Why ScriptMark"
              title={
                <>
                  Paper exams are here to stay. <Accent>The marking burden is not.</Accent>
                </>
              }
              text="Universities still examine in handwriting, and that will not change soon. What has to change is how long marking takes, how consistent it is, and how much of it depends on one tired lecturer."
            />
          </Reveal>
          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {PAINS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 90}>
                <div className="group h-full rounded-3xl border border-slate-200 bg-slate-50/60 p-7 transition hover:border-slate-300 hover:bg-white hover:shadow-xl hover:shadow-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-sm ring-1 ring-slate-200">
                      <Icon size={20} />
                    </span>
                    <span className="font-display text-sm font-semibold text-slate-300">0{i + 1}</span>
                  </div>
                  <p className="mt-6 font-display text-xl font-semibold tracking-tight text-slate-950">{title}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Before and after */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="What changes"
              title={
                <>
                  Same exam. Same booklets. <Accent>A completely different week.</Accent>
                </>
              }
            />
          </Reveal>
          <Reveal delay={100} className="mt-14">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="hidden grid-cols-[1fr_1.2fr_1.2fr] border-b border-slate-200 bg-slate-50/80 text-sm font-semibold md:grid">
                <div className="px-6 py-4 text-slate-500" />
                <div className="px-6 py-4 text-slate-500">Marking by hand</div>
                <div className="flex items-center gap-2 px-6 py-4 text-sky-700">
                  <LogoMark className="h-5 w-5" /> With ScriptMark
                </div>
              </div>
              {COMPARE.map(([area, before, after]) => (
                <div key={area} className="grid gap-2 border-b border-slate-100 px-5 py-5 last:border-b-0 md:grid-cols-[1fr_1.2fr_1.2fr] md:gap-0 md:p-0">
                  <div className="font-display font-semibold text-slate-950 md:px-6 md:py-5">{area}</div>
                  <div className="flex items-start gap-2.5 text-[15px] text-slate-500 md:px-6 md:py-5">
                    <XCircle size={17} className="mt-0.5 shrink-0 text-slate-300" /> {before}
                  </div>
                  <div className="flex items-start gap-2.5 text-[15px] font-medium text-slate-800 md:bg-sky-50/40 md:px-6 md:py-5">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-sky-500" /> {after}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Value pillars */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <Reveal>
              <SectionHeading
                eyebrow="Built for lecturers"
                title={
                  <>
                    Mark faster. Mark fairer. <Accent>Stay in charge.</Accent>
                  </>
                }
                text="ScriptMark does the reading, totalling and paperwork. You keep the judgement that only a lecturer should make."
              />
              <Link to="/signup" className="mt-9 inline-flex items-center gap-2 rounded-full bg-ink-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800">
                Start marking <ArrowRight size={16} />
              </Link>
            </Reveal>
            <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
              {PILLARS.map(({ icon: Icon, title, text }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/25">
                    <Icon size={22} />
                  </span>
                  <p className="mt-5 font-display text-xl font-semibold tracking-tight text-slate-950">{title}</p>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600">{text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative scroll-mt-16 overflow-hidden bg-ink-950">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-sky-500/15 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <Reveal>
            <SectionHeading
              center
              dark
              eyebrow="How it works"
              title={
                <>
                  From the pile on your desk <Accent dark>to a signed off result sheet.</Accent>
                </>
              }
              text="Four steps, whether the class has thirty students or three hundred."
            />
          </Reveal>
          <ol className="relative mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 90}>
                <li className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30">
                      <Icon size={20} />
                    </span>
                    <span className="font-serif text-3xl italic text-white/25">{i + 1}</span>
                  </div>
                  <p className="mt-6 font-display text-xl font-semibold text-white">{title}</p>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-slate-400">{text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Question types */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Every kind of question"
              title={
                <>
                  Definitions, calculations, essays. <Accent>Marked the way you would.</Accent>
                </>
              }
              text="Pick a question type to see what ScriptMark suggests, and exactly what you see before you confirm."
            />
          </Reveal>
          <Reveal delay={100} className="mt-12">
            <QuestionTypes />
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-7xl space-y-28 px-4 py-24 sm:px-6 sm:py-32 lg:space-y-36 lg:px-8">
          <FeatureRow
            eyebrow="Every script, the right student"
            title="Reg numbers read straight off the cover"
            text="No more copying names from booklet covers. ScriptMark reads the handwritten reg number, ignores the serial number and session boxes, and takes the student's name from your class list or a photo of the attendance sheet."
            points={[
              'Undergraduate and postgraduate reg numbers, with or without a slash',
              'Small reading slips are forgiven, a different year or suffix never is',
              'Course code, semester and session fill in from the cover when left blank',
            ]}
            visual={<IdentifyMockup />}
          />
          <FeatureRow
            flip
            eyebrow="Review in minutes, not hours"
            title="The script and the suggestion, side by side"
            text="Every answer arrives with the expected answer, what the student wrote, the AI's reasons and its confidence. The page stays in view while you work down the scores, and the scripts that need you most come first."
            points={[
              'Step by step rubrics give credit for correct working',
              'Mathematical working is reread from the page image itself',
              'Changing a confirmed score needs a reason, and the old score is kept',
            ]}
            visual={
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-64">
                    <ScriptPage compact />
                  </div>
                  <div className="space-y-2.5">
                    <ScoreCard
                      q="Q2"
                      conf="Medium"
                      tone="amber"
                      score="7"
                      max="10"
                      steps={[
                        ['States the formula', 3, 3],
                        ['Computes the values', 4, 7],
                      ]}
                    />
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-slate-700">
                      <p className="mb-1 font-semibold uppercase tracking-wide text-violet-500">Reread from page image</p>
                      X[1] = 1 − 2j + 0 + j = 1 − j
                    </div>
                  </div>
                </div>
              </div>
            }
          />
          <FeatureRow
            eyebrow="Know how the class really did"
            title="Analytics that improve the next exam"
            text="See the grade spread, pass rate and averages by programme and entry year the moment marking ends. Item analysis shows which questions truly separated strong answers from weak ones, and which ones need rewriting."
            points={[
              'Totals include CA, graded on the A to F scale',
              'Compare courses across semesters and sessions',
              'Ask the AI Assistant in plain words, like how did ECE512 go',
            ]}
            visual={<AnalyticsMockup />}
          />
        </div>
      </section>

      {/* Accuracy and trust */}
      <section id="accuracy" className="relative scroll-mt-16 overflow-hidden bg-ink-950">
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[420px] w-[700px] rounded-full bg-sky-500/15 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <Reveal>
            <SectionHeading
              dark
              eyebrow="Trust, measured"
              title={
                <>
                  An AI that is checked <Accent dark>on every single mark.</Accent>
                </>
              }
              text="Every confirmed score is a test of the AI. ScriptMark reports how often its suggestions matched the lecturer, using the same measures examiners use to compare two human markers. No black box, no blind trust."
            />
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [Gauge, 'Agreement', 'Exact and within one mark agreement, mean error and RMSE, per answer and per script.'],
              [BarChart3, "Cohen's kappa", 'Quadratic weighted kappa and Pearson r, the standard measures of marker reliability.'],
              [Eye, 'Honest confidence', 'Errors broken down by high, medium and low confidence, so you know when to look closer.'],
              [History, 'Full audit trail', 'Auto accepted scores are counted apart, and every change after confirmation is recorded.'],
            ].map(([Icon, t, s], i) => (
              <Reveal key={t} delay={i * 80}>
                <div className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                  <Icon size={22} className="text-sky-400" />
                  <p className="mt-5 font-display text-lg font-semibold text-white">{t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{s}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={150}>
            <div className="mt-10 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="flex items-start gap-3">
                <ShieldCheck size={22} className="mt-0.5 shrink-0 text-emerald-400" />
                <p className="text-[15px] leading-relaxed text-slate-300">
                  <span className="font-semibold text-white">The AI never has the last word.</span> Scores stay suggestions until a lecturer
                  confirms them, and exports are blocked while any student's name is still in doubt.
                </p>
              </div>
              <Link to="/signup" className="shrink-0 rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-sky-100">
                Try it on one course
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Institutions */}
      <section id="institutions" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <FeatureRow
            flip
            eyebrow="For departments and faculties"
            title={
              <>
                Results your department <Accent>can stand behind.</Accent>
              </>
            }
            text="Course coordinators run the whole exam from one place. Colleagues join with a code and claim the questions they will mark, and the coordinator follows progress, reviews changes and exports one final sheet for the exam officer."
            points={[
              'Full or limited access for each marker, approved by the coordinator',
              'Each marker works from their own queue of claimed questions',
              'A complete record of who marked what, ready for moderation',
            ]}
            visual={<TeamMockup />}
          />
          <div className="mt-24 grid gap-5 md:grid-cols-3">
            {[
              [Building2, 'Built around your booklets', 'Designed for the answer booklets and reg number formats used in Nigerian universities. No bubble sheets, no templates, no new printing.'],
              [Smartphone, 'Runs on what you have', 'A phone camera and a browser are enough. Nothing to install, nothing for IT to maintain.'],
              [FileSpreadsheet, 'Ready for the exam officer', 'One result sheet per course with CA added and grades on the A to F scale, in Excel or PDF.'],
            ].map(([Icon, t, s], i) => (
              <Reveal key={t} delay={i * 80}>
                <div className="h-full rounded-3xl border border-slate-200 p-7">
                  <Icon size={22} className="text-sky-600" />
                  <p className="mt-5 font-display text-lg font-semibold text-slate-950">{t}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[1fr_1.6fr] lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Questions"
              title={
                <>
                  Everything lecturers <Accent>ask first.</Accent>
                </>
              }
              text="Still unsure? Create an account and try it on a handful of scripts before you commit a whole course."
            />
          </Reveal>
          <Reveal delay={100}>
            <Faq />
          </Reveal>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-ink-950 px-6 py-20 text-center sm:px-16 sm:py-24">
              <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]" />
              <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[700px] -translate-x-1/2 rounded-full bg-sky-500/30 blur-[100px]" />
              <div className="relative">
                <h2 className="mx-auto max-w-3xl font-display text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl">
                  Your next exam could be <Accent dark>the last one you mark alone.</Accent>
                </h2>
                <p className="mx-auto mt-6 max-w-xl text-base text-slate-300 sm:text-lg">
                  Create a session, add your marking guide and scan your first booklet. Be among the first departments to mark
                  with ScriptMark.
                </p>
                <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-sky-500/30 hover:bg-sky-400">
                    Create your account <ArrowRight size={18} />
                  </Link>
                  <Link to="/login" className="rounded-full border border-white/15 px-7 py-4 text-base font-semibold text-white hover:bg-white/5">
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter onSection={goTo} />
    </div>
  )
}

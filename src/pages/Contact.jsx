import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MapPin, Building2, ArrowRight, Send } from 'lucide-react'
import PublicShell from '../components/PublicShell.jsx'
import { CONTACT } from '../lib/site.js'

const REASONS = ['A pilot for my department', 'A question about ScriptMark', 'Help with my account', 'Something else']

// There is no mail backend for enquiries yet, so the form opens the
// visitor's email app with the message filled in.
export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', institution: '', reason: REASONS[0], message: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    const body = [
      form.message,
      '',
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      form.institution && `Institution: ${form.institution}`,
    ]
      .filter((l) => l !== false && l !== undefined)
      .join('\n')
    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`ScriptMark: ${form.reason}`)}&body=${encodeURIComponent(body)}`
  }

  const input =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100'

  return (
    <PublicShell
      eyebrow="Contact"
      title="Let's talk about marking at your institution."
      intro="Whether you want to try ScriptMark on one course, run a pilot across a department, or just ask a question, write to us and you will hear back from the person who builds it."
    >
      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <div className="space-y-5">
          <a
            href={`mailto:${CONTACT.email}`}
            className="group flex items-start gap-4 rounded-3xl border border-slate-200 p-6 transition hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white">
              <Mail size={20} />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold text-slate-950">Email</span>
              <span className="mt-1 block break-all text-[15px] text-sky-700 group-hover:text-sky-800">{CONTACT.email}</span>
            </span>
          </a>
          <div className="flex items-start gap-4 rounded-3xl border border-slate-200 p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Building2 size={20} />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold text-slate-950">{CONTACT.name}</span>
              <span className="mt-1 block text-[15px] text-slate-600">{CONTACT.role}</span>
              <span className="block text-[15px] text-slate-600">{CONTACT.department}</span>
            </span>
          </div>
          <div className="flex items-start gap-4 rounded-3xl border border-slate-200 p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <MapPin size={20} />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold text-slate-950">{CONTACT.institution}</span>
              <span className="mt-1 block text-[15px] text-slate-600">{CONTACT.location}</span>
            </span>
          </div>
          <div className="rounded-3xl bg-ink-950 p-6 text-white">
            <p className="font-display text-lg font-semibold">Ready to try it yourself?</p>
            <p className="mt-1.5 text-sm text-slate-300">Create an account and mark your first booklet today.</p>
            <Link to="/signup" className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold hover:bg-sky-400">
              Start marking <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8">
          <p className="font-display text-2xl font-semibold tracking-tight text-slate-950">Send a message</p>
          <p className="mt-1.5 text-sm text-slate-500">This opens your email app with your message ready to send.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Your name
              <input required value={form.name} onChange={set('name')} className={input} placeholder="Dr. Ada Okafor" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Your email
              <input required type="email" value={form.email} onChange={set('email')} className={input} placeholder="you@university.edu.ng" />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Institution and department
              <input value={form.institution} onChange={set('institution')} className={input} placeholder="Faculty of Engineering, your university" />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              What is it about?
              <select value={form.reason} onChange={set('reason')} className={input}>
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Message
              <textarea required rows={5} value={form.message} onChange={set('message')} className={input} placeholder="Tell us about your courses and how many scripts you mark." />
            </label>
          </div>
          <button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800 sm:w-auto">
            <Send size={15} /> Send message
          </button>
        </form>
      </div>
    </PublicShell>
  )
}

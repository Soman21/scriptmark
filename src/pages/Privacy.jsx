import { Link } from 'react-router-dom'
import PublicShell from '../components/PublicShell.jsx'
import { CONTACT, PRIVACY_UPDATED } from '../lib/site.js'

// Plain language privacy policy. It describes what the app actually does
// today (see the backend routes and lib/ for each provider); keep it in step
// when a new kind of data or a new provider is added.
const SECTIONS = [
  {
    id: 'who',
    title: 'Who we are',
    body: [
      `ScriptMark is an AI marking assistant for handwritten examination scripts, built by ${CONTACT.name} at the ${CONTACT.department}, ${CONTACT.institution}, ${CONTACT.location}. In this policy, "ScriptMark", "we" and "us" mean the ScriptMark service and the people who run it.`,
      'This policy explains what information ScriptMark handles, why, who else processes it, and the choices you have. It is written to meet the Nigeria Data Protection Act 2023.',
    ],
  },
  {
    id: 'covers',
    title: 'Who this policy covers',
    list: [
      'Lecturers and coordinators who create a ScriptMark account.',
      'Students whose examination scripts, names and reg numbers are uploaded by their lecturers.',
      'Visitors to the ScriptMark website.',
    ],
  },
  {
    id: 'collect',
    title: 'Information we collect',
    groups: [
      ['Account details', 'Your name, email address and password. Passwords are stored only as a secure hash, never as plain text. We also keep the one time codes used to verify your email.'],
      ['Examination material', 'Scanned pages and photos of answer booklets, the text read from them, marking guides, suggested and confirmed scores, the reasons and confidence levels behind them, and a record of changes made after confirmation.'],
      ['Student details', 'Names and reg numbers from class lists and attendance sheets you upload, and the reg number, course code, semester and session read from booklet covers.'],
      ['Session and team details', 'Course titles, join codes, the lecturers in a session, the questions they claimed and their access level.'],
      ['Technical information', 'Basic logs created when you use the service, such as the time of a request and errors, which help us keep ScriptMark running.'],
    ],
  },
  {
    id: 'use',
    title: 'How we use it',
    list: [
      'To read handwritten scripts and suggest scores against the marking guide you provide.',
      'To match each script to the right student and build result sheets and analytics for the lecturer.',
      'To let coordinators and lecturers work together on the sessions they belong to.',
      'To measure how often AI suggestions agree with lecturers, so the service can be checked and improved.',
      'To sign you in, verify your email and keep your account secure.',
    ],
    after: 'We do not sell personal information, show advertising, or use examination scripts to build marketing profiles.',
  },
  {
    id: 'ai',
    title: 'AI processing and service providers',
    body: ['ScriptMark relies on trusted providers to do its work. They process information on our behalf and only for the purposes below. Some of them may process data on servers outside Nigeria.'],
    groups: [
      ['Google Cloud Vision', 'Reads the text on scanned pages.'],
      ['Groq', 'Runs the AI models that suggest scores, reasons and confidence, and answers questions in the AI Assistant.'],
      ['Supabase', 'Stores the database and the uploaded page images.'],
      ['Brevo', 'Sends verification and password reset emails.'],
      ['Vercel and Render', 'Host the ScriptMark website and server.'],
    ],
    after: 'A suggested score is never final. Every score is confirmed or changed by a lecturer, unless the session coordinator has chosen to auto accept high confidence scores, and every change after confirmation is recorded.',
  },
  {
    id: 'basis',
    title: 'Why we are allowed to process it',
    list: [
      'Contract: to provide the service you signed up for.',
      'Legitimate interests: of institutions and lecturers in marking examinations accurately, consistently and on time.',
      'Consent: where we ask for it, for example before sending you any email that is not needed to run your account.',
      'Legal obligation: where the law requires us to keep or disclose information.',
    ],
  },
  {
    id: 'students',
    title: 'A note for students',
    body: [
      'ScriptMark does not create student accounts. Your script, name and reg number reach ScriptMark only because your lecturer or institution uploaded them for marking. They are used to mark your work and produce your result, and are visible only to the lecturers in that marking session.',
      'Questions about your marks, or requests about your information, should go to your lecturer or department first. You may also write to us using the details below.',
    ],
  },
  {
    id: 'sharing',
    title: 'Who can see your information',
    list: [
      'Lecturers who belong to the session, with the access the coordinator gives them.',
      'The service providers listed above, only to run ScriptMark.',
      'Authorities, where the law requires it.',
    ],
  },
  {
    id: 'keep',
    title: 'How long we keep it',
    body: [
      'Account details are kept while your account is open. Examination material and student details are kept while the marking session exists, so results can be checked, moderated and appealed. You can ask us to delete an account or a session at any time, and we will remove it unless the law requires us to keep it.',
    ],
  },
  {
    id: 'security',
    title: 'How we protect it',
    list: [
      'Encrypted connections between your browser and ScriptMark.',
      'Hashed passwords and signed sign in tokens.',
      'Access to each session limited to the people the coordinator approves.',
      'An audit trail of score changes after confirmation.',
    ],
    after: 'No system is perfectly secure. If we learn of a breach that affects your information, we will tell you and the Nigeria Data Protection Commission as the law requires.',
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: ['Under the Nigeria Data Protection Act 2023 you can ask to access the information we hold about you, correct it, delete it, restrict or object to how it is used, receive a copy in a portable format, and withdraw consent you have given. You can also complain to the Nigeria Data Protection Commission.'],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: ['We will update this page when ScriptMark changes how it handles information, and change the date at the top. If a change is significant, we will tell account holders by email.'],
  },
]

function Section({ s }) {
  return (
    <section id={s.id} className="scroll-mt-8">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">{s.title}</h2>
      {s.body?.map((p) => (
        <p key={p.slice(0, 24)} className="mt-4 text-[15px] leading-relaxed text-slate-600">
          {p}
        </p>
      ))}
      {s.groups && (
        <dl className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {s.groups.map(([t, d]) => (
            <div key={t} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
              <dt className="text-sm font-semibold text-slate-900">{t}</dt>
              <dd className="text-[15px] leading-relaxed text-slate-600">{d}</dd>
            </div>
          ))}
        </dl>
      )}
      {s.list && (
        <ul className="mt-4 space-y-2.5">
          {s.list.map((l) => (
            <li key={l} className="flex gap-3 text-[15px] leading-relaxed text-slate-600">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              {l}
            </li>
          ))}
        </ul>
      )}
      {s.after && <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{s.after}</p>}
    </section>
  )
}

export default function Privacy() {
  function jump(e, id) {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <PublicShell
      eyebrow="Privacy policy"
      title="How ScriptMark handles your information."
      intro={`Last updated ${PRIVACY_UPDATED}. Examination scripts carry students' work and names, so we keep what we collect to what marking needs.`}
    >
      <div className="grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-16">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">On this page</p>
            <ul className="mt-4 space-y-2 border-l border-slate-200">
              {[...SECTIONS, { id: 'contact', title: 'Contact us' }].map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={(e) => jump(e, s.id)} className="-ml-px block border-l border-transparent pl-4 text-sm text-slate-500 hover:border-brand-500 hover:text-slate-900">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <article className="max-w-3xl space-y-12">
          {SECTIONS.map((s) => (
            <Section key={s.id} s={s} />
          ))}
          <section id="contact" className="scroll-mt-8 rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200 sm:p-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">Contact us</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              For any question or request about your information, write to {CONTACT.name} at{' '}
              <a href={`mailto:${CONTACT.email}`} className="font-medium text-brand-700 hover:text-brand-800">
                {CONTACT.email}
              </a>
              , {CONTACT.department}, {CONTACT.institution}, {CONTACT.location}. You can also use the{' '}
              <Link to="/contact" className="font-medium text-brand-700 hover:text-brand-800">
                contact page
              </Link>
              .
            </p>
          </section>
        </article>
      </div>
    </PublicShell>
  )
}

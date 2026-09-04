export function StatCard({ icon, label, value, sub, subColor = 'text-slate-500', dark = false }) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        dark ? 'bg-ink-950 border-ink-950 text-white' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</div>
      {sub && <div className={`text-xs mt-1 ${subColor}`}>{sub}</div>}
    </div>
  )
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg bg-ink-950 hover:bg-ink-900 text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 transition-colors disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-rose-100 text-rose-700',
    blue: 'bg-sky-100 text-sky-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

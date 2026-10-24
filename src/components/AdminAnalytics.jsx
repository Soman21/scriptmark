import { useState, useEffect } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const RANGES = [7, 30, 90]

const PAGE_NAMES = {
  '/': 'Home',
  '/login': 'Sign in',
  '/signup': 'Sign up',
  '/forgotPassword': 'Forgot password',
  '/contact': 'Contact',
  '/privacy': 'Privacy',
  '/guides': 'Marking Guides',
  '/assistant': 'AI Assistant',
  '/settings': 'Settings',
  '/join/:code': 'Join session',
  '/courses/:code': 'Course',
  '/sessions/:id': 'Session',
}
const TAB_NAMES = {
  overview: 'Overview',
  scan: 'Scan Scripts',
  marking: 'Marking Progress',
  'claim-questions': 'Claim Questions',
  'my-queue': 'My Queue',
  coordinator: 'Coordinator',
  results: 'Results',
  analytics: 'Analytics',
  export: 'Export',
}

export function pageName(path) {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path]
  const tab = path.match(/^\/sessions\/:id\/([^/]+)$/)
  if (tab) return `Session: ${TAB_NAMES[tab[1]] || tab[1]}`
  return path
}

const DEVICE_NAMES = { mobile: 'Phone', tablet: 'Tablet', desktop: 'Computer', unknown: 'Unknown' }

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  )
}

// One series of vertical bars on a single axis: thin bars with rounded
// tops, a 2px gap between them, three light grid lines and a tooltip on
// hover. Each bar's hit area is the full column, bigger than the bar.
function Bars({ data, value, label, tip, axisLabels, height = 160 }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.map(value))
  const step = max <= 4 ? 1 : Math.ceil(max / 4)
  // An even number of steps, so the middle grid line lands on a whole number.
  const top = Math.ceil(max / (2 * step)) * 2 * step
  const ticks = [0, top / 2, top]
  return (
    <div className="relative">
      <div className="flex" style={{ height }}>
        <div className="relative w-8 shrink-0 text-right text-[11px] text-slate-400">
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2" style={{ top: `${100 - (t / top) * 100}%` }}>
              {Math.round(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-slate-100" style={{ top: `${100 - (t / top) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div
                key={i}
                className="flex h-full flex-1 items-end"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              >
                <div
                  className={`w-full rounded-t ${hover === i ? 'bg-brand-700' : 'bg-brand-500'}`}
                  style={{ height: `${(value(d) / top) * 100}%`, minHeight: value(d) ? 2 : 0 }}
                />
              </div>
            ))}
          </div>
          {hover != null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink-950 px-2.5 py-1.5 text-xs text-white shadow-lg"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              {tip(data[hover])}
            </div>
          )}
        </div>
      </div>
      <div className="ml-8 mt-1.5 flex justify-between text-[11px] text-slate-400">
        {axisLabels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{tip(d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// A ranked list with a thin bar under each row, scaled to the top row.
function Ranked({ rows, empty }) {
  if (!rows.length) return <p className="px-5 py-8 text-center text-sm text-slate-400">{empty}</p>
  const max = Math.max(...rows.map((r) => r.value))
  return (
    <ul className="space-y-3 px-5 py-4">
      {rows.map((r) => (
        <li key={r.key} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-slate-700">
              {r.label}
              {r.sub && <span className="ml-1.5 text-xs text-slate-400">{r.sub}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-slate-900">{r.value}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const shortDay = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const hourName = (h) => `${String(h).padStart(2, '0')}:00`

export default function AdminAnalytics() {
  const { token } = useAuth()
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null)
    api
      .getSiteAnalytics(days, token)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [days, token])

  const daily = data?.daily || []
  const mid = Math.floor(daily.length / 2)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={days === r}
              onClick={() => setDays(r)}
              className={`rounded-md px-3 py-1.5 text-sm ${days === r ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {r} days
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">Counted from the day tracking went live</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {!data && !error && (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <Stat label="Visitors" value={data.totals.visitors} />
            <Stat label="Page views" value={data.totals.views} sub={`${data.totals.viewsPerVisitor} per visitor`} />
            <Stat label="Clicks" value={data.totals.clicks} />
            <Stat label="Active lecturers" value={data.totals.lecturers} />
            <Stat label="Sign ups" value={data.totals.signups} sub={data.totals.signupRate <= 100 ? `${data.totals.signupRate}% of visitors` : undefined} />
            <Stat label="Busiest hour" value={data.totals.views ? hourName(data.hours.reduce((a, b) => (b.views > a.views ? b : a)).hour) : 'N/A'} />
          </div>

          <Card title="Visitors per day">
            <div className="px-5 pb-4 pt-6">
              <Bars
                data={daily}
                value={(d) => d.visitors}
                label="Visitors per day"
                tip={(d) => `${shortDay(d.day)}: ${d.visitors} visitors, ${d.views} views`}
                axisLabels={daily.length ? [shortDay(daily[0].day), shortDay(daily[mid].day), shortDay(daily.at(-1).day)] : []}
              />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Top pages">
              <Ranked
                empty="No page views yet"
                rows={data.pages.map((p) => ({ key: p.path, label: pageName(p.path), value: p.views }))}
              />
            </Card>
            <Card title="Top clicks">
              <Ranked
                empty="No clicks yet"
                rows={data.clicks.map((c) => ({ key: `${c.label}|${c.path}`, label: c.label, sub: pageName(c.path), value: c.clicks }))}
              />
            </Card>
            <Card title="Devices">
              <Ranked
                empty="No visitors yet"
                rows={data.devices.map((d) => ({ key: d.device, label: DEVICE_NAMES[d.device] || d.device, value: d.visitors }))}
              />
            </Card>
            <Card title="Where visitors came from">
              <Ranked
                empty="No referrals yet"
                rows={data.referrers.map((r) => ({ key: r.referrer, label: r.referrer, value: r.visitors }))}
              />
            </Card>
          </div>

          <Card title="Views by hour">
            <div className="px-5 pb-4 pt-6">
              <Bars
                data={data.hours}
                value={(h) => h.views}
                label="Page views by hour of day"
                tip={(h) => `${hourName(h.hour)}: ${h.views} views`}
                axisLabels={['00:00', '06:00', '12:00', '18:00', '23:00']}
                height={120}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

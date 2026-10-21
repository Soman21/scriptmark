import { useOptionalSession } from '../context/SessionContext.jsx'

// Page header. Outside a session it is the page's main title bar. Inside a
// session the SessionWorkspace header already names the session and the
// tab, so it becomes a slim toolbar: a smaller title and the page actions,
// or nothing at all when the page has no actions.
// tabs/activeTab/onTabChange are kept for pages with their own sub tabs.
export default function Topbar({ title, tabs, activeTab, onTabChange, right }) {
  const inSession = !!useOptionalSession()
  // Inside a session the tab already names the page, so a bare title with
  // nothing beside it would only repeat it.
  if (inSession && !right && !tabs) return null

  return (
    <header
      className={`flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 ${
        inSession ? 'py-3 bg-slate-50' : 'min-h-[60px] py-3 border-b border-slate-200 bg-white'
      }`}
    >
      <div className="flex min-w-0 items-center gap-8">
        <h2
          className={`truncate font-semibold tracking-tight text-slate-900 ${inSession ? 'text-[15px]' : 'text-lg'}`}
        >
          {title}
        </h2>
        {tabs && (
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange && onTabChange(tab)}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  activeTab === tab ? 'bg-slate-900 text-white font-medium' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        )}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  )
}

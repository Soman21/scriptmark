import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import LogoMark from './LogoMark.jsx'
import SiteFooter from './SiteFooter.jsx'

// Layout for public pages other than the landing page: dark header with a
// page title, the content, and the shared footer.
export default function PublicShell({ eyebrow, title, intro, children }) {
  useEffect(() => {
    document.title = `${eyebrow} · ScriptMark`
    return () => {
      document.title = 'ScriptMark'
    }
  }, [eyebrow])

  return (
    <div className="h-screen overflow-y-auto bg-white font-body text-slate-900 antialiased">
      <section className="relative overflow-hidden bg-ink-950">
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />
        <header className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-xl font-semibold tracking-tight text-white">ScriptMark</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:text-white sm:block">
              Sign in
            </Link>
            <Link to="/signup" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-100">
              Start marking
            </Link>
          </div>
        </header>
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl">{title}</h1>
          {intro && <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">{intro}</p>}
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">{children}</main>
      <SiteFooter />
    </div>
  )
}

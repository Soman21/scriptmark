export default function LogoMark({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0ea5e9" />
      <path d="M9 9h10a4 4 0 0 1 4 4v10H13a4 4 0 0 1-4-4V9Z" fill="#fff" opacity=".25" />
      <path d="M10.5 16.5l3.5 3.5 7.5-8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

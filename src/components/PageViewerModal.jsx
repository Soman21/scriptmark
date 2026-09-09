import { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// pages: flat array of { pageNumber, imageUrl } across the WHOLE split (not
// just one group), so the lecturer can scroll straight through everything.
// startIndex: which page to open on.
export default function PageViewerModal({ pages, startIndex, onClose, onIndexChange }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndexChange((i) => Math.min(i + 1, pages.length - 1))
      if (e.key === 'ArrowLeft') onIndexChange((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [pages.length, onClose, onIndexChange])

  if (startIndex == null) return null
  const page = pages[startIndex]
  if (!page) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90">
      <div className="flex items-center justify-between px-4 py-3 text-slate-200">
        <span className="text-sm font-medium">
          Page {startIndex + 1} of {pages.length}
        </span>
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10" title="Close (Esc)">
          <X size={20} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-auto px-4 pb-4">
        <button
          onClick={() => onIndexChange((i) => Math.max(i - 1, 0))}
          disabled={startIndex === 0}
          className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30 md:left-6"
          title="Previous page (←)"
        >
          <ChevronLeft size={22} />
        </button>

        <img
          src={page.imageUrl}
          alt={`Page ${page.pageNumber}`}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />

        <button
          onClick={() => onIndexChange((i) => Math.min(i + 1, pages.length - 1))}
          disabled={startIndex === pages.length - 1}
          className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30 md:right-6"
          title="Next page (→)"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  )
}

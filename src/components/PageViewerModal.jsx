import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, RotateCcw, RotateCw, Crop as CropIcon, Check, Trash2 } from 'lucide-react'

// pages: flat array of { pageNumber, imageUrl, rotation, crop } across the
// WHOLE split. onUpdatePage(flatIndex, updates) mutates the page in place in
// the parent's state (rotation and/or crop), same object reference so drag
// and drop between groups keeps whatever edits were made.
export default function PageViewerModal({ pages, startIndex, onClose, onIndexChange, onUpdatePage }) {
  const [cropping, setCropping] = useState(false)
  const [draftCrop, setDraftCrop] = useState(null) // { x, y, w, h } in 0..1, relative to the rendered image
  const dragStart = useRef(null)
  const imgWrapRef = useRef(null)

  useEffect(() => {
    setCropping(false)
    setDraftCrop(null)
  }, [startIndex])

  useEffect(() => {
    function handleKey(e) {
      if (cropping) return // don't navigate away mid-crop
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndexChange((i) => Math.min(i + 1, pages.length - 1))
      if (e.key === 'ArrowLeft') onIndexChange((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [pages.length, onClose, onIndexChange, cropping])

  if (startIndex == null) return null
  const page = pages[startIndex]
  if (!page) return null

  const rotation = page.rotation || 0

  function rotate(delta) {
    const next = (rotation + delta + 360) % 360
    onUpdatePage(startIndex, { rotation: next })
  }

  function startCrop() {
    setDraftCrop(page.crop || null)
    setCropping(true)
  }

  function pointToFraction(e) {
    const rect = imgWrapRef.current.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    return { x, y }
  }

  function handleMouseDown(e) {
    if (!cropping) return
    const start = pointToFraction(e)
    dragStart.current = start
    setDraftCrop({ x: start.x, y: start.y, w: 0, h: 0 })
  }

  function handleMouseMove(e) {
    if (!cropping || !dragStart.current) return
    const cur = pointToFraction(e)
    const start = dragStart.current
    setDraftCrop({
      x: Math.min(start.x, cur.x),
      y: Math.min(start.y, cur.y),
      w: Math.abs(cur.x - start.x),
      h: Math.abs(cur.y - start.y),
    })
  }

  function handleMouseUp() {
    dragStart.current = null
  }

  function applyCrop() {
    if (draftCrop && draftCrop.w > 0.02 && draftCrop.h > 0.02) {
      onUpdatePage(startIndex, { crop: draftCrop })
    }
    setCropping(false)
  }

  function cancelCrop() {
    setCropping(false)
    setDraftCrop(null)
  }

  function removeCrop() {
    onUpdatePage(startIndex, { crop: null })
    setCropping(false)
    setDraftCrop(null)
  }

  const showCropOverlay = cropping && draftCrop
  const showSavedCrop = !cropping && page.crop

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90">
      <div className="flex items-center justify-between px-4 py-3 text-slate-200">
        <span className="text-sm font-medium">
          Page {startIndex + 1} of {pages.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => rotate(-90)}
            disabled={cropping}
            className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-30"
            title="Rotate left"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => rotate(90)}
            disabled={cropping}
            className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-30"
            title="Rotate right"
          >
            <RotateCw size={18} />
          </button>

          {!cropping ? (
            <button onClick={startCrop} className="ml-1 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs hover:bg-white/10" title="Crop">
              <CropIcon size={16} /> Crop
            </button>
          ) : (
            <>
              <button onClick={applyCrop} className="ml-1 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1.5 text-xs hover:bg-emerald-500">
                <Check size={14} /> Apply
              </button>
              <button onClick={cancelCrop} className="rounded-full px-2.5 py-1.5 text-xs hover:bg-white/10">
                Cancel
              </button>
            </>
          )}
          {page.crop && !cropping && (
            <button onClick={removeCrop} className="ml-1 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-rose-300 hover:bg-white/10" title="Remove crop">
              <Trash2 size={14} /> Remove crop
            </button>
          )}

          <button onClick={onClose} className="ml-2 rounded-full p-1.5 hover:bg-white/10" title="Close (Esc)">
            <X size={20} />
          </button>
        </div>
      </div>

      {cropping && (
        <p className="px-4 pb-1 text-center text-xs text-slate-300">Drag over the page to draw the area to keep, then Apply.</p>
      )}

      <div className="relative flex flex-1 items-center justify-center overflow-auto px-4 pb-4">
        {!cropping && (
          <button
            onClick={() => onIndexChange((i) => Math.max(i - 1, 0))}
            disabled={startIndex === 0}
            className="absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30 md:left-6"
            title="Previous page (←)"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <div
          ref={imgWrapRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="relative select-none"
          style={{ cursor: cropping ? 'crosshair' : 'default' }}
        >
          <img
            src={page.imageUrl}
            alt={`Page ${page.pageNumber}`}
            draggable={false}
            className="max-h-[75vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            style={{ transform: `rotate(${rotation}deg)` }}
          />

          {showSavedCrop && (
            <div
              className="pointer-events-none absolute border-2 border-emerald-400"
              style={{
                left: `${page.crop.x * 100}%`,
                top: `${page.crop.y * 100}%`,
                width: `${page.crop.w * 100}%`,
                height: `${page.crop.h * 100}%`,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              }}
            />
          )}

          {showCropOverlay && (
            <div
              className="pointer-events-none absolute border-2 border-sky-400"
              style={{
                left: `${draftCrop.x * 100}%`,
                top: `${draftCrop.y * 100}%`,
                width: `${draftCrop.w * 100}%`,
                height: `${draftCrop.h * 100}%`,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              }}
            />
          )}
        </div>

        {!cropping && (
          <button
            onClick={() => onIndexChange((i) => Math.min(i + 1, pages.length - 1))}
            disabled={startIndex === pages.length - 1}
            className="absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30 md:right-6"
            title="Next page (→)"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  )
}
import { useState } from 'react'

// Width of a side panel the lecturer can drag wider or narrower, like a
// split view. The width is remembered per panel in this browser.
export const MIN_PANEL_WIDTH = 320
export const MAX_PANEL_WIDTH = 720

function saved(key, fallback) {
  try {
    const w = Number(localStorage.getItem(key))
    if (w >= MIN_PANEL_WIDTH && w <= MAX_PANEL_WIDTH) return w
  } catch {
    // Storage can be blocked (private window); the default width is fine.
  }
  return fallback
}

export default function usePanelWidth(key, fallback = 380) {
  const [width, setWidth] = useState(() => saved(key, fallback))

  // Dragging the panel's left edge: it grows as the pointer moves left.
  function startResize(e) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    let latest = startWidth
    function move(ev) {
      const limit = Math.min(MAX_PANEL_WIDTH, Math.round(window.innerWidth * 0.6))
      latest = Math.min(Math.max(startWidth + (startX - ev.clientX), MIN_PANEL_WIDTH), limit)
      setWidth(latest)
    }
    function stop() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try {
        localStorage.setItem(key, String(latest))
      } catch {
        // Not saved; the width still holds for this visit.
      }
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  return [width, startResize]
}

// The strip on a panel's left edge that the lecturer drags.
export function ResizeHandle({ onPointerDown, label }) {
  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title="Drag to resize"
      className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize hover:bg-brand-200/60 lg:block"
    />
  )
}

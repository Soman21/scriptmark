import { useEffect, useMemo, useRef, useState } from 'react'
import { Move, PenLine, Type, Check, X, Eraser, Undo2, Redo2, Trash2, Expand, ScanText, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api.js'
import { composeInk, inkItemsToShapes, movesFrom, pathOf, INK } from '../lib/markInk.js'

// The Marked view: a page of the script with the red ink on top, drawn from
// the scores in the boxes right now (so a changed score redraws at once),
// plus the lecturer's own ink. The same shapes are drawn into the PDF by
// the server (markInk.js is shared), so the download looks like this.

const TOOLS = [
  ['move', 'Move mark', Move],
  ['pen', 'Pen', PenLine],
  ['text', 'Text', Type],
  ['tick', 'Tick', Check],
  ['cross', 'Cross', X],
  ['eraser', 'Eraser', Eraser],
]

const S = 1000 // SVG units per page width

function d(cmds) {
  return cmds.map(([c, ...v]) => `${c} ${v.map((n) => (n * S).toFixed(1)).join(' ')}`).join(' ')
}

function Shape({ s }) {
  if (s.t === 'text') {
    const x = s.x * S
    const y = s.y * S
    return (
      <text
        x={x}
        y={y}
        fontSize={s.size * S}
        textAnchor={s.anchor === 'middle' ? 'middle' : s.anchor === 'end' ? 'end' : 'start'}
        transform={s.rot ? `rotate(${s.rot} ${x} ${y})` : undefined}
        fill={INK}
        style={{ fontFamily: 'Caveat, cursive', fontWeight: 700 }}
      >
        {s.text}
      </text>
    )
  }
  const w = (s.w || (s.t === 'line' ? 0.0026 : 0.0032)) * S
  return <path d={d(pathOf(s))} fill="none" stroke={INK} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
}

// How far a point is from an ink item, in page widths.
function distanceTo(item, x, y, aspect) {
  const dist = (px, py) => Math.hypot(px - x, (py - y) * aspect)
  if (item.k === 'pen') return Math.min(...item.pts.map(([px, py]) => dist(px, py)))
  if (item.k === 'text') return dist(item.x + Math.min(0.15, (item.t || '').length * 0.008), item.y - 0.008)
  if (item.k === 'tick' || item.k === 'cross') return dist(item.x + 0.02, item.y)
  return Infinity
}

export default function MarkedView({ script, token, draftScores, draftRemarks, countedSet, total, totalMax, pageIndex, onPageChange, onExpand, tall }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [aspects, setAspects] = useState({})
  const [tool, setTool] = useState('move')
  const [showInk, setShowInk] = useState(true)
  const [ink, setInk] = useState({}) // pageNumber -> items
  const [history, setHistory] = useState({}) // pageNumber -> { undo: [], redo: [] }
  const [saveState, setSaveState] = useState('')
  const [stroke, setStroke] = useState(null)
  const [drag, setDrag] = useState(null) // { answerId, x, y }
  const [textAt, setTextAt] = useState(null) // { x, y, value }
  const [reading, setReading] = useState(false)
  const svgRef = useRef(null)
  const saveTimers = useRef({})
  const pending = useRef({}) // pageNumber -> items not yet sent

  // Leaving the script (or the view) sends any ink still waiting, so a
  // stroke drawn just before switching is not lost.
  useEffect(() => {
    const timers = saveTimers.current
    const waiting = pending.current
    return () => {
      for (const [pageNumber, items] of Object.entries(waiting)) {
        clearTimeout(timers[pageNumber])
        api.saveInk(script.id, Number(pageNumber), items, token).catch(() => {})
      }
      saveTimers.current = {}
      pending.current = {}
    }
  }, [script.id, token])

  useEffect(() => {
    let alive = true
    setData(null)
    setError('')
    setHistory({})
    api
      .getMarkedScript(script.id, token)
      .then((res) => {
        if (!alive) return
        setData(res)
        setInk(res.ink || {})
      })
      .catch((err) => alive && setError(err.message))
    return () => {
      alive = false
    }
  }, [script.id, token])

  const pages = data?.pages || []
  const page = pages[Math.min(pageIndex, pages.length - 1)]
  const aspect = (page && aspects[page.pageNumber]) || 1.414

  const composed = useMemo(() => {
    if (!data) return { pages: {}, unplaced: [] }
    return composeInk({
      pages: data.pages.map((p) => ({ pageNumber: p.pageNumber, aspect: aspects[p.pageNumber] || 1.414 })),
      anchors: data.anchors,
      moves: movesFrom(ink),
      cover: data.cover,
      coverPage: data.coverPage,
      total,
      totalMax,
      answers: script.answers.map((a) => {
        const score = Number(draftScores[a.id] ?? a.confirmedScore ?? a.suggestedScore ?? 0)
        return {
          id: a.id,
          number: a.question?.number,
          subLabel: a.question?.subLabel,
          score,
          max: a.question?.maxMarks ?? 0,
          remark: draftRemarks[a.id] ?? a.remark ?? '',
          answered: Boolean(data.answered?.[a.id]) || score > 0,
          counted: countedSet.has(String(a.question?.number ?? '').trim()),
        }
      }),
    })
  }, [data, aspects, ink, script.answers, draftScores, draftRemarks, countedSet, total, totalMax])

  function labelOf(answerId) {
    const q = script.answers.find((a) => a.id === answerId)?.question
    return q ? `Q${q.number}${q.subLabel || ''}` : ''
  }

  function changeItems(pageNumber, next) {
    const before = ink[pageNumber] || []
    setHistory((h) => ({ ...h, [pageNumber]: { undo: [...(h[pageNumber]?.undo || []), before].slice(-50), redo: [] } }))
    setInk((prev) => ({ ...prev, [pageNumber]: next }))
    queueSave(pageNumber, next)
  }

  function queueSave(pageNumber, items) {
    clearTimeout(saveTimers.current[pageNumber])
    setSaveState('Saving')
    pending.current[pageNumber] = items
    saveTimers.current[pageNumber] = setTimeout(async () => {
      delete pending.current[pageNumber]
      try {
        await api.saveInk(script.id, pageNumber, items, token)
        setSaveState('Saved')
      } catch (err) {
        setSaveState('')
        setError(err.message)
      }
    }, 700)
  }

  function undo() {
    const h = history[page.pageNumber]
    if (!h?.undo.length) return
    const prev = h.undo[h.undo.length - 1]
    const current = ink[page.pageNumber] || []
    setHistory((all) => ({ ...all, [page.pageNumber]: { undo: h.undo.slice(0, -1), redo: [...h.redo, current] } }))
    setInk((all) => ({ ...all, [page.pageNumber]: prev }))
    queueSave(page.pageNumber, prev)
  }

  function redo() {
    const h = history[page.pageNumber]
    if (!h?.redo.length) return
    const next = h.redo[h.redo.length - 1]
    const current = ink[page.pageNumber] || []
    setHistory((all) => ({ ...all, [page.pageNumber]: { undo: [...h.undo, current], redo: h.redo.slice(0, -1) } }))
    setInk((all) => ({ ...all, [page.pageNumber]: next }))
    queueSave(page.pageNumber, next)
  }

  // Pointer position as fractions of the page width and height.
  function pointAt(e) {
    const r = svgRef.current.getBoundingClientRect()
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]
  }

  function onPointerDown(e) {
    if (!page || !showInk) return
    const [x, y] = pointAt(e)
    const items = ink[page.pageNumber] || []
    if (tool === 'pen') {
      e.currentTarget.setPointerCapture(e.pointerId)
      setStroke([[x, y]])
    } else if (tool === 'text') {
      setTextAt({ x, y, value: '' })
    } else if (tool === 'tick') {
      changeItems(page.pageNumber, [...items, { k: 'tick', x: x - 0.02, y }])
    } else if (tool === 'cross') {
      changeItems(page.pageNumber, [...items, { k: 'cross', x: x - 0.016, y }])
    } else if (tool === 'eraser') {
      let best = -1
      let bestDist = 0.03
      items.forEach((it, i) => {
        const dist = distanceTo(it, x, y, aspect)
        if (dist < bestDist) {
          best = i
          bestDist = dist
        }
      })
      if (best >= 0) changeItems(page.pageNumber, items.filter((_, i) => i !== best))
    } else if (tool === 'move') {
      const loops = (composed.pages[page.pageNumber] || []).filter((s) => s.t === 'loop' && s.answerId)
      const hit = loops.find((s) => Math.hypot(s.x - x, s.y - y * aspect) < 0.06)
      if (hit) {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag({ answerId: hit.answerId, x, y })
      }
    }
  }

  function onPointerMove(e) {
    if (stroke) {
      const [x, y] = pointAt(e)
      const [lx, ly] = stroke[stroke.length - 1]
      if (Math.hypot(x - lx, (y - ly) * aspect) > 0.002) setStroke((s) => [...s, [x, y]])
    } else if (drag) {
      const [x, y] = pointAt(e)
      setDrag((dr) => ({ ...dr, x, y }))
    }
  }

  function onPointerUp() {
    if (stroke) {
      if (stroke.length >= 2) changeItems(page.pageNumber, [...(ink[page.pageNumber] || []), { k: 'pen', pts: stroke, w: 0.0035 }])
      setStroke(null)
    } else if (drag) {
      const items = (ink[page.pageNumber] || []).filter((it) => !(it.k === 'move' && it.a === drag.answerId))
      changeItems(page.pageNumber, [...items, { k: 'move', a: drag.answerId, x: drag.x, y: drag.y }])
      setDrag(null)
    }
  }

  function addText() {
    const value = textAt?.value.trim()
    if (value) changeItems(page.pageNumber, [...(ink[page.pageNumber] || []), { k: 'text', x: textAt.x, y: textAt.y, t: value }])
    setTextAt(null)
  }

  async function readPositions() {
    setReading(true)
    setError('')
    try {
      const res = await api.readPositions(script.id, token)
      setData(res)
      setInk(res.ink || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setReading(false)
    }
  }

  if (error && !data) return <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>
  if (!data) return <p className="p-3 text-sm text-slate-400">Loading marked script...</p>
  if (!page) return <p className="p-3 text-sm text-slate-400">No pages.</p>

  const shapes = composed.pages[page.pageNumber] || []
  // While a mark is dragged, it follows the pointer.
  let autoShapes = shapes
  if (drag) {
    const loop = shapes.find((s) => s.t === 'loop' && s.answerId === drag.answerId)
    if (loop) {
      const dx = drag.x - loop.x
      const dy = drag.y * aspect - loop.y
      autoShapes = shapes.map((s) => {
        if (s.answerId !== drag.answerId) return s
        if (s.t === 'line') return { ...s, x1: s.x1 + dx, x2: s.x2 + dx, y1: s.y1 + dy, y2: s.y2 + dy }
        return { ...s, x: s.x + dx, y: s.y + dy }
      })
    }
  }
  const ownShapes = inkItemsToShapes(ink[page.pageNumber], aspect)
  if (stroke) ownShapes.push(...inkItemsToShapes([{ k: 'pen', pts: stroke, w: 0.0035 }], aspect))
  const canUndo = Boolean(history[page.pageNumber]?.undo.length)
  const canRedo = Boolean(history[page.pageNumber]?.redo.length)
  const notPlaced = composed.unplaced.map(labelOf).filter(Boolean)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1" role="toolbar" aria-label="Ink tools">
        {TOOLS.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={tool === key}
            onClick={() => setTool(key)}
            className={`flex h-8 w-8 items-center justify-center rounded-md ${tool === key ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Icon size={16} />
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button type="button" title="Undo" aria-label="Undo" onClick={undo} disabled={!canUndo} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30">
          <Undo2 size={16} />
        </button>
        <button type="button" title="Redo" aria-label="Redo" onClick={redo} disabled={!canRedo} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30">
          <Redo2 size={16} />
        </button>
        <button
          type="button"
          title="Clear Ink"
          aria-label="Clear Ink"
          onClick={() => changeItems(page.pageNumber, [])}
          disabled={!(ink[page.pageNumber] || []).length}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30"
        >
          <Trash2 size={16} />
        </button>
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 px-1.5 text-xs text-slate-600">
          Show Ink
          <input type="checkbox" className="peer sr-only" checked={showInk} onChange={(e) => setShowInk(e.target.checked)} />
          <span className="relative h-4 w-7 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-3" />
        </label>
        {onExpand && (
          <button type="button" title="Full size" aria-label="Full size" onClick={onExpand} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100">
            <Expand size={16} />
          </button>
        )}
      </div>

      {!data.hasPositions && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>Mark positions not read. Marks show on the cover only.</span>
          <button type="button" onClick={readPositions} disabled={reading} className="flex shrink-0 items-center gap-1 font-medium underline disabled:opacity-50">
            <ScanText size={13} /> {reading ? 'Reading...' : 'Read positions'}
          </button>
        </div>
      )}
      {data.hasPositions && notPlaced.length > 0 && <p className="text-xs text-slate-500">On cover only: {notPlaced.join(', ')}</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className={`relative overflow-auto rounded-lg border border-slate-100 bg-slate-50 ${tall ? '' : 'max-h-[calc(100vh-300px)]'}`}>
        <div className="relative">
          <img
            src={page.imageUrl}
            alt={`Page ${page.pageNumber}`}
            className="block w-full select-none"
            draggable={false}
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget
              if (naturalWidth) setAspects((a) => ({ ...a, [page.pageNumber]: naturalHeight / naturalWidth }))
            }}
          />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${S} ${S * aspect}`}
            preserveAspectRatio="none"
            className={`absolute inset-0 h-full w-full ${tool === 'move' ? 'cursor-grab' : 'cursor-crosshair'}`}
            style={{ touchAction: tool === 'move' && !drag ? 'auto' : 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {showInk && autoShapes.map((s, i) => <Shape key={`a${i}`} s={s} />)}
            {showInk && ownShapes.map((s, i) => <Shape key={`o${i}`} s={s} />)}
          </svg>
          {textAt && (
            <input
              autoFocus
              value={textAt.value}
              onChange={(e) => setTextAt((t) => ({ ...t, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addText()
                if (e.key === 'Escape') setTextAt(null)
              }}
              onBlur={addText}
              placeholder="Text"
              aria-label="Text on the page"
              className="absolute w-40 rounded border border-rose-300 bg-white/90 px-1.5 py-0.5 text-sm text-rose-700 outline-none"
              style={{ left: `${textAt.x * 100}%`, top: `calc(${textAt.y * 100}% - 1.4rem)`, fontFamily: 'Caveat, cursive', fontWeight: 700 }}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <button type="button" onClick={() => onPageChange(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0} className="flex items-center gap-0.5 rounded-md p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Previous page">
          <ChevronLeft size={15} /> Previous
        </button>
        <span>
          Page {pageIndex + 1} of {pages.length}
          {saveState && <span className="ml-2 text-slate-400">{saveState}</span>}
        </span>
        <button type="button" onClick={() => onPageChange(Math.min(pages.length - 1, pageIndex + 1))} disabled={pageIndex >= pages.length - 1} className="flex items-center gap-0.5 rounded-md p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Next page">
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

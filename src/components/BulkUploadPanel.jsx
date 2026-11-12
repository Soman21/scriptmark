import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, ChevronDown, ChevronUp, Loader2, AlertCircle, Merge, Trash2, CheckCircle2, Expand, RotateCw, Scissors, ScanSearch, Rows3, FileText, X } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import PageViewerModal from './PageViewerModal.jsx'
import { bakePageEdits } from '../lib/imageEdit.js'
import { MB, SPLIT_PDF_LIMIT_MB, readJson } from '../lib/upload'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Scripts far longer or shorter than the usual length in this PDF: most
// likely a front cover was missed, or an extra page looked like one.
export function oddGroups(groups) {
  if (!groups || groups.length < 3) return new Set()
  const sizes = groups.map((g) => g.pages.length).sort((a, b) => a - b)
  const usual = sizes[Math.floor(sizes.length / 2)]
  return new Set(groups.map((g, i) => (g.pages.length >= usual * 2 || g.pages.length * 2 <= usual ? i : -1)).filter((i) => i >= 0))
}

// Answers a "Cover?" flag in one tap. A flagged page inside a script is
// taken as a missed cover, so a new script starts there. A flagged page that
// already starts a script is taken as a page wrongly cut off, so it joins
// the script before it. Either way the flag is cleared.
export function resolveCover(groups, groupIndex, pageIndex) {
  const g = groups[groupIndex]
  if (!g || !g.pages[pageIndex]) return groups
  const pages = g.pages.map((p, i) => (i === pageIndex ? { ...p, unsure: false } : p))
  const next = [...groups]
  if (pageIndex > 0) {
    next.splice(groupIndex, 1, { ...g, pages: pages.slice(0, pageIndex) }, { studentName: '', regNumber: '', pages: pages.slice(pageIndex) })
  } else if (groupIndex > 0) {
    const prev = groups[groupIndex - 1]
    next.splice(groupIndex - 1, 2, { ...prev, pages: [...prev.pages, ...pages] })
  } else {
    next[groupIndex] = { ...g, pages }
  }
  return next
}

// Adds newly picked PDFs to the ones already chosen. A second pick used to
// replace the first; now it adds to the list. The same file picked twice is
// kept once, since it would make every script in it twice. Files that are
// not PDFs, or are over the split limit, are left out and named.
export function addPdfs(prev, picked) {
  const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
  const added = []
  const notPdf = []
  const tooBig = []
  for (const f of picked) {
    const key = `${f.name}:${f.size}`
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) notPdf.push(f.name)
    else if (f.size > SPLIT_PDF_LIMIT_MB * MB) tooBig.push(f.name)
    else if (!seen.has(key)) {
      seen.add(key)
      added.push(f)
    }
  }
  return { files: [...prev, ...added], notPdf, tooBig }
}

const MODES = [
  {
    id: 'auto',
    icon: ScanSearch,
    title: 'Auto split',
    text: 'Splits at each booklet cover',
  },
  {
    id: 'manual',
    icon: Rows3,
    title: 'Fixed pages',
    text: 'Splits every N pages',
  },
]

export default function BulkUploadPanel({ sessionId, onScriptsCreated, onDone, embedded = false }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(embedded)
  const [dropTarget, setDropTarget] = useState(null)
  const [pdfFiles, setPdfFiles] = useState([])
  const [progress, setProgress] = useState(null) // { done, total } while splitting
  const [mode, setMode] = useState('auto')
  const [splitInfo, setSplitInfo] = useState(null)
  const [pagesPerSubmission, setPagesPerSubmission] = useState(1)
  const [splitting, setSplitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState('')
  const [viewerIndex, setViewerIndex] = useState(null)
  const [dragSource, setDragSource] = useState(null) // { groupIndex, pageIndex }

  function handlePdfsSelected(e) {
    const { files, notPdf, tooBig } = addPdfs(pdfFiles, Array.from(e.target.files || []))
    setPdfFiles(files)
    const notes = []
    if (notPdf.length) notes.push(`Not a PDF, skipped: ${notPdf.join(', ')}`)
    if (tooBig.length) notes.push(`Larger than ${SPLIT_PDF_LIMIT_MB} MB, skipped: ${tooBig.join(', ')}`)
    setError(notes.join('. '))
    // Clears the picker so the same folder can be opened again for more.
    e.target.value = ''
  }

  function removePdf(index) {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Each PDF is split in its own request, one after another, so the server
  // only ever holds one PDF at a time. The scripts from every PDF are then
  // shown together, in the order the files were added.
  async function handleSplit() {
    if (pdfFiles.length === 0) {
      setError('Choose a PDF file first.')
      return
    }
    setSplitting(true)
    setError('')
    const all = []
    let resultMode = mode
    try {
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i]
        setProgress({ done: i, total: pdfFiles.length })
        const formData = new FormData()
        formData.append('pdf', file)
        formData.append('mode', mode)
        formData.append('pagesPerSubmission', String(Math.max(1, Math.floor(pagesPerSubmission) || 1)))

        // Splitting does zero OCR now — it's just the PDF chopped into page
        // images and grouped, so this stays fast no matter how big the file is.
        const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/scripts/bulkSplit`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error(`${file.name}: ${data.error || 'Split failed'}`)
        resultMode = data.mode || mode
        all.push(
          ...data.groups.map((g) => ({
            studentName: '',
            regNumber: '',
            pages: g.pages.map((p) => ({ ...p, rotation: 0, crop: null })),
          }))
        )
      }

      setGroups(all)
      setSplitInfo({ mode: resultMode, pageCount: all.reduce((n, g) => n + g.pages.length, 0), fileCount: pdfFiles.length })
    } catch (err) {
      setError(err.message)
    } finally {
      setSplitting(false)
      setProgress(null)
    }
  }

  function updateGroupField(index, field, value) {
    setGroups((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)))
  }

  function mergeWithNext(index) {
    setGroups((prev) => {
      if (index >= prev.length - 1) return prev
      const merged = { ...prev[index], pages: [...prev[index].pages, ...prev[index + 1].pages] }
      const next = [...prev]
      next.splice(index, 2, merged)
      return next
    })
  }

  // Starts a new script at this page: everything from here on in the group
  // becomes the next script. The touch friendly partner of Merge next.
  function splitAt(groupIndex, pageIndex) {
    setGroups((prev) => {
      const g = prev[groupIndex]
      if (!g || pageIndex < 1) return prev
      const next = [...prev]
      next.splice(groupIndex, 1, { ...g, pages: g.pages.slice(0, pageIndex) }, { studentName: '', regNumber: '', pages: g.pages.slice(pageIndex) })
      return next
    })
  }

  function removeGroup(index) {
    setGroups((prev) => prev.filter((_, i) => i !== index))
  }

  // Flat list of every page across every group, in display order — used to
  // drive the full-page viewer's scroll-through-everything behaviour.
  function flatPages() {
    return groups ? groups.flatMap((g) => g.pages) : []
  }

  function openViewerAt(groupIndex, pageIndex) {
    const flat = flatPages()
    let offset = 0
    for (let i = 0; i < groupIndex; i++) offset += groups[i].pages.length
    setViewerIndex(offset + pageIndex)
  }

  // Maps a flat index (as used by the viewer) back to which group/page it
  // belongs to, so an edit made in the viewer lands on the right page.
  function locateFlatIndex(flatIndex) {
    let offset = 0
    for (let gi = 0; gi < groups.length; gi++) {
      if (flatIndex < offset + groups[gi].pages.length) {
        return { groupIndex: gi, pageIndex: flatIndex - offset }
      }
      offset += groups[gi].pages.length
    }
    return null
  }

  function updatePageField(groupIndex, pageIndex, updates) {
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, pages: [...g.pages] }))
      const page = next[groupIndex].pages[pageIndex]
      next[groupIndex].pages[pageIndex] = { ...page, ...updates }
      return next
    })
  }

  function updatePageAtFlatIndex(flatIndex, updates) {
    const loc = locateFlatIndex(flatIndex)
    if (loc) updatePageField(loc.groupIndex, loc.pageIndex, updates)
  }

  function quickRotate(groupIndex, pageIndex) {
    const current = groups[groupIndex].pages[pageIndex].rotation || 0
    updatePageField(groupIndex, pageIndex, { rotation: (current + 90) % 360 })
  }

  function handleDragStart(groupIndex, pageIndex) {
    setDragSource({ groupIndex, pageIndex })
  }

  // Dropping onto a group appends to the end (per your call). Dropping onto
  // a specific page tile within the SAME group reorders it to that spot.
  function handleDropOnGroup(targetGroupIndex, targetPageIndex = null) {
    if (!dragSource) return
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, pages: [...g.pages] }))
      const [moved] = next[dragSource.groupIndex].pages.splice(dragSource.pageIndex, 1)
      if (!moved) return prev

      if (targetPageIndex != null) {
        next[targetGroupIndex].pages.splice(targetPageIndex, 0, moved)
      } else {
        next[targetGroupIndex].pages.push(moved)
      }

      return next.filter((g) => g.pages.length > 0)
    })
    setDragSource(null)
    setDropTarget(null)
  }

  // While a page is being dragged, nearing the top or bottom of the scroll
  // area scrolls it, so a page can travel to a script that is off screen.
  function autoScroll(e) {
    if (!dragSource) return
    let el = e.currentTarget.parentElement
    while (el && !(el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement
    const box = el ? el.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
    const dy = e.clientY < box.top + 90 ? -20 : e.clientY > box.bottom - 90 ? 20 : 0
    if (dy) (el || window).scrollBy(0, dy)
  }

  async function handleConfirm() {
    if (!groups || groups.length === 0) return
    setConfirming(true)
    setError('')
    try {
      const payload = []
      for (const g of groups) {
        const pages = []
        for (const p of g.pages) {
          // Untouched pages upload exactly as they already were, no extra
          // cost. Only pages the lecturer actually rotated or cropped get
          // re-rendered and re-uploaded here.
          if (!p.rotation && !p.crop) {
            pages.push({ imageUrl: p.imageUrl })
            continue
          }
          const blob = await bakePageEdits(p.imageUrl, p.rotation || 0, p.crop || null)
          const formData = new FormData()
          formData.append('image', blob, 'edited_page.png')
          const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/scripts/uploadPage`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
          const data = await readJson(res)
          if (!res.ok) throw new Error(data.error || 'Could not save an edited page')
          pages.push({ imageUrl: data.imageUrl })
        }
        payload.push({ studentName: g.studentName.trim(), regNumber: g.regNumber.trim(), pages })
      }

      const result = await api.bulkConfirm(sessionId, payload, token)
      onScriptsCreated?.(result.scripts)
      setGroups(null)
      setSplitInfo(null)
      setPdfFiles([])
      setExpanded(false)
      // Start marking for the whole session and open the Marking page. The
      // Scan Scripts page passes onDone so every upload method can ask
      // about adding lecturers first (see StartMarkingPrompt.jsx).
      if (onDone) {
        await onDone()
      } else {
        await api.startMarking(sessionId, token).catch(() => {})
        navigate(`/sessions/${sessionId}/marking`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  const flat = flatPages()
  const odd = oddGroups(groups)

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => !embedded && setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left ${embedded ? 'cursor-default' : ''}`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileUp size={16} className="text-brand-500" /> Bulk PDF Upload
        </span>
        {!embedded && (expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />)}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4">

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {!groups ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="How to split">
                {MODES.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${mode === m.id ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <input type="radio" name="split-mode" className="sr-only" checked={mode === m.id} onChange={() => setMode(m.id)} aria-label={m.title} />
                    <m.icon size={18} className={`mt-0.5 shrink-0 ${mode === m.id ? 'text-brand-600' : 'text-slate-400'}`} />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {m.title}
                        {m.id === 'auto' && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Recommended</span>}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{m.text}</span>
                    </span>
                  </label>
                ))}
              </div>

              {mode === 'manual' && (
                <div>
                  <label htmlFor="pages-per-script" className="text-xs font-medium text-slate-500">
                    Pages per script
                  </label>
                  <input
                    id="pages-per-script"
                    type="number"
                    min={1}
                    step={1}
                    value={pagesPerSubmission}
                    onChange={(e) => setPagesPerSubmission(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                    className="mt-1 block w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              )}

              <div>
                <label className="inline-block cursor-pointer rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100">
                  {pdfFiles.length ? 'Add PDFs' : 'Choose PDFs'}
                  <input
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handlePdfsSelected}
                    disabled={splitting}
                    className="hidden"
                  />
                </label>
                <span className="ml-2 text-xs text-slate-400">Up to {SPLIT_PDF_LIMIT_MB} MB per file</span>
              </div>

              {pdfFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    {pdfFiles.length} PDF{pdfFiles.length !== 1 ? 's' : ''} selected
                  </p>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto">
                    {pdfFiles.map((f, i) => (
                      <div key={`${f.name}:${f.size}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText size={14} className="shrink-0 text-rose-500" />
                          <span className="truncate text-sm text-slate-700">{f.name}</span>
                          <span className="shrink-0 text-xs text-slate-400">{(f.size / MB).toFixed(1)} MB</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePdf(i)}
                          disabled={splitting}
                          className="shrink-0 text-slate-400 hover:text-rose-500 disabled:opacity-40"
                          title="Remove"
                          aria-label={`Remove ${f.name}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <PrimaryButton onClick={handleSplit} disabled={splitting || pdfFiles.length === 0} className="bg-brand-500 hover:bg-brand-600">
                {splitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {progress && progress.total > 1 ? `Splitting ${progress.done + 1} of ${progress.total}...` : 'Splitting...'}
                  </>
                ) : (
                  pdfFiles.length > 1 ? `Split ${pdfFiles.length} PDFs` : 'Split PDF'
                )}
              </PrimaryButton>
            </>
          ) : (
            <>
              <div className="text-sm text-slate-800">
                <p className="font-medium">
                  {splitInfo?.mode === 'auto'
                    ? `${groups.length} script${groups.length !== 1 ? 's' : ''} detected from ${splitInfo.pageCount} pages`
                    : `${groups.length} script${groups.length !== 1 ? 's' : ''} from ${flat.length} pages`}
                  {splitInfo?.fileCount > 1 ? ` in ${splitInfo.fileCount} PDFs` : ''}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Drag pages to rearrange. Review before confirming.</p>
                {splitInfo?.mode === 'auto' && groups.length === 1 && splitInfo.pageCount > 1 && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Only one cover detected. Try Fixed pages.
                  </p>
                )}
              </div>
              <div className="space-y-3" onDragOver={autoScroll}>
                {groups.map((g, gi) => (
                  <div
                    key={gi}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (dragSource && dropTarget !== gi) setDropTarget(gi)
                    }}
                    onDrop={() => handleDropOnGroup(gi)}
                    className={`rounded-lg border p-3 transition ${
                      dragSource && dropTarget === gi
                        ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-300'
                        : odd.has(gi)
                        ? 'border-amber-300 bg-amber-50/40'
                        : 'border-slate-200'
                    }`}
                  >
                    {odd.has(gi) && (
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <AlertCircle size={13} /> Unusual page count
                      </p>
                    )}
                    <div className="mb-2">
                      <input
                        value={g.regNumber}
                        onChange={(e) => updateGroupField(gi, 'regNumber', e.target.value)}
                        placeholder={`Group ${gi + 1}: type reg number`}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-brand-400"
                      />
                    </div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="whitespace-nowrap text-xs font-medium text-slate-500">
                        {g.pages.length} page{g.pages.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        {gi < groups.length - 1 && (
                          <button
                            onClick={() => mergeWithNext(gi)}
                            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                            title="Merge with next submission"
                          >
                            <Merge size={12} /> Merge next
                          </button>
                        )}
                        <button
                          onClick={() => removeGroup(gi)}
                          className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600"
                          title="Discard this submission"
                        >
                          <Trash2 size={12} /> Discard
                        </button>
                      </div>
                    </div>

                    <div className="mb-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
                      {g.pages.map((p, pi) => (
                        <div
                          key={`${gi}-${p.imageUrl}-${pi}`}
                          draggable
                          onDragStart={() => handleDragStart(gi, pi)}
                          onDragEnd={() => {
                            setDragSource(null)
                            setDropTarget(null)
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.stopPropagation()
                            handleDropOnGroup(gi, pi)
                          }}
                          className={`group relative cursor-grab overflow-hidden rounded border bg-slate-50 aspect-[3/4] active:cursor-grabbing ${p.unsure ? 'border-amber-400 ring-2 ring-amber-300' : 'border-slate-200'}`}
                        >
                          {p.unsure && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setGroups((prev) => resolveCover(prev, gi, pi))
                              }}
                              className="absolute inset-x-1 bottom-7 z-20 rounded bg-amber-500 px-1 py-0.5 text-center text-[9px] font-semibold text-white transition hover:bg-amber-600"
                              title={pi > 0 ? 'Start a new script here' : 'Join to previous script'}
                            >
                              {pi > 0 ? 'Cover? Split' : 'Cover? Join'}
                            </button>
                          )}
                          {pi === 0 && (
                            <span className="absolute left-1 top-1 z-10 rounded bg-emerald-600 px-1 text-[10px] font-semibold text-white">
                              Start
                            </span>
                          )}
                          {pi === g.pages.length - 1 && g.pages.length > 1 && (
                            <span className="absolute right-1 top-1 z-10 rounded bg-slate-700 px-1 text-[10px] font-semibold text-white">
                              End
                            </span>
                          )}
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform"
                            style={{ transform: `rotate(${p.rotation || 0}deg)` }}
                          />
                          {p.crop && (
                            <span className="absolute bottom-1 right-1 z-10 rounded bg-brand-600 px-1 text-[9px] font-semibold text-white">
                              Cropped
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              quickRotate(gi, pi)
                            }}
                            className="absolute left-1 bottom-1 z-20 rounded-full bg-black/50 p-1 text-white transition hover:bg-black/70 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Rotate a quarter turn"
                            aria-label="Rotate page"
                          >
                            <RotateCw size={12} />
                          </button>
                          {pi > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                splitAt(gi, pi)
                              }}
                              className="absolute right-1 bottom-1 z-20 flex items-center gap-0.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white transition hover:bg-brand-500 sm:opacity-0 sm:group-hover:opacity-100"
                              title="Start a new script from this page"
                              aria-label="Split here"
                            >
                              <Scissors size={10} /> <span className="hidden min-[420px]:inline sm:inline">Split here</span>
                            </button>
                          )}
                          <button
                            onClick={() => openViewerAt(gi, pi)}
                            className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100"
                            title="Click to view full size"
                          >
                            <Expand size={16} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <input
                      value={g.studentName}
                      onChange={(e) => updateGroupField(gi, 'studentName', e.target.value)}
                      placeholder="Student name (optional)"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <SecondaryButton onClick={() => setGroups(null)}>Start Over</SecondaryButton>
                <PrimaryButton onClick={handleConfirm} disabled={confirming} className="bg-emerald-600 hover:bg-emerald-500">
                  {confirming ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Confirm & Upload All
                    </>
                  )}
                </PrimaryButton>
              </div>
            </>
          )}
        </div>
      )}

      <PageViewerModal
        pages={flat}
        startIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onIndexChange={setViewerIndex}
        onUpdatePage={updatePageAtFlatIndex}
      />
    </div>
  )
}
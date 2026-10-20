import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, ChevronDown, ChevronUp, Loader2, AlertCircle, Merge, Trash2, CheckCircle2, Expand, RotateCw, Scissors, ScanSearch, Rows3 } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import PageViewerModal from './PageViewerModal.jsx'
import { bakePageEdits } from '../lib/imageEdit.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Scripts far longer or shorter than the usual length in this PDF: most
// likely a front cover was missed, or an extra page looked like one.
export function oddGroups(groups) {
  if (!groups || groups.length < 3) return new Set()
  const sizes = groups.map((g) => g.pages.length).sort((a, b) => a - b)
  const usual = sizes[Math.floor(sizes.length / 2)]
  return new Set(groups.map((g, i) => (g.pages.length >= usual * 2 || g.pages.length * 2 <= usual ? i : -1)).filter((i) => i >= 0))
}

const MODES = [
  {
    id: 'auto',
    icon: ScanSearch,
    title: 'Auto split',
    text: 'Finds the front cover of each answer booklet and starts a new script there, so scripts can have any number of pages. The PDF must start on a front cover.',
  },
  {
    id: 'manual',
    icon: Rows3,
    title: 'Fixed pages',
    text: 'Cuts the PDF every few pages. Use it when every script has the same number of pages, or there are no printed covers.',
  },
]

export default function BulkUploadPanel({ sessionId, onScriptsCreated }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [pdfFile, setPdfFile] = useState(null)
  const [mode, setMode] = useState('auto')
  const [splitInfo, setSplitInfo] = useState(null)
  const [pagesPerSubmission, setPagesPerSubmission] = useState(1)
  const [splitting, setSplitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState('')
  const [viewerIndex, setViewerIndex] = useState(null)
  const [dragSource, setDragSource] = useState(null) // { groupIndex, pageIndex }

  async function handleSplit() {
    if (!pdfFile) {
      setError('Choose a PDF file first.')
      return
    }
    setSplitting(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('pdf', pdfFile)
      formData.append('mode', mode)
      formData.append('pagesPerSubmission', String(Math.max(1, Math.floor(pagesPerSubmission) || 1)))

      // Splitting does zero OCR now — it's just the PDF chopped into page
      // images and grouped, so this stays fast no matter how big the file is.
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/scripts/bulkSplit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Split failed')

      setGroups(
        data.groups.map((g) => ({
          studentName: '',
          regNumber: '',
          pages: g.pages.map((p) => ({ ...p, rotation: 0, crop: null })),
        }))
      )
      setSplitInfo({ mode: data.mode || mode, pageCount: data.groups.reduce((n, g) => n + g.pages.length, 0) })
    } catch (err) {
      setError(err.message)
    } finally {
      setSplitting(false)
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
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Could not save an edited page')
          pages.push({ imageUrl: data.imageUrl })
        }
        payload.push({ studentName: g.studentName.trim(), regNumber: g.regNumber.trim(), pages })
      }

      const result = await api.bulkConfirm(sessionId, payload, token)
      onScriptsCreated?.(result.scripts)
      setGroups(null)
      setSplitInfo(null)
      setPdfFile(null)
      setExpanded(false)
      // Kick off background marking for the whole session, then take the
      // lecturer straight to the live Marking page to watch progress.
      await api.startMarking(sessionId, token).catch(() => {})
      navigate(`/sessions/${sessionId}/marking`)
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
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileUp size={16} className="text-sky-500" /> Bulk PDF Upload
        </span>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Use this when you have one big PDF holding many students' scripts, scanned all together and not yet
            split apart. Review and adjust the split before anything is saved. OCR and student detection happen
            automatically afterward, during Marking, so this stays fast.
          </p>

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
                    className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${mode === m.id ? 'border-sky-400 bg-sky-50 ring-1 ring-sky-400' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <input type="radio" name="split-mode" className="sr-only" checked={mode === m.id} onChange={() => setMode(m.id)} aria-label={m.title} />
                    <m.icon size={18} className={`mt-0.5 shrink-0 ${mode === m.id ? 'text-sky-600' : 'text-slate-400'}`} />
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
                    className="mt-1 block w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              )}

              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600"
              />

              <PrimaryButton onClick={handleSplit} disabled={splitting || !pdfFile} className="bg-sky-500 hover:bg-sky-400">
                {splitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Splitting...
                  </>
                ) : (
                  'Split PDF'
                )}
              </PrimaryButton>
            </>
          ) : (
            <>
              <div className="text-sm text-slate-800">
                <p className="font-medium">
                  {splitInfo?.mode === 'auto'
                    ? `Found ${groups.length} front cover${groups.length !== 1 ? 's' : ''} in ${splitInfo.pageCount} pages, so ${groups.length} script${groups.length !== 1 ? 's' : ''}.`
                    : `${groups.length} proposed submissions.`}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Check each script before confirming. Use Split here on a page to start a new script from it, or Merge next to join two. You can also drag pages between scripts on a computer.
                </p>
                {splitInfo?.mode === 'auto' && groups.length === 1 && splitInfo.pageCount > 1 && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Only one front cover was found. Make sure the PDF starts on a front cover, or use Fixed pages instead.
                  </p>
                )}
              </div>
              <div className="space-y-3 max-h-[32rem] overflow-y-auto">
                {groups.map((g, gi) => (
                  <div
                    key={gi}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnGroup(gi)}
                    className={`rounded-lg border p-3 ${odd.has(gi) ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}
                  >
                    {odd.has(gi) && (
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <AlertCircle size={13} /> Check this one: {g.pages.length} page{g.pages.length !== 1 ? 's' : ''}, while most scripts here are a different length.
                      </p>
                    )}
                    <div className="mb-2">
                      <input
                        value={g.regNumber}
                        onChange={(e) => updateGroupField(gi, 'regNumber', e.target.value)}
                        placeholder={`Group ${gi + 1}: type reg number`}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-sky-400"
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
                            className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700"
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

                    <div className="mb-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                      {g.pages.map((p, pi) => (
                        <div
                          key={`${gi}-${p.imageUrl}-${pi}`}
                          draggable
                          onDragStart={() => handleDragStart(gi, pi)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.stopPropagation()
                            handleDropOnGroup(gi, pi)
                          }}
                          className={`group relative cursor-grab overflow-hidden rounded border bg-slate-50 aspect-[3/4] active:cursor-grabbing ${p.unsure ? 'border-amber-400 ring-2 ring-amber-300' : 'border-slate-200'}`}
                        >
                          {p.unsure && (
                            <span className="absolute inset-x-1 bottom-7 z-10 rounded bg-amber-500 px-1 text-center text-[9px] font-semibold text-white">
                              {pi === 0 ? 'Is this a cover?' : 'Could be a cover'}
                            </span>
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
                            <span className="absolute bottom-1 right-1 z-10 rounded bg-sky-600 px-1 text-[9px] font-semibold text-white">
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
                              className="absolute right-1 bottom-1 z-20 flex items-center gap-0.5 rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] font-semibold text-white transition hover:bg-sky-500 sm:opacity-0 sm:group-hover:opacity-100"
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
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
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
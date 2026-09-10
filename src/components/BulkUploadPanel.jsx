import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, ChevronDown, ChevronUp, Loader2, AlertCircle, Merge, Trash2, CheckCircle2, Expand, RotateCw } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import PageViewerModal from './PageViewerModal.jsx'
import { bakePageEdits } from '../lib/imageEdit.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function BulkUploadPanel({ sessionId, onScriptsCreated }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [pdfFile, setPdfFile] = useState(null)
  const [mode, setMode] = useState('manual')
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
      formData.append('pagesPerSubmission', String(pagesPerSubmission))

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
      setPdfFile(null)
      setExpanded(false)
      // Kick off background marking for the whole session, then take the
      // lecturer straight to the live Marking page to watch progress.
      await api.startMarking(sessionId, token).catch(() => {})
      navigate('/marking')
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  const flat = flatPages()

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
              <div>
                <label className="text-xs font-medium text-slate-500">Pages per submission</label>
                <input
                  type="number"
                  min={1}
                  value={pagesPerSubmission}
                  onChange={(e) => setPagesPerSubmission(Number(e.target.value))}
                  className="mt-1 w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
                <p className="mt-1 text-xs text-slate-400">
                  How many pages a typical answer script runs to here. Splitting uses this to chunk the PDF.
                  You can always drag pages between groups afterward if a student used extra sheets.
                </p>
              </div>

              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600"
              />

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input type="radio" checked={mode === 'manual'} onChange={() => setMode('manual')} /> Manual split
                </label>
                <label className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input type="radio" checked={mode === 'auto'} onChange={() => setMode('auto')} /> Auto split
                </label>
              </div>
              <p className="text-xs text-slate-400">
                {mode === 'manual'
                  ? 'Every script is split into fixed chunks of this many pages.'
                  : 'Splits the same way, but reg numbers and names will auto-fill on each group once Marking digitizes it.'}
              </p>

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
              <p className="text-sm font-medium text-slate-800">
                {groups.length} proposed submissions. Review, edit, and drag pages between groups before confirming.
              </p>
              <div className="space-y-3 max-h-[32rem] overflow-y-auto">
                {groups.map((g, gi) => (
                  <div
                    key={gi}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnGroup(gi)}
                    className="rounded-lg border border-slate-200 p-3"
                  >
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

                    <div className="grid grid-cols-6 gap-1.5 mb-2">
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
                          className="group relative cursor-grab rounded bg-slate-50 border border-slate-200 aspect-[3/4] overflow-hidden active:cursor-grabbing"
                        >
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
                            className="absolute left-1 bottom-1 z-10 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
                            title="Rotate 90°"
                          >
                            <RotateCw size={12} />
                          </button>
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
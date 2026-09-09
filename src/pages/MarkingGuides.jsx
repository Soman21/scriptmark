import { useState, useEffect } from 'react'
import { Sparkles, Plus, Trash2, ArrowLeft } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, SecondaryButton } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

function letterLabel(index) {
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(97 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

const blankPart = () => ({
  id: Date.now() + Math.random(),
  text: '',
  modelAnswer: '',
  keywords: '',
  marks: 0,
})

const blankGroup = (number) => ({
  id: Date.now() + Math.random(),
  number: String(number),
  parts: [blankPart()],
})

function groupsFromQuestions(questions) {
  const byNumber = {}
  questions.forEach((q) => {
    if (!byNumber[q.number]) byNumber[q.number] = []
    byNumber[q.number].push(q)
  })
  const numbers = Object.keys(byNumber).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return numbers.map((number) => ({
    id: Date.now() + Math.random(),
    number,
    parts: byNumber[number]
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        id: Date.now() + Math.random(),
        text: q.text,
        modelAnswer: q.modelAnswer,
        keywords: q.keywords,
        marks: q.maxMarks,
      })),
  }))
}

export default function MarkingGuides() {
  const { token } = useAuth()

  const [stage, setStage] = useState('choose')
  const [sessions, setSessions] = useState([])
  const [chosenSessionId, setChosenSessionId] = useState(localStorage.getItem('scriptmark_active_session') || '')
  const [showNewSessionForm, setShowNewSessionForm] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [newSessionDept, setNewSessionDept] = useState('')
  const [newSessionFaculty, setNewSessionFaculty] = useState('')
  const [currentSession, setCurrentSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(false)

  const [currentGuideId, setCurrentGuideId] = useState(null)
  const [title, setTitle] = useState('')
  const [groups, setGroups] = useState([blankGroup(1), blankGroup(2)])
  const [recentGuides, setRecentGuides] = useState([])
  const [loadingGuides, setLoadingGuides] = useState(true)
  const [showAllGuides, setShowAllGuides] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const totalMarks = groups.reduce(
    (sum, g) => sum + g.parts.reduce((pSum, p) => pSum + Number(p.marks || 0), 0),
    0
  )
  const totalQuestionCount = groups.reduce((sum, g) => sum + g.parts.length, 0)

  useEffect(() => {
    loadSessions()
    loadGuides()
  }, [])

  async function loadSessions() {
    try {
      const data = await api.getSessions(token)
      setSessions(data)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadGuides() {
    setLoadingGuides(true)
    try {
      const guides = await api.getGuides(token)
      setRecentGuides(guides)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingGuides(false)
    }
  }

  function resetGuideForm() {
    setCurrentGuideId(null)
    setTitle('')
    setGroups([blankGroup(1), blankGroup(2)])
  }

  function loadGuideForEditing(guide) {
    setCurrentGuideId(guide.id)
    setTitle(guide.title)
    setGroups(groupsFromQuestions(guide.questions))
    setStage('edit')
    setError('')
    setSuccessMsg('')
  }

  async function enterSession(session) {
    setLoadingSession(true)
    setError('')
    try {
      const full = await api.getSession(session.id, token)
      setCurrentSession(full)
      localStorage.setItem('scriptmark_active_session', full.id)
      localStorage.setItem('scriptmark_active_session_title', full.title)

      if (full.guide) {
        loadGuideForEditing(full.guide)
      } else {
        resetGuideForm()
        setTitle(full.title)
        setStage('edit')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingSession(false)
    }
  }

  async function handleContinueSession() {
    const session = sessions.find((s) => s.id === chosenSessionId)
    if (!session) {
      setError('Choose a session from the list first.')
      return
    }
    enterSession(session)
  }

  async function handleStartNewSession() {
    if (!newSessionTitle.trim()) {
      setError('Give the new session a course/exam title.')
      return
    }
    setLoadingSession(true)
    setError('')
    try {
      const session = await api.createSession(
        { title: newSessionTitle.trim(), department: newSessionDept.trim(), faculty: newSessionFaculty.trim() },
        token
      )
      await loadSessions()
      enterSession(session)
    } catch (err) {
      setError(err.message)
      setLoadingSession(false)
    }
  }

  function addGroup() {
    setGroups((gs) => [...gs, blankGroup(gs.length + 1)])
  }

  function removeGroup(groupId) {
    setGroups((gs) => gs.filter((g) => g.id !== groupId))
  }

  function updateGroupNumber(groupId, value) {
    setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, number: value } : g)))
  }

  function addPart(groupId) {
    setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, parts: [...g.parts, blankPart()] } : g)))
  }

  function removePart(groupId, partId) {
    setGroups((gs) =>
      gs.map((g) => (g.id === groupId ? { ...g, parts: g.parts.filter((p) => p.id !== partId) } : g))
    )
  }

  function updatePart(groupId, partId, field, value) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? { ...g, parts: g.parts.map((p) => (p.id === partId ? { ...p, [field]: value } : p)) }
          : g
      )
    )
  }

  async function handleSave(isDraft) {
    setError('')
    setSuccessMsg('')

    if (!title.trim()) {
      setError('Please give this marking guide a subject / exam title, even for a draft.')
      return
    }
    if (!isDraft) {
      if (groups.some((g) => !g.number.trim())) {
        setError('Every question needs a number (e.g. "1", "2").')
        return
      }
      if (groups.some((g) => g.parts.some((p) => !p.text.trim()))) {
        setError('Every question (and subpart) needs question text before publishing.')
        return
      }
    }

    const flatQuestions = groups.flatMap((g) =>
      g.parts
        .filter((p) => isDraft || p.text.trim())
        .map((p, i) => ({
          number: g.number,
          subLabel: g.parts.length > 1 ? letterLabel(i) : null,
          text: p.text,
          modelAnswer: p.modelAnswer,
          keywords: p.keywords,
          maxMarks: p.marks,
        }))
    )

    setSaving(true)
    try {
      let guide
      if (currentGuideId) {
        guide = await api.updateGuide(currentGuideId, { title, questions: flatQuestions, isDraft }, token)
      } else {
        guide = await api.createGuide({ title, questions: flatQuestions, isDraft }, token)
        setCurrentGuideId(guide.id)
        if (currentSession) {
          await api.updateSession(currentSession.id, { guideId: guide.id }, token)
        }
      }
      setSuccessMsg(isDraft ? 'Saved as a draft — you can finish it later.' : 'Marking guide saved and published.')
      loadGuides()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const visibleGuides = showAllGuides ? recentGuides : recentGuides.slice(0, 5)

  if (stage === 'choose') {
    return (
      <div className="flex h-full flex-col">
        <Topbar title="Marking Guides" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-semibold text-slate-900 text-center">Which session is this guide for?</p>
            <p className="text-sm text-slate-500 mt-1 text-center">
              Marking guides are created within a course/exam session.
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {error}
              </div>
            )}

            {!showNewSessionForm ? (
              <>
                <label className="block text-xs font-medium text-slate-500 mt-5">Continue with a session</label>
                <select
                  value={chosenSessionId}
                  onChange={(e) => setChosenSessionId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="">Select a session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <PrimaryButton
                  onClick={handleContinueSession}
                  disabled={loadingSession || !chosenSessionId}
                  className="mt-3 w-full justify-center bg-sky-500 hover:bg-sky-400"
                >
                  {loadingSession ? 'Loading...' : 'Continue with Session'}
                </PrimaryButton>

                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs text-slate-400">OR</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <SecondaryButton onClick={() => setShowNewSessionForm(true)} className="w-full justify-center">
                  <Plus size={16} /> Start New Session
                </SecondaryButton>
              </>
            ) : (
              <>
                <label className="block text-xs font-medium text-slate-500 mt-5">Course / Exam Title</label>
                <input
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  placeholder="CS101 Midterm"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
                <label className="block text-xs font-medium text-slate-500 mt-3">Department</label>
                <input
                  value={newSessionDept}
                  onChange={(e) => setNewSessionDept(e.target.value)}
                  placeholder="Computer Science"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
                <label className="block text-xs font-medium text-slate-500 mt-3">Faculty</label>
                <input
                  value={newSessionFaculty}
                  onChange={(e) => setNewSessionFaculty(e.target.value)}
                  placeholder="Physical Sciences"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
                <PrimaryButton
                  onClick={handleStartNewSession}
                  disabled={loadingSession}
                  className="mt-4 w-full justify-center bg-sky-500 hover:bg-sky-400"
                >
                  {loadingSession ? 'Creating...' : 'Create & Continue'}
                </PrimaryButton>
                <button
                  onClick={() => setShowNewSessionForm(false)}
                  className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600"
                >
                  Back to session list
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Create Marking Guide"
        right={
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={() => handleSave(true)} disabled={saving}>
              {saving ? 'Saving...' : 'Draft Save'}
            </SecondaryButton>
            <PrimaryButton onClick={() => handleSave(false)} disabled={saving} className="bg-sky-500 hover:bg-sky-400">
              {saving ? 'Saving...' : 'Save & Publish'}
            </PrimaryButton>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <button
            onClick={() => setStage('choose')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={14} /> {currentSession ? `Session: ${currentSession.title}` : 'Change session'}
          </button>

          {(error || successMsg) && (
            <div
              className={`rounded-lg border px-4 py-2.5 text-sm ${
                error ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-emerald-200 bg-emerald-50 text-emerald-600'
              }`}
            >
              {error || successMsg}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Subject / Exam Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Biology Midterm, Fall 2024"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {groups.map((group) => {
            const groupTotal = group.parts.reduce((sum, p) => sum + Number(p.marks || 0), 0)
            const hasSubParts = group.parts.length > 1

            return (
              <div key={group.id} className="rounded-xl border border-slate-200 bg-white p-5 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Question</span>
                    <input
                      value={group.number}
                      onChange={(e) => updateGroupNumber(group.id, e.target.value)}
                      className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-center font-semibold outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      Question total: <span className="font-semibold text-slate-700">{groupTotal} marks</span>
                    </span>
                    {groups.length > 1 && (
                      <button
                        onClick={() => removeGroup(group.id)}
                        className="text-slate-400 hover:text-rose-500"
                        title="Remove this question"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {group.parts.map((part, i) => (
                    <div key={part.id} className={hasSubParts ? 'rounded-lg border border-slate-100 bg-slate-50/50 p-4' : ''}>
                      {hasSubParts && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-sky-600">
                            Part {group.number}
                            {letterLabel(i)}
                          </span>
                          {group.parts.length > 1 && (
                            <button
                              onClick={() => removePart(group.id, part.id)}
                              className="text-slate-400 hover:text-rose-500"
                              title="Remove this subpart"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}

                      <label className="block text-sm font-medium text-slate-700">Question Text</label>
                      <textarea
                        rows={2}
                        value={part.text}
                        onChange={(e) => updatePart(group.id, part.id, 'text', e.target.value)}
                        placeholder="Enter the question prompt here..."
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                      />

                      <div className="mt-3 flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">Model Answer</label>
                        <button
                          type="button"
                          onClick={() => setError('Automatic generation is coming in a later phase (LLM integration).')}
                          className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                        >
                          <Sparkles size={12} /> Generate with AI
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={part.modelAnswer}
                        onChange={(e) => updatePart(group.id, part.id, 'modelAnswer', e.target.value)}
                        placeholder="Paste the ideal response here... (formulas are fine as plain text, e.g. F = ma)"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                      />

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                        <div>
                          <label className="text-sm font-medium text-slate-700">Keywords (comma separated)</label>
                          <input
                            value={part.keywords}
                            onChange={(e) => updatePart(group.id, part.id, 'keywords', e.target.value)}
                            placeholder="e.g. Newton's second law, force, acceleration"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">Marks</label>
                          <input
                            type="number"
                            value={part.marks}
                            onChange={(e) => updatePart(group.id, part.id, 'marks', e.target.value)}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addPart(group.id)}
                  className="mt-4 flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  <Plus size={14} /> Add subpart (e.g. {letterLabel(group.parts.length)})
                </button>
              </div>
            )
          })}

          <button
            onClick={addGroup}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-white py-8 flex flex-col items-center gap-1 text-slate-500 hover:border-sky-400 hover:text-sky-600 transition-colors"
          >
            <Plus size={20} />
            <span className="font-medium">Add Another Question</span>
            <span className="text-xs text-slate-400">Each question can optionally be split into as many subparts as needed</span>
          </button>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl bg-ink-950 text-white p-5">
            <p className="font-semibold mb-4">Guide Summary</p>
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/10">
              <span className="text-slate-300">Questions (incl. subparts)</span>
              <span className="font-semibold">{totalQuestionCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/10">
              <span className="text-slate-300">Total Possible Marks</span>
              <span className="font-semibold">{totalMarks}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2">
              <span className="text-slate-300">AI Confidence Score</span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> High
              </span>
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-white/5 p-3 text-xs text-slate-300">
              <Sparkles size={14} className="shrink-0 mt-0.5" />
              Formulas can be typed as plain text (e.g. "v = u + at"). Handwritten formulas in scanned scripts may not
              OCR perfectly — this is a known limitation of standard OCR tools.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-slate-900">Recent Guides</p>
              {recentGuides.length > 5 && (
                <button
                  onClick={() => setShowAllGuides((v) => !v)}
                  className="text-xs font-medium text-sky-600 hover:text-sky-700"
                >
                  {showAllGuides ? 'Show Less' : 'View All'}
                </button>
              )}
            </div>
            {loadingGuides ? (
              <p className="text-sm text-slate-400">Loading guides...</p>
            ) : recentGuides.length === 0 ? (
              <p className="text-sm text-slate-400">No marking guides yet — create your first one on the left.</p>
            ) : (
              <ul className="space-y-1 max-h-96 overflow-y-auto">
                {visibleGuides.map((g) => {
                  const totalGuideMarks = g.questions.reduce((sum, q) => sum + q.maxMarks, 0)
                  return (
                    <li key={g.id}>
                      <button
                        onClick={() => loadGuideForEditing(g)}
                        className={`w-full text-left rounded-lg px-2 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                          currentGuideId === g.id ? 'bg-sky-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800">{g.title}</p>
                          <span
                            className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                              g.isDraft ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {g.isDraft ? 'Draft' : 'Active'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {g.questions.length} Questions &bull; {totalGuideMarks} Marks
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Updated {new Date(g.updatedAt).toLocaleDateString()}</p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

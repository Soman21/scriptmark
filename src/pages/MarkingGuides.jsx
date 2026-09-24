import { useState, useEffect } from 'react'
import { Sparkles, Plus, Trash2, ArrowLeft, FileUp, Loader2, Eye, X } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { PrimaryButton, SecondaryButton } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

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
  questionId: null,
  text: '',
  modelAnswer: '',
  keywords: '',
  marks: 0,
  assignedMarkerId: '',
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
        questionId: q.id || null,
        text: q.text,
        modelAnswer: q.modelAnswer,
        keywords: q.keywords,
        marks: q.maxMarks,
        assignedMarkerId: q.assignedMarkerId || '',
      })),
  }))
}

export default function MarkingGuides() {
  const { token, user } = useAuth()

  const [stage, setStage] = useState('choose')
  const [sessions, setSessions] = useState([])
  const [chosenSessionId, setChosenSessionId] = useState(localStorage.getItem('scriptmark_active_session') || '')
  const [showNewSessionForm, setShowNewSessionForm] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [newSessionDept, setNewSessionDept] = useState('')
  const [newSessionFaculty, setNewSessionFaculty] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newAcademicSession, setNewAcademicSession] = useState('')
  const [newSemester, setNewSemester] = useState('')
  const [newAutoAccept, setNewAutoAccept] = useState(true)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joiningSession, setJoiningSession] = useState(false)
  const [showBrowse, setShowBrowse] = useState(false)
  const [browsableSessions, setBrowsableSessions] = useState([])
  const [loadingBrowsable, setLoadingBrowsable] = useState(false)
  const [requestingId, setRequestingId] = useState(null)
  const [requestSentIds, setRequestSentIds] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitingEmail, setInvitingEmail] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
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
  const [autoGenerateOnParse, setAutoGenerateOnParse] = useState(false)
  const [generatingAnswers, setGeneratingAnswers] = useState(false)
  const [pendingAutoGenerate, setPendingAutoGenerate] = useState(false)
  const [questionPaperFile, setQuestionPaperFile] = useState(null)
  const [questionPaperPreviewUrl, setQuestionPaperPreviewUrl] = useState(null)
  const [questionPaperPreviewText, setQuestionPaperPreviewText] = useState('')
  const [questionPaperDocUrl, setQuestionPaperDocUrl] = useState(null)
  const [questionPaperDocMimeType, setQuestionPaperDocMimeType] = useState(null)
  const [showQuestionPaperPreview, setShowQuestionPaperPreview] = useState(false)
  const [dragOverPaper, setDragOverPaper] = useState(false)
  const [parsingPaper, setParsingPaper] = useState(false)
  const [guideFile, setGuideFile] = useState(null)
  const [guidePreviewUrl, setGuidePreviewUrl] = useState(null)
  const [guidePreviewText, setGuidePreviewText] = useState('')
  const [showGuidePreview, setShowGuidePreview] = useState(false)
  const [dragOverGuide, setDragOverGuide] = useState(false)
  const [parsingGuideDoc, setParsingGuideDoc] = useState(false)

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
    setQuestionPaperDocUrl(guide.questionPaperUrl || null)
    setQuestionPaperDocMimeType(guide.questionPaperMimeType || null)
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

  async function handleJoinSession() {
    if (!joinCodeInput.trim()) {
      setError('Enter the join code a Coordinator shared with you.')
      return
    }
    setJoiningSession(true)
    setError('')
    try {
      const session = await api.joinSession(joinCodeInput.trim(), token)
      await loadSessions()
      enterSession(session)
    } catch (err) {
      setError(err.message)
      setJoiningSession(false)
    }
  }

  async function toggleBrowse() {
    const next = !showBrowse
    setShowBrowse(next)
    if (next && browsableSessions.length === 0) {
      setLoadingBrowsable(true)
      try {
        const sessions = await api.getBrowsableSessions(token)
        setBrowsableSessions(sessions)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingBrowsable(false)
      }
    }
  }

  async function handleRequestAccess(sessionId) {
    setRequestingId(sessionId)
    setError('')
    try {
      await api.requestAccess(sessionId, token)
      setRequestSentIds((prev) => [...prev, sessionId])
    } catch (err) {
      setError(err.message)
    } finally {
      setRequestingId(null)
    }
  }

  async function handleInviteByEmail() {
    if (!inviteEmail.trim() || !currentSession) return
    setInvitingEmail(true)
    setError('')
    try {
      await api.inviteByEmail(currentSession.id, inviteEmail.trim(), token)
      setInviteEmail('')
      setInviteSent(true)
      setTimeout(() => setInviteSent(false), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setInvitingEmail(false)
    }
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
        {
          title: newSessionTitle.trim(),
          department: newSessionDept.trim(),
          faculty: newSessionFaculty.trim(),
          courseCode: newCourseCode.trim(),
          academicSession: newAcademicSession.trim(),
          semester: newSemester.trim(),
          autoAcceptHighConfidence: newAutoAccept,
        },
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

  // Matches incoming parsed questions onto the groups already in the editor,
  // by question number (and position within it for subparts), and only
  // fills in whatever's missing rather than replacing everything. Used when
  // the question paper and answer scheme are two separate uploaded files.
  function mergeQuestionsIntoGroups(newQuestions) {
    const incomingByNumber = {}
    newQuestions.forEach((q) => {
      if (!incomingByNumber[q.number]) incomingByNumber[q.number] = []
      incomingByNumber[q.number].push(q)
    })

    setGroups((prevGroups) => {
      const nextGroups = prevGroups.map((g) => ({ ...g, parts: [...g.parts] }))
      const matchedNumbers = new Set()

      nextGroups.forEach((g) => {
        const incoming = incomingByNumber[g.number]
        if (!incoming) return
        matchedNumbers.add(g.number)

        g.parts = g.parts.map((p, i) => {
          const match = incoming[i]
          if (!match) return p
          return {
            ...p,
            text: p.text.trim() ? p.text : match.text || p.text,
            modelAnswer: match.modelAnswer?.trim() ? match.modelAnswer : p.modelAnswer,
            keywords: match.keywords?.trim() ? match.keywords : p.keywords,
            marks: p.marks || match.maxMarks || 0,
          }
        })

        // The answer scheme had more subparts than the question paper did
        // for this number, append the extras rather than dropping them.
        for (let i = g.parts.length; i < incoming.length; i++) {
          g.parts.push({
            id: Date.now() + Math.random(),
            questionId: null,
            text: incoming[i].text || '',
            modelAnswer: incoming[i].modelAnswer || '',
            keywords: incoming[i].keywords || '',
            marks: incoming[i].maxMarks || 0,
            assignedMarkerId: '',
          })
        }
      })

      // Any incoming question number with no matching existing group at all
      // becomes a new group, rather than being silently lost.
      const extraGroups = Object.keys(incomingByNumber)
        .filter((num) => !matchedNumbers.has(num))
        .map((num) => ({
          id: Date.now() + Math.random(),
          number: num,
          parts: incomingByNumber[num].map((q) => ({
            id: Date.now() + Math.random(),
            questionId: null,
            text: q.text || '',
            modelAnswer: q.modelAnswer || '',
            keywords: q.keywords || '',
            marks: q.maxMarks || 0,
            assignedMarkerId: '',
          })),
        }))

      return [...nextGroups, ...extraGroups]
    })
  }

  async function handleParseQuestionPaper(file) {
    if (!file) return

    setParsingPaper(true)
    setError('')
    setSuccessMsg('')
    setQuestionPaperFile(file)
    setQuestionPaperPreviewText('')
    if (questionPaperPreviewUrl) URL.revokeObjectURL(questionPaperPreviewUrl)
    setQuestionPaperPreviewUrl(file.type === 'application/pdf' ? URL.createObjectURL(file) : null)

    try {
      const formData = new FormData()
      formData.append('document', file)

      const res = await fetch(`${API_BASE}/api/guides/parse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not parse this document.')

      if (!title.trim() && data.title) setTitle(data.title)
      const orderedQuestions = data.questions.map((q, i) => ({ ...q, order: i }))

      // Question Paper always sets the structure fresh, this is the source
      // of truth for question text and marks, never merged with anything.
      setGroups(groupsFromQuestions(orderedQuestions))
      setQuestionPaperPreviewText(data.previewText || '')
      setQuestionPaperDocUrl(data.documentUrl || null)
      setQuestionPaperDocMimeType(data.documentMimeType || null)

      const blankCount = orderedQuestions.filter((q) => !q.modelAnswer || !q.modelAnswer.trim()).length
      if (autoGenerateOnParse && blankCount > 0) {
        setPendingAutoGenerate(true) // picked up by the effect below, once groups has actually updated
        setSuccessMsg(`Parsed ${data.questions.length} question${data.questions.length !== 1 ? 's' : ''}. Generating answers with AI...`)
      } else {
        setSuccessMsg(
          blankCount > 0
            ? `Parsed ${data.questions.length} question${data.questions.length !== 1 ? 's' : ''}. ${blankCount} have no answer yet, upload a marking guide below or use Generate Answers with AI.`
            : `Parsed ${data.questions.length} question${data.questions.length !== 1 ? 's' : ''} from the document. Check everything below before saving.`
        )
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setParsingPaper(false)
    }
  }

  // Runs once, right after a Question Paper parse that had "auto-generate"
  // checked, so it reads the FRESH groups state rather than a stale closure
  // from before setGroups above took effect.
  useEffect(() => {
    if (pendingAutoGenerate) {
      setPendingAutoGenerate(false)
      handleGenerateAnswers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, pendingAutoGenerate])

  async function handleParseMarkingGuideDoc(file) {
    if (!file) return

    setParsingGuideDoc(true)
    setError('')
    setSuccessMsg('')
    setGuideFile(file)
    setGuidePreviewText('')
    if (guidePreviewUrl) URL.revokeObjectURL(guidePreviewUrl)
    setGuidePreviewUrl(file.type === 'application/pdf' ? URL.createObjectURL(file) : null)

    try {
      const formData = new FormData()
      formData.append('document', file)

      const res = await fetch(`${API_BASE}/api/guides/parse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not parse this document.')

      const orderedQuestions = data.questions.map((q, i) => ({ ...q, order: i }))

      // Marking Guide/Answers ALWAYS merges into whatever's already there,
      // never replaces, so it can never wipe out question text from the
      // Question Paper upload.
      mergeQuestionsIntoGroups(orderedQuestions)
      setGuidePreviewText(data.previewText || '')
      setSuccessMsg(
        `Merged ${data.questions.length} question${data.questions.length !== 1 ? 's' : ''} of answers into what you already had. Check everything below before saving.`
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setParsingGuideDoc(false)
    }
  }

  function handleRemoveQuestionPaper() {
    if (questionPaperPreviewUrl) URL.revokeObjectURL(questionPaperPreviewUrl)
    setQuestionPaperFile(null)
    setQuestionPaperPreviewUrl(null)
    setQuestionPaperPreviewText('')
    setQuestionPaperDocUrl(null)
    setQuestionPaperDocMimeType(null)
    setShowQuestionPaperPreview(false)
  }

  function handleRemoveGuideDoc() {
    if (guidePreviewUrl) URL.revokeObjectURL(guidePreviewUrl)
    setGuideFile(null)
    setGuidePreviewUrl(null)
    setGuidePreviewText('')
    setShowGuidePreview(false)
  }

  function handlePaperFileInputChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    handleParseQuestionPaper(file)
  }

  function handlePaperDrop(e) {
    e.preventDefault()
    setDragOverPaper(false)
    const file = e.dataTransfer.files?.[0]
    handleParseQuestionPaper(file)
  }

  function handleGuideFileInputChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    handleParseMarkingGuideDoc(file)
  }

  function handleGuideDrop(e) {
    e.preventDefault()
    setDragOverGuide(false)
    const file = e.dataTransfer.files?.[0]
    handleParseMarkingGuideDoc(file)
  }

  function getBlankAnswerParts() {
    const blanks = []
    groups.forEach((g) => {
      g.parts.forEach((p, pi) => {
        if (!p.modelAnswer || !p.modelAnswer.trim()) {
          blanks.push({
            groupId: g.id,
            partId: p.id,
            number: g.number,
            subLabel: g.parts.length > 1 ? letterLabel(pi) : null,
            text: p.text,
            maxMarks: p.marks,
          })
        }
      })
    })
    return blanks
  }

  async function handleGenerateAnswers() {
    const blanks = getBlankAnswerParts()
    if (blanks.length === 0) return

    setGeneratingAnswers(true)
    setError('')
    try {
      const payload = blanks.map((b, i) => ({ index: i, number: b.number, subLabel: b.subLabel, text: b.text, maxMarks: b.maxMarks }))
      const result = await api.generateGuideAnswers(payload, token)
      result.answers.forEach((a) => {
        const target = blanks[a.index]
        if (!target) return
        updatePart(target.groupId, target.partId, 'modelAnswer', a.modelAnswer)
        updatePart(target.groupId, target.partId, 'keywords', a.keywords)
      })
      setSuccessMsg(`Generated ${result.answers.length} model answer${result.answers.length !== 1 ? 's' : ''} with AI. Please review each one below.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingAnswers(false)
    }
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
      const payload = {
        title,
        questions: flatQuestions,
        isDraft,
        questionPaperUrl: questionPaperDocUrl,
        questionPaperMimeType: questionPaperDocMimeType,
      }
      if (currentGuideId) {
        guide = await api.updateGuide(currentGuideId, payload, token)
      } else {
        guide = await api.createGuide(payload, token)
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

  if (user && user.role === 'REVIEWER') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center">
          <Sparkles size={20} className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">Only Lecturers and Admins can create or edit marking guides.</p>
          <p className="text-sm text-slate-500 mt-1">You can still review and confirm scores from Results.</p>
        </div>
      </div>
    )
  }

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

                <div className="mt-5">
                  <label className="block text-xs font-medium text-slate-500">Join a session with a code</label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. K3M7QZ"
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm uppercase tracking-widest outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <SecondaryButton onClick={handleJoinSession} disabled={joiningSession}>
                      {joiningSession ? 'Joining...' : 'Join'}
                    </SecondaryButton>
                  </div>
                </div>

                <button onClick={toggleBrowse} className="mt-3 text-xs font-medium text-sky-600 hover:text-sky-700">
                  {showBrowse ? 'Hide sessions' : "Don't have a code? Browse sessions to request access"}
                </button>

                {showBrowse && (
                  <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {loadingBrowsable ? (
                      <p className="px-2 py-1.5 text-xs text-slate-400">Loading sessions...</p>
                    ) : browsableSessions.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-slate-400">
                        No other sessions available to request right now.
                      </p>
                    ) : (
                      browsableSessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50">
                          <div>
                            <p className="text-sm text-slate-800">{s.title}</p>
                            <p className="text-xs text-slate-400">
                              {s.courseCode ? `${s.courseCode}, ` : ''}by {s.createdBy?.name || 'Unknown'}
                            </p>
                          </div>
                          {requestSentIds.includes(s.id) ? (
                            <span className="text-xs font-medium text-emerald-600">Requested</span>
                          ) : (
                            <button
                              onClick={() => handleRequestAccess(s.id)}
                              disabled={requestingId === s.id}
                              className="shrink-0 rounded-lg border border-sky-200 px-2.5 py-1 text-xs font-medium text-sky-600 hover:bg-sky-50 disabled:opacity-60"
                            >
                              {requestingId === s.id ? 'Sending...' : 'Request Access'}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
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

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Course Code</label>
                    <input
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                      placeholder="CSC401"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Academic Session</label>
                    <input
                      value={newAcademicSession}
                      onChange={(e) => setNewAcademicSession(e.target.value)}
                      placeholder="2025/2026"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Semester</label>
                    <input
                      value={newSemester}
                      onChange={(e) => setNewSemester(e.target.value)}
                      placeholder="First"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Other markers join this session themselves using a code, shown to you right after you create it.
                </p>

                <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={newAutoAccept} onChange={(e) => setNewAutoAccept(e.target.checked)} />
                  Auto-accept high-confidence AI scores, so lecturers only review flagged or uncertain cases
                </label>

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

          {currentSession?.joinCode && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-sky-700">Session join code</p>
                  <p className="text-lg font-bold tracking-widest text-sky-900">{currentSession.joinCode}</p>
                </div>
                <p className="max-w-xs text-xs text-sky-700">
                  Share this with other markers, or invite someone directly by email below. Once they join, they
                  assign themselves questions from the Claim Questions page.
                </p>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@university.edu"
                  className="flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
                <SecondaryButton onClick={handleInviteByEmail} disabled={invitingEmail || !inviteEmail.trim()}>
                  {invitingEmail ? 'Sending...' : 'Invite by Email'}
                </SecondaryButton>
              </div>
              {inviteSent && <p className="mt-1.5 text-xs font-medium text-emerald-700">Invite sent.</p>}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">1. Upload Question Paper</p>
            <p className="text-xs text-slate-500 mt-1">
              The questions and marks, printed or otherwise. This always sets the question list fresh, uploading
              here again replaces it.
            </p>

            <label className="mt-2 flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={autoGenerateOnParse}
                onChange={(e) => setAutoGenerateOnParse(e.target.checked)}
                className="mt-0.5"
              />
              <span>This paper has no answers. Generate them with AI automatically once it's parsed.</span>
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverPaper(true)
              }}
              onDragLeave={() => setDragOverPaper(false)}
              onDrop={handlePaperDrop}
              className={`mt-3 rounded-xl border-2 border-dashed p-5 text-center transition ${
                dragOverPaper ? 'border-sky-400 bg-sky-50' : 'border-slate-300 bg-white'
              }`}
            >
              {parsingPaper ? (
                <Loader2 size={20} className="mx-auto mb-2 animate-spin text-sky-500" />
              ) : (
                <FileUp size={20} className="mx-auto mb-2 text-slate-400" />
              )}
              <p className="text-sm font-medium text-slate-700">
                {parsingPaper ? 'Reading document...' : 'Drag the question paper here'}
              </p>
              {!parsingPaper && (
                <label className="mt-1 inline-block cursor-pointer text-xs font-medium text-sky-600 hover:text-sky-700">
                  or click to browse
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handlePaperFileInputChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {questionPaperFile && !parsingPaper && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="truncate text-sm text-slate-600">{questionPaperFile.name}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => setShowQuestionPaperPreview(true)}
                    className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                  >
                    <Eye size={14} /> Preview
                  </button>
                  <button
                    onClick={handleRemoveQuestionPaper}
                    className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            )}

            {getBlankAnswerParts().length > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <span className="text-xs text-amber-700">
                  {getBlankAnswerParts().length} question{getBlankAnswerParts().length !== 1 ? 's have' : ' has'} no answer yet.
                </span>
                <button
                  onClick={handleGenerateAnswers}
                  disabled={generatingAnswers}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400 disabled:opacity-60"
                >
                  {generatingAnswers ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {generatingAnswers ? 'Generating...' : 'Generate Answers with AI'}
                </button>
              </div>
            )}
          </div>

          {showQuestionPaperPreview && questionPaperFile && (
            <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 p-4 md:p-10">
              <div className="flex items-center justify-between pb-3">
                <span className="truncate text-sm font-medium text-white">{questionPaperFile.name}</span>
                <button onClick={() => setShowQuestionPaperPreview(false)} className="rounded-full p-1.5 text-white hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto rounded-xl bg-white">
                {questionPaperPreviewUrl ? (
                  <iframe src={questionPaperPreviewUrl} title="Question paper preview" className="h-full w-full" />
                ) : (
                  <div className="p-6">
                    <p className="mb-3 text-xs text-slate-500">
                      Word documents cannot be rendered in the browser directly, this is the text ScriptMark actually
                      read from it.
                    </p>
                    <pre className="whitespace-pre-wrap text-sm text-slate-700">{questionPaperPreviewText || 'No preview text available.'}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">2. Upload Marking Guide (optional)</p>
            <p className="text-xs text-slate-500 mt-1">
              A separate answer scheme, if you have one. This always fills in just the missing answers into what's
              already above, it never replaces the question list.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverGuide(true)
              }}
              onDragLeave={() => setDragOverGuide(false)}
              onDrop={handleGuideDrop}
              className={`mt-3 rounded-xl border-2 border-dashed p-5 text-center transition ${
                dragOverGuide ? 'border-sky-400 bg-sky-50' : 'border-slate-300 bg-white'
              }`}
            >
              {parsingGuideDoc ? (
                <Loader2 size={20} className="mx-auto mb-2 animate-spin text-sky-500" />
              ) : (
                <FileUp size={20} className="mx-auto mb-2 text-slate-400" />
              )}
              <p className="text-sm font-medium text-slate-700">
                {parsingGuideDoc ? 'Reading document...' : 'Drag the marking guide / answers here'}
              </p>
              {!parsingGuideDoc && (
                <label className="mt-1 inline-block cursor-pointer text-xs font-medium text-sky-600 hover:text-sky-700">
                  or click to browse
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleGuideFileInputChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {guideFile && !parsingGuideDoc && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="truncate text-sm text-slate-600">{guideFile.name}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => setShowGuidePreview(true)}
                    className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                  >
                    <Eye size={14} /> Preview
                  </button>
                  <button
                    onClick={handleRemoveGuideDoc}
                    className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {showGuidePreview && guideFile && (
            <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 p-4 md:p-10">
              <div className="flex items-center justify-between pb-3">
                <span className="truncate text-sm font-medium text-white">{guideFile.name}</span>
                <button onClick={() => setShowGuidePreview(false)} className="rounded-full p-1.5 text-white hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto rounded-xl bg-white">
                {guidePreviewUrl ? (
                  <iframe src={guidePreviewUrl} title="Marking guide preview" className="h-full w-full" />
                ) : (
                  <div className="p-6">
                    <p className="mb-3 text-xs text-slate-500">
                      Word documents cannot be rendered in the browser directly, this is the text ScriptMark actually
                      read from it.
                    </p>
                    <pre className="whitespace-pre-wrap text-sm text-slate-700">{guidePreviewText || 'No preview text available.'}</pre>
                  </div>
                )}
              </div>
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
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto'
                            el.style.height = `${el.scrollHeight}px`
                          }
                        }}
                        placeholder="Enter the question prompt here..."
                        className="mt-1.5 w-full resize-none overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
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
                        rows={4}
                        value={part.modelAnswer}
                        onChange={(e) => updatePart(group.id, part.id, 'modelAnswer', e.target.value)}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto'
                            el.style.height = `${el.scrollHeight}px`
                          }
                        }}
                        placeholder="Paste the ideal response here... (formulas are fine as plain text, e.g. F = ma)"
                        className="mt-1.5 w-full resize-none overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
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

                      {currentGuideId && (
                        <p className="mt-3 text-xs text-slate-400">
                          Markers assign themselves to questions from the Claim Questions page, once they've joined
                          this session.
                        </p>
                      )}
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
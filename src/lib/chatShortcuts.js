// One tap shortcuts for the chat helper on each session page, built from
// what the page is showing right now, so the chips always make sense.

const label = (q) => `${q.number}${q.subLabel || ''}`

export function claimShortcuts(questions, userId, canManage) {
  const free = questions.filter((q) => !q.assignedMarkerId)
  const mine = questions.filter((q) => q.assignedMarkerId === userId)
  const chips = []
  // One chip per question number that still has a free part.
  const numbers = [...new Set(free.map((q) => q.number))].slice(0, 4)
  for (const n of numbers) chips.push(`Claim question ${n}`)
  if (free.length > 1) chips.push('Claim everything that is free')
  if (mine.length) chips.push(mine.length === 1 ? `Release question ${label(mine[0])}` : 'Release all my questions')
  chips.push('Which questions are still free?')
  if (canManage && questions.some((q) => q.assignedMarkerId && q.assignedMarkerId !== userId)) chips.push('Who has claimed what?')
  return chips
}

export function queueShortcuts(answers) {
  const open = answers.filter((a) => !a.confirmedAt)
  const chips = []
  if (open.some((a) => a.confidence === 'high')) chips.push('Confirm all the high confidence answers')
  if (open.some((a) => a.confidence === 'low' || a.confidence === 'medium')) chips.push('Which answers should I look at first?')
  if (open.length) chips.push('Confirm everything as the AI suggested')
  chips.push(open.length ? 'How many are left?' : 'Is everything confirmed?')
  return chips
}

export function resultsShortcuts(scripts) {
  const chips = []
  if (scripts.some((s) => s.answers?.some((a) => !a.confirmedAt))) chips.push('Open the next script that needs confirming')
  if (scripts.some((s) => s.hasLowConfidenceScore)) chips.push('Open a script with low confidence answers')
  if (scripts.some((s) => s.duplicateOf?.length)) chips.push('Which students were scanned twice?')
  chips.push('Who scored highest?', 'Who scored lowest?')
  return chips
}

export const ANALYTICS_SHORTCUTS = [
  'Which question was hardest?',
  'How many students scored below 40 percent?',
  'Who are the top three students?',
  'Summarise how the class did',
]

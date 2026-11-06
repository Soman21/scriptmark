// Marking point helpers shared by the guide editor, Results, My Queue and
// the Marking page.

// Sum of marks, kept to two decimals so 1.25 + 1.25 shows as 2.5.
export const sumMarks = (list) => Math.round((list || []).reduce((sum, x) => sum + Number(x.marks || 0), 0) * 100) / 100

// A guide total problem from the server, e.g. { label: 'Q3ii', kind:
// 'POINTS', expected: 5, actual: 1.5 } -> "Q3 ii: points 1.5 of 5".
export function warningText(w) {
  const label = String(w.label).replace(/^(Q\d+)(\D.*)$/, '$1 $2')
  return `${label}: ${w.kind === 'POINTS' ? 'points' : 'parts'} ${w.actual} of ${w.expected}`
}

export const RESULT_LABEL = { full: 'Full', partial: 'Partial', attempt: 'Attempt', none: 'None' }
export const RESULT_STYLE = {
  full: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  attempt: 'bg-slate-100 text-slate-600',
  none: 'bg-rose-50 text-rose-700',
}

// Points of an answer as the lecturer last left them: their own mark where
// they marked point by point, else the AI's.
export function startingPointScores(answer) {
  const points = Array.isArray(answer?.stepBreakdown) ? answer.stepBreakdown : []
  return points.map((p) => (p.confirmed ?? p.awarded ?? 0))
}

// Parts of the guide in the editor that will still have no answer after a
// marking guide file is merged in: groups are the editor's questions (from
// the question paper), incoming the questions read from the guide, matched
// the same way the merge does (question number, then position). Returns
// { total, missing: ['2a', '3'] }.
export function missingAnswers(groups, incoming) {
  const byNumber = {}
  for (const q of incoming || []) (byNumber[q.number] ||= []).push(q)
  const missing = []
  let total = 0
  for (const g of groups || []) {
    if (!g.parts.some((p) => String(p.text || '').trim())) continue
    g.parts.forEach((p, i) => {
      total++
      const match = byNumber[g.number]?.[i]
      const answered =
        String(p.modelAnswer || '').trim() || String(match?.modelAnswer || '').trim() || p.steps?.length || match?.steps?.length
      if (!answered) missing.push(`${g.number}${p.subLabel || match?.subLabel || (g.parts.length > 1 ? String.fromCharCode(97 + i) : '')}`)
    })
  }
  return { total, missing }
}

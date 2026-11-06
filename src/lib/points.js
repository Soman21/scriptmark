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

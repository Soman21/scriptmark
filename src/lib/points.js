// Marking point helpers shared by the guide editor, Results, My Queue and
// the Marking page.

// Sum of marks, kept to two decimals so 1.25 + 1.25 shows as 2.5.
export const sumMarks = (list) => Math.round((list || []).reduce((sum, x) => sum + Number(x.marks || 0), 0) * 100) / 100

const round2 = (n) => Math.round(n * 100) / 100

// "Any five" questions: the guide lists every accepted point and only the
// student's best countBest of them count (same rules as the server's
// markingPoints.js). null or '' means every point counts.
const COUNT_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }

export function cleanCountBest(value, pointCount) {
  const n = value === '' || value == null ? NaN : Number(value)
  return Number.isInteger(n) && n >= 1 && n < pointCount ? n : null
}

// "any five" / "any 3" in a question's text, when more points are listed.
export function countBestFrom(text, pointCount) {
  const m = String(text || '').match(/\bany\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i)
  if (!m) return null
  const word = m[1].toLowerCase()
  return cleanCountBest(COUNT_WORDS[word] ?? Number(word), pointCount)
}

// Positions of the points that count: the highest values, ties to the
// earlier point.
export function countedPoints(values, countBest) {
  const nums = (values || []).map((v) => Number(v) || 0)
  const all = nums.map((_, i) => i)
  const n = cleanCountBest(countBest, nums.length)
  if (n == null) return all
  return all
    .sort((a, b) => nums[b] - nums[a] || a - b)
    .slice(0, n)
    .sort((a, b) => a - b)
}

// Total of the points that count.
export function bestTotal(values, countBest) {
  const nums = (values || []).map((v) => Number(v) || 0)
  return round2(countedPoints(nums, countBest).reduce((sum, i) => sum + nums[i], 0))
}

// Points total line of a part in the guide editor, e.g.
// "5 / 5 marks (best 5 of 7)".
export function pointsTotalText(steps, marks, countBest) {
  const n = cleanCountBest(countBest, (steps || []).length)
  const total = bestTotal((steps || []).map((s) => s.marks), n)
  return `${totalText(total, marks)}${n ? ` (best ${n} of ${steps.length})` : ''}`
}

// What points (or a question's parts) add up to against the mark they
// should make, e.g. "1.5 / 5 marks".
export function totalText(total, of) {
  return `${round2(Number(total) || 0)} / ${round2(Number(of) || 0)} marks`
}

// A guide total problem from the server, e.g. { label: 'Q3ii', kind:
// 'POINTS', expected: 5, actual: 1.5 } -> "Q3 ii: points total 1.5 / 5 marks".
export function warningText(w) {
  const label = String(w.label).replace(/^(Q\d+)(\D.*)$/, '$1 $2')
  return `${label}: ${w.kind === 'POINTS' ? 'points' : 'parts'} total ${totalText(w.actual, w.expected)}`
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

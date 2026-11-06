import { RESULT_LABEL, RESULT_STYLE, sumMarks } from '../lib/points.js'

const NOTE_LABEL = { DIAGRAM: 'Labelled diagram', LABELS_OPTIONAL: 'Diagram' }
const round2 = (n) => Math.round(n * 100) / 100

// One row per marking point: the point, the AI's mark with Full, Partial or
// None, and the lecturer's own mark. values holds the lecturer's marks, one
// per point; onChange(index, value) is called as they type.
export default function PointRows({ answer, values, onChange, label }) {
  const points = Array.isArray(answer.stepBreakdown) ? answer.stepBreakdown : []
  if (!points.length) return null
  const aiTotal = round2(points.reduce((sum, p) => sum + Number(p.awarded || 0), 0))
  const lecturerTotal = sumMarks(values.map((v) => ({ marks: v })))

  return (
    <div className="mt-3 rounded-lg border border-slate-200">
      <div className="hidden grid-cols-[1fr_110px_88px] gap-3 border-b border-slate-100 px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid">
        <span>Marking Point</span>
        <span className="text-right">AI</span>
        <span className="text-right">Lecturer</span>
      </div>
      <div className="divide-y divide-slate-100">
        {points.map((p, i) => {
          const differs = Number(values[i]) !== Number(p.awarded)
          return (
            <div
              key={i}
              className={`grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 px-3.5 py-2.5 text-sm sm:grid-cols-[1fr_110px_88px] ${
                p.result && p.result !== 'full' ? 'bg-amber-50/40' : ''
              }`}
            >
              <div className="col-span-2 sm:col-span-1">
                <p className="text-slate-700">
                  {p.description} <span className="text-slate-400">({p.marks})</span>
                  {NOTE_LABEL[p.note] && (
                    <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">{NOTE_LABEL[p.note]}</span>
                  )}
                </p>
                {p.reasoning && <p className="mt-0.5 text-xs text-slate-400">{p.reasoning}</p>}
              </div>
              <div className="flex items-center gap-1.5 sm:justify-end">
                {p.result && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_STYLE[p.result]}`}>{RESULT_LABEL[p.result]}</span>
                )}
                <span className="font-medium text-slate-700">{p.awarded}</span>
              </div>
              <div className="text-right">
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max={p.marks}
                  value={values[i] ?? ''}
                  onChange={(e) => onChange(i, e.target.value)}
                  aria-label={`${label} point ${i + 1} mark`}
                  className={`w-16 rounded-lg border px-2 py-1 text-right text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-400 ${
                    differs ? 'border-brand-400' : 'border-slate-200'
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 border-t border-slate-200 px-3.5 py-2 text-sm font-semibold sm:grid sm:grid-cols-[1fr_110px_88px]">
        <span className="flex-1">Total</span>
        <span className="text-right">
          <span className="font-normal text-slate-400 sm:hidden">AI </span>
          {aiTotal}
        </span>
        <span className="text-right text-brand-700">
          <span className="font-normal text-slate-400 sm:hidden">Lecturer </span>
          {lecturerTotal}
        </span>
      </div>
    </div>
  )
}

// What the vision model saw of the student's drawing.
export function DrawingNote({ description, onViewPages }) {
  if (!description) return null
  const noLabels = description.startsWith('No labels.')
  return (
    <div className="mt-3 rounded-lg border border-gold-200 bg-gold-50 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">Drawing</p>
        {onViewPages && (
          <button onClick={onViewPages} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View pages
          </button>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
        {noLabels ? (
          <>
            <span className="font-medium">No labels.</span>
            {description.slice('No labels.'.length)}
          </>
        ) : (
          description
        )}
      </p>
    </div>
  )
}

// Fix all review: every suggested change to a guide's marks, grouped by
// question, old value crossed out. Nothing changes until Apply all.
// preview: { questions, changes: [{ label: 'Q6b', item: 'part' | 'point 2',
// from, to, reason }] } from POST /api/guides/fixTotals.
export default function FixTotalsDialog({ preview, onCancel, onApply }) {
  const changes = preview?.changes || []
  const byQuestion = []
  for (const c of changes) {
    const q = c.label.match(/^Q(\d+)/)?.[1] || c.label
    let group = byQuestion.find((g) => g.q === q)
    if (!group) byQuestion.push((group = { q, total: totalOf(preview.questions, q), rows: [] }))
    group.rows.push(c)
  }
  const left = preview?.warnings?.length || 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" onClick={onCancel}>
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Fix totals"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <p className="text-base font-bold text-slate-800">Fix totals</p>
          <span className="text-xs text-slate-500">{changes.length} change{changes.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-y-auto px-5 py-3">
          {changes.length === 0 && <p className="py-4 text-sm text-slate-500">No changes found.</p>}
          {byQuestion.map((g) => (
            <div key={g.q} className="mb-3">
              <p className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700">
                Question {g.q}
                {g.total ? ` · ${g.total}` : ''}
              </p>
              <table className="mt-1 w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase text-slate-400">
                    <th className="px-2 py-1 font-medium">Item</th>
                    <th className="px-2 py-1 font-medium">Now</th>
                    <th className="px-2 py-1 font-medium">Suggested</th>
                    <th className="px-2 py-1 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((c, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="px-2 py-1.5 text-slate-700">{itemName(c)}</td>
                      <td className="px-2 py-1.5 text-slate-400 line-through">{c.from}</td>
                      <td className="px-2 py-1.5 font-bold text-brand-500">{c.to}</td>
                      <td className="px-2 py-1.5 text-xs text-slate-500">{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {left > 0 && <p className="mt-2 text-xs text-amber-700">{left} issue{left !== 1 ? 's' : ''} left to fix by hand.</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={onApply}
            disabled={changes.length === 0}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            Apply all
          </button>
        </div>
      </div>
    </div>
  )
}

// "Part b", "Part b · point 5", or "Mark" for a question with no parts.
function itemName(c) {
  const part = c.label.replace(/^Q\d+/, '')
  const name = part ? `Part ${part}` : 'Mark'
  return c.item === 'part' ? name : `${name} · ${c.item}`
}

function totalOf(questions, number) {
  const q = (questions || []).find((x) => String(x.number) === String(number) && Number(x.questionTotal) > 0)
  return q ? Number(q.questionTotal) : null
}

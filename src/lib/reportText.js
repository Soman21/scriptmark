// Turns the examiner's report from /api/assistant/report into plain text
// for copying, and into a simple Word document for downloading.

function metaLine(f) {
  return [f.examinationType, f.semester, f.academicSession].filter(Boolean).join(', ')
}

function commentFor(report, question) {
  return report.questions.find((q) => q.question === question)?.comment || ''
}

export function reportRows(report) {
  const f = report.facts
  return {
    glance: [
      ['Scripts marked', `${f.scored} of ${f.scripts}`],
      ['Average total score', f.average == null ? 'None yet' : `${f.average}${f.maxTotal ? ' out of ' + f.maxTotal : ''}`],
      ['Highest total score', f.highest == null ? 'None yet' : `${f.highest}${f.maxTotal ? ' out of ' + f.maxTotal : ''}`],
      ['Weakest answered', f.hardest.join(', ') || 'None'],
      ['Best answered', f.easiest.join(', ') || 'None'],
    ],
    bands: f.distribution.map((d) => [`${d.range.replace("-", " to ")} percent`, d.value]),
    questions: f.perQuestion.map((q) => [q.question, q.maxMarks, `${q.averagePercent ?? 0} percent`, q.responses, commentFor(report, q.question)]),
    marking: [
      ['Answers confirmed by a lecturer', f.marking.humanConfirmed],
      ['Answers accepted automatically', f.marking.autoAccepted],
      ['AI score matched the lecturer exactly', f.marking.exactAgreement == null ? 'Not enough data' : `${f.marking.exactAgreement} percent`],
      ['AI score within one mark', f.marking.withinOneMark == null ? 'Not enough data' : `${f.marking.withinOneMark} percent`],
      ['Scores changed after confirming', f.marking.changedAfterConfirm],
    ],
  }
}

export function reportToText(report) {
  const f = report.facts
  const rows = reportRows(report)
  const block = (title, list) => [title, ...list.map((r) => `${r[0]}: ${r[1]}`), '']
  return [
    `Examiner's report: ${f.title}`,
    metaLine(f),
    '',
    'Overview',
    report.overview,
    '',
    ...block('At a glance', rows.glance),
    ...block('Score bands', rows.bands),
    'Questions',
    ...rows.questions.map((r) => `${r[0]} (${r[1]} marks): average ${r[2]} over ${r[3]} answers.${r[4] ? ' ' + r[4] : ''}`),
    '',
    ...block('How the marking went', rows.marking),
    'Recommendations',
    ...report.recommendations.map((r) => `• ${r}`),
    ...(report.notes?.trim() ? ['', "Lecturer's notes", report.notes.trim()] : []),
  ]
    .filter((line, i, all) => line !== '' || all[i - 1] !== '')
    .join('\n')
    .trim()
}

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function table(head, rows) {
  const cell = 'style="border:1px solid #999;padding:4px 8px;vertical-align:top"'
  const th = head.length ? `<tr>${head.map((h) => `<th ${cell} align="left">${esc(h)}</th>`).join('')}</tr>` : ''
  return `<table style="border-collapse:collapse;margin:6px 0 14px">${th}${rows.map((r) => `<tr>${r.map((c) => `<td ${cell}>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`
}

export function reportToWordHtml(report) {
  const f = report.facts
  const rows = reportRows(report)
  return `<html><head><meta charset="utf-8"><title>${esc(f.title)}</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt">
<h1 style="font-size:16pt">Examiner's report: ${esc(f.title)}</h1>
<p>${esc(metaLine(f))}</p>
<h2 style="font-size:13pt">Overview</h2><p>${esc(report.overview)}</p>
<h2 style="font-size:13pt">At a glance</h2>${table([], rows.glance)}
<h2 style="font-size:13pt">Score bands</h2>${table(['Band', 'Scripts'], rows.bands)}
<h2 style="font-size:13pt">Questions</h2>${table(['Question', 'Marks', 'Average', 'Answers', 'Comment'], rows.questions)}
<h2 style="font-size:13pt">How the marking went</h2>${table([], rows.marking)}
<h2 style="font-size:13pt">Recommendations</h2><ul>${report.recommendations.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
${report.notes?.trim() ? `<h2 style="font-size:13pt">Lecturer's notes</h2>${report.notes.trim().split(/\n+/).map((para) => `<p>${esc(para)}</p>`).join('')}` : ''}
</body></html>`
}

// The lecturer's own wording laid over the draft: edits replace the AI
// text, and blank recommendation lines are dropped.
export function applyEdits(report, edits) {
  if (!edits) return report
  return {
    ...report,
    overview: edits.overview ?? report.overview,
    questions: report.facts.perQuestion
      .map((q) => ({ question: q.question, comment: (edits.comments?.[q.question] ?? report.questions.find((x) => x.question === q.question)?.comment ?? '').trim() }))
      .filter((q) => q.comment),
    recommendations: edits.recommendations == null ? report.recommendations : edits.recommendations.split('\n').map((r) => r.replace(/^\s*[•*]\s*/, '').trim()).filter(Boolean),
    notes: edits.notes || '',
  }
}

export function editsFrom(report) {
  return {
    overview: report.overview,
    comments: Object.fromEntries(report.questions.map((q) => [q.question, q.comment])),
    recommendations: report.recommendations.join('\n'),
    notes: '',
  }
}

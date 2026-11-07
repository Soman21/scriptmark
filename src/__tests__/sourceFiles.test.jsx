import { render, screen, fireEvent } from '@testing-library/react'
import { SourceFileRow, SourceViewer, ReplaceDialog, canViewFile } from '../components/SourceFiles.jsx'

const pdf = { url: 'https://x/g.pdf', mimeType: 'application/pdf', name: 'ECE 538 GUIDE.pdf', text: 'Question 1', scanned: true, uploadedAt: '2026-11-07T05:00:00Z' }

describe('source files', () => {
  it('shows the kept file with its actions', () => {
    const calls = []
    render(<SourceFileRow file={pdf} onView={() => calls.push('view')} onText={() => calls.push('text')} onReplace={() => calls.push('replace')} onRemove={() => calls.push('remove')} />)
    expect(screen.getByText('ECE 538 GUIDE.pdf')).toBeTruthy()
    expect(screen.getByText(/Scanned · 7 Nov 2026/)).toBeTruthy()
    ;['View file', 'Text', 'Replace', 'Remove'].forEach((l) => fireEvent.click(screen.getByText(l)))
    expect(calls).toEqual(['view', 'text', 'replace', 'remove'])
  })

  it('Word files have no View file, only their text', () => {
    const docx = { ...pdf, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'g.docx' }
    expect(canViewFile(docx)).toBe(false)
    render(<SourceFileRow file={docx} onView={() => {}} onText={() => {}} onReplace={() => {}} onRemove={() => {}} />)
    expect(screen.queryByText('View file')).toBeNull()
  })

  it('shows the read text, view only', () => {
    render(<SourceViewer file={pdf} mode="text" text="Question 1 (20 Marks)" onClose={() => {}} />)
    expect(screen.getByText('Question 1 (20 Marks)')).toBeTruthy()
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('asks before replacing', () => {
    let ok = 0
    render(<ReplaceDialog kind="guide" onCancel={() => {}} onConfirm={() => ok++} />)
    expect(screen.getByText('Replace the marking guide?')).toBeTruthy()
    fireEvent.click(screen.getByText('Choose file'))
    expect(ok).toBe(1)
  })
})

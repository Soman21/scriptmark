import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import VoiceButton from '../components/VoiceButton.jsx'

afterEach(() => {
  delete window.webkitSpeechRecognition
})

describe('voice button', () => {
  it('is hidden when the browser cannot listen', () => {
    const { container } = render(<VoiceButton onText={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('passes what was heard to the chat box', () => {
    let instance
    window.webkitSpeechRecognition = class {
      constructor() {
        instance = this
      }
      start() {}
      stop() {}
      abort() {}
    }
    const onText = vi.fn()
    render(<VoiceButton onText={onText} />)
    fireEvent.click(screen.getByLabelText('Speak your request'))
    expect(screen.getByLabelText('Stop listening')).toBeTruthy()
    instance.onresult({ results: [[{ transcript: 'claim question two' }]] })
    instance.onend()
    expect(onText).toHaveBeenCalledWith('claim question two')
  })
})

describe('voice button, live words and errors', () => {
  it('shows words as they are heard and joins the final ones', () => {
    let instance
    window.webkitSpeechRecognition = class {
      constructor() {
        instance = this
      }
      start() {}
      stop() {
        this.onend()
      }
      abort() {}
    }
    const onText = vi.fn()
    const onInterim = vi.fn()
    render(<VoiceButton onText={onText} onInterim={onInterim} />)
    fireEvent.click(screen.getByLabelText('Speak your request'))
    const r = (transcript, isFinal) => Object.assign([{ transcript }], { isFinal })
    instance.onresult({ resultIndex: 0, results: [r('open the', false)] })
    expect(onInterim).toHaveBeenLastCalledWith('open the')
    instance.onresult({ resultIndex: 0, results: [r('open the script', true), r('of Ada', false)] })
    expect(onInterim).toHaveBeenLastCalledWith('open the script of Ada')
    fireEvent.click(screen.getByLabelText('Stop listening'))
    expect(onText).toHaveBeenCalledWith('open the script of Ada')
  })

  it('says when the microphone is blocked', () => {
    let instance
    window.webkitSpeechRecognition = class {
      constructor() {
        instance = this
      }
      start() {}
      stop() {}
      abort() {}
    }
    render(<VoiceButton onText={() => {}} />)
    fireEvent.click(screen.getByLabelText('Speak your request'))
    act(() => {
      instance.onerror({ error: 'not-allowed' })
      instance.onend()
    })
    expect(screen.getByRole('status').textContent).toBe('Allow the microphone for this site')
  })
})

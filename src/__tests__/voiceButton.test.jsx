import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

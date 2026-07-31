import { useRef, useState } from 'react'
import { loadSample, uploadAudio } from './api'

export default function AudioInput({ onEncounter, busy, setBusy }) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState(null)

  // MediaRecorder and its chunks live in refs, not state: changing them must not re-render
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const file = new File([blob], 'recording.webm', { type: recorder.mimeType })
        await send(() => uploadAudio(file, 'mic', null))
      }

      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch {
      setError('Could not access the microphone. Use upload or the bundled sample.')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setRecording(false)
  }

  async function send(fn) {
    setBusy(true)
    setError(null)
    try {
      const enc = await fn()
      onEncounter(enc)
    } catch (e) {
      setError(String(e.message))
    } finally {
      setBusy(false)
    }
  }

  const btn = 'rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40'

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-900">New consultation</h2>

      <div className="flex flex-wrap gap-3">
        {!recording ? (
          <button className={`${btn} bg-gray-900 text-white`} onClick={startRecording} disabled={busy}>
            Start recording
          </button>
        ) : (
          <button className={`${btn} bg-red-600 text-white`} onClick={stopRecording}>
            Stop recording
          </button>
        )}

        <label className={`${btn} cursor-pointer border border-gray-300 bg-white text-gray-800`}>
          Upload .wav / .mp3
          <input
            type="file"
            accept=".wav,.mp3,audio/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) send(() => uploadAudio(f, 'upload', null))
              e.target.value = '' // lets the same file be picked twice in a row
            }}
          />
        </label>

        <button
          className={`${btn} border border-gray-300 bg-white text-gray-800`}
          onClick={() => send(loadSample)}
          disabled={busy}
        >
          Load sample consultation
        </button>
      </div>

      {recording && <p className="mt-3 text-sm text-red-600">Recording…</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  deleteEncounter,
  generateNote,
  getEncounter,
  getHealth,
  listEncounters,
  saveNote,
  transcribeEncounter,
} from './api'
import StatusBar from './StatusBar'
import AudioInput from './AudioInput'
import EncounterPanel from './EncounterPanel'
import EncounterList from './EncounterList'
import TranscriptView from './TranscriptView'
import NoteEditor from './NoteEditor'
import FhirPanel from './FhirPanel'

export default function App() {
  const [health, setHealth] = useState(null)
  const [encounters, setEncounters] = useState([])
  const [current, setCurrent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(null))
    refreshList()
  }, [])

  async function refreshList() {
    setEncounters(await listEncounters())
  }

  async function selectEncounter(id) {
    setCurrent(await getEncounter(id))
  }

  async function handleNewEncounter(encounter) {
    await refreshList()
    await selectEncounter(encounter.id)
  }

  // every long-running action goes through here, so one place owns busy and error
  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      setCurrent(await action())
      await refreshList()
    } catch (e) {
      setError(String(e.message))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    await deleteEncounter(id)
    if (current?.id === id) setCurrent(null)
    await refreshList()
  }

  return (
    <div className="min-h-screen">
      <StatusBar health={health} timings={current} />

      <div className="mx-auto grid max-w-6xl gap-5 p-6 md:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <AudioInput onEncounter={handleNewEncounter} busy={busy} setBusy={setBusy} />

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}

          {current && (
            <>
              <EncounterPanel
                encounter={current}
                busy={busy}
                onTranscribe={() => run(() => transcribeEncounter(current.id))}
                onGenerateNote={() => run(() => generateNote(current.id))}
              />
              <TranscriptView
                encounterId={current.id}
                segments={current.segments}
                onChange={(segments) => setCurrent({ ...current, segments })}
              />
              {current.note && (
                <NoteEditor
                  note={current.note}
                  reviewed={current.reviewed}
                  busy={busy}
                  onSave={(note) => run(() => saveNote(current.id, note))}
                />
              )}
              <FhirPanel bundle={current.fhir_bundle} valid={current.fhir_valid} />
            </>
          )}
        </div>

        <EncounterList
          encounters={encounters}
          selectedId={current?.id}
          onSelect={selectEncounter}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}

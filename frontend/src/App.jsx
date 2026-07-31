import { useEffect, useState } from 'react'
import { deleteEncounter, getEncounter, getHealth, listEncounters, transcribeEncounter } from './api'
import StatusBar from './StatusBar'
import AudioInput from './AudioInput'
import EncounterPanel from './EncounterPanel'
import EncounterList from './EncounterList'
import TranscriptView from './TranscriptView'

export default function App() {
  const [health, setHealth] = useState(null)
  const [encounters, setEncounters] = useState([])
  const [current, setCurrent] = useState(null)
  const [busy, setBusy] = useState(false)

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

  async function handleTranscribe() {
    setBusy(true)
    try {
      setCurrent(await transcribeEncounter(current.id))
      await refreshList()
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

      <div className="mx-auto grid max-w-6xl gap-5 p-6 md:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <AudioInput onEncounter={handleNewEncounter} busy={busy} setBusy={setBusy} />

          {current && (
            <>
              <EncounterPanel encounter={current} busy={busy} onTranscribe={handleTranscribe} />
              <TranscriptView
                encounterId={current.id}
                segments={current.segments}
                onChange={(segments) => setCurrent({ ...current, segments })}
              />
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

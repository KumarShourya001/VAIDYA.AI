async function req(path, options) {
  const res = await fetch(path, options)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status}: ${body}`)
  }
  return res.json()
}

export const getHealth = () => req('/api/health')

export const listEncounters = () => req('/api/encounters')

export const getEncounter = (id) => req(`/api/encounters/${id}`)

export const deleteEncounter = (id) =>
  req(`/api/encounters/${id}`, { method: 'DELETE' })

export const loadSample = () => req('/api/audio/sample', { method: 'POST' })

export const transcribeEncounter = (id) =>
  req(`/api/encounters/${id}/transcribe`, { method: 'POST' })

export const editSegments = (id, edits) =>
  req(`/api/encounters/${id}/segments`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edits),
  })

export function uploadAudio(file, source, patientLabel) {
  const form = new FormData()
  form.append('file', file)
  form.append('source', source)
  if (patientLabel) form.append('patient_label', patientLabel)
  return req('/api/audio/upload', { method: 'POST', body: form })
}

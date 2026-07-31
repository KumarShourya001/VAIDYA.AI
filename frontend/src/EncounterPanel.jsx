import { Fragment } from 'react'

export default function EncounterPanel({ encounter, busy, onTranscribe }) {
  const rows = [
    ['Source', encounter.source],
    ['Duration', encounter.duration_s ? `${encounter.duration_s} s` : '—'],
    ['Status', encounter.status],
    ['Segments', encounter.segments.length],
  ]

  const label = busy ? 'Transcribing…' : encounter.segments.length ? 'Re-transcribe' : 'Transcribe'

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        {encounter.patient_label || `Encounter ${encounter.id}`}
      </h2>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([name, value]) => (
          <Fragment key={name}>
            <dt className="text-gray-500">{name}</dt>
            <dd className="text-gray-900">{value}</dd>
          </Fragment>
        ))}
      </dl>

      <button
        className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        onClick={onTranscribe}
        disabled={busy}
      >
        {label}
      </button>
    </div>
  )
}

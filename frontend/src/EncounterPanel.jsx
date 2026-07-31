import { Fragment } from 'react'

export default function EncounterPanel({ encounter, busy, onTranscribe, onGenerateNote }) {
  const rows = [
    ['Source', encounter.source],
    ['Duration', encounter.duration_s ? `${encounter.duration_s} s` : '—'],
    ['Status', encounter.status],
    ['Segments', encounter.segments.length],
  ]

  const hasTranscript = encounter.segments.length > 0
  const btn = 'rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40'

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

      <div className="mt-4 flex gap-3">
        <button className={`${btn} bg-gray-900 text-white`} onClick={onTranscribe} disabled={busy}>
          {hasTranscript ? 'Re-transcribe' : 'Transcribe'}
        </button>
        <button
          className={`${btn} border border-gray-300 bg-white text-gray-800`}
          onClick={onGenerateNote}
          disabled={busy || !hasTranscript}
        >
          {encounter.note ? 'Regenerate note' : 'Generate note'}
        </button>
      </div>
    </div>
  )
}

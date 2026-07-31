function Card({ title, children }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <h3 className="border-b border-gray-200 px-5 py-3 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="px-5 py-3 text-sm">{children}</div>
    </div>
  )
}

const empty = <p className="text-sm text-gray-400">none recorded</p>

export default function Portfolio({ portfolio, onOpenEncounter }) {
  const p = portfolio.patient

  return (
    <div className="flex flex-col gap-5">
      <Card title="Patient">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
          {[
            ['Name', p.full_name],
            ['Date of birth', p.dob],
            ['Sex', p.sex],
            ['Blood group', p.blood_group],
            ['Phone', p.phone],
            ['Emergency contact', p.emergency_contact_name],
            ['Contact phone', p.emergency_contact_phone],
            ['Hospital', p.hospital_phone],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-gray-500">{label}</div>
              <div className="text-gray-900">{value || '—'}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Medical conditions">
          {portfolio.conditions.length === 0 ? empty : (
            <ul className="flex flex-col gap-2">
              {portfolio.conditions.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-gray-900">{c.name}</div>
                    {c.notes && <div className="text-xs text-gray-500">{c.notes}</div>}
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                      c.status === 'active' ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {c.status} {c.since && `· ${c.since}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Allergies">
          {portfolio.allergies.length === 0 ? empty : (
            <ul className="flex flex-col gap-2">
              {portfolio.allergies.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-gray-900">{a.substance}</div>
                    <div className="text-xs text-gray-500">{a.reaction}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                      a.severity === 'severe' ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {a.severity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Current medications">
          {portfolio.current_medications.length === 0 ? empty : (
            <ul className="flex flex-col gap-2">
              {portfolio.current_medications.map((m, i) => (
                <li key={i}>
                  <div className="text-gray-900">{m.name}</div>
                  <div className="text-xs text-gray-500">
                    {[m.dose, m.frequency, m.duration, m.instruction].filter(Boolean).join(' · ') || '—'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Doctors seen">
          {portfolio.doctors_seen.length === 0 ? empty : (
            <ul className="flex flex-col gap-2">
              {portfolio.doctors_seen.map((d) => (
                <li key={d.id}>
                  <div className="text-gray-900">{d.name}</div>
                  <div className="text-xs text-gray-500">
                    {[d.specialty, d.hospital, d.phone].filter(Boolean).join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Appointments">
        {portfolio.appointments.length === 0 ? empty : (
          <ul className="flex flex-col gap-2">
            {portfolio.appointments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-gray-900">{a.scheduled_for}</div>
                  <div className="text-xs text-gray-500">
                    {[a.reason, a.doctor?.name].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Consultations">
        {portfolio.encounters.length === 0 ? empty : (
          <ul className="flex flex-col gap-2">
            {portfolio.encounters.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3">
                <button
                  className="text-left text-blue-700 hover:underline"
                  onClick={() => onOpenEncounter(e.id)}
                >
                  {e.created_at}
                </button>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{e.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

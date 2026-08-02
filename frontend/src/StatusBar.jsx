// What the bar claims has to match where the work actually happens, so the mode
// comes from the server's chat_backend rather than from demo mode alone.
const MODES = {
  ollama: {
    dot: 'bg-green-500',
    box: 'bg-green-50 text-green-900',
    text: 'On device — nothing leaves this machine',
  },
  browser: {
    dot: 'bg-amber-500',
    box: 'bg-amber-50 text-amber-900',
    text: 'Demo — speech and notes run inside your browser',
  },
  groq: {
    dot: 'bg-red-500',
    box: 'bg-red-50 text-red-900',
    text: 'Demo — notes and answers are sent to Groq',
  },
}

function ms(value) {
  if (value == null) return '—'
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${value} ms`
}

export default function StatusBar({ health, timings, patient, onSignOut }) {
  const mode = MODES[health?.chat_backend] ?? MODES.ollama

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-2.5 text-sm">
        <span className="font-semibold text-gray-900">Vaidya.AI</span>

        <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs ${mode.box}`}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${mode.dot}`} />
          {mode.text}
        </span>

        <span className="hidden text-xs text-gray-500 lg:inline">
          {health?.asr_model ? `whisper ${health.asr_model} · ${health.asr_device}` : 'speech —'}
          {health?.llm_model ? ` · ${health.llm_model}` : ''}
        </span>

        <div className="ml-auto flex items-center gap-4">
          <span className="font-mono text-xs text-gray-600">
            ASR {ms(timings?.asr_ms)} · LLM {ms(timings?.llm_ms)}
          </span>

          {patient && (
            <span className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <span className="text-gray-800">{patient.full_name}</span>
              <button
                className="text-xs text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
                onClick={onSignOut}
              >
                sign out
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

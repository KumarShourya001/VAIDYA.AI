export default function StatusBar({ health, timings }) {
  const dot = (ok) => (ok ? 'bg-green-500' : 'bg-red-500')

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white px-6 py-3 text-sm">
      <span className="font-semibold text-gray-900">Vaidya.AI</span>

      <span className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-green-800">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Offline — processing on device
      </span>

      <span className="flex items-center gap-2 text-gray-600">
        <span className={`h-2 w-2 rounded-full ${dot(health?.ffmpeg)}`} />
        ffmpeg
      </span>
      <span className="flex items-center gap-2 text-gray-600">
        <span className={`h-2 w-2 rounded-full ${dot(health?.ollama)}`} />
        {health?.llm_model ?? 'llm'}
      </span>
      <span className="flex items-center gap-2 text-gray-600">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        whisper {health?.asr_model ?? '?'} on {health?.asr_device ?? '?'}
      </span>

      <div className="ml-auto flex gap-3 font-mono text-xs text-gray-700">
        <span>ASR {timings?.asr_ms != null ? `${timings.asr_ms} ms` : '—'}</span>
        <span>LLM {timings?.llm_ms != null ? `${timings.llm_ms} ms` : '—'}</span>
      </div>
    </div>
  )
}

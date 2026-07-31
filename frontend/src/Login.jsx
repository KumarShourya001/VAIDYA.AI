import { useState } from 'react'
import { login, setToken } from './api'

export default function Login({ onSignedIn }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await login(username, password)
      setToken(result.token)
      onSignedIn(result.patient)
    } catch {
      setError('Wrong username or password.')
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded border border-gray-300 px-3 py-2 text-sm'

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border border-gray-200 bg-white p-6">
      <h1 className="mb-1 text-lg font-semibold text-gray-900">Vaidya.AI</h1>
      <p className="mb-5 text-sm text-gray-500">Sign in to see your medical record.</p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-gray-700">Username</span>
          <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-700">Password</span>
          <input
            className={input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          className="mt-1 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          disabled={busy || !username || !password}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-500">
        Demo accounts (fictional): <span className="font-mono">ananya</span>,{' '}
        <span className="font-mono">rohit</span>, <span className="font-mono">meera</span> — password{' '}
        <span className="font-mono">vaidya123</span>
      </p>
    </div>
  )
}

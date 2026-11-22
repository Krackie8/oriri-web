import React, { useState } from 'react'
import { adminClient } from '../wellness/functionClient/adminClient'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !email.trim()) return
    setBusy(true)
    // The answer is the same whoever asks, so the screen never says whether the email is on the team.
    try {
      await adminClient.requestLink(email.trim())
    } catch {
      /* same answer either way */
    } finally {
      setBusy(false)
      setSent(true)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl sm:text-3xl text-wb-ink">Oriri Admin</h1>
        <p className="mt-3 text-base text-wb-soft">Only Oriri's team can sign in here.</p>
        {sent ? (
          <div className="mt-10 rounded-2xl bg-wb-shell border border-wb-sand px-6 py-8" role="status">
            <p className="text-base text-wb-ink">Check your inbox. If this email is on Oriri's team, a sign-in link is on its way.</p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-5 text-sm text-wb-taupe underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C98A90]"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-4">
            <label className="block text-left text-sm text-wb-soft" htmlFor="admin-email">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-wb-sand bg-wb-shell px-5 py-3 text-base text-wb-ink outline-none focus:border-wb-taupe focus-visible:ring-2 focus-visible:ring-[#C98A90]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full px-6 py-3 text-base font-medium text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C98A90]"
              style={{ backgroundColor: '#C98A90' }}
            >
              {busy ? 'Sending…' : 'Send me a sign-in link'}
            </button>
          </form>
        )}
        <a href="/admin/legacy" className="mt-12 inline-block text-sm text-wb-taupe underline underline-offset-4">
          Old admin
        </a>
      </div>
    </main>
  )
}

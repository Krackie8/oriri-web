import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase/client'
import { adminClient } from '../wellness/functionClient/adminClient'
import { teamProblem, type TeamChange, type TeamMember, type TeamProblem } from '../wellness/functionClient/admin'
import { AFTER_SIGN_IN_KEY, dayWord, teamProblemWord, timeWord } from './view'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C98A90]'
const PILL = `rounded-full px-6 py-2.5 text-base text-white disabled:opacity-60 ${FOCUS} focus-visible:ring-offset-2`

interface Props {
  /** The current session counter; an answer for an older session is dropped. */
  currentGen: () => number
}

type Team = { members: TeamMember[]; changes: TeamChange[] }
type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; team: Team }
type Notice = { kind: 'ok' | 'problem'; text: string }

export default function TeamScreen({ currentGen }: Props) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [reauth, setReauth] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  /** Runs `ask` and hands back its answer only if the screen is still up for the same session. */
  const guarded = useCallback(
    async <T,>(ask: () => Promise<T>): Promise<{ stale: true } | { stale: false; value: T }> => {
      const g = currentGen()
      const value = await ask()
      return !alive.current || g !== currentGen() ? { stale: true } : { stale: false, value }
    },
    [currentGen],
  )

  const reload = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setLoad({ kind: 'loading' })
      const a = await guarded(() => adminClient.team())
      if (a.stale) return
      const r = a.value
      if (r.ok) setLoad({ kind: 'ready', team: r.data })
      else if (showLoading) setLoad({ kind: 'error' })
    },
    [guarded],
  )

  useEffect(() => {
    void reload(true)
  }, [reload])

  const problem = (p: TeamProblem) => {
    if (p === 'reauth') {
      setReauth(true)
      setNotice(null)
    } else {
      setReauth(false)
      setNotice({ kind: 'problem', text: teamProblemWord(p) })
    }
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!value || busy) return
    setBusy(true)
    setConfirming(null)
    const a = await guarded(() => adminClient.addToTeam(value))
    if (a.stale) return
    setBusy(false)
    const r = a.value
    if (r.ok) {
      setReauth(false)
      setNotice({ kind: 'ok', text: r.data === 'added' ? 'Added.' : 'Already on the team.' })
      if (r.data === 'added') {
        setEmail('')
        void reload(false)
      }
    } else {
      const p = teamProblem(r.error)
      problem(p)
      if (p === 'other') void reload(false)
    }
  }

  const remove = async (m: TeamMember) => {
    if (busy) return
    setBusy(true)
    setConfirming(null)
    const a = await guarded(() => adminClient.removeFromTeam(m.userId))
    if (a.stale) return
    setBusy(false)
    const r = a.value
    if (r.ok) {
      setReauth(false)
      setNotice({ kind: 'ok', text: 'Removed.' })
      void reload(false)
    } else {
      const p = teamProblem(r.error)
      problem(p)
      if (p === 'other') void reload(false)
    }
  }

  const sendLink = async () => {
    setBusy(true)
    let to: string | undefined
    try {
      const { data } = await supabase.auth.getSession()
      to = data.session?.user.email ?? undefined
    } catch {
      to = undefined
    }
    if (!to) {
      if (alive.current) {
        setBusy(false)
        setNotice({ kind: 'problem', text: teamProblemWord('other') })
      }
      return
    }
    try {
      localStorage.setItem(AFTER_SIGN_IN_KEY, 'team')
    } catch {
      /* Team just won't reopen by itself after sign-in */
    }
    const a = await guarded(() => adminClient.requestLink(to as string))
    if (a.stale) return
    setBusy(false)
    if (a.value.ok) {
      setLinkSent(true)
    } else {
      try {
        localStorage.removeItem(AFTER_SIGN_IN_KEY)
      } catch {
        /* nothing to undo */
      }
      setNotice({ kind: 'problem', text: teamProblemWord('other') })
    }
  }

  if (load.kind === 'loading') return <p className="text-base text-wb-soft">One moment…</p>
  if (load.kind === 'error') {
    return (
      <div role="alert">
        <p className="text-base text-wb-ink">Couldn't load the team.</p>
        <button type="button" onClick={() => void reload(true)} className={`mt-4 ${PILL}`} style={{ backgroundColor: '#C98A90' }}>
          Try again
        </button>
      </div>
    )
  }

  const { members, changes } = load.team
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl text-wb-ink">Team · {members.length}</h1>

      <div aria-live="polite" className="mt-6 space-y-3">
        {reauth && (
          <div role="alert" className="rounded-2xl bg-wb-shell border border-wb-sand px-5 py-4">
            <p className="text-base text-wb-ink">{teamProblemWord('reauth')}</p>
            {linkSent ? (
              <p className="mt-3 text-base text-wb-soft">Check your email for a new sign-in link.</p>
            ) : (
              <button type="button" disabled={busy} onClick={() => void sendLink()} className={`mt-3 ${PILL}`} style={{ backgroundColor: '#C98A90' }}>
                Send me a sign-in link
              </button>
            )}
          </div>
        )}
        {notice && <p className={`text-base ${notice.kind === 'ok' ? 'text-wb-soft' : 'text-wb-ink'}`}>{notice.text}</p>}
      </div>

      <ul className="mt-6 space-y-3">
        {members.map((m) => {
          const label = m.name ?? m.email
          return (
            <li key={m.userId} className="rounded-2xl bg-wb-shell border border-wb-sand px-5 py-4">
              <p className="text-base text-wb-ink break-words">{label}</p>
              {m.name && <p className="text-sm text-wb-soft break-words">{m.email}</p>}
              <p className="text-sm text-wb-taupe">
                Admin since {dayWord(m.since)} · Last sign-in {m.lastSignIn ? dayWord(m.lastSignIn) : 'never'}
              </p>
              {!m.isYou &&
                (confirming === m.userId ? (
                  <div className="mt-3">
                    <p className="text-base text-wb-ink break-words">Remove {label} from the team?</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <button type="button" disabled={busy} onClick={() => void remove(m)} className={PILL} style={{ backgroundColor: '#C98A90' }}>
                        Yes, remove
                      </button>
                      <button type="button" onClick={() => setConfirming(null)} className={`rounded-full border border-wb-sand px-6 py-2.5 text-base text-wb-ink ${FOCUS}`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setNotice(null)
                      setConfirming(m.userId)
                    }}
                    className={`mt-3 rounded-full border border-wb-sand px-5 py-2 text-base text-wb-ink disabled:opacity-60 ${FOCUS}`}
                  >
                    Remove
                  </button>
                ))}
            </li>
          )
        })}
      </ul>

      <form onSubmit={(e) => void add(e)} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Add a person: email"
          aria-label="Add a person: email"
          autoComplete="off"
          className={`min-w-0 flex-1 rounded-full border border-wb-sand bg-wb-shell px-5 py-2.5 text-base text-wb-ink placeholder:text-wb-taupe ${FOCUS}`}
        />
        <button type="submit" disabled={busy || !email.trim()} className={PILL} style={{ backgroundColor: '#C98A90' }}>
          Add
        </button>
      </form>

      <h2 className="mt-12 text-sm text-wb-taupe">Recent changes</h2>
      {changes.length === 0 ? (
        <p className="mt-3 text-base text-wb-soft">No changes yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {changes.map((c, i) => (
            <li key={`${c.at}-${i}`} className="text-base text-wb-ink break-words">
              <span className="text-wb-taupe">
                {dayWord(c.at)} {timeWord(c.at)}
              </span>{' '}
              {c.who} {c.action === 'add' ? 'added' : 'removed'} {c.whom}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import { adminClient } from '../wellness/functionClient/adminClient'
import { CONSENT_PURPOSES, type MemberDetail, type MemberListItem, type MemberTag } from '../wellness/functionClient/admin'
import { CONSENT_LABELS, consentWord, countWord, dayWord, lastSignInWord, memberLoadProblem, signsInWithWord, timeWord } from './view'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C98A90]'

interface Props {
  /** The current session counter; an answer for an older session is dropped. */
  currentGen: () => number
}

type Load<T> = { kind: 'loading' } | { kind: 'error'; status?: number } | { kind: 'ready'; data: T }

function Tag({ tag }: { tag: MemberTag }) {
  return (
    <span className="rounded-full px-2.5 py-0.5 text-sm text-white" style={{ backgroundColor: '#C98A90' }}>
      {tag === 'team' ? 'Team' : 'Test'}
    </span>
  )
}

function Retry({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert">
      <p className="text-base text-wb-ink">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className={`mt-4 rounded-full px-6 py-2.5 text-base text-white ${FOCUS} focus-visible:ring-offset-2`} style={{ backgroundColor: '#C98A90' }}>
        Try again
      </button>}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-wb-shell border border-wb-sand px-5 py-4">
      <h2 className="text-sm text-wb-taupe">{label}</h2>
      <div className="mt-2 space-y-1 text-base text-wb-ink break-words">{children}</div>
    </section>
  )
}

function Detail({ d }: { d: MemberDetail }) {
  const a = d.account
  const profileBits = [
    d.profile.area ? `Area ${d.profile.area}` : null,
    d.profile.instagram ? `Instagram @${d.profile.instagram.replace(/^@/, '')}` : null,
    d.profile.adultConfirmed ? 'Confirmed 18+' : 'Not confirmed 18+',
  ].filter(Boolean)
  const b = d.bestie
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl sm:text-3xl text-wb-ink break-words">{d.name ?? d.email}</h1>
        {d.tags.map((t) => (
          <Tag key={t} tag={t} />
        ))}
      </div>
      {d.name && <p className="mt-1 text-base text-wb-soft break-words">{d.email}</p>}
      <div className="mt-8 space-y-4">
        <Section label="Account">
          <p>
            Joined {dayWord(a.joined)} · {a.emailConfirmed ? 'Email confirmed' : 'Email not confirmed'} ·{' '}
            {a.lastSignIn ? `Last sign-in ${dayWord(a.lastSignIn)} ${timeWord(a.lastSignIn)}` : 'Never signed in'}
          </p>
          <p>
            {a.signsInWith.length > 0 ? `Signs in with ${signsInWithWord(a.signsInWith)} · ` : ''}
            {a.blocked ? 'Blocked' : 'Not blocked'}
          </p>
        </Section>
        <Section label="Profile">
          <p>{profileBits.join(' · ')}</p>
        </Section>
        <Section label="Consents">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {CONSENT_PURPOSES.map((p) => (
              <li key={p} className="flex justify-between gap-3">
                <span className="text-wb-soft">{CONSENT_LABELS[p]}</span>
                <span>{consentWord(d.consents[p])}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section label="Bestie">
          <p>
            {b.lastCheckIn ? `Last check-in ${dayWord(b.lastCheckIn)}` : 'No check-ins yet'} · {countWord(b.checkIns, 'check-in', 'check-ins')} · {b.done} done
          </p>
          <p>
            Streak {countWord(b.streak, 'day', 'days')} · Status {b.status} · {b.photosReported} {b.photosReported === 1 ? 'photo' : 'photos'} reported
          </p>
        </Section>
        <Section label="Membership">
          <p>{d.membership}</p>
        </Section>
      </div>
    </div>
  )
}

export default function MembersScreen({ currentGen }: Props) {
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  const [list, setList] = useState<Load<MemberListItem[]>>({ kind: 'loading' })
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<Load<MemberDetail>>({ kind: 'loading' })
  const [retryTick, setRetryTick] = useState(0)
  const listReq = useRef(0)
  const detailReq = useRef(0)

  // Wait for a pause in typing before asking.
  useEffect(() => {
    const t = setTimeout(() => setApplied(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const g = currentGen()
    const n = ++listReq.current
    void adminClient.members(applied).then((r) => {
      if (n !== listReq.current || g !== currentGen()) return
      setList(r.ok ? { kind: 'ready', data: r.data } : { kind: 'error' })
    })
  }, [applied, retryTick, currentGen])

  useEffect(() => {
    if (selected === null) return
    const g = currentGen()
    const n = ++detailReq.current
    setDetail({ kind: 'loading' })
    void adminClient.member(selected).then((r) => {
      if (n !== detailReq.current || g !== currentGen()) return
      setDetail(r.ok ? { kind: 'ready', data: r.data } : { kind: 'error', status: r.error.status })
    })
  }, [selected, retryTick, currentGen])

  // Nothing is applied after the screen is gone.
  useEffect(
    () => () => {
      listReq.current = -1
      detailReq.current = -1
    },
    [],
  )

  if (selected !== null) {
    return (
      <div>
        <button type="button" onClick={() => setSelected(null)} className={`mb-6 text-base text-wb-taupe rounded ${FOCUS}`}>
          ← Members
        </button>
        {detail.kind === 'loading' && <p className="text-base text-wb-soft">One moment…</p>}
        {detail.kind === 'error' && (() => {
          const p = memberLoadProblem(detail.status)
          return <Retry message={p.message} onRetry={p.canRetry ? () => setRetryTick((t) => t + 1) : undefined} />
        })()}
        {detail.kind === 'ready' && <Detail d={detail.data} />}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl text-wb-ink">Members</h1>
      {list.kind === 'ready' && applied && list.data.length > 0 && <p className="mt-1 text-base text-wb-soft">{list.data.length} found</p>}
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or email"
        aria-label="Search name or email"
        className={`mt-6 w-full rounded-full border border-wb-sand bg-wb-shell px-5 py-2.5 text-base text-wb-ink placeholder:text-wb-taupe ${FOCUS}`}
      />
      <div className="mt-6">
        {list.kind === 'loading' && <p className="text-base text-wb-soft">One moment…</p>}
        {list.kind === 'error' && <Retry message="Couldn't load Members." onRetry={() => setRetryTick((t) => t + 1)} />}
        {list.kind === 'ready' && list.data.length === 0 && <p className="text-base text-wb-soft">{applied ? 'No Members match that.' : 'No Members yet.'}</p>}
        {list.kind === 'ready' && list.data.length > 0 && (
          <ul className="space-y-3">
            {list.data.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelected(m.id)}
                  className={`block w-full rounded-2xl bg-wb-shell border border-wb-sand px-5 py-4 text-left hover:border-wb-taupe transition-colors ${FOCUS}`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base text-wb-ink break-words">{m.name ?? m.email}</span>
                    {m.tags.map((t) => (
                      <Tag key={t} tag={t} />
                    ))}
                  </span>
                  {m.name && <span className="block text-sm text-wb-soft break-words">{m.email}</span>}
                  <span className="block text-sm text-wb-taupe">
                    Joined {dayWord(m.joined)} · {lastSignInWord(m.lastSeen)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

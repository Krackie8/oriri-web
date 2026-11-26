import React, { useCallback, useEffect, useRef, useState } from 'react'
import { adminClient } from '../wellness/functionClient/adminClient'
import {
  EVENT_CATEGORIES,
  eventProblem,
  type Booking,
  type EventFields,
  type EventKind,
  type EventListItem,
  type EventsList,
} from '../wellness/functionClient/admin'
import { bookingsWord, dayWord, eventDayWord, kindLabel } from './view'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C98A90]'
const PILL = `rounded-full px-6 py-2.5 text-base text-white disabled:opacity-60 ${FOCUS} focus-visible:ring-offset-2`
const QUIET = `rounded-full border border-wb-sand px-5 py-2 text-base text-wb-ink disabled:opacity-60 ${FOCUS}`
const FIELD = `w-full rounded-2xl border border-wb-sand bg-wb-shell px-4 py-2.5 text-base text-wb-ink placeholder:text-wb-taupe ${FOCUS}`
const BLUSH = { backgroundColor: '#C98A90' }
const PAST_PAGE = 20
const MAX_PHOTOS = 12

interface Props {
  /** The current session counter; an answer for an older session is dropped. */
  currentGen: () => number
}

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; list: EventsList }
/** What she is adding: a Stepsisters meet-up or recap (both 'moment'), or a partner event. */
type Draft = { kind: EventKind; id: string | null; updatedAt: string | null; fields: EventFields }
type View = { kind: 'list' } | { kind: 'choose' } | { kind: 'form'; draft: Draft } | { kind: 'bookings'; event: EventListItem }

const today = () => new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10)
const blank = (kind: EventKind, type?: 'upcoming' | 'recap'): Draft => ({
  kind,
  id: null,
  updatedAt: null,
  fields: kind === 'moment' ? { title: '', date: today(), type: type ?? 'upcoming', photos: [], pinned: false } : { title: '', date: today(), category: 'Movement', pinned: false },
})
const fromItem = (e: EventListItem): Draft => {
  const { id, kind, createdAt: _c, updatedAt, bookings: _b, spots: _s, newBookings: _n, inMeetUp: _m, ...fields } = e
  return { kind, id, updatedAt, fields }
}

export default function EventsScreen({ currentGen }: Props) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [view, setView] = useState<View>({ kind: 'list' })
  const [notice, setNotice] = useState<string | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

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
      const a = await guarded(() => adminClient.events({ seen: true }))
      if (a.stale) return
      if (a.value.ok) setLoad({ kind: 'ready', list: a.value.data })
      else if (showLoading) setLoad({ kind: 'error' })
    },
    [guarded],
  )

  useEffect(() => {
    void reload(true)
  }, [reload])

  const back = (text: string | null) => {
    setNotice(text)
    setView({ kind: 'list' })
    void reload(false)
  }

  if (load.kind === 'loading') return <p className="text-base text-wb-soft">One moment…</p>
  if (load.kind === 'error') {
    return (
      <div role="alert">
        <p className="text-base text-wb-ink">Couldn't load events.</p>
        <button type="button" onClick={() => void reload(true)} className={`mt-4 ${PILL}`} style={BLUSH}>
          Try again
        </button>
      </div>
    )
  }

  if (view.kind === 'choose') {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl text-wb-ink">Add an event</h1>
        <div className="mt-8 flex flex-col gap-3">
          {[
            { label: 'Stepsisters meet-up', draft: () => blank('moment', 'upcoming') },
            { label: 'Stepsisters recap', draft: () => blank('moment', 'recap') },
            { label: 'Partner event', draft: () => blank('event') },
          ].map((o) => (
            <button key={o.label} type="button" onClick={() => setView({ kind: 'form', draft: o.draft() })} className={`rounded-2xl border border-wb-sand bg-wb-shell px-5 py-4 text-left text-base text-wb-ink hover:border-wb-taupe ${FOCUS}`}>
              {o.label}
            </button>
          ))}
          <button type="button" onClick={() => setView({ kind: 'list' })} className={`self-start ${QUIET}`}>
            Cancel
          </button>
        </div>
      </div>
    )
  }
  if (view.kind === 'form') return <EventForm draft={view.draft} guarded={guarded} onDone={back} onCancel={() => setView({ kind: 'list' })} />
  if (view.kind === 'bookings') return <Bookings event={view.event} guarded={guarded} onBack={() => back(null)} />

  return <EventList list={load.list} notice={notice} onAdd={() => { setNotice(null); setView({ kind: 'choose' }) }} onEdit={(e) => { setNotice(null); setView({ kind: 'form', draft: fromItem(e) }) }} onBookings={(e) => setView({ kind: 'bookings', event: e })} />
}

type Guarded = <T>(ask: () => Promise<T>) => Promise<{ stale: true } | { stale: false; value: T }>

function EventList({ list, notice, onAdd, onEdit, onBookings }: { list: EventsList; notice: string | null; onAdd: () => void; onEdit: (e: EventListItem) => void; onBookings: (e: EventListItem) => void }) {
  const [pastShown, setPastShown] = useState(PAST_PAGE)
  const row = (e: EventListItem) => (
    <li key={`${e.kind}-${e.id}`} className="rounded-2xl bg-wb-shell border border-wb-sand px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-base text-wb-ink break-words">{e.title}</p>
        {e.inMeetUp && (
          <span className="rounded-full px-3 py-0.5 text-sm text-white" style={BLUSH}>
            {e.pinned ? 'Pinned for Meet up' : 'Shows in Meet up this week'}
          </span>
        )}
      </div>
      <p className="text-sm text-wb-soft">
        {eventDayWord(e.date, e.startTime)}
        {e.location ? ` · ${e.location}` : ''}
      </p>
      <p className="text-sm text-wb-taupe">
        {kindLabel(e)} · {bookingsWord(e.bookings, e.spots)}
        {e.newBookings > 0 ? ` · ${e.newBookings} new` : ''}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={() => onEdit(e)} className={QUIET}>
          Edit
        </button>
        <button type="button" onClick={() => onBookings(e)} className={QUIET}>
          Bookings
        </button>
      </div>
    </li>
  )
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl text-wb-ink">Events</h1>
        <button type="button" onClick={onAdd} className={PILL} style={BLUSH}>
          Add an event
        </button>
      </div>
      <p aria-live="polite" className="mt-4 text-base text-wb-soft">
        {notice}
      </p>
      <h2 className="mt-6 text-sm text-wb-taupe">Coming up</h2>
      {list.upcoming.length === 0 ? <p className="mt-3 text-base text-wb-soft">Nothing coming up yet.</p> : <ul className="mt-3 space-y-3">{list.upcoming.map(row)}</ul>}
      <h2 className="mt-10 text-sm text-wb-taupe">Past</h2>
      {list.past.length === 0 ? (
        <p className="mt-3 text-base text-wb-soft">No past events.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">{list.past.slice(0, pastShown).map(row)}</ul>
          {list.past.length > pastShown && (
            <button type="button" onClick={() => setPastShown((n) => n + PAST_PAGE)} className={`mt-4 ${QUIET}`}>
              Show more
            </button>
          )}
        </>
      )}
    </div>
  )
}

function EventForm({ draft, guarded, onDone, onCancel }: { draft: Draft; guarded: Guarded; onDone: (notice: string) => void; onCancel: () => void }) {
  const [f, setF] = useState<EventFields>(draft.fields)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const set = (k: keyof EventFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }))
  const isMoment = draft.kind === 'moment'
  const recap = isMoment && f.type === 'recap'
  const heading = draft.id ? 'Edit event' : isMoment ? (recap ? 'New Stepsisters recap' : 'New Stepsisters meet-up') : 'New partner event'
  const photos = f.photos ?? []

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setProblem(null)
    setUploading(true)
    for (const file of Array.from(files)) {
      if (isMoment && (f.photos?.length ?? 0) >= MAX_PHOTOS) {
        setProblem(`Up to ${MAX_PHOTOS} photos.`)
        break
      }
      const a = await guarded(() => adminClient.uploadPhoto(file))
      if (a.stale) return
      if (!a.value.ok) {
        const p = eventProblem(a.value.error)
        setProblem(p.kind === 'invalid' ? p.problem : "That photo didn't upload. Try again.")
        break
      }
      const url = a.value.data
      setF((x) => (isMoment ? { ...x, photos: [...(x.photos ?? []), url].slice(0, MAX_PHOTOS) } : { ...x, image: url }))
      if (!isMoment) break
    }
    setUploading(false)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setProblem(null)
    const a = await guarded(() => (draft.id && draft.updatedAt ? adminClient.updateEvent(draft.kind, draft.id, draft.updatedAt, f) : adminClient.createEvent(draft.kind, f)))
    if (a.stale) return
    setBusy(false)
    if (a.value.ok) return onDone(draft.id ? 'Saved.' : 'Added.')
    const p = eventProblem(a.value.error)
    if (p.kind === 'stale') setStale(true)
    else setProblem(p.kind === 'invalid' ? p.problem : "That didn't work. Try again.")
  }

  const askDelete = async () => {
    if (!draft.id) return
    setBusy(true)
    const a = await guarded(() => adminClient.bookings(draft.kind, draft.id as string))
    if (a.stale) return
    setBusy(false)
    setConfirmDelete(a.value.ok ? a.value.data.length : 0)
  }
  const doDelete = async () => {
    if (!draft.id) return
    setBusy(true)
    const a = await guarded(() => adminClient.deleteEvent(draft.kind, draft.id as string))
    if (a.stale) return
    setBusy(false)
    if (a.value.ok) return onDone('Deleted.')
    setConfirmDelete(null)
    setProblem(a.value.error.status === 404 ? 'This event is already gone.' : "That didn't work. Try again.")
  }

  const label = (text: string, input: React.ReactNode) => (
    <label className="block">
      <span className="text-sm text-wb-taupe">{text}</span>
      <span className="mt-1 block">{input}</span>
    </label>
  )

  return (
    <form onSubmit={(e) => void save(e)}>
      <h1 className="text-2xl sm:text-3xl text-wb-ink">{heading}</h1>
      <div className="mt-8 space-y-5">
        {label('Title', <input value={f.title ?? ''} onChange={set('title')} maxLength={120} required className={FIELD} />)}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {label('Date', <input type="date" value={f.date ?? ''} onChange={set('date')} required className={FIELD} />)}
          {label('Start time (optional)', <input type="time" value={f.startTime ?? ''} onChange={set('startTime')} className={FIELD} />)}
        </div>
        {label('Location (optional)', <input value={f.location ?? ''} onChange={set('location')} maxLength={120} className={FIELD} />)}
        {label('Description (optional)', <textarea value={f.description ?? ''} onChange={set('description')} maxLength={1000} rows={4} className={FIELD} />)}
        {label('Link (optional)', <input type="url" inputMode="url" value={f.link ?? ''} onChange={set('link')} placeholder="https://" maxLength={500} className={FIELD} />)}
        {isMoment ? (
          <fieldset>
            <legend className="text-sm text-wb-taupe">Kind</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {(['upcoming', 'recap'] as const).map((t) => (
                <label key={t} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-base ${f.type === t ? 'border-wb-taupe text-wb-ink' : 'border-wb-sand text-wb-soft'}`}>
                  <input type="radio" name="type" checked={f.type === t} onChange={() => setF((x) => ({ ...x, type: t }))} className="sr-only" />
                  {t === 'upcoming' ? 'Meet-up' : 'Recap'}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {label('Partner (optional)', <input value={f.partner ?? ''} onChange={set('partner')} maxLength={80} className={FIELD} />)}
            {label(
              'Category',
              <select value={f.category ?? 'Movement'} onChange={set('category')} className={FIELD}>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>,
            )}
          </div>
        )}

        <div>
          <span className="text-sm text-wb-taupe">{isMoment ? `Photos (up to ${MAX_PHOTOS})` : 'Image (optional)'}</span>
          <div className="mt-2 flex flex-wrap gap-3">
            {(isMoment ? photos : f.image ? [f.image] : []).map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="h-20 w-20 rounded-xl object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setF((x) => (isMoment ? { ...x, photos: (x.photos ?? []).filter((p) => p !== url) } : { ...x, image: '' }))}
                  className={`absolute -right-2 -top-2 h-7 w-7 rounded-full bg-wb-shell border border-wb-sand text-sm text-wb-ink ${FOCUS}`}
                >
                  ×
                </button>
              </div>
            ))}
            {(isMoment ? photos.length < MAX_PHOTOS : !f.image) && (
              <label className={`flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-wb-sand text-center text-sm text-wb-taupe ${uploading ? 'opacity-60' : ''}`}>
                {uploading ? 'Uploading…' : 'Add photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple={isMoment} disabled={uploading} onChange={(e) => { void upload(e.target.files); e.target.value = '' }} className="sr-only" />
              </label>
            )}
          </div>
        </div>

        <label className="flex items-center gap-3 text-base text-wb-ink">
          <input type="checkbox" checked={f.pinned === true} onChange={(e) => setF((x) => ({ ...x, pinned: e.target.checked }))} className="h-5 w-5 accent-[#C98A90]" />
          Pin for Meet up
        </label>
        <p className="-mt-3 text-sm text-wb-soft">A pinned event shows in Meet up in the week it's on, ahead of the others.</p>
      </div>

      <div aria-live="polite" className="mt-6">
        {problem && <p role="alert" className="text-base text-wb-ink">{problem}</p>}
        {stale && (
          <div role="alert" className="rounded-2xl bg-wb-shell border border-wb-sand px-5 py-4">
            <p className="text-base text-wb-ink">Someone else changed this event. Reload to see it.</p>
            <button type="button" onClick={() => onDone('Reloaded. Make your change again.')} className={`mt-3 ${PILL}`} style={BLUSH}>
              Reload
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="submit" disabled={busy || uploading} className={PILL} style={BLUSH}>
          {draft.id ? 'Save' : 'Add'}
        </button>
        <button type="button" onClick={onCancel} className={QUIET}>
          Cancel
        </button>
      </div>

      {draft.id && (
        <div className="mt-12 border-t border-wb-sand pt-6">
          {confirmDelete === null ? (
            <button type="button" disabled={busy} onClick={() => void askDelete()} className={QUIET}>
              Delete this event
            </button>
          ) : (
            <div>
              <p className="text-base text-wb-ink">
                {confirmDelete === 0 ? 'Delete this event?' : `Delete this event? Its ${confirmDelete === 1 ? 'booking' : `${confirmDelete} bookings`} will be removed too.`}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" disabled={busy} onClick={() => void doDelete()} className={PILL} style={BLUSH}>
                  Yes, delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(null)} className={QUIET}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  )
}

function Bookings({ event, guarded, onBack }: { event: EventListItem; guarded: Guarded; onBack: () => void }) {
  const [list, setList] = useState<Booking[] | 'loading' | 'error'>('loading')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setList('loading')
    const a = await guarded(() => adminClient.bookings(event.kind, event.id))
    if (a.stale) return
    setList(a.value.ok ? a.value.data : 'error')
  }, [event, guarded])

  useEffect(() => {
    void load()
  }, [load])

  const remove = async (b: Booking) => {
    setBusy(true)
    const a = await guarded(() => adminClient.removeBooking(event.kind, event.id, b.email))
    if (a.stale) return
    setBusy(false)
    setConfirming(null)
    setNotice(a.value.ok ? 'Removed.' : "That didn't work. Try again.")
    void load()
  }

  const copy = async (rows: Booking[]) => {
    try {
      await navigator.clipboard.writeText(rows.map((b) => b.email).join(', '))
      setNotice('Copied')
    } catch {
      setNotice("Couldn't copy. Select the emails below instead.")
    }
  }

  return (
    <div>
      <button type="button" onClick={onBack} className={`text-base text-wb-taupe rounded ${FOCUS}`}>
        ← Events
      </button>
      <h1 className="mt-6 text-2xl sm:text-3xl text-wb-ink break-words">{event.title}</h1>
      <p className="mt-2 text-base text-wb-soft">{eventDayWord(event.date, event.startTime)}</p>
      <p aria-live="polite" className="mt-4 text-base text-wb-soft">
        {notice}
      </p>
      {list === 'loading' ? (
        <p className="mt-6 text-base text-wb-soft">One moment…</p>
      ) : list === 'error' ? (
        <div role="alert" className="mt-6">
          <p className="text-base text-wb-ink">Couldn't load the bookings.</p>
          <button type="button" onClick={() => void load()} className={`mt-4 ${PILL}`} style={BLUSH}>
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <p className="mt-6 text-base text-wb-soft">No bookings yet.</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-wb-ink">{bookingsWord(list.length, list.reduce((t, b) => t + b.guests, 0))}</p>
            <button type="button" onClick={() => void copy(list)} className={QUIET}>
              Copy emails
            </button>
          </div>
          <ul className="mt-4 space-y-3">
            {list.map((b) => (
              <li key={b.email} className="rounded-2xl bg-wb-shell border border-wb-sand px-5 py-4">
                <p className="text-base text-wb-ink break-words">{b.name || b.email}</p>
                <p className="text-sm text-wb-soft break-words">
                  {b.email}
                  {b.phone ? ` · ${b.phone}` : ''}
                </p>
                <p className="text-sm text-wb-taupe">
                  {b.guests === 1 ? '1 spot' : `${b.guests} spots`}
                  {b.bookedAt ? ` · Booked ${dayWord(b.bookedAt)}` : ''}
                </p>
                {confirming === b.email ? (
                  <div className="mt-3">
                    <p className="text-base text-wb-ink break-words">Remove {b.name || b.email}'s booking?</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <button type="button" disabled={busy} onClick={() => void remove(b)} className={PILL} style={BLUSH}>
                        Yes, remove
                      </button>
                      <button type="button" onClick={() => setConfirming(null)} className={QUIET}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" disabled={busy} onClick={() => { setNotice(null); setConfirming(b.email) }} className={`mt-3 ${QUIET}`}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

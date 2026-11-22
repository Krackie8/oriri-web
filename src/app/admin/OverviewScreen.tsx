import React from 'react'
import type { Overview } from '../wellness/functionClient/admin'
import { short, trendWord } from './view'

interface Props {
  state: { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; overview: Overview }
  onRetry: () => void
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-wb-shell border border-wb-sand px-5 py-5">
      <h2 className="text-sm text-wb-taupe">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  )
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-base text-wb-soft">{label}</span>
      <span className="text-base text-wb-ink">
        {value}
        {note && (
          <span className="ml-2 rounded-full px-2.5 py-0.5 text-sm text-white" style={{ backgroundColor: '#C98A90' }}>
            {note}
          </span>
        )}
      </span>
    </div>
  )
}

export default function OverviewScreen({ state, onRetry }: Props) {
  if (state.kind === 'loading') return <p className="text-base text-wb-soft">Loading the numbers…</p>
  if (state.kind === 'error') {
    return (
      <div role="alert">
        <p className="text-base text-wb-ink">Couldn't load the numbers. Try again.</p>
        <button type="button" onClick={onRetry} className="mt-4 rounded-full px-6 py-2.5 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C98A90]" style={{ backgroundColor: '#C98A90' }}>
          Try again
        </button>
      </div>
    )
  }
  const o = state.overview
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl text-wb-ink">Overview</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card title="Visits">
          <Row label="Last 7 days" value={short(o.visits.week)} note={trendWord(o.visits.week, o.visits.weekBefore)} />
          <Row label="Last 30 days" value={short(o.visits.month)} note={trendWord(o.visits.month, o.visits.monthBefore)} />
        </Card>
        <Card title="Members">
          <Row label="Total" value={short(o.members.total)} />
          <Row label="This week" value={short(o.members.week)} />
          <Row label="This month" value={short(o.members.month)} />
        </Card>
        <Card title="Active this week">
          <Row label="Members" value={short(o.activeWeek)} />
        </Card>
        <Card title="Leads not yet Members">
          <Row label="Leads" value={short(o.leads)} />
        </Card>
        <Card title="Paying">
          <Row label="Paying" value="After Membership" />
        </Card>
      </div>
      <a
        href="https://analytics.google.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-block text-base text-wb-taupe underline underline-offset-4"
      >
        More detail in Google Analytics
      </a>
    </div>
  )
}

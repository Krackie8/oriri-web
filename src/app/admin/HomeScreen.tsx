import React from 'react'
import type { Overview } from '../wellness/functionClient/admin'
import { TILES } from './tiles'
import { countWord, eventsTileLine, greeting, dubaiHour, short, summaryLine } from './view'

interface Props {
  firstName: string | null
  overview: Overview | null
  /** How many admins, once Team has answered. */
  teamCount: number | null
  /** The Events tile's counts, once Events has answered. */
  eventsTile: { comingUp: number; bookings: number; fresh: boolean } | null
  onOpen: (key: string) => void
}

export default function HomeScreen({ firstName, overview, teamCount, eventsTile, onOpen }: Props) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl text-wb-ink">{greeting(dubaiHour(), firstName)}</h1>
      {overview && <p className="mt-3 text-base text-wb-soft">{summaryLine(overview)}</p>}
      <div className="mt-10 grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
        {TILES.map((t) => {
          const line =
            t.key === 'members' && overview ? `${short(overview.members.total)} ${overview.members.total === 1 ? 'Member' : 'Members'}`
            : t.key === 'team' && teamCount !== null ? countWord(teamCount, 'admin', 'admins')
            : t.key === 'events' && eventsTile ? eventsTileLine(eventsTile)
            : null
          const pill = t.key === 'events' && eventsTile?.fresh === true
          return t.live ? (
            <button
              key={t.key}
              type="button"
              onClick={() => onOpen(t.key)}
              aria-label={pill ? `${t.label}, new bookings` : undefined}
              className="relative aspect-square rounded-2xl bg-wb-shell border border-wb-sand px-2 flex items-center justify-center text-center text-base text-wb-ink hover:border-wb-taupe transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C98A90]"
            >
              {pill && <span aria-hidden className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#C98A90' }} />}
              {line ? (
                <span className="flex flex-col gap-1">
                  <span>{t.label}</span>
                  <span className="text-sm text-wb-soft">{line}</span>
                </span>
              ) : (
                t.label
              )}
            </button>
          ) : (
            <button
              key={t.key}
              type="button"
              disabled
              className="aspect-square rounded-2xl bg-wb-stone border border-transparent px-2 flex flex-col items-center justify-center gap-1 text-center text-wb-taupe opacity-60 cursor-default"
            >
              <span className="text-base">{t.label}</span>
              <span className="text-sm">Coming soon</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react';
import { CalendarHeart, Flame, Sun } from 'lucide-react';
import { functionClient, type MorningCard as Card, type StreakView } from '../functionClient';
import { supabase } from '../../utils/supabase/client';
import { streakLine } from './morningView';

/**
 * Her morning card (#74, DEC-013), for Members only. `when`: 'member' fetches straight away; 'session'
 * first checks she is signed in, so a visitor never calls. Any failure leaves it null: the card
 * simply does not show, and the Check-in or plan under it is untouched.
 */
export function useMorning(when: 'member' | 'session' | 'never', refreshKey: unknown = 0): Card | null {
  const [card, setCard] = useState<Card | null>(null);
  useEffect(() => {
    if (when === 'never') return;
    let live = true;
    (async () => {
      if (when === 'session') {
        const session = await supabase.auth.getSession().then(({ data }) => data.session).catch(() => null);
        if (!session) return;
      }
      const r = await functionClient.bestie.morning().catch(() => null);
      if (live && r?.ok && r.data.outcome === 'morning') setCard(r.data.card);
    })();
    return () => {
      live = false;
    };
  }, [when, refreshKey]);
  return card;
}

const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export function MorningCard({ card }: { card: Card }) {
  const m = card.meetUp;
  const meetUpText = m ? [m.title, [dayLabel(m.date), m.time].filter(Boolean).join(', '), m.location].filter(Boolean).join(' · ') : null;
  return (
    <section aria-label="Morning with Bestie" className="wb-rise mt-5 rounded-[14px] bg-wb-plum px-5 py-4 text-white">
      <p className="text-[14px] font-medium uppercase tracking-[0.16em] text-white/75">Morning with Bestie</p>
      {card.line && (
        <p className="mt-1 text-[24px] leading-tight" style={{ fontFamily: 'var(--font-wb-hand)' }}>
          {card.line.text}
          {card.line.by === 'ren' && <span className="ml-2 whitespace-nowrap text-[18px] text-white/75">· Ren</span>}
        </p>
      )}
      <ul className="mt-3 space-y-1.5 text-[15px] leading-snug text-white/90">
        <li className="flex gap-2">
          <Sun className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden />
          <span>{card.sky.hint}</span>
        </li>
        {m && meetUpText && (
          <li className="flex gap-2">
            <CalendarHeart className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden />
            <span>
              This week:{' '}
              {m.url ? (
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                  {meetUpText}
                </a>
              ) : (
                meetUpText
              )}
            </span>
          </li>
        )}
        <li className="flex gap-2">
          <Flame className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden />
          <span>{streakLine(card.streak)}</span>
        </li>
      </ul>
    </section>
  );
}

/** The evening Wrap-up's header: how far she got today, and her Streak. */
export function WrapUpHeader({ summary, streak }: { summary: string; streak: StreakView | null }) {
  return (
    <section aria-label="Wrap-up" className="wb-rise mt-5 rounded-[14px] bg-wb-plum px-5 py-4 text-white">
      <p className="text-[14px] font-medium uppercase tracking-[0.16em] text-white/75">Your Wrap-up</p>
      <p className="mt-1 text-[24px] leading-tight" style={{ fontFamily: 'var(--font-wb-hand)' }}>
        {summary}
      </p>
      <p className="mt-2 text-[15px] leading-snug text-white/90">
        Tick off what you did, one at a time. A Mindset asks for one line about it.
      </p>
      {streak && (
        <p className="mt-2 flex gap-2 text-[15px] text-white/90">
          <Flame className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden />
          {streakLine(streak)}
        </p>
      )}
    </section>
  );
}

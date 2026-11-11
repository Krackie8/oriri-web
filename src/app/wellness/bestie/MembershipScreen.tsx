/** 5 · Membership preview: greeting, week strip, "Bestie noticed", Meetup swipe, waitlist CTA. */
import React, { useMemo, useRef, useState } from 'react';
import { Check, Heart, HeartHandshake, MapPin, Sparkles, X } from 'lucide-react';
import { Card, Chip, Eyebrow, GoldRule, Photo, PillButton, PillLink, PillarIcon, Screen, cx } from './kit';
import type { PillarKey } from './picks';
import { ctaClick, track } from '../analytics/track';

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export function week() {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

const TODAY: { pillar: PillarKey; time: string; title: string }[] = [
  { pillar: 'move', time: '50 min', title: 'Reformer Pilates' },
  { pillar: 'meal', time: '10 min', title: 'Protein overnight oats' },
  { pillar: 'mindset', time: '30 min', title: 'Tea for Two, new episode' },
  { pillar: 'meetup', time: 'Today', title: 'Stepsisters sunset walk' },
];

/** Sample profiles for the preview. Real members replace these at launch. */
export const PROFILES = [
  { name: 'Layla', age: 31, area: 'Jumeirah Lake Towers (JLT)', interests: ['Reformer', 'Brunch', 'Tea for Two'], photo: '1544005313-94ddf0286df2', handle: 'layla', likesYou: true },
  { name: 'Sofia', age: 28, area: 'Al Barsha', interests: ['Run club', 'Journaling'], photo: '1674932668403-33398b81c92f', handle: 'sofia', likesYou: false },
  { name: 'Maya', age: 35, area: 'Jumeirah', interests: ['Yoga', 'Sunset walks', 'Books'], photo: '1552699611-e2c208d5d9cf', handle: 'maya', likesYou: true },
];

export default function MembershipScreen() {
  const days = useMemo(week, []);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const [day, setDay] = useState(todayIdx);

  return (
    <Screen className="pb-20 pt-24">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-wb-gold/70 px-3 py-1 text-[14px] text-wb-plum">
        <Sparkles className="h-3.5 w-3.5 text-wb-gold" strokeWidth={1.5} /> Membership preview
      </span>
      <h1 className="mt-5 text-[36px] leading-[1.08] text-wb-ink">{greeting()}.</h1>
      <p className="mt-2 text-[16px] text-wb-soft">Here's your week, planned around you.</p>

      {/* Week strip */}
      <div className="mt-6 grid grid-cols-7 gap-1" role="tablist" aria-label="This week">
        {days.map((d, i) => {
          const on = i === day;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setDay(i)}
              className={cx(
                'flex h-[72px] flex-col items-center justify-center gap-1 rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-gold',
                on ? 'bg-wb-plum text-wb-paper' : 'text-wb-soft hover:bg-wb-stone',
              )}
            >
              <span className="text-[14px]">{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
              <span className={cx('text-[16px] font-medium', !on && i === todayIdx && 'text-wb-plum')}>{d.getDate()}</span>
              <span className={cx('h-1 w-1 rounded-full', on ? 'bg-wb-gold' : i < 5 ? 'bg-wb-plum/40' : 'bg-transparent')} />
            </button>
          );
        })}
      </div>

      <Card className="mt-4 p-4">
        <ul className="divide-y divide-wb-sand/80">
          {TODAY.map((t) => (
            <li key={t.title} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wb-paper text-wb-plum">
                <PillarIcon pillar={t.pillar} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] text-wb-ink">{t.title}</span>
              <span className="shrink-0 text-[14px] text-wb-taupe">{t.time}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Noticed />
      <BestieSwipe />

      <section className="mt-8 rounded-[20px] bg-wb-plum p-6 text-wb-paper">
        <GoldRule />
        <h2 className="mt-4 text-[28px] text-wb-paper">Join the waitlist</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-wb-paper/85">Be first to try Bestie every day, with priority places at Stepsisters events.</p>
        <PillLink to="/pilot" tone="ivory" className="mt-6 w-full" onClick={() => ctaClick('Join the waitlist', 'membership')}>
          Join the waitlist
        </PillLink>
      </section>
    </Screen>
  );
}

/* ── "Bestie noticed" pattern card ────────────────────────────────────── */

const ALT_TIMES = ['6:30 AM', '12:30 PM', '6:00 PM'];

export function Noticed({ trial }: { trial?: boolean } = {}) {
  const [state, setState] = useState<'ask' | 'change' | 'kept' | 'changed'>('ask');
  const [time, setTime] = useState('7:00 AM');
  return (
    <Card as="section" className="mt-6 border-wb-gold/50 bg-wb-gold-soft/60 p-5">
      <p className="inline-flex items-center gap-1.5 text-[14px] font-medium uppercase tracking-[0.16em] text-wb-plum">
        <Sparkles className="h-4 w-4 text-wb-gold" strokeWidth={1.5} /> Bestie noticed
      </p>
      {trial && <p className="mt-1 text-[14px] text-wb-taupe">A sample from a member's first week: after about 7 days, Bestie spots patterns like this and plans around them.</p>}
      <p className="mt-3 font-wb-serif text-[20px] leading-snug text-wb-ink">
        You've picked a morning Move three times this week. Shall I keep Reformer as your Tuesday {time} ritual?
      </p>
      {state === 'ask' && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <PillButton
            size="md"
            onClick={() => {
              setState('kept');
              track('pattern_keep');
            }}
          >
            Keep it
          </PillButton>
          <PillButton
            size="md"
            tone="outline"
            onClick={() => {
              setState('change');
              track('pattern_change');
            }}
          >
            Change
          </PillButton>
        </div>
      )}
      {state === 'change' && (
        <div className="mt-4">
          <p className="text-[14px] text-wb-taupe">Pick a new time</p>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="New time">
            {ALT_TIMES.map((t) => (
              <Chip
                key={t}
                role="radio"
                selected={false}
                onClick={() => {
                  setTime(t);
                  setState('changed');
                }}
              >
                {t}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {(state === 'kept' || state === 'changed') && (
        <p className="mt-4 inline-flex items-center gap-2 text-[15px] text-wb-plum" role="status">
          <Check className="h-4 w-4" strokeWidth={2} />
          {state === 'kept' ? "Saved. I'll plan your Tuesdays around it." : `Updated to ${time}. I'll remember that.`}
        </p>
      )}
    </Card>
  );
}

/* ── Meetup: swipe for a bestie ───────────────────────────────────────── */

export function BestieSwipe() {
  const [idx, setIdx] = useState(0);
  const [dx, setDx] = useState(0);
  const [said, setSaid] = useState<string[]>([]);
  const [match, setMatch] = useState<(typeof PROFILES)[number] | null>(null);
  const start = useRef<number | null>(null);
  const p = PROFILES[idx];

  const decide = (hi: boolean) => {
    if (!p) return;
    track('bestie_swipe', { action: hi ? 'say_hi' : 'pass' });
    if (hi) setSaid((s) => [...s, p.name]);
    // Both said hi: it's a match
    if (hi && p.likesYou) {
      setMatch(p);
      track('bestie_match');
    }
    setDx(hi ? 420 : -420);
    setTimeout(() => {
      setIdx((i) => i + 1);
      setDx(0);
    }, 220);
  };

  return (
    <section className="mt-8" aria-labelledby="swipe-title">
      <Eyebrow>Meetup</Eyebrow>
      <h2 id="swipe-title" className="mt-2 text-[28px]">Swipe for a bestie</h2>
      <p className="mt-1 text-[15px] text-wb-soft">Women near you with similar plans, like the same class or café this week. Everyone can see profiles; swiping is for members.</p>

      {match && (
        <Card as="section" className="mt-5 border-wb-gold/60 bg-wb-gold-soft/60 p-5" aria-live="polite">
          <p className="inline-flex items-center gap-1.5 text-[14px] font-medium uppercase tracking-[0.16em] text-wb-plum">
            <Sparkles className="h-4 w-4 text-wb-gold" strokeWidth={1.5} /> It's mutual
          </p>
          <p className="mt-2 font-wb-serif text-[22px] leading-snug text-wb-ink">You and {match.name} both said hi.</p>
          <p className="mt-1 text-[15px] leading-relaxed text-wb-soft">Say hello and plan your first class or coffee together.</p>
          <span
            aria-disabled
            className="mt-4 flex h-12 w-full cursor-default items-center justify-center gap-2 rounded-full bg-wb-plum text-[15px] font-medium text-wb-paper/90"
          >
            <HeartHandshake className="h-4 w-4" strokeWidth={1.7} /> Say hello
          </span>
          <p className="mt-2 text-center text-[14px] text-wb-taupe">Preview: messaging opens for members.</p>
          <button type="button" onClick={() => setMatch(null)} className="mt-2 flex h-11 w-full items-center justify-center text-[15px] text-wb-plum underline underline-offset-4">
            Keep swiping
          </button>
        </Card>
      )}

      {p ? (
        <>
          <div
            className="relative mt-5 touch-pan-y select-none overflow-hidden rounded-[20px] border border-wb-sand/80 bg-wb-shell"
            style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)`, transition: start.current === null ? 'transform 220ms ease' : 'none' }}
            onPointerDown={(e) => {
              start.current = e.clientX;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => start.current !== null && setDx(e.clientX - start.current)}
            onPointerUp={() => {
              const d = dx;
              start.current = null;
              if (Math.abs(d) > 90) decide(d > 0);
              else setDx(0);
            }}
            onPointerCancel={() => {
              start.current = null;
              setDx(0);
            }}
          >
            <Photo src={p.photo} alt={`${p.name}, sample profile`} className="pointer-events-none aspect-[4/5]" w={700} h={875} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2B2522]/85 via-[#2B2522]/40 to-transparent p-5 pt-20 text-wb-paper">
              <p className="font-wb-serif text-[28px] leading-none">
                {p.name}, {p.age}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-wb-paper/90">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.6} /> {p.area}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.interests.map((t) => (
                  <span key={t} className="rounded-full border border-wb-paper/40 px-3 py-1 text-[14px]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            {dx !== 0 && (
              <span
                className={cx(
                  'absolute top-5 rounded-full px-4 py-1.5 text-[15px] font-medium',
                  dx > 0 ? 'left-5 bg-wb-gold text-wb-ink' : 'right-5 bg-wb-shell text-wb-plum',
                )}
                style={{ opacity: Math.min(1, Math.abs(dx) / 90) }}
              >
                {dx > 0 ? 'Say hi' : 'Pass'}
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <PillButton tone="outline" onClick={() => decide(false)}>
              <X className="h-4 w-4" strokeWidth={1.8} /> Pass
            </PillButton>
            <PillButton onClick={() => decide(true)}>
              <Heart className="h-4 w-4" strokeWidth={1.8} /> Say hi
            </PillButton>
          </div>
          <p className="mt-3 text-center text-[14px] text-wb-taupe">Sample profiles for the preview.</p>
        </>
      ) : (
        <Card className="mt-5 p-6 text-center">
          <p className="font-wb-serif text-[22px] text-wb-ink">That's everyone nearby today</p>
          <p className="mt-2 text-[15px] text-wb-soft">
            {said.length ? `You said hi to ${said.join(' and ')}. We'll let you know when they say hi back.` : 'New faces arrive every day for members.'}
          </p>
          <PillButton
            tone="outline"
            size="md"
            className="mt-5"
            onClick={() => {
              setIdx(0);
              setSaid([]);
              setMatch(null);
            }}
          >
            Start again
          </PillButton>
        </Card>
      )}
    </section>
  );
}

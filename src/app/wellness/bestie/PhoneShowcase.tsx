/** Homepage: what Bestie looks like on your phone, with callouts around it (InCharge-style). */
import React from 'react';
import { Check, Heart, Plus } from 'lucide-react';
import { PillarIcon, Screen, cx } from './kit';
import type { PillarKey } from './picks';

const DAYS = (() => {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
})();
const todayIdx = Math.min((new Date().getDay() + 6) % 7, 4);

const PLAN: { pillar: PillarKey; title: string; time: string; done?: boolean }[] = [
  { pillar: 'move', title: 'Reformer Pilates', time: '7:00 AM', done: true },
  { pillar: 'meal', title: 'Matcha & oats', time: '8:15 AM', done: true },
  { pillar: 'mindset', title: 'Tea for Two', time: '12:30 PM' },
  { pillar: 'meetup', title: 'Stepsisters walk', time: '6:00 PM' },
];

const DOT: Record<PillarKey, string> = { move: '#B8A291', meal: '#9DB59A', mindset: '#C9B2C6', meetup: '#D9B79C' };

function Ring({ value, label, pillar }: { value: number; label: string; pillar: PillarKey }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-1 flex-col items-center rounded-[12px] bg-white px-1 py-2 shadow-[0_2px_8px_-4px_rgba(43,37,34,0.15)]">
      <div className="relative h-11 w-11">
        <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden>
          <circle cx="22" cy="22" r={r} fill="none" stroke="#EFEAE5" strokeWidth="4" />
          <circle cx="22" cy="22" r={r} fill="none" stroke="#B8A291" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} />
        </svg>
        <PillarIcon pillar={pillar} className="absolute inset-0 m-auto h-4 w-4 text-wb-plum" />
      </div>
      <span className="mt-1 text-[9px] text-wb-taupe">{label}</span>
    </div>
  );
}

/** The phone itself. Purely decorative: the real screens are one tap away. */
function Phone() {
  return (
    <div aria-hidden className="relative mx-auto w-[236px] rounded-[40px] border-[7px] border-[#1d1a19] bg-[#1d1a19] shadow-[0_30px_60px_-25px_rgba(43,37,34,0.6)]">
      <div className="overflow-hidden rounded-[33px] bg-[#FBFAF8]">
        <div className="mx-auto mt-2 h-[18px] w-[76px] rounded-full bg-[#1d1a19]" />
        <div className="px-3 pb-3 pt-3">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-[#DDD4CD] px-2.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-wb-taupe">Today</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EFE9E3] text-[9px] text-wb-plum">L</span>
          </div>
          <p className="mt-2 text-[13px] font-medium text-wb-ink" style={{ fontFamily: 'var(--font-wb-serif)' }}>Good morning, Layla</p>
          <p className="text-[9px] text-wb-taupe">Steady energy · 2 hrs · AED 100</p>

          <div className="mt-2 grid grid-cols-5 gap-1">
            {DAYS.map((d, i) => (
              <div key={i} className={cx('flex flex-col items-center rounded-full py-1.5', i === todayIdx ? 'border border-[#DDD4CD] bg-white' : '')}>
                <span className="text-[8px] text-wb-taupe">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                <span className="h-1 w-1 rounded-full bg-[#D9CFC6]" />
                <span className="text-[11px] text-wb-ink">{d.getDate()}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-wb-taupe">Your day</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E7DED6] text-white">
              <Plus className="h-3 w-3" strokeWidth={2} />
            </span>
          </div>
          <ul className="mt-1.5 space-y-1.5">
            {PLAN.map((p) => (
              <li key={p.title} className="flex items-center gap-2 rounded-[10px] bg-white px-2.5 py-2 shadow-[0_2px_8px_-4px_rgba(43,37,34,0.15)]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DOT[p.pillar] }} />
                <span className={cx('min-w-0 flex-1 truncate text-[10px]', p.done ? 'text-wb-taupe line-through' : 'text-wb-ink')}>{p.title}</span>
                <span className="text-[9px] text-wb-taupe">{p.time}</span>
                <span className={cx('flex h-3.5 w-3.5 items-center justify-center rounded-full border', p.done ? 'border-[#B8A291] bg-[#B8A291] text-white' : 'border-[#DDD4CD]')}>
                  {p.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex gap-1.5">
            <Ring value={0.75} label="Move" pillar="move" />
            <Ring value={0.5} label="Meal" pillar="meal" />
            <Ring value={0.3} label="Mindset" pillar="mindset" />
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-[10px] bg-[#EFE9E3] px-2.5 py-2">
            <Heart className="h-3 w-3 text-wb-plum" strokeWidth={2} />
            <span className="text-[9px] text-wb-soft">Maya likes reformer too. Say hi?</span>
          </div>
        </div>
        <div className="flex justify-around border-t border-[#EEE9E4] bg-[#F5F3F0] py-2">
          {(['move', 'meal', 'mindset', 'meetup'] as PillarKey[]).map((k) => (
            <PillarIcon key={k} pillar={k} className="h-3.5 w-3.5 text-[#C2B5AA]" />
          ))}
        </div>
      </div>
    </div>
  );
}

const CALLOUTS = [
  { text: 'Check in with your energy, time and budget. Bestie plans the rest.', pos: 'top-[6%] right-0' },
  { text: 'Move, Meal, Mindset and Meet up picks, each linked to book, cook or listen.', pos: 'top-[31%] left-0' },
  { text: 'Tick things off and watch your week build.', pos: 'top-[56%] right-0' },
  { text: 'Swipe for a bestie: meet women with the same rituals.', pos: 'top-[78%] left-0' },
];

export default function PhoneShowcase() {
  return (
    <section className="mt-12 bg-[#DDD4CD] py-14">
      <Screen>
        <p className="text-center text-[14px] font-medium uppercase tracking-[0.18em] text-wb-soft">On your phone</p>
        <h2 className="mt-2 text-center text-[28px] leading-[1.1] text-wb-ink">Your day, planned in your pocket</h2>
        <div className="relative mt-8">
          <Phone />
          {CALLOUTS.map((c) => (
            <p
              key={c.text}
              className={cx('absolute w-[150px] rounded-[10px] bg-[#7D6D61] px-3.5 py-3 text-[14px] leading-snug text-white shadow-[0_10px_24px_-14px_rgba(43,37,34,0.6)]', c.pos)}
            >
              {c.text}
            </p>
          ))}
        </div>
      </Screen>
    </section>
  );
}

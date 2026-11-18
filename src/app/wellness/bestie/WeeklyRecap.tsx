/**
 * "Your week with Bestie": a pop-up when a signed-in member opens the site,
 * once per week, built from what they ticked and how it felt (kept on this device).
 * Preview any time with ?recap=1 (shows a sample if this device has no week yet).
 */
import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PillLink, cx } from './kit';
import { weekRecap, type WeekRecap } from './tracker';
import { track } from '../analytics/track';

const SEEN_KEY = 'wb_recap_seen_week';

/** Year-week, e.g. "2026-45", so the recap shows once a week. */
function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-${Math.ceil(((t.getTime() - start.getTime()) / 86400000 + 1) / 7)}`;
}

const SAMPLE: WeekRecap = {
  daysActive: 4,
  done: 11,
  moveMinutes: 190,
  mindMinutes: 85,
  favourite: 'Reformer Pilates',
  loved: ['Reformer Pilates', 'Sauna & cold plunge'],
  notForMe: ['Community run club'],
  skipped: ['Five-minute journal'],
};

export default function WeeklyRecap() {
  const { isLoggedIn, loading } = useAuth();
  const [recap, setRecap] = useState<{ data: WeekRecap; sample: boolean } | null>(null);

  useEffect(() => {
    let forced = false;
    try {
      forced = new URLSearchParams(window.location.search).has('recap');
    } catch {
      /* ignore */
    }
    if (!forced && (loading || !isLoggedIn)) return;
    let seen = '';
    try {
      seen = localStorage.getItem(SEEN_KEY) || '';
    } catch {
      /* private mode */
    }
    if (!forced && seen === weekId()) return;
    const data = weekRecap();
    if (!data.done && !forced) return; // nothing to recap yet
    setRecap({ data: data.done ? data : SAMPLE, sample: !data.done });
    track('weekly_recap_view', { sample: !data.done });
  }, [isLoggedIn, loading]);

  if (!recap) return null;
  const { data: r, sample } = recap;
  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, weekId());
    } catch {
      /* private mode */
    }
    setRecap(null);
  };

  const next: string[] = [];
  if (r.loved[0]) next.push(`More ${r.loved[0]}, since you loved it`);
  else if (r.favourite) next.push(`Keep ${r.favourite} in, since it's your most-ticked pick`);
  if (r.notForMe[0]) next.push(`Swap out ${r.notForMe[0]}`);
  else if (r.skipped[0]) next.push(`Move ${r.skipped[0]} to an easier slot, as you skipped it`);
  next.push(r.daysActive >= 5 ? 'Add a proper rest day. You earned it' : 'Plan around the days you actually showed up');

  const stats = [
    { v: `${r.daysActive}`, l: r.daysActive === 1 ? 'day active' : 'days active' },
    { v: `${r.done}`, l: 'picks done' },
    { v: `${r.moveMinutes}m`, l: 'moved' },
    { v: `${r.mindMinutes}m`, l: 'mindset' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 pb-[max(env(safe-area-inset-bottom),16px)] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="recap-title">
      <div className="wb-rise w-full max-w-[420px] rounded-[22px] bg-wb-shell p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-[14px] font-medium uppercase tracking-[0.16em] text-wb-plum">
            <Sparkles className="h-4 w-4 text-wb-gold" strokeWidth={1.5} /> Your week with Bestie
          </p>
          <button type="button" onClick={close} aria-label="Close" className="-mr-2 -mt-2 flex h-10 w-10 items-center justify-center rounded-full text-wb-taupe hover:bg-wb-stone">
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>
        <p id="recap-title" className="mt-2 font-wb-serif text-[24px] leading-snug text-wb-ink">
          {r.favourite ? `You showed up ${r.daysActive} ${r.daysActive === 1 ? 'day' : 'days'}, and ${r.favourite} was your thing.` : `You showed up ${r.daysActive} ${r.daysActive === 1 ? 'day' : 'days'} this week.`}
        </p>
        {sample && <p className="mt-1 text-[13px] text-wb-taupe">Sample week, for preview.</p>}

        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          {stats.map((s) => (
            <div key={s.l} className="rounded-[12px] bg-wb-paper px-1 py-3">
              <p className="font-wb-serif text-[20px] text-wb-ink">{s.v}</p>
              <p className="text-[12px] leading-tight text-wb-taupe">{s.l}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[14px] font-medium uppercase tracking-[0.14em] text-wb-taupe">Next week, Bestie will</p>
        <ul className="mt-2 space-y-2">
          {next.map((t, i) => (
            <li key={t} className="flex gap-2.5 text-[15px] text-wb-soft">
              <span className={cx('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', i === 0 ? 'bg-wb-gold' : 'bg-wb-plum/50')} />
              {t}
            </li>
          ))}
        </ul>

        <PillLink to="/plan/inputs" className="mt-6 w-full" onClick={close}>
          Plan today
        </PillLink>
        <button type="button" onClick={close} className="mt-2 flex h-11 w-full items-center justify-center text-[15px] text-wb-plum underline underline-offset-4">
          Maybe later
        </button>
      </div>
    </div>
  );
}

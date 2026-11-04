/** 1 · Homepage */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Lock, MapPin } from 'lucide-react';
import * as wellnessApi from '../../utils/wellnessApi';
import { Card, Eyebrow, GoldRule, Photo, PillarIcon, PillLink, Screen, cx } from './kit';
import { PILLARS, type Pick, type Pillar } from './picks';
import { cardClick, ctaClick } from '../analytics/track';
import { withUtm } from '../analytics/utm';

const BOX = { move: 'move', meal: 'meal', mindset: 'mindset', meetup: 'meetups' } as const;

export default function HomeScreen() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Screen className="pt-14">
        <Eyebrow>The directory</Eyebrow>
        <h2 className="mt-2 text-[30px]">Ren's picks</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-wb-soft">Places, recipes and listens I love, across the four pillars.</p>
        <div className="mt-6 space-y-4">
          {PILLARS.map((p) => (
            <PillarCard key={p.key} pillar={p} />
          ))}
        </div>
      </Screen>
      <PlumBand />
    </>
  );
}

function Hero() {
  return (
    <Screen className="pt-24">
      <div className="wb-rise">
        <Eyebrow>Wellness Bestie by ORIRI</Eyebrow>
        <h1 className="mt-4 text-[42px] leading-[1.05] text-wb-ink">Your wellness plan, curated for you.</h1>
        <GoldRule className="mt-6" />
        <p className="mt-5 text-[16px] leading-relaxed text-wb-soft">Move, Meal and Mindset, planned around your energy, time and budget.</p>
        <PillLink to="/plan" className="mt-7 w-full" onClick={() => ctaClick('Check in — it\'s free', 'hero')}>
          Check in — it's free
        </PillLink>
        <p className="mt-3 text-center text-[14px] text-wb-taupe">Two minutes. No account needed.</p>
      </div>
    </Screen>
  );
}

const STEPS = [
  { title: 'Check in', body: 'Tell us your energy, the time you have and your budget.' },
  { title: 'Get your planner', body: 'Move, Meal and Mindset picks that fit your energy, time and budget, each linked so you can book, cook or listen.' },
  { title: 'Tap & track', body: 'Tick things off and watch your progress build. Behind the scenes, Bestie remembers what works for you.' },
];

function HowItWorks() {
  return (
    <Screen className="pt-12">
      <Eyebrow>How it works</Eyebrow>
      <ol className="mt-5 space-y-5">
        {STEPS.map((st, n) => (
          <li key={st.title} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-wb-gold font-wb-serif text-[17px] text-wb-plum">{n + 1}</span>
            <span>
              <span className="block font-wb-serif text-[20px] leading-snug text-wb-ink">{st.title}</span>
              <span className="mt-0.5 block text-[15px] leading-relaxed text-wb-soft">{st.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </Screen>
  );
}

function PickRow({ pick, box }: { pick: Pick; box: (typeof BOX)[keyof typeof BOX] }) {
  const inner = (
    <>
      <Photo src={pick.image} className="h-14 w-14 shrink-0 rounded-[14px]" w={160} h={160} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-wb-ink">{pick.title}</span>
        <span className="block truncate text-[14px] text-wb-taupe">{pick.meta}</span>
      </span>
      {pick.members ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wb-gold-soft px-2.5 py-1 text-[14px] text-wb-plum">
          <Lock className="h-3.5 w-3.5" strokeWidth={1.6} /> Members
        </span>
      ) : pick.url ? (
        <ArrowUpRight className="h-4 w-4 shrink-0 text-wb-taupe" strokeWidth={1.6} />
      ) : null}
    </>
  );
  const cls = 'flex items-center gap-3 rounded-[16px] p-2 -mx-2 transition-colors';
  const onClick = () => cardClick(box, pick.title);
  if (pick.members) {
    return (
      <Link to={withUtm('/membership')} onClick={onClick} className={cx(cls, 'hover:bg-wb-paper')}>
        {inner}
      </Link>
    );
  }
  if (pick.url) {
    return pick.url.startsWith('/') ? (
      <Link to={withUtm(pick.url)} onClick={onClick} className={cx(cls, 'hover:bg-wb-paper')}>
        {inner}
      </Link>
    ) : (
      <a href={pick.url} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cx(cls, 'hover:bg-wb-paper')}>
        {inner}
      </a>
    );
  }
  return <div className={cls}>{inner}</div>;
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  const box = BOX[pillar.key];
  return (
    <Card as="section" className="overflow-hidden">
      <div className="relative">
        <Photo src={pillar.image} className="aspect-[16/9]" w={860} h={484} />
        <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-wb-shell/90 text-wb-plum backdrop-blur">
          <PillarIcon pillar={pillar.key} className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="p-5">
        <h3 className="text-[26px] text-wb-ink">{pillar.name}</h3>
        <p className="mt-1 text-[14px] text-wb-taupe">{pillar.covers}</p>
        <div className="mt-4 space-y-1 border-t border-wb-sand/80 pt-3">
          {pillar.picks.map((pk) => (
            <PickRow key={pk.title} pick={pk} box={box} />
          ))}
        </div>
        {pillar.key === 'meetup' && <MeetupEvents />}
      </div>
    </Card>
  );
}

function PlumBand() {
  return (
    <section className="mt-14 bg-wb-plum py-14 text-wb-paper">
      <Screen>
        <GoldRule />
        <h2 className="mt-5 text-[32px] leading-[1.1] text-wb-paper">Or let Bestie curate your whole day</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-wb-paper/80">Tell us your energy, time and budget. We plan the rest as one tickable list, with links to book, cook or listen.</p>
        <PillLink to="/plan" tone="ivory" className="mt-7 w-full" onClick={() => ctaClick('Check in — it\'s free', 'band')}>
          Check in — it's free
        </PillLink>
      </Screen>
    </section>
  );
}

type EventRow = { id: string; date: string; title: string; meta: string; tag: string; url: string };

/** Upcoming Stepsisters meetups (by ORIRI) and wellness events, from the admin calendar. */
function useUpcoming(): EventRow[] | null {
  const [rows, setRows] = useState<EventRow[] | null>(null);
  useEffect(() => {
    let live = true;
    const today = wellnessApi.toDateKey(new Date());
    Promise.all([wellnessApi.getMoments(), wellnessApi.getEvents()]).then(([m, e]) => {
      if (!live) return;
      const fmtTime = (t?: string) =>
        t ? new Date(`2000-01-01T${t}`).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : '';
      const moments: EventRow[] = (m.data || [])
        .filter((x) => x.type !== 'recap' && x.date && x.date >= today)
        .map((x) => ({ id: `m-${x.id}`, date: x.date!, title: x.title, meta: [fmtTime(x.startTime), x.location].filter(Boolean).join(' · '), tag: 'Stepsisters · Free', url: x.link || '/community' }));
      const events: EventRow[] = (e.data || [])
        .filter((x) => x.date >= today)
        .map((x) => ({ id: `e-${x.id}`, date: x.date, title: x.title, meta: [fmtTime(x.startTime), x.location].filter(Boolean).join(' · '), tag: x.partner || x.category || 'Wellness event', url: x.link || '' }));
      setRows([...moments, ...events].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4));
    });
    return () => {
      live = false;
    };
  }, []);
  return rows;
}

function EventItem({ row }: { row: EventRow }) {
  const d = new Date(`${row.date}T00:00`);
  const inner = (
    <>
      <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[14px] border border-wb-gold/60 bg-wb-shell">
        <span className="text-[14px] uppercase text-wb-taupe">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
        <span className="font-wb-serif text-[20px] leading-none text-wb-plum">{d.getDate()}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] text-wb-taupe">{row.tag}</span>
        <span className="block truncate text-[16px] font-medium text-wb-ink">{row.title}</span>
        {row.meta && (
          <span className="mt-0.5 flex items-center gap-1 truncate text-[14px] text-wb-soft">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
            <span className="truncate">{row.meta}</span>
          </span>
        )}
      </span>
      {row.url && <ArrowUpRight className="h-4 w-4 shrink-0 text-wb-taupe" strokeWidth={1.6} />}
    </>
  );
  const cls = 'flex items-center gap-3.5 py-3';
  const onClick = () => cardClick('meetups', row.title);
  if (!row.url) return <li className={cls}>{inner}</li>;
  return (
    <li>
      {row.url.startsWith('/') ? (
        <Link to={withUtm(row.url)} onClick={onClick} className={cls}>
          {inner}
        </Link>
      ) : (
        <a href={row.url} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls}>
          {inner}
        </a>
      )}
    </li>
  );
}

/** Inside the Meetup pillar: upcoming Stepsisters meetups (ORIRI) and wellness events. */
function MeetupEvents() {
  const rows = useUpcoming();
  return (
    <div className="mt-4 border-t border-wb-sand/80 pt-4">
      <p className="text-[14px] font-medium uppercase tracking-[0.16em] text-wb-taupe">Upcoming events</p>
      {rows === null ? (
        <div className="space-y-3 py-3" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-[14px] bg-wb-stone" />
          ))}
        </div>
      ) : rows.length ? (
        <ul className="divide-y divide-wb-sand/80">
          {rows.map((r) => (
            <EventItem key={r.id} row={r} />
          ))}
        </ul>
      ) : (
        <p className="py-3 text-[15px] leading-relaxed text-wb-soft">Free Stepsisters meetups by ORIRI and wellness events we love will appear here.</p>
      )}
      <PillLink to="/community" tone="outline" size="md" className="mt-2 w-full" onClick={() => ctaClick('Join Stepsisters', 'meetup_pillar')}>
        Join Stepsisters
      </PillLink>
    </div>
  );
}

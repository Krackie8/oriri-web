/** 1 · Homepage: Ren's Dubai wellness guide first, then Bestie the planner. */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Globe, Instagram, MapPin, Pin } from 'lucide-react';
import * as wellnessApi from '../../utils/wellnessApi';
import type { WellnessGuide } from '../../utils/wellnessApi';
import { Eyebrow, Photo, PillLink, Screen, cx } from './kit';
import { PILLARS } from './picks';
import { cardClick, ctaClick } from '../analytics/track';
import { countPlaceClick } from '../analytics/firstParty';
import { withUtm } from '../analytics/utm';
import { unsplash } from '../components/ui';
import teaForTwo from '../../../assets/tea-for-two.jpg';

export default function HomeScreen() {
  return (
    <>
      <Hero />
      <Directory />
      <Upcoming />
      <BestieIntro />
      <HowItWorks />
      <PlumBand />
      <PodcastTeaser />
    </>
  );
}

const HERO_PHOTO = unsplash('1747239685045-fcbcf98985db', 1200, 1500);

function Hero() {
  return (
    <section className="relative mt-16 overflow-hidden bg-wb-ink">
      <img src={HERO_PHOTO} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
      <Screen className="relative flex min-h-[74svh] flex-col justify-end pb-12 pt-32">
        <div className="wb-rise">
          <p className="text-[14px] font-medium uppercase tracking-[0.18em] text-white/80">Approved by Ren</p>
          <h1 className="mt-4 text-[40px] leading-[1.05] text-white">The Dubai wellness guide</h1>
          <p className="mt-5 text-[17px] leading-relaxed text-white/90">
            The studios, cafés and recovery spots I actually go to, all in one list. Free, always.
          </p>
          <a
            href="#guide"
            onClick={() => ctaClick('Explore the guide', 'hero')}
            className="mt-8 flex h-[52px] w-full items-center justify-center rounded-full bg-wb-plum text-[14px] font-medium uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#6B5C51]"
          >
            Explore the guide
          </a>
          <Link to={withUtm('/plan')} onClick={() => ctaClick('Plan my day', 'hero')} className="mt-4 block text-center text-[14px] uppercase tracking-[0.12em] text-white/85 underline-offset-4 hover:underline">
            Or let Bestie plan your day
          </Link>
        </div>
      </Screen>
    </section>
  );
}

/** Places from the admin Directory; until Ren adds some, the original picks fill in. */
type Place = WellnessGuide & { fallback?: boolean };

const FALLBACK: Place[] = PILLARS.filter((p) => p.key !== 'meetup').flatMap((p) =>
  p.picks
    .filter((pk) => !pk.members && !pk.url?.startsWith('/'))
    .map((pk, i) => ({
      id: `${p.key}-${i}`,
      title: pk.title,
      category: p.name,
      note: pk.meta,
      image: pk.image,
      fallback: true,
    })),
);

function usePlaces(): Place[] | null {
  const [places, setPlaces] = useState<Place[] | null>(null);
  useEffect(() => {
    let live = true;
    wellnessApi.getGuides().then((res) => {
      if (!live) return;
      const real = res.ok && res.data ? wellnessApi.sortGuides(res.data).filter((g) => !g.hidden) : [];
      setPlaces(real.length ? real : FALLBACK);
    });
    return () => {
      live = false;
    };
  }, []);
  return places;
}

const withHttp = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const igUrl = (v: string) => (/instagram\.com/i.test(v) ? withHttp(v) : `https://www.instagram.com/${v.replace(/^@/, '')}/`);
const mapUrl = (place: Place) =>
  place.maps ? withHttp(place.maps) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.title} ${place.area || ''} Dubai`)}`;

function PlaceAction({ href, label, icon: Icon, place }: { href: string; label: string; icon: typeof Globe; place: Place }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        countPlaceClick(place.title);
        cardClick((place.category || 'move').toLowerCase() as 'move', place.title);
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-wb-sand px-3.5 text-[14px] text-wb-soft transition-colors hover:border-wb-plum hover:text-wb-ink"
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} /> {label}
    </a>
  );
}

function PlaceCard({ place }: { place: Place }) {
  const meta = [place.category, place.area].filter(Boolean).join(' · ');
  return (
    <li className="overflow-hidden rounded-[14px] border border-wb-sand/60 bg-wb-shell">
      {place.image && <Photo src={place.image} className="aspect-[4/3]" w={860} h={645} />}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] font-medium uppercase tracking-[0.16em] text-wb-taupe">{meta}</p>
          {place.pinned && !place.fallback && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wb-stone px-2.5 py-1 text-[14px] text-wb-plum">
              <Pin className="h-3.5 w-3.5" strokeWidth={1.6} /> Ren's top pick
            </span>
          )}
        </div>
        <h3 className="mt-2 text-[24px] leading-tight text-wb-ink">{place.title}</h3>
        {place.note && <p className="mt-2 text-[15px] leading-relaxed text-wb-soft">{place.note}</p>}
        {place.price && <p className="mt-3 text-[14px] text-wb-taupe">{place.price}</p>}
        {!place.fallback && (
          <div className="mt-4 flex flex-wrap gap-2">
            {place.instagram && <PlaceAction href={igUrl(place.instagram)} label="Instagram" icon={Instagram} place={place} />}
            {place.link && <PlaceAction href={withHttp(place.link)} label="Website" icon={Globe} place={place} />}
            <PlaceAction href={mapUrl(place)} label="Map" icon={MapPin} place={place} />
          </div>
        )}
      </div>
    </li>
  );
}

function Directory() {
  const places = usePlaces();
  const [cat, setCat] = useState('All');
  const cats = useMemo(() => {
    const present = new Set((places || []).map((p) => p.category).filter(Boolean) as string[]);
    return ['All', ...wellnessApi.GUIDE_CATEGORIES.filter((c) => present.has(c)), ...[...present].filter((c) => !wellnessApi.GUIDE_CATEGORIES.includes(c))];
  }, [places]);
  const shown = (places || []).filter((p) => cat === 'All' || p.category === cat);

  return (
    <section id="guide" className="scroll-mt-20">
      <Screen className="pt-16">
        <Eyebrow className="text-center">The directory</Eyebrow>
        <h2 className="mt-2 text-center text-[32px] text-wb-plum">Approved by Ren</h2>
        <p className="mt-3 text-center text-[15px] leading-relaxed text-wb-soft">Every place here is somewhere I go and love. No ads, no paid spots.</p>

        {cats.length > 2 && (
          <div className="wb-scroll-x -mx-5 mt-6 flex gap-2 overflow-x-auto px-5" role="tablist" aria-label="Filter the guide">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={cat === c}
                onClick={() => setCat(c)}
                className={cx(
                  'h-10 shrink-0 rounded-full border px-4 text-[14px] uppercase tracking-[0.1em] transition-colors',
                  cat === c ? 'border-wb-plum bg-wb-plum text-white' : 'border-wb-sand bg-wb-shell text-wb-soft hover:border-wb-plum/50',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {places === null ? (
          <div className="mt-6 space-y-4" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-[14px] bg-wb-stone" />
            ))}
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {shown.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </ul>
        )}
      </Screen>
    </section>
  );
}

function BestieIntro() {
  return (
    <Screen className="pt-20 text-center">
      <Eyebrow>Free for you</Eyebrow>
      <h2 className="mt-2 text-[32px] text-wb-plum">Meet Bestie</h2>
      <p className="mt-3 text-[16px] leading-relaxed text-wb-soft">
        Your curated wellness planner. Tell it your energy, time and budget, and it builds your day from the places above.
      </p>
    </Screen>
  );
}

const STEPS = [
  { title: 'Check in', body: 'Tell us your energy, the time you have and your budget.' },
  { title: 'Get your planner', body: 'Move, Meal and Mindset picks that fit your energy, time and budget, each linked so you can book, cook or listen.' },
  { title: 'Tap & track', body: 'Tick things off and watch your progress build. Behind the scenes, Bestie remembers what works for you.' },
];
const NUMBER_WORDS = ['One', 'Two', 'Three'];

function HowItWorks() {
  return (
    <Screen className="pt-8">
      <ol className="space-y-3">
        {STEPS.map((st, n) => (
          <li key={st.title} className="rounded-[14px] bg-wb-stone px-6 py-7 text-center">
            <span className="block text-[14px] font-medium uppercase tracking-[0.18em] text-wb-taupe">{NUMBER_WORDS[n]}</span>
            <span className="mt-2 block font-wb-serif text-[24px] font-medium uppercase tracking-[0.02em] text-wb-ink">{st.title}</span>
            <span className="mx-auto mt-3 block max-w-[300px] text-[15px] leading-relaxed text-wb-soft">{st.body}</span>
          </li>
        ))}
      </ol>
    </Screen>
  );
}

function PlumBand() {
  return (
    <section className="mt-10 bg-wb-plum py-14 text-wb-paper">
      <Screen>
        <h2 className="text-center text-[30px] leading-[1.1] text-white">Let Bestie curate your whole day</h2>
        <p className="mt-4 text-center text-[16px] leading-relaxed text-white/90">Two minutes, no account. One tickable list, with links to book, cook or listen.</p>
        <PillLink to="/plan" tone="ivory" className="mt-8 w-full" onClick={() => ctaClick('Check in — it\'s free', 'band')}>
          Check in · it's free
        </PillLink>
      </Screen>
    </section>
  );
}

function PodcastTeaser() {
  return (
    <Screen className="pt-14">
      <Link to="/podcast" onClick={() => ctaClick('Tea for Two', 'home_podcast')} className="flex items-center gap-4 rounded-[14px] bg-wb-stone p-4 transition-colors hover:bg-[#EAE5DF]">
        <img src={teaForTwo} alt="" className="h-20 w-20 shrink-0 rounded-[12px] object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium uppercase tracking-[0.16em] text-wb-taupe">The podcast</span>
          <span className="mt-1 block font-wb-serif text-[22px] font-medium uppercase text-wb-ink">Tea for Two</span>
          <span className="block text-[14px] text-wb-soft">with Renee &amp; Amanda</span>
        </span>
        <ArrowUpRight className="h-5 w-5 shrink-0 text-wb-taupe" strokeWidth={1.5} />
      </Link>
    </Screen>
  );
}

/** Upcoming Stepsisters meetups and wellness events (only shown when there are some). */
function Upcoming() {
  const rows = useUpcoming();
  if (!rows || !rows.length) return null;
  return (
    <Screen className="pt-16">
      <Eyebrow className="text-center">Coming up</Eyebrow>
      <h2 className="mt-2 text-center text-[28px] text-wb-plum">Events & meetups</h2>
      <ul className="mt-4 divide-y divide-wb-sand/80">
        {rows.map((r) => (
          <EventItem key={r.id} row={r} />
        ))}
      </ul>
      <PillLink to="/community" tone="outline" size="md" className="mt-3 w-full" onClick={() => ctaClick('Join Stepsisters', 'home_events')}>
        Join Stepsisters
      </PillLink>
    </Screen>
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

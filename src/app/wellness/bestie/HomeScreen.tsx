/** 1 · Homepage: Ren's Dubai wellness guide first, then Bestie the planner. */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, Globe, Instagram, MapPin, Pin } from 'lucide-react';
import * as wellnessApi from '../../utils/wellnessApi';
import type { WellnessGuide } from '../../utils/wellnessApi';
import { Eyebrow, Photo, PillarIcon, PillLink, Screen, cx } from './kit';
import { PILLARS, type PillarKey } from './picks';
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
          <p className="text-[14px] font-medium uppercase tracking-[0.18em] text-white/80">Wellness Bestie by ORIRI</p>
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

/** Entries from the admin Directory, grouped into the four pillars. */
type Place = WellnessGuide & { builtIn?: boolean; internal?: string };
type PillarName = 'Move' | 'Meal' | 'Mindset' | 'Meetup';

const PILLAR_INFO: Record<PillarName, { key: PillarKey; title: string; covers: string; empty: string }> = {
  Move: { key: 'move', title: 'Move', covers: 'Studios & classes I go to', empty: 'My favourite studios are coming soon.' },
  Meal: { key: 'meal', title: 'Meal', covers: 'Cafés & restaurants worth the trip', empty: 'My favourite cafés are coming soon.' },
  Mindset: { key: 'mindset', title: 'Mindset', covers: 'Podcasts & books that shift things', empty: '' },
  Meetup: { key: 'meetup', title: 'Meet up', covers: 'Activities, organisers & our community', empty: '' },
};
const PILLAR_ORDER: PillarName[] = ['Move', 'Meal', 'Mindset', 'Meetup'];
const pillarPhoto = (key: PillarKey) => PILLARS.find((p) => p.key === key)?.image || '';

/** Always listed: Ren's own podcast and community. */
const BUILT_IN: Partial<Record<PillarName, Place[]>> = {
  Mindset: [{ id: 'tea-for-two', title: 'Tea for Two', category: 'Mindset', area: 'Podcast · Renee & Amanda', note: 'Our podcast: honest conversations about building a life in the UAE, growth and wellness.', image: teaForTwo, internal: '/podcast', builtIn: true }],
  Meetup: [{ id: 'stepsisters', title: 'Stepsisters', category: 'Meetup', area: 'Our community · free', note: 'Free meetups by ORIRI for women in Dubai: walks, coffee, classes together. Come alone, leave with friends.', internal: '/community', builtIn: true }],
};

function usePlaces(): Place[] | null {
  const [places, setPlaces] = useState<Place[] | null>(null);
  useEffect(() => {
    let live = true;
    wellnessApi.getGuides().then((res) => {
      if (!live) return;
      setPlaces(res.ok && res.data ? wellnessApi.sortGuides(res.data).filter((g) => !g.hidden) : []);
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
const BOX: Record<PillarKey, 'move' | 'meal' | 'mindset' | 'meetups'> = { move: 'move', meal: 'meal', mindset: 'mindset', meetup: 'meetups' };

function PlaceAction({ href, label, icon: Icon, place, pillar }: { href: string; label: string; icon: typeof Globe; place: Place; pillar: PillarKey }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        countPlaceClick(place.title);
        cardClick(BOX[pillar], place.title);
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-wb-sand bg-wb-shell px-3.5 text-[14px] text-wb-soft transition-colors hover:border-wb-plum hover:text-wb-ink"
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} /> {label}
    </a>
  );
}

/** One name in a pillar list; tap to open the details. */
function PlaceRow({ place, pillar, open, onToggle }: { place: Place; pillar: PillarKey; open: boolean; onToggle: () => void }) {
  const meta = [place.area, place.price].filter(Boolean).join(' · ');
  const panelId = `place-${place.id}`;
  return (
    <li>
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle} className="flex w-full items-center gap-3 py-3.5 text-left">
        {place.pinned && <Pin aria-label="Top pick" className="h-3.5 w-3.5 shrink-0 text-wb-gold" strokeWidth={1.8} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-medium text-wb-ink">{place.title}</span>
          {meta && <span className="block truncate text-[14px] text-wb-taupe">{meta}</span>}
        </span>
        <ChevronDown className={cx('h-5 w-5 shrink-0 text-wb-taupe transition-transform duration-300', open && 'rotate-180')} strokeWidth={1.5} />
      </button>
      {open && (
        <div id={panelId} className="wb-rise pb-5">
          {place.image && <Photo src={place.image} className="aspect-[16/10] rounded-[12px]" w={860} h={538} />}
          {place.note && <p className={cx('text-[15px] leading-relaxed text-wb-soft', place.image && 'mt-3')}>{place.note}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {place.internal ? (
              <Link
                to={withUtm(place.internal)}
                onClick={() => cardClick(BOX[pillar], place.title)}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-wb-plum px-4 text-[14px] font-medium uppercase tracking-[0.1em] text-white hover:bg-[#6B5C51]"
              >
                {pillar === 'mindset' ? 'Listen' : 'Join'} <ArrowUpRight className="h-4 w-4" strokeWidth={1.6} />
              </Link>
            ) : (
              <>
                {place.instagram && <PlaceAction href={igUrl(place.instagram)} label="Instagram" icon={Instagram} place={place} pillar={pillar} />}
                {place.link && <PlaceAction href={withHttp(place.link)} label="Website" icon={Globe} place={place} pillar={pillar} />}
                {(pillar === 'move' || pillar === 'meal' || place.maps) && <PlaceAction href={mapUrl(place)} label="Map" icon={MapPin} place={place} pillar={pillar} />}
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function PillarSection({ name, places }: { name: PillarName; places: Place[] }) {
  const info = PILLAR_INFO[name];
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <section aria-labelledby={`pillar-${info.key}`} className="overflow-hidden rounded-[14px] border border-wb-sand/60 bg-wb-shell">
      <div className="relative">
        <Photo src={pillarPhoto(info.key)} className="aspect-[3/1]" w={860} h={287} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
        <div className="absolute inset-y-0 left-5 flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <PillarIcon pillar={info.key} className="h-[18px] w-[18px]" />
          </span>
          <span>
            <h3 id={`pillar-${info.key}`} className="text-[24px] leading-none text-white">{info.title}</h3>
            <span className="mt-1 block text-[14px] text-white/85">{info.covers}</span>
          </span>
        </div>
      </div>
      <div className="px-5">
        {places.length ? (
          <ul className="divide-y divide-wb-sand/70">
            {places.map((p) => (
              <PlaceRow key={p.id} place={p} pillar={info.key} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />
            ))}
          </ul>
        ) : (
          <p className="py-4 text-[15px] text-wb-taupe">{info.empty}</p>
        )}
        {name === 'Meetup' && <MeetupEvents />}
      </div>
    </section>
  );
}

function Directory() {
  const places = usePlaces();
  const byPillar = (n: PillarName) => [
    ...(places || []).filter((p) => p.category === n || (n === 'Meetup' && p.category === 'Meet up')),
    ...(BUILT_IN[n] || []),
  ];

  return (
    <section id="guide" className="scroll-mt-20">
      <Screen className="pt-16">
        <Eyebrow className="text-center">The four pillars</Eyebrow>
        <h2 className="mt-2 text-center text-[32px] text-wb-plum">Places I love</h2>
        <p className="mt-3 text-center text-[15px] leading-relaxed text-wb-soft">
          How I look after myself in Dubai: where I move, eat, what I listen to and who I meet. Tap a name for the details.
        </p>
        {places === null ? (
          <div className="mt-6 space-y-4" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-[14px] bg-wb-stone" />
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {PILLAR_ORDER.map((n) => (
              <PillarSection key={n} name={n} places={byPillar(n)} />
            ))}
          </div>
        )}
      </Screen>
    </section>
  );
}

/** Inside Meet up: upcoming Stepsisters meetups and events from the admin calendar. */
function MeetupEvents() {
  const rows = useUpcoming();
  if (!rows || !rows.length) return null;
  return (
    <div className="border-t border-wb-sand/70 pb-2 pt-4">
      <p className="text-[14px] font-medium uppercase tracking-[0.16em] text-wb-taupe">Coming up</p>
      <ul className="divide-y divide-wb-sand/70">
        {rows.map((r) => (
          <EventItem key={r.id} row={r} />
        ))}
      </ul>
    </div>
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

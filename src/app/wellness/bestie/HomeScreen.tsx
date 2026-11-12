/** 1 · Homepage: Ren's four pillars (small, free), then Bestie the app. */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Award, Brain, HeartHandshake, ListChecks, MapPin, Pin, Sparkles, Sun, Zap } from 'lucide-react';
import * as wellnessApi from '../../utils/wellnessApi';
import type { WellnessGuide } from '../../utils/wellnessApi';
import { Eyebrow, PillarIcon, PillLink, Screen, cx } from './kit';
import type { PillarKey } from './picks';
import { cardClick, ctaClick } from '../analytics/track';
import { countPlaceClick } from '../analytics/firstParty';
import { MembershipCard } from './OptionsScreen';
import { withUtm } from '../analytics/utm';
import { unsplash } from '../components/ui';
import PhoneShowcase from './PhoneShowcase';

export default function HomeScreen() {
  return (
    <>
      <Hero />
      <Directory />
      <BestieIntro />
      <HowItWorks />
      <PhoneShowcase />
      <AppFeatures />
      <PlumBand />
      <Screen className="pb-14 pt-10">
        <MembershipCard source="home" />
      </Screen>
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
          <h1 className="mt-4 text-[31px] leading-[1.1] text-white">
            <span className="block whitespace-nowrap">Your Wellness,</span>
            <span className="block whitespace-nowrap">Curated for You</span>
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-white/90">A planner that learns what works for you.</p>
          <a
            href="#guide"
            onClick={() => ctaClick('Explore the guide', 'hero')}
            className="mt-8 flex h-[52px] w-full items-center justify-center rounded-full bg-wb-plum text-[14px] font-medium uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#6B5C51]"
          >
            Explore the guide
          </a>
          <HandLink />
        </div>
      </Screen>
    </section>
  );
}

/** "Or let Bestie plan your day", handwritten with a sketched underline and arrow. */
function HandLink() {
  return (
    <Link
      to={withUtm('/plan/inputs')}
      onClick={() => ctaClick('Plan my day', 'hero')}
      className="group mx-auto mt-6 flex w-fit items-center gap-2 text-white"
      style={{ fontFamily: 'var(--font-wb-hand)' }}
    >
      <span className="relative whitespace-nowrap text-[26px] leading-none">
        Or let Bestie plan your day
        <svg aria-hidden viewBox="0 0 300 14" preserveAspectRatio="none" className="absolute -bottom-2.5 left-0 h-3 w-full text-[#E9D9C8]">
          <path d="M3 9c40-6 90-7 140-5s100 3 154-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </span>
      <svg aria-hidden viewBox="0 0 40 30" className="h-7 w-9 shrink-0 text-[#E9D9C8] transition-transform group-hover:translate-x-1">
        <path d="M2 18c10-1 22-2 33-6M27 4c3 3 6 6 9 8-4 2-8 5-10 9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/** Entries from the admin Directory, grouped by pillar. */
type Place = WellnessGuide & { builtIn?: boolean; internal?: string };
type PillarName = 'Move' | 'Meal' | 'Mindset' | 'Meetup';
const PILLAR_INFO: Record<PillarName, { key: PillarKey; title: string; covers: string }> = {
  Move: { key: 'move', title: 'Move', covers: 'Studios & classes I go to' },
  Meal: { key: 'meal', title: 'Meal', covers: 'Cafés & restaurants worth the trip' },
  Mindset: { key: 'mindset', title: 'Mindset', covers: 'Podcasts & books that shift things' },
  Meetup: { key: 'meetup', title: 'Meet up', covers: 'Activities, organisers & our community' },
};
const PILLAR_ORDER: PillarName[] = ['Move', 'Meal', 'Mindset', 'Meetup'];

/** Always listed: Ren's own podcast and community. */
const BUILT_IN: Partial<Record<PillarName, Place[]>> = {
  Mindset: [{ id: 'tea-for-two', title: 'Tea for Two', category: 'Mindset', area: 'Podcast · Renee & Amanda', note: 'Our podcast: honest conversations about building a life in the UAE, growth and wellness.', internal: '/podcast', builtIn: true }],
  Meetup: [{ id: 'stepsisters', title: 'Stepsisters', category: 'Meetup', area: 'Our community · free', note: 'Free meetups by ORIRI for women in Dubai: walks, coffee, classes together. Come alone, leave with friends.', internal: '/community', builtIn: true }],
};

/** Sample places, shown only with ?demo=1 so Ren can preview the layout before adding real ones. */
const DEMO: Place[] = [
  { id: 'demo-1', note: "Small classes and the instructors actually correct your form. Go for the 7am.", title: 'Sample Reformer Studio', category: 'Move', area: 'Al Quoz', price: 'From AED 120', link: 'https://example.com', pinned: true },
  { id: 'demo-2', note: "Free, friendly and finishes with coffee. Perfect if you're new to running.", title: 'Sample Run Club', category: 'Move', area: 'Kite Beach', price: 'Free', instagram: '@example' },
  { id: 'demo-3', note: "The best iced matcha in Dubai, and quiet enough to work from.", title: 'Sample Matcha Café', category: 'Meal', area: 'Jumeirah', price: 'AED 40–80', link: 'https://example.com' },
  { id: 'demo-4', note: "Build-your-own bowls that keep me full all afternoon.", title: 'Sample Salad Bar', category: 'Meal', area: 'DIFC', price: 'AED 50–90' },
  { id: 'demo-5', note: "Tiny habits, big change. Read one chapter a day.", title: 'Sample Book: Atomic Habits', category: 'Mindset', area: 'Book', link: 'https://example.com' },
  { id: 'demo-6', note: "Sunrise flow on the beach, then breakfast together. Come alone, leave with friends.", title: 'Sample Sunrise Yoga Meetup', category: 'Meetup', area: 'Organiser · monthly', instagram: '@example' },
];
const showDemo = () => {
  try {
    return new URLSearchParams(window.location.search).has('demo');
  } catch {
    return false;
  }
};

const PLACES_CACHE = 'wb_places_v1';

/**
 * Ren's places from the admin Directory. Shows the last good list straight away (saved on this
 * device), retries a failed load a few times, and refreshes when the visitor comes back to the tab,
 * so a flaky mobile connection never makes the directory look empty.
 */
function usePlaces(): { places: Place[] | null; failed: boolean; retry: () => void } {
  const withDemo = (list: Place[]) => (showDemo() ? [...DEMO, ...list] : list);
  const [places, setPlaces] = useState<Place[] | null>(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(PLACES_CACHE) || 'null');
      return Array.isArray(cached) ? withDemo(cached) : null;
    } catch {
      return null;
    }
  });
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  // First visit (nothing saved on the device yet): show the copy saved on
  // oriri.me straight away, then swap in the live list when it arrives.
  useEffect(() => {
    if (places) return;
    let live = true;
    wellnessApi.getGuidesSnapshot().then((snap) => {
      if (live && snap) setPlaces((p) => p ?? withDemo(wellnessApi.sortGuides(snap).filter((g) => !g.hidden)));
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    const load = async () => {
      for (let attempt = 0; attempt < 3 && live; attempt++) {
        const res = await wellnessApi.getGuides();
        if (!live) return;
        if (res.ok && res.data) {
          const real = wellnessApi.sortGuides(res.data).filter((g) => !g.hidden);
          setPlaces(withDemo(real));
          setFailed(false);
          try {
            localStorage.setItem(PLACES_CACHE, JSON.stringify(real));
          } catch {
            /* private mode */
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
      const snap = live ? await wellnessApi.getGuidesSnapshot() : null;
      if (!live) return;
      if (snap) {
        setPlaces(withDemo(wellnessApi.sortGuides(snap).filter((g) => !g.hidden)));
        setFailed(false);
        return;
      }
      if (live) {
        setFailed(true);
        setPlaces((p) => p ?? withDemo([]));
      }
    };
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [nonce]);

  return { places, failed, retry: () => setNonce((n) => n + 1) };
}

const withHttp = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const igUrl = (v: string) => (/instagram\.com/i.test(v) ? withHttp(v) : `https://www.instagram.com/${v.replace(/^@/, '')}/`);
const mapUrl = (place: Place) =>
  place.maps ? withHttp(place.maps) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.title} ${place.area || ''} Dubai`)}`;
const BOX: Record<PillarKey, 'move' | 'meal' | 'mindset' | 'meetups'> = { move: 'move', meal: 'meal', mindset: 'mindset', meetup: 'meetups' };

/**
 * Where a name goes when tapped. Places (Move, Meal, Meetup) open Google Maps only,
 * never the business's own website or Instagram, so visitors stay with ORIRI (Ren's rule).
 * Mindset entries are episodes to listen to, not places, so they keep their link.
 */
const isMap = (pillar: PillarKey) => pillar !== 'mindset';
const placeHref = (place: Place, pillar: PillarKey) =>
  isMap(pillar) ? mapUrl(place) : place.link ? withHttp(place.link) : place.instagram ? igUrl(place.instagram) : place.maps ? mapUrl(place) : '';

/** True on a mouse/trackpad device, where the note shows on hover. */
const canHover = () => {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch {
    return false;
  }
};

const visitLabel = (place: Place, pillar: PillarKey) =>
  place.internal ? (pillar === 'mindset' ? 'Listen' : 'Join') : isMap(pillar) ? 'Open in Maps' : place.link ? 'Listen' : place.instagram ? 'Open Instagram' : 'Open map';

/**
 * One name in a pillar list. Desktop: hover shows Ren's "why I like it" note, click opens the place.
 * Phone: tap shows the note in a popup with a button to open the place (no note = straight through).
 */
function PlaceRow({ place, pillar }: { place: Place; pillar: PillarKey }) {
  const [hover, setHover] = useState(false);
  const [sheet, setSheet] = useState(false);
  const meta = [place.area, place.price].filter(Boolean).join(' · ');
  const note = (place.note || '').trim();
  const href = place.internal ? '' : placeHref(place, pillar);
  const track = () => {
    if (!place.internal) countPlaceClick(place.title);
    cardClick(BOX[pillar], place.title);
  };
  const onTap = (e: React.MouseEvent) => {
    if (note && !canHover()) {
      e.preventDefault();
      setSheet(true);
      return;
    }
    track();
  };
  const inner = (
    <>
      {place.pinned && <Pin aria-label="Top pick" className="h-3.5 w-3.5 shrink-0 text-wb-gold" strokeWidth={1.8} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium text-wb-ink">{place.title}</span>
        {meta && <span className="block truncate text-[14px] text-wb-taupe">{meta}</span>}
      </span>
      {!place.internal && isMap(pillar) ? (
        <MapPin aria-label="Opens in Maps" className="h-5 w-5 shrink-0 text-wb-taupe" strokeWidth={1.5} />
      ) : (
        <ArrowUpRight className="h-5 w-5 shrink-0 text-wb-taupe" strokeWidth={1.5} />
      )}
    </>
  );
  const cls = 'flex w-full items-center gap-3 py-3 text-left';
  const tipId = `note-${place.id}`;
  const a11y = note ? { 'aria-describedby': tipId } : {};

  const visit = (extra = '') =>
    place.internal ? (
      <Link to={withUtm(place.internal)} onClick={track} className={extra}>
        {visitLabel(place, pillar)} <ArrowUpRight className="h-4 w-4" strokeWidth={1.6} />
      </Link>
    ) : href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={track} className={extra}>
        {visitLabel(place, pillar)} <ArrowUpRight className="h-4 w-4" strokeWidth={1.6} />
      </a>
    ) : null;

  return (
    <li className="relative" onMouseEnter={() => note && canHover() && setHover(true)} onMouseLeave={() => setHover(false)}>
      {place.internal ? (
        <Link to={withUtm(place.internal)} onClick={onTap} onFocus={() => note && canHover() && setHover(true)} onBlur={() => setHover(false)} className={cls} {...a11y}>
          {inner}
        </Link>
      ) : href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={onTap} onFocus={() => note && canHover() && setHover(true)} onBlur={() => setHover(false)} className={cls} {...a11y}>
          {inner}
        </a>
      ) : (
        <button type="button" onClick={() => note && setSheet(true)} className={cls} {...a11y}>
          {inner}
        </button>
      )}

      {note && (
        <div
          id={tipId}
          role="tooltip"
          className={cx(
            'pointer-events-none absolute inset-x-0 top-full z-20 -mt-1 rounded-[12px] bg-wb-ink px-4 py-3 text-[14px] leading-relaxed text-white shadow-[0_12px_30px_-12px_rgba(43,37,34,0.6)] transition-opacity duration-150',
            hover ? 'opacity-100' : 'sr-only opacity-0',
          )}
        >
          <span className="block text-[13px] uppercase tracking-[0.14em] text-white/60">Why I like it</span>
          {note}
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setSheet(false)} role="dialog" aria-modal="true" aria-label={place.title}>
          <div className="wb-rise mx-auto w-full max-w-[430px] rounded-t-[20px] bg-wb-shell px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-wb-serif text-[22px] font-medium uppercase leading-tight text-wb-ink">{place.title}</p>
            {meta && <p className="mt-1 text-[14px] text-wb-taupe">{meta}</p>}
            <p className="mt-4 text-[13px] uppercase tracking-[0.14em] text-wb-taupe">Why I like it</p>
            <p className="mt-1 text-[16px] leading-relaxed text-wb-soft">{note}</p>
            <div className="mt-6 flex gap-3">
              {visit('inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-wb-plum text-[14px] font-medium uppercase tracking-[0.1em] text-white')}
              <button type="button" onClick={() => setSheet(false)} className="h-12 rounded-full border border-wb-plum/40 px-5 text-[14px] uppercase tracking-[0.1em] text-wb-plum">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Compact directory: four pillar icons on one seamless band, and the
 * names for the chosen pillar. Free, and short, so Bestie is a quick scroll away.
 */
function Directory() {
  const { places, failed, retry } = usePlaces();
  const [pillar, setPillar] = useState<PillarName>('Move');
  const info = PILLAR_INFO[pillar];

  const list: Place[] = [
    ...(places || []).filter((p) => (p.category === pillar || (pillar === 'Meetup' && p.category === 'Meet up'))),
    ...(BUILT_IN[pillar] || []),
  ];
  const pick = (n: PillarName) => setPillar(n);

  return (
    <section id="guide" className="scroll-mt-20 bg-wb-stone py-10">
      <Screen>
        <p className="text-center text-[14px] font-medium uppercase tracking-[0.18em] text-wb-taupe">My favourites · free to explore</p>
        <p className="mt-1 text-center text-[14px] text-wb-soft">Hover or tap a name to see why I love it.</p>

        <div role="tablist" aria-label="Pillar" className="mt-4 grid grid-cols-4 gap-2">
          {PILLAR_ORDER.map((n) => {
            const on = pillar === n;
            return (
              <button key={n} type="button" role="tab" aria-selected={on} onClick={() => pick(n)} className="flex flex-col items-center gap-2">
                <span
                  className={cx(
                    'flex h-16 w-16 items-center justify-center rounded-full transition-colors',
                    on ? 'bg-wb-plum text-white' : 'bg-wb-shell text-wb-plum hover:bg-[#EAE5DF]',
                  )}
                >
                  <PillarIcon pillar={PILLAR_INFO[n].key} className="h-6 w-6" />
                </span>
                <span className={cx('text-[14px] font-medium uppercase tracking-[0.08em]', on ? 'text-wb-ink' : 'text-wb-taupe')}>{PILLAR_INFO[n].title}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-[14px] bg-wb-shell px-5 pt-4" role="tabpanel">
          <p className="text-[14px] text-wb-taupe">
            {info.covers}
          </p>
          {places === null ? (
            <div className="space-y-2 py-3" aria-hidden>
              {[0, 1].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-[10px] bg-wb-stone" />
              ))}
            </div>
          ) : list.length ? (
            <ul className="divide-y divide-wb-sand/70">
              {list.map((p) => (
                <PlaceRow key={p.id} place={p} pillar={info.key} />
              ))}
            </ul>
          ) : (
            failed ? (
            <p className="py-4 text-[15px] text-wb-soft">
              Couldn't load my favourites.{' '}
              <button type="button" onClick={retry} className="text-wb-plum underline underline-offset-4">
                Try again
              </button>
            </p>
          ) : (
            <p className="py-4 text-[15px] text-wb-soft">My favourites are coming soon.</p>
          )
          )}
          {pillar === 'Meetup' ? <MeetupEvents /> : <div className="pb-2" />}
        </div>
      </Screen>
    </section>
  );
}

/** Inside Meet up: upcoming Stepsisters meetups and events from the admin calendar. */
function MeetupEvents() {
  const rows = useUpcoming();
  if (!rows || !rows.length) return <div className="pb-2" />;
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
    <Screen className="pt-16 text-center">
      <p className="text-[22px] leading-none text-wb-plum" style={{ fontFamily: 'var(--font-wb-hand)' }}>
        Experience full features
      </p>
      <h2 className="mt-1 text-[32px] text-wb-plum">Meet Bestie</h2>
      <p className="mt-3 text-[16px] leading-relaxed text-wb-soft">
        Bestie curates where to move, what to eat and who to meet.
      </p>
      <div className="mt-6 rounded-[14px] bg-wb-plum px-6 py-6 text-left text-white">
        <Brain className="h-6 w-6 text-[#E9D9C8]" strokeWidth={1.4} />
        <p className="mt-3 font-wb-serif text-[20px] font-medium uppercase leading-snug tracking-[0.02em]">It remembers you</p>
        <p className="mt-2 text-[15px] leading-relaxed text-white/90">
          Bestie learns your patterns and the places you love, so every plan fits you and your goal.
        </p>
      </div>
    </Screen>
  );
}

const STEPS = [
  { title: 'Check in', body: 'Share your energy, the time you have and your budget.' },
  { title: 'Get your plan', body: 'Move, Meal, Mindset and Meet up picks that fit your day.' },
  { title: 'Tap & Track', body: "Tick what you've done and close your rings. Bestie learns what works for you." },
];

function HowItWorks() {
  return (
    <Screen className="pt-8">
      <p className="text-center text-[14px] font-medium uppercase tracking-[0.18em] text-wb-taupe">How it works</p>
      <ol className="mt-4 space-y-3">
        {STEPS.map((st, n) => (
          <li key={st.title} className="flex items-start gap-4 rounded-[14px] bg-wb-stone px-5 py-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wb-shell font-wb-serif text-[18px] font-medium text-wb-plum">{n + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-wb-serif text-[18px] font-medium uppercase tracking-[0.02em] text-wb-ink">{st.title}</span>
              <span className="mt-1 block text-[15px] leading-relaxed text-wb-soft">{st.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </Screen>
  );
}

const FEATURES: { icon: typeof Sun; title: string; text: string; tag?: string }[] = [
  { icon: Sun, title: 'Daily affirmation', text: 'A few words just for you, every time you check in.' },
  { icon: Zap, title: 'Energy check-in', text: 'Builds your daily and weekly plan, with rings to close.' },
  { icon: ListChecks, title: 'Be well organised with a to-do list', text: 'Your whole day in one list. Tick it off as you go.' },
  { icon: Award, title: 'Badges to unlock', text: 'Little wins for showing up for yourself.', tag: 'Soon' },
  {
    icon: HeartHandshake,
    title: 'Bestie match',
    text: 'Booked the same class or café as someone nearby? Bestie suggests you meet. Everyone can see profiles; swiping and saying hi is for members.',
    tag: 'Premium',
  },
];

function AppFeatures() {
  return (
    <Screen className="pt-14">
      <Eyebrow className="text-center">Full features</Eyebrow>
      <h2 className="mt-2 text-center text-[28px] leading-[1.1] text-wb-ink">Everything you need to show up for you</h2>
      <ul className="mt-6 divide-y divide-wb-sand/70 rounded-[14px] border border-wb-sand/60 bg-wb-shell px-5">
        {FEATURES.map(({ icon: Icon, title, text, tag }) => (
          <li key={title} className="flex items-start gap-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wb-stone text-wb-plum">
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[16px] font-medium text-wb-ink">
                {title}
                {tag && (
                  <span className={cx('rounded-full px-2 py-0.5 text-[14px] font-normal', tag === 'Premium' ? 'bg-wb-plum text-white' : 'bg-wb-stone text-wb-taupe')}>{tag}</span>
                )}
              </span>
              <span className="mt-0.5 block text-[15px] leading-relaxed text-wb-soft">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function PlumBand() {
  return (
    <section className="mt-12 bg-wb-plum py-14 text-wb-paper">
      <Screen>
        <Sparkles className="mx-auto h-6 w-6 text-[#E9D9C8]" strokeWidth={1.4} />
        <h2 className="mt-3 text-center text-[30px] leading-[1.1] text-white">
          Try Bestie free
          <br />
          for a day
        </h2>
        <p className="mt-4 text-center text-[16px] leading-relaxed text-white/90">Check in in two minutes and see your curated day straight away. No card, no app download.</p>
        <PillLink to="/plan/inputs" tone="ivory" className="mt-8 w-full" onClick={() => ctaClick('Check in — it\'s free', 'band')}>
          Check in · it's free
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

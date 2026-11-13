/**
 * Bestie tab: your profile + the community. Joining and browsing are free;
 * the weekly planner and Swipe for a bestie are for paying members.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarHeart, HeartHandshake, Lock, MapPin, Sparkles } from 'lucide-react';
import { Eyebrow, Photo, PillLink, Screen, WaitlistLink } from '../bestie/kit';
import { PROFILES } from '../bestie/MembershipScreen';
import SignInSheet from '../components/SignInSheet';
import { MeetupEvents } from '../bestie/HomeScreen';
import { useAuth } from '../../hooks/useAuth';
import { ctaClick } from '../analytics/track';
import { INSTAGRAM_URL } from '../analytics/config';

const FEATURES = [
  { icon: CalendarHeart, title: 'Your weekly planner', text: 'Bestie plans every day around your energy, time and budget, remembers your patterns and learns what works for you.' },
  { icon: HeartHandshake, title: 'Swipe for a bestie', text: 'Everyone can see the profiles here. Swiping and saying hi to a bestie, like someone nearby with the same class or café in her plan, is for members.' },
];

function displayName(user: any): string {
  const m = user?.user_metadata || {};
  return m.name || m.full_name || (user?.email ? String(user.email).split('@')[0] : 'You');
}

function YourProfile({ onJoin }: { onJoin: (mode: 'login') => void }) {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    return (
      <div className="rounded-[14px] bg-wb-stone p-6 text-center">
        <p className="text-[14px] font-medium uppercase tracking-[0.16em] text-wb-taupe">Free to join</p>
        <h2 className="mt-2 text-[24px] text-wb-ink">Join with your email</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-wb-soft">Get a free day with Bestie and a place on the waitlist. Your profile comes with membership. No card needed.</p>
        <WaitlistLink source="bestie_tab" className="mt-5 w-full" label="Join free" />
        <button type="button" onClick={() => onJoin('login')} className="mt-3 block w-full text-[14px] text-wb-plum underline underline-offset-4">
          I already have an account
        </button>
      </div>
    );
  }
  const name = displayName(user);
  return (
    <div className="flex items-center gap-4 rounded-[14px] bg-wb-stone p-5">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-wb-plum text-[24px] text-white" style={{ fontFamily: 'var(--font-wb-serif)' }}>
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[20px] font-medium text-wb-ink">{name}</p>
        <p className="text-[14px] text-wb-taupe">Free member</p>
      </div>
      <Link to="/profile" className="shrink-0 rounded-full border border-wb-plum/40 px-4 py-2 text-[14px] uppercase tracking-[0.1em] text-wb-plum hover:border-wb-plum">
        Edit
      </Link>
    </div>
  );
}

export default function BestiePage() {
  const [showLogin, setShowLogin] = useState(false);
  const join = () => {
    ctaClick('Log in', 'bestie_tab');
    setShowLogin(true);
  };

  return (
    <Screen className="pb-16 pt-24">
      <Eyebrow>The Bestie community</Eyebrow>
      <h1 className="mt-3 text-[36px] leading-[1.05] text-wb-ink">Find your people</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-wb-soft">Women in Dubai who move, eat well and show up for each other. Everyone can join for free.</p>

      <div className="mt-8">
        <YourProfile onJoin={join} />
      </div>

      <div className="mt-12 flex items-end justify-between">
        <h2 className="text-[24px] text-wb-ink">Who's here</h2>
        <span className="text-[14px] text-wb-taupe">Sample profiles</span>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {PROFILES.map((p) => (
          <li key={p.name} className="overflow-hidden rounded-[14px] border border-wb-sand/60 bg-wb-shell">
            <Photo src={p.photo} alt="" className="aspect-[4/5]" w={400} h={500} />
            <div className="p-3">
              <p className="text-[16px] font-medium text-wb-ink">
                {p.name}, {p.age}
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[14px] text-wb-taupe">
                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                <span className="truncate">{p.area}</span>
              </p>
              <p className="mt-1 truncate text-[14px] text-wb-soft">{p.interests.join(' · ')}</p>
            </div>
          </li>
        ))}
        <li className="flex aspect-auto flex-col items-center justify-center rounded-[14px] border border-dashed border-wb-sand p-4 text-center">
          <Sparkles className="h-6 w-6 text-wb-gold" strokeWidth={1.4} />
          <p className="mt-2 text-[15px] text-wb-soft">Your profile could be here</p>
        </li>
      </ul>

      <div className="mt-12">
        <Eyebrow>For members</Eyebrow>
        <h2 className="mt-2 text-[24px] text-wb-ink">Unlock Bestie</h2>
        <ul className="mt-4 space-y-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4 rounded-[14px] border border-wb-sand/60 bg-wb-shell p-5">
              <Icon className="mt-0.5 h-6 w-6 shrink-0 text-wb-gold" strokeWidth={1.4} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[17px] font-medium text-wb-ink">
                  {title} <Lock className="h-3.5 w-3.5 text-wb-taupe" strokeWidth={1.8} aria-label="Members only" />
                </p>
                <p className="mt-1 text-[15px] leading-relaxed text-wb-soft">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <PillLink to="/membership" className="mt-5 w-full" onClick={() => ctaClick('Become a member', 'bestie_tab')}>
          Become a member
        </PillLink>
        <p className="mt-3 text-center text-[14px] text-wb-taupe">Try a free day first: check in from the homepage.</p>
      </div>

      <section id="stepsisters" className="mt-12 scroll-mt-24">
        <Eyebrow>Stepsisters · free</Eyebrow>
        <h2 className="mt-2 text-[24px] text-wb-ink">Meet up in real life</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-wb-soft">
          Free meetups by ORIRI for women in Dubai: walks, coffee and classes together. Come alone, leave with friends.
        </p>
        <MeetupEvents />
        <p className="mt-2 text-[14px] text-wb-taupe">
          New dates go up on{' '}
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-wb-plum underline underline-offset-4">
            @ren_reset
          </a>
          .
        </p>
      </section>

      {showLogin && <SignInSheet source="bestie_tab" onClose={() => setShowLogin(false)} />}
    </Screen>
  );
}

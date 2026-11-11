/** 2 · Options: free 1-day plan vs membership */
import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Card, Eyebrow, GoldRule, PillLink, Screen, WaitlistLink, StepHeader, cx } from './kit';
import { ctaClick, track } from '../analytics/track';
import { withUtm } from '../analytics/utm';

export const MEMBER_PERKS = [
  'Remembers your patterns and behaviour',
  'Plans your week ahead',
  'Swipe for a bestie near you',
  'Priority places at Stepsisters events',
];

export default function OptionsScreen() {
  return (
    <Screen className="pb-16">
      <StepHeader back="/" title="How would you like to start?" sub="Try one day free, or let Bestie plan every day." />

      <Card className="mt-8 p-6">
        <Eyebrow>Free · one time</Eyebrow>
        <h2 className="mt-2 text-[28px]">Your 1-day plan</h2>
        <p className="mt-2 text-[16px] leading-relaxed text-wb-soft">Three quick questions, then a curated, tickable day: Move, Meal and Mindset.</p>
        <PillLink
          to="/plan/inputs"
          className="mt-6 w-full"
          onClick={() => {
            ctaClick('Start my free day', 'options');
            track('plan_start');
          }}
        >
          Start my free day
        </PillLink>
      </Card>

      <MembershipCard source="options" className="mt-4" />
    </Screen>
  );
}

/** Membership card: the four member privileges. Shared by home, /plan and Profile so they always match. */
export function MembershipCard({ source, className }: { source: string; className?: string }) {
  return (
  <section className={cx('rounded-[20px] bg-wb-plum p-6 text-wb-paper', className)}>
    <div className="flex items-center justify-between">
      <p className="text-[14px] font-medium uppercase tracking-[0.18em] text-wb-paper/80">Membership</p>
      <span className="rounded-full border border-wb-gold/60 px-3 py-1 text-[14px] text-wb-gold">Waitlist open</span>
    </div>
    <h2 className="mt-2 text-[28px] text-wb-paper">Bestie, every day</h2>
    <GoldRule className="mt-4" />
    <ul className="mt-4 space-y-3">
      {MEMBER_PERKS.map((p) => (
        <li key={p} className="flex gap-3 text-[15px] leading-snug text-wb-paper/90">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-wb-gold" strokeWidth={2} />
          {p}
        </li>
      ))}
    </ul>
    <WaitlistLink source={source} tone="ivory" className="mt-6 w-full" />
    <Link to={withUtm('/membership')} className="mt-3 flex h-11 items-center justify-center text-[15px] text-wb-paper/85 underline underline-offset-4 hover:text-wb-paper">
      Preview membership
    </Link>
  </section>
  );
}

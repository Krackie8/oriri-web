import React from 'react';
import { Eyebrow } from '../components/ui';
import { SITE_CONFIG } from '../analytics/config';

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'What we collect',
    body: (
      <>
        <p>
          <strong className="font-medium text-wb-ink">When you join the waitlist:</strong> your first name, home area, age group, workouts you
          love, email address, Instagram handle (optional), how you heard about us and your consent. We also attach where you came from (for
          example an Instagram or WhatsApp link, recorded as UTM tags), the page you first landed on, and the time you joined.
        </p>
        <p>
          <strong className="font-medium text-wb-ink">When you get your free day:</strong> your email address, your consent, the answers you gave
          (energy, goals, time, budget, area) and the plan we made, so we can email it to you and keep it to one free day per email.
        </p>
        <p>
          <strong className="font-medium text-wb-ink">Your checklist progress</strong> is saved only in your own browser, not on our servers.
        </p>
        <p>
          <strong className="font-medium text-wb-ink">If you accept analytics cookies:</strong> Google Analytics 4 and Microsoft Clarity record
          how the site is used, such as pages viewed, buttons tapped, how far you scroll, and anonymised session recordings and heatmaps.
          Clarity masks what you type into forms. We never send your name, email or Instagram handle to these tools.
        </p>
      </>
    ),
  },
  {
    title: 'Why',
    body: (
      <p>
        To send your plan, run the waitlist and email you about Wellness Bestie, to connect bestie matches on Instagram once both of you say hi,
        and to understand which channels bring people here so we can make the site simpler. We do not sell your data or use it for advertising.
      </p>
    ),
  },
  {
    title: 'Cookies and consent',
    body: (
      <p>
        Analytics only load after you tap Accept. If you decline, nothing is loaded. To remember where you came from until you apply, the
        site keeps the link's UTM tags in your browser's own storage for up to 30 days. They only leave your device inside a form
        you choose to send.
      </p>
    ),
  },
  {
    title: 'Where it is stored',
    body: (
      <p>
        Waitlist sign-ups and free-day requests are stored securely in our database (Supabase) and in a private Google Sheet that only the ORIRI team can access.
        Analytics data is processed by Google and Microsoft under their own privacy terms.
      </p>
    ),
  },
  {
    title: 'How long',
    body: <p>We keep waitlist sign-ups and free-day requests for up to 12 months, then delete them, unless you become a member.</p>,
  },
  {
    title: 'Your choices',
    body: (
      <p>
        You can ask to see, correct or delete your data at any time by emailing{' '}
        <a className="text-wb-ink underline underline-offset-4" href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`}>
          {SITE_CONFIG.CONTACT_EMAIL}
        </a>
        , or by replying on WhatsApp. You can change your cookie choice whenever you like.
      </p>
    ),
  },
];

export default function PrivacyPage({ onCookieSettings }: { onCookieSettings: () => void }) {
  return (
    <section className="mx-auto max-w-[760px] px-5 pb-24 pt-28 md:px-10 md:pt-40">
      <Eyebrow>Privacy</Eyebrow>
      <h1 className="mt-6 text-[44px] sm:text-[60px]">Your data, kept simple.</h1>
      <p className="mt-6 text-[18px] leading-relaxed text-wb-soft">What we collect on oriri.me, and why. Short, as promised.</p>

      <div className="mt-14 border-t border-wb-ink/12">
        {SECTIONS.map((s) => (
          <div key={s.title} className="grid gap-3 border-b border-wb-ink/12 py-8 sm:grid-cols-[12rem_1fr] sm:gap-8">
            <h2 className="text-[24px]">{s.title}</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-wb-soft">{s.body}</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onCookieSettings}
        className="mt-10 inline-flex h-12 items-center rounded-full border border-wb-ink/20 px-6 text-[15px] text-wb-ink transition-colors hover:border-wb-ink/50"
      >
        Change cookie settings
      </button>
      <p className="mt-8 text-[14px] text-wb-taupe">ORIRI · Dubai, United Arab Emirates</p>
    </section>
  );
}

/**
 * /join: how a woman becomes a Member (GLOSSARY.md: Join).
 * Step 1, sign in: email magic link or Google (Apple waits for an Apple Developer account). Every option returns her to /join.
 * Step 2, once signed in: 18+, Home area, an optional Instagram handle and her Consents.
 * Joining goes through the Function client only; this screen never touches the database.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabase/client';
import { functionClient, type ConsentPurpose } from '../functionClient';
import { Card, PillButton, Screen, StepHeader, cx } from '../bestie/kit';
import { loadInputs } from '../bestie/state';
import { LOCALE } from '../bestie/config';
import { formSubmit } from '../analytics/track';
import { getUtm } from '../analytics/utm';
import { CONSENT_LINES } from './consents';
import { joinRedirectUrl } from './redirect';
import { afterJoin as landing } from './afterJoin';

/** Her Day plan if the server has one for today (or this browser saved answers), otherwise the Check-in. */
const afterJoin = () => landing(() => functionClient.bestie.today(), () => !!loadInputs());

export default function JoinScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<'checking' | 'details' | 'error'>('checking');

  useEffect(() => {
    if (loading || !user) return;
    let live = true;
    setState('checking');
    functionClient.member.me().then(async (r) => {
      if (!live) return;
      if (r.ok && r.data.outcome === 'member') {
        const to = await afterJoin();
        if (live) navigate(to, { replace: true });
      } else setState(r.ok ? 'details' : 'error');
    });
    return () => {
      live = false;
    };
  }, [user, loading, navigate]);

  return (
    <Screen className="pb-20">
      <StepHeader back="/" title="Join Oriri, free" sub="Bestie plans your day around your energy, time and budget." />
      {loading ? null : !user ? (
        <SignIn />
      ) : state === 'details' ? (
        <Details onJoined={() => afterJoin().then((to) => navigate(to, { replace: true }))} />
      ) : state === 'error' ? (
        <p role="alert" className="mt-6 text-[15px] text-[#9A3F45]">
          Could not reach Oriri. Check your connection and refresh.
        </p>
      ) : (
        <p className="mt-6 text-[15px] text-wb-soft">One moment…</p>
      )}
    </Screen>
  );
}

const field =
  'mt-2 h-14 w-full rounded-full border border-wb-sand bg-wb-paper px-5 text-[16px] text-wb-ink outline-none transition-colors placeholder:text-wb-taupe/70 focus:border-wb-plum';

function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const redirectTo = joinRedirectUrl(window.location.origin);

  const magicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setError('Please check your email address.');
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ email: em, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    if (err) return setError('Could not send the link. Please try again.');
    setSent(true);
  };

  const oauth = async (provider: 'google') => {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (err) setError('Could not open sign-in. Please try again.');
  };

  if (sent) {
    return (
      <Card as="section" className="mt-6 p-6">
        <h2 className="text-[24px]">Check your email</h2>
        <p className="mt-2 text-[16px] leading-relaxed text-wb-soft">We sent a sign-in link to {email.trim()}. Open it on this phone to carry on.</p>
      </Card>
    );
  }

  return (
    <Card as="section" className="mt-6 p-6">
      <PillButton type="button" className="w-full" onClick={() => oauth('google')}>
        Continue with Google
      </PillButton>
      <form onSubmit={magicLink} noValidate className="mt-6">
        <label htmlFor="join-email" className="text-[14px] text-wb-taupe">
          Or get a sign-in link by email
        </label>
        <input
          id="join-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={160}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className={field}
        />
        {error && (
          <p role="alert" className="mt-3 text-[14px] text-[#9A3F45]">
            {error}
          </p>
        )}
        <PillButton type="submit" tone="outline" className="mt-4 w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Email me a link'}
        </PillButton>
      </form>
    </Card>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-wb-gold',
        on ? 'border-wb-plum bg-wb-plum text-wb-paper' : 'border-wb-plum/30 bg-wb-shell',
      )}
    >
      {on && <Check className="h-4 w-4" strokeWidth={2.2} />}
    </span>
  );
}

function Details({ onJoined }: { onJoined: () => void }) {
  const checkInArea = loadInputs()?.area || '';
  const [adult, setAdult] = useState(false);
  const [homeArea, setHomeArea] = useState((LOCALE.areas as readonly string[]).includes(checkInArea) ? checkInArea : '');
  const [instagram, setInstagram] = useState('');
  const [consents, setConsents] = useState<Partial<Record<ConsentPurpose, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adult) return setError('Please confirm you are 18 or older.');
    if (!homeArea) return setError('Please pick your home area.');
    if (!consents.terms) return setError('Please accept the terms to join.');
    setBusy(true);
    setError('');
    const r = await functionClient.member.join({ adult, homeArea, instagram, consents });
    setBusy(false);
    if (!r.ok) return setError(r.error.message || 'Something went wrong. Please try again.');
    if (r.data.outcome === 'invalid') return setError(r.data.message);
    if (r.data.outcome === 'signedOut') return setError('Your sign-in expired. Please refresh and sign in again.');
    if (r.data.outcome === 'joined') {
      // Keeps the Free day conversion events Ren's reports and ads count, now fired when she actually joins.
      const utm = getUtm();
      const tags = { utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign };
      formSubmit('free_day', tags);
      formSubmit('pilot_application', tags);
    }
    onJoined();
  };

  return (
    <Card as="section" className="mt-6 p-6">
      <h2 className="text-[24px]">Almost in</h2>
      <form onSubmit={submit} noValidate className="mt-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="peer sr-only" />
          <Tick on={adult} />
          <span className="text-[15px] leading-relaxed text-wb-ink">I’m 18 or older.</span>
        </label>

        <label htmlFor="join-area" className="mt-5 block text-[14px] text-wb-taupe">
          Your home area
        </label>
        <select id="join-area" value={homeArea} onChange={(e) => setHomeArea(e.target.value)} className={field}>
          <option value="">Pick an area</option>
          {LOCALE.areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <label htmlFor="join-instagram" className="mt-5 block text-[14px] text-wb-taupe">
          Instagram (optional, shown as self-added)
        </label>
        <input id="join-instagram" maxLength={31} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@you" className={field} />

        <fieldset className="mt-6 space-y-4">
          <legend className="text-[14px] text-wb-taupe">Your choices. Change them any time.</legend>
          {CONSENT_LINES.map((c) => (
            <label key={c.purpose} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={!!consents[c.purpose]}
                onChange={(e) => setConsents({ ...consents, [c.purpose]: e.target.checked })}
                className="peer sr-only"
              />
              <Tick on={!!consents[c.purpose]} />
              <span className="text-[14px] leading-relaxed text-wb-soft">
                {c.label}
                {c.required && <span className="text-wb-taupe"> (needed to join)</span>}
              </span>
            </label>
          ))}
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 text-[14px] text-[#9A3F45]">
            {error}
          </p>
        )}
        <PillButton type="submit" className="mt-6 w-full" disabled={busy} arrow={!busy}>
          {busy ? 'Joining…' : 'Join Oriri'}
        </PillButton>
      </form>
    </Card>
  );
}

/**
 * Sign in for existing ORIRI accounts, in the Wellness Bestie look.
 * There is no account sign-up here: new people join through the one email
 * sign-up (free day + waitlist). Accounts are set up when membership opens.
 */
import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { GoldRule, PillButton, WaitlistLink } from '../bestie/kit';
import { onWaitlist } from '../bestie/state';
import { SITE_CONFIG } from '../analytics/config';
import { ctaClick } from '../analytics/track';

const field =
  'mt-2 h-14 w-full rounded-full border border-wb-sand bg-wb-paper px-5 text-[16px] text-wb-ink outline-none transition-colors placeholder:text-wb-taupe/70 focus:border-wb-plum';

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match. Please try again.';
  if (/not confirmed/i.test(message)) return 'Please confirm your email first: open the link we sent you, then sign in.';
  if (/rate|too many/i.test(message)) return 'Too many tries. Please wait a minute and try again.';
  return 'We couldn’t sign you in just now. Please try again.';
}

export default function SignInSheet({ onClose, onSignedIn, source }: { onClose: () => void; onSignedIn?: () => void; source: string }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) return setError('Please enter your email address.');
    if (!password) return setError('Please enter your password.');
    setBusy(true);
    setError('');
    const { error: err } = await signIn(em, password);
    setBusy(false);
    if (err) return setError(friendly(err.message || ''));
    ctaClick('Signed in', source);
    onSignedIn?.();
    onClose();
  };

  const help = `mailto:${SITE_CONFIG.CONTACT_EMAIL}?subject=${encodeURIComponent('Reset my ORIRI password')}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="signin-title">
      <div
        className="wb-rise max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[24px] bg-wb-shell px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-6 sm:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <GoldRule />
            <h2 id="signin-title" className="mt-4 text-[28px] leading-tight text-wb-ink">
              Welcome back
            </h2>
            <p className="mt-1 text-[15px] text-wb-soft">Sign in to your ORIRI account.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-wb-plum hover:bg-wb-stone">
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="mt-5">
          <label htmlFor="signin-email" className="text-[14px] text-wb-taupe">
            Email address
          </label>
          <input id="signin-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={field} />

          <label htmlFor="signin-password" className="mt-4 block text-[14px] text-wb-taupe">
            Password
          </label>
          <div className="relative">
            <input
              id="signin-password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${field} pr-14`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 mt-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-wb-taupe"
            >
              {show ? <EyeOff className="h-5 w-5" strokeWidth={1.5} /> : <Eye className="h-5 w-5" strokeWidth={1.5} />}
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-[14px] text-[#9A3F45]">
              {error}
            </p>
          )}

          <PillButton type="submit" className="mt-5 w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </PillButton>
          <p className="mt-3 text-center text-[14px] text-wb-taupe">
            Forgot your password?{' '}
            <a href={help} className="text-wb-plum underline underline-offset-4">
              Email us
            </a>
          </p>
        </form>

        {!onWaitlist() && (
          <div className="mt-6 border-t border-wb-sand/70 pt-5 text-center">
            <p className="text-[15px] text-wb-soft">New here? Try Bestie free for a day. It puts you on the waitlist too.</p>
            <WaitlistLink source={`${source}_signin`} tone="outline" className="mt-4 w-full" label="Try a free day" />
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { InstagramLink, PilotCta, cx } from './ui';
import { withUtm } from '../analytics/utm';
import { getConsent, onConsentChange, setConsent } from '../analytics/consent';
import { SITE_CONFIG } from '../analytics/config';
import { whatsappClick } from '../analytics/track';

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link to={withUtm('/')} aria-label="Wellness Bestie by ORIRI, home" className={cx('inline-flex flex-col items-center leading-none', className)}>
      <span className="text-[21px] tracking-[0.01em] text-wb-plum" style={{ fontFamily: 'var(--font-wb-logo)' }}>Wellness Bestie</span>
      <span aria-hidden className="mt-1 block h-px w-full bg-wb-sand" />
      <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.32em] text-wb-taupe">by ORIRI</span>
    </Link>
  );
}

/** White app header: centred wordmark. Log in lives on the Profile tab at the bottom. */
export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-wb-sand/60 bg-wb-shell/95 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-[430px] grid-cols-[1fr_auto_1fr] items-center px-5">
        <span />
        <Wordmark />
        <span />
      </div>
    </header>
  );
}

export function SiteFooter({ onCookieSettings }: { onCookieSettings: () => void }) {
  const wa = SITE_CONFIG.WHATSAPP_NUMBER.replace(/\D/g, '');
  const link = 'flex min-h-11 items-center text-[15px] text-wb-soft hover:text-wb-ink';
  return (
    <footer className="border-t border-wb-sand px-5 pb-12 pt-12">
      <div className="mx-auto max-w-[430px]">
        <Wordmark className="!items-start" />
        <p className="mt-4 text-[15px] leading-relaxed text-wb-soft">Your wellness, curated for you.</p>
        <div className="mt-8 grid grid-cols-2 gap-x-6">
          <ul>
            <li><Link to={withUtm('/plan')} className={link}>Plan my day</Link></li>
            <li><Link to={withUtm('/membership')} className={link}>Membership</Link></li>
            <li><Link to={withUtm('/pilot')} className={link}>Waitlist</Link></li>
            <li><Link to="/community" className={link}>Stepsisters</Link></li>
            <li><Link to="/podcast" className={link}>Tea for Two</Link></li>
          </ul>
          <ul>
            <li><Link to={withUtm('/about')} className={link}>About ORIRI</Link></li>
            <li><InstagramLink location="footer" variant="text" className="min-h-11 !text-[15px]" /></li>
            {wa && (
              <li>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" onClick={() => whatsappClick('contact', 'footer')} className={link}>
                  WhatsApp
                </a>
              </li>
            )}
            <li><Link to={withUtm('/privacy')} className={link}>Privacy</Link></li>
            <li>
              <button type="button" onClick={onCookieSettings} className={link}>
                Cookie settings
              </button>
            </li>
          </ul>
        </div>
        <p className="mt-10 text-[14px] text-wb-taupe">© {new Date().getFullYear()} ORIRI</p>
      </div>
    </footer>
  );
}

/** Light consent banner. GA4 + Clarity load only after "Accept". */
export function CookieBanner({ forceOpen, onClose }: { forceOpen: boolean; onClose: () => void }) {
  const [consent, setLocal] = useState(getConsent());
  useEffect(() => onConsentChange(setLocal), []);
  const open = forceOpen || consent === null;
  if (!open) return null;

  const choose = (v: 'granted' | 'denied') => {
    setConsent(v);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="wb-rise fixed inset-x-3 bottom-[84px] z-50 mx-auto max-w-[460px] rounded-[24px] border border-wb-ink/10 bg-wb-shell/95 p-5 shadow-[0_24px_60px_-20px_rgba(42,39,35,0.35)] backdrop-blur-xl md:inset-x-auto md:right-6"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[15px] leading-relaxed text-wb-soft">
          May we use analytics cookies to see how you found us and improve the site? Nothing loads unless you say yes.{' '}
          <Link to={withUtm('/privacy')} className="text-wb-ink underline underline-offset-4">Privacy</Link>
        </p>
        {forceOpen && consent !== null && (
          <button type="button" aria-label="Close" onClick={onClose} className="-mr-1 -mt-1 rounded-full p-1 text-wb-taupe hover:text-wb-ink">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => choose('denied')}
          className={cx('h-11 rounded-full border text-[15px] transition-colors', consent === 'denied' ? 'border-wb-ink text-wb-ink' : 'border-wb-ink/20 text-wb-soft hover:border-wb-ink/50')}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          className="h-11 rounded-full bg-wb-ink text-[15px] font-medium text-wb-shell transition-colors hover:bg-wb-sage-deep"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

/** Mobile-only sticky CTA that appears once the hero CTA has scrolled away. */
export function StickyCta({ hidden }: { hidden: boolean }) {
  return (
    <div
      className={cx(
        'fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-6 transition-all duration-500 md:hidden',
        'bg-gradient-to-t from-wb-paper via-wb-paper/90 to-transparent',
        hidden ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100',
      )}
    >
      <PilotCta location="sticky" className="w-full" />
    </div>
  );
}

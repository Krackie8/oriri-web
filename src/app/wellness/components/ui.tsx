import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Instagram } from 'lucide-react';
import { ctaClick, instagramClick, type CtaLocation } from '../analytics/track';
import { withUtm } from '../analytics/utm';
import { INSTAGRAM_URL, SITE_CONFIG } from '../analytics/config';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const unsplash = (id: string, w = 1200, h?: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}${h ? `&h=${h}` : ''}&fit=crop&auto=format&q=75`;

/** Real photography with a stone ground so layout holds while loading. */
export function Photo({
  id,
  alt,
  className,
  w = 1200,
  h,
  eager,
}: {
  id: string;
  alt: string;
  className?: string;
  w?: number;
  h?: number;
  eager?: boolean;
}) {
  return (
    <div className={cx('overflow-hidden bg-wb-stone', className)}>
      <img
        src={unsplash(id, w, h)}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="h-full w-full object-cover saturate-[0.82] contrast-[0.97]"
      />
    </div>
  );
}

/**
 * ▶ PHOTO PLACEHOLDER — replace with your own photo of Ren.
 * Swap this component for <img src="/your-photo.jpg" ... /> when ready.
 */
export function PhotoPlaceholder({ label, ratio = 'aspect-[4/5]', className }: { label: string; ratio?: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Photo placeholder: ${label}`}
      className={cx(
        'relative flex flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-wb-taupe/50 bg-wb-stone/70 p-6 text-center',
        ratio,
        className,
      )}
    >
      <Camera className="h-6 w-6 text-wb-taupe" strokeWidth={1.4} />
      <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-wb-taupe">Photo placeholder</p>
      <p className="max-w-[16rem] text-[15px] leading-snug text-wb-soft">{label}</p>
    </div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cx('text-[14px] font-medium uppercase tracking-[0.18em] text-wb-taupe', className)}>{children}</p>;
}

/** The one primary CTA. Always lands on /pilot with UTMs preserved. */
export function PilotCta({
  location,
  label = 'Join the waitlist',
  size = 'lg',
  className,
  tone = 'ink',
}: {
  location: CtaLocation;
  label?: string;
  size?: 'sm' | 'lg';
  className?: string;
  tone?: 'ink' | 'shell';
}) {
  return (
    <Link
      to={withUtm('/pilot')}
      onClick={() => ctaClick(label, location)}
      data-cta-location={location}
      className={cx(
        'group inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-wb-paper active:scale-[0.98]',
        tone === 'ink'
          ? 'bg-wb-ink text-wb-shell hover:bg-wb-sage-deep'
          : 'bg-wb-shell text-wb-ink hover:bg-white',
        size === 'lg' ? 'h-14 px-8 text-[16px]' : 'h-10 px-5 text-[14px]',
        className,
      )}
    >
      {label}
      <ArrowRight className={cx('transition-transform duration-300 group-hover:translate-x-0.5', size === 'lg' ? 'h-[18px] w-[18px]' : 'h-4 w-4')} strokeWidth={1.6} />
    </Link>
  );
}

export function InstagramLink({
  location,
  variant = 'button',
  className,
}: {
  location: string;
  variant?: 'button' | 'text';
  className?: string;
}) {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => instagramClick(location)}
      className={cx(
        'inline-flex items-center justify-center gap-2 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-sage-deep focus-visible:ring-offset-2',
        variant === 'button'
          ? 'h-14 rounded-full border border-wb-ink/20 px-8 text-[16px] font-medium text-wb-ink hover:border-wb-ink/50 hover:bg-wb-shell'
          : 'text-[16px] text-wb-ink underline decoration-wb-ink/25 underline-offset-[6px] hover:decoration-wb-ink',
        className,
      )}
    >
      <Instagram className="h-[18px] w-[18px]" strokeWidth={1.5} />
      {variant === 'button' ? 'Follow on Instagram' : `@${SITE_CONFIG.INSTAGRAM_HANDLE}`}
    </a>
  );
}

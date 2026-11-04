/** Wellness Bestie UI kit: quiet-luxury editorial. Min text 14px, pill buttons, 16–20px cards. */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Coffee, Footprints, HeartHandshake, Salad, type LucideIcon } from 'lucide-react';
import { cx, unsplash } from '../components/ui';
import { withUtm } from '../analytics/utm';
import type { PillarKey } from './picks';

export { cx };

/** The 390px app column. */
export function Screen({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-[430px] px-5', className)}>{children}</div>;
}

export function Eyebrow({ children, className, tone = 'taupe' }: { children: React.ReactNode; className?: string; tone?: 'taupe' | 'ivory' }) {
  return (
    <p className={cx('text-[14px] font-medium uppercase tracking-[0.18em]', tone === 'ivory' ? 'text-wb-paper/80' : 'text-wb-taupe', className)}>
      {children}
    </p>
  );
}

/** A short gold hairline: the one decorative accent. */
export const GoldRule = ({ className }: { className?: string }) => <span aria-hidden className={cx('block h-px w-10 bg-wb-gold', className)} />;

type BtnTone = 'plum' | 'ivory' | 'outline' | 'gold';
const btn = (tone: BtnTone, size: 'md' | 'lg') =>
  cx(
    'group inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-gold focus-visible:ring-offset-2 focus-visible:ring-offset-wb-paper active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    size === 'lg' ? 'h-14 px-7 text-[16px]' : 'h-11 px-5 text-[15px]',
    tone === 'plum' && 'bg-wb-plum text-wb-paper hover:bg-[#3A2230]',
    tone === 'ivory' && 'bg-wb-paper text-wb-plum hover:bg-white',
    tone === 'outline' && 'border border-wb-plum/25 text-wb-plum hover:border-wb-plum/60',
    tone === 'gold' && 'bg-wb-gold text-wb-ink hover:bg-[#BD9658]',
  );

interface BtnProps {
  children: React.ReactNode;
  tone?: BtnTone;
  size?: 'md' | 'lg';
  className?: string;
  arrow?: boolean;
  onClick?: () => void;
}

export function PillLink({ to, children, tone = 'plum', size = 'lg', className, arrow = true, onClick }: BtnProps & { to: string }) {
  return (
    <Link to={withUtm(to)} onClick={onClick} className={cx(btn(tone, size), className)}>
      {children}
      {arrow && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.7} />}
    </Link>
  );
}

export function PillButton({
  children,
  tone = 'plum',
  size = 'lg',
  className,
  arrow,
  onClick,
  type = 'button',
  disabled,
}: BtnProps & { type?: 'button' | 'submit'; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cx(btn(tone, size), className)}>
      {children}
      {arrow && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.7} />}
    </button>
  );
}

export function Chip({
  children,
  selected,
  onClick,
  role = 'checkbox',
  className,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  role?: 'checkbox' | 'radio';
  className?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cx(
        'h-11 whitespace-nowrap rounded-full border px-4 text-[15px] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-gold',
        selected ? 'border-wb-plum bg-wb-plum text-wb-paper' : 'border-wb-sand bg-wb-shell text-wb-soft hover:border-wb-plum/40 hover:text-wb-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Card({ children, className, as: As = 'div' }: { children: React.ReactNode; className?: string; as?: 'div' | 'section' | 'li' }) {
  return <As className={cx('rounded-[20px] border border-wb-sand/80 bg-wb-shell', className)}>{children}</As>;
}

/** Real photo (Unsplash ID, URL or imported file) on a stone ground. */
export function Photo({ src, alt = '', className, w = 800, h }: { src: string; alt?: string; className?: string; w?: number; h?: number }) {
  const url = /^(https?:)?\/\//.test(src) || src.startsWith('/') || src.startsWith('data:') ? src : unsplash(src, w, h);
  return (
    <div className={cx('overflow-hidden bg-wb-stone', className)}>
      <img src={url} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
    </div>
  );
}

export const PILLAR_ICON: Record<PillarKey, LucideIcon> = {
  move: Footprints,
  meal: Salad,
  mindset: Coffee,
  meetup: HeartHandshake,
};

export function PillarIcon({ pillar, className }: { pillar: PillarKey; className?: string }) {
  const Icon = PILLAR_ICON[pillar];
  return <Icon aria-hidden className={className} strokeWidth={1.3} />;
}

/** Step header for the plan flow: back link + "Step x of 3". */
export function StepHeader({ back, step, total = 3, title, sub }: { back: string; step?: number; total?: number; title: string; sub?: string }) {
  return (
    <div className="pt-24">
      <div className="flex items-center justify-between">
        <Link to={withUtm(back)} className="-ml-1 inline-flex h-11 items-center gap-1.5 rounded-full px-1 text-[15px] text-wb-soft hover:text-wb-ink">
          <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={1.7} /> Back
        </Link>
        {step && (
          <span className="text-[14px] text-wb-taupe">
            Step {step} of {total}
          </span>
        )}
      </div>
      {step && (
        <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0,1fr))` }} aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cx('h-[3px] rounded-full', i < step ? 'bg-wb-plum' : 'bg-wb-sand')} />
          ))}
        </div>
      )}
      <h1 className="mt-7 text-[34px] text-wb-ink">{title}</h1>
      {sub && <p className="mt-2 text-[16px] leading-relaxed text-wb-soft">{sub}</p>}
    </div>
  );
}

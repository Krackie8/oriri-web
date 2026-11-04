import React from 'react';
import * as socialApi from '../../utils/socialApi';
import { PLATFORM_META, type SocialProfile } from '../../data/socialConfig';

interface SocialIconRowProps {
  profiles: SocialProfile[];
  /** Where the click happened, for attribution. */
  source: string;
  size?: 'sm' | 'md' | 'lg';
  /** 'muted' fits app chrome, 'brand' tints each icon with its platform colour. */
  tone?: 'muted' | 'brand';
  className?: string;
}

const SIZES = {
  sm: { box: 'w-8 h-8', icon: 'w-3.5 h-3.5' },
  md: { box: 'w-10 h-10', icon: 'w-4 h-4' },
  lg: { box: 'w-12 h-12', icon: 'w-5 h-5' },
};

/** Reusable row of social profile links. Used by the footer, side menu and /links. */
export function SocialIconRow({
  profiles,
  source,
  size = 'md',
  tone = 'muted',
  className = '',
}: SocialIconRowProps) {
  if (profiles.length === 0) return null;

  const s = SIZES[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {profiles.map((profile) => {
        const meta = PLATFORM_META[profile.platform];
        if (!meta) return null;
        const Icon = meta.icon;

        return (
          <a
            key={`${profile.platform}-${profile.handle}`}
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${meta.label} — ${profile.handle}`}
            title={`${meta.label} · ${profile.handle}`}
            onClick={() => void socialApi.trackClick(`profile-${profile.platform}`, source)}
            className={`${s.box} flex items-center justify-center rounded-full border border-border/60 bg-card/60 transition-all duration-200 hover:scale-105 hover:border-border`}
            style={tone === 'brand' ? { color: meta.color } : undefined}
          >
            <Icon className={`${s.icon} ${tone === 'muted' ? 'text-muted-foreground' : ''}`} />
          </a>
        );
      })}
    </div>
  );
}

export default SocialIconRow;

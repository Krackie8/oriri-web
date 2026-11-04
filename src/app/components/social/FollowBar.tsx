import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useSocialConfig } from '../../hooks/useSocialConfig';
import * as socialApi from '../../utils/socialApi';
import { PLATFORM_META, formatFollowers } from '../../data/socialConfig';

/**
 * Compact "follow us" strip for Home. Shows each visible profile as a tappable
 * chip with its follower count when the admin has entered one.
 */
export function FollowBar() {
  const { profiles } = useSocialConfig();

  if (profiles.length === 0) return null;

  const total = profiles.reduce((sum, p) => sum + (p.followerCount ?? 0), 0);
  const totalLabel = formatFollowers(total);

  return (
    <section className="px-4 py-5">
      <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-lg text-foreground">
            {totalLabel ? `Join ${totalLabel} listeners` : 'Follow Oriri'}
          </h2>
          <span className="text-xs text-muted-foreground">Behind the scenes, daily</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {profiles.map((profile) => {
            const meta = PLATFORM_META[profile.platform];
            if (!meta) return null;
            const Icon = meta.icon;
            const followers = formatFollowers(profile.followerCount);

            return (
              <a
                key={`${profile.platform}-${profile.handle}`}
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void socialApi.trackClick(`profile-${profile.platform}`, 'home-follow-bar')}
                className="flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-2 transition-all duration-200 hover:scale-[1.02] hover:border-border"
              >
                <Icon className="h-4 w-4" style={{ color: meta.color }} />
                <span className="whitespace-nowrap text-sm text-foreground">
                  {followers ? `${followers} on ${meta.label}` : meta.label}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FollowBar;

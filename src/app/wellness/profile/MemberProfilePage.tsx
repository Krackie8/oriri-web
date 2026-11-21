/**
 * /profile (#73). A Member sees her Profile: the spider chart of her Levels (now, over 30 days ago), her
 * Status and its moments. Private to her (DEC-003): only what she shares herself leaves the page.
 * Anyone else sees the sign-in page.
 */
import React, { useEffect, useState } from 'react';
import { functionClient, type Profile } from '../functionClient';
import type { Result } from '../functionClient/types';
import type { ProfileOutcome } from '../functionClient';
import GuestProfilePage from '../pages/GuestProfilePage';
import { Card, Eyebrow, GoldRule, PillLink, PillarIcon, Screen } from '../bestie/kit';
import { SpiderChart } from './SpiderChart';
import { ShareStatus } from './ShareStatus';
import { CHART_AXES, PILLAR_LABEL, profileScreen, toNextLine } from './progressView';

export default function ProfilePage() {
  const [r, setR] = useState<Result<ProfileOutcome> | null>(null);
  useEffect(() => {
    let live = true;
    functionClient.bestie.profile().then((x) => live && setR(x));
    return () => {
      live = false;
    };
  }, []);
  if (!r) return <Screen className="pb-20 pt-24 text-center text-[16px] text-wb-soft">Loading your Profile…</Screen>;
  const screen = profileScreen(r);
  if (screen === 'guest') return <GuestProfilePage />;
  if (screen === 'error' || !r.ok || r.data.outcome !== 'profile')
    return <Screen className="pb-20 pt-24 text-center text-[16px] text-wb-soft">Bestie could not load your Profile. Please try again in a moment.</Screen>;
  return <MemberProfile profile={r.data.profile} />;
}

const when = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', year: 'numeric' });

function MemberProfile({ profile: p }: { profile: Profile }) {
  return (
    <Screen className="pb-16">
      <div className="pt-16">
        <Eyebrow>Your Profile</Eyebrow>
        <h1 className="mt-3 text-[36px] leading-[1.05] text-wb-ink">{p.status.name}</h1>
        <GoldRule className="mt-5" />
        <p className="mt-4 text-[16px] leading-relaxed text-wb-soft">
          Your Status comes from your Levels. It grows as you complete what Bestie suggests, and it never goes down.
        </p>
        {import.meta.env.DEV && <p className="mt-1 text-[12px] text-wb-taupe">(Status names are placeholders.)</p>}
      </div>

      <Card className="mt-6 p-4">
        <SpiderChart levels={p.levels} levels30={p.levels30} className="mx-auto block w-full max-w-[320px]" />
        <div className="mt-2 flex items-center justify-center gap-5 text-[13px] text-wb-taupe">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-wb-sage/60" /> Now
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block w-4 border-t border-dashed border-wb-ink" /> 30 days ago
          </span>
        </div>
      </Card>

      <ul className="mt-6 space-y-2">
        {CHART_AXES.map((pillar) => (
          <li key={pillar} className="flex items-center justify-between rounded-[14px] bg-wb-shell px-4 py-3">
            <span className="flex items-center gap-3 text-[16px] text-wb-ink">
              <PillarIcon pillar={pillar === 'meet_up' ? 'meetup' : pillar} className="h-5 w-5 text-wb-taupe" />
              {PILLAR_LABEL[pillar]} · Level {p.levels[pillar]}
            </span>
            <span className="text-[13px] text-wb-taupe">{toNextLine(p.points[pillar], p.nextAt[pillar], p.levels[pillar])}</span>
          </li>
        ))}
      </ul>

      <ShareStatus name={p.status.name} levels={p.levels} className="mt-6" />

      {p.moments.length > 0 && (
        <section className="mt-8" aria-labelledby="wb-moments">
          <h2 id="wb-moments" className="text-[22px] text-wb-ink">
            Your moments
          </h2>
          <ul className="mt-3 space-y-2">
            {p.moments.map((m) => (
              <li key={m.at + m.shape + m.tier} className="flex justify-between text-[15px] text-wb-soft">
                <span>{m.name}</span>
                <span className="text-wb-taupe">{when.format(new Date(m.at))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-[14px] leading-relaxed text-wb-taupe">
        Your Levels and Status are private. Other Members only ever see your Met at Oriri badge.
      </p>
      <div className="mt-6">
        <PillLink to="/plan/day" tone="outline" size="md">
          Today’s plan
        </PillLink>
      </div>
    </Screen>
  );
}

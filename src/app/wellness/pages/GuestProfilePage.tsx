/**
 * Profile on the Bestie side. A visitor signs in the same way she joins (magic link or Google, on /join);
 * once signed in, /join sends a Member to her Day plan (or Check-in) and asks anyone else for her details.
 */
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { CircleUserRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Eyebrow, GoldRule, PillLink, Screen } from '../bestie/kit';
import { MembershipCard } from '../bestie/OptionsScreen';
import { JOIN_PATH } from '../join/redirect';

export default function GuestProfilePage() {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) return <Navigate to={JOIN_PATH} replace />;

  return (
    <Screen className="pb-16">
      <div className="pt-20">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wb-stone text-wb-plum">
          <CircleUserRound className="h-7 w-7" strokeWidth={1.3} />
        </span>
        <Eyebrow className="mt-6">Your profile</Eyebrow>
        <h1 className="mt-3 text-[40px] leading-[1.05]">This is where your Bestie lives.</h1>
        <GoldRule className="mt-5" />
        <p className="mt-5 text-[17px] leading-relaxed text-wb-soft">
          Sign in to see your plans, or join free in a minute.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <PillLink to={JOIN_PATH} className="w-full">
          Sign in
        </PillLink>
      </div>

      <MembershipCard source="profile" className="mt-10" />
    </Screen>
  );
}

/** Profile for visitors who aren't signed in: sign in, or see what membership gives you. */
import React, { useState } from 'react';
import { CircleUserRound } from 'lucide-react';
import { Eyebrow, GoldRule, PillButton, Screen } from '../bestie/kit';
import { MembershipCard } from '../bestie/OptionsScreen';
import SignInSheet from '../components/SignInSheet';


export default function GuestProfilePage() {
  const [showLogin, setShowLogin] = useState(false);

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
          Sign in to see your plans, or join the waitlist for membership.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <PillButton onClick={() => setShowLogin(true)} className="w-full">
          Sign in
        </PillButton>
      </div>

      <MembershipCard source="profile" className="mt-10" />

      {showLogin && <SignInSheet source="profile" onClose={() => setShowLogin(false)} />}
    </Screen>
  );
}

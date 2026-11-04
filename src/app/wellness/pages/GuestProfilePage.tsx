/** Profile for visitors who aren't signed in: sign in, or see what membership gives you. */
import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { CalendarHeart, CircleUserRound, Headphones, Sparkles } from 'lucide-react';
import { Card, Eyebrow, GoldRule, PillButton, PillLink, Screen } from '../bestie/kit';
import LoginScreen from '../../components/LoginScreen';
import { Toaster } from '../../components/ui/sonner';
import { useAuthHandlers } from '../../hooks/useAuthHandlers';

const PERKS = [
  { icon: CalendarHeart, title: 'Your week, planned', text: 'Bestie plans every day around your energy, time and budget.' },
  { icon: Sparkles, title: 'It learns you', text: 'The more you use it, the more it knows what works for you.' },
  { icon: Headphones, title: 'Tea for Two extras', text: 'Saved episodes and member-only drops.' },
];

export default function GuestProfilePage() {
  const [showLogin, setShowLogin] = useState(false);
  const { handleLogin } = useAuthHandlers();

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
          Sign in to see your plans, or become a member to get a week planned around you.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <PillButton onClick={() => setShowLogin(true)} className="w-full">
          Sign in
        </PillButton>
        <PillLink to="/membership" tone="outline" className="w-full">
          Become a member
        </PillLink>
      </div>

      <Card className="mt-10 p-6">
        <h2 className="text-[22px]">What members get</h2>
        <ul className="mt-4 space-y-4">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-wb-gold" strokeWidth={1.4} />
              <div>
                <p className="text-[16px] text-wb-ink">{title}</p>
                <p className="mt-0.5 text-[15px] leading-relaxed text-wb-soft">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <AnimatePresence>
        {showLogin && (
          <LoginScreen
            onClose={() => setShowLogin(false)}
            onGuestMode={() => setShowLogin(false)}
            onLogin={async (email, password) => {
              await handleLogin(email, password);
            }}
          />
        )}
      </AnimatePresence>
      {/* Only for sign-in messages; avoids background podcast-sync toasts on this page */}
      {showLogin && <Toaster />}
    </Screen>
  );
}

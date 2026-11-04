import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CalendarCheck, Headphones, ShoppingBag, CircleUserRound } from 'lucide-react';

/**
 * One bottom bar for the whole app (Wellness Bestie home + episodes, shop, profile).
 * Quiet-luxury: ivory ground, plum active state, thin line icons.
 */
type Tab = 'home' | 'plan' | 'episodes' | 'store' | 'profile';

interface BottomTabBarProps {
  onShowLogin?: () => void;
}

const TABS: { id: Tab; icon: typeof Home; label: string; path: string }[] = [
  { id: 'home', icon: Home, label: 'Home', path: '/' },
  { id: 'plan', icon: CalendarCheck, label: 'Plan', path: '/plan' },
  { id: 'episodes', icon: Headphones, label: 'Episodes', path: '/episodes' },
  { id: 'store', icon: ShoppingBag, label: 'Shop', path: '/store' },
  { id: 'profile', icon: CircleUserRound, label: 'Profile', path: '/profile' },
];

export default function BottomTabBar(_props: BottomTabBarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const current: Tab = pathname.startsWith('/plan')
    ? 'plan'
    : pathname.startsWith('/episode')
      ? 'episodes'
      : pathname.startsWith('/store')
        ? 'store'
        : pathname.startsWith('/profile')
          ? 'profile'
          : 'home';

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E4DAD0] bg-[#F7F3EE]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="mx-auto grid h-16 max-w-[430px] grid-cols-5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = current === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(t.path)}
              aria-current={on ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C9A46A] ${
                on ? 'text-[#4A2C3D]' : 'text-[#76636D] hover:text-[#2A1B24]'
              }`}
            >
              {on && <span aria-hidden className="absolute top-0 h-[2px] w-8 rounded-full bg-[#C9A46A]" />}
              <Icon className="h-[22px] w-[22px]" strokeWidth={on ? 1.6 : 1.3} />
              <span className="text-[14px] leading-none" style={{ fontFamily: "'Figtree', system-ui, sans-serif" }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

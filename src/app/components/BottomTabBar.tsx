import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Mic, ShoppingBag, Sparkles } from 'lucide-react';

/**
 * One bottom bar for the whole app: Home (Wellness Bestie), Podcast (Tea for Two),
 * Shop (coming soon) and Bestie (your profile + the community). The free planner is reached from Home.
 * Quiet-luxury: ivory ground, plum active state, thin line icons.
 */
type Tab = 'home' | 'podcast' | 'shop' | 'bestie';

interface BottomTabBarProps {
  onShowLogin?: () => void;
}

const TABS: { id: Tab; icon: typeof Home; label: string; path: string }[] = [
  { id: 'home', icon: Home, label: 'Home', path: '/' },
  { id: 'podcast', icon: Mic, label: 'Podcast', path: '/podcast' },
  // Coming soon page for now; later ORIRI merch and affiliate picks
  { id: 'shop', icon: ShoppingBag, label: 'Shop', path: '/shop' },
  { id: 'bestie', icon: Sparkles, label: 'Bestie', path: '/bestie' },
];

export default function BottomTabBar(_props: BottomTabBarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The free plan (/plan/...) is reached from the homepage, so it counts as Home
  const current: Tab = pathname.startsWith('/episode') || pathname.startsWith('/podcast')
    ? 'podcast'
    : pathname.startsWith('/shop') || pathname.startsWith('/store')
      ? 'shop'
      : pathname.startsWith('/bestie') || pathname.startsWith('/profile') || pathname.startsWith('/membership')
        ? 'bestie'
        : 'home';

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDD4CD] bg-[#FAF8F5]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="mx-auto grid h-16 max-w-[430px] grid-cols-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = current === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(t.path)}
              aria-current={on ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B8A291] ${
                on ? 'text-[#7D6D61]' : 'text-[#7D6D61] hover:text-[#2B2522]'
              }`}
            >
              {on && <span aria-hidden className="absolute top-0 h-[2px] w-8 rounded-full bg-[#B8A291]" />}
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

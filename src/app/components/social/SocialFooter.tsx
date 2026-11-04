import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocialConfig } from '../../hooks/useSocialConfig';
import { SocialIconRow } from './SocialIconRow';

const QUICK_LINKS = [
  { label: 'Episodes', path: '/episodes' },
  { label: 'Wellness Bestie', path: '/' },
  { label: 'Community', path: '/community' },
  { label: 'Store', path: '/store' },
  { label: 'Links', path: '/links' },
];

/**
 * Site footer. Rendered inside the routed content area (not fixed) so it never
 * collides with the BottomTabBar.
 */
export function SocialFooter() {
  const navigate = useNavigate();
  const { profiles } = useSocialConfig();

  return (
    <footer className="mt-12 border-t border-border/60 bg-card/30 px-6 pb-10 pt-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-serif text-2xl text-foreground">Oriri</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tea for Two — conversations on life, growth and wellness from the UAE.
        </p>

        <SocialIconRow
          profiles={profiles}
          source="footer"
          size="md"
          className="mt-5 justify-center"
        />

        <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </button>
          ))}
        </nav>
        <p className="mt-3 text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Oriri · oriri.me
        </p>
      </div>
    </footer>
  );
}

export default SocialFooter;

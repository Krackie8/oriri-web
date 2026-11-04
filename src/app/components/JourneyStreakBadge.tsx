/**
 * JourneyStreakBadge — compact listen-streak pill for headers/toolbars.
 *
 * Reads the unified journey via useJourney. Renders nothing when logged out or
 * before a streak exists so it never clutters the surface for new visitors.
 */

import React from 'react';
import { Flame } from 'lucide-react';
import { useJourney } from '../hooks/useJourney';

interface JourneyStreakBadgeProps {
  className?: string;
  onClick?: () => void;
}

export function JourneyStreakBadge({ className = '', onClick }: JourneyStreakBadgeProps) {
  const { listenStreak, isLoggedIn, loading } = useJourney();

  if (!isLoggedIn || loading || listenStreak < 1) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${listenStreak}-day listening streak`}
      className={`inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 ${className}`}
    >
      <Flame className="w-4 h-4 fill-current" />
      <span>{listenStreak}</span>
    </button>
  );
}

export default JourneyStreakBadge;

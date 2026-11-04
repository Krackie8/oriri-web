import React from 'react';
import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  count: number;
}

/** Small pill showing how many consecutive weeks the user has planned. */
export function StreakBadge({ count }: StreakBadgeProps) {
  if (!count || count < 1) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#F3E8DD] text-[#8B5E3C] border border-[#D8C3A5]"
      title={`${count} consecutive week${count > 1 ? 's' : ''} of planning`}
    >
      <Flame className="w-3 h-3" />
      {count} week{count > 1 ? 's' : ''} nourished
    </span>
  );
}

export default StreakBadge;

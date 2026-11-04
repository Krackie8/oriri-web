import React from 'react';
import { Check } from 'lucide-react';
import { GoalKey, GoalMeta } from '../../data/nourishPlans';

interface GoalCardProps {
  goalKey: GoalKey;
  meta: GoalMeta;
  selected: boolean;
  onSelect: (key: GoalKey) => void;
  index?: number;
}

export function GoalCard({ goalKey, meta, selected, onSelect, index = 0 }: GoalCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(goalKey)}
      aria-pressed={selected}
      className={`group relative flex aspect-[4/5] w-[70vw] max-w-[250px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[22px] p-5 text-left transition-all duration-300 sm:w-[230px] ${
        selected
          ? 'ring-2 ring-[#2B1D16] ring-offset-2 ring-offset-[#F7F1EA] shadow-[0_18px_40px_-16px_rgba(43,29,22,0.6)]'
          : 'hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(43,29,22,0.5)]'
      }`}
      style={{ background: `linear-gradient(155deg, ${meta.color} 0%, #2B1D16 125%)` }}
    >
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full border border-[#E9D3B4]/20" />
      <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border border-[#E9D3B4]/20" />

      <div className="relative flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#E9D3B4]/80">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
            selected ? 'border-[#E9D3B4] bg-[#E9D3B4] text-[#2B1D16]' : 'border-[#E9D3B4]/50 text-transparent'
          }`}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      </div>

      <div className="relative">
        <div
          className="mb-2 text-[26px] font-light leading-[1.05] text-[#FBF3E8]"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          {meta.label}
        </div>
        <div className="text-[12px] font-light leading-relaxed text-[#EADBC8]/85">{meta.desc}</div>
      </div>
    </button>
  );
}

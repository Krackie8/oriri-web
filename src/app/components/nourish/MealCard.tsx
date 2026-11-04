import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Meal } from '../../data/nourishPlans';

interface MealCardProps {
  meal: Meal;
  defaultOpen?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function MealCard({ meal, defaultOpen = false, isFavorite, onToggleFavorite }: MealCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`bg-[#FFFCF8] border border-[#E6D6C2] rounded-2xl overflow-hidden transition-shadow duration-200 ${
        open ? 'shadow-[0_14px_34px_-20px_rgba(74,46,31,0.45)]' : 'hover:shadow-sm'
      }`}
    >
      {/* Header row — the heart sits outside the expand button so we don't nest buttons */}
      <div className="flex items-center px-5 py-4">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex-1 flex items-center gap-3 text-left bg-transparent border-none p-0 cursor-pointer select-none"
        >
          <span aria-hidden className="h-8 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#C9A27E] to-[#8B5E3C]" />
          <div>
            <div
              className="text-[18px] font-normal text-[#2B1D16]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {meal.name}
            </div>
            <div className="text-[10.5px] text-[#8C7565] font-medium uppercase tracking-[0.14em] mt-0.5">
              {meal.type} · {meal.time}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              aria-label={isFavorite ? `Remove ${meal.name} from saved meals` : `Save ${meal.name}`}
              aria-pressed={!!isFavorite}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 bg-transparent border-none cursor-pointer hover:bg-[#F3E8DD]"
            >
              <Heart
                className={`w-4 h-4 transition-colors duration-200 ${isFavorite ? 'text-[#8B5E3C]' : 'text-[#8C7565]'}`}
                fill={isFavorite ? 'currentColor' : 'none'}
              />
            </button>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse recipe' : 'Expand recipe'}
            className={`w-6 h-6 flex items-center justify-center rounded-full bg-[#F3E8DD] border border-[#D8C3A5] text-[#4A2E1F] text-base cursor-pointer transition-transform duration-250 ${
              open ? 'rotate-45' : ''
            }`}
          >
            +
          </button>
        </div>
      </div>

      {/* Expandable body */}
      <div className={`overflow-hidden transition-all duration-350 ease-in-out ${open ? 'max-h-[600px]' : 'max-h-0'}`}>
        <div className="px-5 pb-5 pt-0 border-t border-[#EFE2D3]">
          <div className="flex flex-wrap gap-1.5 mt-3.5 mb-3.5">
            {meal.ingredients.map((ing, i) => (
              <span key={i} className="text-[11px] bg-[#F7F1EA] text-[#4A2E1F] px-2.5 py-1 rounded-full border border-[#E6D6C2]">
                {ing}
              </span>
            ))}
          </div>

          <ol className="list-none space-y-1.5">
            {meal.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[13px] font-light leading-relaxed text-[#2B1D16]">
                <span
                  className="text-[15px] text-[#8B5E3C] min-w-[16px] pt-px flex-shrink-0"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

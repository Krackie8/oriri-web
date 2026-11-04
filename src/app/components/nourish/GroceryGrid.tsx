import React from 'react';
import { Check } from 'lucide-react';
import {
  GroceryCategories,
  GROCERY_CATEGORY_LABELS,
  GroceryCheckState,
  groceryItemId,
} from '../../data/nourishPlans';

interface GroceryGridProps {
  grocery: GroceryCategories;
  /** When omitted the grid renders read-only (no checkboxes). */
  checklist?: GroceryCheckState;
  onToggle?: (itemId: string) => void;
  progress?: { checked: number; total: number; percent: number };
}

export function GroceryGrid({ grocery, checklist, onToggle, progress }: GroceryGridProps) {
  const interactive = !!onToggle;

  return (
    <>
      {/* Progress */}
      {interactive && progress && progress.total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[#8C7565] font-light">
              {progress.checked} of {progress.total} in your kitchen
            </span>
            {progress.percent === 100 && (
              <span className="text-[11px] font-medium text-[#8B5E3C]">You have everything</span>
            )}
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-[rgba(74,46,31,0.08)] overflow-hidden"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Grocery list progress"
          >
            <div
              className="h-full bg-[#8B5E3C] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {(Object.keys(grocery) as (keyof GroceryCategories)[]).map((cat) => (
          <div key={cat} className="bg-[#FFFCF8] border border-[rgba(74,46,31,0.08)] rounded-2xl p-5">
            <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#8B5E3C] mb-3 pb-2.5 border-b border-[rgba(74,46,31,0.08)]">
              {GROCERY_CATEGORY_LABELS[cat]}
            </div>

            {grocery[cat].map((item, i) => {
              const id = groceryItemId(cat, item.name);
              const checked = !!checklist?.[id];
              const divider =
                i < grocery[cat].length - 1
                  ? 'mb-2.5 pb-2.5 border-b border-[rgba(74,46,31,0.06)]'
                  : '';

              if (!interactive) {
                return (
                  <div key={id} className={divider}>
                    <div className="text-[13px] font-medium text-[#2B1D16] mb-0.5">{item.name}</div>
                    <div className="text-[11px] text-[#8C7565] leading-relaxed font-light">
                      {item.benefit}
                    </div>
                  </div>
                );
              }

              return (
                <div key={id} className={divider}>
                  <button
                    onClick={() => onToggle!(id)}
                    aria-pressed={checked}
                    className="w-full flex items-start gap-3 text-left bg-transparent border-none py-1.5 px-0 cursor-pointer group"
                  >
                    <span
                      className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-md border flex items-center justify-center transition-all duration-200 ${
                        checked
                          ? 'bg-[#8B5E3C] border-[#8B5E3C]'
                          : 'border-[rgba(74,46,31,0.25)] group-hover:border-[#8B5E3C]'
                      }`}
                    >
                      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-[13px] font-medium mb-0.5 transition-all duration-200 ${
                          checked ? 'text-[#8C7565] line-through' : 'text-[#2B1D16]'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="block text-[11px] text-[#8C7565] leading-relaxed font-light">
                        {item.benefit}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

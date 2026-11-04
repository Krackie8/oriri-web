import React from 'react';
import { Heart } from 'lucide-react';
import { MealCard } from './MealCard';
import { GOAL_META, type FavoriteMeal, type GoalKey } from '../../data/nourishPlans';

interface SavedMealsViewProps {
  favorites: FavoriteMeal[];
  favoriteIds: Set<string>;
  onToggleFavorite: (meal: FavoriteMeal['meal'], goal: GoalKey) => void;
  onBack: () => void;
}

const SERIF = "'Cormorant Garamond', Georgia, serif";

/** The user's personal collection of saved meals, built up over time. */
export function SavedMealsView({ favorites, favoriteIds, onToggleFavorite, onBack }: SavedMealsViewProps) {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-10 pb-16 animate-[fadeUp_0.45s_ease_both]">
      <div className="text-center mb-9">
        <div className="text-[10.5px] font-medium tracking-[0.24em] uppercase text-[#8B5E3C] mb-3">Your collection</div>
        <h2 className="text-[clamp(22px,4vw,36px)] font-light leading-[1.15] text-[#2B1D16] mb-2" style={{ fontFamily: SERIF }}>
          Saved meals
        </h2>
        <p className="text-[13px] text-[#8C7565] font-light">
          {favorites.length > 0
            ? `${favorites.length} meal${favorites.length > 1 ? 's' : ''} saved across your goals`
            : 'Meals you save will live here'}
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center bg-[#FFFCF8] border border-[#E6D6C2] rounded-2xl px-6 py-12">
          <div className="w-11 h-11 rounded-full bg-[#F3E8DD] flex items-center justify-center mx-auto mb-4">
            <Heart className="w-4 h-4 text-[#8B5E3C]" />
          </div>
          <div className="text-[19px] text-[#2B1D16] mb-2" style={{ fontFamily: SERIF }}>Nothing saved yet</div>
          <p className="text-[13px] text-[#8C7565] font-light max-w-[300px] mx-auto leading-relaxed mb-6">
            Tap the heart on any meal in your plan to keep it here for later.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-gradient-to-b from-[#5A3A28] to-[#3A2418] text-[#FBF3E8] text-[13px] font-medium px-6 py-3 rounded-full border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
          >
            Back to my plan →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {favorites.map((fav) => (
            <div key={fav.mealId}>
              {fav.goal && GOAL_META[fav.goal] && (
                <div className="text-[10px] font-medium tracking-[0.18em] uppercase text-[#8C7565] mb-1.5 pl-1">
                  {GOAL_META[fav.goal].label}
                </div>
              )}
              <MealCard
                meal={fav.meal}
                isFavorite={favoriteIds.has(fav.mealId)}
                onToggleFavorite={() => onToggleFavorite(fav.meal, fav.goal)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SavedMealsView;

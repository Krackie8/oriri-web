import React, { useState } from 'react';
import {
  COOK_TIME_OPTIONS,
  DIET_LABELS,
  EXCLUSION_OPTIONS,
  type DietPreference,
  type NourishQuiz as NourishQuizAnswers,
} from '../../data/nourishPlans';
import { Minus, Plus } from 'lucide-react';

interface NourishQuizProps {
  initial?: NourishQuizAnswers | null;
  onSubmit: (quiz: NourishQuizAnswers) => void;
  onSkip: () => void;
}

const SERIF = "'Cormorant Garamond', Georgia, serif";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#8C7565] mb-3">
      {children}
    </div>
  );
}

/** Short intake quiz used to tailor the weekly plan. */
export function NourishQuiz({ initial, onSubmit, onSkip }: NourishQuizProps) {
  const [diet, setDiet] = useState<DietPreference>(initial?.diet ?? 'omnivore');
  const [exclusions, setExclusions] = useState<string[]>(initial?.exclusions ?? []);
  const [servings, setServings] = useState(initial?.servings ?? 1);
  const [maxCookMinutes, setMaxCookMinutes] = useState(initial?.maxCookMinutes ?? 20);

  const toggleExclusion = (item: string) =>
    setExclusions((prev) => (prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]));

  return (
    <div className="max-w-[620px] mx-auto px-6 py-10 animate-[fadeUp_0.45s_ease_both]">
      <div className="text-center mb-9">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#8B5E3C] mb-3">
          Personalise your plan
        </div>
        <h2
          className="text-[clamp(24px,4.5vw,38px)] font-light leading-[1.15] text-[#2B1D16] mb-3"
          style={{ fontFamily: SERIF }}
        >
          A few quick questions
        </h2>
        <p className="text-[14px] font-light text-[#8C7565] max-w-[360px] mx-auto leading-relaxed">
          We'll tailor your grocery list and meals. You can change these any time.
        </p>
      </div>

      {/* Diet */}
      <div className="mb-8">
        <SectionLabel>What do you eat?</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          {(Object.keys(DIET_LABELS) as DietPreference[]).map((key) => (
            <button
              key={key}
              onClick={() => setDiet(key)}
              className={`text-left px-4 py-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                diet === key
                  ? 'border-[#8B5E3C] bg-[#F3E8DD] shadow-sm'
                  : 'border-[rgba(74,46,31,0.1)] bg-[#FFFCF8] hover:border-[rgba(74,46,31,0.25)]'
              }`}
            >
              <span className="text-[14px] text-[#2B1D16]">{DIET_LABELS[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Exclusions */}
      <div className="mb-8">
        <SectionLabel>Anything to avoid?</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {EXCLUSION_OPTIONS.map((item) => (
            <button
              key={item}
              onClick={() => toggleExclusion(item)}
              className={`text-[12px] capitalize px-3.5 py-2 rounded-full border transition-all duration-200 cursor-pointer ${
                exclusions.includes(item)
                  ? 'border-[#8B5E3C] bg-[#8B5E3C] text-white'
                  : 'border-[rgba(74,46,31,0.15)] bg-[#FFFCF8] text-[#2B1D16] hover:border-[rgba(74,46,31,0.3)]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#8C7565] mt-2.5 font-light">
          Leave empty if nothing applies.
        </p>
      </div>

      {/* Servings */}
      <div className="mb-8">
        <SectionLabel>Cooking for how many?</SectionLabel>
        <div className="inline-flex items-center gap-4 bg-[#FFFCF8] border border-[rgba(74,46,31,0.1)] rounded-full px-3 py-2">
          <button
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            disabled={servings <= 1}
            aria-label="Decrease servings"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#2B1D16] hover:bg-[#F7F1EA] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-[16px] text-[#2B1D16] min-w-[20px] text-center" style={{ fontFamily: SERIF }}>
            {servings}
          </span>
          <button
            onClick={() => setServings((s) => Math.min(6, s + 1))}
            disabled={servings >= 6}
            aria-label="Increase servings"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#2B1D16] hover:bg-[#F7F1EA] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cook time */}
      <div className="mb-10">
        <SectionLabel>Max cooking time per meal</SectionLabel>
        <div className="inline-flex rounded-full border border-[rgba(74,46,31,0.12)] bg-[#FFFCF8] p-1">
          {COOK_TIME_OPTIONS.map((mins) => (
            <button
              key={mins}
              onClick={() => setMaxCookMinutes(mins)}
              className={`text-[12px] px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                maxCookMinutes === mins ? 'bg-[#4A2E1F] text-white' : 'text-[#8C7565] hover:text-[#2B1D16]'
              }`}
            >
              {mins} min
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onSubmit({ diet, exclusions, servings, maxCookMinutes })}
          className="inline-flex items-center gap-2 bg-[#4A2E1F] text-white text-[13px] font-medium tracking-[0.04em] px-7 py-3.5 rounded-full border-none cursor-pointer transition-all duration-200 hover:bg-[#2B1D16] hover:-translate-y-0.5 hover:shadow-lg"
        >
          Save preferences →
        </button>
        <button
          onClick={onSkip}
          className="text-[12px] text-[#8C7565] hover:text-[#2B1D16] bg-transparent border-none cursor-pointer transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

export default NourishQuiz;

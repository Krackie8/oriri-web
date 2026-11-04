import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNourish } from '../../hooks/useNourish';
import * as nourishApi from '../../utils/nourishApi';
import {
  GOAL_META,
  groceryItemId,
  mealId as toMealId,
  type AdaptedPlan,
  type GoalKey,
  type Meal,
  type NourishQuiz as QuizAnswers,
} from '../../data/nourishPlans';
import { GoalCard } from './GoalCard';
import { GroceryGrid } from './GroceryGrid';
import { MealCard } from './MealCard';
import { NourishQuiz } from './NourishQuiz';
import { SavedMealsView } from './SavedMealsView';
import { GoalEpisodes } from './GoalEpisodes';
import { StreakBadge } from './StreakBadge';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Heart,
  Lock,
  RefreshCw,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

type Screen = 'home' | 'quiz' | 'loading' | 'results' | 'saved';

// Pilot phase: guidance only, no retail partners yet
const READY_MEAL_TIPS = [
  'A palm of protein: chicken, fish, eggs, tofu or lentils',
  'Half the box vegetables or greens',
  'Whole grains like brown rice, quinoa or sweet potato',
  'Short ingredient lists, low added sugar, sauces on the side',
];

const SERIF = "'Cormorant Garamond', Georgia, serif";

const LOADING_STEPS = [
  'Selecting the right ingredients',
  'Matching foods to your goal',
  'Building your simple meals',
];

// Espresso button used for every primary action
const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#5A3A28] to-[#3A2418] text-[#FBF3E8] text-[13px] font-medium tracking-[0.04em] px-7 py-3.5 border-none cursor-pointer shadow-[0_10px_24px_-12px_rgba(43,29,22,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-12px_rgba(43,29,22,0.75)] disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none';
const GHOST_BTN =
  'inline-flex items-center gap-2 bg-transparent text-[#8C7565] text-[12px] font-normal px-5 py-3 rounded-full border border-[#D8C3A5] cursor-pointer transition-all duration-200 hover:text-[#2B1D16] hover:border-[#2B1D16] hover:bg-[#FFFCF8]';
const EYEBROW = 'text-[10.5px] font-medium tracking-[0.24em] uppercase text-[#8B5E3C]';

// ── Daily progress (Day 1 free, email unlocks the days after) ──────────────
const DAILY_KEY = 'oriri:nourish:daily';
interface Daily { startedAt: string; email?: string; premiumInterest?: boolean }
const DAY_MS = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function readDaily(): Daily | null {
  try { return JSON.parse(localStorage.getItem(DAILY_KEY) || 'null'); } catch { return null; }
}
function writeDaily(d: Daily) {
  try { localStorage.setItem(DAILY_KEY, JSON.stringify(d)); } catch { /* storage blocked */ }
}
function useDaily() {
  const [daily, setDaily] = useState<Daily | null>(() => readDaily());
  const update = (patch: Partial<Daily>) => {
    const next = { startedAt: daily?.startedAt ?? new Date().toISOString(), ...daily, ...patch };
    writeDaily(next);
    setDaily(next);
  };
  const ensureStarted = () => { if (!daily?.startedAt) update({}); };
  const dayNumber = daily?.startedAt
    ? Math.max(1, Math.round((startOfDay(new Date()) - startOfDay(new Date(daily.startedAt))) / DAY_MS) + 1)
    : 1;
  return { daily, update, ensureStarted, dayNumber };
}

// ── Match recipes to what's ticked on the grocery list ─────────────────────
const STAPLES = ['salt', 'pepper', 'oil', 'water', 'spice', 'lemon', 'cinnamon', 'cumin', 'turmeric', 'honey'];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
const singular = (w: string) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');

function ingredientMatches(ingredient: string, names: string[]) {
  const ing = norm(ingredient);
  if (STAPLES.some((s) => ing.includes(s))) return true;
  const words = ing.split(' ').map(singular).filter((w) => w.length > 2);
  return names.some((n) => {
    const nm = norm(n);
    if (ing.includes(nm) || nm.includes(ing)) return true;
    const nWords = nm.split(' ').map(singular).filter((w) => w.length > 2);
    return nWords.some((w) => words.includes(w));
  });
}

function matchMeal(meal: Meal, names: string[]) {
  const have: string[] = [];
  const missing: string[] = [];
  meal.ingredients.forEach((i) => (ingredientMatches(i, names) ? have : missing).push(i));
  return { meal, have, missing, score: meal.ingredients.length ? have.length / meal.ingredients.length : 0 };
}

function CookWithWhatYouHave({
  plan,
  checklist,
  unlocked,
  favoriteIds,
  onToggleFavorite,
  goalKey,
}: {
  plan: AdaptedPlan;
  checklist: Record<string, boolean>;
  unlocked: boolean;
  favoriteIds: Set<string>;
  onToggleFavorite: (meal: Meal, goal: GoalKey) => void;
  goalKey: GoalKey;
}) {
  const names = (Object.keys(plan.grocery) as (keyof AdaptedPlan['grocery'])[]).flatMap((cat) =>
    plan.grocery[cat].filter((item) => checklist[groceryItemId(cat, item.name)]).map((item) => item.name),
  );
  const ranked = plan.meals.map((m) => matchMeal(m, names)).sort((a, b) => b.score - a.score);
  const best = ranked[0];

  return (
    <section id="nourish-cook" className="mb-10 scroll-mt-32">
      <div className="px-5 sm:px-0 mb-4">
        <div className={`${EYEBROW} mb-1`}>Day 1 · Your recipe</div>
        <div className="text-[24px] font-light text-[#2B1D16]" style={{ fontFamily: SERIF }}>Your recipe for today</div>
        <div className="text-[12px] text-[#8C7565] font-light">Matched to what's in your kitchen. Go back and tick more items to change it.</div>
      </div>

      {!best ? (
        <div className="mx-5 sm:mx-0 rounded-2xl border border-dashed border-[#D8C3A5] bg-[#FFFCF8] px-5 py-8 text-center text-[13px] font-light text-[#8C7565]">
          Tick what's in your kitchen and we'll match a recipe.
        </div>
      ) : (
        <div className="mx-5 sm:mx-0 rounded-[24px] border border-[#D8C3A5] bg-[#FFFCF8] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#2B1D16] px-3 py-1 text-[11px] font-medium tracking-[0.06em] text-[#E9D3B4]">
              You have {best.have.length} of {best.meal.ingredients.length}
            </span>
            <span className="text-[11px] text-[#8C7565]">Best match right now</span>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {best.have.map((i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[#4A2E1F] px-2.5 py-1 text-[11px] text-[#FBF3E8]">
                <Check className="h-3 w-3" /> {i}
              </span>
            ))}
            {best.missing.map((i) => (
              <span key={i} className="rounded-full border border-[#C9A27E] px-2.5 py-1 text-[11px] text-[#8C7565]">{i}</span>
            ))}
          </div>
          {best.missing.length > 0 && (
            <p className="mb-3 text-[11.5px] font-light text-[#8C7565]">
              Missing a few? Skip them or swap in a similar item you already have. The steps still work.
            </p>
          )}
          <MealCard
            key={best.meal.name}
            meal={best.meal}
            defaultOpen
            isFavorite={favoriteIds.has(toMealId(best.meal.name))}
            onToggleFavorite={() => onToggleFavorite(best.meal, goalKey)}
          />

          {ranked.length > 1 && (
            <div className="mt-5">
              <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.2em] text-[#8B5E3C]">Other matches</div>
              <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {ranked.slice(1).map((r) => (
                  <div key={r.meal.name} className="relative w-[200px] shrink-0 snap-start overflow-hidden rounded-xl border border-[#E6D6C2] bg-white p-3">
                    <div className={unlocked ? '' : 'select-none blur-[4px]'}>
                      <div className="text-[15px] text-[#2B1D16] leading-tight" style={{ fontFamily: SERIF }}>{r.meal.name}</div>
                      <div className="mt-2 h-1 rounded-full bg-[#EFE2D3]">
                        <div className="h-full rounded-full bg-[#8B5E3C]" style={{ width: `${Math.round(r.score * 100)}%` }} />
                      </div>
                      <div className="mt-1 text-[10.5px] text-[#8C7565]">{r.have.length} of {r.meal.ingredients.length} in your kitchen</div>
                    </div>
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-[#4A2E1F]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!unlocked && <p className="mt-2 text-[11px] text-[#8C7565]">Sign up free to see every match.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

// Mobile-only bottom bar for the main action
function MobileBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-[#E6D6C2] bg-[#F7F1EA]/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
      {children}
    </div>
  );
}

// ── Horizontal row, Netflix-style ───────────────────────────────────────────
function ScrollRow({ title, eyebrow, children }: { title?: string; eyebrow?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: 'smooth' });

  return (
    <div className="mb-10">
      {(title || eyebrow) && (
        <div className="mb-4 flex items-end justify-between gap-4 px-5 sm:px-0">
          <div>
            {eyebrow && <div className={`${EYEBROW} mb-1`}>{eyebrow}</div>}
            {title && <div className="text-[24px] font-light text-[#2B1D16]" style={{ fontFamily: SERIF }}>{title}</div>}
          </div>
          <div className="hidden gap-1.5 sm:flex">
            {[-1, 1].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => scroll(d as 1 | -1)}
                aria-label={d < 0 ? 'Scroll left' : 'Scroll right'}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D8C3A5] bg-[#FFFCF8] text-[#4A2E1F] transition-colors hover:bg-[#4A2E1F] hover:text-[#FBF3E8]"
              >
                {d < 0 ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:none] sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}

// ── Premium teaser ──────────────────────────────────────────────────────────
function PremiumRowCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex aspect-[4/5] w-[70vw] max-w-[250px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[22px] border border-[#C9A27E]/50 bg-[#1F1510] p-5 text-left transition-all duration-300 hover:-translate-y-1 sm:w-[230px]"
    >
      <span aria-hidden className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[#C9A27E]/15 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <Crown className="h-4 w-4 text-[#D9B98C]" />
        <span className="rounded-full border border-[#D9B98C]/50 px-2.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.2em] text-[#D9B98C]">Join waitlist</span>
      </div>
      <div className="relative">
        <div className="mb-2 text-[26px] font-light leading-[1.05] text-[#FBF3E8]" style={{ fontFamily: SERIF }}>
          Nourish Premium
        </div>
        <div className="flex items-start gap-1.5 text-[12px] font-light leading-relaxed text-[#D8C3A5]/85">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          Your habits on a dashboard, with smarter recipes for you
        </div>
      </div>
    </button>
  );
}

function PremiumSection({ email, interested, onInterest }: { email?: string; interested?: boolean; onInterest: (email: string) => Promise<boolean> }) {
  const [value, setValue] = useState(email ?? '');
  const askEmail = !email;
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(!!interested);
  const bars = [42, 68, 55, 80, 36, 74, 62];

  const notify = async (addr: string) => {
    setBusy(true);
    const ok = await onInterest(addr);
    setBusy(false);
    if (ok) setDone(true);
  };

  return (
    <section id="nourish-premium" className="mx-5 mb-12 scroll-mt-28 overflow-hidden rounded-[28px] bg-[#1F1510] text-[#FBF3E8] shadow-[0_24px_60px_-28px_rgba(31,21,16,0.8)] sm:mx-0">
      <div className="relative p-6 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#C9A27E]/10 blur-3xl" />
        <div className="relative flex items-center gap-2">
          <Crown className="h-4 w-4 text-[#D9B98C]" />
          <span className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[#D9B98C]">Nourish Premium · Waitlist open</span>
        </div>
        <h3 className="relative mt-3 text-[34px] font-light leading-[1.05]" style={{ fontFamily: SERIF }}>
          A plan that learns <em className="italic text-[#D9B98C]">you</em>
        </h3>
        <p className="relative mt-3 max-w-[460px] text-[13.5px] font-light leading-relaxed text-[#D8C3A5]">
          Nourish reads your patterns: what you cook, skip and save. Your habits come together on a personal dashboard, and smarter swaps recommend better ingredients and recipes for the weeks ahead.
        </p>

        {/* Locked dashboard preview */}
        <div className="relative mt-6 rounded-2xl border border-[#C9A27E]/25 bg-[#2B1D16]/70 p-5">
          <div className="pointer-events-none select-none blur-[3px]">
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[['12', 'meals cooked'], ['4 wk', 'streak'], ['Oats', 'top ingredient']].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-[#3A2418] p-3">
                  <div className="text-[22px] font-light text-[#FBF3E8]" style={{ fontFamily: SERIF }}>{v}</div>
                  <div className="text-[10px] text-[#D8C3A5]">{l}</div>
                </div>
              ))}
            </div>
            <div className="flex h-20 items-end gap-2">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-[#8B5E3C] to-[#D9B98C]" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D9B98C]/60 bg-[#1F1510]/85 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#D9B98C]">
              <Lock className="h-3.5 w-3.5" /> Your habit dashboard
            </span>
          </div>
        </div>

        <div className="relative mt-6">
          {done ? (
            <p className="text-[13px] font-light text-[#D9B98C]">You're on the waitlist. We'll invite you first.</p>
          ) : askEmail && !email ? (
            <form
              onSubmit={(e) => { e.preventDefault(); if (value) void notify(value); }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                type="email"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Your email"
                className="min-w-0 flex-1 rounded-full border border-[#C9A27E]/40 bg-[#2B1D16] px-4 py-3 text-[14px] text-[#FBF3E8] outline-none placeholder:text-[#8C7565] focus:border-[#D9B98C]"
              />
              <button type="submit" disabled={busy} className="rounded-full bg-[#D9B98C] px-6 py-3 text-[13px] font-medium text-[#1F1510] transition-colors hover:bg-[#E9D3B4] disabled:opacity-50">
                {busy ? 'Joining…' : 'Join the waitlist'}
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => email && void notify(email)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D9B98C] px-6 py-3 text-[13px] font-medium text-[#1F1510] transition-colors hover:bg-[#E9D3B4] disabled:opacity-50 sm:w-auto"
            >
              {busy ? 'Joining…' : 'Join the waitlist'} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {askEmail && !email && !done && (
            <p className="mt-2 text-[11px] font-light text-[#8C7565]">By sharing your email you agree to hear from Oriri. Unsubscribe anytime.</p>
          )}
        </div>
      </div>
    </section>
  );
}

const scrollToPremium = () => document.getElementById('nourish-premium')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

// ── Home (goal selection) screen ────────────────────────────────────────────
function NourishHome({
  selected,
  onSelect,
  onGenerate,
  streakCount,
  premium,
}: {
  selected: GoalKey | null;
  onSelect: (k: GoalKey) => void;
  onGenerate: () => void;
  streakCount: number;
  premium: React.ReactNode;
}) {
  const goals = Object.entries(GOAL_META) as [GoalKey, typeof GOAL_META[GoalKey]][];

  return (
    <div className="animate-[fadeUp_0.45s_ease_both]">
      {/* Hero */}
      <div className="max-w-[620px] mx-auto px-6 pt-12 pb-10 text-center">
        <div className={`${EYEBROW} mb-4`}>Your weekly wellness ritual</div>
        <h1
          className="text-[clamp(30px,5.5vw,50px)] font-light leading-[1.08] text-[#2B1D16] mb-4"
          style={{ fontFamily: SERIF }}
        >
          Groceries that <em className="italic text-[#8B5E3C]">work&nbsp;for&nbsp;you</em>,<br />
          not the other way around
        </h1>
        <p className="text-[15px] font-light leading-[1.75] text-[#8C7565] max-w-[400px] mx-auto">
          Choose your goal. Get a smart grocery list and your Day 1 recipe in seconds. No sign-up, no overthinking.
        </p>
        {streakCount > 1 && (
          <div className="mt-5 flex justify-center">
            <StreakBadge count={streakCount} />
          </div>
        )}
      </div>

      <div className="max-w-[760px] mx-auto pb-6 sm:px-6">
        <ScrollRow eyebrow="Step 1" title="What do you want to focus on this week?">
          {goals.map(([key, meta], i) => (
            <GoalCard key={key} goalKey={key} meta={meta} index={i} selected={selected === key} onSelect={onSelect} />
          ))}
          <PremiumRowCard onClick={scrollToPremium} />
        </ScrollRow>

        <div className="text-center mb-14 px-5">
          <button disabled={!selected} onClick={onGenerate} className={PRIMARY_BTN}>
            Generate my Day 1 <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {premium}
      </div>

      <MobileBar>
        <button disabled={!selected} onClick={onGenerate} className={`${PRIMARY_BTN} flex-1 !py-3`}>
          {selected ? 'Generate my Day 1' : 'Choose a goal above'} <ArrowRight className="h-4 w-4" />
        </button>
      </MobileBar>
    </div>
  );
}

// ── Loading screen ───────────────────────────────────────────────────────────
function NourishLoading({ visibleSteps }: { visibleSteps: number }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-10">
      <div className="w-10 h-10 rounded-full border-2 border-[#E6D6C2] border-t-[#8B5E3C] animate-spin mb-6" />
      <div className="text-[26px] font-light text-[#2B1D16] mb-1.5" style={{ fontFamily: SERIF }}>
        Curating your plan…
      </div>
      <div className="text-[13px] text-[#8C7565] font-light mb-5">Personalising for your goal</div>
      <ul className="list-none space-y-1">
        {LOADING_STEPS.map((step, i) => (
          <li
            key={i}
            className={`text-[12px] text-[#8C7565] transition-opacity duration-400 ${i < visibleSteps ? 'opacity-100' : 'opacity-0'}`}
          >
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Locked tomorrow + email unlock (asked only after Day 1) ────────────────
function TomorrowLocked({
  goalKey,
  tomorrow,
  upcoming,
  onUnlocked,
}: {
  goalKey: GoalKey;
  tomorrow?: Meal;
  upcoming: Meal[];
  onUnlocked: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setError('Please tick the box so we can email you.'); return; }
    setSending(true);
    setError('');
    const res = await nourishApi.saveByEmail({
      email,
      consent,
      goal: goalKey,
      goalLabel: GOAL_META[goalKey].label,
      tomorrow: { name: tomorrow?.name ?? '', time: tomorrow?.time ?? '', ingredients: tomorrow?.ingredients ?? [], steps: tomorrow?.steps ?? [] },
    });
    setSending(false);
    if (res.ok) onUnlocked(email);
    else setError(res.error || 'Something went wrong. Please try again.');
  };

  return (
    <section id="nourish-coming" className="mb-10 scroll-mt-32">
      <div className="px-5 sm:px-0 mb-3">
        <div className={`${EYEBROW} mb-1`}>Coming up this week</div>
        <div className="text-[24px] font-light text-[#2B1D16]" style={{ fontFamily: SERIF }}>Your next recipes are waiting</div>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
        {upcoming.map((m, i) => (
          <div
            key={`${m.name}-${i}`}
            className="relative flex aspect-[4/5] w-[62vw] max-w-[200px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[20px] bg-gradient-to-br from-[#6F4A32] to-[#2B1D16] p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#E9D3B4]">Day {i + 2}</span>
              <Lock className="h-3.5 w-3.5 text-[#E9D3B4]" />
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[#D8C3A5]">{m.type}</div>
              <div className="select-none text-[20px] font-light leading-tight text-[#FBF3E8] blur-[5px]" style={{ fontFamily: SERIF }}>{m.name}</div>
              <div className="mt-2 text-[10.5px] font-light text-[#D8C3A5]">Unlocks daily with your free account</div>
            </div>
          </div>
        ))}
      </div>

    <div className="mx-5 mt-2 overflow-hidden rounded-[24px] border border-[#D8C3A5] bg-[#FFFCF8] sm:mx-0">
      <form onSubmit={handleSubmit} className="px-5 py-6 sm:px-6">
        <div className="text-[24px] font-light leading-tight text-[#2B1D16] mb-1" style={{ fontFamily: SERIF }}>Get a new recipe every day</div>
        <p className="text-[12.5px] text-[#8C7565] font-light mb-4">
          Sign up free to keep using Nourish. We'll email tomorrow's {tomorrow ? `recipe, ${tomorrow.type.toLowerCase()},` : 'recipe'} and unlock a new one here every day.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="flex-1 min-w-0 rounded-full border border-[#D8C3A5] bg-white px-4 py-3.5 text-[16px] sm:text-[14px] text-[#2B1D16] outline-none focus:border-[#8B5E3C]"
          />
          <button type="submit" disabled={sending || !email || !consent} className={`${PRIMARY_BTN} !px-6 !py-3`}>
            {sending ? 'Saving…' : 'Unlock daily recipes'}
          </button>
        </div>
        <label className="mt-3 flex items-start gap-2.5 text-[12px] text-[#2B1D16] font-light cursor-pointer">
          <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#4A2E1F]" />
          <span>Yes, email me my plan, recipes and updates from Oriri. I can unsubscribe anytime.</span>
        </label>
        {error && <p className="mt-2 text-[12px] text-[#A3412E]">{error}</p>}
      </form>
    </div>
    </section>
  );
}

// ── Results screen ───────────────────────────────────────────────────────────
function NourishResults({
  goalKey,
  plan,
  checklist,
  progress,
  onToggleItem,
  favoriteIds,
  onToggleFavorite,
  streakCount,
  newWeekAvailable,
  onRefreshWeek,
  onPersonalize,
  hasQuiz,
  accessToken,
  onChangeGoal,
  unlocked,
  dayNumber,
  onUnlocked,
  premium,
}: {
  goalKey: GoalKey;
  plan: AdaptedPlan;
  checklist: Record<string, boolean>;
  progress: { checked: number; total: number; percent: number };
  onToggleItem: (id: string) => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (meal: Meal, goal: GoalKey) => void;
  streakCount: number;
  newWeekAvailable: boolean;
  onRefreshWeek: () => void;
  onPersonalize: () => void;
  hasQuiz: boolean;
  accessToken?: string;
  onChangeGoal: () => void;
  unlocked: boolean;
  dayNumber: number;
  onUnlocked: (email: string) => void;
  premium: React.ReactNode;
}) {
  const meta = GOAL_META[goalKey];
  const [shareNote, setShareNote] = useState('');
  const [step, setStep] = useState<'list' | 'recipe'>('list');
  const [showBuy, setShowBuy] = useState(false);
  const [listNote, setListNote] = useState('');

  // Guests stay on Day 1 until they unlock; then the recipe rotates daily
  const day = unlocked ? dayNumber : 1;
  const count = Math.max(1, plan.meals.length);
  const today = plan.meals[(day - 1) % count];
  const tomorrow = plan.meals[day % count];
  const restOfWeek = plan.meals.filter((m) => m !== today);
  const upcoming = [1, 2, 3, 4].map((o) => plan.meals[(day - 1 + o) % count]).filter(Boolean);

  const cats = Object.keys(plan.grocery) as (keyof AdaptedPlan['grocery'])[];
  const toBuy = cats.flatMap((cat) => plan.grocery[cat].filter((i) => !checklist[groceryItemId(cat, i.name)]).map((i) => i.name));

  const goTo = (next: 'list' | 'recipe') => { setStep(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const share = async (data: ShareData, fallback: string, note: (s: string) => void) => {
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(fallback);
      note('Copied');
    } catch { note(''); }
    setTimeout(() => note(''), 2500);
  };

  const handleShare = () => {
    const text = `My ${meta.label} plan with Nourish by Oriri: ${today?.name}. Make yours free:`;
    void share({ title: 'Nourish by Oriri', text, url: 'https://oriri.me/nourish' }, `${text} https://oriri.me/nourish`, setShareNote);
  };

  const shoppingText = `My Nourish grocery list (${meta.label})\n\n${toBuy.map((n) => `- ${n}`).join('\n')}\n\nhttps://oriri.me/nourish`;
  const handleShareList = () => void share({ title: 'My grocery list', text: shoppingText }, shoppingText, setListNote);

  const readyMade = (
    <div className="mx-5 sm:mx-0 mb-10 rounded-2xl border border-[#D8C3A5] bg-[#FFFCF8] p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3E8DD] text-[#8B5E3C]">
          <ShoppingBag className="h-4 w-4" />
        </span>
        <div>
          <div className="text-[18px] leading-tight text-[#2B1D16]" style={{ fontFamily: SERIF }}>Short on time?</div>
          <div className="text-[12px] font-light text-[#8C7565]">What to look for in ready-made meals for {meta.label.toLowerCase()}</div>
        </div>
      </div>
      <ul className="space-y-1.5 text-[12.5px] font-light leading-relaxed text-[#4A2E1F]">
        {READY_MEAL_TIPS.map((t) => (
          <li key={t} className="flex gap-2"><Check className="mt-1 h-3 w-3 shrink-0 text-[#8B5E3C]" />{t}</li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-[#8C7565]">Try your usual delivery app or a local meal-prep service. Recommended partners are coming soon.</p>
    </div>
  );

  // ── Step 1: groceries, tick what you have ──
  if (step === 'list') {
    return (
      <div className="max-w-[760px] mx-auto sm:px-6 py-10 pb-16 animate-[fadeUp_0.45s_ease_both]">
        <div className="text-center mb-8 px-5">
          <span className="inline-block text-[10.5px] font-medium tracking-[0.22em] uppercase px-3.5 py-1 rounded-full mb-3 text-[#FBF3E8]" style={{ background: meta.color }}>
            {meta.label} · This week
          </span>
          <h2 className="text-[clamp(26px,4.5vw,40px)] font-light leading-[1.1] text-[#2B1D16] mb-2" style={{ fontFamily: SERIF }}>
            Your groceries for the week
          </h2>
          <p className="text-[13.5px] text-[#8C7565] font-light max-w-[420px] mx-auto">
            Tick what you already have at home. We'll build today's recipe around it.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {streakCount > 0 && <StreakBadge count={streakCount} />}
            {plan.adapted && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#F3E8DD] text-[#4A2E1F]">
                <Sparkles className="w-3 h-3" /> Adapted for you
              </span>
            )}
          </div>
        </div>

        {newWeekAvailable && (
          <div className="mx-5 sm:mx-0 mb-8 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F3E8DD] border border-[#D8C3A5] rounded-2xl px-5 py-4">
            <div className="text-center sm:text-left">
              <div className="text-[17px] text-[#2B1D16] mb-0.5" style={{ fontFamily: SERIF }}>A new week has started</div>
              <div className="text-[11px] text-[#8C7565] font-light">Refresh to get a fresh list and keep your streak going.</div>
            </div>
            <button onClick={onRefreshWeek} className={`${PRIMARY_BTN} !px-5 !py-2.5 !text-[12px] flex-shrink-0`}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh this week
            </button>
          </div>
        )}

        <div className="px-5 sm:px-0">
          <GroceryGrid grocery={plan.grocery} checklist={checklist} onToggle={onToggleItem} progress={progress} />
        </div>

        {/* What next */}
        <div className="mx-5 sm:mx-0 mb-6 rounded-[24px] bg-[#1F1510] p-5 sm:p-6 text-[#FBF3E8]">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[#D9B98C] mb-1">Next step</div>
          <div className="text-[26px] font-light leading-tight mb-1" style={{ fontFamily: SERIF }}>
            {progress.checked > 0 ? `You have ${progress.checked} of ${progress.total}. Ready to cook?` : 'Ready to cook?'}
          </div>
          <p className="text-[12.5px] font-light text-[#D8C3A5] mb-5">Get a recipe that fits your kitchen right now, or take the list shopping.</p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button type="button" onClick={() => goTo('recipe')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#D9B98C] px-6 py-3.5 text-[13px] font-medium text-[#1F1510] transition-colors hover:bg-[#E9D3B4]">
              <Sparkles className="h-4 w-4" /> Generate my recipe now
            </button>
            <button type="button" onClick={() => setShowBuy((v) => !v)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#D9B98C]/60 px-6 py-3.5 text-[13px] font-medium text-[#E9D3B4] transition-colors hover:bg-[#2B1D16]">
              <ShoppingBag className="h-4 w-4" /> Buy my groceries
            </button>
          </div>

          {showBuy && (
            <div className="mt-5 rounded-2xl bg-[#2B1D16] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium">Your shopping list · {toBuy.length} items</span>
                <button type="button" onClick={handleShareList} className="inline-flex items-center gap-1.5 text-[12px] text-[#D9B98C]">
                  <Share2 className="h-3.5 w-3.5" /> {listNote || 'Share / copy'}
                </button>
              </div>
              {toBuy.length === 0 ? (
                <p className="text-[12px] font-light text-[#D8C3A5]">You have everything. Time to cook!</p>
              ) : (
                <ul className="columns-2 gap-4 text-[12.5px] font-light text-[#EADBC8]">
                  {toBuy.map((n) => <li key={n} className="mb-1 break-inside-avoid">· {n}</li>)}
                </ul>
              )}
              <p className="mt-3 border-t border-[#C9A27E]/20 pt-3 text-[11px] text-[#8C7565]">One-tap ordering from partner stores is coming soon.</p>
            </div>
          )}
        </div>

        {readyMade}

        <div className="flex flex-wrap justify-center gap-2.5 px-5">
          <button onClick={onPersonalize} className={GHOST_BTN}>
            <SlidersHorizontal className="w-3.5 h-3.5" /> {hasQuiz ? 'Edit preferences' : 'Personalise plan'}
          </button>
          <button onClick={onChangeGoal} className={GHOST_BTN}>← Change goal</button>
        </div>

        <MobileBar>
          <button type="button" onClick={() => setShowBuy(true)} aria-label="Buy my groceries" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#D8C3A5] bg-[#FFFCF8] text-[#4A2E1F]">
            <ShoppingBag className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => goTo('recipe')} className={`${PRIMARY_BTN} flex-1 !py-3`}>
            Generate my recipe <ArrowRight className="h-4 w-4" />
          </button>
        </MobileBar>
      </div>
    );
  }

  // ── Step 2: today's recipe, built from what they have ──
  return (
    <div className="max-w-[760px] mx-auto sm:px-6 py-8 pb-16 animate-[fadeUp_0.45s_ease_both]">
      <div className="mb-6 flex items-center justify-between gap-3 px-5 sm:px-0">
        <button type="button" onClick={() => goTo('list')} className="text-[12px] text-[#8C7565] hover:text-[#2B1D16]">← My groceries</button>
        <button type="button" onClick={handleShare} className={`${GHOST_BTN} !py-2`}>
          <Share2 className="h-3.5 w-3.5" /> {shareNote || 'Share'}
        </button>
      </div>

      <CookWithWhatYouHave
        plan={plan}
        checklist={checklist}
        unlocked={unlocked}
        favoriteIds={favoriteIds}
        onToggleFavorite={onToggleFavorite}
        goalKey={goalKey}
      />

      {unlocked ? (
        tomorrow && (
          <div id="nourish-tomorrow" className="mx-5 sm:mx-0 mb-10 scroll-mt-32">
            <div className={`${EYEBROW} mb-1`}>Day {day + 1} · Tomorrow</div>
            <div className="mb-3 text-[20px] font-light text-[#2B1D16]" style={{ fontFamily: SERIF }}>Coming up next</div>
            <MealCard meal={tomorrow} isFavorite={favoriteIds.has(toMealId(tomorrow.name))} onToggleFavorite={() => onToggleFavorite(tomorrow, goalKey)} />
          </div>
        )
      ) : (
        <TomorrowLocked goalKey={goalKey} tomorrow={tomorrow} upcoming={upcoming} onUnlocked={onUnlocked} />
      )}

      {unlocked && restOfWeek.length > 0 && (
        <ScrollRow eyebrow="This week" title="More meals from your plan">
          {restOfWeek.map((meal) => (
            <div key={meal.name} className="w-[280px] shrink-0 snap-start sm:w-[300px]">
              <MealCard meal={meal} isFavorite={favoriteIds.has(toMealId(meal.name))} onToggleFavorite={() => onToggleFavorite(meal, goalKey)} />
            </div>
          ))}
        </ScrollRow>
      )}

      {readyMade}

      <div className="px-5 sm:px-0">
        <GoalEpisodes goal={goalKey} accessToken={accessToken} />
      </div>

      {premium}

      <MobileBar>
        <button type="button" onClick={handleShare} aria-label="Share" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#D8C3A5] bg-[#FFFCF8] text-[#4A2E1F]">
          <Share2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => (unlocked ? goTo('list') : jumpTo('nourish-coming'))} className={`${PRIMARY_BTN} flex-1 !py-3`}>
          {unlocked ? 'Back to my groceries' : 'Get daily recipes free'}
        </button>
      </MobileBar>
    </div>
  );
}

// ── Main NourishScreen ───────────────────────────────────────────────────────
export default function NourishScreen() {
  const { isLoggedIn, session, user } = useAuth() as ReturnType<typeof useAuth> & { user?: { email?: string } };
  const navigate = useNavigate();
  const { daily, update: updateDaily, ensureStarted, dayNumber } = useDaily();

  const {
    state,
    plan,
    loading,
    favorites,
    favoriteIds,
    newWeekAvailable,
    groceryProgress,
    setGoalAndGenerate,
    saveQuiz,
    toggleGroceryItem,
    regenerateWeek,
    toggleFavorite,
    changeGoal,
  } = useNourish();

  const [screen, setScreen] = useState<Screen>('home');
  const [selectedGoal, setSelectedGoal] = useState<GoalKey | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const unlocked = isLoggedIn || !!daily?.email;
  const knownEmail = daily?.email || user?.email;

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  // A returning user with a saved plan lands straight on their results.
  useEffect(() => {
    if (loading) return;
    if (state?.goal && screen === 'home') {
      setSelectedGoal(state.goal);
      setScreen('results');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, state?.goal]);

  const handleGenerate = () => {
    if (!selectedGoal) return;
    const goal = selectedGoal;

    clearTimers();
    ensureStarted();
    setVisibleSteps(0);
    setScreen('loading');
    window.scrollTo(0, 0);

    LOADING_STEPS.forEach((_, i) => {
      timersRef.current.push(setTimeout(() => setVisibleSteps(i + 1), 600 + i * 750));
    });

    // Persist as soon as the goal is chosen; the animation is purely cosmetic.
    void setGoalAndGenerate(goal);

    timersRef.current.push(
      setTimeout(() => {
        setScreen('results');
        window.scrollTo(0, 0);
      }, 2500),
    );
  };

  const handleChangeGoal = () => {
    clearTimers();
    changeGoal();
    setSelectedGoal(null);
    setScreen('home');
    window.scrollTo(0, 0);
  };

  const handleQuizSubmit = (quiz: QuizAnswers) => {
    void saveQuiz(quiz);
    setScreen('results');
    window.scrollTo(0, 0);
  };

  const backToPlan = () => {
    setScreen(state?.goal ? 'results' : 'home');
    window.scrollTo(0, 0);
  };

  const handlePremiumInterest = async (email: string) => {
    const goal = state?.goal ?? selectedGoal ?? 'gut_health';
    const res = await nourishApi.notifyPremium({ email, goal, goalLabel: GOAL_META[goal].label });
    if (res.ok) updateDaily({ premiumInterest: true });
    return res.ok;
  };

  const premium = (
    <PremiumSection email={knownEmail} interested={daily?.premiumInterest} onInterest={handlePremiumInterest} />
  );

  return (
    <div className="min-h-screen bg-[#F7F1EA] pb-24 sm:pb-0">
      {/* Top nav bar */}
      <div className="sticky top-[60px] z-10 bg-[#F7F1EA]/90 backdrop-blur-sm border-b border-[#E6D6C2] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            aria-label="Back to home"
            className="p-2 rounded-full hover:bg-[#EFE2D3] transition-colors text-[#8C7565]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span>
            <span style={{ fontFamily: SERIF }} className="font-normal text-[#2B1D16] text-[18px] tracking-[0.04em]">nourish</span>
            <span className="text-[#8B5E3C]">.</span>
            <span className="ml-2 text-[10px] text-[#8C7565] tracking-[0.18em] uppercase">by oriri</span>
          </span>
        </div>

        {screen === 'saved' ? (
          <button
            onClick={backToPlan}
            className="text-[12px] text-[#8C7565] hover:text-[#2B1D16] transition-colors bg-transparent border-none cursor-pointer"
          >
            ← Back to plan
          </button>
        ) : (
          <button
            onClick={() => { setScreen('saved'); window.scrollTo(0, 0); }}
            aria-label="Saved meals"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#8C7565] hover:text-[#2B1D16] transition-colors px-2.5 py-1.5 rounded-full hover:bg-[#EFE2D3] bg-transparent border-none cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5" />
            {favorites.length > 0 && <span>{favorites.length}</span>}
          </button>
        )}
      </div>

      {/* Initial state load */}
      {loading && screen !== 'loading' && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#E6D6C2] border-t-[#8B5E3C] animate-spin" />
          <p className="text-[12px] text-[#8C7565] font-light">Loading your plan…</p>
        </div>
      )}

      {/* Screen content */}
      {!loading && screen === 'home' && (
        <NourishHome
          selected={selectedGoal}
          onSelect={setSelectedGoal}
          onGenerate={handleGenerate}
          streakCount={state?.streakCount ?? 0}
          premium={premium}
        />
      )}

      {!loading && screen === 'quiz' && (
        <NourishQuiz initial={state?.quiz ?? null} onSubmit={handleQuizSubmit} onSkip={backToPlan} />
      )}

      {screen === 'loading' && <NourishLoading visibleSteps={visibleSteps} />}

      {!loading && screen === 'results' && state?.goal && plan && (
        <NourishResults
          goalKey={state.goal}
          plan={plan}
          checklist={state.checklist ?? {}}
          progress={groceryProgress}
          onToggleItem={toggleGroceryItem}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          streakCount={state.streakCount ?? 0}
          newWeekAvailable={newWeekAvailable}
          onRefreshWeek={() => regenerateWeek()}
          onPersonalize={() => { setScreen('quiz'); window.scrollTo(0, 0); }}
          hasQuiz={!!state.quiz}
          accessToken={session?.access_token}
          onChangeGoal={handleChangeGoal}
          unlocked={unlocked}
          dayNumber={dayNumber}
          onUnlocked={(email) => updateDaily({ email })}
          premium={premium}
        />
      )}

      {!loading && screen === 'saved' && (
        <SavedMealsView favorites={favorites} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} onBack={backToPlan} />
      )}

      <footer className="text-center px-5 py-5 text-[11px] text-[#8C7565] border-t border-[#E6D6C2] font-light leading-relaxed">
        Made with care by <a href="https://oriri.me" className="text-[#8B5E3C] no-underline hover:underline">Oriri</a>
        &nbsp;·&nbsp; Not medical advice &nbsp;·&nbsp; Always consult a healthcare professional
      </footer>
    </div>
  );
}

/** 3 · Input: energy + goals, time, budget + area */
import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Chip, PillButton, Screen, StepHeader, cx } from './kit';
import { ENERGIES, GOALS, TIME_CHIPS, type Goal, type PlanInputs } from './engine';
import { DEFAULT_INPUTS, loadInputs, saveInputs } from './state';
import { LOCALE, money } from './config';
import { ctaClick, track } from '../analytics/track';
import { withUtm } from '../analytics/utm';
import { functionClient } from '../functionClient';
import { supabase } from '../../utils/supabase/client';
import { toServerCheckIn } from './serverPlan';
import { checkInGate, seen, wantsAgain } from './returning';
import { useViewer } from './viewer';

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-9">
      <legend className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-wb-gold text-[14px] text-wb-plum">{n}</span>
        <span className="font-wb-serif text-[22px] text-wb-ink">{title}</span>
      </legend>
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

const fieldCls =
  'h-14 w-full rounded-[16px] border border-wb-sand bg-wb-shell px-4 text-[16px] text-wb-ink outline-none transition-colors placeholder:text-wb-taupe/70 focus:border-wb-plum';

export default function InputScreen() {
  const navigate = useNavigate();
  // A Member who already has a plan today goes back to it: checking in again would replace what she
  // hasn't done yet and restart its timers. She checks in again only from her day ("Check in again").
  const again = wantsAgain(useLocation().search);
  const gate = checkInGate(seen(useViewer(again)), again);
  const [v, setV] = useState<PlanInputs>(() => loadInputs() || DEFAULT_INPUTS);
  const [customMin, setCustomMin] = useState(() => (TIME_CHIPS.some((c) => c.minutes === v.minutes) ? '' : String(v.minutes)));
  const set = (patch: Partial<PlanInputs>) => setV((s) => ({ ...s, ...patch }));
  const toggleGoal = (g: Goal) => set({ goals: v.goals.includes(g) ? v.goals.filter((x) => x !== g) : [...v.goals, g] });

  const [missing, setMissing] = useState<{ goals?: boolean; area?: boolean }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    // Everything is needed to curate a day that makes sense
    const miss = { goals: !v.goals.length, area: !v.area };
    if (miss.goals || miss.area) {
      setMissing(miss);
      document.getElementById(miss.goals ? 'need-goals' : 'need-area')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    saveInputs(v);
    ctaClick('Curate my day', 'input');
    track('plan_inputs_done', { energy: v.energy, goals: v.goals.join(','), minutes: v.minutes, budget: v.budget, area: v.area || 'unset' });
    // A Member checks in with Bestie on the server, which records it (ADR-0003). A visitor's plan
    // is built in her browser, so a signed-out or not-yet-joined answer just carries on.
    setError('');
    const session = await supabase.auth.getSession().then(({ data }) => data.session).catch(() => null);
    if (session) {
      setBusy(true);
      const r = await functionClient.bestie.checkIn(toServerCheckIn(v));
      setBusy(false);
      if (!r.ok) return setError('Bestie could not plan your day right now. Please try again.');
      if (r.data.outcome === 'invalid') return setError(r.data.message);
    }
    navigate(withUtm('/plan/day'));
  };

  if (gate === 'day') return <Navigate to={withUtm('/plan/day')} replace />;
  if (gate === 'wait') return <Screen className="pb-20 pt-24 text-center text-[16px] text-wb-soft">Loading your day…</Screen>;

  return (
    <form onSubmit={submit}>
      <Screen className="pb-36">
        <StepHeader back={again ? '/plan/day' : '/'} step={1} total={2} title="How's today looking?" sub="Fill in all three so Bestie can curate your day." />
        {again && (
          <p className="mt-4 rounded-[12px] bg-wb-gold-soft/60 px-4 py-3 text-[14px] leading-snug text-wb-soft" role="note">
            A new Check-in replaces what you haven't done yet. Anything you've ticked stays.
          </p>
        )}

        <Section n={1} title="Energy now">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Energy now">
            {ENERGIES.map((e) => (
              <Chip key={e} role="radio" selected={v.energy === e} onClick={() => set({ energy: e })}>
                {e}
              </Chip>
            ))}
          </div>
          <p id="need-goals" className={cx('mt-5 text-[14px]', missing.goals && !v.goals.length ? 'text-[#9A3F45]' : 'text-wb-taupe')}>
            I want to… {missing.goals && !v.goals.length ? '(pick at least one)' : '(pick any)'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Goals">
            {GOALS.map((g) => (
              <Chip key={g} selected={v.goals.includes(g)} onClick={() => toggleGoal(g)}>
                {g}
              </Chip>
            ))}
          </div>
        </Section>

        <Section n={2} title="Time">
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Time">
            {TIME_CHIPS.map((c) => (
              <Chip
                key={c.label}
                role="radio"
                className="px-1 text-[14px]"
                selected={!customMin && v.minutes === c.minutes}
                onClick={() => {
                  setCustomMin('');
                  set({ minutes: c.minutes });
                }}
              >
                {c.label}
              </Chip>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="text-[14px] text-wb-taupe">Or exact minutes</span>
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={720}
              placeholder="e.g. 45"
              value={customMin}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomMin(raw);
                const n = Number(raw);
                if (n >= 10) set({ minutes: Math.min(720, n) });
              }}
              className={cx(fieldCls, 'mt-2')}
            />
          </label>
        </Section>

        <Section n={3} title="Budget & area">
          <label className="block">
            <span className="text-[14px] text-wb-taupe">Budget for today</span>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-wb-taupe">{LOCALE.currency}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={String(v.budget)}
                onChange={(e) => set({ budget: Math.max(0, Number(e.target.value.replace(/\D/g, '').slice(0, 5)) || 0) })}
                className={cx(fieldCls, 'pl-16')}
                aria-label={`Budget in ${LOCALE.currency}`}
              />
            </div>
          </label>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Quick budget">
            {LOCALE.budgetChips.map((b) => (
              <Chip key={b} role="radio" selected={v.budget === b} onClick={() => set({ budget: b })}>
                {money(b)}
              </Chip>
            ))}
          </div>

          <label className="mt-6 block">
            <span id="need-area" className={cx('text-[14px]', missing.area && !v.area ? 'text-[#9A3F45]' : 'text-wb-taupe')}>
              {missing.area && !v.area ? 'Area (please choose one)' : 'Area'}
            </span>
            <div className="relative mt-2">
              <select value={v.area} onChange={(e) => set({ area: e.target.value })} className={cx(fieldCls, 'appearance-none pr-12')}>
                <option value="">Choose your area</option>
                {LOCALE.areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-wb-taupe" strokeWidth={1.5} />
            </div>
          </label>
        </Section>
      </Screen>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-wb-paper via-wb-paper/95 to-transparent pb-[max(env(safe-area-inset-bottom),16px)] pt-8">
        <Screen>
          {error && (
            <p className="mb-3 text-center text-[14px] text-wb-plum" role="alert">
              {error}
            </p>
          )}
          <PillButton type="submit" className="w-full" arrow disabled={busy}>
            {busy ? 'Bestie is planning…' : 'Curate my day'}
          </PillButton>
        </Screen>
      </div>
    </form>
  );
}

/**
 * A Member's Day plan comes from Bestie on the server (#70, ADR-0003). These turn her answers into
 * a Check-in, and the server plan into the rows the Day screen already draws. Places and links
 * come from the engine's option with the same slug; an item without one shows its title only.
 */
import { money, presentOption, type Plan, type PlanInputs, type PlanItem, type PlanPillar } from './engine';
import type { CheckInInput, ServerDayPlan } from '../functionClient';

const PILLAR: Record<string, { key: PlanPillar; name: string }> = {
  move: { key: 'move', name: 'Move' },
  meal: { key: 'meal', name: 'Meal' },
  mindset: { key: 'mindset', name: 'Mindset' },
  meet_up: { key: 'meetup', name: 'Meet up' },
};

export function toServerCheckIn(i: PlanInputs): CheckInInput {
  const goal = i.goals.includes('Connect') ? 'Connect' : i.goals[0];
  return {
    energy: i.energy.toLowerCase() as CheckInInput['energy'],
    minutes: i.minutes,
    budgetAed: i.budget,
    goal: goal ? (goal.toLowerCase() as CheckInInput['goal']) : null,
    ...(i.area ? { area: i.area } : {}),
  };
}

export function fromServerPlan(p: ServerDayPlan): Plan {
  const items: PlanItem[] = p.suggestions.map((s) => {
    const shown = presentOption(s.slug, p.checkIn.area);
    const label = s.pillars.map((x) => PILLAR[x].name).join(' + ') + (s.light ? ' · light' : '');
    return {
      id: s.id,
      pillar: PILLAR[s.pillars[0]].key,
      label,
      title: s.title,
      venue: shown?.venue ?? '',
      reason: s.why,
      cost: s.costAed,
      priceLabel: shown?.priceLabel ?? money(s.costAed),
      minutes: s.minutes,
      links: shown?.links ?? [],
      steps: shown?.steps,
    };
  });
  const total = items.reduce((t, x) => t + x.cost, 0);
  return { items, total, totalLabel: money(total), minutes: items.reduce((t, x) => t + x.minutes, 0) };
}

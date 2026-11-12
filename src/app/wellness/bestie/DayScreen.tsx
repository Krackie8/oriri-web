/** 4 · Free trial day: email first (one free day per email), then the whole day shows here. */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowUpRight, CalendarHeart, Check, Clock, Coffee, Flame, Footprints, Lock, MapPin, Shuffle, Sparkles, Sun } from 'lucide-react';
import { BestieSwipe, Noticed, greeting, week } from './MembershipScreen';
import { saveToday, setDone as saveDone, stats as trackerStats } from './tracker';
import { Card, GoldRule, PillButton, PillLink, PillarIcon, Screen, StepHeader, WaitlistLink, cx } from './kit';
import { buildPlan, describeTime, money, swapItem, type Plan, type PlanItem, type PlanLink } from './engine';
import * as wellnessApi from '../../utils/wellnessApi';
import type { StepsistersMoment } from '../../utils/wellnessApi';
import { getUnlocked, loadInputs, markEmailUsed, normEmail, setUnlocked } from './state';
import { submitFreeDay } from '../api';
import { NO_MAIL_ERROR, checkEmail, domainAcceptsMail } from '../../utils/emailCheck';
import { ctaClick, formSubmit, track } from '../analytics/track';
import { getUtm, withUtm } from '../analytics/utm';
import { useAdmin } from '../../hooks/useAdmin';

export default function DayScreen() {
  const inputs = useMemo(() => loadInputs(), []);
  // The plan, plus any swaps the visitor made this session
  const [plan, setPlan] = useState<Plan | null>(() => (inputs ? loadSwapped(inputs) || buildPlan(inputs) : null));
  const [swapNote, setSwapNote] = useState<{ id: string; text: string } | null>(null);
  const swap = (id: string) => {
    if (!inputs || !plan) return;
    const skipped = loadSkipped();
    const next = swapItem(inputs, plan, id, skipped);
    if (!next) {
      setSwapNote({ id, text: 'That’s the only pick that fits your time and budget right now.' });
      return;
    }
    saveSkipped([...skipped, id]);
    saveSwapped(inputs, next);
    setPlan(next);
    const added = next.items.find((x) => !plan.items.some((y) => y.id === x.id) && x.id !== 'rest');
    setSwapNote(added ? { id: added.id, text: 'Swapped. As a member, Bestie remembers what you swap out.' } : null);
    track('plan_item_swap', { from: id, to: added?.id || '' });
  };
  const [done, setDone] = useState<Record<string, boolean>>({});
  // Restore today's ticks (Tap & track keeps progress on this device)
  useEffect(() => {
    if (!plan || !inputs) return;
    const ids = saveToday(plan.items, inputs.goals);
    setDone(Object.fromEntries(ids.map((id) => [id, true])));
  }, [plan, inputs]);
  const [unlockedFor, setUnlockedFor] = useState<string | null>(() => getUnlocked());
  const [gate, setGate] = useState<'form' | 'used'>('form');
  const [usedEmail, setUsedEmail] = useState('');
  // Admins (Ren) can preview any plan without using up a free day
  const { isAdmin } = useAdmin();

  const event = useTodayEvent();
  const [feel, setFeel] = useState<Record<string, Feel>>(() => loadFeel());
  const rate = (id: string, f: Feel) => {
    const next = { ...feel, [id]: f };
    setFeel(next);
    saveFeel(next);
    track('plan_item_feel', { item: id, feel: f });
  };

  if (!inputs || !plan || !inputs.area || !inputs.goals.length) return <Navigate to={withUtm('/plan/inputs')} replace />;

  const unlocked = !!unlockedFor || isAdmin;
  const doneCount = Object.values(done).filter(Boolean).length;
  const toggle = (id: string) => {
    const on = !done[id];
    const ids = saveDone(id, on);
    setDone(Object.fromEntries(ids.map((x) => [x, true])));
    track('plan_item_done', { item: id, done: on });
  };

  const chips = [inputs.energy + ' energy', ...inputs.goals, money(inputs.budget), inputs.area && inputs.area !== 'Somewhere else' ? inputs.area : null].filter(Boolean) as string[];
  const chipRow = (
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map((c) => (
        <span key={c} className="rounded-full border border-wb-sand bg-wb-shell px-3.5 py-1.5 text-[14px] text-wb-soft">
          {c}
        </span>
      ))}
      <Link to={withUtm('/plan/inputs')} className="rounded-full px-2 py-1.5 text-[14px] text-wb-plum underline underline-offset-4">
        Edit
      </Link>
    </div>
  );

  // Free trial: email first, then the whole day shows here straight away.
  if (!unlocked) {
    return (
      <Screen className="pb-20">
        <StepHeader
          back="/plan/inputs"
          step={2}
          total={2}
          title={gate === 'used' ? 'You’ve had your free day.' : 'Almost there.'}
          sub={gate === 'used' ? `${usedEmail || 'This email'} has already used its free day.` : `${plan.items.length} picks · ${describeTime(plan.minutes)} · ${plan.totalLabel}`}
        />
        {chipRow}
        {gate === 'used' ? (
          <>
            <MembershipPrompt />
            <button
              type="button"
              onClick={() => setGate('form')}
              className="mt-4 flex h-11 w-full items-center justify-center text-[15px] text-wb-plum underline underline-offset-4"
            >
              Use a different email
            </button>
          </>
        ) : (
          <EmailGate
            plan={plan.items}
            onUnlocked={(email) => {
              setUnlocked(email, inputs);
              setUnlockedFor(email);
              window.scrollTo({ top: 0 });
            }}
            onUsed={(email) => {
              setUsedEmail(email);
              setGate('used');
              track('membership_prompt_view', { reason: 'second_free_day' });
            }}
          />
        )}
        <p className="mt-8 text-center text-[14px] leading-relaxed text-wb-taupe">Suggestions based on your answers, not medical advice.</p>
      </Screen>
    );
  }

  return (
    <Screen className="pb-20">
      <PlannerHeader />
      <LearnsYou inputs={inputs} />
      {chipRow}
      {isAdmin && !unlockedFor && <p className="mt-3 rounded-[12px] bg-wb-gold-soft/60 px-4 py-2 text-[14px] text-wb-soft">Admin preview: no email needed, nothing is saved.</p>}

      <Affirmation energy={inputs.energy} />

      <div className="mt-4 grid grid-cols-3 divide-x divide-wb-sand rounded-[16px] border border-wb-sand bg-wb-shell py-3 text-center">
        <div>
          <p className="font-wb-serif text-[20px] text-wb-ink">{describeTime(plan.minutes)}</p>
          <p className="text-[14px] text-wb-taupe">in total</p>
        </div>
        <div>
          <p className="whitespace-nowrap font-wb-serif text-[16px] leading-[30px] text-wb-ink">{plan.totalLabel}</p>
          <p className="text-[14px] text-wb-taupe">avg. spend</p>
        </div>
        <div>
          <p className="font-wb-serif text-[20px] text-wb-ink">
            {doneCount}/{plan.items.length}
          </p>
          <p className="text-[14px] text-wb-taupe">done</p>
        </div>
      </div>

      <h2 className="mt-8 text-[24px] text-wb-ink">Today’s plan</h2>
      <p className="mt-1 text-[15px] text-wb-soft">Do these in any order. Tap a place to open it in Maps.</p>
      <ul className="mt-4 space-y-3">
        {plan.items.map((item) => (
          <PlanRow
            key={item.id}
            item={item}
            done={!!done[item.id]}
            onToggle={() => toggle(item.id)}
            feel={feel[item.id]}
            onFeel={(f) => rate(item.id, f)}
            onSwap={item.id === 'rest' ? undefined : () => swap(item.id)}
            note={swapNote?.id === item.id ? swapNote.text : undefined}
          />
        ))}
      </ul>

      <Tracker items={plan.items} done={done} />

      {event && <TodayEvent event={event} />}

      <Noticed trial />
      <BestieSwipe />

      <MembershipPrompt after />

      <p className="mt-8 text-center text-[14px] leading-relaxed text-wb-taupe">Suggestions based on your answers, not medical advice.</p>
    </Screen>
  );
}

/** The member planner look (greeting, week strip, today's list), open for today only on the free trial. */
function PlannerHeader() {
  const days = useMemo(week, []);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const [day, setDay] = useState(todayIdx);
  const locked = day !== todayIdx;
  return (
    <div className="pt-24">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-wb-gold/70 px-3 py-1 text-[14px] text-wb-plum">
        <Sparkles className="h-3.5 w-3.5 text-wb-gold" strokeWidth={1.5} /> Free trial · today only
      </span>
      <h1 className="mt-5 text-[36px] leading-[1.08] text-wb-ink">{greeting()}.</h1>
      <p className="mt-2 text-[16px] text-wb-soft">Here's your day, planned around you.</p>

      <div className="mt-6 grid grid-cols-7 gap-1" role="tablist" aria-label="This week">
        {days.map((d, i) => {
          const on = i === day;
          const isToday = i === todayIdx;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long' })}${isToday ? ', today' : ', members only'}`}
              onClick={() => {
                setDay(i);
                if (!isToday) track('trial_locked_day', { day: i });
              }}
              className={cx(
                'flex h-[72px] flex-col items-center justify-center gap-1 rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-gold',
                on ? 'bg-wb-plum text-wb-paper' : 'text-wb-soft hover:bg-wb-stone',
                !isToday && !on && 'opacity-60',
              )}
            >
              <span className="text-[14px]">{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
              <span className={cx('text-[16px] font-medium', !on && isToday && 'text-wb-plum')}>{d.getDate()}</span>
              {isToday ? <span className={cx('h-1 w-1 rounded-full', on ? 'bg-wb-gold' : 'bg-wb-plum')} /> : <Lock className="h-3 w-3" strokeWidth={1.8} aria-hidden />}
            </button>
          );
        })}
      </div>

      {locked ? (
        <Card className="mt-4 p-5 text-center">
          <Lock className="mx-auto h-5 w-5 text-wb-gold" strokeWidth={1.5} />
          <p className="mt-2 font-wb-serif text-[20px] text-wb-ink">{days[day].toLocaleDateString('en-GB', { weekday: 'long' })} is for members</p>
          <p className="mt-1 text-[15px] text-wb-soft">Your free trial plans today. Members get every day planned, and Bestie learns what works for you.</p>
          <div className="mt-4 flex flex-col items-center gap-1">
            <WaitlistLink source="trial_locked_day" className="w-full" />
            <button type="button" onClick={() => setDay(todayIdx)} className="flex h-11 items-center text-[15px] text-wb-plum underline underline-offset-4">
              Back to today
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

const AFFIRMATIONS: Record<string, string> = {
  Low: 'Rest is part of the plan. Gentle still counts.',
  Steady: 'Small steps, done often, are how you change.',
  High: 'You have the energy today. Spend it on you.',
};

/** The daily affirmation that greets you after checking in. */
function Affirmation({ energy }: { energy: string }) {
  return (
    <div className="wb-rise mt-5 rounded-[14px] bg-wb-plum px-5 py-4 text-white">
      <p className="text-[14px] font-medium uppercase tracking-[0.16em] text-white/75">Today's affirmation</p>
      <p className="mt-1 text-[26px] leading-tight" style={{ fontFamily: 'var(--font-wb-hand)' }}>
        {AFFIRMATIONS[energy] || AFFIRMATIONS.Steady}
      </p>
    </div>
  );
}

/** A thin progress ring with an icon in the middle (In Charge-style). */
function Ring({ pct, size, stroke = 4, children, label }: { pct: number; size: number; stroke?: number; children: React.ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1EEEA" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#7D6D61"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, pct))}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </div>
  );
}

/** Tap & track: rings for today and each pillar, plus this week's totals (saved on this device). */
function Tracker({ items, done }: { items: PlanItem[]; done: Record<string, boolean> }) {
  const doneCount = items.filter((i) => done[i.id]).length;
  const s = useMemo(() => trackerStats(), [doneCount]);
  const pct = items.length ? doneCount / items.length : 0;
  const pillars = (['move', 'meal', 'mindset'] as const).map((p) => {
    const mine = items.filter((i) => i.pillar === p);
    return { p, label: p === 'move' ? 'Move' : p === 'meal' ? 'Meal' : 'Mindset', total: mine.length, done: mine.filter((i) => done[i.id]).length };
  });
  return (
    <Card as="section" className="mt-4 p-5" aria-label="Tap and track">
      <p className="text-[14px] font-medium uppercase tracking-[0.16em] text-wb-taupe">Tap &amp; track</p>
      <div className="mt-4 flex items-center gap-5">
        <Ring pct={pct} size={104} stroke={6} label={`${Math.round(pct * 100)} percent of today done`}>
          <span className="text-center">
            <span className="block font-wb-serif text-[26px] leading-none text-wb-ink">{Math.round(pct * 100)}%</span>
            <span className="mt-1 block text-[14px] text-wb-taupe">today</span>
          </span>
        </Ring>
        <div className="grid flex-1 grid-cols-3 gap-2">
          {pillars.map((x) => (
            <div key={x.p} className="flex flex-col items-center">
              <Ring pct={x.total ? x.done / x.total : 0} size={56} label={`${x.label}: ${x.done} of ${x.total} done`}>
                <PillarIcon pillar={x.p} className="h-5 w-5 text-wb-plum" />
              </Ring>
              <span className="mt-1.5 text-[14px] text-wb-soft">{x.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          { icon: Flame, v: `${s.streak}`, l: 'day streak' },
          { icon: Footprints, v: `${s.weekMoveMinutes}m`, l: 'moved this week' },
          { icon: Coffee, v: `${s.weekMindMinutes}m`, l: 'mindset this week' },
        ].map(({ icon: Icon, v, l }) => (
          <div key={l} className="rounded-[14px] bg-wb-paper px-2 py-3">
            <Icon className="mx-auto h-4 w-4 text-wb-gold" strokeWidth={1.6} />
            <p className="mt-1 font-wb-serif text-[20px] text-wb-ink">{v}</p>
            <p className="text-[14px] leading-tight text-wb-taupe">{l}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-wb-taupe">Saved on this device. With membership, Bestie learns from it to plan better.</p>
    </Card>
  );
}

/** A Stepsisters event happening today, if there is one (never part of the checklist). */
function useTodayEvent() {
  const [event, setEvent] = useState<StepsistersMoment | null>(null);
  useEffect(() => {
    let live = true;
    const today = wellnessApi.toDateKey(new Date());
    wellnessApi.getMoments().then((r) => {
      if (!live || !r.ok || !r.data) return;
      setEvent(r.data.find((m) => m.type !== 'recap' && m.date === today) || null);
    });
    return () => {
      live = false;
    };
  }, []);
  return event;
}

function TodayEvent({ event }: { event: StepsistersMoment }) {
  const url = event.link || '/bestie#stepsisters';
  const time = event.startTime ? new Date(`2000-01-01T${event.startTime}`).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : '';
  return (
    <Card as="section" className="mt-4 border-wb-gold/50 bg-wb-gold-soft/60 p-5">
      <p className="inline-flex items-center gap-1.5 text-[14px] font-medium uppercase tracking-[0.16em] text-wb-plum">
        <CalendarHeart className="h-4 w-4 text-wb-gold" strokeWidth={1.5} /> Happening today · Stepsisters
      </p>
      <p className="mt-2 font-wb-serif text-[20px] leading-snug text-wb-ink">{event.title}</p>
      <p className="mt-1 text-[14px] text-wb-soft">{[time, event.location, 'Free'].filter(Boolean).join(' · ')}</p>
      <div className="mt-4">
        <ActionLink link={{ label: 'Join the event', url }} onClick={() => track('plan_event_click', { title: event.title })} />
      </div>
    </Card>
  );
}

/** A follow-through button: internal path or external link (new tab). */
function ActionLink({ link, onClick, solid }: { link: PlanLink; onClick?: () => void; solid?: boolean }) {
  const cls = cx(
    'inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-gold',
    solid ? 'bg-wb-plum text-wb-paper hover:bg-[#6B5C51]' : 'border border-wb-plum/25 text-wb-plum hover:border-wb-plum/60',
  );
  return link.url.startsWith('/') ? (
    <Link to={withUtm(link.url)} onClick={onClick} className={cls}>
      {link.label} <ArrowUpRight className="h-4 w-4" strokeWidth={1.7} />
    </Link>
  ) : (
    <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls}>
      {link.label} <ArrowUpRight className="h-4 w-4" strokeWidth={1.7} />
    </a>
  );
}

/* Swaps are kept for this visit only (sessionStorage), tied to the answers they were made for. */
const SWAP_KEY = 'wb_plan_swapped_v1';
const SKIP_KEY = 'wb_plan_skipped_v1';
function loadSwapped(i: object): Plan | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(SWAP_KEY) || 'null');
    return v && v.inputs === JSON.stringify(i) ? v.plan : null;
  } catch {
    return null;
  }
}
function saveSwapped(i: object, plan: Plan) {
  try {
    sessionStorage.setItem(SWAP_KEY, JSON.stringify({ inputs: JSON.stringify(i), plan }));
  } catch {
    /* private mode */
  }
}
function loadSkipped(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SKIP_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveSkipped(v: string[]) {
  try {
    sessionStorage.setItem(SKIP_KEY, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}

type Feel = 'loved' | 'ok' | 'skip';
const FEEL_KEY = 'wb_plan_feel_v1';
const FEELS: { key: Feel; label: string; note: string }[] = [
  { key: 'loved', label: 'Loved it', note: 'Noted. Bestie would plan more like this.' },
  { key: 'ok', label: 'It was fine', note: 'Noted. Bestie keeps it in the mix.' },
  { key: 'skip', label: 'Not for me', note: 'Noted. Bestie would swap it next time.' },
];
function loadFeel(): Record<string, Feel> {
  try {
    return JSON.parse(localStorage.getItem(FEEL_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveFeel(v: Record<string, Feel>) {
  try {
    localStorage.setItem(FEEL_KEY, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}

/** What a member's Bestie learns over the first weeks, starting from today's answers. */
function LearnsYou({ inputs }: { inputs: { energy: string; goals: string[]; minutes: number; area: string } }) {
  const goal = (inputs.goals[0] || 'feel good').toLowerCase();
  const steps = [
    { day: 'Today', text: `Planned around your ${inputs.energy.toLowerCase()} energy, ${describeTime(inputs.minutes)} and wanting to ${goal}.` },
    { day: 'Day 3', text: 'Notices what you actually tick and what you skip, and how each one felt.' },
    { day: 'Day 7', text: 'Plans your whole week around your patterns: your favourite studios, the times you really go, and when you need a rest day.' },
    { day: 'Day 14', text: 'Matches you with a bestie nearby who loves the same class or café.' },
  ];
  return (
    <Card as="section" className="mt-4 border-wb-gold/50 bg-wb-gold-soft/60 p-5" aria-labelledby="learns-title">
      <p className="inline-flex items-center gap-1.5 text-[14px] font-medium uppercase tracking-[0.16em] text-wb-plum">
        <Sparkles className="h-4 w-4 text-wb-gold" strokeWidth={1.5} /> A planner that learns you
      </p>
      <p id="learns-title" className="mt-2 font-wb-serif text-[20px] leading-snug text-wb-ink">
        This is day 1. As a member, every tick teaches Bestie what works for you.
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={s.day} className="flex gap-3">
            <span className={cx('mt-0.5 flex h-6 w-14 shrink-0 items-center justify-center rounded-full text-[12px] font-medium', i === 0 ? 'bg-wb-plum text-wb-paper' : 'border border-wb-plum/30 text-wb-plum')}>
              {s.day}
            </span>
            <span className="text-[14px] leading-snug text-wb-soft">{s.text}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[13px] text-wb-taupe">Try it: tick a pick when you've done it and tell Bestie how it felt.</p>
    </Card>
  );
}

function PlanRow({
  item,
  done,
  onToggle,
  feel,
  onFeel,
  onSwap,
  note,
}: {
  item: PlanItem;
  done: boolean;
  onToggle: () => void;
  feel?: Feel;
  onFeel: (f: Feel) => void;
  onSwap?: () => void;
  note?: string;
}) {
  return (
    <Card as="li" className={cx('p-4 transition-colors', done && 'bg-wb-paper')}>
      <div className="flex gap-3.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`Mark ${item.title} as done`}
          onClick={onToggle}
          className={cx(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-gold',
            done ? 'border-wb-plum bg-wb-plum text-wb-paper' : 'border-wb-plum/30 hover:border-wb-plum',
          )}
        >
          {done && <Check className="h-4 w-4" strokeWidth={2.2} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[14px] font-medium uppercase tracking-[0.14em] text-wb-taupe">
              <PillarIcon pillar={item.pillar} className="h-4 w-4 text-wb-plum" />
              {item.label}
            </span>
            <span className="text-[14px] font-medium text-wb-ink">{item.priceLabel}</span>
          </div>
          <p className={cx('mt-1.5 font-wb-serif text-[20px] leading-snug text-wb-ink', done && 'text-wb-taupe line-through decoration-wb-taupe/50')}>{item.title}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-wb-soft">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.6} />
              {item.minutes} min
            </span>
            <span className="inline-flex min-w-0 items-start gap-1">
              <MapPin className="mt-[3px] h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
              <span>{item.venue}</span>
            </span>
          </p>
          {item.timing && (
            <p className="mt-1.5 flex items-start gap-1 text-[14px] text-wb-soft">
              <Sun className="mt-[3px] h-3.5 w-3.5 shrink-0 text-wb-gold" strokeWidth={1.6} />
              <span>{item.timing}</span>
            </p>
          )}
          <p className="mt-2 text-[14px] leading-snug text-wb-taupe">
            <span className="font-medium text-wb-soft">Why this for you: </span>
            {item.reason}
          </p>
          {item.steps && (
            <ol className="mt-3 space-y-1.5 rounded-[14px] bg-wb-paper px-4 py-3">
              {item.steps.map((st, n) => (
                <li key={st} className="flex gap-2.5 text-[14px] text-wb-soft">
                  <span className="text-wb-plum">{n + 1}.</span>
                  {st}
                </li>
              ))}
            </ol>
          )}
          {done && (
            <div className="mt-3 rounded-[14px] bg-wb-paper px-3 py-3">
              <p className="text-[14px] text-wb-soft">How did it feel?</p>
              <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={`How ${item.title} felt`}>
                {FEELS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="radio"
                    aria-checked={feel === f.key}
                    onClick={() => onFeel(f.key)}
                    className={cx(
                      'h-9 rounded-full border px-3.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-gold',
                      feel === f.key ? 'border-wb-plum bg-wb-plum text-wb-paper' : 'border-wb-plum/25 text-wb-plum hover:border-wb-plum/60',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {feel && <p className="mt-2 text-[13px] text-wb-taupe" role="status">{FEELS.find((f) => f.key === feel)?.note}</p>}
            </div>
          )}
          {item.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.links.map((l, n) => (
                <ActionLink key={l.url} link={l} solid={n === 0} onClick={() => track('plan_item_click', { pillar: item.pillar, title: item.title, action: l.label })} />
              ))}
            </div>
          )}
          {onSwap && !done && (
            <button
              type="button"
              onClick={onSwap}
              className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-full px-1 text-[14px] text-wb-plum underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-gold"
            >
              <Shuffle className="h-4 w-4" strokeWidth={1.6} /> Not feeling it? Swap
            </button>
          )}
          {note && (
            <p className="mt-1 text-[13px] text-wb-taupe" role="status">
              {note}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

/** The one sign-up: email + consent joins the waitlist and opens the free day. Other details are asked later, at account set-up. */
function EmailGate({ plan, onUnlocked, onUsed }: { plan: PlanItem[]; onUnlocked: (email: string) => void; onUsed: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [warnedFor, setWarnedFor] = useState('');
  const utm = getUtm();
  const inputs = loadInputs();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = normEmail(email);
    const c = checkEmail(em);
    setSuggestion('');
    if (!c.ok && !(c.suggestion && warnedFor === em)) {
      if (c.suggestion) {
        setSuggestion(c.suggestion);
        setWarnedFor(em);
      }
      return setError(c.error || 'Please check your email address.');
    }
    if (!consent) return setError('Please tick the box to join and see your day.');
    setError('');

    setSending(true);
    if (!(await domainAcceptsMail(em))) {
      setSending(false);
      return setError(NO_MAIL_ERROR);
    }
    const r = await submitFreeDay({
      email: em,
      consent: true,
      inputs: { energy: inputs?.energy || '', goals: inputs?.goals || [], minutes: inputs?.minutes || 0, budget: inputs?.budget || 0, area: inputs?.area || '' },
      plan: plan.map((p) => ({ time: `${p.minutes} min`, label: p.label, title: p.title, venue: p.venue, cost: p.priceLabel, url: p.links[0]?.url || '' })),
    });
    setSending(false);
    if (r.used && r.today) {
      // Same email, same day (e.g. back on another phone): it's still their free day
      markEmailUsed(em);
      return onUnlocked(em);
    }
    if (r.used) {
      markEmailUsed(em);
      return onUsed(em);
    }
    if (!r.ok) return setError(r.error || 'Something went wrong. Please try again.');
    markEmailUsed(em);
    formSubmit('free_day', { utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign });
    formSubmit('pilot_application', { utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign });
    onUnlocked(em);
  };

  const field =
    'mt-2 h-14 w-full rounded-full border border-wb-sand bg-wb-paper px-5 text-[16px] text-wb-ink outline-none transition-colors placeholder:text-wb-taupe/70 focus:border-wb-plum';

  return (
    <Card as="section" className="mt-6 p-6">
      <Sparkles className="h-5 w-5 text-wb-gold" strokeWidth={1.4} />
      <h2 className="mt-3 text-[26px]">Your wellness 1 day trial is ready</h2>
      <p className="mt-2 text-[16px] leading-relaxed text-wb-soft">Pop in your email and join our waitlist to access Wellness Bestie.</p>
      <form onSubmit={submit} noValidate className="mt-5">
        <input type="hidden" name="utm_source" value={utm.utm_source || ''} />
        <input type="hidden" name="utm_medium" value={utm.utm_medium || ''} />
        <input type="hidden" name="utm_campaign" value={utm.utm_campaign || ''} />
        <label htmlFor="free-day-email" className="text-[14px] text-wb-taupe">
          Email address
        </label>
        <input
          id="free-day-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={160}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-invalid={!!error && !checkEmail(email).ok}
          aria-describedby={error ? 'free-day-error' : undefined}
          className={field}
        />

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="peer sr-only" />
          <span
            aria-hidden
            className={cx(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-wb-gold',
              consent ? 'border-wb-plum bg-wb-plum text-wb-paper' : 'border-wb-plum/30 bg-wb-shell',
            )}
          >
            {consent && <Check className="h-4 w-4" strokeWidth={2.2} />}
          </span>
          <span className="text-[14px] leading-relaxed text-wb-soft">
            I’m happy for ORIRI to store my answers and email me about Wellness Bestie. Unsubscribe any time.{' '}
            <Link to={withUtm('/privacy')} className="underline underline-offset-4">
              Privacy
            </Link>
          </span>
        </label>
        {error && (
          <p id="free-day-error" role="alert" className="mt-3 text-[14px] text-[#9A3F45]">
            {error}
            {suggestion && (
              <>
                {' '}
                <button
                  type="button"
                  className="font-medium underline underline-offset-4"
                  onClick={() => {
                    setEmail(suggestion);
                    setSuggestion('');
                    setError('');
                  }}
                >
                  Use it
                </button>
              </>
            )}
          </p>
        )}
        <PillButton type="submit" className="mt-5 w-full" disabled={sending} arrow={!sending}>
          {sending ? 'Opening…' : 'Join & see my day'}
        </PillButton>
        <p className="mt-3 text-center text-[14px] text-wb-taupe">One free day per email.</p>
      </form>
    </Card>
  );
}

/** After the sign-up (after) or when the email already had its free day. Either way they're on the waitlist. */
function MembershipPrompt({ after = false }: { after?: boolean }) {
  return (
    <section className="mt-4 rounded-[20px] bg-wb-plum p-6 text-wb-paper">
      <GoldRule />
      <p className="mt-4 flex items-center gap-2 text-[14px] font-medium uppercase tracking-[0.18em] text-wb-gold">
        <Check className="h-4 w-4" strokeWidth={2} /> {after ? 'You’re on the waitlist' : 'Already on the waitlist'}
      </p>
      <h2 className="mt-2 text-[26px] text-wb-paper">{after ? 'Want this every day?' : 'You’ve had your free day'}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-wb-paper/85">
        {after ? '' : 'Each email gets one free day. '}When membership opens, Bestie plans every day, remembers what works for you and finds you a bestie nearby. We’ll email you first.
      </p>
      <PillLink to="/membership" tone="ivory" className="mt-6 w-full" onClick={() => ctaClick('Preview membership', after ? 'day_sent' : 'day_used')}>
        Preview membership
      </PillLink>
    </section>
  );
}

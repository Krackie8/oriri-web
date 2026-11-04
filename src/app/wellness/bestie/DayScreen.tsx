/** 4 · Curated day: checklist, locked 4th item, email gate (one free day per email). */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowUpRight, CalendarHeart, Check, Clock, Coffee, Flame, Footprints, Lock, MapPin, Sparkles } from 'lucide-react';
import { saveToday, setDone as saveDone, stats as trackerStats } from './tracker';
import { Card, GoldRule, PillButton, PillLink, PillarIcon, Screen, StepHeader, cx } from './kit';
import { buildPlan, describeTime, money, type PlanItem, type PlanLink } from './engine';
import * as wellnessApi from '../../utils/wellnessApi';
import type { StepsistersMoment } from '../../utils/wellnessApi';
import { getUnlocked, loadInputs, markEmailUsed, normEmail, setUnlocked, usedEmails } from './state';
import { submitFreeDay } from '../api';
import { ctaClick, formSubmit, track } from '../analytics/track';
import { getUtm, withUtm } from '../analytics/utm';

export default function DayScreen() {
  const inputs = useMemo(() => loadInputs(), []);
  const plan = useMemo(() => (inputs ? buildPlan(inputs) : null), [inputs]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  // Restore today's ticks (Tap & track keeps progress on this device)
  useEffect(() => {
    if (!plan || !inputs) return;
    const ids = saveToday(plan.items, inputs.goals);
    setDone(Object.fromEntries(ids.map((id) => [id, true])));
  }, [plan, inputs]);
  const [unlockedFor, setUnlockedFor] = useState<string | null>(() => getUnlocked());
  const [gate, setGate] = useState<'form' | 'used'>('form');

  const event = useTodayEvent();

  if (!inputs || !plan) return <Navigate to={withUtm('/plan/inputs')} replace />;

  const unlocked = !!unlockedFor;
  // The last pick stays locked until they share an email
  const visible = plan.items.slice(0, -1);
  const locked = plan.items[plan.items.length - 1];
  const doneCount = Object.values(done).filter(Boolean).length;
  const toggle = (id: string) => {
    const on = !done[id];
    const ids = saveDone(id, on);
    setDone(Object.fromEntries(ids.map((x) => [x, true])));
    track('plan_item_done', { item: id, done: on });
  };

  const chips = [inputs.energy + ' energy', ...inputs.goals, money(inputs.budget), inputs.area && inputs.area !== 'Somewhere else' ? inputs.area : null].filter(Boolean) as string[];

  return (
    <Screen className="pb-20">
      <StepHeader back="/plan/inputs" step={2} total={2} title="Your day, curated." sub="Do these in any order, whenever suits you." />

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

      <div className="mt-6 grid grid-cols-3 divide-x divide-wb-sand rounded-[16px] border border-wb-sand bg-wb-shell py-3 text-center">
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

      <ul className="mt-4 space-y-3">
        {visible.map((item) => (
          <PlanRow key={item.id} item={item} done={!!done[item.id]} onToggle={() => toggle(item.id)} />
        ))}
        {unlocked ? <PlanRow item={locked} done={!!done[locked.id]} onToggle={() => toggle(locked.id)} /> : <LockedRow item={locked} />}
      </ul>

      <Tracker items={plan.items} done={done} />

      {event && <TodayEvent event={event} />}

      {unlocked ? (
        <Sent email={unlockedFor!} />
      ) : gate === 'used' ? (
        <MembershipPrompt />
      ) : (
        <EmailGate
          plan={plan.items}
          onUnlocked={(email) => {
            setUnlocked(email);
            setUnlockedFor(email);
          }}
          onUsed={() => {
            setGate('used');
            track('membership_prompt_view', { reason: 'second_free_day' });
          }}
        />
      )}

      <p className="mt-8 text-center text-[14px] leading-relaxed text-wb-taupe">Suggestions based on your answers, not medical advice.</p>
    </Screen>
  );
}

/** A thin progress ring with an icon in the middle (In Charge-style). */
function Ring({ pct, size, stroke = 4, children, label }: { pct: number; size: number; stroke?: number; children: React.ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EFE8E0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#4A2C3D"
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
  const url = event.link || '/community';
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
    solid ? 'bg-wb-plum text-wb-paper hover:bg-[#3A2230]' : 'border border-wb-plum/25 text-wb-plum hover:border-wb-plum/60',
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

function PlanRow({ item, done, onToggle }: { item: PlanItem; done: boolean; onToggle: () => void }) {
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
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
              <span className="truncate">{item.venue}</span>
            </span>
          </p>
          <p className="mt-2 text-[14px] leading-snug text-wb-taupe">{item.reason}</p>
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
          {item.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.links.map((l, n) => (
                <ActionLink key={l.url} link={l} solid={n === 0} onClick={() => track('plan_item_click', { pillar: item.pillar, title: item.title, action: l.label })} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function LockedRow({ item }: { item: PlanItem }) {
  return (
    <Card as="li" className="relative overflow-hidden p-4">
      <div className="flex gap-3.5 opacity-40 blur-[1.5px]" aria-hidden>
        <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-wb-plum/30" />
        <div className="min-w-0 flex-1">
          <span className="text-[14px] font-medium uppercase tracking-[0.14em] text-wb-taupe">{item.label}</span>
          <p className="mt-1.5 font-wb-serif text-[20px] text-wb-ink">{item.title}</p>
          <p className="mt-1.5 text-[14px] text-wb-soft">
            {item.minutes} min · {item.venue}
          </p>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-wb-shell px-4 py-2 text-[14px] text-wb-plum shadow-[0_8px_24px_-12px_rgba(74,44,61,0.35)]">
          <Lock className="h-4 w-4" strokeWidth={1.6} /> One more pick unlocks with email
        </span>
      </div>
    </Card>
  );
}

function EmailGate({ plan, onUnlocked, onUsed }: { plan: PlanItem[]; onUnlocked: (email: string) => void; onUsed: () => void }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const utm = getUtm();
  const inputs = loadInputs();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = normEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return setError('Please check your email address.');
    if (!consent) return setError('Please tick the box so we can email your day.');
    setError('');
    if (usedEmails().includes(em)) return onUsed();

    setSending(true);
    const r = await submitFreeDay({
      email: em,
      consent: true,
      inputs: { energy: inputs?.energy || '', goals: inputs?.goals || [], minutes: inputs?.minutes || 0, budget: inputs?.budget || 0, area: inputs?.area || '' },
      plan: plan.map((p) => ({ time: `${p.minutes} min`, label: p.label, title: p.title, venue: p.venue, cost: p.priceLabel, url: p.links[0]?.url || '' })),
    });
    setSending(false);
    if (r.used) {
      markEmailUsed(em);
      return onUsed();
    }
    if (!r.ok) return setError(r.error || 'Something went wrong. Please try again.');
    markEmailUsed(em);
    formSubmit('free_day', { utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign });
    onUnlocked(em);
  };

  return (
    <Card as="section" className="mt-6 p-6">
      <Sparkles className="h-5 w-5 text-wb-gold" strokeWidth={1.4} />
      <h2 className="mt-3 text-[26px]">Unlock your full day</h2>
      <p className="mt-2 text-[16px] leading-relaxed text-wb-soft">Reveal your last pick and get the full list, with every link, in your inbox. One free day per email.</p>
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-invalid={!!error}
          aria-describedby={error ? 'free-day-error' : undefined}
          className="mt-2 h-14 w-full rounded-full border border-wb-sand bg-wb-paper px-5 text-[16px] text-wb-ink outline-none transition-colors placeholder:text-wb-taupe/70 focus:border-wb-plum"
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
            Email me my day and occasional Wellness Bestie news. Unsubscribe any time.{' '}
            <Link to={withUtm('/privacy')} className="underline underline-offset-4">
              Privacy
            </Link>
          </span>
        </label>
        {error && (
          <p id="free-day-error" role="alert" className="mt-3 text-[14px] text-[#9A3F45]">
            {error}
          </p>
        )}
        <PillButton type="submit" className="mt-5 w-full" disabled={sending} arrow={!sending}>
          {sending ? 'Sending…' : 'Send my day'}
        </PillButton>
      </form>
    </Card>
  );
}

function Sent({ email }: { email: string }) {
  return (
    <>
      <Card as="section" className="mt-6 flex items-start gap-3 p-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wb-plum text-wb-paper">
          <Check className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <p className="text-[15px] leading-relaxed text-wb-soft">
          Your day is on its way to <span className="font-medium text-wb-ink">{email}</span>. Enjoy it.
        </p>
      </Card>
      <MembershipPrompt title="Want this every day?" />
    </>
  );
}

function MembershipPrompt({ title }: { title?: string }) {
  const second = !title;
  return (
    <section className="mt-4 rounded-[20px] bg-wb-plum p-6 text-wb-paper">
      <GoldRule />
      <h2 className="mt-4 text-[26px] text-wb-paper">{title || "You've had your free day"}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-wb-paper/85">
        {second
          ? 'Each email gets one free day. Bestie membership plans every day, remembers what works for you and finds you a bestie nearby.'
          : 'Bestie remembers your patterns, plans your week ahead and finds you a bestie nearby.'}
      </p>
      <PillLink to="/pilot" tone="ivory" className="mt-6 w-full" onClick={() => ctaClick('Join the waitlist', second ? 'day_used' : 'day_sent')}>
        Join the waitlist
      </PillLink>
      <Link to={withUtm('/membership')} className="mt-3 flex h-11 items-center justify-center text-[15px] text-wb-paper/85 underline underline-offset-4 hover:text-wb-paper">
        Preview membership
      </Link>
    </section>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Loader2, MessageCircle } from 'lucide-react';

import { Eyebrow, InstagramLink, Photo, cx } from '../components/ui';
import { AGE_GROUPS, DUBAI_AREAS, HEARD_FROM, MEAL_PREFS, MINDSET_PREFS, WORKOUTS } from '../content';
import { formSubmit, pilotFormStart, pilotFormStep, pilotFormSubmit, whatsappClick } from '../analytics/track';
import { getAttribution, sourceLabel, withUtm } from '../analytics/utm';
import { WHATSAPP_SHARE_URL } from '../analytics/config';
import { submitPilotApplication } from '../api';

const STEP_TITLES = ['A little about you', 'Move, Meal & Mindset', 'Where I can reach you'];

function Chip({ on, children, onClick, role = 'checkbox' }: { on: boolean; children: React.ReactNode; onClick: () => void; role?: 'checkbox' | 'radio' }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={on}
      onClick={onClick}
      className={cx(
        'inline-flex h-12 items-center justify-center gap-1.5 rounded-full border px-5 text-[16px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-sage-deep focus-visible:ring-offset-2 active:scale-[0.97]',
        on ? 'border-wb-ink bg-wb-ink text-wb-shell' : 'border-wb-ink/15 bg-wb-shell text-wb-ink hover:border-wb-ink/40',
      )}
    >
      {on && role === 'checkbox' && <Check className="h-4 w-4" strokeWidth={2} />}
      {children}
    </button>
  );
}

function Label({ children, htmlFor, id }: { children: React.ReactNode; htmlFor?: string; id?: string }) {
  return (
    <label htmlFor={htmlFor} id={id} className="mb-3 block text-[15px] font-medium text-wb-ink">
      {children}
    </label>
  );
}

function TagGroup({ id, label, options, value, onChange }: { id: string; label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <Label id={`${id}_label`}>{label}</Label>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}_label`}>
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <Chip key={o} on={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}>
              {o}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

const field =
  'h-14 w-full rounded-2xl border border-wb-ink/15 bg-wb-shell px-4 text-[17px] text-wb-ink placeholder:text-wb-taupe/70 transition-colors focus:border-wb-ink focus:outline-none focus:ring-0';

export default function PilotPage() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const started = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  const [firstName, setFirstName] = useState('');
  const [area, setArea] = useState('');
  const [age, setAge] = useState('');
  const [workouts, setWorkouts] = useState<string[]>([]);
  const [mealPrefs, setMealPrefs] = useState<string[]>([]);
  const [mindsetPrefs, setMindsetPrefs] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [heard, setHeard] = useState('');
  const [consent, setConsent] = useState(false);

  // Hidden attribution fields, rendered into the form so every application carries its source.
  const attribution = useMemo(() => getAttribution(), []);

  useEffect(() => {
    pilotFormStep(step);
  }, [step]);

  const markStart = () => {
    if (started.current) return;
    started.current = true;
    pilotFormStart();
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const valid = {
    1: firstName.trim().length > 0 && !!area && !!age,
    2: workouts.length > 0,
    3: emailOk && !!heard && consent,
  }[step as 1 | 2 | 3];

  const goTo = (n: number) => {
    setShowErrors(false);
    setError('');
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const next = async () => {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    if (step < 3) return goTo(step + 1);

    setSubmitting(true);
    setError('');
    const res = await submitPilotApplication({
      first_name: firstName.trim(),
      home_area: area,
      age_group: age,
      workouts,
      meal_prefs: mealPrefs,
      mindset_prefs: mindsetPrefs,
      email: email.trim().toLowerCase(),
      instagram: instagram.replace(/^@/, ''),
      heard_from: heard,
      consent,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Something went wrong. Please try again.');
      return;
    }
    // Key event. No personal data is sent to analytics.
    pilotFormSubmit({ age_group: age, home_area: area, heard_from: heard.toLowerCase(), workouts_count: workouts.length });
    formSubmit('pilot_application', {
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
    });
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (done) return <ThankYou name={firstName.trim()} />;

  return (
    <section className="mx-auto grid max-w-[1240px] gap-10 px-5 pb-36 pt-24 md:px-10 md:pt-32 lg:grid-cols-[0.85fr_1fr] lg:gap-20 lg:pb-28">
      {/* Visual column */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Eyebrow>Wellness Bestie · Waitlist</Eyebrow>
        <h1 className="mt-5 text-[40px] sm:text-[52px] lg:text-[64px]">Join the waitlist.</h1>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-wb-soft">
          Three short steps, mostly taps. People on the waitlist try Bestie first and help shape it.
        </p>
        <Photo
          id="1763004871583-4183d64096b1"
          alt="Two rolled yoga mats standing against a pale wall"
          className="mt-10 hidden aspect-[4/5] rounded-[32px] lg:block"
          w={900}
          h={1125}
        />
      </div>

      {/* Form column */}
      <div ref={topRef} className="scroll-mt-24">
        <form
          noValidate
          onFocusCapture={markStart}
          onPointerDownCapture={markStart}
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="rounded-[32px] bg-wb-shell/70 p-5 sm:p-8 lg:p-10"
          aria-describedby="pilot-progress"
        >
          {/* Hidden traffic-source fields */}
          <input type="hidden" name="utm_source" value={attribution.utm_source || ''} />
          <input type="hidden" name="utm_medium" value={attribution.utm_medium || ''} />
          <input type="hidden" name="utm_campaign" value={attribution.utm_campaign || ''} />
          <input type="hidden" name="landing_page" value={attribution.landing_page} />
          <input type="hidden" name="wb_source" value={sourceLabel(attribution)} />

          {/* Progress */}
          <div id="pilot-progress">
            <div className="flex items-baseline justify-between">
              <p className="text-[14px] text-wb-taupe">
                Step {step} of 3
              </p>
              {step > 1 && (
                <button type="button" onClick={() => goTo(step - 1)} className="inline-flex items-center gap-1.5 text-[14px] text-wb-soft hover:text-wb-ink">
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.6} /> Back
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label="Application progress">
              {[1, 2, 3].map((n) => (
                <span key={n} className="h-1 overflow-hidden rounded-full bg-wb-ink/10">
                  <span className={cx('block h-full rounded-full bg-wb-sage-deep transition-all duration-500', n <= step ? 'w-full' : 'w-0')} />
                </span>
              ))}
            </div>
          </div>

          <div key={step} className="wb-rise mt-8">
            <h2 className="text-[30px] sm:text-[36px]">{STEP_TITLES[step - 1]}</h2>

            {step === 1 && (
              <div className="mt-8 space-y-8">
                <div>
                  <Label htmlFor="first_name">First name</Label>
                  <input
                    id="first_name"
                    name="first_name"
                    autoComplete="given-name"
                    className={field}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name"
                    maxLength={60}
                    aria-invalid={showErrors && !firstName.trim()}
                  />
                </div>
                <div>
                  <Label htmlFor="home_area">Home area</Label>
                  <div className="relative">
                    <select
                      id="home_area"
                      name="home_area"
                      className={cx(field, 'appearance-none pr-12', !area && 'text-wb-taupe/80')}
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      aria-invalid={showErrors && !area}
                    >
                      <option value="" disabled>
                        Choose your neighbourhood
                      </option>
                      {DUBAI_AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-wb-taupe" strokeWidth={1.5} />
                  </div>
                </div>
                <div>
                  <Label id="age_label">Age group</Label>
                  <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-labelledby="age_label">
                    {AGE_GROUPS.map((g) => (
                      <Chip key={g} role="radio" on={age === g} onClick={() => setAge(g)}>
                        {g}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-6 space-y-8">
                <p className="text-[15px] leading-relaxed text-wb-soft">Pick a few in each. One shared interest is enough to match you with a bestie.</p>
                <TagGroup id="workouts" label="Move · workouts you love" options={WORKOUTS} value={workouts} onChange={setWorkouts} />
                <TagGroup id="meal" label="Meal · how you like to eat (optional)" options={MEAL_PREFS} value={mealPrefs} onChange={setMealPrefs} />
                <TagGroup id="mindset" label="Mindset · what you love to listen to or read (optional)" options={MINDSET_PREFS} value={mindsetPrefs} onChange={setMindsetPrefs} />
              </div>
            )}

            {step === 3 && (
              <div className="mt-8 space-y-8">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className={field}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    maxLength={160}
                    aria-invalid={showErrors && !emailOk}
                  />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram handle (optional)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] text-wb-taupe">@</span>
                    <input
                      id="instagram"
                      name="instagram"
                      autoComplete="off"
                      autoCapitalize="none"
                      className={cx(field, 'pl-9')}
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value.replace(/[^A-Za-z0-9._]/g, '').slice(0, 30))}
                      placeholder="yourhandle"
                    />
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-wb-taupe">When you and a bestie both say hi, you'll connect on Instagram first.</p>
                </div>
                <div>
                  <Label id="heard_label">How did you hear about us?</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-labelledby="heard_label">
                    {HEARD_FROM.map((h) => (
                      <Chip key={h} role="radio" on={heard === h} onClick={() => setHeard(h)}>
                        {h}
                      </Chip>
                    ))}
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-wb-ink/10 bg-wb-shell p-4">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="peer sr-only" name="consent" />
                  <span
                    aria-hidden
                    className={cx(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-wb-sage-deep',
                      consent ? 'border-wb-sage-deep bg-wb-sage-deep text-wb-shell' : 'border-wb-ink/30',
                      showErrors && !consent && 'border-[#A0524A]',
                    )}
                  >
                    {consent && <Check className="h-4 w-4" strokeWidth={2.2} />}
                  </span>
                  <span className="text-[15px] leading-relaxed text-wb-soft">
                    I'm happy for ORIRI to store my answers and email me about Wellness Bestie. See the{' '}
                    <Link to={withUtm('/privacy')} className="text-wb-ink underline underline-offset-4">
                      privacy page
                    </Link>
                    .
                  </span>
                </label>
              </div>
            )}
          </div>

          {showErrors && !valid && (
            <p role="alert" className="mt-6 text-[15px] text-[#A0524A]">
              {step === 1 ? 'Add your name, area and age group to continue.' : step === 2 ? 'Pick at least one workout.' : 'Add your email, how you heard about us, and tick the box.'}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-6 text-[15px] text-[#A0524A]">
              {error}
            </p>
          )}

          {/* Continue: pinned to the thumb zone on mobile */}
          <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-wb-paper via-wb-paper/95 to-transparent px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-6 sm:static sm:mt-10 sm:bg-none sm:p-0">
            <button
              type="submit"
              disabled={submitting}
              className={cx(
                'flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-medium transition-all duration-300 active:scale-[0.98]',
                valid ? 'bg-wb-ink text-wb-shell hover:bg-wb-sage-deep' : 'bg-wb-ink/25 text-wb-shell',
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Sending
                </>
              ) : step < 3 ? (
                <>
                  Continue <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </>
              ) : (
                'Join the waitlist'
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ThankYou({ name }: { name: string }) {
  return (
    <section className="mx-auto grid min-h-[80vh] max-w-[1240px] items-center gap-12 px-5 pb-24 pt-28 md:px-10 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
      <div className="wb-rise">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wb-sage-deep text-wb-shell">
          <Check className="h-6 w-6" strokeWidth={2} />
        </span>
        {name && <p className="mt-8 text-[17px] text-wb-taupe">Thank you, {name}.</p>}
        <h1 className="mt-3 text-[44px] sm:text-[56px] lg:text-[68px]">You're on the list.</h1>
        <p className="mt-5 max-w-md text-[19px] leading-relaxed text-wb-soft">I'll email you before we start.</p>

        <div className="mt-12 border-t border-wb-ink/10 pt-8">
          <p className="text-[16px] text-wb-soft">Know someone who'd love this?</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href={WHATSAPP_SHARE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => whatsappClick('share', 'thank_you')}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-wb-ink px-8 text-[16px] font-medium text-wb-shell transition-colors hover:bg-wb-sage-deep"
            >
              <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.6} /> Share on WhatsApp
            </a>
            <InstagramLink location="thank_you" />
          </div>
        </div>
      </div>
      <Photo
        id="1526547319484-63dce467060b"
        alt="A cup and saucer on a quiet café table"
        className="wb-rise aspect-[4/5] rounded-[32px] [animation-delay:150ms]"
        w={900}
        h={1125}
      />
    </section>
  );
}

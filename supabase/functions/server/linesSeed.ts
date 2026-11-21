/**
 * The first bank of daily lines for Morning with Bestie (#74, DEC-013), drafted in Ren's voice from
 * her own writing (her Stepsisters write-ups, Directory notes and Tea for Two episode descriptions).
 * Every line is author 'bestie': it shows unsigned until Ren approves it. The review file
 * docs/lines/2026-11-ren-voice.md lists the same lines; a test keeps the two equal.
 *
 * Tags narrow who a line fits: a null tag fits everyone. `pillar` means her weakest Pillar.
 */
import type { Energy, Goal, Pillar } from './catalogueSeed.ts'
import type { LineMoment } from './morning.ts'

export interface SeedLine {
  body: string
  moment: LineMoment
  goal: Goal | null
  pillar: Pillar | null
  energy: Energy | null
}

const any = (body: string): SeedLine => ({ body, moment: 'any', goal: null, pillar: null, energy: null })
const at = (moment: LineMoment, body: string): SeedLine => ({ body, moment, goal: null, pillar: null, energy: null })
const goal = (g: Goal, body: string): SeedLine => ({ body, moment: 'any', goal: g, pillar: null, energy: null })
const pillar = (p: Pillar, body: string): SeedLine => ({ body, moment: 'any', goal: null, pillar: p, energy: null })
const energy = (e: Energy, body: string): SeedLine => ({ body, moment: 'any', goal: null, pillar: null, energy: e })

export const DAILY_LINES_SEED: SeedLine[] = [
  // Any day, anyone: the general line, rotated by day.
  any('What if today only asks for one small thing? Start there.'),
  any('Small habits, done most days, quietly change everything.'),
  any('No pressure, no expectations. Just a little time for you today. 🌸'),
  any('Ten minutes still counts. It always has.'),
  any('Motivation is optional. Showing up is the habit.'),
  any('Pick one thing for you before the day picks for you.'),
  any('A slow start is still a start.'),
  any('What would make today feel a little lighter? Begin with that.'),
  any('Good energy is contagious. Share some with a Stepsister today. ✨'),
  any("You don't need a full reset. You need the next small step."),
  any('Busy day? Even a short walk between things counts.'),
  any("What's one thing future you will thank you for tonight?"),
  any('Being intentional can be tiny: one glass of water, one deep breath.'),
  any('Rising is a daily thing, not a one-time thing. ✨'),
  any("Today doesn't have to be perfect to be good."),
  any("Take ownership of one small moment today. That's enough."),
  any('Make a little space for yourself today, even five minutes. 🌸'),
  any('Consistency beats intensity. Gentle wins today.'),
  any('Dubai sunsets are free. Catch one this week if you can. 🌸'),
  any('A beach walk, a quiet café, a new class. Dubai has room for all of it.'),

  // Her moment.
  at('streak', 'Three days in a row. Look at you showing up. ✨'),
  at('streak', 'Your Streak is proof that small and steady works.'),
  at('streak', 'Another day, another small yes to yourself. Keep it easy.'),
  at('streak', "You're building something real here, one day at a time."),
  at('rest_day', 'Yesterday was your rest day. Rest is part of the plan. 🌸'),
  at('rest_day', 'You rested, and your Streak stayed. Today, one small thing?'),
  at('rest_day', "Rest isn't a step back. It's how you keep going."),
  at('rest_day', 'Recharged? Pick something gentle and ease back in.'),
  at('comeback', 'Welcome back. No catching up needed, just today.'),
  at('comeback', "Life got busy? That's real. Start small again today. 🌸"),
  at('comeback', 'The best time to come back is right now. One tick is plenty.'),
  at('comeback', 'Missed a few days? Your Levels are still yours. Begin again.'),
  at('first_week', 'Welcome to Bestie. What if this week was just about small wins? ✨'),
  at('first_week', 'First week tip: one thing a day is plenty.'),
  at('first_week', 'Every routine starts somewhere. Yours starts here.'),
  at('first_week', 'New here? Be curious, not perfect.'),
  at('low_energy', 'Low energy is information, not failure. Go gently today.'),
  at('low_energy', 'Tired? A short walk and an early night still count. 🌸'),
  at('low_energy', 'On slow days, the smallest thing is the right thing.'),
  at('low_energy', 'Be soft with yourself today. Rest counts as care.'),

  // Her Goal.
  goal('recharge', 'What would refill your cup today? Make space for it.'),
  goal('recharge', 'Recharging is productive. Protect a quiet hour today.'),
  goal('unwind', 'Let today be a little slower. Unwinding is allowed. 🌸'),
  goal('unwind', 'What if the evening was just for you? Plan one calm thing.'),
  goal('focus', 'One clear priority today. Everything else can wait.'),
  goal('focus', 'Focus loves a fresh start: a walk first, then the hard thing.'),
  goal('glow', 'Glow starts inside: water, sleep, and something that makes you smile. ✨'),
  goal('glow', 'Feeling good shows. Do one thing today just because it feels good.'),
  goal('connect', "Who haven't you talked to in a while? Send her a message today."),
  goal('connect', 'Good conversations are wellness too. Make time for one. 🌸'),

  // Her weakest Pillar: a gentle nudge towards it.
  pillar('move', 'Move a little today. A walk around the block counts.'),
  pillar('move', 'Small movement, often, beats one big push. Stretch between things.'),
  pillar('meal', 'Something simple and nourishing today. Make it easy.'),
  pillar('meal', 'Eat one meal today slowly, without your phone.'),
  pillar('mindset', 'Ten quiet minutes for your mind today: a podcast, a page, a pause.'),
  pillar('mindset', "What's one thought worth writing down today?"),
  pillar('meet_up', 'Connection counts. Message a Stepsister, or join a Meet up. ✨'),
  pillar('meet_up', 'Plans with a friend this week? Small catch-ups add up.'),

  // Her energy at her last Check-in.
  energy('low', 'Low battery day? Choose the gentlest option and call it a win.'),
  energy('low', 'Easy does it today. Small still counts.'),
  energy('steady', 'Steady days are where habits are built. Keep it simple.'),
  energy('steady', 'A steady day is a good day to try one new thing.'),
  energy('high', "Energy's high today? Spend some of it on you. ✨"),
  energy('high', "Feeling strong? Try the class you've been saving for later."),
]

const MAX_CHARS = 90
const OFF_LIMITS = /\b(weight|kg|calories?|diet|skinny|fat|detox|cure|heal|supplements?|ozempic|anxiety|news|war|I|my|me)\b/i
const EMOJI = /\p{Extended_Pictographic}/gu

/** What breaks the voice rules in a line (DEC-013): length, off-limits words, emoji. Empty when it is fine. */
export function lineProblems(body: string): string[] {
  const problems: string[] = []
  if ([...body].length > MAX_CHARS) problems.push(`over ${MAX_CHARS} characters`)
  const word = OFF_LIMITS.exec(body)
  if (word) problems.push(`off-limits word: ${word[1]}`)
  const emoji = body.match(EMOJI) ?? []
  if (emoji.length > 1) problems.push('more than one emoji')
  if (emoji.some((e) => e !== '✨' && e !== '🌸')) problems.push('only ✨ or 🌸')
  if (emoji.length === 1 && !/[✨🌸]$/u.test(body) && ['✨', '🌸'].includes(emoji[0])) problems.push('emoji only at the end')
  return problems
}

const lit = (v: string | null) => (v === null ? 'null' : `'${v}'`)

/** The seed migration's statement. Bodies are dollar-quoted; a re-run changes nothing. */
export function linesSeedSql(): string {
  const rows = DAILY_LINES_SEED.map((l) => `  ($l$${l.body}$l$, 'bestie', ${lit(l.goal)}, ${lit(l.pillar)}, ${lit(l.energy)}, '${l.moment}')`)
  return `insert into bestie.daily_lines (body, author, goal, pillar, energy, moment) values\n${rows.join(',\n')}\non conflict (body) do nothing;\n`
}

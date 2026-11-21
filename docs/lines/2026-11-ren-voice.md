# Daily lines in Ren's voice: review with Ren (#74, DEC-013)

These are the first lines Morning with Bestie shows. They're **drafts in Ren's voice**, so each one shows **without a name** until Ren approves it. Once she does, it becomes hers and is signed "· Ren".

**How to review:**
- Edit, cut or add lines right here, in a PR comment, or by message.
- I'll mirror the changes in `supabase/functions/server/linesSeed.ts`. A test keeps this file, that one and the seed migration identical.
- Nothing is on live until the seed migration is applied, with Khairul's yes.

## The voice brief

Drawn from Ren's own writing: her Stepsisters walk write-up, her Directory notes and the Tea for Two episode descriptions.

- **She opens with a question.** "What if…?", "Thinking about…?"
- **Small and steady.** Habits, ten minutes, "the secret lies in the small things we do consistently".
- **Permission, not pressure.** "No pressure, no expectations — just a simple walk".
- **Ownership, kindly.** "taking ownership instead of waiting for motivation".
- **Dubai, made positive.** Summer as "a season of better routines". Sunsets, beaches, cafés.
- **Warm and plain.** Friends talking. One ✨ or 🌸 at most. "Stepsisters" for the community.

## The rules every line keeps

The test in `linesSeed.test.ts` enforces them:
- **Length and voice.** At most 90 characters. Spoken to her ("you"), never as "I/my/me", because Bestie mustn't claim Ren's life.
- **Topics.** No weight, bodies, food rules, diets, medical or supplement claims, and no news.
- **Emoji.** At most one, only ✨ or 🌸, only at the end, on at most 40% of the lines.

## The lines

Each line is tagged `[moment · goal · weakest pillar · energy]`, where `-` means it fits everyone.

How Bestie picks:
- With her personalisation Consent, Bestie picks the best-matching line she hasn't seen in 14 days.
- Without it, everyone sees the day's general line (`any · - · - · -`).

- [any · - · - · -] What if today only asks for one small thing? Start there.
- [any · - · - · -] Small habits, done most days, quietly change everything.
- [any · - · - · -] No pressure, no expectations. Just a little time for you today. 🌸
- [any · - · - · -] Ten minutes still counts. It always has.
- [any · - · - · -] Motivation is optional. Showing up is the habit.
- [any · - · - · -] Pick one thing for you before the day picks for you.
- [any · - · - · -] A slow start is still a start.
- [any · - · - · -] What would make today feel a little lighter? Begin with that.
- [any · - · - · -] Good energy is contagious. Share some with a Stepsister today. ✨
- [any · - · - · -] You don't need a full reset. You need the next small step.
- [any · - · - · -] Busy day? Even a short walk between things counts.
- [any · - · - · -] What's one thing future you will thank you for tonight?
- [any · - · - · -] Being intentional can be tiny: one glass of water, one deep breath.
- [any · - · - · -] Rising is a daily thing, not a one-time thing. ✨
- [any · - · - · -] Today doesn't have to be perfect to be good.
- [any · - · - · -] Take ownership of one small moment today. That's enough.
- [any · - · - · -] Make a little space for yourself today, even five minutes. 🌸
- [any · - · - · -] Consistency beats intensity. Gentle wins today.
- [any · - · - · -] Dubai sunsets are free. Catch one this week if you can. 🌸
- [any · - · - · -] A beach walk, a quiet café, a new class. Dubai has room for all of it.
- [streak · - · - · -] Three days in a row. Look at you showing up. ✨
- [streak · - · - · -] Your Streak is proof that small and steady works.
- [streak · - · - · -] Another day, another small yes to yourself. Keep it easy.
- [streak · - · - · -] You're building something real here, one day at a time.
- [rest_day · - · - · -] Yesterday was your rest day. Rest is part of the plan. 🌸
- [rest_day · - · - · -] You rested, and your Streak stayed. Today, one small thing?
- [rest_day · - · - · -] Rest isn't a step back. It's how you keep going.
- [rest_day · - · - · -] Recharged? Pick something gentle and ease back in.
- [comeback · - · - · -] Welcome back. No catching up needed, just today.
- [comeback · - · - · -] Life got busy? That's real. Start small again today. 🌸
- [comeback · - · - · -] The best time to come back is right now. One tick is plenty.
- [comeback · - · - · -] Missed a few days? Your Levels are still yours. Begin again.
- [first_week · - · - · -] Welcome to Bestie. What if this week was just about small wins? ✨
- [first_week · - · - · -] First week tip: one thing a day is plenty.
- [first_week · - · - · -] Every routine starts somewhere. Yours starts here.
- [first_week · - · - · -] New here? Be curious, not perfect.
- [low_energy · - · - · -] Low energy is information, not failure. Go gently today.
- [low_energy · - · - · -] Tired? A short walk and an early night still count. 🌸
- [low_energy · - · - · -] On slow days, the smallest thing is the right thing.
- [low_energy · - · - · -] Be soft with yourself today. Rest counts as care.
- [any · recharge · - · -] What would refill your cup today? Make space for it.
- [any · recharge · - · -] Recharging is productive. Protect a quiet hour today.
- [any · unwind · - · -] Let today be a little slower. Unwinding is allowed. 🌸
- [any · unwind · - · -] What if the evening was just for you? Plan one calm thing.
- [any · focus · - · -] One clear priority today. Everything else can wait.
- [any · focus · - · -] Focus loves a fresh start: a walk first, then the hard thing.
- [any · glow · - · -] Glow starts inside: water, sleep, and something that makes you smile. ✨
- [any · glow · - · -] Feeling good shows. Do one thing today just because it feels good.
- [any · connect · - · -] Who haven't you talked to in a while? Send her a message today.
- [any · connect · - · -] Good conversations are wellness too. Make time for one. 🌸
- [any · - · move · -] Move a little today. A walk around the block counts.
- [any · - · move · -] Small movement, often, beats one big push. Stretch between things.
- [any · - · meal · -] Something simple and nourishing today. Make it easy.
- [any · - · meal · -] Eat one meal today slowly, without your phone.
- [any · - · mindset · -] Ten quiet minutes for your mind today: a podcast, a page, a pause.
- [any · - · mindset · -] What's one thought worth writing down today?
- [any · - · meet_up · -] Connection counts. Message a Stepsister, or join a Meet up. ✨
- [any · - · meet_up · -] Plans with a friend this week? Small catch-ups add up.
- [any · - · - · low] Low battery day? Choose the gentlest option and call it a win.
- [any · - · - · low] Easy does it today. Small still counts.
- [any · - · - · steady] Steady days are where habits are built. Keep it simple.
- [any · - · - · steady] A steady day is a good day to try one new thing.
- [any · - · - · high] Energy's high today? Spend some of it on you. ✨
- [any · - · - · high] Feeling strong? Try the class you've been saving for later.

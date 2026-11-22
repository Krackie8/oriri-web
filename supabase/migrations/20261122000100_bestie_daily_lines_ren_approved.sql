-- #74 (DEC-013): Ren approved all 64 daily lines of the first bank on 2026-11-22, unchanged.
-- They become hers: author 'ren', signed "· Ren". Generated from RENS_APPROVALS in
-- supabase/functions/server/linesSeed.ts (a test keeps them equal). Data only, no schema change.
-- Keyed to the exact bodies, not to every 'bestie' row, so a line added later stays unsigned.
-- Aborts (and changes nothing) unless all 64 are found still unsigned.
do $approve$
declare signed int;
begin
  update bestie.daily_lines set author = 'ren'
    where author = 'bestie' and body in (
      $l$What if today only asks for one small thing? Start there.$l$,
      $l$Small habits, done most days, quietly change everything.$l$,
      $l$No pressure, no expectations. Just a little time for you today. 🌸$l$,
      $l$Ten minutes still counts. It always has.$l$,
      $l$Motivation is optional. Showing up is the habit.$l$,
      $l$Pick one thing for you before the day picks for you.$l$,
      $l$A slow start is still a start.$l$,
      $l$What would make today feel a little lighter? Begin with that.$l$,
      $l$Good energy is contagious. Share some with a Stepsister today. ✨$l$,
      $l$You don't need a full reset. You need the next small step.$l$,
      $l$Busy day? Even a short walk between things counts.$l$,
      $l$What's one thing future you will thank you for tonight?$l$,
      $l$Being intentional can be tiny: one glass of water, one deep breath.$l$,
      $l$Rising is a daily thing, not a one-time thing. ✨$l$,
      $l$Today doesn't have to be perfect to be good.$l$,
      $l$Take ownership of one small moment today. That's enough.$l$,
      $l$Make a little space for yourself today, even five minutes. 🌸$l$,
      $l$Consistency beats intensity. Gentle wins today.$l$,
      $l$Dubai sunsets are free. Catch one this week if you can. 🌸$l$,
      $l$A beach walk, a quiet café, a new class. Dubai has room for all of it.$l$,
      $l$Three days in a row. Look at you showing up. ✨$l$,
      $l$Your Streak is proof that small and steady works.$l$,
      $l$Another day, another small yes to yourself. Keep it easy.$l$,
      $l$You're building something real here, one day at a time.$l$,
      $l$Yesterday was your rest day. Rest is part of the plan. 🌸$l$,
      $l$You rested, and your Streak stayed. Today, one small thing?$l$,
      $l$Rest isn't a step back. It's how you keep going.$l$,
      $l$Recharged? Pick something gentle and ease back in.$l$,
      $l$Welcome back. No catching up needed, just today.$l$,
      $l$Life got busy? That's real. Start small again today. 🌸$l$,
      $l$The best time to come back is right now. One tick is plenty.$l$,
      $l$Missed a few days? Your Levels are still yours. Begin again.$l$,
      $l$Welcome to Bestie. What if this week was just about small wins? ✨$l$,
      $l$First week tip: one thing a day is plenty.$l$,
      $l$Every routine starts somewhere. Yours starts here.$l$,
      $l$New here? Be curious, not perfect.$l$,
      $l$Low energy is information, not failure. Go gently today.$l$,
      $l$Tired? A short walk and an early night still count. 🌸$l$,
      $l$On slow days, the smallest thing is the right thing.$l$,
      $l$Be soft with yourself today. Rest counts as care.$l$,
      $l$What would refill your cup today? Make space for it.$l$,
      $l$Recharging is productive. Protect a quiet hour today.$l$,
      $l$Let today be a little slower. Unwinding is allowed. 🌸$l$,
      $l$What if the evening was just for you? Plan one calm thing.$l$,
      $l$One clear priority today. Everything else can wait.$l$,
      $l$Focus loves a fresh start: a walk first, then the hard thing.$l$,
      $l$Glow starts inside: water, sleep, and something that makes you smile. ✨$l$,
      $l$Feeling good shows. Do one thing today just because it feels good.$l$,
      $l$Who haven't you talked to in a while? Send her a message today.$l$,
      $l$Good conversations are wellness too. Make time for one. 🌸$l$,
      $l$Move a little today. A walk around the block counts.$l$,
      $l$Small movement, often, beats one big push. Stretch between things.$l$,
      $l$Something simple and nourishing today. Make it easy.$l$,
      $l$Eat one meal today slowly, without your phone.$l$,
      $l$Ten quiet minutes for your mind today: a podcast, a page, a pause.$l$,
      $l$What's one thought worth writing down today?$l$,
      $l$Connection counts. Message a Stepsister, or join a Meet up. ✨$l$,
      $l$Plans with a friend this week? Small catch-ups add up.$l$,
      $l$Low battery day? Choose the gentlest option and call it a win.$l$,
      $l$Easy does it today. Small still counts.$l$,
      $l$Steady days are where habits are built. Keep it simple.$l$,
      $l$A steady day is a good day to try one new thing.$l$,
      $l$Energy's high today? Spend some of it on you. ✨$l$,
      $l$Feeling strong? Try the class you've been saving for later.$l$
    );
  get diagnostics signed = row_count;
  if signed <> 64 then
    raise exception 'expected to sign 64 lines as Ren, signed %', signed;
  end if;
end $approve$;

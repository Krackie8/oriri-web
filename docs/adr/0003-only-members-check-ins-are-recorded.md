# Only Members' Check-ins are recorded; a visitor's plan stays in her browser

Bestie records every Check-in and Suggestion so it can learn. A signed-out visitor can still check in on `/plan`, but she has given no Consent (wellness signals, personalisation). Recording her energy, time, budget and goal without one is shaky under the UAE PDPL. So a visitor keeps today's browser-built plan, nothing about it reaches the server, and she is invited to Join. A Member gets her Day plan from Bestie on the server, and only hers is recorded. On `/plan/day` a Member sees only the server plan; a plan left in her browser from before she joined is ignored, not copied.

## Considered options

- **Record visitors' Check-ins without a Member.** More learning data, but no Consent covers it.
- **Require Joining before any Check-in.** Every Check-in recorded, but it removes the try-before-you-join hook.

## Consequences

- Two plan builders exist for a while: the browser engine for visitors and Bestie on the server for Members. They must not be merged into one recorded path by accident.
- A Member's swap is hidden until it can be recorded on the server.
- A Member's Check-in (energy, time, budget, Goal, area) is recorded under the Terms she accepted to Join, because the Day plan is the service itself. The optional "wellness signals" Consent is kept for health-type data (e.g. Apple Health later), not for the Check-in. A Check-in records mood, not health: energy and a Goal are not health data, and Oriri does not collect health data. (Proposed by Claude on 2026-11-16, confirmed by Khairul on 2026-11-17, DEC-007.)

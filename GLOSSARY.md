# Glossary

Domain language for Oriri. Use these terms in code, issues and reviews.

**Wellness site**: the live Oriri product, routed by `WellnessSite.tsx` (home, Plan, Bestie, Membership, Shop, Podcast, About, Profile). All new work targets it. Podcast and Nourish will return as features *inside* the Wellness site.
_Avoid_: "the new app".

**Legacy app**: the older podcast/Nourish/VIP app rendered by `App.tsx` for any non-Wellness path. Frozen: no new features, not migrated to the Function client; its features get rebuilt inside the Wellness site.
_Avoid_: "the old site", "AppLayout".

**Function client**: the single client module through which the Wellness site talks to the edge function `make-server-a278ea32`. Callers use named domain actions; only the Function client knows paths, auth and the Relay.

**Relay**: the same-origin path `/api/fn/*` (`.htaccess` → `public/api/fn.php`) that proxies calls to the edge function, because iPhone Safari drops some cross-site requests after preflight. Falls back to a direct call when broken.

**Free day**: the one free Bestie day a visitor claims with an email. Claims that fail to send are queued locally and retried on the next visit, so the plan still unlocks.

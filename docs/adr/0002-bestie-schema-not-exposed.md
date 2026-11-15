# Bestie's tables live in a private schema reached only through the edge function

Bestie runs on the server. Every Suggestion is recorded before a Member sees it, and only Suggestions Bestie actually made can be completed. If the tables sat in Supabase's exposed `public` schema, the browser could read and write them directly through the database API. That would bypass those rules, and the access rules would become the only lock. So Bestie's tables live in a separate `bestie` schema that the API doesn't expose. The edge function is the only way in, and per-Member access rules stay on as a second lock.

## Considered options

- **Tables in `public`, protected only by access rules.** Rejected. It's the Supabase default, but the anti-gaming and recording rules would have to be duplicated in database policies, and the project already has flagged functions in `public` that anyone can call.

## Consequences

- The client never queries Bestie data directly. Everything goes through the Function client to the edge function.
- Admin tools for Ren also go through the edge function.

# Bestie's data lives in Postgres tables, not the key-value store

Bestie learns from history: which Suggestion followed which Check-in, and what the Member did with it. That history has to be queryable across Members and over time, and access has to be enforced per Member. So Bestie's data (Members, Check-ins, Suggestions, Completions, Levels) goes in relational Postgres tables with row-level security.

The rest of Oriri stays in the existing key-value table (`kv_store_a278ea32`) for now.

## Considered options

- **Keep everything in the key-value table** (the status quo, which holds 18k+ rows). Rejected: each read is a prefix scan with no joins, no aggregation and no per-row access rules, which is the opposite of what learning needs.
- **Move all of Oriri to tables now.** Rejected: big migration cost for data that doesn't feed Bestie.

## Consequences

- The unused relational tables from the old podcast schema (episodes, orders, and so on, all empty) should be dropped or ignored so they aren't confused with the Bestie tables.
- The edge function, and later the Function client, read and write Bestie data through the tables, not through key-value keys.

-- #73: Levels, Status and the spider chart (DEC-011, grilling 2026-11-21).
-- The points ledger and member_levels came with #68. This bounds what they can hold and adds the
-- indexes the edge function needs. Additive only: no new tables, no data.

-- Every row a sum reads is bounded: a Completion earns 5, 10 or 15 per Pillar, and an undo
-- reverses it exactly. With at most 2 rows per Completion per reason, no sum can approach int range.
alter table bestie.points
  add constraint points_reason check (reason in ('completion', 'undo')),
  add constraint points_amount check (amount <> 0 and amount between -15 and 15),
  add constraint points_sign check ((reason = 'completion') = (amount > 0)),
  -- Points come only from Completions for now. A reward or grant later relaxes this on purpose.
  add constraint points_has_completion check (completion_id is not null);

-- One award and at most one reversal per Completion and Pillar. Completing again after an undo
-- is a new Completion, with new rows.
create unique index points_one_award on bestie.points (completion_id, pillar) where reason = 'completion';
create unique index points_one_reversal on bestie.points (completion_id, pillar) where reason = 'undo';
-- The chart's "30 days ago" layer reads her ledger by time.
create index points_member_time_idx on bestie.points (member_id, created_at);

-- A Status is stored as keys (shape: balanced, one Pillar, or a sorted pair joined by +; tier: one
-- of four). Display names are placeholders that live in code, so renaming them needs no migration.
alter table bestie.member_levels
  add constraint member_levels_status_keys check (
    kind <> 'status' or (
      status_tier in ('rising', 'glowing', 'radiant', 'iconic')
      and status_shape ~ '^(balanced|move|meal|mindset|meet_up|(meal|meet_up|mindset|move)\+(meal|meet_up|mindset|move))$'));

-- #72: Completing with Proof (DEC-003, grilling 2026-11-20).
-- The completions table came with #68. This adds what the Proof rules need:
-- a private bucket for the optional photos, a limit on the Reflection, and an index for
-- the caps and the quiet flag, which read today's live Completions.

-- Photos: private, JPEG only (the edge function strips every metadata segment first), 5 MB.
-- No storage.objects policy names this bucket, so only the edge function's service_role
-- can read or write it; Members see their photos through short-lived signed URLs.
-- Photos are kept 12 months; the sweeper that removes older ones is its own ticket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bestie-photos', 'bestie-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- A Reflection is one line: not blank, at most 280 characters.
alter table bestie.completions
  add constraint completions_reflection_len check (reflection is null or char_length(reflection) between 1 and 280);

-- One Meal per mealtime, one reach-out a day, and the flag all read her live Completions by day.
create index completions_member_live_idx on bestie.completions (member_id, completed_at) where undone_at is null;

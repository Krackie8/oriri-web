-- #74 Morning with Bestie (DEC-013): tagged daily lines, and the line each Member was shown each day.
-- Additive only. bestie.daily_lines is empty on live, so the new checks meet no existing row.

-- Who wrote a line, and what it fits. A null tag fits everyone; moment 'any' fits every day.
alter table bestie.daily_lines
  add column author text not null default 'bestie' check (author in ('ren', 'bestie')),
  add column goal bestie.goal,
  add column pillar bestie.pillar,
  add column energy bestie.energy,
  add column moment text not null default 'any'
    check (moment in ('any', 'streak', 'rest_day', 'comeback', 'first_week', 'low_energy')),
  add constraint daily_lines_body check (char_length(btrim(body)) between 1 and 90);
create unique index daily_lines_body_unique on bestie.daily_lines (body);
comment on column bestie.daily_lines.author is 'ren: written or approved by Ren, signed with her name. bestie: drafted in her voice, shown unsigned.';
comment on column bestie.daily_lines.set_name is 'Unused until the Admin revamp adds seasonal sets.';

-- The line she was shown, one per Dubai day: keeps it stable on reload, avoids repeats, and is
-- what Bestie can later learn from. Recorded only with her personalisation Consent.
create table bestie.member_lines (
  member_id uuid not null references bestie.members(id) on delete cascade,
  line_id uuid not null references bestie.daily_lines(id) on delete cascade,
  shown_on date not null,
  created_at timestamptz not null default now(),
  primary key (member_id, shown_on)
);
create index member_lines_line_idx on bestie.member_lines (line_id);

revoke all on bestie.member_lines from public, anon, authenticated;
grant select on bestie.member_lines to authenticated;
grant all on bestie.member_lines to service_role;
alter table bestie.member_lines enable row level security;
alter table bestie.member_lines force row level security;
create policy member_lines_own on bestie.member_lines for select to authenticated using (member_id = (select auth.uid()));

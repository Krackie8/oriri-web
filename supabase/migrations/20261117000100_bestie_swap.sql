-- #71: swap (pick from three) and the choices she passed on (DEC-008).
-- A swap marks the old Suggestion 'swapped'; her pick ('shown') and the ones she passed on
-- ('not_picked') point back to it through replaces_id.

alter type bestie.suggestion_outcome add value if not exists 'not_picked';

alter table bestie.suggestions add column replaces_id uuid references bestie.suggestions(id) on delete set null;
create index suggestions_replaces_idx on bestie.suggestions (replaces_id) where replaces_id is not null;
comment on column bestie.suggestions.replaces_id is 'For a swap: the Suggestion she swapped away. Set on her pick and on the choices she passed on.';

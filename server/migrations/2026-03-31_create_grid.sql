-- Saved game grids tied to user account (Better Auth: "user" table, id text).
-- Apply against DATABASE_URL, e.g.:
--   psql "$DATABASE_URL" -f migrations/2026-03-31_create_grid.sql

create table if not exists "grid" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "name" text,
  "data" jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create index if not exists "grid_userId_idx" on "grid" ("userId");

create index if not exists "grid_userId_updatedAt_idx" on "grid" ("userId", "updatedAt" desc);

create or replace function "grid_set_updated_at"()
returns trigger as $$
begin
  new."updatedAt" = current_timestamp;
  return new;
end;
$$ language plpgsql;

drop trigger if exists "grid_set_updated_at_trg" on "grid";

create trigger "grid_set_updated_at_trg"
  before update on "grid"
  for each row
  execute function "grid_set_updated_at"();

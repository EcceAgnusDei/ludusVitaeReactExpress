-- Saved game grids tied to user account (Better Auth: "user" table, id text).
-- Apply against DATABASE_URL, e.g.:
--   psql "$DATABASE_URL" -f migrations/2026-03-31_create_grid.sql

create table if not exists "grid" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "name" text,
  "data" jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default current_timestamp
);

create index if not exists "grid_userId_idx" on "grid" ("userId");

create index if not exists "grid_userId_createdAt_idx" on "grid" ("userId", "createdAt" desc);

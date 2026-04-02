-- Likes on saved grids (Better Auth: "user" table; "grid" table).
-- Apply against DATABASE_URL, e.g.:
--   psql "$DATABASE_URL" -f migrations/2026-04-02_grid_like.sql

create table if not exists "grid_like" (
  "gridId" text not null references "grid" ("id") on delete cascade,
  "userId" text not null references "user" ("id") on delete cascade,
  "createdAt" timestamptz not null default current_timestamp,
  primary key ("gridId", "userId")
);

create index if not exists "grid_like_gridId_idx" on "grid_like" ("gridId");

create index if not exists "grid_like_userId_idx" on "grid_like" ("userId");

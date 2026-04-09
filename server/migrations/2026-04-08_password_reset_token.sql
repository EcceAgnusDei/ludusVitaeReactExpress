-- Password reset tokens (Better Auth: "user" table, id text).
-- Store only hashes of opaque tokens; raw token is sent once by email.
-- Apply against DATABASE_URL, e.g.:
--   psql "$DATABASE_URL" -f migrations/2026-04-08_password_reset_token.sql

create table if not exists "password_reset_token" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "tokenHash" text not null,
  "expiresAt" timestamptz not null,
  "usedAt" timestamptz,
  "createdAt" timestamptz not null default current_timestamp
);

create unique index if not exists "password_reset_token_tokenHash_key"
  on "password_reset_token" ("tokenHash");

create index if not exists "password_reset_token_userId_idx"
  on "password_reset_token" ("userId");

create index if not exists "password_reset_token_expiresAt_idx"
  on "password_reset_token" ("expiresAt");

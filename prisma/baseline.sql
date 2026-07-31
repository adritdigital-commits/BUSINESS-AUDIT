-- Baseline a Supabase database so `prisma migrate deploy` can run on it.
--
-- Why this is needed
-- ------------------
-- schema.prisma declares `schemas = ["auth", "public"]`, so Prisma considers
-- BOTH schemas part of the database it manages. On Supabase, `auth` is never
-- empty — GoTrue provisions `auth.users` and friends when the project is
-- created. Prisma therefore sees a non-empty database with no migration
-- history and refuses to run:
--
--     Error: P3005
--     The database schema is not empty.
--
-- ...even when `public` has zero tables and every migration genuinely still
-- needs to be applied.
--
-- Creating the (empty) migration-history table is the documented way out:
-- with the table present, `migrate deploy` stops treating the database as
-- "existing and unmanaged" and applies all three migrations in order.
--
-- This is NOT `migrate resolve --applied`: no migration is marked as done,
-- so nothing is skipped. Running it against an already-migrated database is
-- a no-op.
--
-- Must run over DIRECT_URL (port 5432). The pooler cannot run DDL.

CREATE TABLE IF NOT EXISTS public."_prisma_migrations" (
    id                  VARCHAR(36) PRIMARY KEY NOT NULL,
    checksum            VARCHAR(64) NOT NULL,
    finished_at         TIMESTAMPTZ,
    migration_name      VARCHAR(255) NOT NULL,
    logs                TEXT,
    rolled_back_at      TIMESTAMPTZ,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);

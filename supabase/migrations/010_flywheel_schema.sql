-- 010_flywheel_schema.sql
-- PRODUCT.md section 3 reconciled with the live schema (shared with myreckie.com).
-- Run manually in the Supabase SQL editor. Additive only — no renames, no drops,
-- no changes to existing rows, columns, or policies.
--
-- Reconciliation notes:
--   * The live table is `recs` (PRODUCT.md calls it "reckies" — name kept as-is).
--   * `saves` already exists keyed on (user_id, rec_id); it gains canonical_id
--     rather than being recreated.
--   * `profiles.avatar_url` already exists (005); the add below is a no-op.

-- ============================================================
-- 1. profiles: bio ("your taste in one line")
-- ============================================================

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text;

-- ============================================================
-- 2. recs: lineage + canonical grouping
--    "The two most important columns in the schema." (PRODUCT.md §3)
-- ============================================================

-- source_reckie_id: the reckie this one was passed on from (self-reference).
-- ON DELETE SET NULL so deleting an upstream reckie never deletes the chain
-- below it — the chain just loses that link.
alter table public.recs
  add column if not exists source_reckie_id uuid references public.recs (id) on delete set null;

-- canonical_id: groups all reckies of the same real-world thing.
-- Plain uuid group key, NOT a foreign key — there is no canonical_things table (yet).
alter table public.recs
  add column if not exists canonical_id uuid;

create index if not exists recs_source_reckie_id_idx on public.recs (source_reckie_id);
create index if not exists recs_canonical_id_idx on public.recs (canonical_id);

-- ============================================================
-- 3. cosigns: backing someone's reckie, with an optional one-line take
-- ============================================================

-- PRODUCT.md wants pk (canonical_id, user_id), but canonical_id is not yet
-- backfilled on existing recs, so it can't be a primary key today. Instead:
-- surrogate pk + uniqueness per reckie now, plus a partial unique index that
-- enforces one co-sign per person per *thing* as canonical_ids get populated.
create table if not exists public.cosigns (
  id uuid primary key default gen_random_uuid(),
  reckie_id uuid not null references public.recs (id) on delete cascade,
  canonical_id uuid,
  user_id uuid not null references public.profiles (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, reckie_id)
);

create unique index if not exists cosigns_user_canonical_idx
  on public.cosigns (user_id, canonical_id)
  where canonical_id is not null;

create index if not exists cosigns_reckie_id_idx on public.cosigns (reckie_id);
create index if not exists cosigns_canonical_id_idx on public.cosigns (canonical_id);

alter table public.cosigns enable row level security;

-- Readable by signed-in users (the co-sign stack is social proof);
-- writable only by the co-signer. Mirrors the follows/saves pattern.
drop policy if exists "cosigns_select_authenticated" on public.cosigns;
create policy "cosigns_select_authenticated"
  on public.cosigns for select
  to authenticated
  using (true);

drop policy if exists "cosigns_insert_own" on public.cosigns;
create policy "cosigns_insert_own"
  on public.cosigns for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "cosigns_update_own" on public.cosigns;
create policy "cosigns_update_own"
  on public.cosigns for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "cosigns_delete_own" on public.cosigns;
create policy "cosigns_delete_own"
  on public.cosigns for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- 4. saves: extend the EXISTING table (do not recreate)
-- ============================================================

-- Existing shape: (user_id, rec_id) pk + RLS, used by the live web app.
-- Adds canonical_id so saves can aggregate per real-world thing.
alter table public.saves
  add column if not exists canonical_id uuid;

create index if not exists saves_canonical_id_idx on public.saves (canonical_id);

-- One save per person per thing, enforced only once canonical_ids exist.
-- All current rows have NULL canonical_id, so this cannot affect the web app.
create unique index if not exists saves_user_canonical_idx
  on public.saves (user_id, canonical_id)
  where canonical_id is not null;

-- ============================================================
-- 5. tried: the "tried it" state + private life-log seed
-- ============================================================

-- Same canonical-vs-rec compromise as cosigns: reckie-keyed today,
-- canonical uniqueness enforced as canonical_ids get populated.
create table if not exists public.tried (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reckie_id uuid not null references public.recs (id) on delete cascade,
  canonical_id uuid,
  private_note text,
  loved boolean,
  tried_at timestamptz not null default now(),
  unique (user_id, reckie_id)
);

create unique index if not exists tried_user_canonical_idx
  on public.tried (user_id, canonical_id)
  where canonical_id is not null;

create index if not exists tried_reckie_id_idx on public.tried (reckie_id);

alter table public.tried enable row level security;

-- PRIVATE: owner-only for ALL operations, unlike every other table.
-- private_note is the life-log ("its magic is that it's yours and unperformed",
-- PRODUCT.md §9) and `loved` is private dissent (§6). Nothing here is circle-visible.
drop policy if exists "tried_select_own" on public.tried;
create policy "tried_select_own"
  on public.tried for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "tried_insert_own" on public.tried;
create policy "tried_insert_own"
  on public.tried for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "tried_update_own" on public.tried;
create policy "tried_update_own"
  on public.tried for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "tried_delete_own" on public.tried;
create policy "tried_delete_own"
  on public.tried for delete
  to authenticated
  using (auth.uid() = user_id);

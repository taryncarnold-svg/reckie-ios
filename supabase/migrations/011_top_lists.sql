-- 011_top_lists.sql — Top 8 ranked lists (PRODUCT.md §8)
--
-- ⚠️ NOT YET RUN. This database is shared with the live web app at
-- myreckie.com — review before executing, same as 010. Purely additive:
-- two new tables, no changes to existing ones. Copy into
-- reckie-web/supabase/migrations/ when approved, then run in the Supabase
-- SQL editor.

-- A user's optional ranked list, scoped to a category
-- (e.g. "Top 8 Restaurants", "Top 5 Must-Watch").
create table if not exists public.top_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

-- Ordered entries. position is 1-based; capped at 8 by a check, not the UI alone.
create table if not exists public.top_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.top_lists (id) on delete cascade,
  reckie_id uuid not null references public.recs (id) on delete cascade,
  position smallint not null check (position between 1 and 8),
  unique (list_id, position),
  unique (list_id, reckie_id)
);

create index if not exists top_lists_user_idx on public.top_lists (user_id);
create index if not exists top_list_items_list_idx on public.top_list_items (list_id);

-- RLS: everyone signed-in can view (a Top 8 is the shareable artifact);
-- only the owner can build or edit theirs.
alter table public.top_lists enable row level security;
alter table public.top_list_items enable row level security;

create policy "top_lists_select" on public.top_lists
  for select to authenticated using (true);
create policy "top_lists_insert" on public.top_lists
  for insert to authenticated with check (auth.uid() = user_id);
create policy "top_lists_update" on public.top_lists
  for update to authenticated using (auth.uid() = user_id);
create policy "top_lists_delete" on public.top_lists
  for delete to authenticated using (auth.uid() = user_id);

create policy "top_list_items_select" on public.top_list_items
  for select to authenticated using (true);
create policy "top_list_items_insert" on public.top_list_items
  for insert to authenticated with check (
    exists (select 1 from public.top_lists l where l.id = list_id and l.user_id = auth.uid())
  );
create policy "top_list_items_update" on public.top_list_items
  for update to authenticated using (
    exists (select 1 from public.top_lists l where l.id = list_id and l.user_id = auth.uid())
  );
create policy "top_list_items_delete" on public.top_list_items
  for delete to authenticated using (
    exists (select 1 from public.top_lists l where l.id = list_id and l.user_id = auth.uid())
  );

-- =============================================================================
-- Huisturf - 0002_rls.sql
-- Row Level Security policies.
--   bewoner: mag turven, eigen data + klassement bekijken
--   admin  : mag alles
-- De server gebruikt voor admin-only bewerkingen de service_role key, die RLS
-- omzeilt. Deze policies beveiligen de gewone (anon/auth) client.
-- =============================================================================

alter table public.users             enable row level security;
alter table public.residents         enable row level security;
alter table public.products          enable row level security;
alter table public.turf_entries      enable row level security;
alter table public.imports           enable row level security;
alter table public.import_rows       enable row level security;
alter table public.corrections       enable row level security;
alter table public.monthly_snapshots enable row level security;

-- USERS -----------------------------------------------------------------------
drop policy if exists users_select_self_or_admin on public.users;
create policy users_select_self_or_admin on public.users
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists users_update_admin on public.users;
create policy users_update_admin on public.users
  for update using (public.is_admin()) with check (public.is_admin());

-- RESIDENTS -------------------------------------------------------------------
-- Iedereen die ingelogd is mag bewoners zien (nodig om te turven / klassement).
drop policy if exists residents_select_all on public.residents;
create policy residents_select_all on public.residents
  for select using (auth.role() = 'authenticated');

drop policy if exists residents_admin_write on public.residents;
create policy residents_admin_write on public.residents
  for all using (public.is_admin()) with check (public.is_admin());

-- PRODUCTS --------------------------------------------------------------------
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (auth.role() = 'authenticated');

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- TURF_ENTRIES ----------------------------------------------------------------
-- Lezen: iedereen die ingelogd is (klassement is openbaar binnen het huis).
drop policy if exists turf_select_all on public.turf_entries;
create policy turf_select_all on public.turf_entries
  for select using (auth.role() = 'authenticated');

-- Toevoegen: iedere ingelogde gebruiker mag turven.
drop policy if exists turf_insert_auth on public.turf_entries;
create policy turf_insert_auth on public.turf_entries
  for insert with check (auth.role() = 'authenticated' and quantity > 0);

-- Bewerken: admin altijd; bewoner mag eigen entry binnen 5 minuten (undo).
drop policy if exists turf_update_admin_or_recent_self on public.turf_entries;
create policy turf_update_admin_or_recent_self on public.turf_entries
  for update using (
    public.is_admin()
    or (created_by = auth.uid() and created_at > now() - interval '5 minutes')
  ) with check (
    public.is_admin()
    or (created_by = auth.uid() and created_at > now() - interval '5 minutes')
  );

-- Verwijderen: admin altijd; bewoner mag eigen entry binnen 5 minuten (undo).
drop policy if exists turf_delete_admin_or_recent_self on public.turf_entries;
create policy turf_delete_admin_or_recent_self on public.turf_entries
  for delete using (
    public.is_admin()
    or (created_by = auth.uid() and created_at > now() - interval '5 minutes')
  );

-- IMPORTS / IMPORT_ROWS (admin only) -----------------------------------------
drop policy if exists imports_admin_all on public.imports;
create policy imports_admin_all on public.imports
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists import_rows_admin_all on public.import_rows;
create policy import_rows_admin_all on public.import_rows
  for all using (public.is_admin()) with check (public.is_admin());

-- CORRECTIONS -----------------------------------------------------------------
-- Lezen: admin (volledige audit log). Schrijven gebeurt server-side.
drop policy if exists corrections_select_admin on public.corrections;
create policy corrections_select_admin on public.corrections
  for select using (public.is_admin());

drop policy if exists corrections_insert_auth on public.corrections;
create policy corrections_insert_auth on public.corrections
  for insert with check (auth.role() = 'authenticated');

-- MONTHLY_SNAPSHOTS -----------------------------------------------------------
drop policy if exists snapshots_select_all on public.monthly_snapshots;
create policy snapshots_select_all on public.monthly_snapshots
  for select using (auth.role() = 'authenticated');

drop policy if exists snapshots_admin_write on public.monthly_snapshots;
create policy snapshots_admin_write on public.monthly_snapshots
  for all using (public.is_admin()) with check (public.is_admin());

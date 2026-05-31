-- =============================================================================
-- Huisturf - 0001_schema.sql
-- Volledig database schema voor de turf app.
-- Draai dit in de Supabase SQL Editor (of via de Supabase CLI) op een vers project.
-- =============================================================================

-- Extensies -------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================
do $$ begin
  create type user_role as enum ('bewoner', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type import_status as enum ('preview', 'committed', 'failed', 'reverted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type import_row_status as enum ('pending', 'ok', 'error', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type correction_action as enum ('create', 'update', 'delete', 'undo');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- USERS  (gekoppeld aan auth.users)
-- Houdt de rol bij en koppelt optioneel aan een resident.
-- =============================================================================
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  display_name text,
  role        user_role not null default 'bewoner',
  resident_id uuid,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- RESIDENTS (huisgenoten) - de personen die geturfd worden.
-- Bij vertrek -> active = false (soft delete) zodat oude rapportages kloppen.
-- =============================================================================
create table if not exists public.residents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  active      boolean not null default true,
  avatar_emoji text default '🧑',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- koppel users.resident_id pas nu (na aanmaak residents)
alter table public.users
  drop constraint if exists users_resident_id_fkey;
alter table public.users
  add constraint users_resident_id_fkey
  foreign key (resident_id) references public.residents(id) on delete set null;

-- =============================================================================
-- PRODUCTS (bier, koffie, eieren, later uitbreidbaar)
-- =============================================================================
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,          -- 'bier' | 'koffie' | 'ei' | ...
  name        text not null,                 -- weergavenaam
  emoji       text not null default '🍺',
  color       text not null default '#f59e0b',
  price_cents integer not null default 0,    -- prijs per stuk in centen (0 = gratis/onbekend)
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- TURF_ENTRIES (de daadwerkelijke turf acties)
-- =============================================================================
create table if not exists public.turf_entries (
  id          uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete restrict,
  product_id  uuid not null references public.products(id)  on delete restrict,
  quantity    integer not null check (quantity > 0),
  occurred_at timestamptz not null default now(),
  -- gedenormaliseerd voor snelle maandfilters / rapportages.
  -- Wordt automatisch gevuld door een trigger (Amsterdamse tijd). We gebruiken
  -- geen GENERATED kolom omdat de tijdzone-conversie niet IMMUTABLE is.
  period_month text,
  created_by  uuid references public.users(id) on delete set null,
  import_id   uuid,                          -- gevuld als de entry uit een import komt
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists turf_entries_period_idx   on public.turf_entries(period_month);
create index if not exists turf_entries_resident_idx  on public.turf_entries(resident_id);
create index if not exists turf_entries_product_idx   on public.turf_entries(product_id);
create index if not exists turf_entries_occurred_idx  on public.turf_entries(occurred_at desc);

-- =============================================================================
-- IMPORTS + IMPORT_ROWS (Excel/CSV import met history & dedupe)
-- =============================================================================
create table if not exists public.imports (
  id            uuid primary key default gen_random_uuid(),
  filename      text not null,
  file_hash     text not null,               -- sha-256 van de inhoud -> dubbele import detectie
  status        import_status not null default 'preview',
  mapping       jsonb not null default '{}'::jsonb,  -- kolom -> veld mapping
  total_rows    integer not null default 0,
  success_rows  integer not null default 0,
  error_rows    integer not null default 0,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  committed_at  timestamptz
);

create unique index if not exists imports_hash_committed_idx
  on public.imports(file_hash)
  where status = 'committed';

alter table public.turf_entries
  drop constraint if exists turf_entries_import_id_fkey;
alter table public.turf_entries
  add constraint turf_entries_import_id_fkey
  foreign key (import_id) references public.imports(id) on delete set null;

create table if not exists public.import_rows (
  id          uuid primary key default gen_random_uuid(),
  import_id   uuid not null references public.imports(id) on delete cascade,
  row_number  integer not null,
  raw         jsonb not null default '{}'::jsonb,  -- originele kolommen
  resident_id uuid references public.residents(id) on delete set null,
  product_id  uuid references public.products(id) on delete set null,
  quantity    integer,
  occurred_at timestamptz,
  status      import_row_status not null default 'pending',
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists import_rows_import_idx on public.import_rows(import_id);

-- =============================================================================
-- CORRECTIONS (audit log voor wijzigingen/verwijderingen/undo)
-- =============================================================================
create table if not exists public.corrections (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid,                         -- kan null zijn als entry verwijderd is
  action        correction_action not null,
  old_values    jsonb,
  new_values    jsonb,
  reason        text,
  performed_by  uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists corrections_created_idx on public.corrections(created_at desc);

-- =============================================================================
-- MONTHLY_SNAPSHOTS (optioneel: bevroren maandstanden voor klassement/historie)
-- =============================================================================
create table if not exists public.monthly_snapshots (
  id            uuid primary key default gen_random_uuid(),
  period_month  text not null,
  resident_id   uuid not null references public.residents(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  total_quantity integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (period_month, resident_id, product_id)
);

-- =============================================================================
-- TRIGGERS
-- =============================================================================
-- updated_at bijhouden op residents
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists residents_set_updated_at on public.residents;
create trigger residents_set_updated_at
  before update on public.residents
  for each row execute function public.set_updated_at();

-- period_month afleiden uit occurred_at (Amsterdamse tijd) bij insert/update.
create or replace function public.set_period_month()
returns trigger language plpgsql as $$
begin
  new.period_month := to_char(
    new.occurred_at at time zone 'Europe/Amsterdam', 'YYYY-MM'
  );
  return new;
end $$;

drop trigger if exists turf_entries_set_period on public.turf_entries;
create trigger turf_entries_set_period
  before insert or update of occurred_at on public.turf_entries
  for each row execute function public.set_period_month();

-- Nieuwe auth user -> automatisch een public.users rij aanmaken (rol 'bewoner')
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'bewoner'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- HELPER: is de huidige gebruiker admin?
-- =============================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

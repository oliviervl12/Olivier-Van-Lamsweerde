-- =============================================================================
-- Huisturf - seed.sql
-- Testdata: 12 bewoners + producten + ~2 maanden turf acties.
-- Draai dit NA 0001_schema.sql en 0002_rls.sql.
-- Veilig om opnieuw te draaien (idempotent waar mogelijk).
-- =============================================================================

-- PRODUCTEN -------------------------------------------------------------------
insert into public.products (slug, name, emoji, color, price_cents, sort_order) values
  ('bier',   'Bier',   '🍺', '#f59e0b', 90,  1),
  ('koffie', 'Koffie', '☕', '#2563eb', 30,  2),
  ('ei',     'Eieren', '🥚', '#16a34a', 35,  3)
on conflict (slug) do nothing;

-- BEWONERS (12 stuks) ---------------------------------------------------------
insert into public.residents (name, avatar_emoji) values
  ('Tom de Vries',   '🧔'),
  ('Lisa Jansen',    '👩'),
  ('Bas van Dijk',   '🧑'),
  ('Milan Bakker',   '👨'),
  ('Sanne Visser',   '👩‍🦰'),
  ('Joris Smit',     '🧑‍🦱'),
  ('Femke de Boer',  '👱‍♀️'),
  ('Daan Mulder',    '👨‍🦰'),
  ('Eva Hendriks',   '👩‍🦱'),
  ('Ruben Koster',   '🧑‍🦲'),
  ('Noa Willems',    '👧'),
  ('Stijn Peeters',  '🧑')
on conflict do nothing;

-- TURF ACTIES voor de huidige en vorige maand -------------------------------
-- We genereren per bewoner een realistisch aantal acties per product,
-- verspreid over deze maand en vorige maand.
do $$
declare
  r record;
  p_bier   uuid;
  p_koffie uuid;
  p_ei     uuid;
  i        integer;
  cur_month_start date := date_trunc('month', now())::date;
  prev_month_start date := (date_trunc('month', now()) - interval '1 month')::date;
  n_bier   integer;
  n_koffie integer;
  n_ei     integer;
  ts       timestamptz;
begin
  -- Alleen seeden als er nog geen turf data is (idempotent).
  if exists (select 1 from public.turf_entries limit 1) then
    raise notice 'turf_entries bevat al data, seed wordt overgeslagen';
    return;
  end if;

  select id into p_bier   from public.products where slug = 'bier';
  select id into p_koffie from public.products where slug = 'koffie';
  select id into p_ei     from public.products where slug = 'ei';

  for r in select id, row_number() over (order by created_at) as rn from public.residents loop
    -- variatie per bewoner zodat het klassement interessant is
    -- HUIDIGE MAAND
    n_bier   := (10 + (r.rn * 7) % 35);
    n_koffie := (15 + (r.rn * 11) % 55);
    n_ei     := (3 + (r.rn * 5) % 28);

    for i in 1..n_bier loop
      ts := cur_month_start + (random() * (extract(day from now())::int) || ' days')::interval
            + (random() * 20 || ' hours')::interval;
      insert into public.turf_entries (resident_id, product_id, quantity, occurred_at)
      values (r.id, p_bier, 1 + (random() < 0.2)::int, least(ts, now()));
    end loop;

    for i in 1..n_koffie loop
      ts := cur_month_start + (random() * (extract(day from now())::int) || ' days')::interval
            + (random() * 20 || ' hours')::interval;
      insert into public.turf_entries (resident_id, product_id, quantity, occurred_at)
      values (r.id, p_koffie, 1, least(ts, now()));
    end loop;

    for i in 1..n_ei loop
      ts := cur_month_start + (random() * (extract(day from now())::int) || ' days')::interval
            + (random() * 20 || ' hours')::interval;
      insert into public.turf_entries (resident_id, product_id, quantity, occurred_at)
      values (r.id, p_ei, 1 + (random() < 0.5)::int, least(ts, now()));
    end loop;

    -- VORIGE MAAND (iets andere verdeling -> "grootste stijger" wordt zinvol)
    n_bier   := (8 + (r.rn * 5) % 30);
    n_koffie := (12 + (r.rn * 9) % 50);
    n_ei     := (2 + (r.rn * 7) % 25);

    for i in 1..n_bier loop
      ts := prev_month_start + (random() * 27 || ' days')::interval + (random() * 20 || ' hours')::interval;
      insert into public.turf_entries (resident_id, product_id, quantity, occurred_at)
      values (r.id, p_bier, 1 + (random() < 0.2)::int, ts);
    end loop;

    for i in 1..n_koffie loop
      ts := prev_month_start + (random() * 27 || ' days')::interval + (random() * 20 || ' hours')::interval;
      insert into public.turf_entries (resident_id, product_id, quantity, occurred_at)
      values (r.id, p_koffie, 1, ts);
    end loop;

    for i in 1..n_ei loop
      ts := prev_month_start + (random() * 27 || ' days')::interval + (random() * 20 || ' hours')::interval;
      insert into public.turf_entries (resident_id, product_id, quantity, occurred_at)
      values (r.id, p_ei, 1 + (random() < 0.5)::int, ts);
    end loop;
  end loop;

  raise notice 'Seed klaar: % turf acties aangemaakt', (select count(*) from public.turf_entries);
end $$;

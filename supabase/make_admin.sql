-- =============================================================================
-- Huisturf - make_admin.sql
-- Maak een bestaande gebruiker admin.
--
-- Stappenplan:
-- 1. Laat de gebruiker eerst inloggen/registreren (of maak een user aan via
--    Supabase Dashboard -> Authentication -> Users -> Add user).
--    Dankzij de trigger on_auth_user_created bestaat er dan automatisch een
--    rij in public.users met rol 'bewoner'.
-- 2. Draai onderstaande query met het juiste e-mailadres.
-- =============================================================================

update public.users
set role = 'admin'
where email = 'JOUW_EMAIL@VOORBEELD.NL';

-- Controle:
-- select email, role from public.users order by role;

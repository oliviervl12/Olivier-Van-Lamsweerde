# Huisturf — sessie voortgang (voor volgende sessie)

## Status
Turf-app is GEBOUWD en gepusht naar branch `claude/turf-app-build-ksgKz`.
PR #2 open: https://github.com/oliviervl12/Olivier-Van-Lamsweerde/pull/2
(base = claude/n8n-ai-scraper-huisartsen-011CUq3ndVLymRzMRG4YqwEL)

LET OP: PR #1 ("Add Python huisartsenpraktijken lead scraper") is van een
ANDER project. Niet aankomen. (Ik had per ongeluk de body overschreven en
hersteld met een reconstructie; user zei "is geen probleem".)

## Huidige taak: preview/demo + Supabase koppeling
User vroeg: "Maak connectie met supabase en geef een preview (screenshots)".

### Demo modus — KLAAR (nog NIET gecommit)
- `src/lib/demo.ts` toegevoegd: mockdata (12 bewoners, 2 maanden), achter
  `DEMO_MODE=1` env flag. Geen effect in productie.
- `src/lib/auth.ts`: `getCurrentUser()` returnt `demoUser` als isDemo().
- `src/lib/data.ts`: alle getters forken naar demo data bij isDemo().
- README + .env.example: uitleg demo modus toegevoegd.
- typecheck PASST. package.json is SCHOON (playwright NIET als dep —
  alleen --no-save geinstalleerd voor screenshots).

### Werkende preview
- `DEMO_MODE=1 npx next dev -p 3200` draait; alle 10 routes geven HTTP 200.
- Chromium voor playwright staat in /opt/pw-browsers (gebruik
  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers).
- Screenshot script: /tmp/shoot.js (target poort 3200, output /tmp/shots/).

## NEXT STEPS (doe dit)
1. Verifieer /tmp/shoot.js is correct geschreven (mogelijk getrunceerd!).
   Zo niet, herschrijf het (zie git of regenereer).
2. Run: `cd repo && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node /tmp/shoot.js`
   (server op 3200 moet draaien: `DEMO_MODE=1 npx next dev -p 3200 &`)
3. Stuur screenshots naar user met SendUserFile (desktop: dashboard, turven,
   maandoverzicht, klassement, bewoners, import, producten, correcties,
   instellingen, login; mobile: dashboard, turven, klassement).
4. Commit de demo-modus wijzigingen (auth.ts, data.ts, demo.ts, README,
   .env.example) en push naar claude/turf-app-build-ksgKz.
   GEEN playwright in package.json laten lekken! Check `grep playwright package.json` = leeg.
   Check package-lock.json niet vervuild (was met `git checkout package-lock.json` hersteld).
5. Beantwoord nog de openstaande vraag: hoe wil user Supabase koppelen?
   (keys aanleveren / zelf stap-voor-stap / demo genoeg). Env vars voor echte
   Supabase zijn NIET beschikbaar in deze container — koppeling vereist user input.

## Belangrijke valkuilen
- `pkill -f next` geeft non-zero exit -> cancelt parallelle tool-batches.
  Vermijd pkill in batches; gebruik aparte poort of `; true`.
- next.config is .mjs en werkt prima met `next dev` (eerdere ERR_REQUIRE_ESM
  zorg was onterecht; niet meer naar .js omzetten).

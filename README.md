# 🏠 Huisturf

Een simpele, snelle en mobielvriendelijke **turf app voor een studentenhuis**.
Turf bier, koffie en eieren, bekijk maandoverzichten, strijd om het klassement
en importeer oude papieren turflijsten via Excel of CSV.

Gebouwd met **Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth)**.

> ℹ️ Deze repository-branch bevat de Huisturf app. (De oude
> `huisartsen-scraper-workflow.json` / `config.template.env` bestanden horen bij
> een ander, los project en worden door deze app niet gebruikt.)

---

## ✨ Functionaliteiten

| Pagina | Wat kun je er doen |
| --- | --- |
| **Login** | Inloggen met e-mail + wachtwoord (Supabase Auth) |
| **Dashboard** | Maandtotalen per product, persoonlijke totals, snel turven, recente acties, mini-klassement |
| **Snel turven** | Snelle modus (+ bier / + koffie / + ei) én volledig formulier; eigen actie ongedaan maken binnen 5 min |
| **Maandoverzicht** | Totaal per persoon & product, kosten per persoon, filter op maand, export naar CSV/Excel |
| **Klassement** | Rankings per product, overall klassement, badges (Bierkoning, Koffiebaas, Eiermachine, Alleskunner, Comeback, Huislegende) |
| **Bewoners** *(admin)* | Toevoegen, naam aanpassen, op inactief zetten, verwijderen (alleen zonder historie) |
| **Producten** *(admin)* | Prijzen beheren, nieuwe producten toevoegen (fris, wijn, snacks, wc-papier…) |
| **Import** *(admin)* | Excel/CSV uploaden, preview, kolommen koppelen, namen matchen, dubbele import voorkomen |
| **Correcties** *(admin)* | Turf acties aanpassen/verwijderen, volledige audit log |
| **Instellingen** | Eigen profiel; admin beheert rollen en koppelt logins aan bewoners |

### Rollen

- **Bewoner** — turven, eigen data + klassement bekijken.
- **Admin** — alles van bewoner + bewoners/producten beheren, importeren,
  correcties, prijzen, exporteren, rollen beheren.

---

## 🚀 Lokale installatie

### Vereisten
- Node.js 18.18+ (getest met Node 22)
- Een gratis [Supabase](https://supabase.com) project

### Stappen

```bash
# 1. Dependencies installeren
npm install

# 2. Environment variabelen instellen
cp .env.example .env.local
# vul NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY en
# SUPABASE_SERVICE_ROLE_KEY in (zie .env.example)

# 3. Database opzetten (zie hieronder)

# 4. Dev server starten
npm run dev
# -> http://localhost:3000
```

---

## 🗄️ Supabase setup

1. Maak een nieuw project op [supabase.com](https://supabase.com).
2. Ga naar **Project Settings → API** en kopieer:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` *(alleen server-side!)*
3. Open de **SQL Editor** en draai de scripts in deze volgorde:
   1. `supabase/migrations/0001_schema.sql` — tabellen, enums, triggers
   2. `supabase/migrations/0002_rls.sql` — Row Level Security policies
   3. `supabase/seed.sql` — testdata (12 bewoners + ~2 maanden turf acties)
4. Maak een gebruiker aan: **Authentication → Users → Add user** (of laat een
   huisgenoot registreren). Dankzij een trigger krijgt elke nieuwe auth-user
   automatisch een profiel met rol `bewoner`.
5. Promoveer jezelf tot admin: open `supabase/make_admin.sql`, vul je e-mail in
   en draai het.

> **CLI-alternatief:** met de [Supabase CLI](https://supabase.com/docs/guides/cli)
> kun je `supabase db push` gebruiken; de migraties staan in `supabase/migrations`.

---

## 📥 Hoe werkt de Excel/CSV import?

De importpagina (admin) loodst je in 4 stappen door het proces:

1. **Upload** – kies een `.xlsx`, `.xls` of `.csv` bestand. De eerste rij moet
   kolomkoppen bevatten. Van de bestandsinhoud wordt een SHA-256 hash berekend.
2. **Kolommen koppelen** – de app herkent automatisch kolommen als
   *naam/persoon/bewoner*, *product/item*, *aantal*, *maand* en *datum*. Klopt
   iets niet? Koppel de kolom handmatig via het dropdown-menu.
3. **Onbekende namen** – namen die nog niet bestaan kun je **als nieuwe bewoner
   aanmaken** of **koppelen aan een bestaande bewoner**.
4. **Preview & importeren** – je ziet per regel het resultaat (geldig of fout
   met uitleg). Klik op importeren; je krijgt te zien hoeveel regels zijn
   toegevoegd en welke fout gingen.

**Dubbele import** wordt voorkomen: een bestand met exact dezelfde inhoud kan
niet twee keer gecommit worden (unieke hash in `imports`). Alle imports staan in
de import-historie.

### Ondersteunde formaten (voorbeelden in `examples/`)

```
Voorbeeld 1 (breed):   Naam | Bier | Koffie | Eieren | Maand
Voorbeeld 2 (datum):   Datum | Persoon | Product | Aantal
Voorbeeld 3 (maand):   Persoon | Item | Aantal | Maand
```

Bij het brede formaat wordt elke productkolom met een aantal > 0 omgezet naar
een aparte turf-regel. Productnamen worden slim herkend (bv. `pils` → bier,
`coffee` → koffie, `eitjes` → ei).

---

## 🧱 Database schema

| Tabel | Doel |
| --- | --- |
| `users` | App-gebruikers, gekoppeld aan `auth.users`, met rol + optionele resident |
| `residents` | Huisgenoten; `active` flag voor soft-delete (historie blijft kloppen) |
| `products` | bier / koffie / eieren (uitbreidbaar), prijs in centen |
| `turf_entries` | De turf acties (resident, product, aantal, tijdstip, `period_month`) |
| `imports` | Import-historie + bestandshash voor dedupe |
| `import_rows` | Ruwe + genormaliseerde rijen per import, met status/fout |
| `corrections` | Audit log van wijzigingen, verwijderingen en undo's |
| `monthly_snapshots` | (Optioneel) bevroren maandstanden |

Volledige definities + RLS staan in `supabase/migrations/`.

---

## 🧩 Later uitbreiden

- **Nieuw product** (fris, wijn, snacks, wc-papier): ga naar **Producten →
  Nieuw product**. Het model is volledig data-gedreven; overal waar producten
  getoond worden verschijnt het nieuwe product automatisch.
- **Meer rollen/rechten**: breid de `user_role` enum uit en pas de RLS-policies
  in `0002_rls.sql` aan.
- **Maandsnapshots**: vul `monthly_snapshots` aan het eind van een maand om
  historische standen te bevriezen (de tabel + policies staan klaar).
- **Push/notificaties, betalingen, statistieken**: bouw verder op de bestaande
  data-laag in `src/lib/data.ts`.

---

## 📐 Gemaakte aannames

1. **Inloggen** gaat via e-mail + wachtwoord (Supabase Auth). Nieuwe accounts
   worden door een admin aangemaakt (geen open registratie in de UI).
2. **`residents` ≠ `users`**: een bewoner die geturfd wordt hoeft geen
   login-account te hebben (handig voor geïmporteerde personen). Een login kan
   optioneel aan een bewoner gekoppeld worden.
3. **Iedere ingelogde gebruiker mag voor iedereen turven** — past bij een
   gezamenlijke turflijst in huis. Het klassement is binnen het huis openbaar.
4. **Undo-venster** voor bewoners is 5 minuten (afgedwongen via RLS).
   Admins kunnen altijd corrigeren.
5. **Tijdzone** is `Europe/Amsterdam`; de maand van een turf-actie wordt
   hierop berekend (`period_month`).
6. **Prijzen** staan in centen. Standaard: bier €0,90 · koffie €0,30 ·
   ei €0,35 (aanpasbaar). Kosten verschijnen pas als er een prijs > 0 is.
7. **Import zonder datum** maar mét maand → de actie krijgt als datum de 15e van
   die maand (midden van de maand), zodat de maandindeling klopt.
8. **Verwijderen vs. inactief**: bewoners/producten met turf-historie kunnen
   niet verwijderd worden, alleen op inactief gezet, zodat oude rapportages
   intact blijven.

---

## 📜 Scripts

```bash
npm run dev        # development server
npm run build      # productie build
npm run start      # productie server
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

---

## 📁 Projectstructuur

```
src/
├─ app/
│  ├─ (app)/              # ingelogde pagina's (dashboard, turven, ...)
│  ├─ actions/            # server actions (turf, import, residents, ...)
│  ├─ login/              # loginpagina
│  └─ layout.tsx
├─ components/            # UI componenten (+ admin/)
├─ lib/
│  ├─ supabase/           # client/server/admin/middleware
│  ├─ data.ts             # aggregaties (dashboard/klassement/maand)
│  ├─ import-utils.ts     # kolomherkenning & normalisatie
│  ├─ badges.ts           # klassement-badges
│  ├─ format.ts           # datum/geld/maand helpers
│  └─ auth.ts             # sessie + rol helpers
└─ middleware.ts          # auth guard + sessie refresh
supabase/
├─ migrations/0001_schema.sql
├─ migrations/0002_rls.sql
├─ seed.sql
└─ make_admin.sql
examples/                 # voorbeeld import-bestanden
```

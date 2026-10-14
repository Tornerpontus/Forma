# FORMA

Träningsapp (PWA) för två personer: program, pass, progression, kost, kroppsvikt och mål.
React + TypeScript + Vite + Tailwind + Supabase (PostgreSQL med Row Level Security).

Status och testresultat: se [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md).

## Snabbstart lokalt (utan molnkonto)

Kräver Node 20+ och Docker.

```bash
npm install
npm run db:start                 # startar lokal Supabase (Postgres, Auth, API) i Docker
npx supabase status -o env       # visar API_URL och ANON_KEY
cp .env.example .env.local       # fyll i VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY från raden ovan
npm run dev                      # http://localhost:5173
```

Valfritt: `node scripts/dev-seed.mjs` skapar ett demokonto (demo@forma.test / demo-password) med
cirka tio veckors påhittad träningshistorik (endast för test). Skriptet vägrar köra mot något annat än en lokal databas.

## Sätta upp riktig Supabase (krävs för att använda appen på telefonen)

1. Skapa ett projekt på https://supabase.com (gratisnivån räcker för två personer). Region: t.ex. Stockholm/Frankfurt.
2. Kör migrationerna mot projektet:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ditt-project-ref>
   npx supabase db push            # kör allt i supabase/migrations (tabeller, RLS, funktioner, övningsbibliotek)
   ```
3. Supabase → **Authentication → URL Configuration**:
   - *Site URL*: adressen där appen ligger, t.ex. `https://forma.example.se`
   - *Redirect URLs*: samma adress (behövs för lösenordsåterställning och e-postbekräftelse)
4. Supabase → **Authentication → Providers → Email**: välj om nya konton måste bekräfta e-post
   (rekommenderas på). Om ni bara är två: skapa era två konton och stäng sedan av *Allow new users to sign up*.
5. Kopiera *Project URL* och *anon/publishable key* (Project Settings → API) till `.env.local`
   (eller till hostingtjänstens miljövariabler) som `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY`.
   Använd aldrig `service_role`-nyckeln i appen.

## Bygga och publicera

```bash
npm run build      # typkontroll + produktionsbygge i dist/
npm run preview    # testa bygget lokalt
```

`dist/` är en statisk sajt. Den kan läggas på t.ex. Vercel, Netlify eller Cloudflare Pages.
Ställ in att alla sökvägar ska falla tillbaka till `index.html` (SPA). HTTPS krävs för att appen ska gå att installera på telefonen.

## Installera på telefonen

- **iPhone (Safari):** öppna appens adress → dela-knappen → *Lägg till på hemskärmen*.
- **Android (Chrome):** öppna adressen → menyn ⋮ → *Installera app* / *Lägg till på startskärmen*.

## Tester

```bash
npm test                    # enhetstester (beräkningar, passlogik)
npm run test:integration    # säkerhet/RLS mot lokal Supabase med riktiga testkonton
npm run test:e2e            # Playwright i mobilformat (bygger appen och kör mot lokal Supabase)
```

## Struktur

- `supabase/migrations/` – databas, RLS-policys, RPC-funktioner, övningsbibliotek
- `src/features/` – skärmar (workout, programs, history, progress, nutrition, body, partner, settings)
- `src/lib/training|nutrition|body/` – ren beräkningslogik med enhetstester
- `src/lib/api/` – datahämtning (TanStack Query)
- `tests/integration`, `tests/e2e` – integrations- och end-to-end-tester

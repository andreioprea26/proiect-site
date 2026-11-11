# Brand Handmade — magazin online

Repository-ul conține proiectul unui magazin online pentru produse handmade, destinat inițial pieței din România. Denumirea „Brand Handmade” este temporară, până la aprobarea numelui final.

## Stadiul proiectului

Faza 9 și revalidarea handmade 9.1–9.3 sunt finalizate în Development/Preview.
Obiectivul unic este personalizarea și lansarea propriului magazin handmade.
Baza oficială este `develop`, după integrarea PR #55 (`029f036`).
`main` și Production rămân separate și nu sunt încă aliniate cu versiunea handmade.
Arhiva permanentă este `archive/phase-9-final` / tagul `phase-9-final`.

## Documentația activă handmade

- [Starea finală a mediului Development și Preview](docs/handmade-final-development.md).
- [Regresia funcțională validată 9.3](docs/handmade-9-3-functional-regression.md).
- [Securitate 9.1](docs/handmade-9-1-security-tests.md) și
  [hardening secvență 9.2](docs/handmade-9-2-order-sequence-hardening.md): dovezi istorice.
- [Istoricul Development](docs/supabase-development-migrations.md): **28 locale / 28 remote**.
- [Checklist Production](docs/production-launch-checklist.md): etapă separată, încă neaprobată.

Preview-ul unic urmărește `develop`, folosește Supabase Development și Stripe Sandbox.
Emailurile operaționale sunt redirecționate exclusiv către destinatarul de test aprobat.
Codul și testele nu mai depind de obiectele sau commiturile productizării abandonate.
Testele SQL locale folosesc PGlite existent prin `HANDMADE_PGLITE_MODULE`;
`node --test --test-concurrency=1 tests/unit/*.test.mjs` nu contactează Supabase.
Nu rulați E2E sau SQL pe remote fără verificarea țintei și autorizarea efectelor.

## Tehnologii planificate

- Next.js, React și TypeScript;
- Tailwind CSS și shadcn/ui;
- Supabase pentru PostgreSQL, autentificare și storage;
- Stripe Checkout pentru plăți online;
- Vercel pentru hosting și Preview deployments;
- Playwright pentru testarea fluxurilor critice;
- GitHub pentru versionare.

## Rulare locală

Este necesară o versiune modernă de Node.js (minimum 22) și npm.

Instalează dependențele:

```bash
npm install
```

Pornește aplicația locală:

```bash
npm run dev
```

Aplicația va fi disponibilă implicit la `http://localhost:3000`.

## Comenzi de dezvoltare și verificare

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run check
npm run test:e2e
npm run test:e2e:headed
```

- `npm run dev` pornește serverul local de dezvoltare.
- `npm run lint` verifică regulile ESLint.
- `npm run typecheck` verifică TypeScript fără să genereze fișiere.
- `npm run build` creează și validează build-ul de producție.
- `npm run check` rulează succesiv lint, typecheck și build.

`npm run check` este verificarea standard înainte de commit sau Pull Request.

## Teste end-to-end

Playwright este folosit pentru testele end-to-end din `tests/e2e`. Comanda
`npm run test:e2e` pregătește build-ul, pornește automat aplicația locală pe
portul dedicat 3100 și rulează testele headless în Chromium. Pentru rularea cu
browserul vizibil se folosește `npm run test:e2e:headed`.

Testele trebuie să folosească exclusiv date fictive și medii de test sau
Development. Mediul Production nu este folosit pentru testare.

## Preview deployments

Proiectul Vercel este conectat la repository-ul GitHub. Branch-ul `main` este
Production Branch, iar celelalte branch-uri și Pull Request-urile generează
automat Preview deployments.

Mediul Preview folosește proiectul Supabase Development. Variabilele
`NEXT_PUBLIC_SUPABASE_URL` și `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sunt
gestionate exclusiv în mediul Preview din dashboard-ul Vercel și nu sunt
salvate în Git. Configurarea completă a mediului Production va fi realizată în
Faza 10.

## Configurarea mediului local

Creează fișierul local de configurare pornind de la exemplul versionat:

```bash
cp .env.example .env.local
```

În PowerShell folosește:

```powershell
Copy-Item .env.example .env.local
```

Completează numai valorile necesare pentru task-ul curent. `.env.local` nu se salvează în Git, iar valorile reale nu trebuie incluse în documentație, commit-uri sau prompturi.

Variabilele care încep cu `NEXT_PUBLIC_` pot fi incluse în codul trimis browserului. Cheile private, inclusiv `SUPABASE_SERVICE_ROLE_KEY`, cheile Stripe secrete și cheile API private, nu trebuie să folosească acest prefix și trebuie accesate exclusiv server-side.

Conexiunea locală folosește proiectul Supabase Development prin
`NEXT_PUBLIC_SUPABASE_URL` și `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Clienții pentru browser și server sunt separați în `src/lib/supabase`.
Fluxul curent pentru aplicarea și verificarea manuală a migrațiilor Development
este documentat în [Migrații Supabase Development](docs/supabase-development-migrations.md).

Secțiunile pentru Stripe, e-mail și livrare sunt doar pregătitoare; aceste
servicii nu sunt încă configurate.

## Structura proiectului

- `src/app` conține rutele și layout-urile Next.js.
- `src/components` grupează componentele de layout, componentele partajate și elementele UI generice.
- `src/features` conține modulele funcționale pentru autentificare, catalog, coș, checkout, comenzi și administrare.
- `src/lib` conține configurări, validări și utilitare comune.
- `src/types` și `src/styles` sunt rezervate tipurilor TypeScript comune și stilurilor globale suplimentare.
- `tests/e2e` conține testele end-to-end Playwright.
- `supabase/migrations` conține migrațiile SQL versionate.

## Structura branch-urilor

- `main` — codul aprobat pentru producție;
- `develop` — integrarea și testarea modificărilor înainte de producție;
- `task/*` — branch separat, cu durată scurtă, pentru fiecare task.

Nu se lucrează direct pe `main`. Fiecare task trebuie implementat și verificat pe propriul branch, apoi analizat înainte de integrarea în `develop`. Integrarea în `main` se face numai după validarea finală.

## Reguli de dezvoltare

- Docker nu este folosit în acest proiect.
- Secretele, token-urile, parolele, cheile API și datele reale nu se salvează în Git.
- Fișierele `.env` și `.env.local` rămân locale. Doar un eventual `.env.example`, fără valori sensibile, poate fi versionat.
- Serviciile sau costurile noi necesită aprobare înainte de adoptare.
- Implementarea respectă ordinea și deciziile aprobate în Project Bible.

Specificația completă este disponibilă în [Project Bible v0.4](docs/project-bible-v0.4.md).

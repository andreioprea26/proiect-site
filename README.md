# Brand Handmade — magazin online

Repository-ul conține proiectul unui magazin online pentru produse handmade, destinat inițial pieței din România. Denumirea „Brand Handmade” este temporară, până la aprobarea numelui final.

## Stadiul proiectului

Faza 9 și revalidarea handmade 9.1–9.3 sunt finalizate în Development/Preview.
Obiectivul unic este personalizarea și lansarea propriului magazin handmade.
Baza validată este `task/handmade-clean-baseline`, descendentă din commitul
`e703929` al branch-ului `task/handmade-9-3-functional-regression`.
`task/handmade-replace-develop` reproduce această bază și pregătește PR-ul explicit
de înlocuire a conținutului din `develop`. Numai după integrarea aprobată a acelui
PR, `develop` devine baza oficială handmade. Până atunci conține productizarea
abandonată: nu se integrează cod de acolo în versiunea handmade.
`main` nu este încă aliniat cu baza handmade. Nu publicați schimbări înainte de review.

## Documentația activă handmade

- [Regresia funcțională finală 9.3](docs/handmade-9-3-functional-regression.md).
- [Curățare 9.4, inventar și plan de retragere 10B](docs/handmade-9-4-clean-baseline.md).
- [Înlocuire locală develop și verificare 9.4b](docs/handmade-9-4b-replacement-validation.md).
- [Securitate 9.1](docs/handmade-9-1-security-tests.md) și
  [hardening secvență 9.2](docs/handmade-9-2-order-sequence-hardening.md).
- [Istoricul Development](docs/supabase-development-migrations.md): momentan
  **28 fișiere locale / 29 migrări remote**, Store Settings păstrată temporar.
- [Configurația Preview 9.3](docs/handmade-9-3b-preview-configuration-plan.md)
  este procedura istorică pentru branch-ul 9.3; nu configurează automat un branch nou.
- [Checklist Production](docs/production-launch-checklist.md): etapă separată,
  încă neaprobată pentru aplicare.

Aplicația nu include instalatoare client, showcase-uri sau configurații de brand
10B. Testele SQL păstrează temporar contractul strict Store Settings deoarece
extensia există încă în Development; acesta nu este cod de productizare activ.
Testele izolate citesc sursa auditată din obiectul Git fix `0081812`; păstrați
acel obiect disponibil (inclusiv în CI), fără a integra branch-ul `develop`.

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

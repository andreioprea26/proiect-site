# Brand Handmade — magazin online

Repository-ul conține proiectul unui magazin online pentru produse handmade, destinat inițial pieței din România. Denumirea „Brand Handmade” este temporară, până la aprobarea numelui final.

## Stadiul proiectului

Fazele 1–9 sunt validate și integrate în `develop`: storefront, catalog și administrare,
Auth, coș, checkout COD/Stripe Sandbox, comenzi, notificări și conținut administrabil.
Productizarea 10B este în desfășurare. Acest lucru nu reprezintă aprobarea lansării Production
sau activarea Stripe Live. Starea finală a Fazei 9 este păstrată în tag-ul `phase-9-final`
și branch-ul `archive/phase-9-final`.

## Tehnologii folosite

- Next.js, React și TypeScript;
- Tailwind CSS;
- Supabase pentru PostgreSQL, autentificare și storage;
- Stripe Checkout pentru plăți online;
- Resend pentru notificări operaționale;
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
npm run test:config
npm run test:email
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

Stripe Sandbox și notificările operaționale sunt implementate. Mediul de test
controlează explicit cheile placeholder Stripe și dezactivează Resend; nu reutiliza
configurația de test pentru plăți reale. Pentru statusul și limitele integrărilor,
consultă [checklist-ul de lansare](docs/production-launch-checklist.md).

## Store identity configuration

Identitatea publică se configurează în `src/lib/config/store.ts`, contractul tipat
`PublicStoreConfig`, versiunea 1. Schimbă `STORE_CONFIG.name` într-un singur loc pentru
brandingul storefront/Auth/account/admin, titluri SEO și emailuri. Tagline-ul,
descrierile, footer-ul și `copy` sunt fallback-uri publice editabile în cod.
Din 10B.2b, `/admin/settings` permite proprietarului cu rol admin să configureze
numele, tagline-ul, descrierile, emailul/telefonul/WhatsApp public și linkuri pentru
Instagram/Facebook/TikTok, fără editarea codului. Precedența este valoare DB validă
→ fallback versionat. Câmp gol elimină override-ul; datele de contact/social rămân
ascunse dacă fallback-ul lor este `null`.

Citirea publică proiectează numai cele 11 câmpuri aprobate și folosește cheia publică,
nu service role. Memoizare React pe request, fetch `no-store`, timeout 2 secunde și
fallback pe erori; Save invalidează layout-ul rădăcină. Nu există cache persistent
de branding. Metadata se generează dinamic; global-error rămâne complet static,
fără dependență de Settings/DB. Fallback-ul nu garantează funcționarea catalogului
sau autentificării dacă întreaga bază este indisponibilă.

Fallback-urile homepage se folosesc când sloturile nu sunt configurate. Conținutul
editorial deja salvat în administrarea homepage are prioritate și nu este rescris
la schimbarea configului. Datele produselor rămân sursa metadatelor dinamice.

`assets.ogImage` acceptă o cale statică locală, de exemplu `/store-og.png`, cu fișierul
în `public`; `null` nu inventează o imagine. Brandingul vizibil rămâne text (nu există
logo real sau upload). Favicon-ul existent rămâne `src/app/favicon.ico`, conform
convenției Next.js; logo/favicon/theme avansat sunt rezervate 10B.2c. Datele publice
de contact/social configurate sunt afișate în footer. `/contact` rămâne disponibil.
Emailul public NU schimbă expeditorul sau reply-to Resend.

Configul este public și poate intra în bundle-ul browserului. NU include chei,
parole, service role, roluri admin, RLS, reguli financiare, stocuri sau infrastructură.
Secretele rămân exclusiv în env; `APP_URL`, `RESEND_FROM_EMAIL` și
`RESEND_REPLY_TO_EMAIL` rămân tot în env. Contractul RO/ro-RO/RON/Europe/Bucharest
este declarativ, nu un mecanism i18n sau multi-currency. Cheile browserului pentru
coș și checkout nu se redenumesc odată cu brandul.

`npm run test:config` verifică două branduri fictive doar în teste, metadata,
copy/Auth, toate cele opt emailuri, escaping, independența de DB/env și cheile browserului.
Importul explicit `.ts` permite testarea acelorași module direct în Node fără loader
nou; `allowImportingTsExtensions` este folosit împreună cu `noEmit`, compilarea aplicației
rămânând în responsabilitatea Next.js.

`npm run test:settings` verifică validarea și fallback-ul Settings. Testele E2E
`store-settings` rulează serial înaintea proiectului `chromium`, deoarece modifică
temporar identitatea globală; valorile originale sunt restaurate în `afterAll`.
`npx playwright test --project=chromium` include automat această dependență.
Nu rula concomitent alte suite/deployment-uri care modifică Settings în aceeași bază.

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

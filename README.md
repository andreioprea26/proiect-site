# Brand Handmade — magazin online

Repository-ul conține proiectul unui magazin online pentru produse handmade, destinat inițial pieței din România. Denumirea „Brand Handmade” este temporară, până la aprobarea numelui final.

## Stadiul proiectului

Proiectul se află în Etapa 5 — Implementarea ghidată cu Codex, Faza 1 — Pregătirea proiectului. Aplicația Next.js de bază este inițializată, iar pagina principală confirmă că magazinul este în pregătire.

## Tehnologii planificate

- Next.js, React și TypeScript;
- Tailwind CSS și shadcn/ui;
- Supabase pentru PostgreSQL, autentificare și storage;
- Stripe Checkout pentru plăți online;
- Vercel pentru hosting și Preview deployments;
- Playwright pentru testarea fluxurilor critice;
- GitHub pentru versionare.

## Rulare locală

Este necesară o versiune modernă de Node.js (minimum 20.9) și npm.

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
```

- `npm run dev` pornește serverul local de dezvoltare.
- `npm run lint` verifică regulile ESLint.
- `npm run typecheck` verifică TypeScript fără să genereze fișiere.
- `npm run build` creează și validează build-ul de producție.
- `npm run check` rulează succesiv lint, typecheck și build.

`npm run check` este verificarea standard înainte de commit sau Pull Request.

## Structura proiectului

- `src/app` conține rutele și layout-urile Next.js.
- `src/components` grupează componentele de layout, componentele partajate și elementele UI generice.
- `src/features` conține modulele funcționale pentru autentificare, catalog, coș, checkout, comenzi și administrare.
- `src/lib` conține configurări, validări și utilitare comune.
- `src/types` și `src/styles` sunt rezervate tipurilor TypeScript comune și stilurilor globale suplimentare.
- `tests/e2e` este rezervat viitoarelor teste end-to-end.
- `supabase/migrations` este rezervat viitoarelor migrații SQL versionate.

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

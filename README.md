# Brand Handmade — magazin online

Repository-ul conține proiectul unui magazin online pentru produse handmade, destinat inițial pieței din România. Denumirea „Brand Handmade” este temporară, până la aprobarea numelui final.

## Stadiul proiectului

Proiectul se află în Etapa 5 — Implementarea ghidată cu Codex, Faza 1 — Pregătirea proiectului. Task 1.1 pregătește structura Git și documentația de bază. Aplicația Next.js nu este încă inițializată și nu există dependențe instalate.

## Tehnologii planificate

- Next.js, React și TypeScript;
- Tailwind CSS și shadcn/ui;
- Supabase pentru PostgreSQL, autentificare și storage;
- Stripe Checkout pentru plăți online;
- Vercel pentru hosting și Preview deployments;
- Playwright pentru testarea fluxurilor critice;
- GitHub pentru versionare.

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

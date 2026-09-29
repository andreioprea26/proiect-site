# Clean install — ghid controlat

Stare 2026-09-29: demo instalat și testat la 18 septembrie; checkpoint integral
BLOCKED. Vezi [raportul actual](10b2d-productization-final-checkpoint.md).
Nu există încă installer/preflight complet pentru clienți noi.

1. Selectează release master revizuit care include toate cele 29 de migrații,
   în special `20260918150000_explicit_runtime_table_grants.sql`. Nu folosi develop
   vechi fără grant fix și nu copia doar schema demo prin dump.
2. Creează repo separat din surse tracked, nu copia workspace-ul cu .env, .vercel,
   .supabase, supabase/.temp, node_modules, .next sau artefacte E2E.
3. Provisionează separat Supabase Test gol și integrările clientului, cu aprobarea
   owner-ului/costurilor. Notează ref-urile; nu reutiliza secretele altui magazin.
4. Parcurge [preflight](preflight.md). Nu continua la target necunoscut, DB paused,
   env incomplete, istorice nealiniate sau date private preexistente.
5. În checkout izolat, verifică migration list și db push --dry-run cu ref explicit.
   Aplică numai migrațiile revizuite după aprobare. Nu folosi reset/repair ca să
   ascunzi diferențe. Repetă list/dry-run și verifică RLS/grants/search_path.
6. Rulează cele 14 scripturi SQL în transaction/rollback pe Test. Grant fix-ul vine
   din migrare, nu din SQL de onboarding executat manual și uitat în dashboard.
7. Seed-ul demonstrativ este opt-in, în afara migrations. [Runner-ul actual](demo-seed.md)
   acceptă DOAR demo-ul aprobat, nu un ref client. Nu elimina guard-ul pentru reuse;
   adaptarea la client cere manifest/review/validare separată. Fără demo în Live.
8. Configurează Vercel repo/env, Auth Site URL și callbacks exacte, Stripe Test
   endpoint propriu și Resend redirect. APP_URL/webhook pot lipsi înainte de primul
   deploy, dar nu la certificare. READY este doar status deployment.
9. Verifică Auth/emailuri cu linkuri noi și o plată Sandbox controlată: webhook,
   order/payment, un singur efect stock, rezervare, cart; păstrează auditul.
10. Rulează E2E numai cu fixtures separate, guard-uri de target și fără skip mascat.
    Runner-ul actual este demo-specific; nu îl rula pe clienți prin schimbarea
    unilaterală a ref-ului. Lint/type/build/unit + security gates obligatorii.
11. Predă dovezile și limitele, apoi review/PR/merge manual. Git nu include Auth
    dashboard, secrete, DB/Storage sau configurația furnizorilor. Live are gate separat.

Pentru un demo paused, nu reexecuta seed, migrații sau provisioning ca să-l reactivezi.
Resume autorizat este urmat de audit read-only, fără ștergerea datelor. Demo-ul
curent a fost reactivat de utilizator și reauditul a trecut la 29 septembrie.

# Clean install client — flux oficial guarded

Fluxul suportat: repo client curat → autorizare standalone Test/Preview → preflight → runner
migrations → verificare migrated → seed fictiv opțional → bootstrap tehnic Test
→ configurări Preview autorizate separat → teste și checkpoint funcțional.

1. Release revizuit cu toate cele 29 de migrații și manifestul SHA-256, inclusiv
   grant fix. Repo separat, origin unic client, fără dump sau secrete originale.
2. Owner-ul creează separat un proiect standalone client Test/Preview și îl
   [înrolează explicit](standalone-target-authorization.md). Installer-ul verifică
   identitatea remote și baza goală, fără să creeze resurse sau costuri. Branching
   este opțional, nu o condiție; identitate/aprobare insuficientă = FAIL.
3. Manifest client extern, ref confirmat și env prin secret manager, conform
   [preflight](preflight.md). Checkout operator fără dependențe/config copiate;
   folosește alt workspace pentru npm ci/build/E2E.
4. Rulează `node scripts/install-client.mjs all --apply` pentru migrations +
   bootstrap tehnic Test. Gate-urile sunt interne; nicio comandă db push/SQL manuală
   după un PASS separat nu mai face parte din fluxul oficial.
5. Pentru demo fictiv opțional: `migrate --apply`, seed guarded, apoi
   `bootstrap --apply`. Comenzile complete și credențialele necesare sunt în
   [ghidul runner-ului](client-install-runner.md). Seed inițial înainte de users.
6. FAIL la orice etapă = STOP. Fără cleanup cloud, reset, retry automat sau repair.
   După rezultat incert, investigare read-only; nu relua automat întregul flux.
7. Configurările administrative Preview/Auth/SMTP/webhook/Vercel sunt task-uri
   separate, aprobate explicit. Runner-ul NU le execută și nu pretinde enforcement
   asupra lor. Nu copia config demo/original.
8. Completează E2E credentials dedicate și rulează preflight e2e pentru diagnostic;
   apoi teste autorizate pe client. Lipsuri/skip = FAIL. Validează Auth cu linkuri
   noi, livrare email, Stripe Sandbox, RLS și efect unic asupra stocului.
9. Păstrează dovezile fără secrete. PR/merge și orice lansare Live au gate separat.

Demo-ul și Development-ul originale sunt interzise în toate etapele installer-ului.
Dovada istorică de clean install din septembrie rămâne distinctă de noile teste
simulate ale runner-ului. Acest task nu reinstalează și nu modifică demo-ul.

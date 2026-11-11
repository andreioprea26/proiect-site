# TASK 9.4 — înlocuirea conținutului activ din develop

Plan actualizat la cererea proprietarului, 2026-11-11. **Pregătire locală, nu
autorizare de execuție remote.** Înlocuiește recomandarea anterioară de a folosi
permanent alt branch principal. Ținta este un singur `develop` activ handmade.

## Mecanismul concret al PR-ului

Un branch nou `task/handmade-replace-develop` va porni din develop, nu din handmade.
Un commit normal va înlocui întregul arbore versionat cu arborele handmade
revizuit. Diferența PR-ului va conține explicit ștergerile 10B și adăugările 9.1–9.4.
Nu se face merge între cele două linii, revert în lanț, reset, force push sau orphan.
PR-ul poate fi apoi integrat prin squash după review; patch-ul lui este chiar
înlocuirea explicită, nu un merge care păstrează fișierele 10B nemodificate.

Date verificate: baza develop `0081812ce76f16811cd97b983cd772f139cc10f1`,
baza curată 9.4 `58fc7d8780f6e43bf36e2a9212de222fa8eae927`, descendentă din
`e703929`. La execuție se fixează commitul handmade final revizuit, care include
și această completare. Nu se copiază un working tree murdar sau fișiere ignorate.

Comenzi de pregătire pentru o etapă aprobată ulterior, NU executate în acest task:

```powershell
# Repository curat, din rădăcină; toate precondițiile de mai jos îndeplinite.
$handmadeCommit = git rev-parse task/handmade-clean-baseline
$expectedDevelop = '0081812ce76f16811cd97b983cd772f139cc10f1'
git fetch origin develop
if ((git rev-parse origin/develop) -ne $expectedDevelop) {
  throw 'Develop s-a schimbat: refaceți review-ul diferenței înainte de înlocuire.'
}
git switch -c task/handmade-replace-develop origin/develop
git restore --source=$handmadeCommit --staged --worktree -- :/
if ((git write-tree) -ne (git rev-parse "$handmadeCommit^{tree}")) {
  throw 'Arborele staged nu reproduce exact baza handmade.'
}
git diff --cached --check
git diff --cached --stat
# Verificări locale, apoi commit normal. Nu faceți push fără aprobarea etapei.
```

În implementarea efectivă fiecare comandă Git va avea verificarea exit code;
scriptul de mai sus descrie pașii, nu este runner automat de publicare.
După egalitatea arborelui, ajustați numai documentația activă (README și indexul
9.4) pentru a numi develop drept bază oficială. Verificați separat că arborii
`src`, `public`, `scripts`, `tests`, `supabase/migrations` și `supabase/tests` și
fișierele de dependențe/config funcțional rămân identice commitului handmade.
Commitul rezultat conține înlocuirea plus acea mică actualizare editorială.

Verificări înainte de commit/PR: lint, TypeScript, 113 teste locale, cele 13 suite
SQL, build și diff check. Contractul opțional Store Settings nu se elimină încă.
Nu există motiv pentru repetarea plăților Stripe validate doar pentru acest PR.
Înainte de push confirmați că nici develop, nici branch-ul PR nu sunt branch-ul
Vercel Production; dacă sunt, opriți publicarea. Confirmați scope-urile Preview:
variabilele server-side 9.3 nu se moștenesc automat pe noul branch sau develop.
Configurarea cloud și deploymenturile necesare cer aprobarea etapei respective.

PR propus: **„Replace productized develop with validated handmade Phase 9 baseline”**,
base develop, head task/handmade-replace-develop. După review, integrarea acestui
PR aplică ștergerile explicit. Dacă develop avansează între timp, opriți integrarea
și refaceți snapshotul/review-ul pe vârful nou; nu rezolvați automat prin merge
din vechiul branch comercial. După integrare verificați arborii funcționali față
de commitul handmade și absența directoarelor comerciale.

## Ce dispare efectiv din develop

Inventarul inițial `git diff --no-renames --name-status develop 58fc7d8`:
**69 ștergeri, 70 modificări, 18 adăugări**. Completarea curentă adaugă documentație;
numerele finale se recalculează în PR. Lista exactă a celor 69 ștergeri este mai jos.
Modificările nu înseamnă ștergerea funcționalităților: readuc UI/config/email la
versiunea handmade validată și păstrează remedierile 9.1–9.3.

Showcase-urile `docs/commercial-demos` nu sunt în develop: sunt numai pe branch-ul
10B.4 și nu vor fi aduse în PR. Ștergerea acelui branch și a deploymenturilor sale
elimină direcția activă fără a mai copia materialele în arhive.

- `config/client-install.example.json`
- `docs/10b2a-public-store-config.md`
- `docs/10b2b-admin-store-settings.md`
- `docs/10b2c-theme-brand-assets.md`
- `docs/10b2d-acceptance-blockers-fix.md`
- `docs/10b2d-clean-install-checkpoint.md`
- `docs/10b2d-installation-findings.md`
- `docs/10b2d-productization-final-checkpoint.md`
- `docs/10b2d-reusable-preflight.md`
- `docs/clean-install-guide.md`
- `docs/client-delivery/README.md`
- `docs/client-delivery/client/admin-guide.md`
- `docs/client-delivery/client/handover-maintenance.md`
- `docs/client-delivery/internal/client-record-template.md`
- `docs/client-delivery/internal/installer-guide.md`
- `docs/client-delivery/internal/package-audit.md`
- `docs/client-delivery/internal/production-launch.md`
- `docs/client-install-runner.md`
- `docs/client-onboarding-checklist.md`
- `docs/demo-e2e.md`
- `docs/demo-seed.md`
- `docs/preflight.md`
- `docs/productization-plan.md`
- `docs/standalone-target-authorization.md`
- `public/branding/icon.svg`
- `public/branding/legacy-favicon.ico`
- `scripts/authorize-client-target.mjs`
- `scripts/demo-seed.mjs`
- `scripts/install-client.mjs`
- `scripts/lib/client-install.mjs`
- `scripts/lib/client-preflight.mjs`
- `scripts/lib/target-approval.mjs`
- `scripts/preflight.mjs`
- `scripts/provision-demo-e2e.mjs`
- `scripts/run-demo-e2e.mjs`
- `scripts/scan-secrets.mjs`
- `scripts/seed-demo.mjs`
- `scripts/verify-migration-manifest.mjs`
- `src/app/(storefront)/_components/hero-block.tsx`
- `src/app/admin/settings/actions.ts`
- `src/app/admin/settings/page.tsx`
- `src/app/admin/settings/settings-form.tsx`
- `src/app/brand-og/route.tsx`
- `src/components/store-brand.tsx`
- `src/components/store-public-contact.tsx`
- `src/lib/config/store.ts`
- `src/lib/config/theme.ts`
- `src/lib/store-settings/model.ts`
- `src/lib/store-settings/server.ts`
- `supabase/migration-manifest.json`
- `supabase/migrations/20260915120000_public_store_settings.sql`
- `supabase/migrations/20260918150000_explicit_runtime_table_grants.sql`
- `supabase/seeds/handmade-demo-shipping.sql`
- `supabase/seeds/handmade-demo.sql`
- `supabase/tests/clean_install_account_grants.sql`
- `supabase/tests/public_store_settings.sql`
- `tests/e2e/demo-fixture-client.ts`
- `tests/e2e/demo-infrastructure.spec.ts`
- `tests/e2e/demo-no-skips-reporter.ts`
- `tests/e2e/demo-target.ts`
- `tests/e2e/store-identity.spec.ts`
- `tests/e2e/store-settings.spec.ts`
- `tests/e2e/theme-brand-assets.spec.tsx`
- `tests/fixtures/brands.ts`
- `tests/unit/client-install.test.mjs`
- `tests/unit/client-preflight.test.mjs`
- `tests/unit/store-config.test.mjs`
- `tests/unit/store-settings.test.mjs`
- `tests/unit/theme.test.mjs`

## Branch-uri care pot fi șterse ulterior

După integrarea PR-ului, verificarea develop și retragerea Preview-urilor legate,
se pot șterge local și remote cele șapte branch-uri 10B (fără taguri de backup):

- `task/10b1-productization-audit`
- `task/10b2a-public-store-config`
- `task/10b2b-admin-store-settings`
- `task/10b2c-theme-brand-assets`
- `codex/10b2d-rls-preflight`
- `task/10b3-client-delivery-package`
- `task/10b4-commercial-demos`

Nu există tag 10B în inventarul remote verificat. Păstrăm tagul și branch-ul
`phase-9-final` / `archive/phase-9-final`, exact cum s-a cerut.

Opțional, pentru un repository simplu, următoarele branch-uri de lucru sunt
redundante; ancestry verificată arată că toate sunt deja incluse în arhiva Fazei 9:
`task/7-phase-checkpoint`, `task/7a-admin-orders-status-history`,
`task/7b-shipments-cancellations-refunds`, `task/7c-operational-emails-cod-dashboard`,
`task/8a-customer-orders-favorites-reviews`, `task/8b-newsletter-contact-custom-content`,
`task/8c-homepage-admin-stats-checkpoint`, `task/9a-security-data-integrity`,
`task/9b-ux-accessibility-performance-seo`, `task/9c-final-launch-readiness`,
`task/handmade-relaunch-phase9`. Unele există numai local; verificați existența
remote înainte de orice comandă de ștergere. Nu sunt productizare 10B.

După ce develop conține codul handmade și Preview-ul de înlocuire este validat,
pot fi retrase și `task/handmade-9-1-security-tests`,
`task/handmade-9-2-order-sequence-hardening`, `task/handmade-9-3-functional-regression`,
`task/handmade-clean-baseline` și branch-ul PR `task/handmade-replace-develop`.
Nu ștergeți acum 9.3: URL-ul său este încă Preview-ul validat folosit de Auth/Stripe.
Aceste branch-uri păstrează momentan commiturile task-urilor; un snapshot/squash
conservă codul și rapoartele, nu ancestry-ul separat al acelor commituri. Nu creați
arhive noi doar pentru commiturile de lucru; ștergerea lor se aprobă cunoscând asta.

Păstrăm develop, main și arhiva permanentă Faza 9. main nu se modifică acum:
este asociat istoricului separat/Production și nu este 10B de șters automat.
Setarea develop ca branch implicit GitHub poate fi făcută ulterior, cu aprobare.
Blocați PR-urile din vechile linii 10B până sunt șterse; nu adăugăm un sistem nou.

## Resurse de șters și ordinea sigură

Lista exactă verificată și ID-urile sunt în
[inventarul 9.4](handmade-9-4-clean-baseline.md#inventar-cloud-read-only-și-eligibilitate-pentru-retragere).
Ordinea pentru etapa aprobată ulterior:

1. Integrarea PR-ului explicit în develop; verificare arbore și checks locale.
2. Pregătirea Preview-ului handmade necesar pe develop, fără Production, păstrând
   temporar Preview 9.3 până când Auth/Stripe/emailurile au ținte funcționale.
3. Ștergerea deploymenturilor/aliasurilor comerciale 10B.4
   `dpl_FWGjJCrLpc5A4wJ2LrLWyw2Egv8j`, develop comercial vechi
   `dpl_78Gw5gniUCnP3p3P9SmjyMyTGSSd`, 10B.3
   `dpl_GCesU1CNhGByKGjzr3gMb4GDL5z3`; completați inventarul tuturor versiunilor
   10B.1–10B.2d înainte de ștergerea lor. Nu ștergeți proiectul `proiect-site`.
   Redeployul develop nu șterge automat deploymenturile vechi și URL-urile imutabile.
4. Ștergerea endpointului Stripe inutil `we_1UAbf6Dxyx762at3Jt8e2OFX` (410),
   păstrând `we_1UaPLNDxyx762at3ABGkAs2j` și toate plățile/cheile comune handmade.
   Endpointul 410 este istoric Faza 9, nu dovadă de resursă exclusiv 10B.
5. Eliminarea reală Store Settings prin procedura separată 9.4, inclusiv politica,
   granturile/funcțiile și retragerea auditată a migrării. Nicio ștergere a Auth,
   catalogului, comenzilor, stocului sau fișierelor originale Supabase.
6. Proiectul Demo `bfmihaxfleztajzyamio`: NU este încă pe lista sigură de șters,
   deoarece accesul curent răspunde 403. Confirmați ownership și lipsa dependențelor
   originale; numai apoi poate fi propus pentru ștergere definitivă. Nu creați
   backup/arhivă a demo-ului comercial abandonat.
7. Resend: nicio cheie/domeniu/webhook exclusiv demo identificată. Cheia Onboarding
   și contul sunt folosite de handmade: nu se șterg. Nici Supabase proiect-meditatii
   și nici servicii care nu aparțin acestui magazin nu sunt candidați de curățare.
8. Ștergerea branch-urilor 10B după eliminarea deploymenturilor dependente și
   închiderea PR-urilor rămase. Verificare finală a ref-urilor, fără taguri noi.

Nu există un motiv de a păstra productizarea în arborele activ sau ca noi copii
de rezervă. În schimb, istoricul 10B deja integrat în develop rămâne în commituri
vechi: ștergerea branch-urilor nu îl elimină din istoricul develop. Eliminarea lui
fizică din tot istoricul ar necesita exact rescrierea/force-push interzise.
În plus, testele temporare 9.1 citesc obiectul istoric `0081812`; acest obiect este
oricum strămoș al develop și nu cere un branch sau backup comercial suplimentar.

Backupul punctual înainte de ștergerea obiectelor din Development original este
o protecție a datelor magazinului, nu un nou sistem de arhivare 10B. Nu se creează
acum; nu se extinde la demo-uri abandonate și nu schimbă restricțiile task-ului.

**Rezultat final urmărit:** develop conține exclusiv handmade și remediile validate;
branch-urile/deploymenturile comerciale sunt șterse după aprobare; infrastructura
originală rămâne, fără servicii sau sisteme de arhivare suplimentare.

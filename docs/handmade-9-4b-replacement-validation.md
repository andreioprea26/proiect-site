# TASK 9.4b — înlocuire locală develop cu handmade validat

Data: 2026-11-11. Verdict: **PASS după verificările locale consemnate mai jos**.
Branch: `task/handmade-replace-develop`, creat direct din develop
`0081812ce76f16811cd97b983cd772f139cc10f1`. develop nu a fost mutat/modificat.
Baza reprodusă: `e7c7145e1b44b43590f0832857b12542347a4392`, vârful
`task/handmade-clean-baseline` revizuit. Working tree inițial curat.

## Proveniență și echivalență

Au fost confirmate ancestry-ul `e703929` (închidere 9.3), `b47a3f5` (9.1),
`7794d5f` (9.2) și prezența neschimbată a migrării
`20261110120000_harden_order_public_number_sequence.sql` în baza handmade.
Branch-ul nou are drept părinte develop, iar codul lor este adus prin înlocuirea
explicită a arborelui, nu prin merge/cherry-pick între linii.

Imediat după `git restore --source=<baza handmade> --staged --worktree -- :/`,
`git write-tree` a fost identic cu `e7c7145^{tree}`. Diferențele intenționate
adăugate ulterior sunt exclusiv:

- `README.md`: clarifică tranziția prin PR către develop și indexează acest raport;
- acest raport nou de verificare.

Arborii `src`, `public`, `scripts`, `tests`, `supabase/migrations`,
`supabase/tests`, precum și `package.json`, lockfile, `.env.example`, configurația
Next/TypeScript/Playwright și restul fișierelor sunt identice bazei handmade.
Nu există corecții noi în Auth, checkout, comenzi, Stripe, stoc sau Admin.
Codul/dependențele aplicației rămân și identice Fazei 9, cu extensiile de
securitate/testare 9.1–9.3 păstrate în fișierele lor separate.

## Eliminări verificate individual

Cele **69 de căi vechi** sunt exact setul planificat: fiecare conținut a fost
citit și comparat ca proveniență; niciuna nu exista la aceeași cale în arhiva
Fazei 9. Instalatoarele și scannerul/manifestul asociate lor sunt tooling 10B,
nu componente ale runtime-ului handmade; verificările de securitate 9.1–9.3 și
scanarea locală înainte de commit sunt păstrate. Testele eliminate privesc numai
Store Settings/branding/instalarea izolată comercială, nu regresia handmade.

**Precizare de numărare:** Git fără detectarea redenumirilor raportează 69 D.
Una este mutarea faviconului: `public/branding/legacy-favicon.ico` este păstrat
byte-identic la locația originală `src/app/favicon.ico`. Cu detectarea redenumirii
rezultă 68 ștergeri și o relocare, fără pierderea faviconului original.

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

`docs/commercial-demos` (Iris/Soare/Poveste) nu exista în develop și nu a fost
importat. Branch-ul 10B.4 și deploymenturile sale nu au fost atinse.

## Ce este păstrat și ce referințe rămân

Toate funcțiile magazinului Faza 9, migrarea/granturile 9.2 și cele 13 suite SQL
originale sunt păstrate. Rapoartele, helper-ele și dovezile existente 9.3 nu au
fost eliminate. Nicio dependență npm suplimentară comercială nu rămâne în
package.json/lockfile; acestea sunt exact cele validate handmade, fără instalare.

Nu există cod runtime 10B în `src` și nici instalatoare/seed-uri/showcase-uri
comerciale în arborele activ. Referințele păstrate intenționat sunt:

- contractul strict opțional Store Settings în security_data_integrity.sql;
- fixture-urile/unit tests SQL care verifică atât schema originală, cât și extensia
  remote, citind sursa auditată din commitul istoric fix `0081812`;
- documentația de audit/curățare și gărzile migrărilor care explică diferența reală;
- slugs `*-demo` pentru datele fictive originale Faza 9 în smoke tests: acestea
  nu sunt demo-uri de productizare și nu au fost șterse din DB.

Rămân **28 fișiere de migrare locale / 29 versiuni remote cunoscute**, inclusiv
Store Settings remote. Migrarea respectivă nu se adaugă în migrations și nu se
șterge remote în acest task. Nu s-au executat sincronizări, db push, reset, repair,
DROP remote sau teste remote cu write. Nu se pretinde un nou audit cloud.

## Verificări locale

| Verificare efectuată | Rezultat |
|---|---|
| Egalitate inițială a arborelui staged cu e7c7145 | PASS, hash Git tree identic |
| Egalitate finală a tuturor fișierelor funcționale cu e7c7145 | PASS; numai README și acest raport diferă |
| Setul exact al celor 69 căi vechi eliminate | PASS; inclusiv verificarea identității faviconului relocat |
| ESLint întregul repository | PASS |
| TypeScript tsc --noEmit | PASS |
| Teste Auth/email/SQL securitate și regresie | 113/113 PASS, zero failed/skipped; include toate cele 13 suite SQL |
| Build Next.js | PASS, 37 pagini generate; nu este deployment |
| git diff --check și git diff --cached --check | PASS |

Logul testelor este artefact local ignorat:
`test-results/handmade-9-4b-unit-tests.log`. PGlite existent a fost reutilizat;
nu s-au instalat dependențe. Nu s-au rulat Stripe/E2E remote și nu s-au creat
date fictive suplimentare. Build-ul și testele locale nu substituie probele
online 9.3 deja păstrate; acelea nu au fost repetate sau revendicate ca noi.

## Git și următorul pas

Commit normal local de înlocuire, cu părinte develop, fără push, PR, merge sau
rescriere de istoric. Nu se creează backupuri/arhive ale productizării. main,
develop, tagul și branch-ul archive/phase-9-final rămân neschimbate.

Branch-ul poate deveni un PR explicit către develop după review ChatGPT.
Înainte de push se reconfirmă vârful remote develop și izolarea Preview față de
Production; variabilele branch-scoped 9.3 nu sunt copiate automat. Dacă develop
avansează, este necesar review nou al înlocuirii, nu merge automat cu 10B.
Integrarea nu a fost executată și niciun deployment nu a fost declanșat.

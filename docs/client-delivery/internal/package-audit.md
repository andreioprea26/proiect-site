# Audit Client Delivery Package — 10B.3

Data 2026-10-12. Bază: ultimul `origin/develop`,
`aa162d8ffdf1f652378259ea312fe661c46f2435`.
Branch `task/10b3-client-delivery-package`. Scope exclusiv documentație; fără
business logic, schemă, infrastructură remote, Docker, plăți sau Production.
Arhiva Fazei 9 și checklist-ul istoric Production rămân nemodificate.

## Acoperirea livrabilelor

| Cerință | Livrabil |
| --- | --- |
| Index pe etape, intern/client | [Index](../README.md) |
| Repo client, standalone, autorizare, migrations/bootstrap/seed | [Instalator](installer-guide.md), procedurile existente legate |
| Vercel Preview, Auth/SMTP, webhook, Stripe Sandbox, Resend sigur | Instalator, probe distincte de config |
| Informații obligatorii/opționale și acces sigur | [Onboarding final](../../client-onboarding-checklist.md) |
| Funcții reale și proceduri accesibile | [Admin](../client/admin-guide.md) |
| Production/launch, aprobări owner, legal, backup și monitorizare | [Launch checklist](production-launch.md) |
| Predare, acceptanță, revocare, mentenanță/incidente/modificări | [Handover](../client/handover-maintenance.md) |
| Placeholdere, ownership, rezultate și aprobări per client | [Fișa clientului](client-record-template.md) |

S-au citit Bible v0.4, productization plan, onboarding și documentele clean
install/preflight/authorization/runner. Comenzile sunt verificate în package.json
și scripts; ecranele în src/app/admin, modelele Settings/comenzi și config store;
testarea în playwright.config.ts/tests/e2e. Ghidul Next local Deploying a fost
consultat pentru build/start; nu există implementare Next modificată.

Procedurile tehnice 10B.2d rămân sursa gate-urilor. Onboarding-ul este consolidat
din propunerea istorică într-un checklist actual, cu legături către proceduri;
nu dublează implementarea runner-ului. Checklist-ul Fazei 9 este tratat explicit
ca istoric și nu se modifică. Clientul nu primește afirmații despre funcții
planificate în Bible ca și cum ar fi implementate.

## Constatări tehnice — documentate, fără extinderea task-ului

| ID | Dovadă din sursă | Impact și pas separat |
| --- | --- | --- |
| DELIVERY-01 | [Stripe client](../../../src/lib/stripe/client.ts) cere sk_test; [migrare checkout](../../../supabase/migrations/20260827130000_create_stripe_checkout_webhook.sql) și [refund hardening](../../../supabase/migrations/20260901130000_stripe_hardening_refunds.sql) cer cs_test | Live BLOCKED; schimbări TS/SQL și regresie aprobate separat înainte de chei Live |
| DELIVERY-02 | [Guard E2E](../../../tests/e2e/demo-target.ts), [Settings test](../../../tests/e2e/store-settings.spec.ts), [theme test](../../../tests/e2e/theme-brand-assets.spec.tsx) și [fixture transport](../../../tests/e2e/demo-fixture-client.ts) sunt legate de target-uri istorice | E2E complet pe ref client arbitrar BLOCKED, chiar dacă preflight e2e acceptă config; executor/fixtures client generice cer task separat. Nu falsifica ref și nu relaxa granturi |
| DELIVERY-03 | [Playwright config](../../../playwright.config.ts) și [test env](../../../tests/e2e/test-environment.ts) pornesc localhost 3100 și înlocuiesc Stripe/Resend | E2E local nu certifică Preview/webhook/SMTP/livrare reală; probe manuale distincte |
| DELIVERY-04 | [Admin navigation](../../../src/app/admin/layout.tsx), [order model](../../../src/lib/admin/order-model.ts), [audit existent](../../productization-plan.md) | Lipsesc UI shipping settings/roluri/manual order, curier/locker automat, facturare/fiscalitate/campanii/upload privat; declarație client și task-uri separate când necesare |
| DELIVERY-05 | [Storefront layout](../../../src/app/(storefront)/layout.tsx) limitează footer la șase pagini; [Homepage form](../../../src/app/admin/homepage/homepage-block-form.tsx) afișează Development | Verifică accesul la toate politicile; eticheta UI nu confirmă ținta |
| DELIVERY-06 | [Runner](../../client-install-runner.md) creează numai admin tehnic Test și nu configurează dashboards/owner Live | Promovare admin permanent, setup shipping și executor SQL/Production cer plan tehnic concret revizuit și autorizat per client, nu preflight portabil |

Aceste constatări nu sunt defecte reparate în 10B.3 și nu încep 10B.4. Nu se
declară certificarea unui client real, clean install nou sau readiness Live.

## Verificări ale pachetului

- Revizuire acoperire/coerență, separare Test/Preview–Production, aprobări și
  absența instrucțiunilor de bypass/reset sau copiere de secrete.
- Verificare locală: 77 linkuri Markdown relative valide în cele opt documente
  ale pachetului/onboarding; 11 nume de scripturi npm documentate, toate existente
  în package.json. Comenzile runner și opțiunile sunt comparate cu sursele și
  documentele oficiale. Linkul din README către index este verificat separat.
- `git diff --check`, verificare că diff-ul conține exclusiv documentație.
- `npm run verify:migrations`: PASS, 29 fișiere; verificare locală, fără target cloud.
- `npm run scan:secrets`: PASS, zero match-uri în snapshot. Scanarea nu garantează
  absența oricărui secret necunoscut/istoric; nu s-au citit fișiere env private.
- Teste simulate locale: preflight **63/63 PASS**, runner **23/23 PASS**,
  zero fail/cancelled/skipped. Prima încercare în sandbox a eșuat la spawn EPERM; reluate cu
  permisiuni pentru subprocese, fără schimbarea assertions sau acces remote.
- Lint/build/TypeScript/E2E/SQL remote nu sunt rerulate pentru modificări exclusiv
  Markdown; instalarea, plățile și infrastructura nu sunt autorizate în acest task.

Verdict pentru **pachetul de documentație: PASS**, după verificările finale și push.
Certificare client nou completă: **BLOCKED** la E2E generic și la orice probă
obligatorie neexecutată. Production: **BLOCKED/NEAUTORIZAT**, inclusiv Stripe Live.
Predarea unui Test/Preview pentru evaluare este posibilă cu limitele consemnate.

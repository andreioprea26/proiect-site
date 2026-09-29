# 10B.2d — checkpoint productization / clean install

Data auditului: 2026-09-29. **Verdict: BLOCKED pentru criteriile integrale.**
Validarea funcțională din 2026-09-18 rămâne PASS; nu a fost rerulată și nu este
prezentată drept probă live din 29 septembrie. Nu s-a modificat codul/schema.

## 1. Grant fix — PASS în template

`supabase/migrations/20260918150000_explicit_runtime_table_grants.sql`, commit
`ec36dec`, este tracked în template și în branch-ul demo. Acordă explicit:

- authenticated: profiles SELECT/UPDATE, user_roles SELECT, customer_addresses CRUD;
- service_role: SELECT pe orders, order_items, payments, shipments,
  stripe_webhook_events. Nicio permisiune suplimentară pentru fixture-uri.

Un clean install care aplică toate migrațiile din acest branch include automat
și această migrare, fără SQL manual separat. Nu este încă în `develop`, deoarece
merge-ul nu s-a făcut. Fixul cunoscut nu este exclusiv în baza demo; identitatea
exactă a tuturor granturilor nu este dedusă din fișier: probele read-only de azi
confirmă individual toate privilegiile enumerate mai sus. Catalogul are 36 tabele
publice, zero fără RLS; nu s-au schimbat granturi în acest audit.

## 2. Migration state — PASS, 29 Local / 29 Remote

Ultima dovadă din 18 septembrie: 29/29 aliniate și dry-run up to date.
La 29 septembrie `migration list`, `db query` și comanda independentă
`supabase db push --dry-run --linked --project-ref bfmihaxfleztajzyamio`
au ieșit cu cod 1 / `LegacyDbConfigIpv6Error`. Dashboard-ul confirmă separat că
proiectul este **paused**. Nu atribuim automat eroarea IPv6 pauzei și nu urmăm
sugestia CLI de relink în workspace-ul original. Nu s-a aplicat nicio migrare.
Ulterior utilizatorul a reactivat demo-ul: dashboard Healthy. Am legat numai
clone-ul temporar demo prin `supabase link --project-ref bfmihaxfleztajzyamio
--workdir <clone-demo>`, fără relink original sau schimbare DB. Prima conectare
temporară în timpul restaurării a eșuat (EAUTHQUERY); după restaurare:

- `migration list --linked --project-ref bfmihaxfleztajzyamio --workdir <clone-demo>`:
  exit 0, **29/29 Local/Remote identice**, fără migrații suplimentare/lipsă;
- `db push --dry-run --linked --project-ref bfmihaxfleztajzyamio --workdir <clone-demo>`:
  exit 0, **Remote database is up to date**, migrations/seeds/roles toate goale.

Nu s-a executat push fără --dry-run. Eșecurile inițiale nu mai sunt blocaje active.

Lista finală Local = Remote (timestamp; numele sunt din fișierele versionate;
toate fișiere `.sql` în supabase/migrations):

```text
20260811120000_create_account_schema
20260812120000_create_account_bootstrap
20260820120000_add_user_roles_select_own_policy
20260820160000_add_account_rls_policies
20260820200000_create_catalog_base_schema
20260820210000_create_variants_customizations
20260820220000_create_inventory
20260820230000_create_product_images_storage
20260820240000_add_catalog_rls
20260823120000_create_checkout_order_schema
20260823130000_create_checkout_quote_function
20260823140000_place_cod_order
20260827120000_create_payment_reservations
20260827130000_create_stripe_checkout_webhook
20260901010000_allow_stripe_sessions_without_stock_reservations
20260901130000_stripe_hardening_refunds
20260901140000_allow_stale_attached_stripe_holds
20260901150000_reject_conflicting_stripe_sessions
20260902120000_admin_order_status_transitions
20260902160000_shipments_cancellations_refunds
20260902200000_operational_notifications_cod_collection
20260904120000_customer_orders_favorites_reviews
20260904160000_newsletter_contact_custom_content
20260904170000_content_pages_rls_fix
20260904200000_homepage_admin_stats
20260904210000_restrict_homepage_admin_rpcs
20260904230000_security_data_integrity
20260915120000_public_store_settings
20260918150000_explicit_runtime_table_grants
```

## 3. Proveniența clean install — dovadă istorică PASS

Conform jurnalului de instalare din 18 septembrie, proiectul a început fără date
de aplicație, users, orders, payments sau obiecte Storage. A existat automatizarea
RLS a furnizorului, nu tabele copiate din Development. S-au aplicat migrațiile,
nu un dump, restore sau clonă a DB originale. Seed-ul fictiv și utilizatorii demo
au fost creați ulterior separat. Baza NU mai este goală azi; nu o resetăm pentru
a recrea această dovadă. Nu există un export forensic independent al stării inițiale.

## 4. Seed — PASS pentru workflow-ul demo, nu universal

Tracked: `scripts/demo-seed.mjs`, `supabase/seeds/handmade-demo.sql`,
`supabase/seeds/handmade-demo-shipping.sql`; instrucțiuni `docs/demo-seed.md`.
Separat de migrations și E2E. Numai două produse fictive, o categorie, relații,
inventar inițial auditat și transport fictiv opt-in. Fără users, passwords,
orders, payments, Stripe sessions, PII sau secrete în payload.

Runner-ul refuză orice ref diferit de demo, cere --apply explicit, oferă dry-run
cu rollback, nu încarcă .env și nu folosește implicit link-ul din workspace.
SQL folosește tranzacție/locks, refuză seed parțial și instalare populată; seed
complet existent este no-op, fără resetarea stocului consumat. Repeat apply PASS
este dovadă din 18 septembrie, nu rerulat acum.

Limite: verifică numărul 29, nu manifestul exact de migrații; guard-ul SQL este
o setare de sesiune furnizată de operator, nu o identificare criptografică a DB.
Protecția contra țintei Production se aplică runner-ului nemodificat. Nu afirmăm
că SQL copiat manual ori un script modificat nu poate fi executat în altă parte.

## 5. Preflight — BLOCKED / mecanism incomplet

Vezi `docs/preflight.md` pentru matricea exactă. Există verificări parțiale în
demo-seed, provision-demo-e2e și run-demo-e2e, plus checklist manual. **Nu există
script versionat complet de preflight pre-install** pentru toate cerințele:
target + environment + env necesare + Production guard + config/secrets copiate
+ manifest expected migrations + configurația testelor. Scripturile actuale sunt
legate de ref-ul demo; unele fac writes și nu trebuie prezentate ca preflight read-only.
Nu am introdus un installer nou într-un checkpoint documentar.

## 6. Repository demo — PASS, scope explicit

Repo separat `andreioprea26/handmade-project`, branch `codex/10b2d-clean-install`,
verificat prin clone nou. Origin este numai repo demo, fără remote către original.
La începutul auditului: demo `b7f73f9`, template `6cdc584`, arbori identici
`85b107eaa24fadc99660d5792e93ccc89cc24746`, ambele curate și pushed.
306 fișiere tracked: zero căi interzise (.env secret, .vercel, .supabase,
supabase/.temp, .next, node_modules). `.env.example` este permis și fără chei.
Scan de pattern-uri de chei Stripe/Resend/Supabase/JWT/private keys: PASS pentru
fișierele text tracked din snapshot, fără afișarea valorilor. După clone curat,
conectarea CLI a generat intenționat config local ignorat pentru demo; nu este
config copiat din original și nu este inclus în commit. Nu este audit
exhaustiv al întregului istoric Git sau al tuturor secretelor posibile.

## 7. Vercel demo — READY confirmat; integrare live incomplet verificată

Dashboard autentificat: team `project-handmade` Hobby, proiect `handmade-project`,
repo demo corect. Deployment `DN8TC43ozjwpbU2AykKPyjNuqKHn` este READY/current,
main `936cb84`, domeniu `handmade-project-olive.vercel.app`. Nu este branch-ul final
10B.2d. APP_URL corespunde domeniului demo (verificare booleană, fără secrete).

| Variabilă | Prezență | Scope în proiectul demo |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | present | Production + Preview |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | present | Production + Preview |
| SUPABASE_SERVICE_ROLE_KEY | present | Production + Preview |
| STRIPE_SECRET_KEY | present | Production + Preview |
| RESEND_API_KEY | present | Production + Preview |
| EMAIL_DELIVERY_MODE | present | Production + Preview |
| EMAIL_TEST_RECIPIENT | present | Production + Preview |
| RESEND_FROM_EMAIL | present | Production + Preview |
| RESEND_REPLY_TO_EMAIL | present | Production + Preview |
| APP_URL | present | Production |
| STRIPE_WEBHOOK_SECRET | present | Production |

Production de mai sus este scope-ul demo Vercel, NU Production original.
După autentificarea utilizatorului, Stripe arată Sandbox `environnement de test
project-handmade`, contul demo; destinația `handmade-demo-vercel` este Active,
5 evenimente, endpoint `https://handmade-project-olive.vercel.app/api/stripe/webhook`.
Resend arată contul `andreiprojects26`, cele două emailuri pentru comanda de audit
Delivered și subiecte TEST către destinatarul demo aprobat. Nicio retrimitere.
Supabase Auth Site URL corespunde demo-ului; allowlist exact 2 URL-uri:
`/auth/confirm` și `/auth/reset-password` pe același domeniu demo, fără localhost.

Valorile Secret Vercel rămân mascate. Nu deducem valoarea/membership-ul unei chei
din simpla prezență și nu certificăm prin comparație directă că toate cheile actuale
sunt distincte de original; există dovezile instalării și fluxului demo, nu un audit
exhaustiv al secretelor. Preview nu are APP_URL și webhook secret în scope; nu îl
declarăm echivalent mediului demo principal. Config redirect email este susținută
de livrările TEST, nu de recitirea valorii mascate EMAIL_DELIVERY_MODE.

## 8. Comanda CMD-2026-00000101 — reaudit live PASS

Ultima probă read-only (18 septembrie): exact o plată de 10890 bani, order/payment
paid, rezervare consumed qty 1, stoc 9, un completed webhook, două notificări sent.
Aceeași livrare webhook a fost retrimisă după corectarea secretului; nu s-a creat
o a doua plată. Comanda rămâne intenționat pentru audit.

Reaudit CLI în transaction READ ONLY / rollback la 29 septembrie: order_count=1,
order_paid=true, payments=1, payment_paid=true, amount_minor=10890, reservations=1,
consumed=true, stock_effects=1 (mișcări legate de paymentId), stock_before=10,
stock_after=9, stock_delta=-1, current_stock=9, webhooks=1. **Retry-ul nu a produs
efect business duplicat.** Nu am trimis webhook, schimbat comandă sau făcut altă plată.

## 9. Izolarea originalului — confirmări și limită

Nicio operație de write către Supabase/Vercel/Stripe/Resend original nu a fost
executată în acest audit. Jurnalul anterior consemnează original Development
neatins (inclusiv neaplicarea migrării noi), fără schimbări manuale în integrările
originale. Nu avem un audit log extern complet pentru întreaga perioadă 10B.2d.
În particular, push-urile pe repository-ul original pot declanșa Preview Vercel;
nu afirmăm că Vercel original nu a avut absolut nicio modificare/deployment.

Git remote verificat read-only: main `8850f28`, develop `8784dfc`; branch archive
`6d84c236d4a91f460549be4cf175fd68e0ca1615`, tag annotated `phase-9-final`
object `08d9de4540325e5ac2f18dea14549bb57de3abeb`, peeled la același `6d84c236`.
Referințele nu au fost mutate. Local main este încă `10c776a` (diferență preexistentă,
nu a fost resetat/actualizat). Nu s-a făcut merge sau push pe main/develop/archive/tag.

## 10–12. Master, documentație și Git

Fixurile necesare cunoscute sunt în branch-ul template, nu numai în demo:
ec36dec grants/security, aa77528 seed, ff97aad shipping, 382a081 validări,
3a27b06 identități E2E, 6cdc584 fixture isolation și certificare demo.
Pregătite pentru review/merge în develop, dar preflight-ul complet lipsește.

Documente: `docs/clean-install-guide.md`, `docs/demo-seed.md`, `docs/preflight.md`,
`docs/demo-e2e.md`, `docs/productization-plan.md`, `docs/client-onboarding-checklist.md`,
`docs/10b2d-clean-install-checkpoint.md`, acest raport și registrul constatărilor.
Commitul auditului este numai documentație; HEAD/push/working tree/diff-check sunt
raportate la handoff, după salvare, fără hash autoreferențial în document.

Rezultate păstrate din 18 septembrie: Chromium 186/186, SQL 14/14, unit 30/30,
ESLint/TypeScript/build PASS. Nicio rerulare artificială pentru documentație.

## Verdict și condiții de deblocare

**10B.2d BLOCKED. Nu este încă demonstrat ca workflow complet reproductibil
de la zero pentru un client nou.** Instalarea manuală controlată pe demo a fost
demonstrată; asta nu dovedește preflight-ul complet sau configurarea altui client.

Reactivarea, conectivitatea, 29/29 + dry-run, auditul comenzii și sesiunile furnizorilor
au fost rezolvate în timpul auditului. Rămân implementarea/testarea preflight complet
cu manifest/environment guards și procedură adaptabilă unei ținte Test noi;
pentru afirmația absolută de izolare a tuturor secretelor/config, dovezi de binding
curente fără dezvăluire și delimitarea explicită a eventualelor Preview automate.
Nu sunt necesare reset, dump, clonare DB, noi plăți ori slăbirea RLS pentru acestea.

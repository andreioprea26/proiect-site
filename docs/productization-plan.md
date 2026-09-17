# 10B.1 — Audit și plan de productizare

Data: 14 septembrie 2026. Verdict: **PASS pentru audit și arhitectură**, nu
certificare că template-ul se poate instala sau lansa deja fără intervenție.
Scope: template master → repository și deployment separat pentru fiecare business
din România. Fără SaaS, multi-tenancy, `tenant_id`, login comun sau resurse create.

Actualizare 15 septembrie 2026: **10B.2a implementat și validat pe branch separat**.
Config public central, branding, copy neutru și regresie 170/170 sunt documentate în
[checkpoint-ul 10B.2a](10b2a-public-store-config.md). Inventarul de mai jos rămâne
fotografia auditului 10B.1, nu este rescris retroactiv.

Actualizare 10B.2b: singleton-ul public `store_settings`, RPC-urile restrictive,
pagina `/admin/settings` și integrarea request-scoped a brandingului sunt implementate.
Configul versionat rămâne fallback; detalii și rezultate în
[checkpoint-ul 10B.2b](10b2b-admin-store-settings.md). Nu include 10B.2c sau lansare Production.

## 1. Baza auditului și limitele dovezilor

Actualizare 10B.2c: palete semantice tipate și logo/favicon/OG versionate, fără
extindere DB/Storage sau editor CSS. Admin Store Settings → fallback `store.ts`
rămâne unica sursă de identitate. Vezi [checkpoint 10B.2c](10b2c-theme-brand-assets.md).
Acesta nu certifică încă clean install și nu începe 10B.2d.

- Plecare: `develop` / `origin/develop`, commit
  `6d84c236d4a91f460549be4cf175fd68e0ca1615` (merge 9C, PR #48).
- Referințe permanente: tag annotated `phase-9-final` și branch
  `archive/phase-9-final`, ambele la acest commit. Nu se mută pentru productizare.
- [Project Bible v0.4](project-bible-v0.4.md) descrie intenția originală handmade.
  Direcția 10B aprobată de proprietar schimbă modelul de reutilizare, nu invarianta
  unui singur magazin per aplicație. Funcțiile planificate în Bible nu sunt automat
  funcții implementate: de exemplu setările, upload-urile private, facturarea.
- Inspectate: `src/app`, `src/lib`, `next.config.ts`, `.env.example`,
  `playwright.config.ts`, `tests`, cele 27 de migrații, documentația și fișierele
  tracked. Nu s-au citit/afișat valori de secrete pentru inventarul configurației.
- Citire Development prin API, doar numărători și etichete de catalog demo, cu
  verificarea țintei `bdyocajhhylvasfhmnal`; fără export de clienți sau date private.
- Istoricul Local/Remote 27/27 și rezultatele 9C sunt dovezi istorice din
  [checklist-ul 9C](production-launch-checklist.md), nu teste rerulate în 10B.1.
  Nu s-a instalat schema pe un proiect nou și nu s-a recertificat Production.
- Nu există seed, installer sau workflow CI versionat în `.github` la baza auditată.
  README încă declară Faza 1 și integrări pregătitoare: trebuie actualizat ulterior.

## 2. Rezumat: ce împiedică reutilizarea astăzi

| Prioritate | Constatare | Implicație / acțiune propusă |
| --- | --- | --- |
| P1 | Brand și limbaj handmade în multe componente, metadata și emailuri | Config public central și cititori comuni; conținut editabil fără fork de componente |
| P1 | Nu există Admin Store Settings | Proprietarul poate opera magazinul, dar nu îl poate rebrandui complet |
| P1 | Stripe acceptă doar `sk_test_` / `cs_test_`, inclusiv în DB | Live necesită task separat, migrare forward-only și regresie financiară; nu doar schimbare de env |
| P1 | Instalarea nouă și seed-ul nu au fost repetate pe o bază goală | Dry-run/preflight și verificare clean install, separat aprobate; nu clonare Development |
| P1 | Configurația Auth/SMTP, webhook și domeniu trăiește în dashboard-uri | Checklist per client, cu verificare end-to-end; Git nu reproduce aceste setări |
| P1 | Testele presupun credentials și uneori date preexistente; unele au skip condițional | Preflight obligatoriu și inventar fixtures; zero skip nu se deduce din exit code |
| P2 | Shipping în DB, fără UI pentru administrarea metodelor; pickup dedus din nume/cod | Setup tehnic controlat; model explicit de livrare numai într-un task separat |
| P2 | TVA/facturare, texte juridice și curier real nu sunt rezolvate | Decizii ale clientului și validare de specialitate înainte de live |
| P2 | Paleta și asset-urile nu au un contract central | Tokens semantici și asset-uri validate, nu editor liber CSS/HTML |

Deja comune: catalogul relațional, taxonomiile, variantele, personalizările simple,
snapshot-urile comenzilor, checkout guest/customer, stocul atomic, webhook-uri,
idempotency, refunduri, COD, favorite, reviews/moderare, formulare de contact,
newsletter (colectare), conținut și homepage cu sloturi. Se păstrează RLS, rolurile,
autorizarea server-side și separarea notelor administrative de datele publice.

## 3. Clasificare și matrice de configurare

Legendă: **A** = 1 admin; **E** = 2 env; **C** = 3 config central versionat;
**D** = 4 date/seed; **L** = 5 logică comună; **P** = 6 decizie separată per client.
Coloana „destinație” este recomandare, nu funcție deja construită. Unde sunt două
categorii, prima este proprietarul setării, a doua indică dependența/decizia.
Toate căile de mai jos sunt relative la rădăcina repository-ului.

### Identitate, conținut și design

| Setting | Unde este acum | Destinație / categorie | Client-specific? |
| --- | --- | --- | --- |
| Nume magazin | `src/lib/seo.ts` (`SITE_NAME`), `src/app/(storefront)/layout.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/account/layout.tsx` | A, fallback C; o singură sursă de date publice | Da |
| Brand Auth | `src/app/{login,register,forgot-password,reset-password}/page.tsx`, `src/app/auth/confirmed/page.tsx` | A/C, cititor comun cu storefront | Da |
| Titluri și descriere globală | `src/lib/seo.ts`, `src/app/layout.tsx`, layout storefront și metadata Auth/admin/account | A/C; titlu template derivat din numele magazinului | Da |
| Erori globale | `src/app/global-error.tsx` conține titlu Brand Handmade | C fallback disponibil fără DB, fără dependență de fetch Settings | Da |
| Descrieri handmade pe rute | `src/app/(storefront)/{page,shop/page,categories/page,collections/page,contact/page,custom-orders/page}.tsx` și rutele dinamice categorii/colecții/produse | C texte generice, A conținut editorial | Da |
| OG/Twitter/canonical | `src/app/layout.tsx`, `src/lib/seo.ts`, produsul din `products/[slug]/page.tsx` | A pentru identitate/OG image, E pentru origin; date produs din D | Da |
| Imagine OG implicită | Nu este definită global; produsul folosește imaginile proprii | C asset default, apoi A asset validat | Da |
| Logo | Nu există logo configurabil; header-ele afișează text | C asset inițial; A upload numai cu contract Storage nou aprobat | Da |
| Favicon | `src/app/favicon.ico` asset static, fără configurare admin | C în 10B.2; nu promitem schimbare instant din admin | Da |
| Asset-uri starter | `public/{file,globe,next,vercel,window}.svg` | C; verificare utilizare/licență, nu se livrează ca identitate de client | Da |
| Culori/fonturi | `src/app/globals.css` (Arial, fundal, focus), Tailwind `emerald/amber/stone`, `#fbfaf6` în layout/home, admin dark | C tokens semantici cu contrast testat; paletă aleasă P | Da |
| Paleta email | `src/lib/email/templates.ts`: hex-uri inline și Arial | C tokens email controlați; nu CSS arbitrar din DB | Da |
| Hero / promo / titluri secțiuni | `src/lib/homepage/server.ts` (`HOMEPAGE_DEFAULTS`), `homepage_blocks`, `/admin/homepage` | A deja disponibil; D defaults neutre opționale | Da |
| Argumente de încredere homepage | `src/app/(storefront)/page.tsx`: „De ce handmade?”, producție manuală și livrare România | A listă scurtă validată sau C inițial; nu promisiuni universale | Da |
| Ordine/activare homepage | Cinci `HOMEPAGE_SLOTS`, RPC și admin; fără model de hero image | A pentru ordinea/activarea existente; L pentru sloturi, fără page builder | Parțial |
| Empty states handmade | `src/app/(storefront)/_components/{cart-page-client,product-grid}.tsx` | C texte ecommerce neutre | Da |
| Footer/despre brand | `src/app/(storefront)/layout.tsx`, descriere handmade hardcodată | A/C | Da |
| Linkuri informative footer | `content_pages`, ordonate după titlu; `slice(0,6)` în layout | A conținut existent; C listă explicită de linkuri esențiale în viitor | Da |
| Copyright/date firmă | Nu există bloc dedicat complet în footer | A date publice; conținut și obligații aprobate P, fără text juridic inventat | Da |
| Contact/email/telefon/WhatsApp/social | Pagina contact are formular, nu setări publice dedicate pentru aceste valori | A câmpuri opționale validate; ascunde valorile lipsă | Da |
| Texte legale/FAQ/despre/livrare | `/admin/content`, `src/lib/content/server.ts`, `content_pages` draft/published | A; P pentru aprobarea juridică, D drafturi goale | Da |
| Imagini catalog | `product_images.storage_path`, bucket `product-images`, admin upload și galerie | A/D, fișiere proprii clientului, URL derivat din proiectul său | Da |
| Brand în email text/HTML | `src/lib/email/templates.ts` | A/C; escape HTML păstrat, subject/mesaje din config controlat | Da |
| Identificarea integrării Stripe | `src/lib/stripe/client.ts` appInfo „Brand Handmade”, versiune `0.1.0` | C identitate a template-ului; branding Checkout se configurează separat P în Stripe | Parțial |
| Cheie coș browser | `src/lib/cart/model.ts`: `handmade-store-cart-v1` | L, contract versionat stabil; nu derivat din numele editabil al magazinului | Nu |
| Snapshot checkout browser | checkout-form și card-cart-confirmation: `brand-handmade:card-checkout:` | L constantă comună; schimbare doar cu compatibilitate, nu cosmetizare automată | Nu |
| README/Bible/rapoarte istorice | `README.md`, `docs/project-bible-v0.4.md`, rapoarte Supabase/9C | C documentație template nouă; istoria originală marcată, nu instrucțiuni active per client | Da |

### Reguli comerciale și operaționale

| Setting | Unde este acum | Destinație / categorie | Client-specific? |
| --- | --- | --- | --- |
| Monedă | `src/lib/cart/model.ts`, checkout types/server/card-server, Stripe snapshot, SQL orders/payments/refunds/COD/statistici: RON | L; C doar declară RON, nu oferă un selector fără suport DB | Nu, template RO |
| Țară/locale/fus | `src/lib/account/validation.ts`, checkout validation/form, SQL; `ro-RO`, `ro_RO`, `lang=ro`, `Europe/Bucharest` | L/C, RO implicit; fără internaționalizare în 10B.2 | Nu |
| TVA/facturare | Total = subtotal + transport; date companie/CUI, fără motor TVA sau facturi/e-Factura | P; nu deducem TVA zero sau conformitate fiscală din absența câmpurilor | Da |
| Prețuri și catalog | `/admin/products`, categories/collections, variante și costuri personalizare | A/D, deja configurabile | Da |
| Metode/tarife transport | `shipping_methods`, citite în `src/lib/checkout/server.ts`, snapshot în orders | D/P inițial prin operator; A viitor, nu există pagină shipping settings | Da |
| Prag transport gratuit | Nu apare regulă dedicată în quote/placement; tarif din shipping_methods | P; implementare separată pe server și DB, nu doar text/UI | Da |
| Curier/locker/ridicare | Shipment manual; `shipping_method_requires_tracking` în migrarea `20260902160000` caută `pickup|ridicare|personal` în nume/cod | P/D; A pentru AWB existent; tip explicit viitor, fără refactor state machine acum | Da |
| Tracking URL | `/admin/orders/[id]`, `order-actions.ts`, `shipment-form.tsx`: HTTPS validat, carrier/AWB | A per comandă; P curierul; fără API de etichete cumpărate | Da |
| COD | Metodă disponibilă în checkout și RPC-uri; încasare separată în cod_collections | L; P pentru utilizare comercială, fără toggle UI care lasă endpoint-ul deschis | Parțial |
| Stripe | Checkout server, webhook semnat, `sk_test_` și `cs_test_` validate în TS/SQL | L pentru flux, E/P pentru cont/mod; Live task separat, nu modificat aici | Da |
| Rezervări | `STRIPE_CHECKOUT_DURATION_SECONDS` 30 min; DB hold inițial 35 min / buffer față de expiry | L, nu Store Settings | Nu |
| Stoc/oversell | `inventory`, `stock_reservations`, RPC-uri tranzacționale | L invarianta atomică; A cantități și low_stock_threshold | Parțial |
| Unicat / made-to-order / bundle | Enum produse, catalog admin, SQL inventory și checkout | L; A tipul fiecărui produs; bundle nu este un motor de componente | Parțial |
| Limita cantității | `DEFAULT_MAX_QUANTITY=99` și validările SQL/UI | L; nu mutăm unilateral în config | Nu |
| Personalizări | selection/text/boolean/image în model; admin configurabil; image necesar blochează achiziția în `src/lib/cart/configuration.ts` | A pentru opțiuni simple; P pentru upload privat încă neimplementat complet | Da |
| Upload imagini publice | 5 MiB, JPEG/PNG/WebP/AVIF în TS și bucket SQL; bodySizeLimit 6mb în next.config | L securitate; C contract, fără slăbirea validărilor | Nu |
| Statusuri/tranziții/refund | `src/lib/admin/order-model.ts`, migrații 7A/7B/6C | L, nu enumerări editabile în admin | Nu |
| Număr comandă | `next_order_public_number()` în `20260823120000`: prefix CMD, secvență DB | L, unic per bază; prefix cosmetic viitor doar cu migrare | Nu |
| Reviews/favorites | Ownership, achiziție eligibilă, moderare, RPC/RLS | L; A moderare; D date specifice clientului, niciodată seed de recenzii „reale” | Parțial |
| Newsletter/contact/cereri | SQL 8B, admin engagement, honeypot/timp minim și dedupe/rate limit | L; A gestionare; P consimțământ/retenție, fără campanii newsletter implementate | Parțial |
| Notificări | `src/lib/email/{templates,notifications,delivery}.ts`, retry admin, dedupe și audit | L mecanism; E sender/mode, A/C identitate publică | Da |

### Servicii și environment — fără valori secrete

| Setting | Unde este acum | Destinație / categorie | Client-specific? |
| --- | --- | --- | --- |
| Supabase project ref / DB | Link CLI local ignorat Git; rapoarte docs ale magazinului original | P cont/proiecte noi separate; manifest de instalare cu ref-uri ne-secrete | Da |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.example`, `src/lib/config/env.ts`, platform env | E, publice și distincte per mediu/client | Da |
| `SUPABASE_SERVICE_ROLE_KEY` | env, `src/lib/supabase/admin.ts` | E server-only; nu în Settings public sau bundle | Da |
| `APP_URL` | env, getAppUrl pentru Auth/Stripe/email; getSiteUrl are fallback Vercel | E origin HTTPS explicit pentru Preview/client; fallback SEO nu configurează restul aplicației | Da |
| Auth Site URL / allowlist / SMTP/templates | Supabase Dashboard, nu reproduce `.env` | P operator; URL-uri exacte `/auth/confirm`, `/auth/reset-password`, SMTP și sender per client | Da |
| Stripe cont și branding | Dashboard Sandbox original | P cont business separat, Test separat de Live; fără cont shared/Connect marketplace | Da |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | env și validatori TS; endpoint `/api/stripe/webhook` | E per client/mediu/endpoint, fără copierea secretelor master | Da |
| Stripe webhook URL/events | Dashboard, cinci events documentate în stripe-test-mode.md | P endpoint dedicat instalării, nu mutarea webhook-ului original | Da |
| `RESEND_API_KEY` | env, SDK server-only | E cheie client; resurse sender separate | Da |
| `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL` | env, getEmailEnvironment; Reply-To opțional | E identitate expeditor verificată; contactul public A nu schimbă automat sender-ul | Da |
| `EMAIL_DELIVERY_MODE`, `EMAIL_TEST_RECIPIENT` | env; live numai cu `VERCEL_ENV=production` | E; Preview redirect, destinatar test aprobat | Da |
| Vercel proiect/team/Git/branch env | `.vercel` ignorat; dashboard, `main` Production Branch | P/E proiect nou și env separat; eliminarea legăturilor locale la copiere | Da |
| `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL` | Variabile automate Vercel, consumate în env/seo | E furnizate de platformă; nu copiate manual între clienți | Da |
| Domeniu/DNS/TLS | Nu există domeniu comercial aprobat în template | P client; APP_URL/Auth/webhooks actualizate împreună | Da |
| Storage | Migrare creează bucket public `product-images`, next.config derivă hostname din Supabase URL | L numele bucket-ului; D obiecte și P proiect separate | Da, date/proiect |
| Admin bootstrap | Trigger acordă customer; fără UI creare admin | P operator verifică UUID/identitate și acordă rolul controlat; niciun admin default | Da |
| `E2E_ADMIN_EMAIL/PASSWORD`, `E2E_TEST_EMAIL/PASSWORD` | Consumate în teste; perechea customer lipsește din `.env.example` | E numai Test/CI, documentare completă și preflight viitor | Da |
| `CI`, `PLAYWRIGHT_REUSE_EXISTING_SERVER` | playwright.config.ts; port 3100 și valori Stripe/Resend izolate în test-environment.ts | E test-only; nu conectăm suita la Production | Parțial |
| `SHIPPING_PROVIDER`, `SHIPPING_API_KEY` | Placeholdere `.env.example`, neconsumate | P viitor; nu sunt integrare curier funcțională | Da |

## 4. Arhitectura recomandată și proprietarul fiecărei valori

Un release versionat al master-ului produce instalări independente A, B, C.
Fiecare are repository, Vercel, Supabase/Auth/Storage, Stripe, Resend și domeniu
proprii; Preview/Test și Production separate în interiorul fiecărui client.
Nu există bază centrală cu clienți, rutare după tenant sau checkout comun.

Propunere 10B.2, nu fișiere existente:

- `src/lib/config/store.ts`: contract tipat PUBLIC pentru identitate, texte neutre,
  assets și defaults. Nimic secret, fără acces DB/env privat din componente client.
- `getPublicStoreSettings()` server-side: whitelist de câmpuri publice, tipată;
  `getAdminStoreSettings()` protejat distinct. Nu serializa un obiect de env.
- Precedență explicită: setare admin validată → fallback din config central.
  Env de infrastructură nu poate fi suprascris din admin. Aceeași identitate
  alimentează UI, metadata și email; cache/request memoization și invalidare după
  salvare trebuie proiectate/testate, nu fetch duplicat în fiecare componentă.
- Config static minimal pentru `global-error`, favicon și componentele care
  trebuie să funcționeze când DB nu răspunde. Redarea publică are fallback sigur;
  preflight-ul instalării eșuează dacă schema/Settings obligatorii lipsesc.
- Themes prin tokens semantici (brand/background/text/focus), nu schimbarea
  culorilor de status și nu CSS liber introdus de proprietar.
- Dacă Settings persistă în DB: singleton per instalare, fără tenant_id; migrare
  aditivă, server actions autorizate, RLS și granturi specifice numai noului obiect.
  Nu modifica politicile orders/payments/inventory. Necesită aprobare în 10B.2.
- Nu folosi service_role pentru simpla citire a Settings publice. Niciun token,
  API key, rol, template HTML executabil sau destination webhook în acest tabel.
- Cheile de coș rămân stabile și izolate natural de origin; redenumirea magazinului
  nu trebuie să piardă coșuri. Nu presupunem izolare între două magazine sub
  același origin: fiecare client primește origin separat.

### Ce poate face deja proprietarul și ce lipsește

Poate administra catalog, variante, personalizări simple, imagini, stoc/prag mic,
conținut, sloturi homepage, operațiuni comenzi, tracking, moderare și mesaje.
Nu poate configura complet brand, logo/favicon, contact/social, SEO implicit,
paletă sau infrastructură. Nu există pagină generală Settings ori management
de utilizatori/admin. Pentru onboarding este încă necesar un operator tehnic.

Admin → Store Settings recomandat: display name, tagline, descriere scurtă/SEO,
contact public, telefon/WhatsApp opțional, listă social HTTPS, text footer și
asset-uri validate ulterior. Se păstrează `/admin/homepage` și `/admin/content`;
nu se dublează într-un CMS. Numele societății/date comerciale sunt date publice
separate de brand; validarea conținutului juridic rămâne responsabilitatea clientului.
Nu se expun monedă, state machine, TTL, RLS, Stripe keys, SMTP sau drepturi admin.

## 5. Date și strategia seed

Snapshot read-only Development la audit; numărătorile se pot schimba ulterior:

| Grup | Observat | Tratament pentru client nou |
| --- | --- | --- |
| Catalog | 292 produse, 292 inventory, 3 categorii, 1 colecție; 0 product_images | Nu exportăm baza; demo separat opțional |
| Demo explicit | Cană Pădure, Lumânare Lavandă, Tablou brodat, Geantă Sage, Brățară Lună; 3 categorii demo, Colecția Atelier Demo | Exemple fictive, nu catalog comercial implicit |
| Operațiuni | 296 orders, 293 payments, 291 stock_reservations, 38 shipping_methods, 2 notification_logs | Nu copiem; include istoric E2E/Sandbox, numărul nu demonstrează starea fiecărei rezervări |
| Identitate | 6 profiles, 9 user_roles, 2 customer_addresses | Nu copiem Auth users, parole, roluri, sesiuni sau PII |
| Engagement | 0 reviews/favorites/newsletter/contact/custom requests | Nu copiem nici dacă ulterior sunt populate |
| Conținut | 0 content_pages, 0 homepage_blocks | Homepage vizibil provine din fallback TS, nu dintr-un seed DB |

Ordine recomandată pentru viitor:

1. **Schema obligatorie**: migrațiile în ordine, tipuri, RPC, RLS, trigger Auth,
   bucket public; backfill-urile istorice se păstrează, nu se șterg pentru a face
   un seed. Nu există un catalog demo instalat de migrațiile actuale.
2. **Bootstrap minim**: setări neutre validate dacă noua schemă le cere; admin
   creat pentru proprietarul aprobat; metodă de livrare și catalog introduse
   explicit înainte de checkout. Niciun cont/parolă default în SQL/Git.
3. **Demo opt-in**, separat de migrări: manifest versionat cu date fictive, imagini
   cu licență, namespace și identificatori proprii seed-ului. Nu dump din DB.
   Se permite numai în proiectul Test identificat explicit, nu în Production.
4. **Fixture-uri E2E**: separate de demo, namespace unic/run, propriile users și
   shipping/catalog; testele SQL în transaction/rollback. Testele care lasă audit
   arhivează controlat doar propriile produse/metode, nu șterg comenzi imutabile.

Seed-ul viitor trebuie să aibă dry-run, verificare țintă/mediu, refuz pe bază
necunoscută/negoală în afara namespace-ului propriu, tranzacție DB, idempotency
fără suprascrierea editărilor clientului și manifest pentru obiectele Storage.
Storage nu este atomic cu SQL: încărcare în prefix dedicat și compensare numai
pentru obiecte create de acea rulare, cu autorizare înainte de cleanup.
Nu reseta secvențe sau migrații. Niciun token de confirmare, session ID, comenzi
Sandbox, reviews, înscrieri newsletter, mesaje sau jurnale de notificări în seed.

Nu s-a șters nimic în 10B.1. Comenzile 9B/9C rămân audit în proiectul original.
Numărătorile nu sunt folosite ca listă de ștergere.

## 6. Teste și instalare reproductibilă

`tests/e2e/storefront.spec.ts` citește catalogul public și acceptă empty state;
nu toate testele depind de un slug demo. Alte teste discovery/SEO au nevoie de
produse eligibile și își aleg date din catalog. Suitele admin/account au conturi
în env; suitele 8A/8B verifică schema și pot face skip. Fixture-urile de operațiuni
folosesc service_role și pot păstra audit/arhive; `admin-operations.spec.ts` are
și căutare de fixture-uri istorice după pattern. Nu rula suita pe baza clientului
cu trafic/date reale. Nu considera „exit 0” dovadă că toate testele au rulat.

Înainte de replicare: preflight țintă Test, schema completă, conturi dedicate,
catalog de test și sender redirect. Fail explicit pe config lipsă, verificarea
numărului de teste/skip, fără relaxarea assertions. SQL + E2E rulează în Test;
pe Live doar smoke non-destructiv și tranzacțiile controlate aprobate separat.
Nu există dovadă clean-install nou în acest audit; aceasta este un criteriu de
acceptare viitor, cu proiect/mediu aprobat și fără Docker.

## 7. Onboarding și release per client

Flux: release master aprobat → repo client fără legături locale/secrete →
Supabase Test separat → migrări → bootstrap → env/branding/catalog → Auth și
Sandbox → teste → aprobări comerciale/live → Production separat → handover.
Pașii executabili și gate-urile sunt în
[Client onboarding checklist](client-onboarding-checklist.md).

Model de update: se înregistrează commit/tag master, schema și customizările
clientului. Update-urile master se integrează prin PR într-un branch al repo-ului
clientului, cu Test și migrații forward-only; nu auto-push la toți clienții.
Config/asset-uri client separate de module comune reduc conflictele. Repo nou
din release aprobat, nu copiere de `.env.local`, `.vercel`, `.supabase`,
`supabase/.temp`, `node_modules`, `.next`, rapoarte cu tokenuri sau datele DB.
Backup Git nu este backup DB/Auth/Storage/dashboard; rollback de cod nu inversează
automat schema sau tranzacțiile. Handover include ownership conturi, acces minim,
backup/restore, monitorizare și responsabil pentru incidente.

## 8. Propunere 10B.2 — scope mic, în pași verificabili

1. **10B.2a, contract/config central public**: identitate, copy neutru, asset paths;
   înlocuiește hardcode-urile vizibile/SEO/email fără schimbarea Stripe/stoc/RLS.
   Păstrează mesajele operaționale și cheile browser. Actualizează README/env example.
2. **10B.2b, Settings minim**: după aprobare distinctă, singleton cu câmpuri publice,
   UI admin simplă, validare și invalidare cache; migrare aditivă numai Settings.
   Favicon și paleta pot rămâne C pentru prima versiune, fără editor vizual.
3. **10B.2c, theme/assets**: tokens semantici și assets statice; upload logo/OG numai
   cu reguli explicite. Bucket product-images cere prefix product UUID, deci nu
   încărcăm arbitrar logo-uri acolo și nu lărgim politica existentă pentru comoditate.
4. **10B.2d, seed/preflight**: separă demo de E2E/bootstrap, completează inventarul
   env și validează o instalare goală autorizată; niciun client real automat creat.

Criterii propuse: două configurații fictive redau brand diferit fără fork de
componente; Settings nu expune secrete; anon/customer nu poate modifica setări;
metadata/email/header/footer/Auth coerente; golirea coșului și state machines
neschimbate; tokenii de culoare păstrează contrast/focus; teste relevante, lint,
TypeScript, build și Chromium complet verde fără skip mascat. Migrații doar dacă
subtask-ul Settings a fost aprobat. Orice regresie financiară oprește livrarea.

**Nu intră în 10B.2 implicit:** activarea Stripe Live (necesită TS + SQL separat),
tax engine/e-Factura, shipping automation/praguri, upload privat, roluri complexe,
refund redesign, modificarea regulilor de stoc sau operațiuni Production.

## 9. Ce nu generalizăm

RON, RO, română și Europe/Bucharest rămân contractul template-ului românesc.
Nu multi-currency/i18n, marketplace, subscription, tenant_id, DB shared, Stripe
shared, login comun, billing pentru clienții agenției, orchestration SaaS sau
installer complex. Nu „configurăm” toate enum-urile și funcțiile SQL din admin.
Siguranța plăților, stock locks, snapshot-urile, idempotency și RLS rămân logică
comună, nu preferințe comerciale.

## 10. Automatizare ulterioară și operațiuni manuale

Automatizabil după aprobare: copiere release/manifest, validare nume env fără
valori în logs, verificare origin/ref-uri, dry-run migrări, bootstrap idempotent,
seed Test, detectare reziduuri demo, lint/type/build/tests, raport onboarding și
verificări URL/HTTPS. Nu executat aici.

Manual: ownership conturi și acceptarea costurilor, domeniu/DNS, Stripe business
verification/Live, secrete și acces, verificare email real, branding și drepturi
imagini, curier și fiscalitate/juridic, prima plată/refund live aprobate, predare.
Configurarea sender-ului Auth este separată de `RESEND_FROM_EMAIL` al aplicației.
Supabase documentează limitele sender-ului implicit și configurarea SMTP; se
verifică per client, fără a deduce setarea actuală din documentația furnizorului.
[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
Stripe separă secretele webhook Test/Live; fiecare instalare își configurează
endpoint-ul propriu. [Stripe webhooks](https://docs.stripe.com/webhooks).
Sender-ul Resend trebuie verificat pentru domeniul clientului.
[Resend domains](https://resend.com/docs/dashboard/domains/introduction).
Nu se estimează/preaprobă planuri sau costuri în acest audit.

## 11. Verificarea livrabilului 10B.1

Exclusiv două documente noi. Verificări: inventar surse și migrări, citire
Development fără mutații/PII, cross-check matrice/căi, diff și scanare secrete în
documente. Nu s-au rerulat artificial Playwright/lint/type/build pentru prose.
Cost nou: 0. Fără resurse noi, schema/RLS/business logic neschimbate,
Production/main neatinse. Fără merge. Așteaptă review înainte de 10B.2.

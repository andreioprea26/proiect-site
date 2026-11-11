# Handmade 9.3 — regresie funcțională

> Raport istoric: configurația și numerele de migrări de mai jos descriu momentul testării.
> Starea curentă este [handmade Development](handmade-final-development.md), 28/28 migrări.
> Extensia Store Settings și vechile Preview-uri au fost retrase; nu reaplicați procedurile istorice.


## Închidere finală TASK 9.3 — 11 noiembrie 2026

**Verdict: PASS pentru regresia funcțională Development/Preview.** Proprietarul
a confirmat explicit testarea manuală pe Preview a creării unui cont nou,
primirii emailului de confirmare, activării prin link, autentificării și resetării
parolei. Aceasta este dovadă manuală furnizată de proprietar, nu o execuție
automată a agentului. Blocajul Auth consemnat anterior este astfel închis.
Secțiunile următoare sunt istorice; verdictele lor PARTIAL/BLOCKED nu reprezintă
verdictul final curent.

### Acoperire și dovezi verificate la închidere

| Flux | Rezultat și sursă |
|---|---|
| Preview, catalog, căutare, filtre, produse, variante, personalizare, coș | PASS; probele UI și cele 26 verificări HTTP existente, fără repetare |
| Înregistrare, confirmare email, activare, login, resetare parolă | PASS manual, confirmat explicit de proprietar în această închidere; login/logout E2E aveau și dovezi directe anterioare |
| COD guest și client autentificat | PASS; CMD-2026-00001399 completed/paid și CMD-2026-00001400 shipped/paid, totaluri 119,90/244,90 RON |
| Administrare, statusuri, AWB și tracking | PASS; `handmade-9-3e-after-cleanup.json` păstrează shipments și history, plus captura Admin; AWB/curier fictive, nu serviciu real de curierat |
| Unicat, stoc, autorizare, idempotency, favorite, recenzii, formulare | PASS pe scenariile documentate anterior; UI și RPC autentificate, cu limitele de acoperire precizate în secțiunea 9.3e |
| Stripe Sandbox, webhook, duplicate, refuz, anulare/expirare, refund | PASS real; CMD-2026-00001402/1403, 119,90 RON, o singură scădere 5→4; 13/13 verificări finale adevărate în manifest |
| Emailuri operaționale | PASS; 6 COD și 3 Stripe, fără duplicate; probe Resend Opened, exclusiv destinatarul aprobat |

Nu există scenarii funcționale obligatorii rămase neexecutate în planul de
regresie convenit. Nu s-au repetat teste remote, plăți sau emailuri la închidere.
Scenariile suplimentare completed livrat după refund și refund eșuat nu sunt
declarate testate real. Curierul real, Stripe Live și livrarea emailurilor către
clienți în Production nu fac parte din acest PASS Development.

### Integritatea datelor și cleanup

Au fost recitite dovezile locale existente, nu relansat un audit remote:
`handmade-9-3e-after-cleanup.json`, `handmade-9-3e-cleanup-verification.json` și
`handmade-9-3e-stripe-manifest.json`. Ambele rulări confirmă amprente identice
pentru produsele și inventarul preexistente. Cleanup-ul COD și Stripe este
consemnat, fără rezervări active ale rulărilor; produsele fictive sunt arhivate,
transporturile dedicate dezactivate, istoricul comenzilor și plăților păstrat.
Nu s-au șters date preexistente și nu s-a resetat secvența.

### Verificări rămase, fără blocarea personalizării

- **Cheia Stripe nouă/veche: neconfirmat.** Dovezile ultimei execuții arată
  utilizarea cheii Test existente, acceptată explicit de proprietar; proba
  anterioară GET account cu cheia identificată ca expusă răspunsese 200.
  Nu există dovadă ulterioară de rotație/revocare sau de înlocuire în deployment.
  Nu putem afirma că s-a folosit o cheie nouă și nici că vechea cheie este acum
  inactivă. Acest punct rămâne deschis, separat de PASS-ul funcțional; nu s-au
  afișat chei și nu s-a modificat configurația. Nu a fost repetată verificarea
  cloud sau plata doar pentru închiderea raportului.
- **Webhook vechi:** endpointul către aliasul Preview `task-e5c491` rămâne activ
  în Stripe și răspunde HTTP 410 Gone. Endpointul 9.3 a răspuns 200 inclusiv la
  redelivery autentică. Curățarea endpointului vechi necesită un task separat;
  nu a fost efectuată aici.

### Validare locală și Git

Fișiere de livrat în commitul local: acest raport,
`scripts/handmade-9-3e-fixtures.mjs` și
`scripts/handmade-9-3e-stripe-regression.mjs`. Sintaxa ambelor scripturi,
ESLint, TypeScript și `git diff --check` sunt verificate la închidere.
Cele 113 teste locale și build-ul Next.js PASS existente validează aceeași
aplicație; codul aplicației și migrările nu au fost modificate și nu s-au repetat
suitele deja validate. Dovezile/manifestele și `.env.local` rămân ignorate de Git.
Branch: `task/handmade-9-3-functional-regression`; commit local de închidere,
fără push, redeploy sau merge. Preview-ul rămâne construit din `6b5bd1a`.

**Decizie:** Faza 9 de revalidare funcțională poate fi închisă. Putem începe
personalizarea magazinului după review ChatGPT, fără reconstrucția aplicației.
Această închidere nu este aprobare pentru Production sau pentru un task nou.

---

## Continuare Stripe TASK 9.3e — 11 noiembrie 2026, 13:06–13:11 UTC

**Stripe Sandbox: PASS pe scenariile executate. Regresia completă: PARTIAL**,
deoarece signup/confirmare/resetare prin email Auth rămân neverificate real.
Această secțiune înlocuiește blocajul Stripe din raportul istoric de mai jos.
Proprietarul a cerut explicit continuarea cu cheia Test existentă și a renunțat
la condiția anterioară de rotație. Cheia nu a fost schimbată sau publicată.
Nu se afirmă că a fost revocată. Nu s-a făcut redeploy sau modificare de mediu.

### Preflight și execuție reală

- Supabase original `bdyocajhhylvasfhmnal`, ACTIVE_HEALTHY, 29 migrări.
  Preview `proiect-site`, deployment Ready `dpl_7FzLYrKNTtbcGwB4cQZ98vyRCEZp`,
  commit `6b5bd1acec74c627afcfceba4e12c3e3689d7b27`, branch 9.3 neschimbate.
- GET Stripe account cu cheia existentă a confirmat Sandbox-ul
  `acct_1U968HDxyx762at3`; sesiunile și PaymentIntent au `livemode=false`.
  Endpointul 9.3 `we_1UaPLNDxyx762at3ABGkAs2j` este activ pentru cele cinci
  evenimente implementate. Endpointul vechi către aliasul `task-e5c491` este
  încă activ, dar răspunde **410 Gone**. Nu a fost dezactivat/modificat.
- Run nou: `hm93stripe-a9e346e4e6b0`; produs fictiv
  `9cd00c71-56ab-4647-92cf-923b79a3c68b`, stoc inițial 5, preț 100 RON;
  transport dedicat `6839eb10-8a2c-4753-ae9b-9183bd27cebf`, 19,90 RON.
  Manifest salvat înainte de write. Niciun fixture anterior nu a fost reutilizat.
- Checkout prin UI Preview, carduri oficiale de test în pagina Stripe găzduită;
  niciun eveniment semnat fabricat și nicio confirmare de plată injectată în DB.

| Scenariu real | Rezultat |
|---|---|
| Checkout guest → Stripe | Session Test creată, total 119,90 RON, comandă awaiting_payment, rezervare active; stoc fizic rămâne 5 |
| Card refuzat | Mesaj de refuz Stripe; aceeași comandă/plată pending, 0 mișcări de stoc, 0 notificări |
| Card oficial de succes | Session complete/paid, PaymentIntent succeeded, comanda paid; webhook autentic 200 pe endpointul 9.3 |
| Stoc și coș | Rezervare consumed; o singură mișcare -1, stoc 5→4; confirmare Preview și coș gol numai după confirmarea internă |
| Redelivery autentică | Dashboard Stripe Resend pentru același eveniment; 200 la 13:07:51 UTC, fără plată, mișcare sau email suplimentar |
| Revenire fără plată | Mesajul Preview păstrează coșul și explică rezervarea până la expirare; nu este tratată ca plată |
| Expirare | Expirată explicit numai a doua Session a run-ului prin Stripe API; webhook autentic, payment expired, comandă cancelled, rezervare expired; stoc rămâne 4 |
| Refund integral din Admin | Admin E2E autentificat; un refund 119,90 RON, succeeded în Stripe și DB; comanda/payment refunded prin webhook, fără restocare automată |
| Emailuri | order_confirmation, payment_confirmation și refunded: fiecare sent, attempt_count=1; toate trei Opened în dashboard Resend și numai către destinatarul aprobat |

Pentru sesiunea expirată `orders.payment_status` rămâne `pending`, în timp ce
`orders.status=cancelled` și `payments.status=expired`. Acesta este comportamentul
implementat, nu o plată în curs; rezervarea este eliberată. Nu a fost modificat.
Imediat după refund, Admin a afișat temporar un snapshot financiar vechi în
paralel cu payment record actualizat; după reîncărcare afișează Rambursată corect.
Este o observație de refresh UI, fără inconsistență persistentă în DB.

### Identificatori și integritate

| Comandă | UUID | Stare finală |
|---|---|---|
| CMD-2026-00001402 | `206e361d-41b0-4242-af54-60eac05a0cdc` | Stripe 119,90 RON plătită, apoi refunded integral |
| CMD-2026-00001403 | `bc312584-8078-476b-a861-82c3cdaf3488` | cancelled; payment expired, fără încasare |

PaymentIntent: `pi_3UabEjDxyx762at30Y9Jlan6`.
Refund: `re_3UabEjDxyx762at30A2IYmhz`;
UUID intern `2094a6a9-5869-4838-a61a-2dd4972310ac`.
Evenimente unice procesate: `evt_1UabF0Dxyx762at3IapbOVR3` (completed),
`evt_1UabG3Dxyx762at3xscCIerU` (expired),
`evt_3UabEjDxyx762at302NcfC7z` (refund.created),
`evt_3UabEjDxyx762at30CsbXtv6` (refund.updated).

13/13 verificări finale de integritate PASS: exact două comenzi și două payment
records, un PaymentIntent reușit, un refund integral, o singură mișcare de stoc,
trei notificări cu o încercare fiecare, patru event IDs unice, zero rezervări
active; amprentele produselor și inventarului preexistente rămân identice.
Redelivery a fost efectuată înainte de refund și nu a dublat efectele.
Nu s-a testat ordinea inversă completed livrat după refund sau un refund eșuat.

Cleanup: produsul arhivat (URL public 404), transportul dedicat dezactivat,
coșul izolat golit și adminul E2E deconectat. Stocul final 4, comenzile, plata,
refundul, notificările și evenimentele sunt păstrate pentru audit. Nu s-au șters
date preexistente și nu s-au resetat numerele comenzilor. Manifest/evidențe locale
ignorate de Git: `test-results/handmade-9-3e-stripe-manifest.json`,
`handmade-9-3e-stripe-paid.png`, `handmade-9-3e-stripe-refunded.png`.

Cheia Resend are permisiuni numai pentru trimitere: citirea prin API a fost
refuzată cu `restricted_api_key`; livrarea a fost verificată în dashboardul
autentificat, fără extinderea permisiunilor. Transferul temporar local al cheii
Stripe către SDK a fost eliminat; cheia nu este în manifest, Git sau raport.

### Validare și limite rămase

- Helper nou `scripts/handmade-9-3e-stripe-regression.mjs`: sintaxă Node și
  ESLint PASS. Folosește gardă de proiect, JWT ref/rol, redirect email și
  ownership; nu are efecte remote la import, nu reseedează un manifest existent.
- Aplicația și SQL-ul nu s-au schimbat; cele 113 teste locale, TypeScript și
  build PASS din sesiunea 9.3e anterioară rămân validarea aceleiași aplicații.
  Nu s-au rerulat inutil E2E cu cleanup larg sau SQL care scrie date remote.
- Stripe nu mai blochează regresia. Rămân probele Auth prin email; webhookul
  vechi cu 410 poate fi curățat separat, cu aprobarea configurației cloud.
- Fără commit/push/deployment/merge și fără modificări Production/Demo,
  chei, variabile de mediu, migrări, granturi sau istoric de migrări.

**Răspuns actual:** da, fluxul comandă → Stripe Sandbox → webhook → confirmare
→ stoc și emailuri funcționează real în Development/Preview. Și refundul integral
este confirmat. Nu reprezintă încă PASS complet pentru toate fluxurile Auth
sau validare pentru Production.

---

## Actualizare TASK 9.3e — 11 noiembrie 2026

**Verdict: PARTIAL.** Fluxul COD a fost verificat real până la expediere,
încasare fictivă, emailuri și stoc. Plata Stripe Sandbox, webhookul autentic,
rezervările card și signup/confirmare/reset prin email nu primesc PASS.
Raportul inițial 9.3 de mai jos rămâne istoric, anterior configurării 9.3c.

### Preflight și limite efective

- Development exact: `bdyocajhhylvasfhmnal`, ACTIVE_HEALTHY, 29 migrări; nicio
  migrare/schema/grant/configurație de serviciu modificată în 9.3e.
- Vercel `proiect-site`, branch `task/handmade-9-3-functional-regression`,
  HEAD/deployment `6b5bd1acec74c627afcfceba4e12c3e3689d7b27`, Ready,
  `dpl_7FzLYrKNTtbcGwB4cQZ98vyRCEZp`.
  Preview: https://proiect-site-git-task-4af756-andreioprea26x-gmailcoms-projects.vercel.app
- Cele opt variabile 9.3 au rămas scoped pe acel branch. Preview forțează redirect;
  destinatarul a fost confirmat efectiv în Resend pentru toate cele șase emailuri:
  `andreioprea26x@gmail.com`. Sender: `onboarding@resend.dev`.
- **Stripe BLOCKED:** cheia Test curentă din cont este cea expusă anterior;
  GET read-only `/v1/account` cu această cheie a răspuns 200 pentru Sandbox-ul
  autorizat. Revocarea nu este confirmată, ci contrazisă de această probă.
  Niciun checkout/plată/refund/eveniment Stripe autentic nu a fost executat.
  Cheia locală Stripe rămâne placeholder, nevalidă pentru teste locale de card.
- **Auth email BLOCKED:** SMTP custom absent, limita implicită 2 emailuri/oră;
  adresa controlată aprobată are deja cont confirmat. Nu s-a folosit alt destinatar,
  nu s-au schimbat setările SMTP și nu s-a resetat contul personal al proprietarului.
- Conturile E2E customer/admin există, sunt confirmate și au rolurile corecte.
  Parola admin E2E inițială era incorectă. Prima propunere de resetare a fost
  respinsă de revizuirea automată; nu a executat operațiunea. După aprobarea
  explicită a proprietarului, parola exclusiv a adminului E2E a fost resetată
  și salvată numai în `.env.local` ignorat de Git. Rolurile au rămas neschimbate.
  Aceasta este pregătire de fixture, nu probă a recuperării prin email.
- Sesiunea personală Chrome nu a fost deconectată. Primele tranziții pe comanda
  guest au folosit sesiunea Admin deja existentă; apoi a fost validat adminul E2E
  în browser separat. Numai comenzile fictive au fost editate. Dificultățile
  instrumentului cu dialogurile Chrome au fost reconciliate înainte de continuare;
  operațiunile financiare fictive au fost confirmate ulterior în browserul izolat.

### Probe reale și rezultate

| Zonă | Rezultat și dovadă |
|---|---|
| Homepage, catalog, căutare, filtre | PASS online; căutarea runId produce 3 rezultate, filtrul made-to-order 1; sortare ascendentă 100/150/210 RON |
| Variante, personalizare, coș | PASS UI; varianta 210 + text 15 = 225 RON, checkout recalculat 244,90 RON cu transport |
| Auth customer | Login/logout real PASS; după logout `/account` redirecționează la login |
| Auth admin E2E | Login și acces Admin real PASS după pregătirea aprobată a parolei fixture-ului |
| Signup, confirmare, recovery prin email | BLOCKED/neexecutate pe un cont nou controlat; testele locale nu le substituie |
| COD guest și customer | Două comenzi UI reale, 119,90 și 244,90 RON; ownership customer confirmat în DB și în pagina contului |
| Idempotency și erori COD | Replay RPC returnează aceeași comandă; conflict refuzat; stoc insuficient refuzat fără decrement |
| Unicat/concurență | Două RPC-uri concurente, o singură reușită; stoc 1→0, apoi anulare Admin 0→1; replay anulare fără restock suplimentar |
| Admin și expediere | UI real guest: new→in_progress→ready→shipped→completed, AWB și HTTPS fictive, încasare COD separată; customer și replay-uri suplimentare prin RPC autentificat |
| Încasare COD | Două comenzi paid în registrul fictiv, câte un eveniment de încasare; 0 rânduri Stripe/payments, normal pentru COD |
| Emailuri operaționale | 6/6 sent, attempt_count=1, zero grupuri duplicate; Resend arată opened și exclusiv destinatarul aprobat |
| Favorite și recenzii | Favorit creat; recenzie refuzată ca eligibilitate înainte de paid/shipped, permisă ulterior, pending ascuns, aprobată verificată public, duplicat refuzat |
| Contact/newsletter/cereri speciale | Câte un submit UI real și rând identificat exact; eliminate controlat la cleanup |
| RLS/autorizare | 6 tabele private și generatorul refuză anon cu 42501; customer citește propria comandă, nu pe cea guest; RPC Admin și pagină Admin refuzate customerului |
| Stripe/webhook/rezervări card | BLOCKED pentru integrarea autentică; doar GET webhook=405 și POST fără semnătură=400 sunt verificate online |

RPC-urile de mai sus rulează funcțiile reale, sub rolurile autentificate reale,
în Development, nu în simulare. Pentru tranzițiile suplimentare customer prin
RPC nu s-a apelat orchestratorul email din server actions; probele end-to-end
ale notificărilor sunt cele efectuate prin Preview pe comanda guest, plus
confirmarea UI a comenzii customer. Nu se pretinde acoperire UI pentru fiecare RPC.

### Manifest și integritate

Run: `hm93e-8352949bf133`. Manifestul și răspunsurile tehnice sunt în
`test-results/handmade-9-3e-*`, ignorate de Git; fără parole, chei sau tokenuri
de confirmare în manifest. Identificatorii sunt păstrați pentru audit:

| Comandă | UUID | Rezultat final |
|---|---|---|
| CMD-2026-00001399 | `511aba79-d777-4a30-b7e3-4a36addaa20c` | guest COD, 119,90 RON, completed/paid |
| CMD-2026-00001400 | `37358ab9-a0dd-4890-b712-99084612757d` | customer COD, 244,90 RON, shipped/paid |
| CMD-2026-00001401 | `8d7b4d6f-c428-483b-bd2b-b47e0186796b` | unicat COD, 169,90 RON, cancelled/unpaid |

Produse: standard `030713bf-82a4-46ee-892c-1476c06a039c`, unicat
`1c5203c9-ad25-40f7-8871-3bf95428eb3b`, made-to-order
`8176aa7c-3ebb-46e3-bbd2-e002ed62033b`.
Transport `9f36c894-46c4-43f6-b9e6-ee6a9de24eff`.
Recenzie `049b836a-d12e-4a7d-b5cf-e5fb36707f4c`.

Cleanup verificat: cele trei produse arhivate, transport dezactivat, favorit și
cele trei formulare temporare eliminate strict prin UUID și emailul runId.
Comenzile, stocul și mișcările, plățile COD, expedierile, recenzia și moderarea
rămân pentru audit. Stoc final standard=3, unicat=1; made-to-order fără inventar.
Rezervări active ale comenzilor rulării=0. Amprentele produselor și inventarului
preexistente sunt identice înainte/după. Nu s-au șters conturi/comenzi/produse
preexistente; secvența nu a fost resetată, numerele fictive rămân consumate.

### Verificări locale și pașii rămași

- **113/113 teste locale PASS**: cele 13 suite SQL versionate în PGlite izolat,
  contractele de securitate și hardening, email și Auth. Nu sunt integrări remote.
- ESLint, TypeScript, build Next.js PASS; build efectuat local, fără deployment.
- **26/26 probe HTTP Preview PASS**, ambele callbacks fără token=307.
- Unealta nouă `scripts/handmade-9-3e-fixtures.mjs` are verificare de sintaxă și
  ESLint PASS, gardă de identitate/ownership și manifest înainte de write.
  Nu pornește suita E2E veche cu hooks/cleanup larg; probele UI autorizate sunt
  executate prin browser, iar probele de idempotency/RLS prin SDK/RPC.
- Aplicația, migrările și testele SQL originale nu au fost modificate.
  Schimbări locale: această actualizare de raport, unealta și parola fixture-ului
  admin în `.env.local` ignorat. Fără commit/push/PR/merge/deployment în 9.3e.
- Înainte de PASS complet: revocarea efectivă a cheii Stripe vechi, configurația
  unei chei Test valide și redeploy Preview cu aprobare separată; apoi plata,
  webhookul, duplicatele, anularea/expirarea și rezervările card reale. Pentru
  Auth, pregătirea adresei noi controlate și a livrării SMTP eligibile, fără
  dezactivarea confirmării. Review ChatGPT înainte de orice etapă Production.

**Răspuns:** magazinul funcționează real pe fluxul COD până la stoc, expediere,
încasare fictivă și email. Funcționarea completă inclusiv plata Stripe și emailurile
Auth nu este încă demonstrată; verdictul rămâne PARTIAL.

---

Data: 2026-11-11. Verdict general: **PARTIAL**. Storefront-ul Fazei 9 funcționează
online și cele 13 suite SQL originale trec local. Integrările reale și fluxurile
care scriu date nu au fost autorizate în acest task; există blocaje concrete de
configurare Preview/Auth/Stripe/Resend. Nu este un PASS Production.

## Versiunea și mediile verificate

- Bază: `task/handmade-9-2-order-sequence-hardening`,
  `7794d5f5f446db13104a77c17fd4ba6e1274b759`.
- Branch de lucru: `task/handmade-9-3-functional-regression`.
- Development reconfirmat prin API: `bdyocajhhylvasfhmnal`, ACTIVE_HEALTHY,
  **29 migrări remote**; local rămân 27 originale + 9.2 = 28. Fără reset/repair/db push.
- Codul aplicației din branch-ul 9.3 este identic bazei 9.2; modificările sunt
  exclusiv unelte locale de regresie, fixture-uri și documentație.

## Verificarea efectivă Vercel

Proiect original: `proiect-site`, echipa `andreioprea26x-gmailcoms-projects`.
Git conectat în dashboard: `andreioprea26/proiect-site`.

- Deployment verificat: `dpl_2kw7XxShLUNvbwUg6dd3NfiMv5jv`.
- Preview: https://proiect-site-j971lik0c-andreioprea26x-gmailcoms-projects.vercel.app
- Alias branch: https://proiect-site-git-task-900953-andreioprea26x-gmailcoms-projects.vercel.app
- Branch construit: `task/handmade-9-2-order-sequence-hardening`.
- Commit exact: `7794d5f5f446db13104a77c17fd4ba6e1274b759`.
- Status **Ready**, build 17 secunde, creat 2026-11-11 la 01:18 GMT+2.
- Build logs confirmă completarea buildului/deploymentului. Sunt 3 avertismente,
  inclusiv npm `cache-dir` și install-script `unrs-resolver`; nu există build error.
- Preview-ul nu este 10B: bundle-ul public Auth observat în browser conține ref-ul
  `bdyocajhhylvasfhmnal.supabase.co`; catalogul anonim original și cel online au
  aceleași 5 produse publicate. Denumirile lor conțin „demo”, fără a implica proiectul
  Supabase Demo. Nu a fost accesat proiectul Demo.
- Domeniul `project-ve39q.vercel.app` este alocat Production în dashboard; nu a
  fost vizitat. Deploymentul Production afișat pe overview este din branch main,
  commit vechi `8850f28c63f0c0331d90069ef4a1faee855cf53c`; nu a fost modificat.
- Canonical-urile Preview indică acest domeniu Production prin fallback-ul SEO;
  răspunsurile Preview au `x-robots-tag: noindex`. Nu este un blocaj de catalog.

Nu există branch remote/Preview 9.3: `git ls-remote --heads origin
task/handmade-9-3-functional-regression` nu a returnat nimic. Preview-ul 9.2 este
potrivit pentru codul aplicației pe care îl testăm. **Nu este necesar un deployment
nou pentru această verificare publică.** Pentru integrarea completă va fi necesară
configurare aprobată și un redeploy/Preview nou aprobat.

Git integration creează automat deploymenturi la push, fapt confirmat în dashboard
și prin deploymenturile 9.1/9.2 existente. Branch-ul 9.3 nu este publicat pentru a
respecta interdicția de a declanșa un deployment fără aprobare. Nu s-au apăsat
Redeploy, Save, Rotate, Create Hook sau alte controale de modificare.

## Preflight configurație și date dedicate

### Local

Variabilele obligatorii și credențialele E2E există; URL-ul Supabase este original.
APP_URL este localhost:3000. STRIPE_SECRET_KEY nu are un prefix recunoscut de client;
nu este validată ca Sandbox. getStripeClient acceptă numai sk_test_, deci Live este
respins de cod. Webhook secret are prefixul așteptat, fără validarea autenticității.
Resend este configurat local, cu EMAIL_DELIVERY_MODE=redirect și destinatar de test
setat; identitatea și controlul căsuței trebuie aprobate înainte de trimitere.

Admin/customer configurate E2E sunt conturi distincte, au adrese cu indicator de
test, există în Development, au email confirmat și rolurile așteptate. Verificarea
s-a făcut read-only, cu rezultate booleene, fără afișarea adreselor/parolelor și
fără login. Parolele și izolarea tuturor datelor acestor conturi nu sunt validate.

### Preview — blocaje confirmate

Lista Vercel arată două variabile publice Supabase pentru Preview. APP_URL,
SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY și STRIPE_WEBHOOK_SECRET sunt limitate
la vechiul branch `task/9c-final-launch-readiness`, nu la branch-ul testat.
Nu apar variabile Resend/EMAIL_* pentru acest Preview.

Secret values sunt mascate și nu au fost copiate/revelate. Proiectul Supabase
public compilat a fost identificat separat din assetul public Auth. Valorile
server Stripe ale altui branch nu au fost inspectate; nu certificăm webhookurile
din contul Stripe fără configurație Sandbox accesibilă și aprobată.

**Eșec real online:** GET fără token la `/auth/confirm` și
`/auth/reset-password` returnează **500**, în locul redirectului de eroare sigur.
Ambele ramuri fără token folosesc getAppUrl, iar APP_URL lipsește din branch scope.
Nu s-a verificat OTP și nu s-a schimbat vreo sesiune/parolă.

Configurația Supabase Auth are site_url localhost:3000 și allowlist pentru local
plus vechiul alias `proiect-site-git-task-e5c491-...`. Nu include aliasul actual
900953 sau URL-ul immutable verificat. Confirmarea/resetarea reală necesită
APP_URL corect și redirecturi exacte aprobate pentru Preview-ul folosit.
Email signup este activ, confirmarea obligatorie, fără SMTP custom configurat.
Resend operațional nu configurează automat livrarea emailurilor Supabase Auth.

Cardul și notificările nu sunt gata de test real în acest Preview. COD necesită
și verificarea capătului de flux: după persistarea comenzii, checkout/actions
apelează deliverOrderNotification; createAdminClient este înaintea blocului try
din notifications.ts. Cu service key lipsă poate apărea o excepție înainte de
confirmarea UI, deși comanda a fost deja creată. Este o constatare de cod și
configurație, **nu o comandă remote executată**. Nu am modificat aplicația.

## Rezultate pe funcționalități

| Funcționalitate | Verificat real, read-only/client local | Simulare locală / ce rămâne |
|---|---|---|
| Homepage/navigare | Online, conținut și linkuri corecte | PASS public |
| Catalog/categorii/filtre/căutare | 5 produse; căutarea ceramică dă 1 rezultat; sortarea și taxonomiile funcționează | PASS public |
| Produs/variante/personalizare | Geantă 179→189 RON; cană 89+15=104 RON | PASS UI; stocul este revalidat doar la comandă |
| Coș/cantități | 2×104=208 RON, apoi 1×104=104; păstrare după reload; eliminare | PASS client; articolul de test eliminat |
| Signup/login/logout/recovery | Formularele se încarcă; callbackurile fără token dau 500 | Integrare BLOCKED de configurare; niciun login/email/reset real |
| Checkout guest/autentificat | Formular guest, transport și sumar vizibile | SQL validat; client autentificat și submit remote neexecutate |
| COD | Fără plasare remote | SQL place_cod_order PASS; necesită verificare UI→DB→notificare→confirmare |
| Stoc/unicate/rezervări | Fără modificări remote | Suite checkout/payment_reservations PASS; concurența reală încă netestată |
| Stripe Sandbox | Ruta webhook există, GET=405 | Suite webhook/refunds PASS local; providerul real și plata neexecutate |
| Admin comenzi | Anon redirecționat la login | admin_orders PASS local; admin real încă netestat |
| Expediere/AWB/tracking | Fără editare remote | admin_fulfillment PASS local; nu dovedește integrare API curier |
| Emailuri operaționale | Niciun mesaj trimis | Teste email 8/8 și SQL notificări PASS; furnizorul real nevalidat |
| Favorite/recenzii/contact/newsletter | Pagini/recenzii publice se încarcă, favorite cere login | Suite SQL client/content PASS; submit real neexecutat |
| Securitate/RLS/admin | 6 probe GET anonime cu limit=0 respinse 401/42501; admin/account→login; secvența protejată | security_data_integrity și granturi PASS local; scenarii autentificate remote neexecutate |

GET anonim este refuzat pentru profiles, user_roles, orders, payments, inventory
și newsletter_subscribers. limit=0 previne citirea datelor private chiar în cazul
unei regresii de granturi. Nu au fost exportate date de clienți sau comenzi.

Smoke HTTP: 24 rute publice/protejate au statusurile așteptate (200, 307, 404 și
405); cele două callbackuri suplimentare eșuează cu 500. Script reproductibil:
`node scripts/verify-handmade-preview.mjs`. Este GET-only, fără cookies/credențiale;
nu urmează redirecturi. Codul de ieșire rămâne nenul cât timp callbackurile eșuează.
Raportul JSON este în test-results, ignorat de Git.

## Siguranța suitei existente — nu rulați E2E complet

- playwright.config.ts pornește aplicația locală, dar folosește Supabase din
  env și 6 workers; localhost nu înseamnă bază izolată.
- test-environment.ts suprascrie Stripe cu placeholder sk_test și dezactivează
  Resend pentru serverul E2E. Nu este test al integrărilor reale. Conexiunile
  Supabase din fixture-uri rămân remote, dacă rulează suita existentă.
- checkout/admin/Stripe/concurrency creează și modifică produse, stoc, comenzi,
  plăți, rezervări și evenimente. Auth login/logout produce sesiuni remote.
- homepage-admin-stats șterge temporar sloturile GLOBALE hero/promo și apoi încearcă
  restaurarea lor. Nu este izolat doar prin runId și nu se aprobă implicit.
- admin-operations/admin-orders fac și cleanup după prefix, cu risc de atingere
  a unor fixture-uri mai vechi. account-authenticated modifică/restaurează profilul
  și șterge adrese după prefix. admin-product-details șterge fișiere Storage.
- Favorite/recenzii/newsletter/contact au write și cleanup. Hooks beforeAll pot
  scrie chiar dacă sunt selectate aparent teste de validare fără UI.
- Recuperarea parolei are cazuri mock, dar nu presupunem că toate server actions
  sunt interceptate de page.route. Nu le-am executat pe remote.

## Plan exact pentru autorizarea separată a regresiei cu write

Nu s-a cerut/consumat aprobarea de write în acest task. Următoarele sunt scenarii
propuse pentru review, nu instrucțiuni de execuție deja autorizate.

1. **Configurare separată:** aprobare pentru variabile Preview scoped pe branch-ul
   handmade ales, APP_URL pe aliasul Preview verificat, redirecturi Auth exacte,
   cheie Stripe sk_test validă, webhook Sandbox pentru acel URL și Resend redirect
   către EMAIL_TEST_RECIPIENT controlat de proprietar. Nu se copiază valori Live sau
   demo. Schimbarea env și redeployul necesită aprobări explicite, nu sunt efectuate.
2. **Manifest de run în afara Git:** `runId=hm93-<UUID>`, UUID-uri generate pentru
   toate resursele noi, ID-urile comenzilor/plăților/evenimentelor, namespace,
   baseline strict al conturilor E2E și operațiile de cleanup. Fără parole sau
   date personale reale în manifest/loguri. O singură rulare serială, fără retry automat.
3. **Date noi dedicate:** produs standard 100 RON/stoc 4; unicat 150 RON/stoc 1;
   made-to-order 200 RON fără inventar, variante 210/220 RON și text +15 RON,
   min 2/max 24 caractere. Slugurile și metoda de transport 19,90 RON conțin runId.
   Nu se reutilizează/modifică cele 5 produse publice existente și nu se schimbă
   homepage, Store Settings sau alte setări globale.
4. **Auth, aprobare distinctă:** login/logout pentru cele două conturi dedicate;
   signup numai cu o adresă nouă reală controlată, aprobată de proprietar;
   confirmare și resetare numai pentru căsuța/contul dedicat aprobat. Verificați
   destinația mesajelor Supabase Auth separat de Resend. Restaurarea parolei E2E
   după test este inclusă în aprobarea acestui scenariu, fără expunere în loguri.
5. **COD:** guest cumpără 1 standard: 119,90 RON și stoc 4→3. Replay cu aceeași
   cheie nu creează comandă/decrement suplimentar. Clientul dedicat comandă
   made-to-order varianta 210 + text 15 + transport 19,90 = 244,90 RON.
   Confirmați UI, token, ownership și notification log; fără expediere reală.
6. **Unicat/concurență:** două încercări cu UUID-uri distincte exclusiv pentru
   produsul nou; cel mult una reușește, stocul nu devine negativ. Test separat
   al rezervării card, expirării/eliberării și idempotency.
7. **Stripe Sandbox, aprobare distinctă:** numai test mode, un standard și total
   119,90 RON; inițiere Session, plată de test, webhook semnat, confirmed/paid,
   rezervare consumată o singură dată. Test separat pentru cancel/expiry și
   refund Sandbox; refundul nu restochează automat. Nicio cheie sau plată Live.
8. **Admin/expediere/notificări:** numai comenzile din manifest; tranziții permise,
   AWB `HM93-<runId>-001`, tracking HTTPS fictiv example.invalid; fără API curier.
   Verificați confirmare/expediere/anulare, dedupe și retry la destinatarul aprobat.
9. **Client/content:** favorite, recenzie eligibilă și moderare, contact, cerere
   personalizată, newsletter exclusiv pe UUID/email/slug dedicat din manifest.
   Nu se execută testul existent care înlocuiește hero/promo.
10. **Cleanup limitat:** expirați sesiunile Stripe Sandbox ale rulării și eliberați
    rezervările prin mecanismele aprobate; arhivați numai produsele cu UUID-uri
    din manifest și dezactivați transportul acelei rulări. Păstrați comenzile,
    mișcările, plățile și auditul dacă FK-urile/imutabilitatea cer asta. Nu ștergeți
    auditul și nu resetați secvența. Favoritele/contactele/newsletter/adresele noi
    se elimină numai prin ID-urile exacte aprobate; niciun LIKE global/prefix larg.
    Conturile existente rămân; ștergerea contului nou necesită includere explicită
    în aprobare. Reconciliați manifestul și verificați că nu rămân rezervări active.

Un cleanup cu produse arhivate și audit păstrat este intenționat; nu se pretinde
revenirea bazei la același număr de rânduri. Numerele de comandă consumate nu se
recuperează. Orice problemă oprește rularea și se raportează cu ID-urile dedicate.

## Ce mai trebuie făcut, fără dezvoltări inutile

Obligatoriu pentru PASS complet: configurarea și redeployul Preview aprobate,
confirmarea izolării recipientului/Auth/Sandbox, apoi scenariile de write aprobate
și cleanup verificat. Nu este necesară reconstruirea catalogului, coșului, comenzilor,
stocului sau administrării: implementările existente au trecut probele permise.

Pentru personalizare: fotografii și conținut real în locul placeholderelor, identitate,
produse/prețuri și condiții de livrare. Pentru Production rămân separat Stripe Live
(clientul actual acceptă numai sk_test), sender/DNS, operațiuni reale și recuperare.
Acest task nu validează acele integrări și nu autorizează etapa următoare.

Opțional: reducerea warningurilor npm, îmbunătățiri vizuale/SEO și optimizarea
fotografiilor. Lipsa imaginilor reale și a paginilor informative este vizibilă,
dar nu este o regresie a motorului de magazin.

## Reproducere locală și Git

PGlite existent, fără Docker sau serviciu nou. Fixture-ul comun păstrează cele 27
migrări originale, extensia deja auditată doar în test și hardeningul 9.2. Fiecare
suită funcțională rulează într-o bază nouă în memorie. Auth/Storage sunt substituenți;
nu există apeluri Supabase/Stripe/Resend în aceste fixture-uri.

Rezultatul final local este **101/101 teste PASS**: 80 verificări de securitate și
hardening existente, 13 suite SQL funcționale și 8 teste email. ESLint, TypeScript,
build Next.js și `git diff --check` au trecut, fără a porni un server persistent.
Acest rezultat nu înlocuiește
cele 26 probe HTTP reale: 24 PASS și 2 FAIL de configurare Auth, explicate mai sus.

```powershell
$taskSqlTools = Join-Path $env:TEMP 'handmade-9-1-sql-tools'
$env:HANDMADE_PGLITE_MODULE = ([System.Uri](Join-Path $taskSqlTools 'node_modules/@electric-sql/pglite/dist/index.js')).AbsoluteUri
node --test --experimental-strip-types --test-concurrency=1 tests/unit/email-notifications.test.mjs tests/unit/security-sql-contracts.test.mjs tests/unit/order-sequence-hardening.test.mjs tests/unit/functional-sql-regression.test.mjs
npm run lint
npm run typecheck
npm run build
git diff --check
```

Nu s-au pornit E2E complet sau servere persistente. Nu s-au modificat aplicația,
migrările, configurațiile cloud sau datele remote. Branch-ul task-ului are commit
local; **fără push**, pentru a nu declanșa automat un Preview neaprobat. develop,
main și arhiva Fazei 9 rămân intacte. Review ChatGPT înainte de următoarea etapă.

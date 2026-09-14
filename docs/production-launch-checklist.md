# Production launch checklist

Document de lucru pentru Faza 10. Acest checklist nu autorizează crearea sau
modificarea mediilor Production, activarea serviciilor live, cumpărarea unui
domeniu ori efectuarea unei plăți reale. Fiecare cost și fiecare operație live
necesită aprobarea proprietarului înainte de execuție.

## Poarta de intrare în Faza 10

- [ ] Faza 9C aprobată și branch-ul ei merged în `develop`.
- [ ] Release candidate-ul din `develop` este identificat prin commit exact și
  toate verificările Fazei 9C sunt verzi.
- [ ] `main` este actualizat numai după review și aprobare explicită.
- [ ] Nu există modificări locale sau commituri necesare nepublicate.
- [ ] Sunt aprobate costurile, furnizorii și responsabilul pentru fiecare cont.

## Blocante care trebuie decise de proprietar

- [ ] Numele final al brandului și domeniul final.
- [ ] Forma juridică și datele comerciale care vor apărea pe site.
- [ ] Curierul, aria de livrare, tariful, pragul de livrare gratuită, locker și
  ridicarea personală.
- [ ] Facturarea, contabilitatea și regulile fiscale, validate cu persoana
  calificată potrivită.
- [ ] Politica finală pentru produse personalizate, avans, retur, anulare și
  termene de execuție.
- [ ] Termenii și condițiile, politica de confidențialitate, politica de
  livrare/retur, informațiile de contact și politica de cookies dacă este
  necesară. Textele trebuie furnizate sau validate de proprietar/consultant;
  prezentul document nu este consultanță juridică și nu le inventează.
- [ ] Regulile newsletterului și perioadele de păstrare/ștergere a datelor.
- [ ] Planurile comerciale Vercel, Supabase și Resend.

## Supabase Production separat

- [ ] Se creează un proiect Supabase nou, distinct de Development
  (`bdyocajhhylvasfhmnal`), numai după aprobare.
- [ ] Se alege regiunea Production și se documentează project ref-ul fără chei.
- [ ] Se verifică `supabase migration list` pe ținta Production înainte de
  orice write.
- [ ] Se aplică în ordine toate migrațiile versionate, printr-un dry-run care
  enumeră exclusiv migrările aprobate; nu se improvizează schema în SQL Editor.
- [ ] Local/Remote migration history rămân aliniate după aplicare.
- [ ] Se rulează suitele SQL tranzacționale pe Production înainte de date reale,
  apoi se confirmă rollback și absența fixture-urilor.
- [ ] RLS este activ pe toate tabelele aplicației; politicile, granturile
  `anon`/`authenticated`, RPC-urile `SECURITY DEFINER` și `search_path` sunt
  reverificate.
- [ ] URL-urile Auth pentru site, confirmare și resetare folosesc numai domeniul
  HTTPS final; redirect-urile neaprobate sunt eliminate.
- [ ] Setările Auth pentru confirmare e-mail, expirare și rate limiting sunt
  aprobate și testate.
- [ ] Bucket-ul `product-images`, limitele MIME/mărime și politicile Storage sunt
  verificate; imaginile reale se încarcă numai după această verificare.
- [ ] Se alege planul și politica de backup/restore; se documentează un test de
  restaurare și persoana responsabilă.
- [ ] Se decide activarea Leaked Password Protection. Supabase documentează că
  funcția folosește Have I Been Pwned și este disponibilă pe planurile Pro și
  superioare; recomandarea pentru Production este activare după aprobarea
  planului Pro și un test de signup/reset.
- [ ] Nu se rulează niciodată `db reset` pe Production și nu se face
  `migration repair`, `db pull` sau `db diff` ca remediere ad-hoc.

Referințe oficiale: [Supabase Password Security](https://supabase.com/docs/guides/auth/password-security),
[Supabase pricing](https://supabase.com/pricing).

## Stripe Live

- [ ] Contul Stripe și identitatea comercială sunt verificate.
- [ ] Se activează Live Mode numai după aprobare; Test/Sandbox rămâne separat.
- [ ] Se configurează în Production cheia secretă Live. Aplicația folosește
  Stripe Checkout server-side și nu cere momentan o cheie publishable în
  browser; dacă arhitectura se schimbă, aceasta devine o decizie separată.
- [ ] Se creează endpoint-ul webhook pentru URL-ul HTTPS Production și se
  salvează separat signing secret-ul Production.
- [ ] Endpoint-ul primește raw body, validează semnătura și păstrează
  idempotency pentru duplicate, duplicate semantice și evenimente out-of-order.
- [ ] Moneda și prețurile sunt confirmate ca RON și valori întregi în unitatea
  minimă.
- [ ] Se efectuează, cu aprobare imediat înainte de plată, o comandă controlată
  de valoare mică și se verifică plata, webhook-ul, confirmarea, consumarea
  rezervării și golirea coșului.
- [ ] Se efectuează un refund controlat și se verifică webhook-ul, idempotency și
  faptul că refund-ul financiar nu restochează automat.
- [ ] Cheile Test și Live nu sunt copiate între medii și nu apar în Git/loguri.

Referință costuri: [Stripe România pricing](https://stripe.com/en-ro/pricing).

## Resend și e-mail Production

- [ ] Domeniul/sender-ul este verificat în Resend, inclusiv înregistrările DNS
  cerute de furnizor.
- [ ] Sunt aprobate adresa `From`, adresa opțională `Reply-To` și destinatarii
  operaționali.
- [ ] Cheia Production este distinctă și limitată la mediul Production.
- [ ] `EMAIL_DELIVERY_MODE=live` se setează numai după aprobarea sender-ului,
  verificarea DNS și un test către adresa aprobată.
- [ ] Local și Preview rămân `redirect`; `EMAIL_TEST_RECIPIENT` este setat acolo
  pentru a preveni trimiterea către clienți reali.
- [ ] Se verifică dedupe, retry manual, izolarea erorilor și toate notificările:
  comandă, plată, personalizare, în lucru, gata, expediată/tracking, anulată și
  rambursată.

Referință costuri: [Resend pricing](https://resend.com/pricing).

## Vercel Production

- [ ] Se aprobă un plan permis pentru utilizare comercială. Documentația Vercel
  limitează Hobby la utilizare personală/necomercială; magazinul trebuie să
  folosească Pro sau Enterprise conform condițiilor curente.
- [ ] Domeniul Production este conectat fără a modifica Preview-ul până când DNS
  este validat.
- [ ] Variabilele Production sunt configurate separat de Preview, fără valori în
  Git sau capturi.
- [ ] `APP_URL` este setat explicit la origin-ul final HTTPS, fără path sau slash
  final; canonical, Open Graph, sitemap și redirect-urile trebuie să folosească
  acest origin.
- [ ] Deployment-ul release candidate este READY și toate build checks trec.
- [ ] Se rulează smoke test înainte de deschiderea traficului.

Referințe oficiale: [Vercel Hobby](https://vercel.com/docs/plans/hobby),
[Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines),
[Vercel pricing](https://vercel.com/pricing).

## Inventarul variabilelor de mediu

Valorile nu se documentează. `Da` înseamnă că variabila trebuie configurată în
acel mediu pentru funcționalitatea completă; `Test` înseamnă credentiale sau
valori exclusiv de test.

| Variabilă | Local Development | Vercel Preview | Production | Observație |
| --- | --- | --- | --- | --- |
| `APP_URL` | Da | Da | Da | Origin complet; în Production este domeniul final HTTPS. |
| `NEXT_PUBLIC_SUPABASE_URL` | Development | Development | Production | Valoare publică, dar separată pe proiect. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Development | Development | Production | Cheia publică a proiectului țintă. |
| `SUPABASE_SERVICE_ROLE_KEY` | Development | Development | Production | Secret server-only; niciodată în browser. |
| `STRIPE_SECRET_KEY` | Test | Test | Live | Secret server-only; modurile nu se amestecă. |
| `STRIPE_WEBHOOK_SECRET` | Test | Test | Live | Secret specific endpoint-ului și mediului. |
| `RESEND_API_KEY` | Test | Test | Da | Secret server-only și separat pe medii. |
| `RESEND_FROM_EMAIL` | Test | Test | Da | Sender Production numai după verificarea domeniului. |
| `RESEND_REPLY_TO_EMAIL` | Opțional | Opțional | Opțional | Adresă aprobată de răspuns. |
| `EMAIL_DELIVERY_MODE` | `redirect` | `redirect` | `live` după aprobare | Codul permite live numai în `VERCEL_ENV=production`. |
| `EMAIL_TEST_RECIPIENT` | Da | Da | Nu | Plasă de siguranță pentru redirect/test. |
| `E2E_ADMIN_EMAIL` | Test | Test/CI | Nu | Cont fictiv dedicat Playwright. |
| `E2E_ADMIN_PASSWORD` | Test | Test/CI | Nu | Secret de test, nu credential Production. |
| `E2E_TEST_EMAIL` | Test | Test/CI | Nu | Customer fictiv dedicat Playwright. |
| `E2E_TEST_PASSWORD` | Test | Test/CI | Nu | Secret de test. |
| `CI` | Opțional | CI | Nu | Controlează execuția testelor, nu aplicația. |
| `PLAYWRIGHT_REUSE_EXISTING_SERVER` | Opțional | CI | Nu | Numai infrastructură Playwright. |
| `VERCEL_ENV` | Nu | Automat | Automat | Furnizată de Vercel. |
| `VERCEL_PROJECT_PRODUCTION_URL` | Nu | Automat | Automat | Fallback Vercel; nu înlocuiește `APP_URL` Production. |
| `VERCEL_URL` | Nu | Automat | Automat | Fallback per deployment. |

`SHIPPING_PROVIDER` și `SHIPPING_API_KEY` există ca rezervări în
`.env.example`, dar codul actual nu le consumă. Nu sunt necesare pentru MVP-ul
curent și nu trebuie cumpărat/provizionat un serviciu până la decizia de
livrare din Faza 10.

## Domeniu, DNS, HTTPS și SEO

- [ ] Domeniul este cumpărat numai după aprobarea costului și titularului.
- [ ] DNS-ul Vercel și DNS-ul sender-ului e-mail sunt aplicate controlat și
  validate înainte de schimbarea traficului.
- [ ] HTTPS este activ și redirect-ul HTTP → HTTPS funcționează.
- [ ] Se alege o singură variantă canonical (`www` sau apex) și cealaltă
  redirecționează permanent.
- [ ] Metadata, Open Graph, structured data, sitemap și robots folosesc domeniul
  final.
- [ ] Sitemap-ul nu include admin, account, cart, checkout, tokenuri de
  confirmare, drafturi sau produse inactive; rutele private sunt `noindex`.

## Date și conținut real

- [ ] Sunt încărcate produsele, inventarul, imaginile, categoriile, colecțiile și
  conținutul aprobat.
- [ ] Metodele și tarifele reale de livrare sunt configurate.
- [ ] Sunt eliminate toate fixture-urile și conturile de test înainte de trafic.
- [ ] Datele personale reale nu sunt folosite în testele automate.

## Smoke test controlat înainte de lansare

- [ ] Homepage, shop, categorie, colecție, search, produs și pagini informative.
- [ ] Signup/confirmare, login/logout, resetare, profil și adrese.
- [ ] Favorite, review eligibil/neeligibil și order history cu ownership/IDOR.
- [ ] Comandă COD, stoc, snapshot, double-submit și anulare/restock exact o dată.
- [ ] Comandă Stripe Live de sumă mică și refund controlat, ambele aprobate
  imediat înainte de acțiune.
- [ ] E-mailurile tranzacționale ajung numai la destinatarii aprobați.
- [ ] Admin: comenzi, status, shipment/tracking, COD collection, refund,
  moderare, conținut, dashboard și retry notificare.
- [ ] Mobil, tabletă, desktop, keyboard/focus, erori și empty states.
- [ ] Monitorizare manuală intensă pentru primele comenzi și persoană de gardă.

## Rollback operațional

### Deployment defect

1. Oprește promovarea/traficul și marchează incidentul.
2. În Vercel, promovează ultimul deployment Production cunoscut ca bun sau
   revino la commitul aprobat; nu modifica baza pentru a masca o eroare de UI.
3. Rulează smoke test pe deployment-ul restaurat înainte de redeschidere.

### Webhook Stripe defect

1. Oprește temporar inițierea noilor plăți cu cardul dacă confirmarea nu este
   sigură; păstrează evidența comenzilor existente.
2. Corectează endpoint-ul/secretul, verifică semnătura și raw body, apoi folosește
   replay-ul Stripe pentru evenimentele afectate.
3. Reconciliază server-side fiecare plată; success page nu confirmă plata și nu
   se editează manual statusuri fără audit.

### E-mailuri defecte

1. Menține comenzile funcționale; notificările au failure isolation.
2. Corectează sender-ul/DNS/cheia, apoi folosește retry-ul administrativ și
   dedupe-ul existent.
3. Nu retrimite în masă și nu trece Preview pe `live`.

### Problemă de bază de date

1. Oprește write-urile afectate și păstrează logurile/commitul/migrarea exactă.
2. Folosește o migrare forward-only revizuită sau procedura de restore aprobată
   a furnizorului, cu validare întâi într-un mediu separat.
3. Nu rula automat `db reset`, nu șterge manual date și nu rescrie migration
   history ca soluție de incident.

## Costuri și upgrade-uri de aprobat

- Vercel: plan comercial; pagina curentă indică Pro de la aproximativ
  20 USD/utilizator/lună, cu credit inclus conform ofertei curente.
- Supabase: Free versus Pro; pagina curentă indică Pro de la 25 USD/lună.
  Leaked Password Protection și backupurile zilnice extinse sunt motive directe
  de evaluare; PITR și custom domain pot avea cost separat.
- Resend: Free poate fi suficient la volum mic (limite curente afișate: 3.000
  e-mailuri/lună și 100/zi); Pro este afișat de la 20 USD/lună.
- Stripe: fără abonament standard, dar cu comision per tranzacție; pentru
  carduri EEA standard pagina România afișează în prezent 1,5% + 1,00 RON,
  cu tarife mai mari pentru alte categorii/carduri și conversie valutară.
- Domeniu: cost anual dependent de TLD și registrar; se compară înainte de
  cumpărare.
- Curier/locker, facturare/contabilitate, consultanță juridică, cookie consent
  dacă devine necesar și monitorizare/observability: furnizorul și costul sunt
  încă de decis; nu sunt activate de aplicația curentă.

Prețurile sunt orientative și trebuie reverificate pe paginile oficiale în
ziua aprobării. Niciun upgrade sau serviciu nou nu a fost activat în Faza 9C.

## Evidența checkpoint-ului 9C

- Development Supabase: 27 versiuni Local/Remote aliniate, până la
  `20260904230000`; dry-run `upToDate: true`.
- SQL: 12 suite, 496 aserțiuni din sursa curentă, 0 eșecuri; toate suitele au
  rulat tranzacțional și au făcut rollback.
- Chromium: 168 PASS, 0 FAILED, 0 NOT RUN cauzate de fail-fast.
- Unit e-mail: 8 PASS; ESLint, TypeScript și build Production: PASS.
- `npm audit --audit-level=high`: 0 vulnerabilități raportate.
- Cleanup Development: 30 de rezervări istorice expirate au fost reconciliate
  prin RPC-ul existent, atomic și fără ștergeri; 0 rezervări active/plăți
  pending/comenzi awaiting-payment au rămas în namespace-ul vizat. Comenzile
  anulate și produsele arhivate rămân audit nepericulos.
- Comanda Stripe Sandbox `CMD-2026-00001191`, creată controlat în verificarea 9B,
  rămâne intenționat ca dovadă de audit în Development; nu este Production.
- Production Supabase, Vercel, Stripe și Resend au rămas neatinse.

## Validarea finală 9C — 14 septembrie 2026

- Auth Preview: confirmarea contului, primirea e-mailurilor, resetarea parolei
  și autentificarea cu parola nouă au fost confirmate manual de proprietar.
  Aceste rezultate nu sunt deduse din testele automate sau din simpla
  configurare a redirect-urilor.
- Development `bdyocajhhylvasfhmnal` permite explicit cele două callback-uri:
  `https://proiect-site-git-task-e5c491-andreioprea26x-gmailcoms-projects.vercel.app/auth/confirm`
  și `https://proiect-site-git-task-e5c491-andreioprea26x-gmailcoms-projects.vercel.app/auth/reset-password`.
  Site URL rămâne `http://localhost:3000`; aplicația furnizează redirect-ul
  explicit. Fluxurile PKCE trebuie începute și finalizate în același browser.
- Limitări UX cunoscute, neblocante pentru fluxul validat: deschiderea linkului
  de confirmare în alt browser poate afișa eroare după confirmarea adresei;
  reutilizarea parolei curente afișează un mesaj generic care cere incorect un
  link nou. Nu s-a modificat implementarea pentru aceste cazuri.
- Webhook-ul existent Stripe Sandbox `we_1UAbf6Dxyx762at3Jt8e2OFX` a fost mutat
  de la Preview-ul `task-735245` către
  `https://proiect-site-git-task-e5c491-andreioprea26x-gmailcoms-projects.vercel.app/api/stripe/webhook`.
  Cele cinci evenimente, identitatea endpoint-ului și secretul existent au
  rămas neschimbate. Preview-ul vechi nu mai primește acest webhook.
- Stripe Sandbox 9C: plata interactivă cu date exclusiv fictive a trecut pe
  implementarea `909c33f`; comanda **CMD-2026-00001285**, total 108,90 RON,
  `livemode: false`, Checkout Session `complete`, payment `paid`.
- Evenimentul `evt_1UFdBVDxyx762at3KZGMzvS5` (`checkout.session.completed`) a
  fost livrat automat către Preview 9C cu HTTP 200, `classification: processed`.
  Auditul Development indică `action: confirmed`; comanda are `status: paid`
  și `payment_status: paid`, iar rezervarea de o unitate este `consumed`.
- Inventar verificat înainte/după: 10 → 9 pentru produsul demo. Există exact
  o mișcare asociată comenzii, delta -1, sursa `confirm_card_payment`.
  Coșul a trecut de la un articol la zero după confirmarea internă.
- Success page nu confirmă plata: citește starea internă prin
  `getOrderConfirmation`; parametrii `checkout`/`session_id` nu produc un
  write. Evenimentul semnat și tranzacția DB sunt sursa confirmării.
- Comanda, plata, rezervarea consumată și mișcarea de inventar sunt păstrate
  intenționat pentru audit Sandbox. Nu s-a șters istoric și nu s-a restocat
  artificial produsul; nu s-au creat produse sau metode de livrare noi.
- Revalidare din 14 septembrie: Chromium complet 168 PASS / 0 FAILED /
  0 NOT RUN; ESLint și TypeScript PASS. Build-ul anterior rămâne valid:
  nu există schimbări de cod, doar configurare Sandbox și documentație.
- După plata manuală: regresie focalizată Auth/Stripe 44 PASS / 0 FAILED /
  0 NOT RUN (login, register, email-confirmation, password-reset,
  session-persistence, stripe-checkout, stripe-concurrency). Suita completă
  de mai sus a rulat înainte de plata manuală; mediul automat își izolează
  valorile Stripe/Resend și nu folosește webhook-ul Preview.
- Production și `main` neatinse; fără secrete în documentație, dependențe,
  servicii sau costuri noi. Fără PR/merge și fără începerea Fazei 10.
- Verdict checkpoint 9C: **PASS**, cu limitările UX documentate mai sus.
  Aprobarea și executarea merge-ului rămân etape separate.

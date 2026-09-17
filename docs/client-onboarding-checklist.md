# Onboarding client — v0.1, propunere 10B.1

Proces viitor, nu autorizare de creare conturi, resurse, costuri sau lansare.
Un business = un repository/deployment și propriile Supabase, Stripe, Resend,
Vercel, domeniu, utilizatori și date. Fără SaaS/multi-tenancy/shared DB.
Vezi [auditul și matricea](productization-plan.md) pentru capabilitățile încă lipsă.
Nicio bifă de mai jos nu reprezintă muncă efectuată în 10B.1.

Actualizare 10B.2b: există acum `/admin/settings` pentru identitatea publică minimală.
Configul versionat `src/lib/config/store.ts` rămâne fallback; această disponibilitate
nu înseamnă că onboarding-ul unui client nou sau lansarea Production au fost executate.

### Identitate publică — verificări pentru fiecare instalare

- [ ] Admin setează nume, tagline, descrieri și date publice de contact în Store Settings.
- [ ] Linkurile sociale sunt HTTPS, pe Instagram/Facebook/TikTok aprobate; fără query,
  fragment, port, credentials sau destinații arbitrare. Telefon/WhatsApp: 7–15 cifre,
  opțional `+`. Numai text simplu, cu limite de lungime, fără HTML.
- [ ] Câmp gol → fallback din cod; clientul aprobă inclusiv fallback-urile și copy-ul
  editorial homepage, care are administrare separată.
- [ ] După Save, verifică nume în admin/storefront/Auth/account, footer și metadata;
  confirmă că emailurile operaționale folosesc aceeași identitate textuală.
- [ ] Public email nu este sender/reply-to automat. APP_URL, chei, SMTP/Resend, roluri,
  plăți și infrastructură rămân în env/dashboard tehnic, niciodată în Store Settings.
- [ ] Assets/RO/defaults rămân versionate; fără logo/upload/theme editor în 10B.2b.
- [ ] SQL Settings și regresia de securitate trec cu rollback. Testele care schimbă
  identitatea rulează izolat și restaurează valorile inițiale.

## 0. Fișa instalării și aprobări — manual

### Branding versionat — 10B.2c

- [ ] În `src/lib/config/store.ts`, setează `theme`: `evergreen`, `plum` sau `terracotta`.
  Palete noi sunt schimbări de cod în `theme.ts`, cu teste de contrast obligatorii.
- [ ] Copiază logo-ul revizuit în `public/branding/logo-vN.svg` (sau PNG/JPEG/WebP),
  apoi setează `assets.logo` la `/branding/logo-vN.svg`; `null` folosește numele.
  SVG numai din sursă de încredere, fără script/event handlers/foreignObject/URL extern.
  Verifică legibilitatea în slotul 192×48, inclusiv la 320px și pe fundal alb.
- [ ] Favicon: `assets.icon` → `/branding/icon-vN.svg`/PNG/ICO; `null` folosește
  iconul generic. Fără icon convention în `src/app`, care ar suprascrie metadata.
- [ ] OG brand: imagine 1200×630 PNG/JPEG/WebP în `public/branding`, setează
  `assets.ogImage`; `null` folosește PNG-ul generic static `/brand-og`.
  Imaginile produselor păstrează prioritatea. APP_URL rămâne în env.
- [ ] Folosește nume versionate noi când schimbi asset-uri; browserul și platformele
  sociale pot păstra favicon/OG în cache. Verifică după release și refresh cache.
- [ ] Rulează `npm run test:theme`, testele config/email și Chromium; verifică
  logo, fallback, focus/contrast, mobile, metadata și fiecare fișier configurat.
- [ ] Proprietarul schimbă texte/contact/social din Admin. Paleta, logo, favicon,
  OG și fontul comun necesită developer/release. Fără upload, CSS sau fonturi externe.
- [ ] Revalidarea după Save păstrează paleta/assets din cod; editorialul homepage
  salvat separat nu este rescris automat la schimbarea numelui.


- [ ] Identificator client ne-secret, responsabil tehnic și proprietar business.
- [ ] Tag/commit master aprobat, versiune schemă și customizări documentate.
- [ ] Nume magazin, logo/assets/licențe, paletă și descriere acceptate.
- [ ] Date comerciale, contact, social, catalog, livrare și politici furnizate.
- [ ] Fiscalitate/TVA/facturare validate de client cu specialistul său; template-ul
  nu furnizează automat motor TVA, facturi sau e-Factura.
- [ ] Costuri/planuri comerciale și ownership aprobate înainte de provisionare.
- [ ] Matricea Test/Preview vs Production completată cu ref-uri/origins, fără chei.
- [ ] Scope de mentenanță, backup, suport, retenție și handover convenit.

## 1. Repository — automatizabil cu verificare

- [ ] Repo separat din release master aprobat; `main`, `develop`, branch setup.
- [ ] Nu se copiază `.env*` în afară de exemplul gol, `.vercel`, `.supabase`,
  `supabase/.temp`, `.next`, node_modules, sesiuni sau rezultate de test.
- [ ] Remote Git nou verificat; fără push accidental în master/original.
- [ ] `.gitignore`, secret scan și accesul colaboratorilor verificate.
- [ ] Instalare cu lockfile (`npm ci`), versiuni Node/npm suportate și browserul
  Playwright instalat. Nu Docker. Fără upgrade-uri automate de dependențe.
- [ ] Config client în locul stabilit de 10B.2; README și fișa instalării actuale.

## 2. Supabase Test — provisionare manuală, verificări automatizabile

- [ ] Proiect Test nou, al clientului, regiune și acces aprobate; nu baza master.
- [ ] Verificare read-only a proiectului/ref-ului înainte de orice write; fail closed
  la ref necunoscut. Nu copiem link-ul CLI din repository-ul original.
- [ ] Revizuire migrări din release (baza 9C are 27); migration list și dry-run
  enumerate integral pentru ținta nouă. Confirmă că nu se aplică demo implicit.
- [ ] Aplicare în ordine numai după aprobare, prin workflow validat. Nu db reset,
  migration repair/pull/diff pentru a masca probleme. Nu rescriem istoricul master.
- [ ] Inventar tabele/RPC/RLS/granturi/search_path și bucket product-images verificat.
- [ ] Suite SQL transaction + rollback pe Test, cu dovezi și cleanup verificat.
- [ ] Nu declarăm reproductibilitatea doar pentru că migrările sunt versionate:
  instalarea pe bază goală trebuie să treacă efectiv.

## 3. Auth și admin bootstrap — manual controlat

- [ ] Proprietarul creează un cont nou, adresă verificată, parolă proprie; fără
  credentiale default în seed/Git/chat.
- [ ] Operator autorizat acordă `admin` numai UUID-ului verificat, pe proiectul
  corect; nu promovare după metadata user-editable și nu signup public de admin.
- [ ] Verifică customer implicit și că anon/customer nu poate accesa `/admin`.
- [ ] Site URL și allowlist exacte pentru Preview: `/auth/confirm` și
  `/auth/reset-password`; APP_URL coerent. Nu wildcard global pentru orice domeniu.
- [ ] Configurare SMTP și template-uri Auth separat de emailurile operaționale;
  expeditor verificat și setări de securitate aprobate, fără dezactivări de protecții.
- [ ] Link NOU confirmare, email primit, callback corect și login reușit.
- [ ] Link NOU resetare în același browser, parolă diferită, login cu parola nouă.
  Parola este introdusă de proprietar, nu inclusă în dovezi.
- [ ] Conturi E2E separate în Test; conturile magazinului original nu se importă.

## 4. Environment și Vercel Preview — manual / preflight automatizabil

- [ ] Proiect Vercel separat conectat numai la repo-ul clientului; Production Branch
  și scope-urile Preview/Production verificate înainte de primul deploy.
- [ ] Env publice: NEXT_PUBLIC_SUPABASE_URL și NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
- [ ] Env server: APP_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL,
  RESEND_REPLY_TO_EMAIL opțional, EMAIL_DELIVERY_MODE, EMAIL_TEST_RECIPIENT.
- [ ] Test/CI: E2E_ADMIN_EMAIL/PASSWORD și E2E_TEST_EMAIL/PASSWORD configurate,
  fără valori în raport; lipsa config trebuie să blocheze certificarea, nu skip verde.
- [ ] VERCEL_ENV/URL sunt gestionate de platformă; APP_URL este explicit pentru
  instalare. Fallback-ul SEO nu este substitut pentru callback/payment/email URLs.
- [ ] Preview numai cu chei Supabase Test, Stripe Test și email redirect.
- [ ] Nu sunt copiate webhook-uri sau secrete ale altui client/master.
- [ ] Deployment READY și smoke public; hostname Storage și imaginile funcționează.

## 5. Branding, catalog și seed — proprietar + operator

- [ ] Configurarea identității acoperă header/footer/admin/account/Auth/SEO/email.
- [ ] Logo/favicon/OG/image-uri și contrast/focus/mobile verificate.
- [ ] Homepage și conținut publicate din admin; drafturile nu apar public.
- [ ] Contact/social/date firmă aprobate; nu rămân promisiuni „handmade” nepotrivite.
- [ ] Politici juridice validate, nu textele altui client; linkurile necesare sunt
  vizibile și nu dispar din cauza limitei actuale de șase pagini în footer.
- [ ] Catalog real, variante, personalizări simple, stoc și praguri configurate.
- [ ] Metode/tarife de livrare introduse prin procedură tehnică aprobată (nu există
  încă admin shipping settings); alegerea COD/curierului și lipsa pragului gratuit
  în implementarea actuală sunt explicate clientului.
- [ ] Demo numai în Test, prin manifest opt-in viitor; fără dump din Development.
- [ ] Fără comenzi, payments/refunds, users, reviews, newsletter, mesaje, sesiuni,
  notification logs sau obiecte Storage ale magazinului original.
- [ ] Personalizarea cu upload privat/locker/facturare nu este vândută ca funcție
  gata de utilizare dacă nu are implementare și validare separată.

## 6. Stripe Sandbox și Resend — manual + verificări automatizabile

- [ ] Cont Stripe al business-ului, Sandbox separat; branding Checkout propriu.
- [ ] Endpoint Test propriu `https://<preview-client>/api/stripe/webhook` și secretul
  acelui endpoint. Nu mutăm endpoint-ul magazinului original către client.
- [ ] Events: checkout.session.completed, checkout.session.expired, refund.created,
  refund.updated, refund.failed. Redirect success/cancel către același Preview.
- [ ] Plată fictivă: Session, redirect, webhook 2xx, payment/order paid, reservation
  consumed, inventory delta unic, coș gol doar după confirmarea internă.
- [ ] Duplicate/out-of-order, expiry/concurență și refund fără restock automat
  verificate în Test; păstrare audit explicită pentru comanda Sandbox.
- [ ] Resend propriu, domeniu/sender verificat; emailurile Preview merg numai la
  destinatarul de test. Verifică livrarea efectivă și retry/dedupe/failure isolation.
- [ ] Auth email și email operațional certificate separat; succesul unuia nu
  dovedește configurarea celuilalt. Newsletter-ul nu include încă un motor campanii.

## 7. Gate tehnic înainte de live — automatizabil, aprobare manuală

- [ ] Lint, TypeScript, build, unit, SQL și Chromium complet pe mediul Test verde.
- [ ] Numere exacte PASS/FAILED/SKIPPED/NOT RUN; niciun test omis pentru a masca
  config sau schemă lipsă. Test fixtures nu ating date comerciale.
- [ ] RLS/IDOR, roluri, Storage, note private, reviews/moderare și rate limits PASS.
- [ ] Mobile, accesibilitate, SEO, canonical, noindex privat, sitemap PASS.
- [ ] Inventar de secrete/env, dependency scan și git diff verificate.
- [ ] Fără reziduuri demo/PII în artefactul clientului și fără date vechi importate.
- [ ] Release candidate identificat, raport și review acceptate.
- [ ] **STOP Live Stripe:** codul 9C acceptă doar chei/sesiuni Test, inclusiv SQL.
  Live cere implementare separată aprobată, migrare forward-only și validare;
  nu este suficient să setezi sk_live în environment.

## 8. Production și domeniu — numai după autorizare separată

- [ ] Ownership și costuri confirmate; resurse Production separate de Test.
- [ ] Supabase Production nou: migrări aprobate, fără demo/test users; admin real
  bootstrap controlat, backup/restore și acces minim verificate.
- [ ] Domeniu/DNS/TLS aprobate și configurate; APP_URL/canonical/Auth/webhook URLs
  schimbate coordonat. Vechile redirect-uri eliminate după verificare.
- [ ] Stripe Live numai după gate-ul tehnic de mai sus; chei și webhook separate.
- [ ] Resend sender verificat; EMAIL_DELIVERY_MODE=live numai pe Production după
  aprobare și verificarea destinatarilor; SMTP Auth verificat independent.
- [ ] Prima comandă de valoare mică și refund live aprobate explicit înainte de
  efectuare; fără date de card în loguri/chat. Nu rula fixtures distructive pe Live.
- [ ] Merge/promovare main numai după review; smoke non-destructiv, monitorizare
  și rollback pregătite. Nu promova accidental Preview-ul altui client.

## 9. Handover și mentenanță — manual

- [ ] Proprietarul are acces la repo/Vercel/Supabase/Stripe/Resend/domeniu; accesul
  furnizorului este minim și revocabil, iar secretele se predau prin canal sigur.
- [ ] Training: catalog/stoc, conținut, comenzi/COD, tracking, refund și notificări.
- [ ] Fișă instalare: commit/tag master + client, migrări, ref-uri, URL-uri,
  date verificări, responsabil backup/restore; fără secrete/tokenuri/PII.
- [ ] Procedură incidente pentru payment/webhook/email, retry și reconciliere.
- [ ] Backup de cod separat de DB/Storage/Auth/config furnizori; restore testat
  pe mediu separat. Rollback de Git nu șterge istoricul tranzacțiilor.
- [ ] Update-uri master prin PR separat pe repo client, regresie în Test și
  aprobare; niciun update simultan automat al tuturor clienților.
- [ ] Acceptanță și limite cunoscute semnate/confirmate de proprietar.

## Dovezi obligatorii la finalul fiecărui onboarding

Raportul consemnează target-urile verificate, release exact, schema, test counts,
Auth/email delivery, comanda Sandbox, webhook, stoc, cleanup/audit, readiness Live,
costuri aprobate, riscuri și persoana care aprobă lansarea. Lipsa unei dovezi este
BLOCKED pentru acea poartă, nu PASS presupus din instalarea software-ului.

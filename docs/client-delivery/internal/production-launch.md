# Production — procedură separată și launch checklist

Pentru `[CLIENT]`, release `[CLIENT_SHA]`, owner `[OWNER]`, operator `[OPERATOR]`.
Stare inițială: **NEAUTORIZAT / BLOCKED**. 10B.3 nu activează nimic Production,
nu execută plăți și nu creează servicii/costuri. Aceasta este procedura pentru un
task ulterior autorizat, după închiderea blocajelor. Nu reutiliza automat
runner-ul Test/Preview; el refuză Production și nu este executor Live.

## 0. Poarta tehnică și aprobările

- [ ] Acceptanța Test completă pentru release-ul exact, cu SQL/RLS/E2E fără
  failures/skip-uri/NOT RUN; [limitările actuale](package-audit.md) închise.
- [ ] **Stripe Live blocat în release-ul actual:** TypeScript și SQL acceptă chei/
  sesiuni/evenimente Test. Este necesar task separat aprobat, implementare,
  migrare forward-only și regresie financiară înainte de configurare Live.
  Schimbarea `STRIPE_SECRET_KEY` la Live nu rezolvă acest blocaj.
- [ ] Owner aprobă în scris planul exact: client, release, target-uri, operator,
  fereastră, operații permise, costuri, rollback și criterii STOP. Aprobare nouă
  dacă release-ul, ținta sau planul se schimbă; un PASS anterior nu autorizează writes.
- [ ] Owner aprobă separat resursele/planurile, DNS, conținutul și regulile
  comerciale, email live, activarea plăților, prima plată/refund și traficul public.
- [ ] Review de cod/documente și merge/promovare `main` aprobate separat.
  În 10B.3 nu se face PR/merge și nu se începe 10B.4.

## 1. Ownership, infrastructură și recuperare

- [ ] GitHub, Vercel, Supabase Production, Stripe, Resend și domeniul aparțin
  clientului; acesta are acces de proprietar și recuperare/MFA configurate.
- [ ] Test și Production au proiecte, chei și date separate; inventarul mediilor
  și autorizările sunt revizuite. Nicio copie de DB comercială în Test.
- [ ] Operatorul pregătește un plan de migrare Production revizuit, cu manifestul
  release-ului, identitate verificată imediat înainte de fiecare write și executor
  separat aprobat. Nu există executor generic Production în acest pachet.
- [ ] Dry-run și istoric exact; numai migrările aprobate în ordine. Fără demo
  seed, fixtures, parole implicite, `db reset`, history repair sau SQL improvizat.
- [ ] RLS, granturi anon/authenticated/server, RPC SECURITY DEFINER/search_path,
  Storage product-images/MIME/limite și izolarea conturilor verificate.
- [ ] Admin real: owner creează cont individual, email verificat și rol acordat
  tehnic numai UUID-ului confirmat. Teste acces anon/customer/admin și revocare.
- [ ] Backup separat pentru cod, DB, Auth, Storage și configurația furnizorilor;
  identifică exact ce acoperă planul ales. Responsabil `[BACKUP_OWNER]`, frecvență
  `[BACKUP_FREQUENCY]`, retenție `[RETENTION]`, ultima probă `[RESTORE_DATE]`.
- [ ] Restore testat într-un mediu separat aprobat, cu reconcilierea tranzacțiilor.
  Git rollback nu restaurează DB/Storage și nu anulează plăți. Dacă backupul sau
  recuperarea nu sunt demonstrate, gate-ul rămâne BLOCKED.

## 2. Domeniu, SSL, Auth și deployment

- [ ] Owner aprobă titularul/domeniul/costul și planul DNS; păstrează starea
  anterioară pentru revenire. Confirmă DNS, HTTPS/SSL, redirect HTTP și www/apex.
- [ ] `APP_URL` este origin final HTTPS fără slash final; canonical, OG, sitemap,
  robots și redirect-uri corecte. Rutele private noindex, fără tokenuri în sitemap.
- [ ] Vercel repo/branch/SHA și scope Production confirmate; env separat, fără
  PAT/chei operator/E2E. Deployment READY, fără promovarea accidentală a Preview.
- [ ] Supabase Auth Site URL și callback-uri exacte `/auth/confirm` și
  `/auth/reset-password`, SMTP/sender/securitate aprobate. Linkuri noi de confirmare
  și resetare primite și folosite în același browser; vechile redirect-uri eliminate
  controlat. Confirmarea programatică a bootstrap-ului nu este probă SMTP.

## 3. Plăți și email — numai după poarta tehnică

- [ ] Cont Stripe comercial verificat de owner; după suport Live implementat,
  chei Live server-only și signing secret specifice endpoint-ului HTTPS Production.
  Abonări webhook și modelul de evenimente se confirmă pe implementarea aprobată.
- [ ] Raw body/semnătură, idempotency, duplicate/out-of-order și reconciliere
  demonstrate în Test pe codul pregătit pentru Live. Success page nu confirmă plata.
- [ ] Prima comandă reală de valoare controlată are aprobare explicită imediat
  înainte de plată, sumă/destinatar/release/țintă documentate fără date card.
- [ ] Refund-ul real are aprobare distinctă imediat înainte de execuție;
  verifică starea financiară și lipsa restock-ului automat. Nicio suită fixture pe Live.
- [ ] Resend domeniu/sender/DNS și Reply-To aprobate. `EMAIL_DELIVERY_MODE=live`
  numai după aprobarea owner-ului în Vercel Production și test către adresa aprobată.
  Preview/Local rămân redirect. Auth SMTP este validat separat.
- [ ] Probe operaționale: comandă, plată, personalizare, În lucru, Pregătită,
  Expediată/tracking, anulare/refund, retry/dedupe/failure isolation.

## 4. Conținut, fiscalitate și protecția datelor

- [ ] Produse/fotografii cu drepturi, variante, prețuri RON, stoc real și unicat,
  termene și personalizări aprobate; niciun demo/test user în mediul comercial.
- [ ] Curier/tarife/arie RO/COD/ridicare și taxe verificate în checkout; procedura
  de facturare și orice obligație fiscală sunt validate cu specialistul clientului.
  Nu presupune motor TVA, e-Factura, prag gratuit sau locker implementate.
- [ ] Date comerciale, termeni, confidențialitate, livrare/retur și cookies după
  evaluare sunt aprobate de client/specialist și accesibile, inclusiv pe mobil.
  Verifică limita de șase pagini footer. Nu copia politici de la alt client.
- [ ] Acces minim la PII, retenție, export/corectare/ștergere și proces incidente
  stabilite de client; procedura tehnică exactă revizuită înainte de schimbarea
  datelor. Nu există certificare juridică automată sau UI complet GDPR promis.
- [ ] Inventar cookies/trackere reale; orice element neesențial și mecanism de
  consimțământ necesar se evaluează separat. Nu introduce analytics/servicii noi.
- [ ] Reguli newsletter/consimțământ validate; nu se activează campanii automat.

## 5. Verificări finale și decizie de lansare

- [ ] Smoke public/mobil/keyboard: homepage, catalog, produs, coș și pagini.
- [ ] Flux COD, stoc și tracking; flux card/refund autorizate separat conform
  secțiunii 3. Date de probă controlate, păstrate pentru audit când este necesar.
- [ ] Secrete/permisiuni/dependențe revizuite pe release; niciun secret în bundle,
  documente, Git, logs sau artefacte publice; accesurile temporare revocate.
- [ ] Monitorizare cu instrumentele existente: health/deployment, erori server,
  webhook delivery, plăți pending/rezervări, email failed și stoc. Responsabil
  `[MONITORING_OWNER]`, frecvență `[MONITORING_FREQUENCY]`, canal `[INCIDENT_CONTACT]`.
  Verifică procesul de reconciliere a rezervărilor: nu presupune cron implementat.
- [ ] Ultimul deployment bun și planul de recuperare sunt identificate; operator
  disponibil în fereastra convenită, fără a promite SLA contractual neaprobat.
- [ ] Owner acceptă probele, problemele rămase și documentele, apoi aprobă explicit
  deschiderea traficului pentru SHA/ținta/datele din fișă. Orice blocant = STOP.

## Incidente și revenire

Operatorul oprește promovarea/fluxul afectat prin mecanismul verificat și aprobat
al infrastructurii; nu există buton de pauză magazin promis de aplicație. La
deployment defect revine la ultimul release compatibil cu schema și rulează
smoke. La webhook defect verifică/reconciliază plata și replay-ul semnat, fără
marcare manuală paid. La email defect repară sender/config și folosește retry
după verificare. La DB defect păstrează dovezile și folosește restore aprobat sau
migrare forward-only revizuită, validată întâi separat. Nu șterge audit financiar
și nu reexecuta writes cu rezultat incert. Owner-ul decide comunicarea incidentului
și implicarea specialistului pentru date personale.

[Checklist-ul istoric Faza 9](../../production-launch-checklist.md) oferă context
de rollback/inventar; rezultatele, prețurile și URL-urile sale nu sunt dovezi
actuale pentru client. Ofertele furnizorilor se verifică în ziua aprobării, fără
prețuri sau angajamente comerciale introduse de acest pachet.

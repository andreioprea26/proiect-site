# Ghid instalator — Test/Preview

Se folosește după [onboarding](../../client-onboarding-checklist.md), cu
[fișa clientului](client-record-template.md). Procedură de executat într-un task
autorizat per client; 10B.3 pregătește documentația, nu execută instalări remote.
Orice FAIL/timeout/rezultat incert = STOP și investigație read-only. Fără reset,
repair, retry automat după write incert, Docker sau copiere de date originale.

## 1. Repository dedicat și două checkout-uri

Owner-ul aprobă release-ul master, conturile, accesurile și orice cost înainte de
crearea resurselor. Creează un repository privat gol în organizația clientului,
fără import de issues/artefacte/secrete. Exportă numai snapshot-ul tracked al
release-ului revizuit, după scanarea sa pentru secrete; istoricul și `.git` ale
master-ului nu se copiază. Exemplu PowerShell, cu variabile ne-secrete completate:

```powershell
$templatePath = 'C:\work\template-reviewed'
$releaseSha = '[RELEASE_SHA]'
$snapshotZip = 'C:\work\client-source.zip'
$clientOperatorPath = 'C:\work\client-operator'
$clientRepository = 'https://github.com/[CLIENT]/[REPOSITORY].git'
git -C $templatePath status --short
git -C $templatePath rev-parse "$releaseSha^{commit}"
git -C $templatePath archive --format=zip --output=$snapshotZip $releaseSha
Expand-Archive -LiteralPath $snapshotZip -DestinationPath $clientOperatorPath
Set-Location -LiteralPath $clientOperatorPath
git init -b main
git add .
git diff --cached --stat
git commit -m "Initialize client from reviewed template release"
git remote add origin $clientRepository
git remote -v
```

Verifică fiecare exit code înainte de continuare; într-un script folosește
`$LASTEXITCODE` și oprește la nenul. Destinațiile sunt directoare noi, fără
overwrite. Notează mapping-ul master SHA → client SHA în fișă. Revizuiește toate
fișierele staged înainte de commit; nu copia `.env*` (exceptând `.env.example`),
`.vercel`, `.supabase`, `supabase/.temp`, `node_modules`, `.next`, logs sau rapoarte.
După scanarea de mai jos și confirmarea origin-ului client, push-ul repo-ului nou
se face numai în task-ul autorizat de creare client:

```powershell
node scripts/scan-secrets.mjs
git push -u origin main
git switch -c develop
git push -u origin develop
git switch -c task/client-preview-setup
git push -u origin task/client-preview-setup
git clone $clientRepository 'C:\work\client-app'
```

Checkout-ul **operator** rămâne curat și fără dependențe/config local.
Checkout-ul **app** este pentru branding, build și E2E; selectează acolo același
release client. Modificările de branding se revizuiesc și se comit înainte de
sincronizarea operatorului. Niciun push către repository-ul master/original.

## 2. Țintă standalone și manifest extern

Node 22+, Git și CLI Supabase compatibil cu runner-ul sunt necesare. Verifică
`node --version`, `git --version`, `supabase --version` și
`supabase db push --help`; runner-ul verifică suportul CLI necesar. Nu instala
dependențe în operator și nu executa `supabase link` moștenit din alt proiect.

Owner-ul creează separat Supabase standalone **nou și gol**, deținut de client,
destinat exclusiv Test/Preview, cu organizație/regiune/cost aprobate. Inventariază
ref-urile Production. Nu utiliza Development sau demo originale. Confirmă
identitatea remote, scopul necomercial și lipsa operatorilor concurenți.

Copiază [manifestul exemplu](../../../config/client-install.example.json) într-un
director privat **în afara repo-ului**. Completează toate câmpurile, inclusiv
`productionRefs` (listă goală numai dacă owner-ul confirmă că nu există Production),
`appUrl` exact, `e2e.required=true`, ref-uri identice și `allowDemoSeed` explicit.
Standalone nu cere `previewBranch`. Injectează prin secret manager environment-ul
din [preflight](../../preflight.md), inclusiv `SUPABASE_ACCESS_TOKEN`, cheile
clientului, Stripe Test și email redirect. Nu introduce valori în comandă/chat.

`CLIENT_INSTALL_CONFIG`, `CLIENT_CONFIRM_PROJECT_REF`, `CLIENT_TARGET_APPROVAL`
(cale absolută nouă externă) și `CLIENT_TARGET_APPROVAL_KEY` sunt obligatorii pentru
[autorizarea interactivă](../../standalone-target-authorization.md). Cheia de
aprobare aleatorie este privată; challenge-ul owner confirmă ref și organizație.
Aprobarea expiră în 24h, este legată de configurație și nu autorizează dashboards.

## 3. Migrații, demo opțional și bootstrap

În operator, după configurarea environment-ului privat:

```text
node scripts/verify-migration-manifest.mjs
node scripts/scan-secrets.mjs
npm run client:authorize
npm run preflight -- empty
npm run client:install -- all --apply
```

Ultima comandă aplică migrațiile și bootstrap-ul tehnic Test cu gate-uri interne.
Nu o executa dacă alegi demo. Pentru demo fictiv aprobat, înlocuiește **numai
ultima comandă** cu fluxul:

```text
node scripts/install-client.mjs migrate --apply
node scripts/seed-demo.mjs catalog --dry-run
node scripts/seed-demo.mjs catalog --apply
node scripts/seed-demo.mjs shipping --dry-run
node scripts/seed-demo.mjs shipping --apply
node scripts/install-client.mjs bootstrap --apply
```

Shipping demo este opțional și nu configurează un contract real de curier.
Seed cere `allowDemoSeed=true` în manifestul semnat și rulează înainte de users.
Nu rula seed după `all`. Runner-ul validează exact cele 29 de migrații și hash-uri
ale release-ului actual, execută dry-run și repetă gate-ul înainte de write.
Nu folosi `db push` manual după un preflight separat.

Injectează `CLIENT_BOOTSTRAP_ADMIN_EMAIL` egal cu destinatarul QA aprobat și
`CLIENT_BOOTSTRAP_ADMIN_PASSWORD` dedicată, minimum 16 caractere. Acest cont este
admin **tehnic Test**, confirmat programatic; nu este contul owner Live și nu
dovedește livrarea emailului. Auth și SQL nu sunt o tranzacție comună: la eșec
parțial păstrează dovada sanitizată și investighează, fără ștergere/retry automat.
O reaprobare a schemei complete folosește o cale nouă și
`npm run client:authorize -- migrated`; nu repară istoric parțial.

## 4. Configurare aplicație și Preview

În checkout app, fără env copiat din master, injectează numai variabilele client
necesare build-ului. Folosește lockfile-ul, fără upgrade-uri automate:

```text
npm ci
npm run check
npm run test:config
npm run test:settings
npm run test:theme
npm run test:email
```

Brandingul versionat este în [store.ts](../../../src/lib/config/store.ts),
assets în [public/branding](../../../public/branding), conform
[10B.2c](../../10b2c-theme-brand-assets.md). Palete: evergreen/plum/terracotta;
palete noi cer cod și verificare contrast separată. Texte/contact prin Store
Settings; catalog, conținut și homepage prin [ghidul admin](../client/admin-guide.md).
Revizuiește fallback-urile: câmp gol nu înseamnă ștergerea tuturor textelor.

Vercel este configurare administrativă **separat autorizată**, în contul client:

1. Verifică repository-ul și Production Branch înainte de conectare. Controlează
   auto-deploy-ul ca să nu publici `main` accidental. În această etapă doar Preview.
2. Setează scope Preview pentru `APP_URL`, cele două variabile publice Supabase,
   `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`,
   `EMAIL_DELIVERY_MODE=redirect`, `EMAIL_TEST_RECIPIENT` aprobat. Nu pune PAT,
   cheia de aprobare, bootstrap sau credențiale E2E în runtime Vercel.
3. `APP_URL` = origin HTTPS Preview aprobat, fără path/slash final; manifestul
   trebuie să coincidă. Dacă URL/config se schimbă, reînrolează configurația;
   aprobarea veche nu mai corespunde. `VERCEL_ENV` este gestionat de Vercel.
4. Confirmă deployment READY pentru SHA corect, DB healthy, imagini Storage și
   rutele publice. Protecția Preview trebuie să permită webhook-ul aprobat fără
   expunerea unei metode nesigure de bypass. Niciun secret în URL sau capturi.

## 5. Auth, Stripe Sandbox și email

Fiecare operație dashboard cere verificare imediată a contului/ref-ului și a
planului aprobat. Runner-ul nu configurează și nu protejează aceste operații.

- Supabase Auth: Site URL Preview și allowlist exactă pentru
  `[PREVIEW_ORIGIN]/auth/confirm` și `[PREVIEW_ORIGIN]/auth/reset-password`.
  SMTP/template-uri Auth separat de Resend operațional; sender aprobat, fără
  dezactivarea protecțiilor. Creează un customer fictiv nou; primește link nou,
  confirmă/reset în același browser, apoi verifică login/logout. Bootstrap-ul
  confirmat programatic nu este această probă.
- Owner admin: în Test se creează cont individual separat de QA. Acordarea rolului
  este operație tehnică autorizată numai pe UUID/email verificate și ref confirmat,
  prin rolurile existente; nu există UI de management roluri sau runner generic
  pentru promovarea contului owner. Pregătește și revizuiește procedura exactă
  înainte de write; nu utiliza metadata editabilă de user ori cont comun.
- Stripe: cont/Sandbox al clientului, cheie Test server-only. Endpoint propriu
  `[PREVIEW_ORIGIN]/api/stripe/webhook`, secret specific endpoint-ului. Evenimente:
  `checkout.session.completed`, `checkout.session.expired`, `refund.created`,
  `refund.updated`, `refund.failed`. Nu muta endpoint-ul altui magazin.
- [Stripe Test](../../stripe-test-mode.md) descrie fluxul: Session/success page
  nu confirmă plata. Într-un task autorizat Sandbox, verifică eveniment semnat
  procesat, payment/order paid, rezervare consumed, delta stoc unic și coș gol
  după confirmarea internă; duplicate/expiry/refund fără restock automat.
- [Resend redirect](../../resend-development.md): cont client/sender verificat,
  destinatar QA unic, numai date fictive. Confirmă primirea mesajelor operaționale,
  jurnal și retry/dedupe; aceasta nu certifică SMTP Auth. Preflight cere și Reply-To
  în environment-ul său, chiar dacă runtime-ul îl tratează opțional.

Metodele/tarifele reale de livrare cer setup tehnic separat revizuit: nu există
ecran admin dedicat și nu se adaptează seed-ul demo în Production.

## 6. Testare și validare finală

În operator curat, cu conturi E2E dedicate injectate și manifest aprobat:

```text
npm run preflight -- e2e
```

PASS dovedește configurația gate-ului, nu login, webhook sau Playwright.
**STOP pentru certificare automată client completă în release-ul actual:**
[demo-target.ts](../../../tests/e2e/demo-target.ts) refuză ref client arbitrar în
testele Settings/theme; transportul fixture SQL este demo-only. Nu dezactiva
guard-ul, nu seta ref fals și nu acorda granturi runtime pentru fixtures.
Documentează BLOCKED și cere un task tehnic separat pentru E2E client generic.

După implementarea și review-ul acelui suport, comenzile repository-ului pentru
checkout app sunt cele de mai jos; **nu se rulează acum pe un client nou**:

```text
npx playwright install chromium
npm run test:e2e -- --project=chromium --workers=1
```

Configul actual pornește local la `http://127.0.0.1:3100`, include dependența
`store-settings`, nu testează direct URL-ul Vercel; substituie Stripe/Resend cu
valori de test. Fluxul real Preview/Auth/email/webhook se verifică manual separat.
Nu folosi [runner-ul demo](../../demo-e2e.md) pe client. Rapoartele/trace/video
pot conține credențiale și PII; păstrează privat, inspectează înainte de partajare.

Suitele din [supabase/tests](../../../supabase/tests) cer executor SQL autorizat
pe Test verificat, rollback și dovadă fără reziduuri. Nu există script npm generic
care le certifică pe un client nou; alegerea executorului se revizuiește separat,
fără `--linked` implicit sau granturi artificiale.

Completează probele din [handover](../client/handover-maintenance.md): catalog,
checkout COD, stoc/unicat, Sandbox/refund, Auth, acces anon/customer/admin, RLS,
conținut, mobil, notificări și config. Raportează PASS/FAILED/SKIPPED/NOT RUN exact,
cu SHA și țintă; orice gate obligatoriu fără dovadă = BLOCKED. Predarea Preview
limitată nu închide certificarea completă și nu autorizează Production.

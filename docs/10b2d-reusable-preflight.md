# 10B.2d reusable client preflight

Data: 2026-10-12. Scope: tooling și documentație, fără business logic, schemă,
deployments manuale, resurse sau instalare demo repetată. Fără PR/merge.

Verdict: **PASS pentru finalizarea preflight-ului reutilizabil Test/Preview**.
Teste noi: **36/36 PASS, 0 FAILED, 0 SKIPPED**. Manifest: **29/29 PASS**.
ESLint și TypeScript: PASS. Scanarea snapshot-ului și diff-check sunt confirmate
la handoff după salvarea finală. Nu se acordă PASS anticipat unui target necunoscut.

## Implementare

- scripts/preflight.mjs și scripts/lib/client-preflight.mjs: gate per client,
  read-only, fără dependențe npm; manifest extern fără secrete și env de proces.
- supabase/migration-manifest.json: 29 fișiere exacte și SHA-256 UTF-8/LF.
  scripts/verify-migration-manifest.mjs verifică fără a rescrie manifestul.
- scripts/seed-demo.mjs: opțional per client Test/Preview, guard online înainte
  de fiecare operație și aprobare explicită; reutilizează SQL fictiv neschimbat.
- scripts/scan-secrets.mjs: scan snapshot tracked + untracked neignorat;
  preflight inspectează suplimentar fișierele ignorate din checkout-ul operator.
- Legacy demo seed/provision primesc gate; runner-ul E2E raportează lipsa env
  ca eroare explicită, nu skip. Provisioner-ul istoric rămâne demo-only.

Production este refuzat integral, la fel ref original, target neconfirmat,
config lipsă, Stripe Live, email nesigur, repo/artefacte copiate, migrații schimbate,
istoric parțial/suplimentar și proiect offline/necunoscut. Cheile Supabase sunt
comparate în memorie cu API-ul proiectului, fără output de valori.

## Dovezi și limite

Testele noi folosesc Git temporar și HTTP simulat; nu reexecută writes sau probe
pe demo/original. Acoperă happy path, toate guard-urile cerute, redacția erorilor,
seed refuzat înainte de writer, opt-in, dry-run/commit explicit și payload targetat.
Rezultatele exacte finale sunt în handoff, după ultima rulare.

Rezultatele funcționale istorice rămân Chromium 186/186, SQL 14/14, unit 30/30,
lint/type/build PASS; nu sunt rezultate rerulate în octombrie. Nu s-a schimbat
runtime-ul aplicației, nu s-a rulat iar build sau întreaga suită pentru tooling.

Gate-ul nou nu a fost executat pe un al doilea client real în acest task. Fiecare
instalare trebuie să obțină online PASS pe target-ul său și să valideze separat
Auth/email/Stripe/RLS. Dovezile istorice clean-install plus testele tooling nu sunt
un certificat universal pentru orice cont cloud. Un API fără permisiuni oprește
instalarea, nu permite bypass. Clasificarea Test/Production necesită inventar și
aprobare corecte de la owner; preflight nu le poate inventa.

Template-ul oferă acum procesul versionat de instalare reproductibilă și sigură
de la zero pentru un client nou Test/Preview, condiționat de gate-urile online și
checkpoint-ul funcțional al acelui client. Nu este un installer unattended și nu
autorizează Production. Comenzile manuale în afara runner-elor necesită același
gate imediat înainte de write; un script nu poate intercepta SQL Editor extern.

Nu s-au modificat demo-ul sau resursele Supabase/Stripe/Resend/Vercel originale.
Se publică numai branch-ul sursă; eventuala automatizare Preview pornită de Git
este distinctă de un deployment manual, care nu a fost cerut sau executat.

Documentație operațională: [preflight](preflight.md), [clean install](clean-install-guide.md),
[onboarding](client-onboarding-checklist.md), [plan](productization-plan.md),
[seed](demo-seed.md) și README. Se păstrează arhiva Phase 9/main/develop fără merge.

# 10B.2d final acceptance blockers fix

Data: 2026-10-12. Bază auditată: 9ecd26a011b50eb8f8ecab03107c4d0f14bd242a.
Scope: tooling + teste + documentație; schema/migrațiile ecommerce nu se schimbă.

Verdict: **PASS pentru cele două blocaje de acceptare**, în scope-ul Test/Preview
verificabil remote descris mai jos. Nu reprezintă certificarea unui client live.

## Rezolvări

1. `scripts/install-client.mjs` / `scripts/lib/client-install.mjs` sunt executorul
   oficial pentru migrate/bootstrap/all. Preflight FAIL/rezultat nevalid = niciun
   writer. Dry-run precede revalidarea imediată și apply pe ref fixat. Post-migration
   exact obligatoriu înainte de bootstrap. Config/env/identitate/release/history/
   snapshot schimbate sunt refuzate. SQL este capturat după verificarea SHA-256,
   nu recitit arbitrar de CLI din workspace-ul original. Nu există repair/cleanup cloud.
2. Validatorul central refuză hardcoded bdyocajhhylvasfhmnal și bfmihaxfleztajzyamio
   în toate etapele, fără override. Țintele noi cer probă remote Supabase pentru
   branch non-default, fără date copiate, UUID/ref/parent/nume/org și status healthy.
   Etichetele locale nu sunt suficiente; standalone sau metadata insuficientă = FAIL.

Bootstrap automatizat = cont tehnic Test dedicat, fără users/roluri/comenzi existente,
creat prin Auth Admin API și promovat numai după trigger/profil/customer role validate.
Gate nou înainte de create și promote; promovarea folosește locks și condiții în
aceeași tranzacție. Confirmarea emailului tehnic nu este dovada livrării Auth.
Primul owner Live, SMTP, DNS, Vercel, billing și webhook settings sunt administrative
separate, nu declarate protejate de acest runner. Vezi [limite](client-install-runner.md).

## Matrice teste

| Caz | Dovadă automată |
| --- | --- |
| Demo empty/migrated/e2e, chiar cu history valid | preflight: trei teste dedicate, zero rețea |
| Development original, Production, target neaprobat | validator și runner: zero writes |
| Preflight throw sau status FAIL | runner: zero writer calls |
| Migration payload/history mismatch | runner: zero writes înainte de apply |
| Target local/remote schimbat după gate | runner: zero writes |
| Bootstrap înainte de migrations | runner: FAIL înainte de create |
| Post-migration mismatch | numai tentativa migrations; bootstrap oprit |
| Flux valid Test/Preview simulat | migrations → create → promote → final verification |
| Erori migrations/create | propagate, fără retry sau operații următoare |
| Target schimbat înainte de promovare | create păstrat, role write refuzat |
| Users/comenzi existente | refuz fără takeover |
| Comanda oficială CLI și adapter | apply explicit, ref fixat, skip-vault, fără seed/roles |

Rezultate finale: preflight **44/44 PASS**; runner **23/23 PASS**, zero failed/skipped.
Include integrarea runner-ului cu preflight-ul real pe Git temporar și HTTP simulat.
Manifest **29/29 PASS**; regresie unit **30/30 PASS** (email 8, config 8, settings 6,
theme 8). ESLint, TypeScript și production build PASS. Secret scan: 323 fișiere,
zero matches; diff-check PASS. Git este confirmat la handoff după commit/push.

## Distincție live și simulare

Toate scenariile care ar scrie folosesc mocks/fixtures și directoare locale temporare.
Nu s-a apelat API-ul unui client real și nu s-a refăcut clean install-ul demo.
CLI help a fost verificat local (v2.116.0); executorul și argumentele sale au fost
testate prin mock. Instalarea reală anterioară rămâne dovadă istorică separată.

Nu sunt create servicii sau costuri; suportul pentru ramură Preview necesită resursa
aprobată deja disponibilă la client. Dacă aceasta nu există, FAIL, nu upgrade automat.
Nu există tranzacție comună între provider control plane, CLI și Auth: se cere
fereastră exclusivă, fără operatori concurenți. Rezultat incert/creare parțială = FAIL
și investigare read-only, fără retry automat sau ștergerea userului pentru a ascunde eroarea.

Fără PR/merge, fără modificări Supabase demo/original/comandă audit/Stripe/Resend,
fără branch main/archive/tag mutat. Push-ul pe branch poate declanșa CI/Preview;
nu este un deployment manual solicitat sau executat aici.

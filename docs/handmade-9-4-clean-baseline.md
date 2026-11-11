# Handmade 9.4 — bază curată și retragerea productizării

Data: 2026-11-11. **Local: PASS după verificările de mai jos. Global: PARTIAL**:
resursele și schema remote nu au fost modificate; retragerea lor necesită review,
backup recuperabil și aprobare separată. Nicio operațiune cloud cu write.

## Baza și curățarea efectivă

- Working tree inițial curat, HEAD exact
  `e703929d20fbc60a79fd1215a9c999cadf0745b5`, branch 9.3.
- Branch creat: `task/handmade-clean-baseline`, direct din acel commit.
  Nu s-a pornit din develop și nu s-a importat nimic de acolo.
- `src/`, `public/`, dependențele, configurația Playwright și `.env.example`
  sunt identice arhivei Fazei 9. Nu există în această bază StoreBrand, teme,
  `/admin/settings`, instalatoare client, seed/demo runners sau showcase 10B.
  **Nu exista cod 10B versionat de șters.** Nu am fabricat un diff de eliminare.
- Eliminată configurația locală ignorată `.env.e2e-demo.local`, după verificarea
  ref-ului exclusiv Demo `bfmihaxfleztajzyamio` și absenței ref-ului handmade.
  Nu au fost afișate/salvate credențiale; `.env.local` handmade a rămas intact.
  Ștergerea acestui fișier ignorat nu apare în commit și nu șterge resurse cloud.
- README actualizat de la stadiul depășit Faza 1 la baza validată handmade;
  index al documentelor 9.1–9.4 și avertizare explicită să nu integrăm develop.
- Instrucțiunea generică de db push din documentul migrărilor a fost marcată
  istorică, neaplicabilă automat diferenței 28/29.
- Referințele 10B din rapoartele de securitate/istoric sunt relevante: explică
  diferențele reale și nu promovează productizarea. Sunt păstrate. Denumirile
  de produse `*-demo` din testele originale sunt fixture-uri Faza 9, nu showroom-uri
  comerciale; nu se șterg. Artefactele ignorate de test nu fac parte din aplicație.

Rămân toate funcționalitățile Fazei 9, hardeningul 9.2, testele stricte 9.1,
toate cele 13 suite SQL și probele/uneltele 9.3. Contractul opțional
`get_public_store_settings()` rămâne strict cât extensia există remote.
Două fixture-uri SQL citesc migrarea auditată din obiectul Git fix `0081812`;
acesta trebuie păstrat accesibil inclusiv pentru CI. Nu este integrare 10B.

## Inventar Git verificat

`git ls-remote --heads --tags origin` a reconfirmat următoarele ramuri 10B,
existente și local: `task/10b1-productization-audit`,
`task/10b2a-public-store-config`, `task/10b2b-admin-store-settings`,
`task/10b2c-theme-brand-assets`, `codex/10b2d-rls-preflight`,
`task/10b3-client-delivery-package`, `task/10b4-commercial-demos`.

- develop local/remote: `0081812ce76f16811cd97b983cd772f139cc10f1`.
  Conține 10B.1–10B.3, `src/lib/config`, `src/lib/store-settings`, branding,
  admin settings, installers/preflight/seed/demo scripts, teste/config comerciale,
  `docs/productization-plan.md`, `docs/client-delivery`, documente 10B.2 și
  două migrări suplimentare: `20260915120000_public_store_settings.sql` și
  `20260918150000_explicit_runtime_table_grants.sql`.
- 10B.4: `8c449947298c703b159b7dc7208d2b4d9f249a3c`, pe branch separat;
  showcase Iris/Soare/Poveste, JSON/SVG/capturi și runner-e locale. Nu este în
  develop și nici în baza handmade. Prezentările locale nu sunt trei proiecte cloud.
- Unicul tag remote listat: `phase-9-final`, tag adnotat `08d9de4`, commit
  dereferențiat `6d84c236d4a91f460549be4cf175fd68e0ca1615`, identic arhivei.
  Nu există tag 10B în inventarul accesibil.
- main local este `10c776a`; main real remote este acum `8850f28` conform
  ls-remote. Nu s-a făcut fetch/merge și nu presupunem că main local descrie
  istoricul remote curent. Conținutul noului main necesită verificare înainte
  de o eventuală integrare; nu îl folosim drept bază handmade.
- Branch-ul 9.3 remote este încă `6b5bd1a`; închiderea `e703929` este locală.
  Nu a fost șters, mutat sau rescris niciun ref existent.

## Inventar cloud READ-ONLY și eligibilitate pentru retragere

| Resursă exactă | Constatare | Decizie |
|---|---|---|
| Supabase `bdyocajhhylvasfhmnal`, andreioprea26's Project, eu-west-1 | ACTIVE_HEALTHY, 29 migrări | PĂSTRĂM proiectul, Auth, Storage și datele handmade |
| Supabase Demo istoric `bfmihaxfleztajzyamio` | Ref din configurația comercială; lipsește din GET /projects, GET proiect = 403 cu accesul curent | NECUNOSCUT; nu dovedim ștergerea, existența sau lipsa dependențelor. Necesită acces/ownership înainte de propunerea ștergerii |
| Supabase `gqghceqelskaaaqinloy`, proiect-meditatii | INACTIVE, listat în același acces | ALT PROIECT, nu este Demo handmade; nu se atinge |
| Vercel `proiect-site`, echipa andreioprea26x-gmailcoms-projects | Singurul proiect afișat în echipa verificată, Git andreioprea26/proiect-site | PĂSTRĂM proiectul, domeniile și deploymentul handmade |
| Vercel 9.3 `dpl_7FzLYrKNTtbcGwB4cQZ98vyRCEZp` | Preview handmade validat, commit 6b5bd1a, alias task-4af756 | PĂSTRĂM; nu este înlocuit automat de branch-ul nou |
| Vercel 10B.4 `dpl_FWGjJCrLpc5A4wJ2LrLWyw2Egv8j` | Ready, Preview, source 8c44994, branch task/10b4-commercial-demos; alias task-945992, URL proiect-site-bo3sowplj-andreioprea26x-gmailcoms-projects.vercel.app; custom domains skipped | CANDIDAT CONFIRMAT de eliminare a deploymentului și aliasului comercial, după aprobare; fără ștergerea proiectului Vercel |
| Vercel develop `dpl_78Gw5gniUCnP3p3P9SmjyMyTGSSd` | Preview comercial develop, alias proiect-site-git-develop-andreioprea26x-gmailcoms-projects.vercel.app | CANDIDAT pentru retragere; verify mappings/consumatori înainte de eliminare |
| Vercel 10B.3 `dpl_GCesU1CNhGByKGjzr3gMb4GDL5z3` | Preview task/10b3-client-delivery-package, alias task-208582 | CANDIDAT comercial; verificați toate deploymenturile anterioare ale acelui branch înainte de a declara inventarul complet |
| Alte Preview-uri 10B.1–10B.2d | Există istoric/alias codex-2c9340 în UI; nu au fost enumerate toate paginile de deployment | DEPENDENȚE/INVENTAR INCOMPLET; lista de mai sus nu certifică exhaustivitatea tuturor deploymenturilor istorice |
| Stripe Sandbox `acct_1U968HDxyx762at3`, handmade-preview-9-3 `we_1UaPLNDxyx762at3ABGkAs2j` | Active, 5 evenimente, către aliasul handmade task-4af756 | PĂSTRĂM contul, endpointul, cheia și istoricul Sandbox folosite de handmade |
| Stripe proiect-site-preview-6c `we_1UAbf6Dxyx762at3Jt8e2OFX` | Încă Active, 5 evenimente, 100% erori în UI; HTTP 410 documentat în 9.3, alias task-e5c491 | CANDIDAT CONFIRMAT endpoint vechi inutil pentru 9.3; nu este exclusiv 10B și nu ștergem contul/plățile/cheile comune |
| Resend key Onboarding `e4d660a1-1bae-44e5-9a20-ea1d716da740` | O singură cheie afișată, Sending access; folosită de handmade | PĂSTRĂM cheia și contul. Nicio cheie exclusiv demo identificată |
| Resend Domains / Webhooks | No domains yet / No webhooks yet | Nimic de eliminat în aceste două inventare; senderul onboarding@resend.dev și redirectul handmade se păstrează |

Vercel afișează opt variabile private/config scoped exclusiv pe branch-ul 9.3,
două variabile publice Supabase generale Preview și patru override-uri vechi
pe `task/9c-final-launch-readiness` (APP_URL, service role, Stripe key/webhook).
Nu există aici override comercial 10B identificat. Nu eliminați variabilele
generale sau 9.3. Cele patru 9c sunt istorice Faza 9: retragerea lor este separată,
după verificarea consumatorilor, nu o ștergere automată ca 10B.
Nicio valoare secretă nu a fost revelată/copiată din dashboard.

Documentele 10B.4 afirmă fixtures HTTP locale fără Supabase real pentru cele trei
showcase-uri; totuși Vercel a construit automat un Preview al branch-ului 10B.4.
Nu confundăm capturile locale cu absența acelui deployment efectiv observat.
Nu s-au identificat proiecte Vercel separate Iris/Soare/Poveste în echipa curentă.
Nu se afirmă că au fost auditate alte conturi/echipe sau toate serviciile existente.

## Store Settings în Development: obiecte și dependențe reale

Identitatea originală a fost verificată înaintea SELECT-urilor metadata.
29 versiuni exacte: cele 27 originale + `20260915120000` + `20261110120000`.
`20260918150000_explicit_runtime_table_grants` NU este aplicată aici.

- Tabel `public.store_settings`, owner postgres, RLS activ, 15 coloane:
  singleton, 11 texte publice, updated_by, updated_at. Un rând; 0 rânduri cu
  oricare dintre cele 11 valori publice nenule. Nu s-au citit valorile sau clienții.
- 14 constrângeri: PK, singleton check, 11 validări de câmp, FK updated_by
  către auth.users; indexul PK și tipul de rând sunt interne tabelului.
- O politică: `store_settings_admin_read`, SELECT authenticated cu is_admin().
  ACL tabel: postgres toate drepturile, authenticated SELECT; fără acces anon.
- Funcții: `valid_store_setting(text,text)` (invoker, postgres only),
  `get_public_store_settings()` (SECURITY DEFINER, postgres/anon/authenticated),
  `save_store_settings(text,text,text,text,text,text,text,text,text,text,text)`
  (SECURITY DEFINER, postgres/authenticated). Toate deținute de postgres.
- pg_depend arată doar componente proprii tabelului/validărilor; nicio FK
  din alte tabele. Căutarea prosrc public identifică numai get/save ca referințe.
  Nicio dependență externă catalogată asupra celor trei funcții.
- Codul handmade nu apelează aceste funcții. Codul 10B din develop/Preview-uri
  conține consumatori Store Settings. Catalogul DB nu poate dovedi absența
  clienților HTTP, SQL dinamic sau aplicațiilor externe; acestea trebuie retrase
  ori verificate înainte de orice DROP. Nu declarăm consumatorii remote absenți.

Metadata tehnică integrală este în artefactul ignorat
`test-results/handmade-9-4-store-settings-metadata.json`; acesta NU este backup
cu datele necesare restaurării. Nu există backup restaurabil verificat în 9.4.

## Procedura propusă: revenire reală la 28/28

**NEAPLICATĂ. Ștergerea remote rămâne BLOCKED până la protecțiile și aprobările
de mai jos.** Acceptarea riscului pentru revocarea ACL 9.2 nu acoperă acest DROP.

1. Review și aprobare distinctă pentru retragerea consumatorilor 10B, exportul
   și restaurarea backupului, apoi DDL și modificarea precisă a istoricului.
   Reconfirmați ținta exactă Development, 29 versiuni, schema/ACL/definiții și
   rândul Store Settings. Opriți la orice drift. Fără Production/Demo.
2. Retrageți mai întâi Preview-urile 10B care pot utiliza extensia. Păstrați
   Preview 9.3, Auth redirects, endpointul Stripe și variabilele handmade.
   Nu ștergeți proiectul Vercel și nu ștergeți codul istoric necesar testelor.
3. Backup recuperabil al întregului set care va fi eliminat, în afara Git:
   DDL tabel/constraints/index/FK, rândul complet (inclusiv updated_by/updated_at),
   cele 3 funcții, proprietari/ACL/RLS/policy, TOATE cele 29 rânduri de istoric
   (inclusiv statements) și snapshot comparabil al obiectelor handmade/ACL 9.2.
   Produceți fișiere de restore și hashes; nu salvați parole. Un dump complet
   public/auth/supabase_migrations și rolurile este protecție suplimentară dacă
   există o unealtă/conexiune disponibilă și proprietarul aprobă exportul privat.
   Storage binar și setările Auth/SMTP/cloud se tratează separat dacă se pretinde
   recuperarea întregului proiect; nu sunt atinse de acest DROP punctual.
4. Restaurați efectiv backupul punctual pe bază locală izolată cu baza Faza 9+9.2:
   verificați egalitatea rândului/istoricului, funcțiilor/ACL și RLS. PGlite deja
   instalat poate verifica SQL pe substituenți locali Auth; nu reprezintă un
   restore complet de platformă Supabase. pg_dump/pg_restore/psql/postgres/initdb
   nu sunt disponibile în PATH și nu a fost găsit PostgreSQL în locația standard.
   Nu instalăm, nu folosim Docker și nu creăm servicii/costuri. Dacă snapshotul
   complet și restore-ul punctual nu pot fi realizate/verificate cu instrumentele
   existente, operațiunea rămâne BLOCKED; nu transformăm metadata în backup.
5. După backup și quiescence aprobate, pregătiți batch tranzacțional complet:
   BEGIN, lock_timeout 5s, statement_timeout 30s, lock tabel; gărzi pe 29 versiuni,
   nume/statement hashes, toate definițiile/ACL/dependențele și datele exportate.
   Salvați amprenta celor 28 rânduri care trebuie păstrate. Orice diferență oprește.
   Nucleul de anulare de mai jos trebuie inclus în acel batch, fără CASCADE.

```sql
-- NUCLEU DE PLAN, NU BATCH REMOTE AUTORIZAT SAU AUTOSUFICIENT.
DROP POLICY store_settings_admin_read ON public.store_settings;
DROP FUNCTION public.save_store_settings(text,text,text,text,text,text,text,text,text,text,text) RESTRICT;
DROP FUNCTION public.get_public_store_settings() RESTRICT;
DROP TABLE public.store_settings RESTRICT;
DROP FUNCTION public.valid_store_setting(text,text) RESTRICT;
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260915120000' AND name = 'public_store_settings';
```

6. Ștergerea rândului de istoric nu este o migrare forward obișnuită: este o
   **retragere controlată a unei migrări**, permisă numai după inversarea reală,
   în aceeași tranzacție. Impuneți exact un rând DELETE și exact 28 la final,
   identitate completă a celorlalte 28 (nu doar numărul), absența celor 4 obiecte,
   egalitatea tuturor obiectelor/datelor/privilegiilor handmade; abia apoi COMMIT.
   Păstrați rândul original și jurnalul/hashes de retragere în backup și raport
   versionat. Nu falsificăm statements și nu marcăm ca aplicată o migrare absentă.
   Nu folosim reset, db push sau migration repair. Modificarea istoricului necesită
   explicit acea aprobare, nu este implicit autorizată de planul curent.
7. Important: o migrare forward nouă ar produce 30 remote și 29 local, nu 28/28.
   Dacă nu este aprobată retragerea auditată a rândului, păstrăm istoricul corect;
   nu promitem 28/28 numai prin DROP. Nucleul nu se adaugă în migrations și nu se
   execută pe instalări curate, unde extensia nu a existat niciodată.
8. Pre-COMMIT orice eroare => ROLLBACK. Post-COMMIT dacă verificarea eșuează,
   opriți write-urile și aplicați exclusiv restore-ul punctual verificat, refăcând
   schema+rândul+ACL+istoricul original atomic. Nu reintroduceți alte migrări 10B.
9. După retragere verificați read-only catalogul, toate cele 28 versiuni și grants
   secvenței; apoi regresie țintită autorizată pe fixture-uri dedicate. Numai atunci
   simplificați contractul opțional Store Settings la absență strictă și ajustați
   fixture-urile SQL de compatibilitate. Până atunci 9.1 rămâne nemodificat.

Surse tehnice: [backup Supabase](https://supabase.com/docs/guides/platform/backups),
[backup/restore Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore),
[pg_dump PostgreSQL](https://www.postgresql.org/docs/current/app-pgdump.html).
pg_dump singur nu exportă rolurile globale; Storage objects nu sunt cuprinse
în backupul SQL. Nu exportăm date private ca parte a acestui audit.

## Baza oficială recomandată, fără reintroducerea 10B

**Decizia actualizată a proprietarului:** baza oficială va fi `develop`.
Se pregătește ulterior un PR explicit de înlocuire a arborelui, pe branch nou
creat din develop, cu conținutul handmade validat. Nu se face merge al branch-ului
handmade în develop și nu se rescrie istoricul. Codul/documentația/configurațiile
10B vor fi șterse din arborele activ, nu doar dezactivate.

Procedura exactă, lista fișierelor și ordinea ștergerilor sunt în
[planul de înlocuire develop](handmade-9-4-develop-replacement.md).
Nu creăm arhive, taguri, branch-uri de backup sau copii ale productizării.
Istoricul deja existent rămâne inevitabil în Git dacă nu rescriem istoricul.
Arhiva permanentă Faza 9 rămâne neatinsă. Backupul punctual cerut înaintea DROP
protejează baza Development originală; nu este o arhivă nouă a productizării.

Niciun PR, merge, push sau branch nou de pregătire develop nu a fost creat acum.

## Verificări și limite

| Verificare executată | Rezultat |
|---|---|
| ESLint întregul repository | PASS |
| TypeScript tsc --noEmit | PASS |
| Next.js build | PASS, 37 pagini generate; fără deployment |
| Auth/email/SQL contracte/hardening/regresie funcțională locale | 113/113 PASS, zero skipped |
| Nucleul de retragere din document, exclusiv în PGlite sintetic | PASS: rollback reface 29; aplicare locală lasă 28 rânduri de istoric identice, extensia absentă |
| Suitele SQL originale pe schema sintetică după retragere | 13/13 PASS fără modificarea testelor |
| git diff --check | PASS |

Prima pornire Node și primul build în sandbox au eșuat cu spawn EPERM;
rerulările autorizate au trecut, fără slăbirea testelor sau instalări.
Simularea SQL de retragere este în artefactul ignorat
`test-results/handmade-9-4-local-removal.mjs`, fără SDK Supabase/credențiale/rețea.
Aceasta demonstrează ordinea/sintaxa și compatibilitatea pe fixture, nu recuperarea
unui backup real sau lipsa tuturor consumatorilor remote. Nu substituie gărzile
și backupul cerute procedurii viitoare. Nicio suită E2E/SQL remote cu write.
Codul aplicației, migrările și testele 9.1–9.3 nu au fost modificate.

**Răspuns:** da, putem avea o singură bază handmade curată și păstra toate
funcționalitățile validate. Codul este deja separat de 10B. Eliminarea completă
din DB/cloud rămâne o operațiune ulterioară aprobată, condiționată de backup,
retragerea consumatorilor și clarificarea accesului Demo; nu este finalizată aici.

# Handmade 9.2 — hardening pentru secvența comenzilor

## Verdict și limite

**2026-11-11: PASS — TASK 9.2 finalizat pe Development.** Unica reîncercare
autorizată a fost aplicată cu COMMIT pe proiectul `bdyocajhhylvasfhmnal`.
Nu s-au executat alte variante sau reîncercări automate.

Corecția este persistentă și versionată în commitul
`7703264e283609c8c73f94a033aa64dfcc48600d`: modulul
`scripts/order-sequence-guards.mjs`, integrat în generator prin `--snapshot`,
folosește `((v->'sequence') - array['acl','acl_entries']::text[])`. Testele locale
execută întregul batch cu gărzile reale până la COMMIT, fără substituții ale
interogărilor de metadata; verifică și rollback la drift/eșec postflight.

### Rezultatul reîncercării aprobate

- Repository-ul era curat la commitul corecției. Identitatea proiectului,
  cele 28 migrări remote, proprietarii, ACL-ul, rolurile și configurația secvenței
  au fost reconfirmate; nu existau diferențe neexplicate față de audit.
- Snapshotul nou, rollbackul ACL-only verificat și batch-ul generat exact din
  sursa persistentă sunt salvate în afara Git:
  `C:\Users\Andrei\.codex\backups\handmade-9-2\2026-11-11-retry-2733ddd0`.
  SHA256 batch executat:
  `a4bd3f196ba7f6d5a5fc133a34c0026c441ed1c2bb59c8f4e6acc28417339e77`.
- Au fost revocate USAGE/SELECT/UPDATE pentru PUBLIC, anon și authenticated
  exclusiv pe `public.order_public_number_seq`. PUBLIC nu avea grant inițial;
  drepturile efective ale anon/authenticated sunt acum toate false.
- ACL-ul final păstrează exact `postgres=rwU/postgres` și
  `service_role=rwU/postgres`. Proprietarul și drepturile generatorului sunt intacte.
- Definiția și starea secvenței sunt neschimbate: last_value=1397,
  is_called=true, log_cnt=3. Funcțiile COD/card, DEFAULT-ul, triggerele și
  apartenențele rolurilor sunt neschimbate. Nu au fost apelate nextval/setval
  sau create comenzi pe remote.
- Istoric remote **28 → 29**. Cele 28 înregistrări anterioare sunt intacte,
  inclusiv amprentele statements; noua versiune `20261110120000` are numele
  `harden_order_public_number_sequence` și SQL identic fișierului versionat.
- Gărzile și testul metadata al secvenței au trecut înainte de COMMIT.
  Verificarea independentă read-only după COMMIT a confirmat absența oricărei
  modificări neașteptate; testul `order_public_number_sequence_privileges.sql`
  a trecut și separat remote. Rollbackul nu a fost necesar.
- Validări locale: PostgreSQL **80/80 PASS**, email **8/8 PASS**, ESLint PASS,
  TypeScript PASS, `git diff --check` PASS.

Starea actuală este **28 migrări locale / 29 remote**. Migrarea Store Settings
rămâne exclusiv în istoricul remote; diferența este documentată și nu a fost
ascunsă prin repair/reset/db push. Batch-ul este destinat stării anterioare de
28 migrări și refuză intenționat reaplicarea pe istoricul actual.

PASS se referă strict la remedierea secvenței. Nu există backup complet restaurat;
proprietarul a acceptat explicit intervenția limitată cu protecție ACL punctuală.
Nu au fost atinse Demo, Production, arhiva, alte permisiuni sau datele comenzilor.
Regresia funcțională remote și Stripe Sandbox rămân o etapă separată, cu date
dedicate și autorizarea operațiunilor de write.

### Istoric — prima încercare anulată

**2026-11-11: prima încercare a fost anulată integral.** Proprietarul
a autorizat explicit intervenția punctuală fără backup complet restaurat, cu
snapshot tehnic și rollback ACL verificate. Această aprobare înlocuiește condiția
de backup complet din procedura inițială de mai jos numai pentru intervenția 9.2.
Nu există un backup complet restaurat și nu declarăm că ar exista.

Precondițiile remote și locale au trecut. Aplicarea a fost încercată o singură
dată pe Development `bdyocajhhylvasfhmnal`, pornind din commitul
`923cc12eebb9b7f93df64f82d0853fa4e87bb13e`. O eroare în garda suplimentară de
verificare dinainte de COMMIT a provocat anularea întregii tranzacții, inclusiv
revocările și INSERT-ul în istoricul migrărilor. Starea finală verificată read-only
era identică snapshotului: 28 migrări remote și ACL-ul inițial. TASK 9.2 rămăsese
deschis la acel moment; reîncercarea reușită de mai sus înlocuiește acel verdict.

### Rezultatul încercării autorizate

- Git era curat, pe branch-ul task-ului și HEAD-ul cerut. Proiectul a fost
  identificat din nou prin API; sesiunea de aplicare era postgres.
- Cele 28 versiuni/nume remote, ACL-ul, proprietarii, rolurile, DEFAULT-ul,
  triggerele și definițiile relevante corespundeau auditului. Amprentele funcțiilor
  au fost comparate cu aceeași normalizare CRLF/LF ca în auditul inițial.
- Snapshotul, batch-ul efectiv, rollbackul ACL-only și checksum-urile sunt salvate
  în afara repository-ului, în directorul local
  `C:\Users\Andrei\.codex\backups\handmade-9-2\2026-11-11-final-073dbc6c`.
  Conțin metadata tehnică, nu copii ale clienților/comenzilor sau credențiale.
- SQL-ul exact de recuperare a fost verificat pe fixture local: restaurează
  privilegiile anterioare și respinge un ACL neașteptat, fără apeluri de secvență.
- Batch-ul tranzacțional pregătit a fost însoțit de gărzi suplimentare pentru
  snapshot înainte de REVOKE și pentru verificări înainte de COMMIT. Testul
  metadata al secvenței a fost inclus în tranzacție, nu suita SQL cu write.
- Garda suplimentară postflight conținea expresia
  `(v->'sequence' - array['acl','acl_entries']::text[])`. Precedența operatorilor
  a produs eroarea PostgreSQL 22P02. Forma corectă este
  `((v->'sequence') - array['acl','acl_entries']::text[])`.
- API-ul a respins tranzacția. Verificarea read-only imediată a confirmat că
  nu a rămas nicio schimbare: 28 migrări, ACL inițial, generator/DEFAULT/triggere
  nemodificate, last_value=1397, is_called=true, log_cnt=3.
- Nu a fost necesară executarea rollbackului ACL-only după COMMIT, deoarece
  COMMIT nu a reușit. Nu s-au făcut repair, reset sau ștergeri de istoric.
- Conform instrucțiunii de oprire la eșec, aplicarea remote nu a fost repetată.
  Garda corectată a trecut verificarea locală și respinge schimbarea stării
  secvenței. Artefactul `apply-reviewed-corrected.sql` este pregătit numai local;
  SHA256: `e94f44f0f0ca371343cfc2bddbe56a8f49f34d52a67a66bb74c7c360813f9731`.

Rezultate locale la încercarea finală: PostgreSQL 77/77 PASS, email 8/8 PASS,
ESLint PASS, TypeScript PASS; rollbackul punctual și corecția gărzii PASS pe
fixture-uri locale. Nu au fost apelate nextval/setval sau RPC-uri de comandă
pe remote. Nu au fost modificate datele comenzilor, Demo sau Production.

După prima încercare starea rămăsese 28 local / 28 remote, cu seturi diferite,
fără înregistrarea `20261110120000`. Review-ul și aprobarea ulterioare au permis
exclusiv unica reîncercare documentată mai sus. Regresia funcțională remote
nu a fost începută.

Bază: `task/handmade-9-1-security-tests`, commit
`b47a3f5672597f8a04eb810f5a3cf0fee82e4d0a`.
Țintă permisă: exclusiv Development `bdyocajhhylvasfhmnal`.

## Dependențe și drepturi confirmate read-only

- Secvența `public.order_public_number_seq` și generatorul
  `public.next_order_public_number()` sunt deținute de `postgres`.
- Generatorul SQL este VOLATILE, SECURITY DEFINER, search_path gol; folosește
  `nextval` și formatul existent `CMD-YYYY-########`. Nu îl modificăm.
- DEFAULT-ul `orders.public_number` apelează generatorul. Referința text din
  corpul SQL nu apare obligatoriu ca dependență în pg_depend; au fost inspectate
  și definițiile, valorile implicite și triggerele, nu doar acel catalog.
- COD: `place_cod_order(uuid,jsonb,jsonb)` este SECURITY DEFINER/postgres și
  permite apelul anon/authenticated. Inserarea omite public_number, activând DEFAULT.
- Card: `prepare_card_order_server(...)` apelează `prepare_card_order(...)`,
  care inserează prin același DEFAULT. Calea card este server-only/service_role.
  Evenimentele Stripe procesează comanda deja creată; nu necesită accesul browserului
  la secvență. Nu sunt necesare apeluri către Stripe pentru această remediere.
- Cele două triggere de pe orders actualizează updated_at și creează evidența COD;
  nu consumă direct secvența. Nu s-au identificat alte funcții consumatoare directe.

ACL-ul auditat al secvenței acordă USAGE/SELECT/UPDATE direct pentru postgres,
anon, authenticated și service_role; nu există grant PUBLIC. Browser roles nu
sunt superuser/BYPASSRLS și nu au roluri părinte în metadata auditată. Relațiile
în care postgres/authenticator sunt membri ai anon nu dau anon drepturile lor:
moștenirea are sensul invers. Drepturile efective au fost verificate separat.

Necesare: proprietarul generatorului trebuie să poată executa nextval; dreptul
de proprietate al postgres asigură acest lucru. anon/authenticated au nevoie de
EXECUTE pe RPC-ul COD, nu pe generator și nici pe secvență. service_role are
nevoie de EXECUTE pe intrările server; generatorul definer nu necesită grant
direct pe secvență pentru apelant. Totuși, păstrăm nemodificate toate drepturile
existente ale service_role și ale celorlalte roluri privilegiate, conform scopului.

## Migrarea nouă

`supabase/migrations/20261110120000_harden_order_public_number_sequence.sql`
conține o singură instrucțiune DO atomică. Schimbarea efectivă este:

```sql
REVOKE USAGE, SELECT, UPDATE ON SEQUENCE public.order_public_number_seq
  FROM PUBLIC, anon, authenticated RESTRICT;
```

Gărzile verifică proprietarii, SECURITY DEFINER/search_path și intrarea service_role.
ACL-urile celorlalte roluri sunt comparate înainte/după. Dacă drepturi efective
rămân prin moștenire, instrucțiunea ridică excepție și anulează revocarea; nu
revocă automat granturile unor roluri terțe. RESTRICT împiedică revocări în cascadă.
Nu se apelează nextval/setval, nu se schimbă proprietari, algoritmul, DEFAULT-ul,
triggerele, default privileges, rolurile sau alte obiecte.

## Istoric: fără aliniere artificială

Înainte de task: 27 migrări locale, 28 remote (extra public_store_settings).
După adăugarea fișierului 9.2, înainte de aplicare: **28 locale / 28 remote, seturi
diferite** — migrarea nouă există doar local, Store Settings doar remote.
După aplicarea aprobată: **28 locale / 29 remote**, cu aceeași diferență 10B păstrată.
Numărul singur nu dovedește alinierea.

Nu copiem migrarea 10B în aplicația handmade, nu o ștergem din istoric și nu
marcăm versiuni artificial ca applied/reverted. Nu folosim db push, reset,
migration repair sau migration up pentru această aplicare punctuală.

Generatorul offline `scripts/prepare-order-sequence-hardening.mjs` produce un
batch SQL pentru starea Development auditată. Nu execută SQL, nu citește secrete,
nu folosește rețeaua și nu se conectează la vreun proiect:

```powershell
node scripts/prepare-order-sequence-hardening.mjs
```

Batch-ul cuprinde BEGIN, timeouturi, blocare a tabelului de istoric împotriva
modificărilor concurente, comparația exactă a celor 28 versiuni/nume auditate,
instrucțiunea din fișierul migrării, apoi INSERT-ul versiunii noi cu numele și
textul SQL exact în `supabase_migrations.schema_migrations`, urmate de COMMIT.
Schema acelui tabel (version text PK, name text, statements text[]) a fost verificată
read-only; proprietarul este postgres, cu USAGE pe schemă și SELECT/INSERT/UPDATE
confirmate pentru sesiunea privilegiată propusă. Aceasta este o înregistrare punctuală, explicită, a unei migrări efectiv
aplicate, în aceeași tranzacție; nu este un repair al versiunilor existente.
Nu este un mecanism general de deploy și nu trebuie adaptat ad-hoc la alt istoric.

## Procedura de aplicare — NUMAI după aprobări

1. Confirmați ref-ul prin Management API/dashboard și conexiunea SQL țintă, fără
   a expune credențiale. Numele bazei postgres sau eticheta main nu identifică
   mediul. Batch-ul SQL nu poate verifica singur ref-ul Supabase; garda de istoric
   nu înlocuiește identificarea conexiunii. Nu utilizați Demo/Production.
2. Confirmați backup restaurabil: schema/datele/istoricul relevante, ACL-ul exact
   al secvenței, definiția generatorului, rolurile/moștenirea și starea secvenței.
   Validați recuperarea local, fără servicii/costuri noi. Nu este suficient un
   export neverificat sau doar faptul că se poate scrie un GRANT invers.
3. Reverificați definițiile COD/card/generator, DEFAULT-ul, triggerele, proprietarii,
   ACL și rolurile moștenite/PUBLIC. Comparați cu auditul. Verificați că cele 27
   migrări originale sunt nemodificate față de arhivă și că noua versiune nu există.
   Orice drift sau grant dependent neașteptat oprește aplicarea pentru review.
4. Stabiliți o fereastră scurtă fără deploy/migrări concurente. Generați batch-ul
   din commitul revizuit; salvați și revizuiți artefactul și checksum-ul său.
   Capturați separat situația dinaintea intervenției. Nu aplicați doar linia REVOKE.
5. În sesiunea privilegiată Development verificată, executați **întregul batch**,
   cu oprire la prima eroare (de exemplu un client psql existent, ON_ERROR_STOP=1).
   Nu este necesară instalarea unui serviciu nou. Dacă apare eroare, ROLLBACK și
   analiză; nu continuați manual de la INSERT sau COMMIT. Refuzul unei reaplicări
   este intenționat, chiar dacă instrucțiunea de hardening este idempotentă.
6. După COMMIT, confirmați read-only: 29 versiuni remote, toate cele 28 anterioare
   intacte, noua intrare cu textul exact, drepturi efective zero pentru browser,
   ACL privilegiat/definiții/DEFAULT/triggere neschimbate. Verificați starea secvenței
   fără apeluri nextval/setval; dacă există trafic, valorile pot avansa legitim.
7. Rulați verificarea metadata din 9.1 pe conexiunea confirmată. Testul complet
   security_data_integrity și regresia COD/card au write și necesită autorizare
   distinctă. Supravegheați erorile de creare a comenzilor; nu executați plăți reale.

Pentru migrarea viitoare se revizuiește din nou manifestul/versionarea. Acest
batch refuză orice istoric diferit; nu constituie permisiune pentru db push cu
diferența de istoric rămasă.

## Recuperare

Un eșec înainte de COMMIT anulează atât ACL-ul, cât și INSERT-ul în istoric.
Testele locale demonstrează inclusiv eșecul INSERT-ului după REVOKE și granturi
moștenite rămase. După COMMIT, dacă apare un incident, opriți deployurile și
analizați; orice restaurare punctuală a ACL-ului exact din snapshot sau migrare
compensatorie necesită aprobare. Nu ștergeți înregistrarea migrării și nu resetați
secvența. Nu recomandăm restaurarea integrală peste comenzi noi pentru o problemă
de ACL. Nu există rollback remote executat sau preautorizat în acest task.

## Validare locală

PGlite 0.3.14, instalat temporar în afara repository-ului conform documentului
9.1, rulează în memorie fără conexiune Supabase. Testul nou reconstruiește toate
cele 27 migrări originale nemodificate, cu substituenți locali Auth/Storage și
default grants similare platformei. Rulează atât fără extensie, cât și cu migrarea
Store Settings citită din commitul istoric fix.

```powershell
$taskSqlTools = Join-Path $env:TEMP 'handmade-9-1-sql-tools'
$env:HANDMADE_PGLITE_MODULE = ([System.Uri](Join-Path $taskSqlTools 'node_modules/@electric-sql/pglite/dist/index.js')).AbsoluteUri
node --test tests/unit/security-sql-contracts.test.mjs tests/unit/order-sequence-hardening.test.mjs
npm run test:email
npm run lint
npm run typecheck
git diff --check
```

Dovezi: nextval/currval/setval și citirea directă sunt respinse pentru browser;
RPC-urile reale COD cu anon/authenticated și card cu service_role produc numere;
generatorul păstrează formatul și funcționează chiar fără grant direct pe secvență
pentru service_role în fixture; ACL-urile nețintite, definițiile, RLS și starea
secvenței rămân intacte la aplicare. Suitele SQL originale place_cod_order și
stripe_checkout_webhook, plus security_data_integrity, rulează local neschimbate.

Fixture-urile nu simulează serviciul Auth, PostgREST, livrarea reală sau rețeaua
Stripe; nu înlocuiesc regresia Development autorizată și nu constituie test Live.

Rezultate TASK 9.2: 77/77 teste PostgreSQL locale PASS (34 contracte 9.1 și
43 verificări 9.2), 8/8 teste email PASS, ESLint PASS, TypeScript PASS,
`git diff --check` PASS. Generatorul CLI a fost verificat local și produce batch-ul
fără execuție. Nu s-au executat modificări sau teste cu write pe Development,
Demo ori Production. Migrările originale și testele 9.1 sunt nemodificate.

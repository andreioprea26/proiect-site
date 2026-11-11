# Handmade 9.1 — contracte de securitate și diferența de migrări

> Raport istoric: configurația și numerele de migrări de mai jos descriu momentul testării.
> Starea curentă este [handmade Development](handmade-final-development.md), 28/28 migrări.
> Extensia Store Settings și vechile Preview-uri au fost retrase; nu reaplicați procedurile istorice.


## Domeniu și verdict

Bază Git: `task/handmade-relaunch-phase9`, commit
`6d84c236d4a91f460549be4cf175fd68e0ca1615`.
Development autorizat: `bdyocajhhylvasfhmnal`.

Acest task modifică exclusiv teste și documentație. Nu modifică schema,
granturile, datele, istoricul migrărilor sau funcționalitățile aplicației.
Nu reprezintă un PASS de securitate complet: granturile excesive pe secvența
numerelor de comandă, confirmate în auditul anterior, rămân neremediate.

## Schema originală și extensia izolată

Există 27 de fișiere originale în `supabase/migrations`, nemodificate.
Istoricul Development auditat conține 28 de versiuni: cele 27 originale plus
`20260915120000_public_store_settings`. Migrarea ulterioară
`20260918150000_explicit_runtime_table_grants` nu este aplicată aici.
Sursa migrării suplimentare rămâne în istoricul Git 10B; nu este copiată în
branch-ul handmade și nu se recuperează automat funcționalități 10B.

`security_data_integrity.sql` acceptă absența RPC-ului suplimentar în schema
originală. Dacă există un obiect cu numele `get_public_store_settings`, se
acceptă exclusiv o singură funcție fără argumente, cu implementarea auditată:

- SQL, STABLE, SECURITY DEFINER, proprietar `postgres`, search_path gol;
- exact cele 11 coloane publice și tipurile lor, fără metadatele editorului;
- corp SQL comparat integral, normalizând doar CRLF și spațiul exterior;
- ACL exact pentru proprietar, `anon` și `authenticated`, fără grant option,
  fără PUBLIC sau alte roluri; verificarea suplimentară a drepturilor efective;
- tabel sursă protejat de RLS, fără acces anonim nici prin granturi pe coloane;
- authenticated are doar SELECT prin politica administrativă auditată;
- RPC-ul de salvare nu poate fi executat de anon.

Allowlist-ul inițial rămâne neschimbat; singura excepție este OID-ul exact al
RPC-ului după validarea contractului. Overload-urile și alte funcții anonime
SECURITY DEFINER neașteptate continuă să fie respinse. Contractul verifică
proiecția publică și limitele accesului, nu certifică întreaga extensie 10B.

## Secvența numerelor de comandă: problemă confirmată, remediere neexecutată

`20260823120000_create_checkout_order_schema.sql` creează secvența și
`next_order_public_number()`. Generatorul este SECURITY DEFINER, deținut de
proprietarul secvenței, și apelează `nextval` cu drepturile acestuia. Coloana
`orders.public_number` îl folosește ca DEFAULT. Fluxurile de creare COD și
card din `place_cod_order` și `prepare_card_order` inserează
comanda prin funcții SECURITY DEFINER. Migrarea finală de securitate revocă
execuția directă a generatorului pentru browser și o păstrează pentru service_role.

Prin urmare, anon/authenticated nu au nevoie de USAGE, SELECT sau UPDATE direct
pe secvență. Auditul a confirmat toate aceste drepturi pentru ambele roluri.
USAGE/UPDATE permit nextval, UPDATE permite setval, SELECT permite citirea
stării secvenței. RLS pe tabele nu protejează o secvență. Nu s-a demonstrat un
endpoint PostgREST exploatabil și nu s-a apelat nextval/setval în audit.
Totuși, revocarea EXECUTE a generatorului nu închide accesul SQL direct la secvență.

Verificarea pregătită în `supabase/tests/order_public_number_sequence_privileges.sql`
este numai de metadata, într-o tranzacție READ ONLY. Nu consumă numere și nu
apelează generatorul. Verifică rolurile efective, PUBLIC, proprietarul comun,
search_path și accesul service_role prin generator. Pe Development auditat
**trebuie să eșueze** până la remediere. Este separată de suita originală pentru
a distinge compatibilitatea extensiei de problema granturilor preexistente.

Remediere propusă pentru o etapă separată, numai după review, backup recuperabil
și aprobarea unei migrări noi (nu modifica migrările originale):

```sql
REVOKE ALL PRIVILEGES ON SEQUENCE public.order_public_number_seq
  FROM PUBLIC, anon, authenticated;
```

Acest SQL nu a fost executat. Dacă rolurile moștenesc drepturi de la alte roluri,
REVOKE direct nu este suficient; verificarea drepturilor efective trebuie să
rămână FAIL până la eliminarea sursei. Nu este necesar un grant nou pe secvență
pentru browser sau pentru service_role pentru a executa generatorul definer.
Nu se modifică proprietarii și nu se apelează setval/restart.

După aprobarea remedierii: rulați testul metadata, verificați că numărul curent
nu a fost schimbat de remediere și revalidați separat COD/card, idempotency și
numerotarea prin fluxurile autorizate. Ultimele verificări scriu date și cer
autorizare distinctă; nu fac parte din acest task.

## Înainte de orice migrare viitoare

1. Confirmați identitatea proiectului prin ref și configurație; eticheta
   Supabase `main — PRODUCTION` nu identifică branch-ul Git sau mediul aplicației.
2. Recitiți istoricul real și comparați versiunile/numele, nu doar numărul.
   Verificați că singura diferență cunoscută rămâne migrarea public_store_settings.
3. Verificați schema, definițiile, RLS și granturile obiectelor afectate.
   Orice altă diferență oprește aplicarea.
4. Stabiliți explicit, printr-un task aprobat, cum este reprezentată extensia
   păstrată în fluxul viitor de migrări. Nu presupuneți că db push acceptă
   automat diferența 27/28 și nu marcați migrarea reverted cât timp obiectele există.
5. Asigurați un backup restaurabil și o recuperare verificată. Auditul anterior
   a găsit zero backupuri disponibile prin API și PITR dezactivat.
6. Numai după rezolvarea/documentarea aprobată a diferenței, inspectați un dry-run
   și confirmați că include exclusiv schimbarea nouă aprobată, fără reaplicări 10B.

Nu rulați db push, reset, repair sau migrarea de granturi 10B pentru a elimina
artificial diferența de istoric. Task-ul 9.1 nu schimbă istoricul și nu este o
autorizație de aplicare a vreunei migrări.

## Validare și limite

Verificările locale includ ESLint, TypeScript, testele unitare existente pentru
email, contractul SQL opțional și testul secvenței pe fixture-uri PostgreSQL
locale izolate, plus `git diff --check`. Motorul temporar PGlite nu se conectează
la Supabase și nu este adăugat ca dependență a aplicației.

Fixture-urile sintetice verifică absența extensiei, implementarea exactă,
respingerea modificărilor de semnătură/corp/granturi/RLS și detectarea drepturilor
excesive pe secvență. Nu înlocuiesc execuția suitei pe schema Supabase completă.
Testul original conține INSERT și apeluri de funcții; nu se rulează remote în
acest task, chiar dacă se încheie cu ROLLBACK. Următoarea etapă necesită review
ChatGPT și autorizarea regresiei funcționale cu write pe Development.

### Reproducerea verificării SQL locale

Nu este necesar un server PostgreSQL, Docker, un proiect cloud sau fișierul
`.env.local`. Instalați unealta opțională exclusiv într-un director temporar:

```powershell
$taskSqlTools = Join-Path $env:TEMP 'handmade-9-1-sql-tools'
npm install --prefix $taskSqlTools --no-package-lock --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.3.14
$env:HANDMADE_PGLITE_MODULE = ([System.Uri](Join-Path $taskSqlTools 'node_modules/@electric-sql/pglite/dist/index.js')).AbsoluteUri
node --test tests/unit/security-sql-contracts.test.mjs
```

Fixture-ul citește migrarea suplimentară din commitul Git fix
`0081812ce76f16811cd97b983cd772f139cc10f1`, fără să o copieze în migrările locale.
Într-un checkout superficial, acel obiect Git trebuie să fie disponibil pentru
reproducere. Testul creează obiecte numai în baza sa sintetică din memorie.

Rezultate locale TASK 9.1: ESLint PASS, TypeScript PASS, email 8/8 PASS,
fixture SQL 34/34 PASS, `git diff --check` PASS. Blocurile SQL adăugate au fost
compilate și executate local; suita Supabase completă nu a fost executată.
Aceste rezultate nu schimbă verdictul privind granturile remote neremediate.

# Autorizare standalone Test/Preview — 10B.2d

Flux: repo nou → autorizare standalone Test/Preview → preflight → migrations →
bootstrap → Vercel Preview → teste finale. Demo seed este opțional; dacă îl alegi,
rulează-l între migrations și bootstrap, deoarece guard-ul existent refuză users.
Nu schimbăm acest guard pentru a cosmetiza ordinea din checklist.

## Înrolare explicită, fără write remote

1. Owner-ul verifică inventarul clientului: proiect nou independent, destinat exclusiv
   Test/Preview, niciodată Production. Completează toate ref-urile Production cunoscute
   în `productionRefs`. Dacă scopul nu poate fi confirmat, STOP, fără aprobare.
2. Copiază `config/client-install.example.json` în afara repo-ului; fără `previewBranch`.
   Completează identitatea, repo-ul, environment test/preview, seed și E2E.
   Injectează env din `preflight.md`, fără valori în argv, transcript sau Git.
3. În secret manager-ul operatorului generează o cheie aleatorie de 32 bytes
   reprezentată prin 64 caractere hex lowercase. Injectează ca
   `CLIENT_TARGET_APPROVAL_KEY`. Nu utiliza o cheie Supabase și nu o salva în repo.
   Aceasta este ancora de încredere a operatorului, nu un serviciu/abonament nou.
4. Setează `CLIENT_TARGET_APPROVAL` la o cale absolută NOUĂ în afara repo-ului,
   într-un director privat existent. Setează `CLIENT_INSTALL_CONFIG` și
   `CLIENT_CONFIRM_PROJECT_REF`. Rulează interactiv:

```text
npm run client:authorize
npm run preflight -- empty
npm run client:install -- all --apply
```

Înrolarea verifică repo curat, SHA-256 manifest, identitate remote, chei și DB goală.
Afișează numai identitatea nesensibilă; owner-ul tastează challenge-ul cu ref și org
confirmând explicit NON-PRODUCTION. Nu acceptă `--yes`, pipe sau CI auto-aprobat.
Reverifică remote după răspuns și creează exclusiv fișierul local cu `wx` (fără overwrite).
Acest fișier este HMAC-SHA256 semnat, legat de întreaga configurație și identitate,
cu expirare în 24h. Nu conține credențiale; totuși păstrează-l extern și privat.

Remote: `/v1/projects` confirmă ref/id, nume, organizație, created_at și healthy;
`api-keys` compară cheile în memorie; query/read-only inspectează istoric și stare.
Standalone nu apelează branches API. Nu presupune că numele Test dovedește scopul.
Management API nu dovedește că un proiect nu are utilizări comerciale: owner-ul
este autoritatea pentru această clasificare și trebuie să verifice inventarul.

## Enforcement și revocare

Preflight recitește aprobarea la fiecare gate și verifică semnătura, expirarea,
configurația și identitatea remote. Runner-ul păstrează pinning-ul inputului,
identității, manifestului și istoricului și gate nou imediat înainte de fiecare write.
Lipsă/alterare/expirare/drift = STOP. Ștergerea aprobării sau rotirea cheii revocă
permisiunea pentru gate-urile următoare. Nu se cachează un PASS offline.
Production declarat/inventariat, Development original și Demo sunt refuzate înainte
de verificarea aprobării; semnătura nu este override. Stripe Test și email redirect
rămân obligatorii. Seed cere `allowDemoSeed=true` în configurația semnată.

Pentru reaprobare după expirare, folosește o cale nouă; pentru schema deja migrată:
`npm run client:authorize -- migrated`. Cere din nou owner interactiv, identitate,
chei, manifest și istoric complet exact. Nu reexecută migrations și nu dovedește
retroactiv baza inițială goală. Istoric parțial = STOP și investigație separată.

## Limite

Un operator privilegiat cu cheia de semnare poate aproba intenționat greșit: acesta
este trust boundary-ul explicit, nu o certificare automată Production. Protejează
cheia prin secret manager/ACL; codul nu protejează de rescrierea lui de către owner.
API și write nu sunt o tranzacție atomică: fereastră exclusivă fără operatori concurenți.
Costurile de utilizare ale furnizorilor/quotele rămân aplicabile; nu adăugăm servicii,
dependențe sau abonamente obligatorii. Branching opțional poate avea costuri suplimentare.
Testele acestei schimbări simulează HTTP/write-urile. Nu s-a repetat clean install-ul
și nu s-au modificat demo/original/Production. Fiecare client cere validare finală reală.

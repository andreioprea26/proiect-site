# Predare, acceptanță și mentenanță — [CLIENT]

Owner `[OWNER]`, coordonator `[COORDINATOR]`, operator `[OPERATOR]`, data `[DATE]`.
Predarea Preview și lansarea sunt etape distincte. Predarea limitată pentru
evaluare trebuie etichetată astfel; nu substituie certificarea completă.

## Ce primește clientul

- Repository propriu, release identificat, cod/config/asset-uri client și acces
  de proprietar. Conturile GitHub/Vercel/Supabase/Stripe/Resend/domeniu aparțin
  clientului; colaboratorii sunt invitați individual, cu acces minim revocabil.
- URL Preview, acces individual admin, catalog/config acceptate și lista limitelor.
  URL Production se predă numai după procedura separată aprobată.
- [Indexul pachetului](../README.md), [ghidul administratorului](admin-guide.md),
  [onboarding](../../client-onboarding-checklist.md), această procedură și copia
  completată/sanitizată a [fișei clientului](../internal/client-record-template.md).
- Raport de acceptanță cu release, ținte, probe și probleme, plan backup/restore,
  monitorizare/incidente și [launch checklist](../internal/production-launch.md).
  Fără parole/tokenuri/linkuri Auth în raport; secretele numai prin canal sigur.

## Probe de acceptanță — demonstrație în Test

Operatorul înregistrează pentru fiecare probă PASS/BLOCKED, data, SHA/ținta și
dovada sanitizată. Clientul exersează operațiile cu date fictive:

| Probă | Criteriu de acceptare |
| --- | --- |
| Acces | Login/logout/reset cu link nou, email primit; admin individual, anon/customer fără acces admin |
| Catalog | Creare/editare/draft/publicare/arhivare, categorie/colecție, imagini și variante vizibile corect |
| Personalizări | Selecție/text, validări și cost corect, verificare administrativă |
| Stoc | Ajustare cu istoric, alertă prag, variantă corectă; unicat/concurență testate tehnic |
| COD | Checkout guest/customer, snapshot, stoc, statusuri și încasare distincte; anulare/restock unic |
| Stripe Sandbox | Eveniment semnat procesat, payment/order paid, rezervare consumed, delta unic/coș gol; duplicate/expiry |
| Refund Sandbox | Refund integral verificat financiar, fără restock automat |
| Expediere | Curier/AWB/tracking salvat, Pregătită → Expediată → Finalizată, notificare |
| Email | Auth și operațional primite separat; redirect QA, retry eșuat/dedupe fără duplicare |
| Engagement | Recenzie eligibilă/moderare; abonare voluntară; contact și cerere fără comandă/plată automată |
| Conținut | Draft ascuns/publicată vizibilă, linkuri legale accesibile, homepage și Store Settings verificate |
| Experiență | Mobil/desktop/keyboard, imagini, erori/empty states, domeniu Preview și metadata corecte |
| Securitate și recuperare | RLS/IDOR/roluri/Storage, scan secrete, backup/restore și monitorizare cu dovezi |
| Automatizare | SQL rollback, lint/type/build/unit și E2E complet, rezultate PASS/FAILED/SKIPPED/NOT RUN exacte |

Testele complete E2E pe un client nou sunt momentan blocate de tooling; vezi
[auditul](../internal/package-audit.md). Testarea manuală nu transformă această
poartă în PASS. Clientul poate accepta o predare **Preview pentru evaluare cu
limite**, însă certificarea completă/Production rămân BLOCKED.

## Training și închiderea accesurilor temporare

1. Verifică ownership și recuperarea conturilor fără a afișa secrete; clientul
   păstrează controlul billing/MFA și cel puțin un administrator permanent verificat.
2. Demonstrează probele; clientul repetă catalog/stoc/comandă/tracking/notificări
   și citește diferența COD/refund/retur. Notează ce necesită operator.
3. Owner-ul acceptă în fișă rezultatele și limitele, documentele și responsabilitățile;
   problemele obligatorii neînchise rămân BLOCKED, cu responsabil și pas următor.
4. Inventariază și revocă accesul temporar GitHub/Vercel/Supabase/Stripe/Resend/DNS,
   PAT-urile și invitațiile neutilizate, rolul admin tehnic QA și sesiunile conform
   planului aprobat. Verifică accesul permanent înainte de revocare.
5. Revocă aprobarea locală Test și cheia operatorului când nu mai sunt necesare;
   elimină numai copii locale autorizate. Rotește secretele expuse sau partajate
   cu acces temporar, actualizând platformele coordonat și verificând funcționarea.
6. Păstrează dovezile/auditul necesar în locul privat convenit; nu șterge automat
   comenzi, plăți sau istoric. Eliminarea fixtures/PII cere plan separat verificat.

## Responsabilități după predare/lansare

| Domeniu | Responsabil de completat | Ce trebuie convenit |
| --- | --- | --- |
| Catalog, stoc, prețuri, comenzi, COD și retururi | [BUSINESS_OWNER] | Verificare zilnică și reconciliere |
| Legal/fiscal/date personale | [CLIENT_SPECIALIST] | Texte/decizii, retenție și solicitări persoane |
| Conturi, billing, domeniu și recuperare | [ACCOUNT_OWNER] | Reînnoire și acces minim |
| Backup/restore | [BACKUP_OWNER] | Acoperire DB/Auth/Storage/config, frecvență/retentie și probă separată |
| Monitorizare/incident tehnic | [TECH_CONTACT] | Canale, program convenit, criterii de escaladare |
| Actualizări | [UPDATE_OWNER] | Review, Test, acceptanță și promovare aprobată |

Acest document nu stabilește prețuri, SLA-uri contractuale, durate garantate sau
obligații comerciale. Acestea se negociază și se aprobă separat. Completează
responsabilitățile înainte de închiderea predării, nu presupune mentenanță inclusă.

## Actualizări și cereri de modificare

Clientul descrie scopul, exemplul, prioritatea și rezultatul dorit, fără date
personale/secrete. Coordonatorul clarifică impactul și eventualele costuri pentru
aprobarea owner-ului. Operatorul creează branch separat în repo client; urmărește
mapping-ul master/client și customizările, fără actualizare automată a tuturor
clienților. Review → regresie Test → acceptanță → aprobarea promovării. Migrații
forward-only revizuite; backup și rollback compatibile înainte de Production.
Nu se promite o funcție planificată până când este implementată și validată.

## Incidente

Trimite la `[INCIDENT_CONTACT]` ora, pagina/acțiunea, impactul și un identificator
de comandă prin canal privat; fără parole, card, link de confirmare sau capturi PII.
Operatorul verifică release/ținta și păstrează dovezi. Oprește controlat fluxul
afectat numai prin procedura aprobată, reconciliază plăți/webhook și evită writes
repetate după rezultat incert. Email failed se investighează înainte de „Retrimite”.
Restore/rollback sunt tehnice și aprobate; Git rollback nu anulează plata.
Owner-ul gestionează comunicarea către clienți și implică specialistul la incidente
de date. După rezolvare, consemnează cauza demonstrată, validarea și prevenția.

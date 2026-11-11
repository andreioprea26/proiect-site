# Magazin handmade — starea Development și Preview

Verificat la 2026-11-11. Obiectiv unic: personalizarea și lansarea magazinului propriu.

## Baza oficială

`develop` la `029f03637217191fda46fc2a023c4e81b3fe4727` (PR #55) păstrează
Faza 9 și remedierile/regresia 9.1–9.3. Codul runtime nu a fost schimbat în această
curățare. Simplificarea testelor și documentației este pe branch-ul temporar
`codex/handmade-final-cleanup`, pentru review înainte de integrare.

Au fost șterse local și remote ultimele două branch-uri: `task/9c-final-launch-readiness`
și `task/handmade-9-3-functional-regression`. Rămân permanent `main`, `develop`,
`archive/phase-9-final` și tagul `phase-9-final`. Nicio rescriere de istoric și nicio
arhivă nouă a productizării. Commiturile comerciale din istoricul existent nu au fost rescrise.

## Preview unic

- Proiect Vercel: `proiect-site`; Production continuă să urmărească `main`.
- URL stabil: https://proiect-site-git-develop-andreioprea26x-gmailcoms-projects.vercel.app
- Deployment păstrat: `dpl_3B3eohUK9KPgVTwuThvjNfPNYPPh`, Preview Ready, sursa `029f036`.
- Cele 15 Preview-uri vechi aprobate au fost retrase din inventarul activ, prin
  mecanismul normal Vercel Delete. Cele trei deploymenturi Production sunt păstrate.
- Cele 8 variabile server-side au exclusiv scope Preview/develop; cele 2 variabile
  publice Supabase rămân generale pentru Preview. Cele 12 override-uri 9c/9.3 au fost șterse.
- Lista de variabile Vercel este virtualizată: absența unui rând din DOM-ul zonei
  vizibile nu dovedește ștergerea lui. Inventarul final a fost verificat prin
  filtrare după fiecare nume; toate cele opt variabile develop există, fără recreare.

`APP_URL` este URL-ul stabil. Supabase este exclusiv Development original.
Stripe folosește Sandbox. Resend folosește `EMAIL_DELIVERY_MODE=redirect`,
sender `onboarding@resend.dev` și destinatar `andreioprea26x@gmail.com`.
Cheile nu se salvează în Git, capturi sau documentație.

## Auth, Stripe și Resend

Auth Development păstrează Site URL `http://localhost:3000` și exact patru redirecturi:
localhost/develop, fiecare cu `/auth/confirm` și `/auth/reset-password`.
Cele patru redirecturi ale vechilor Preview-uri au fost eliminate. Configurația SMTP
și restul setărilor Auth nu au fost schimbate. Confirmarea emailului și resetarea
parolei sunt susținute de regresia 9.3, inclusiv confirmarea manuală a proprietarului;
în această etapă nu s-au creat alți utilizatori și nu s-au trimis emailuri.

Singurul endpoint Stripe Sandbox rămas este `we_1UaefsDxyx762at39kczjOoy`, enabled,
la URL-ul stabil + `/api/stripe/webhook`, pentru `checkout.session.completed`,
`checkout.session.expired`, `refund.created`, `refund.updated`, `refund.failed`.
Au fost șterse `we_1UAbf6Dxyx762at3Jt8e2OFX` (vechiul HTTP 410) și
`we_1UaPLNDxyx762at3ABGkAs2j`. Nu s-au efectuat plăți noi.
Cheia Test existentă a fost păstrată prin decizia explicită finală a proprietarului;
nu declarăm rotație sau revocare.

Nu a fost identificată o resursă Resend exclusiv comercială de eliminat.
Contul și cheia partajată necesare magazinului au fost păstrate.

## Testul real de transfer către develop

Autentificarea admin dedicat, vizualizarea unei comenzi fictive existente și
personalizarea produsului/coșul au trecut pe noul Preview. Coșul a fost golit și
adminul delogat după verificare.

Fixture autorizat `hm94final-ecd84f93a8c1`: comandă `CMD-2026-00001404`
(`fe5e321c-5cbd-40ab-977f-28f7955fa946`). S-a creat o singură sesiune Checkout
Sandbox pending, apoi a fost expirată prin API-ul providerului, fără plată/email.
Eveniment autentic `evt_1UaeziDxyx762at3NpwpSmNi`, HTTP 200 pe noul endpoint develop,
procesat înaintea vechiului Preview: comandă anulată, plată expired, rezervare expired,
stoc 2 neschimbat, zero mișcări și notificări. Produsul fictiv a fost arhivat,
transportul fictiv dezactivat; comanda și dovezile sunt păstrate pentru audit.
Nu s-au șters produse, utilizatori sau comenzi preexistente și nu s-a resetat secvența.

## Development: 28/28 migrări

Ținta confirmată: `bdyocajhhylvasfhmnal`, ACTIVE_HEALTHY.
După aprobarea A+B+C, s-au eliminat strict `public.store_settings`, politica proprie,
funcțiile `valid_store_setting(text,text)`, `get_public_store_settings()` și
`save_store_settings` cu 11 argumente text, împreună cu granturile/constrângerile proprii.
Rândul de istoric `20260915120000/public_store_settings` a fost retras în aceeași
tranzacție, după anularea reală a obiectelor. Nu s-a folosit CASCADE, reset, push sau repair.

Înainte: 29 remote / 28 locale. După: **28 remote / 28 locale**, versiunile și numele
coincid. Celelalte 28 rânduri de istoric, inclusiv statements, sunt identice cu
snapshotul anterior. Hash-ul precondițiilor a coincis înainte de execuție.
Gărzile au confirmat identitatea metadatelor handmade, a amprentelor datelor comerciale
verificate și a valorii secvenței înainte/după. Granturile anon/authenticated pe secvență
rămân eliminate. Auth, Storage și datele originale nu au fost vizate de operațiune.

Recuperarea punctuală a obiectelor/rândului/istoricului a fost verificată local,
inclusiv rollback la hash diferit și batch complet până la COMMIT. Artefactele sunt
locale, ignorate de Git, în `test-results/handmade-9-4-final-*`. Nu există un backup
complet Supabase restaurat și nu se pretinde acest lucru.

## Repository și verificări

- `security_data_integrity.sql` revine exact la conținutul din tagul `phase-9-final`;
  nu mai există excepția pentru RPC-ul retras. Testul suplimentar al secvenței rămâne.
- Fixture-urile nu mai citesc SQL comercial dintr-un commit Git și nu mai construiesc
  schema extinsă. Sunt păstrate regresiile COD/card, rolurile, granturile PUBLIC/moștenite,
  idempotency, driftul și rollbackul atomic al granturilor/istoricului.
- Generatorul offline 9.2 simulează strict aplicarea 27→28 pe schema originală.
  Nu este executat pe Development deja securizat; replay-ul este refuzat.
- Planurile intermediare depășite `handmade-9-4-clean-baseline.md`,
  `handmade-9-4-develop-replacement.md` și `handmade-9-4b-replacement-validation.md`
  au fost eliminate. Dovezile utile 9.1–9.3 sunt marcate ca istorice și păstrate.
- 73/73 teste locale PASS, incluzând toate cele 13 suite SQL în PostgreSQL izolat.
  Cazurile extensiei retrase și scenariul duplicat extins au fost eliminate, fără
  eliminarea verificărilor originale sau a scenariilor negative de securitate.
- ESLint, TypeScript, build Next.js și `git diff --check`: PASS.
- Verificările HTTP după curățarea DB: homepage, catalog, categorii, produs și coș 200;
  callbackurile fără token redirecționează sigur 307, webhook GET 405.
  Integrările reale de plată finalizată rămân dovezile 9.3; nu au fost repetate.

## Limitări și review

Supabase Demo `bfmihaxfleztajzyamio` răspunde în continuare HTTP 403 la metadata.
Nu putem confirma ownership/dependențe și nu a fost șters; nu se declară curățare
completă a tuturor resurselor comerciale. Proiectul separat `proiect-meditatii` nu a fost atins.

Verdict global **PARTIAL** din cauza Demo inaccesibil și a integrării locale încă
supuse review-ului. Magazinul poate continua exclusiv pe direcția handmade.
Modificările repository-ului necesită review înainte de push/PR/merge; niciun merge
și niciun deployment suplimentar pentru acest branch temporar nu au fost executate.
Production, main și arhiva Fazei 9 au rămas neschimbate.

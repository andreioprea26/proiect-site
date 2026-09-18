# 10B.2d — registru de probleme și prevenție pentru instalări client

Acest registru separă observațiile reale de certificarea demo-ului. Nu
înlocuiește checkpoint-ul și nu promite că un client nou nu poate avea alte erori.
Nu sunt incluse chei, parole, tokenuri de confirmare sau date reale de clienți.

| ID | Problemă / cauză | Impact și corecție | Verificare / condiție pentru client |
| --- | --- | --- | --- |
| INSTALL-01 | Migrațiile istorice presupuneau granturi automate existente. RLS nu acordă acces la tabel. | Instalarea goală refuza profil/adrese și anumite citiri server. Migrare explicită minimă `20260918150000`, fără blanket grants. | Demo 29 migrații; 14/14 scripturi SQL PASS. Client: instalare goală + probe autentificate obligatorii. Original Development nu a primit această migrare. |
| INSTALL-02 | Funcția Supabase preexistentă `rls_auto_enable` nu respectă convenția aplicației `search_path=''`. | Testul respingea automatizarea validă. Excepție strictă pentru amprentă, owner, limbaj, trigger și `pg_catalog`; nu excepție după nume. | Test SQL PASS. Drift al implementării furnizorului trebuie să blocheze instalarea pentru review. |
| INSTALL-03 | Testul negativ al event-trigger-ului arunca rezultatul SELECT. | Nu verifica întoarcerea efectivă a tipului event_trigger. S-a adăugat INTO. | Probe anon/authenticated PASS. Nu elimina assertions pentru a obține verde. |
| INSTALL-04 | Supabase Auth nou păstra localhost și allowlist goală. | Linkuri greșite. Site URL demo + două redirect-uri exacte. | Utilizatorul confirmă signup/email/confirm/login/reset/login PASS. Client: URL/domeniu exact și linkuri NOI obligatorii; SMTP Auth este separat de Resend aplicație. |
| INSTALL-05 | Transferul inițial al secretului webhook făcut de agent a capturat text în afara nodului exact. | Stripe paid, webhook `400 invalid_signature`, comandă pending. Secret recitit exact și înlocuit după aprobare, redeploy, același event retrimis. | Comanda `CMD-2026-00000101` paid, rezervare consumed, stoc 10→9, coș gol. Client: plata nu este PASS înainte de audit DB/webhook; comparație booleană la transfer, fără valori în logs. |
| INSTALL-06 | Snapshot-ul repo demo preceda corecțiile SQL/seed. | Codul/migrațiile livrate puteau să difere de schema verificată. Sincronizare prin commituri pe branch demo separat. | Egalitate arbori Git verificată înainte de ultimele modificări E2E; main/deployment rămâne snapshot până la merge/release aprobat. Client: manifest release și schemă, nu doar copiere folder. |
| INSTALL-07 | `.env.local` și două guards E2E indicau proiectul original. | Risc de testare/mutații pe baza greșită. Fișier demo separat + runner explicit + validare ref/chei + fără reutilizare server. | Conturi E2E dedicate create, login/roluri PASS. Guard-ul trebuie testat negativ; niciun fallback implicit la original în modul demo. |
| INSTALL-08 | Fixture-urile foloseau service_role pentru CRUD direct pe tabele. | Demo cu granturi minime nu permite setup/cleanup; nu este automat bug runtime. Transport operator SQL exclusiv în teste, cu allowlist, filtre și protecție pentru seed/comanda de audit; Auth/RPC/customer/anon rămân API reale. | Adaptare în curs; Chromium complet încă necertificat. Interzis să acordăm privilegii aplicației doar pentru fixture-uri sau să mascăm cu skip. |
| INSTALL-09 | Seed-ul/runner-ele sunt legate explicit de demo și de 29 migrații. | Nu reprezintă încă installer generic pentru clienți. Refuză alte ref-uri, seed parțial/nonempty și overwrite. | Dry-run/apply/idempotency demo PASS. Client: manifest parametrizat, preflight read-only, decizie seed opt-in; nu elimina protecția doar ca să refolosești scriptul. |
| INSTALL-10 | Resurse noi fără APP_URL, webhook și transport. | Checkout incomplet înainte de configurare. Configurate numai în demo; fără curier real. | Checkout 108,90 RON, două notificări sent și primite. APP_URL/webhook pot fi pending înainte de primul deploy, dar blochează certificarea finală. |
| INSTALL-11 | Sandbox-ul local refuza subprocese Node (`spawn EPERM`). | Unit/build nu puteau porni complet; rerulate cu permisiuni aprobate, fără schimbarea assertions. | 30/30 unitare și build PASS înaintea adaptării E2E; rerulare finală necesară după adaptare. Nu raporta refuzul infrastructurii ca defect de aplicație. |
| INSTALL-12 | Prima versiune a transportului fixture repeta întregul JSON pentru fiecare coloană. | Inserarea comenzilor eșua înainte de rezultat SQL util; probabil limită de lungime a procesului Windows. Payload compactat o singură dată per rând în CTE. | Store Settings + 8A 7/7 PASS după corecție; cauza de sistem este inferată, nu demonstrată prin SQLSTATE. |
| INSTALL-13 | Trace-urile Playwright pot păstra cereri și credențiale ale conturilor de test. | Trace off în demo; credențiale locale ignorate, fără exportul fișierelor `.env`. | Înainte de partajarea unui raport verifică artefactele, nu publica trace-uri vechi cu date sensibile. |
| INSTALL-14 | Serverul Next.js afișează repetat `The destination stream closed early` la navigările E2E. | Observat și la teste PASS; cauza exactă nu este încă atribuită. Nu este ascuns din logs și nu s-a modificat codul aplicației pentru a-l suprima. | Verificare separată dacă apare și în utilizarea reală; nu prezenta logs ca fiind fără erori. |
| INSTALL-15 | În auditul inițial din browser au fost expuse accidental valorile unor chei Stripe Test/Resend prin citirea textului unui element-părinte. | Utilizatorul a înlocuit cheile; valorile nu sunt reproduse aici. Operațiile ulterioare au folosit transfer în memorie și rezultate booleene. | Client: nu citi textul întregului formular/ancestor și nu fotografia chei vizibile; la expunere rotație, nu simpla mascarea raportului. |
| INSTALL-16 | Prima creare Vercel a afișat eroare de repository, apoi `project already exists`. | Crearea proiectului și deployment-ul nu sunt o singură operație atomică. Proiectul demo existent a fost verificat și deployment-ul a ajuns Ready. Cauza exactă a primei erori nu a fost recuperată. | Client: inspectează proiectul existent/repository-ul înainte de retry; nu crea duplicate sau nume alternative la întâmplare. |
| INSTALL-17 | `supabase login --profile handmade-demo` a eșuat cu `Unsupported Config Type`. | Configurarea CLI a necesitat verificare/reluare; nu se presupune autenticarea dintr-un raport vechi. Instalarea ulterioară a folosit ref demo explicit. | Client: verifică versiune, login, project ref și dry-run actuale; evită `--linked` implicit din workspace-ul altei instalări. Cauza internă a erorii de profil nu este certificată. |
| INSTALL-18 | Locatorul checkout `getByText("Comandă înregistrată")` potrivea și route-announcer-ul Next.js. | Strict-mode failure după plasare reușită; testul customer COD cere acum text exact, nu `.first()` și nu un assertion eliminat. | Rerulare focalizată și Chromium complet obligatorii după fix. Nu modifica accesibilitatea aplicației pentru a ascunde problema selectorului. |

| INSTALL-19 | Testul concurență card/COD apela RPC-ul client `place_cod_order` cu service_role; clean-install refuză EXECUTE (42501). | Aplicația folosește client anon/authenticated; testul folosește acum un client anon real pentru COD și păstrează service_role pentru RPC-urile server. Nu s-au acordat privilegii noi. | Prima suită: 178 PASS / 2 FAILED / 6 NOT RUN (grup serial). Rerulare obligatorie; fiecare test trebuie să folosească identitatea runtime corespunzătoare, nu operatorul ca substitut. |

| INSTALL-20 | A doua suită completă a pierdut rezultatul procesului CLI la INSERT fixture orders 7C (`process=null`, fără SQLSTATE). | 172 PASS / 1 FAILED / 13 NOT RUN; nu este certificat verde. Cauza exactă (timeout/transport) nu este demonstrată. SQL mutat în fișier temporar eliminat după utilizare, fără limite argv; timeout CLI 90s, statement SQL 20s; diagnostic killed/durată. Fără retry automat al unui write posibil comis. | Rerulare 7C și completă obligatorie. Dacă reapare, diagnosticul trebuie investigat; nu eticheta drept flaky acceptabil și nu mări granturile. |

## Rezultatul final al revalidării — 2026-09-18

Mențiunile de rerulare/pending din tabel descriu momentul constatării. După toate
corecțiile: Chromium complet **186/186 PASS**, fără failures, skip sau teste nerulate;
7C focalizat **18/18 PASS**; SQL **14/14 scripturi PASS** cu rollback; unitare
**30/30 PASS**; ESLint/TypeScript/build PASS. Aceste rezultate închid revalidările
INSTALL-08, 11, 18, 19 și 20 pentru demo, nu demonstrează retroactiv o cauză exactă
pentru întreruperea CLI. INSTALL-09 rămâne limita tooling-ului specific demo, iar
INSTALL-14 rămâne o observație de diagnostic deschisă. Vezi checkpoint-ul final
pentru cleanup, limite și dovezile Auth/Stripe/email. Nu s-a făcut PR/merge.

## Gate pentru un client real

1. Identitate/ref/repository distincte; niciun secret din instalarea precedentă.
2. Release identificat, migrări aplicate și dry-run gol; RLS/grants verificate.
3. Auth URLs + emailuri reale verificate end-to-end; parolele rămân private.
4. Sandbox payment + webhook + DB + stock/cart + email; fără confirmare manuală.
5. Fixture-uri independente de runtime grants; cleanup verificat și date manuale păstrate.
6. Chromium complet fără failure/skip de infrastructură, lint/type/build și scan secret.
7. Orice gate obligatoriu fără dovadă blochează certificarea respectivă. Riscurile și
   diagnosticele încă neatribuite rămân explicite în handover; Production/Live și
   installer-ul generic necesită validări separate de checkpoint-ul acestui demo.

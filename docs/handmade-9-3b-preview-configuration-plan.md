# Handmade 9.3b — plan Preview, fără activare

> Plan istoric pentru branch-ul 9.3, retras. Configurația activă este în [starea handmade](handmade-final-development.md). Nu recreați branch-ul sau endpointurile vechi.

Data: 2026-11-11. Bază/HEAD: `a301e6b2a542555393fae60cad60802e699d7caa`,
branch `task/handmade-9-3-functional-regression`. Pregătirea este realizată;
configurarea cloud și publicarea rămân pentru review ChatGPT și aprobarea proprietarului.
Nicio variabilă, cheie, template, redirect, webhook sau configurație cloud nu a fost modificată.

## 1. Identitate și stare reconfirmate

- Vercel `proiect-site`, echipa `andreioprea26x-gmailcoms-projects`, repo
  `andreioprea26/proiect-site`. Production Branch Tracking este explicit **main**,
  verificat în Settings → Environments → Production, fără editare.
- Preview existent: `proiect-site-j971lik0c-andreioprea26x-gmailcoms-projects.vercel.app`,
  deployment `dpl_2kw7XxShLUNvbwUg6dd3NfiMv5jv`, Ready/17s,
  commit `7794d5f5f446db13104a77c17fd4ba6e1274b759`, branch 9.2.
- Aliasul acelui branch este `proiect-site-git-task-900953-...vercel.app`.
  **Nu este aliasul branch-ului 9.3 și nu trebuie folosit drept APP_URL pentru 9.3.**
- Branch-ul 9.3 nu este publicat; nu există încă un alias verificat pentru el.
  Definim **H** = origin-ul HTTPS al aliasului stabil 9.3 returnat de Vercel după
  publicarea aprobată. Nu ghicim hash-ul/numele și nu folosim un domeniu Production/demo.
- Supabase original `bdyocajhhylvasfhmnal`, ACTIVE_HEALTHY, reconfirmat prin API.

## 2. Delta exactă a variabilelor

Toate variabilele noi vor avea exclusiv **Preview + branch-ul 9.3**, fără bifarea
Production/Development și fără schimbarea valorilor globale sau a branch-ului 9c.
Nu se mută/șterg înregistrările vechi ca parte a acestui task.

| Nume folosit de aplicație | Scope existent observat | Acțiune propusă |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Preview general | Păstrat; trebuie să fie `https://bdyocajhhylvasfhmnal.supabase.co` |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Preview general | Păstrat; cheia proiectului original, verificată fără afișare |
| SUPABASE_SERVICE_ROLE_KEY | Preview, numai task/9c-final-launch-readiness | Adăugat separat pe 9.3, exclusiv cheia Development original |
| APP_URL | Preview, numai task/9c-final-launch-readiness | Adăugat pe 9.3 cu valoarea H, fără path/query |
| STRIPE_SECRET_KEY | Preview, numai task/9c-final-launch-readiness | Adăugat pe 9.3: cheie validă sk_test din mediul de test ales |
| STRIPE_WEBHOOK_SECRET | Preview, numai task/9c-final-launch-readiness | Adăugat pe 9.3: whsec al endpointului HTTPS H dedicat |
| RESEND_API_KEY | Lipsește | Cheie existentă autorizată pentru trimitere, server-only |
| RESEND_FROM_EMAIL | Lipsește | Sender existent și permis/verificat în contul Resend |
| EMAIL_DELIVERY_MODE | Lipsește; codul are default redirect | Setat explicit `redirect` |
| EMAIL_TEST_RECIPIENT | Lipsește | Unicul destinatar de test aprobat și controlat |
| RESEND_REPLY_TO_EMAIL | Lipsește; opțional | Omis sau adresă de atelier aprobată |

Cheile nu au fost revelate sau exportate. Secreturile limitate la 9c nu pot fi
presupuse corecte/reutilizabile numai pentru că numele coincid. URL-ul public
compilat al Preview-ului existent a fost verificat în TASK 9.3 și indică originalul.
La bootstrap-ul 9.3 se verifică din nou această țintă înainte de orice test cu write.

Nu copiați integral `.env.local` în Vercel: E2E_ADMIN_*, E2E_TEST_* sunt pentru
runnerul de teste, nu pentru aplicația publicată. SHIPPING_PROVIDER/SHIPPING_API_KEY
din exemplu nu sunt consumate de codul actual și nu se configurează. Nu este necesară
o cheie Stripe publishable: aplicația redirecționează la Stripe-hosted Checkout.
VERCEL_ENV și variabilele sistem nu se falsifică manual.

Valorile scoped pe branch nu afectează Production și intră în vigoare la un
deployment nou; nu actualizează retroactiv un deployment existent.
[Vercel — environment variables](https://vercel.com/docs/environment-variables)

## 3. Auth: schimbări minime și analiza erorilor

Configurație reală reconfirmată: Site URL localhost:3000; două redirecturi localhost
și două pentru vechiul alias task/9c. Signup este activ, confirmarea email obligatorie;
SMTP custom nu este configurat. Template-urile confirmation/recovery folosesc
`ConfirmationURL`; nu au SiteURL hardcodat, TokenHash sau callbackuri custom.

Delta minimă aprobată ulterior ar adăuga numai:

```text
H/auth/confirm
H/auth/reset-password
```

Testele Auth se vor deschide pe H. Păstrăm redirecturile existente/local și nu
introducem wildcard-uri globale. APP_URL=H guvernează destinațiile interne
`/auth/confirmed` și `/reset-password`, nu înlocuiește allowlist-ul Supabase.
Site URL localhost poate rămâne pentru Development: codul transmite explicit
emailRedirectTo/redirectTo și template-urile existente folosesc ConfirmationURL.
Mutarea fallback-ului Site URL pe H este opțională și necesită aprobare separată;
nu este o cerință demonstrată pentru fluxurile aplicației.
[Supabase — redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

Cele două 500 constatate în 9.3 apar chiar înainte de apeluri Auth, când lipsa
APP_URL face ca inclusiv construirea URL-ului de eroare să arunce excepție.
Testele noi rulează sursele reale ale rutelor/configurației și NextResponse real,
cu Supabase înlocuit local: **12/12 PASS**. Cu APP_URL corect, absența tokenurilor,
codurile/OTP invalide și erorile furnizorului sunt tratate prin redirect sigur;
tipul nesuportat nu apelează Auth; recovery păstrează verificarea claim-ului.
Nu s-a identificat un fix obligatoriu în tratarea tokenurilor. Nu sunt teste reale
de livrare email sau exchange cu Supabase. Hardeningul răspunsului la configurație
lipsă este o îmbunătățire separată, nu condiție pentru configurarea acestui Preview.

**Separat, livrarea Auth:** Resend-ul operațional nu configurează SMTP Supabase și
EMAIL_TEST_RECIPIENT nu redirecționează emailurile Auth. SMTP implicit Supabase
permite doar destinatarii din echipa proiectului și este puternic limitat. Înainte
de signup/reset real, verificați eligibilitatea căsuței dedicate; dacă nu este
permisă, pregătiți SMTP cu serviciul Resend existent/senderul permis, cu aprobare
distinctă, fără serviciu sau domeniu nou. Nu dezactivați confirmarea ca scurtătură.
[Supabase — SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## 4. Stripe Sandbox și Resend

Stripe: folosiți același cont/mediu Sandbox existent pentru sk_test și endpointul
`H/api/stripe/webhook`; nu secretul Stripe CLI/local și nu endpointuri Live/demo.
Payloadul trebuie să fie **snapshot**, compatibil cu ruta actuală care citește
event.data.object. Evenimentele existente în cod sunt exact:

- checkout.session.completed
- checkout.session.expired
- refund.created
- refund.updated
- refund.failed

Secretul whsec este specific endpointului și mediului. Nu se importă secretul 9c
fără verificarea endpointului asociat. Cheia locală nerecunoscută nu se copiază.
Codul acceptă numai sk_test și sesiuni cs_test; nu se relaxează garda pentru Live.
Secreturile rămân server-only. Success/cancel URL sunt construite din APP_URL=H;
confirmarea plății rămâne responsabilitatea webhookului semnat.
[Stripe — webhooks](https://docs.stripe.com/webhooks)

La noul Preview verificați accesibilitatea webhookului fără login Vercel: un GET
trebuie să ajungă la aplicație și să primească 405, nu 401/redirect de autentificare.
Un POST fără semnătură, într-o etapă de validare aprobată, trebuie să primească 400
fără efecte DB. Dacă protecția platformei blochează Stripe, opriți configurarea
pentru review; nu dezactivați global protecția și nu creați bypass automat.
Nu se activează/trimit/rejoacă evenimente înainte de configurarea backendului și
de aprobarea lor; un webhook autentic poate modifica comenzi și trimite notificări.

Resend: setați explicit redirect, senderul existent permis, cheia și destinatarul
unic aprobat. Codul forțează redirect pentru VERCEL_ENV=preview; fără destinatar
refuză trimiterea, fără fallback la client. Nu utilizați EMAIL_DELIVERY_MODE=live.
Nu presupuneți că o cheie Resend are un Sandbox echivalent Stripe: un apel poate
trimite un email real. delivered@resend.dev poate simula livrarea providerului,
dar nu dovedește primirea într-o căsuță reală. Orice trimitere cere autorizare.
[Resend — test emails](https://resend.com/changelog/sending-test-emails)

Disponibilitatea/validitatea cheilor Stripe și Resend și starea senderului nu sunt
confirmate prin acest audit; proprietarul trebuie să furnizeze/selecteze valori
valide din conturile existente, fără afișarea lor. Se verifică limitele existente;
nu se cumpără planuri, domenii sau add-on-uri și nu se creează servicii noi.

## 5. Ordinea exactă propusă după review

1. Aprobați ținta 9.3, operațiile cloud de mai jos, cheile din mediile existente,
   senderul și destinatarul/căsuța Auth dedicată. Reconfirmați Production Branch=main.
2. Aprobați și publicați commitul 9.3 revizuit pe branch-ul său; push-ul declanșează
   primul Preview. Bootstrap-ul folosește cele două variabile publice existente,
   fără activarea testelor de comenzi/plată/email. Verificați commitul, Ready și
   Supabase original; notați aliasul stabil real H. Nu folosiți aliasul 9.2.
3. Pregătiți endpointul Sandbox dedicat H și signing secretul său în cadrul aprobării;
   păstrați-l inactiv până la backend complet sau programați crearea/activarea astfel
   încât să nu existe livrări/replay de evenimente în faza incompletă.
4. Adăugați cele 8 valori obligatorii lipsă pe 9.3 (service role, APP_URL, două Stripe,
   două Resend, mode și recipient); Reply-To numai dacă este necesar. Păstrați intacte
   Production, scope-urile 9c, cheile publice globale și proiectele Demo.
5. Adăugați cele două redirecturi exacte H în Development original. Verificați
   eligibilitatea livrării Auth/SMTP conform secțiunii 3; fără trimitere încă.
6. Faceți **un redeploy aprobat** cu configurația completă, fără push suplimentar
   necesar. Verificați din nou commitul, Preview, build, ținta Supabase și scope-urile.
7. Validare fără write: pagini publice, callbacks fără token → 307 numai către H,
   acces admin anonim respins, webhook GET=405. Revedeți secreturile doar prin
   verificări booleene/mode; nu le publicați în loguri. Apoi activați endpointul
   Sandbox numai în cadrul aprobării și fără livrări de test neautorizate.
8. Solicitați aprobarea separată pentru regresia reală pregătită în TASK 9.3:
   Auth cu căsuțe dedicate, COD/stoc, plată/webhook/refund Sandbox, emailuri redirect,
   administrare și cleanup pe UUID-uri. Configurarea mediului nu autorizează aceste teste.

Scriptul `verify-handmade-preview.mjs` din 9.3 este intenționat fixat pe deploymentul
9.2. Pentru validarea noului Preview se actualizează local ținta și allowlist-ul
la H/URL-ul immutable 9.3 efectiv verificate, după aprobare; nu se rulează scriptul
vechi și nu se prezintă rezultatele lui ca dovadă pentru noul deployment.

Pentru targetul 9.3 al cărui alias nu există încă, planul are un deployment de
bootstrap și un redeploy complet. Nu există o singură valoare APP_URL exactă pe
care s-o putem completa acum fără a ghici URL-ul. Dacă ulterior se alege reutilizarea
branch-ului 9.2, aliasul lui este cunoscut și poate fi folosit cu un singur redeploy,
dar aceea este o altă țintă, nu publicarea branch-ului 9.3.

## 6. Aprobări și stare locală

Aprobări necesare: adăugarea valorilor Vercel scoped 9.3; push + cele două deploymenturi;
adăugarea redirecturilor și eventuala configurare SMTP Auth; endpointul/activarea
Stripe Sandbox; senderul și destinatarul Resend. Trimiterile de email și testele
care scriu date/comenzi/plăți Sandbox necesită separat aprobarea din TASK 9.3.

Nu sunt necesare modificări de aplicație sau migrări pentru lipsurile identificate.
Excepția de inițializare email când lipsește service_role, constatată în 9.3, este
înlăturată din acest traseu prin configurarea obligatorie a cheii, nu prin refacerea
checkoutului. Nu s-a implementat un fix de business sau o funcționalitate 10B.

Fișierul de teste nou: `tests/unit/auth-preview-configuration.test.mjs`. Nu încarcă
.env și nu are acces la SDK-ul Supabase real; dependențele sunt limitate explicit.
Rulează local prin `node --test tests/unit/auth-preview-configuration.test.mjs`.
Niciun server sau serviciu nou nu este pornit. HEAD rămâne a301e6b; documentul și
testele sunt doar pregătite local, fără commit, push, deployment sau activare cloud.

Verificări locale 9.3b: 12 teste noi Auth + 8 teste email existente = **20/20 PASS**,
ESLint PASS, TypeScript PASS, whitespace/git diff --check fără erori. Nu s-a
reexecutat regresia SQL/E2E și nu s-au trimis mesaje sau evenimente reale.

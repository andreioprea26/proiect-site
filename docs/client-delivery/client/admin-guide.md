# Ghid administrator — [CLIENT]

Magazin: `[MAGAZIN_URL]`; administrare: `[MAGAZIN_URL]/admin`; suport convenit:
`[CONTACT_SUPORT]`. Training: `[DATE]`, versiune `[CLIENT_SHA]`.
În Test/Preview folosește numai persoane/date fictive. Cardul și refund-ul actual
sunt Stripe Test. Dacă o acțiune afișează rezultat incert, verifică situația și
contactează operatorul înainte de repetare.

## Autentificare și cont

Deschide `/login` și introdu adresa și parola contului individual. Operatorul
acordă rolul admin; înregistrarea nu oferă automat acces administrativ.
Pentru recuperare folosește `/forgot-password` și linkul nou primit în același
browser. Nu trimite parola suportului. Contul și adresele personale sunt la
`/account` și `/account/addresses`; comenzile proprii și favoritele la
`/account/orders` și `/account/favorites`. Toate comenzile magazinului sunt în
Admin → Comenzi. Deconectează-te din cont după utilizarea pe dispozitiv partajat.
Administratori noi/revocarea rolurilor se solicită operatorului; nu există UI de roluri.

## Admin și dashboard

La `/admin`, „Imagine de ansamblu” afișează comenzi recente, comenzi care necesită
atenție, Stripe brut/net după refunduri, COD încasat și număr de recenzii/mesaje/
cereri/abonări. Citește perioada indicată; acestea nu sunt rapoarte contabile.
„Dashboard operațional” are „Comenzi noi”, „Stoc redus” și „Review personalizări”.
Deschide produsul/comanda din card pentru a acționa.

## Produse, Categorii și Colecții

1. În „Categorii” (`/admin/categories`) și „Colecții” (`/admin/collections`),
   completează formularele de creare/editare, numele și slug-ul (identificatorul
   din URL). Organizează catalogul înainte de publicare.
2. În „Produse” (`/admin/products`), creează produsul la `/admin/products/new`:
   Nume, Slug, descrieri, „Preț de bază (RON)”, „Tip produs”, „Disponibilitate”,
   „Status publicare”, termen în zile și categoriile/colecțiile relevante.
3. Salvează întâi ca draft. În „Editează produsul”, completează imaginile,
   variantele, personalizările și inventarul. Publică după verificare;
   publicarea și disponibilitatea sunt setări distincte.
4. În secțiunea imaginilor încarcă fotografiile, textul alternativ și ordinea;
   verifică galeria și pe telefon.
5. Arhivarea scoate produsul din catalogul activ. Comenzile existente păstrează
   datele și prețurile de la cumpărare, chiar dacă modifici catalogul ulterior.

## Variante și personalizări

În „Variante” → „Variantă nouă”, introdu titlu (ex. Mărime M), SKU opțional,
atribute, „Preț propriu opțional (RON)”, ordine și activare. Prețul propriu
înlocuiește prețul de bază pentru acea variantă. Apasă „Adaugă varianta” sau
„Salvează varianta”; verifică selecția în magazin. Fiecare variantă are inventar.

În „Personalizări”, adaugă nume, tip, descriere, cost suplimentar, ordine și
„Obligatorie”/„Activă”. Textul poate avea limite de lungime; selecția are valori
permise câte una pe linie; Da/Nu nu cere valori suplimentare. Testează totalul în
coș. Deși editorul include tip imagine, upload-ul privat al unei referințe nu
este un flux complet disponibil; nu îl promite fără implementare separată.

## Inventar și stocuri

„Inițializează inventarul” pornește de la zero când este neconfigurat. Setează
„Prag stoc redus”. „Ajustare (+/-)” reprezintă diferența: dacă ai 3 bucăți și
ai produs încă 5, introduci **5**, nu 8. Notează motivul, apasă „Ajustează stocul”
și verifică rezultatul și „Istoric ajustări”. Pentru variante alege inventarul
corect. Unicatul este limitat la maximum 1.

Stocul disponibil ține cont de rezervările card. Nu modifica stocul pentru o
plată încă neconfirmată; cere verificare tehnică. Anularea COD eligibilă
restabilește inventarul consumat o singură dată. Refund-ul financiar nu
restochează automat: verifică returul fizic înainte de ajustare.

## Comenzi și procesare

În „Comenzi” (`/admin/orders`), filtrează și deschide detaliile. Verifică produse,
personalizări, adresă, livrare și metoda/starea plății. Starea comenzii și cea a
încasării sunt distincte. Folosește tranzițiile oferite de formular; istoricul
păstrează schimbările și notele. Nu există creare manuală de comenzi în UI.

Flux COD obișnuit: „Nouă” → „În lucru” → „Pregătită” → „Expediată” → „Finalizată”.
Când este necesar, trece prin „Așteaptă verificarea personalizării” înainte de
„În lucru”. Card: „Așteaptă plata” devine „Plătită” prin confirmarea Stripe,
apoi urmează procesarea. Pagina de revenire nu este dovada încasării.
„Returnată”, „Anulată” și „Rambursată” sunt situații distincte; schimbarea
statusului nu substituie operația financiară.

### Ramburs (COD) și Stripe

„Marchează ramburs încasat” se folosește după confirmarea primirii sumei integrale.
Marchează plata achitată fără schimbarea statusului operațional. Expedierea nu
dovedește încasarea. Stripe Sandbox folosește date/bani de test; webhook-ul
confirmă plata. Dacă rămâne în așteptare, cere verificare tehnică, fără marcare
artificială „Plătită”. Cardul Live nu este disponibil în versiunea actuală.

### Livrări și tracking

În detalii completează „Curier”, „AWB / tracking number” și opțional „URL tracking
HTTPS opțional”, apoi „Salvează expedierea”. Când comanda este „Pregătită” și
expedierea validă, folosește „Marchează drept expediată”. Verifică istoricul și
notificarea. Aplicația înregistrează datele; nu generează automat AWB, nu comandă
curierul și nu integrează selecția locker. Tarifele/metodele sunt setup tehnic separat.

### Anulare și refund

„Anulează comanda” apare pentru stări eligibile: COD neîncasat înainte de
expediere sau card pending. Citește confirmarea și notează motivul. Pentru card
pending, Session este expirată înainte de eliberarea rezervării.
„Refund integral Stripe” solicită întreaga sumă pentru plata eligibilă în Stripe
Test; nu există refund parțial în acest flux. Verifică rezultatul financiar și
istoricul. La pending/failed cere reconciliere, fără operații repetate în dashboard.
Refund-ul nu readuce marfa în stoc. Restituirea COD încasat urmează procedura
comercială convenită, nu butonul Stripe.

### Notificări

În detalii vezi notificările, starea și încercările. „Retrimite” este disponibil
pentru notificări eșuate, după corectarea cauzei. Emailul eșuat nu anulează comanda.
În Preview emailurile operaționale merg la QA; Auth se testează separat.
Nu partaja capturi cu date personale sau linkuri de confirmare.

## Recenzii, Newsletter, Contact și Cereri speciale

- „Recenzii” (`/admin/reviews`): filtrează „În așteptare”, citește și apasă
  „Aprobă”/„Respinge”. Publicarea privește cumpărătorii verificați eligibili.
- „Newsletter” (`/admin/newsletter`): registrul consimțămintelor, cu „Dezactivează”/
  „Reactivează”. Reactivează numai cu acord valid verificat. Nu trimite campanii.
- „Contact” (`/admin/contact`): citește mesajul, actualizează starea și nota
  internă. Răspunde prin canalul convenit; salvarea nu trimite automat răspunsul.
- „Cereri speciale” (`/admin/custom-requests`) deschide „Cereri personalizate”.
  Folosește Nouă/În analiză/Acceptată/Respinsă/Închisă și „Notă internă”, apoi
  „Salvează cererea”. Acceptarea nu creează comandă, plată sau rezervare;
  oferta și traseul comercial se confirmă separat.

## Conținut și Homepage

„Conținut” (`/admin/content`) deschide „Pagini informative”: Slug, Titlu,
Conținut text simplu, Draft/Publicată și „Salvează pagina”. Verifică `/info/[slug]`.
Drafturile nu sunt publice. Footer-ul arată cel mult șase pagini publicate;
verifică accesul la fiecare politică necesară cu operatorul. Textele juridice
se publică după aprobarea clientului/specialistului; aplicația nu le certifică.

„Homepage” (`/admin/homepage`) gestionează „Hero principal”, „Categorii”, „Produse
recente”, „Colecții”, „Banner promoțional”: Activ, Ordine, Supratitlu, Titlu,
Subtitlu, Text CTA și Destinație CTA internă (ex. `/shop`), apoi „Salvează blocul”.
CTA este textul/linkul butonului. Verifică homepage după salvare; nu există editor
vizual liber/upload banner. „Configurat în Development” este eticheta actuală a
UI și nu dovedește mediul instalării.

## Store Settings

La `/admin/settings`, „Salvează setările” actualizează Nume magazin, Tagline,
Descriere scurtă/SEO/footer, Email public, Telefon public, WhatsApp și linkuri
Instagram/Facebook/TikTok HTTPS. Folosește text simplu; telefon cu cifre și
opțional `+`. Câmp gol revine la fallback-ul versionat sau ascunde contactul când
fallback-ul este gol. Verifică magazinul după salvare. Emailul public nu schimbă
sender-ul emailurilor. Logo/favicon/OG/paletă/fonturi/domeniu/livrare/accesuri se
solicită operatorului. Numele nou nu rescrie textele salvate în Homepage/Conținut.

Verifică zilnic comenzile, personalizările, stocul mic, mesajele și emailurile
eșuate. Pentru incidente/modificări folosește [predarea și mentenanța](handover-maintenance.md).

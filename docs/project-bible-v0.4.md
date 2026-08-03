# Project Specification / Project Bible

## Versiune
**v0.4 — Etapa 4: Planul de dezvoltare**

## 1. Rezumatul proiectului

Proiectul este un magazin online pentru produse handmade realizate de mama fondatorului. Prima versiune va fi lansată exclusiv pentru România și va urmări două obiective principale:

1. atragerea de clienți noi;
2. validarea faptului că oamenii sunt dispuși să comande online aceste produse.

Prioritatea este lansarea rapidă a unui magazin sigur, simplu de administrat și suficient de complet pentru comenzi reale.

## 2. Model de business

- Produse fizice handmade.
- Producător: mama fondatorului.
- Administrator principal: fondatorul.
- Piață inițială: România.
- Brandul, numele și domeniul vor fi create de la zero.
- Firma urmează să fie înființată.
- Costurile trebuie menținute cât mai mici.
- Orice cost nou trebuie evaluat și discutat înainte de adoptare.

## 3. Obiective MVP

Prima versiune trebuie să permită:

- prezentarea produselor;
- căutarea și filtrarea produselor;
- adăugarea în coș;
- checkout cu sau fără cont;
- plata cu cardul și ramburs;
- administrarea produselor, comenzilor și stocurilor;
- produse standard, unicat și realizate la comandă;
- produse personalizabile;
- notificări automate prin e-mail;
- livrare în România;
- recenzii verificate;
- favorite;
- newsletter;
- statistici administrative de bază.

Funcțiile avansate vor fi adăugate doar după lansare, pe baza nevoilor reale.

## 4. Categorii inițiale de produse

Categorii confirmate:

- mărțișoare;
- decorațiuni;
- bijuterii;
- produse croșetate.

Catalogul trebuie să permită adăugarea ulterioară de categorii noi.

## 5. Tipuri de produse

Magazinul trebuie să accepte:

- produse realizate în avans;
- produse realizate după comandă;
- produse unicat;
- produse disponibile în mai multe exemplare;
- produse individuale;
- pachete cu mai multe produse;
- produse sezoniere;
- produse personalizabile.

Un produs trebuie să poată avea unul dintre următoarele stări sau marcaje:

- în stoc;
- stoc redus;
- realizat la comandă;
- unicat;
- indisponibil.

## 6. Personalizarea produselor

Opțiunile posibile de personalizare includ:

- culoare;
- model;
- nume sau text;
- mesaj;
- dimensiune;
- material;
- ambalaj cadou;
- încărcarea unei imagini de referință.

Produsele personalizate pot avea cost suplimentar.

Pentru comenzile personalizate:

- clientul poate introduce instrucțiuni într-un câmp text;
- clientul poate încărca o imagine;
- comanda trebuie verificată manual înainte de acceptare;
- fiecare produs poate avea un termen propriu de realizare.

Regulile exacte de preț pentru personalizare rămân de stabilit.

## 7. Sezonalitate

Magazinul va funcționa tot anul, cu produse și colecții diferite în funcție de sezon.

Exemple:

- 1 Martie;
- Paște;
- Crăciun;
- alte sărbători și evenimente.

Următorul sezon prioritar nu este încă stabilit.

## 8. Catalog

Catalogul va include:

- categorii și colecții;
- căutare;
- filtre;
- sortare;
- produse similare;
- produse noi;
- produse populare;
- produse recomandate;
- colecții sezoniere.

Filtre posibile:

- preț;
- culoare;
- material;
- disponibilitate;
- personalizabil;
- unicat;
- ocazie sau sezon.

Sortarea va permite cel puțin:

- preț;
- noutate;
- popularitate;
- disponibilitate.

Structura finală a categoriilor va fi stabilită în Etapa 2 și Etapa 3.

## 9. Fotografii și conținut

- Fiecare produs poate avea mai multe fotografii.
- Produsele pot fi fotografiate din mai multe unghiuri.
- Descrierile vor fi generate cu ajutorul AI și verificate manual.
- Nu este necesar un blog în MVP.
- Nu vor fi afișate în MVP fotografii sau videoclipuri din procesul de producție.

## 10. Clienți

Magazinul se adresează:

- persoanelor fizice;
- firmelor;
- școlilor;
- grădinițelor;
- altor organizații.

Există interes special pentru clienți care cumpără cantități mari, dar nu va exista în MVP o pagină corporate separată.

Clientul ideal nu este încă definit suficient de precis și va fi rafinat în etapa de branding și poziționare.

## 11. Conturi și autentificare

Clienții vor putea:

- cumpăra fără cont;
- crea cont cu e-mail și parolă;
- folosi autentificarea Google, dacă implementarea rămâne rezonabilă;
- vedea istoricul comenzilor;
- salva produse favorite;
- comanda din nou pe baza unei comenzi anterioare.

Verificarea e-mailului nu este obligatorie în MVP.

Profilul va include informații de bază. Câmpurile exacte vor fi definite în etapa de arhitectură.

## 12. Coș și checkout

Checkout-ul va permite:

- cumpărare ca vizitator;
- cumpărare cu cont;
- date pentru persoană fizică;
- date pentru persoană juridică;
- selectarea metodei de livrare;
- selectarea metodei de plată;
- introducerea detaliilor de personalizare, când este necesar.

## 13. Plăți

Metode dorite la lansare:

- card online;
- ramburs.

Plata în avans obligatorie pentru produse personalizate rămâne de decis.

## 14. Livrare

Direcția actuală:

- curier;
- easybox sau locker;
- posibil ridicare personală;
- fără Poșta Română;
- livrare probabil în toată România;
- transport plătit în mod normal de client.

Produsele aflate în stoc ar trebui expediate în aproximativ 1–2 zile.

De stabilit:

- curierii finali;
- regulile pentru easybox;
- pragul pentru transport gratuit;
- disponibilitatea ridicării personale;
- zonele exacte de livrare.

## 15. Comenzi

Statusuri preliminare:

- nouă;
- așteaptă plata;
- plătită;
- în lucru;
- pregătită;
- expediată;
- finalizată;
- anulată;
- rambursată;
- returnată;
- așteaptă confirmarea personalizării.

Administratorul trebuie să poată:

- crea manual comenzi;
- modifica statusurile;
- vedea istoricul;
- gestiona personalizările;
- primi e-mail imediat la o comandă nouă.

Clientul nu va putea anula automat o comandă după plată. După plată, va trebui să contacteze magazinul.

## 16. Stocuri

Sistemul trebuie să permită:

- actualizarea automată a stocului;
- prevenirea vânzării peste stoc;
- protecția produselor unicat împotriva cumpărării simultane;
- marcarea stocului redus;
- diferențierea dintre produse în stoc și produse realizate la comandă.

Limitarea cantității comandate rămâne de decis.

## 17. Notificări

E-mailuri automate pentru:

- confirmarea comenzii;
- confirmarea plății;
- comanda în lucru;
- comanda pregătită;
- expediere;
- anulare;
- alte modificări importante de status.

Factura va fi suficient să fie trimisă prin e-mail în MVP.

## 18. Retururi și reclamații

Direcția preliminară:

- produsele standard vor putea fi probabil returnate;
- termenul și condițiile vor fi stabilite conform legislației aplicabile;
- produsele personalizate nu vor fi returnabile pentru simpla răzgândire;
- produsele personalizate vor putea fi reclamate dacă sunt greșite, defecte sau diferite de comandă;
- costul returului va fi suportat în mod normal de client;
- excepțiile pentru produse defecte sau greșite vor fi definite ulterior.

Politicile juridice finale trebuie validate înainte de lansare.

## 19. Contact și suport

Pagina de contact va include:

- formular;
- e-mail;
- telefon;
- WhatsApp;
- linkuri către rețele sociale.

Nu va exista chat live.

Fondatorul va răspunde la mesaje, reclamații și solicitări.

## 20. Recenzii

- Doar clienții care au cumpărat produsul pot lăsa recenzii.
- Recenziile vor fi marcate ca verificate.
- Recenziile vor necesita probabil aprobare înainte de publicare.
- Administratorul trebuie să poată modera recenziile.

## 21. Favorite

Utilizatorii autentificați vor putea salva produse favorite.

Comportamentul favoritelor pentru vizitatori fără cont rămâne de decis.

## 22. Newsletter și marketing

- Va exista un formular de abonare la newsletter.
- Abonarea va fi voluntară și separată de crearea contului.
- Newsletter-ul va putea fi folosit pentru colecții, produse noi, reduceri și campanii sezoniere.
- Integrarea cu un serviciu de e-mail marketing poate fi adăugată ulterior.
- În MVP este suficientă salvarea abonaților, dacă integrarea completă ar adăuga costuri sau complexitate.
- Nu este necesară integrarea directă cu Instagram, Facebook sau TikTok.
- Nu sunt necesare butoane de distribuire socială.

## 23. Pagini

Pagini confirmate:

- Acasă;
- Magazin;
- Categorii;
- Colecții;
- Pagina produsului;
- Coș;
- Checkout;
- Contul meu;
- Istoric comenzi;
- Favorite;
- Despre noi;
- Contact;
- Comenzi personalizate;
- Întrebări frecvente;
- Livrare și retur;
- Termeni și condiții;
- Politica de confidențialitate;
- Politica de cookies.

## 24. Homepage

Homepage-ul va include:

1. colecția sezonieră principală;
2. produse noi;
3. produse populare;
4. produse recomandate;
5. categorii principale;
6. testimoniale, când vor exista;
7. formular de newsletter;
8. banner promoțional configurabil.

## 25. Administrare

Administrator principal: fondatorul.

Mama fondatorului poate primi acces, dar nu va administra în mod activ magazinul în prima etapă.

Dashboard-ul va afișa, în această ordine:

1. comenzi noi;
2. produse cu stoc mic;
3. vânzări;
4. produse populare;
5. cereri de personalizare;
6. recenzii în așteptare.

Administratorul va putea:

- gestiona produse;
- gestiona categorii și colecții;
- gestiona stocuri;
- gestiona comenzi;
- crea comenzi manual;
- valida comenzi personalizate;
- modera recenzii;
- vedea statistici;
- gestiona bannerul promoțional;
- gestiona conținutul principal al site-ului.

## 26. Statistici

Statistici de bază pentru:

- vânzări;
- comenzi;
- produse;
- clienți;
- newsletter.

Exportul în CSV sau Excel nu este necesar în MVP.

## 27. Facturare

Situația actuală:

- firma urmează să fie înființată;
- serviciul sau metoda de facturare nu este încă aleasă;
- nu este încă decis dacă se emite factură pentru fiecare persoană fizică;
- factura va fi trimisă prin e-mail.

Deciziile fiscale și contabile vor fi luate înainte de implementarea finală a checkout-ului și înainte de lansare.

## 28. Operațiuni

- Comenzile vor fi pregătite și ambalate de fondator și mama sa.
- Produsele aflate în stoc vor fi expediate în 1–2 zile.
- Produsele realizate la comandă pot avea termene diferite.
- Fondatorul poate aloca peste 20 de ore pe săptămână proiectului.

## 29. Constrângeri

- Bugetul nu este fix, dar costurile trebuie minimizate.
- Orice cost trebuie anunțat și analizat înainte de adoptare.
- Prima versiune este doar pentru România.
- Lansarea rapidă este mai importantă decât includerea tuturor funcțiilor posibile.
- MCP-urile sunt opționale și nu vor bloca dezvoltarea.

## 30. Decizii amânate

- numele brandului;
- domeniul;
- identitatea vizuală;
- clientul ideal exact;
- diferențiatorul principal;
- prețurile;
- reducerile pentru cantități;
- pragul pentru transport gratuit;
- curierii;
- politica finală de retur;
- plata în avans pentru personalizări;
- metoda de facturare;
- emiterea facturii pentru persoane fizice;
- termenii juridici;
- comportamentul produselor epuizate;
- galeria produselor unicat vândute;
- limitarea cantităților;
- suspendarea temporară a comenzilor;
- programarea publicării produselor;
- rolurile viitoare pentru angajați;
- integrarea cu serviciul de newsletter;
- cupoanele promoționale;
- următorul sezon prioritar.

## 31. Criterii de succes pentru MVP

MVP-ul este considerat pregătit pentru lansare când:

- un client poate găsi un produs;
- poate înțelege ce cumpără;
- poate selecta opțiuni și personalizări;
- poate comanda cu sau fără cont;
- poate plăti cu cardul sau ramburs;
- primește confirmare;
- administratorul vede și poate procesa comanda;
- stocul se actualizează corect;
- produsul unicat nu poate fi cumpărat de două ori;
- administratorul poate expedia comanda;
- clientul primește notificări;
- site-ul funcționează bine pe mobil;
- fluxurile critice sunt testate automat;
- politicile obligatorii sunt publicate;
- aplicația este lansată în producție.

## 32. Etapa 2 — Branding și experiență utilizator

### 32.1 Poziționarea brandului

Direcția aleasă este în principal **„Micile bucurii handmade”**, completată de ideea de produse frumoase pentru viața de zi cu zi.

Formulare de lucru:

> Un brand de produse handmade autentice, realizate cu grijă și atenție la detalii, care aduc culoare și bucurie în viața de zi cu zi, în casă sau sub forma unui cadou.

Atribute principale ale brandului:

- cald și apropiat;
- vesel și colorat;
- modern;
- autentic;
- accesibil;
- atent realizat;
- fără să fie copilăresc;
- fără poziționare foarte luxoasă.

Diferențiator preliminar:

- atenția la detalii;
- calitatea;
- autenticitatea;
- varietatea produselor handmade;
- accesibilitatea pentru cumpărături de zi cu zi și cadouri.

Brandul nu va fi construit în jurul poveștii „mamă și fiu”. Povestea personală nu va fi element central de comunicare.

Brandul trebuie să poată include în viitor și produse realizate de alți creatori.

### 32.2 Numele brandului

Numele nu este încă stabilit.

Direcții preliminare:

- să aibă legătură cu ideea de handmade;
- să nu limiteze magazinul la o singură categorie;
- să permită adăugarea altor creatori;
- să fie ușor de pronunțat, scris și memorat;
- să nu sune prea luxos;
- să nu sune prea copilăresc.

Până la alegerea numelui final se poate folosi intern denumirea temporară **„Brand Handmade”**.

### 32.3 Clientul ideal

Clientul ideal nu va fi definit foarte strict înainte de lansare. Magazinul trebuie să rămână accesibil mai multor tipuri de cumpărători, iar publicul real va fi validat ulterior prin trafic, comenzi și comportamentul utilizatorilor.

Ipoteza de lucru include persoane care:

- apreciază produsele handmade;
- caută obiecte pentru ele sau pentru casă;
- cumpără cadouri accesibile;
- preferă produse autentice în locul celor produse în masă;
- comandă predominant de pe telefon;
- includ familii, părinți și persoane interesate de produse artizanale.

Intervalul estimativ pentru majoritatea produselor este **20–50 lei**.

### 32.4 Tonul comunicării

Tonul va fi:

- clar și ușor de înțeles;
- cald, fără exces de sentimentalism;
- prietenos și optimist;
- matur;
- adaptat contextului.

Adresarea poate alterna între **„tu”** și **„dumneavoastră”**, în funcție de pagină, mesaj și situație.

Descrierile produselor vor combina:

1. informațiile practice;
2. o scurtă componentă emoțională.

Elemente rămase de decis în machete sau în etapa de conținut:

- utilizarea emoji-urilor;
- formulările finale pentru butoane;
- expresiile recurente de brand;
- evitarea sau folosirea controlată a clișeelor handmade.

### 32.5 Stilul vizual

Direcția vizuală va combina:

- aspect luminos și aerisit;
- caracter artistic și creativ;
- structură modernă și ordonată;
- atmosferă de atelier creativ;
- elemente calde și primitoare;
- colțuri și forme discret rotunjite.

Site-ul nu trebuie să pară:

- foarte luxos;
- prea copilăresc;
- excesiv de rustic;
- încărcat vizual.

Inspirația principală va fi un **atelier artistic modern**, prezentat într-o interfață clară de magazin online.

Animațiile vor fi discrete și lente.

### 32.6 Culori

Paleta preliminară aleasă:

- crem deschis — fundal principal;
- verde salvie — culoare principală;
- teracotă deschisă — accent;
- galben cald — accent secundar;
- maro închis — text principal.

Rolul paletei este să creeze o atmosferă caldă și creativă, lăsând produsele să rămână elementele vizuale dominante.

Culorile exacte și codurile finale vor fi stabilite în machete.

### 32.7 Fonturi

Direcția tipografică:

- font creativ, cu aspect ușor scris de mână, pentru accente;
- font simplu, modern și foarte lizibil pentru text, navigare și interfață;
- fontul scris de mână va fi folosit rar;
- nu se vor folosi fonturi decorative pentru texte lungi sau elemente funcționale.

Exemple pentru testare ulterioară:

- accente: Caveat sau Kalam;
- text și interfață: Inter, Manrope sau Nunito Sans.

Fonturile finale vor fi alese după stabilirea numelui și realizarea primelor machete.

### 32.8 Fotografie și inspirație vizuală

Fotografiile produselor vor combina:

- imagini simple și luminoase;
- imagini ambientale;
- decor cald de casă;
- compoziții creative și colorate, în funcție de produs.

Produsele trebuie să rămână clare și ușor de evaluat vizual.

Procesul de realizare nu va fi prezentat în prima versiune.

### 32.9 Homepage

Primul ecran va combina:

- imagine principală;
- mesaj scurt de brand;
- acces rapid către magazin sau o colecție evidențiată.

Bannerul principal va avea dimensiune medie, astfel încât produse sau categorii să fie vizibile rapid.

Ordinea preliminară a homepage-ului:

1. banner principal;
2. categorii principale;
3. produse populare;
4. produse personalizabile;
5. recenzii verificate;
6. secțiune sezonieră, când este relevantă;
7. newsletter;
8. elemente de încredere.

Elementele de încredere pot include:

- produse handmade;
- livrare în România;
- plată cu cardul sau ramburs;
- personalizare disponibilă.

Forma finală a recenziilor de pe homepage va fi decisă în machete.

### 32.10 Navigare

Meniul principal va fi relativ detaliat și va oferi acces direct către categorii.

Structură preliminară:

- Acasă;
- Magazin;
- Bijuterii;
- Decorațiuni;
- Produse croșetate;
- Mărțișoare;
- Personalizabile;
- Colecții;
- Despre noi;
- Contact.

Structura va fi ajustată în funcție de volumul real al catalogului.

Footer-ul va fi detaliat și împărțit clar pe coloane.

### 32.11 Pagina Magazin și paginile de categorie

Pagina Magazin va include:

- titlu și introducere scurtă;
- categorii;
- filtre;
- sortare;
- grilă de produse;
- paginare sau încărcare progresivă;
- marcarea produselor indisponibile.

Pagina de categorie va include:

- titlu;
- imagine sau banner discret;
- descriere scurtă;
- filtre principale;
- sortare;
- produse;
- categorii sau colecții asociate, când este relevant.

Pe mobil:

- numărul de produse pe rând va fi stabilit în machete;
- filtrele principale vor fi vizibile direct;
- restul filtrelor vor fi disponibile într-un panou;
- cardul de produs va afișa inițial doar fotografia, numele și prețul;
- poziția și forma căutării vor fi stabilite în machete;
- adăugarea rapidă în coș din listă rămâne de decis.

### 32.12 Pagina produsului

Fotografiile vor avea cel mai mare impact vizual.

Ordinea preliminară:

1. fotografii;
2. nume;
3. preț;
4. disponibilitate;
5. termen de realizare sau expediere;
6. opțiuni și personalizare;
7. cantitate;
8. adăugare în coș;
9. descriere;
10. materiale și dimensiuni;
11. livrare și retur;
12. recenzii;
13. produse similare.

Opțiunile de personalizare vor fi completate direct în pagina produsului.

Pentru cereri complexe va exista și pagina separată „Comenzi personalizate”.

Pe mobil, butonul fix de adăugare în coș va deveni activ și vizibil după selectarea opțiunilor obligatorii.

### 32.13 Pagina „Despre noi”

Pagina va fi scurtă și orientată spre brand.

Nu va pune accent principal pe povestea personală a fondatorului și a mamei sale.

Procesul de realizare nu va fi prezentat în prima versiune.

### 32.14 Pagina „Comenzi personalizate”

Pagina va avea două roluri:

1. ghid pentru produsele personalizabile;
2. formular general pentru cereri speciale.

### 32.15 Coș și checkout

Coșul va include:

- produse și fotografii;
- variante și personalizări selectate;
- cantitate;
- subtotal;
- posibilitate de modificare sau ștergere;
- buton clar către checkout;
- mențiunea că livrarea se calculează în checkout.

Checkout-ul va fi:

- pe o singură pagină pe desktop;
- împărțit în pași pe mobil.

Pași preliminari pentru mobil:

1. date de contact;
2. adresă și livrare;
3. date de facturare;
4. metodă de plată;
5. verificarea și plasarea comenzii.

Costul livrării va fi afișat în checkout.

Cumpărarea fără cont va fi opțiunea principală. Crearea contului va fi secundară și nu va întrerupe fluxul de comandă.

### 32.16 Experiența mobilă

Accesul rapid prioritar pe mobil:

- Acasă;
- Favorite;
- Coș.

Poziționarea exactă a meniului, căutării și accesului rapid va fi stabilită în machete.

Favoritele vor necesita autentificare.

Principii mobile:

- fotografii clare și suficient de mari;
- text lizibil;
- butoane ușor de apăsat;
- informații importante vizibile fără căutare excesivă;
- cât mai puține întreruperi în checkout;
- personalizări ușor de completat;
- navigare clară între categorii;
- performanță bună pe conexiuni mobile obișnuite.

## 33. Decizii rămase deschise după Etapa 2

- numele final al brandului;
- domeniul;
- codurile exacte ale culorilor;
- fonturile finale;
- logo-ul;
- utilizarea emoji-urilor;
- formulările finale pentru butoane;
- expresiile recurente de brand;
- forma căutării pe mobil;
- numărul de produse pe rând pe mobil;
- adăugarea rapidă în coș din listă;
- forma recenziilor pe homepage;
- poziționarea exactă a navigării mobile;
- machetele finale ale paginilor;
- toate deciziile comerciale, logistice, fiscale și juridice amânate în Etapa 1.

## 34. Următoarea etapă

**Etapa 3 — Arhitectură, tehnologie și plan de implementare**

În etapa următoare vor fi definite:

- arhitectura aplicației;
- tehnologia și serviciile folosite;
- structura datelor;
- rolurile și permisiunile;
- integrarea plăților;
- integrarea livrării;
- autentificarea;
- administrarea;
- costurile;
- prioritizarea funcțiilor MVP;
- planul de implementare și testare.

# Etapa 3 — Arhitectură, tehnologie și plan tehnic

## 35. Arhitectura generală

Aplicația va folosi o arhitectură de tip **monolit modular în Next.js**.

Magazinul public, contul clientului, panoul de administrare și logica server-side vor exista în același repository și în aceeași aplicație.

Servicii principale:

- Next.js, React și TypeScript pentru aplicație;
- Tailwind CSS și shadcn/ui pentru interfață;
- Supabase pentru PostgreSQL, autentificare și storage;
- Stripe Checkout pentru plățile online;
- Vercel pentru hosting și deploy;
- GitHub pentru versionare;
- Playwright pentru testele automate.

Server Actions vor fi preferate pentru operațiunile interne. Route Handlers vor fi folosite pentru webhook-uri și integrări externe.

Nu se vor folosi inițial:

- microservicii;
- backend separat;
- GraphQL;
- monorepo complex;
- platforme e-commerce gata făcute;
- infrastructură complicată fără nevoie concretă.

## 36. Organizarea repository-ului

Proiectul va folosi un singur repository GitHub și o singură aplicație Next.js.

Structura va fi organizată prin:

- App Router și route groups;
- componente reutilizabile;
- module funcționale în `src/features`;
- integrări externe și utilitare în `src/lib`;
- migrații Supabase în `supabase/migrations`;
- teste end-to-end în `tests/e2e`;
- documentație în `docs`.

Project Bible va fi păstrat în repository, în directorul `docs`.

Convenții principale:

- fișiere și directoare în `kebab-case`;
- componente React în `PascalCase`;
- funcții și variabile în `camelCase`;
- tabele și coloane PostgreSQL în `snake_case`;
- importuri prin aliasul `@/`;
- validare centralizată, probabil cu Zod;
- separare clară între interfață și regulile de business.

## 37. Medii și variabile de mediu

Proiectul nu va folosi Docker.

Vor exista trei contexte de lucru:

### Local

- aplicația Next.js rulează local;
- Playwright rulează local;
- se folosește proiectul Supabase Development din cloud;
- se folosește Stripe în modul test.

### Preview

- deploymenturi Vercel Preview;
- proiectul Supabase Development/Test;
- Stripe în modul test.

### Production

- Vercel Production;
- proiect Supabase Production separat;
- Stripe live;
- servicii reale de e-mail și livrare.

Vor exista două proiecte Supabase:

- Development/Test;
- Production.

Schema bazei de date va fi versionată prin migrații și testată în Development înainte de Production.

Secretele vor fi păstrate în `.env.local` și în variabilele Vercel. Nu vor fi salvate în Git, documentație sau prompturile pentru Codex.

Variabilele publice și cele strict server-side vor fi separate și validate la pornirea aplicației.

## 38. Autentificare, profiluri și roluri

Supabase Auth va gestiona conturile și sesiunile.

MVP-ul va include:

- autentificare cu e-mail și parolă;
- resetarea parolei;
- confirmarea adresei de e-mail pentru conturile noi;
- checkout fără cont;
- sesiuni persistente.

Confirmarea e-mailului nu va bloca checkout-ul ca vizitator.

Google Sign-In rămâne opțional și va fi implementat doar dacă nu întârzie lansarea.

Roluri inițiale:

- `customer`;
- `admin`.

Vizitatorii neautentificați nu vor avea rol salvat.

Datele vor fi separate astfel:

- Supabase Auth pentru identitate, e-mail și parolă;
- `profiles` pentru datele de bază;
- `customer_addresses` pentru adrese;
- `user_roles` pentru roluri.

Comenzile fără cont vor avea `user_id` nul și nu vor fi asociate automat unui cont doar prin potrivirea e-mailului.

Autorizarea va fi aplicată prin:

- interfață;
- protecția rutelor;
- verificări server-side;
- politici Supabase Row Level Security.

Cheia `service_role` va rămâne exclusiv server-side și va fi folosită doar pentru operațiuni privilegiate justificate.

## 39. Catalog și produse

Magazinul va folosi un model unic și flexibil pentru produse.

Un produs poate fi:

- standard;
- unicat;
- realizat la comandă;
- personalizabil;
- sezonier;
- pachet.

Fiecare produs va putea avea:

- nume;
- descriere;
- preț;
- categorii;
- colecții;
- fotografii;
- disponibilitate;
- stoc;
- termen de expediere sau realizare;
- status de publicare;
- marcaje precum unicat sau personalizabil.

Variantele fixe, precum mărimea, culoarea sau modelul, vor putea avea propriul preț și stoc.

Personalizările vor fi configurate separat și pot avea cost suplimentar.

În MVP, pachetele vor fi administrate ca produse independente.

## 40. Stocuri și disponibilitate

Stocul va fi gestionat la nivel de produs sau variantă.

Statusuri afișate clientului:

- în stoc;
- stoc redus;
- realizat la comandă;
- unicat;
- indisponibil.

Produsele unicat:

- vor avea stoc maxim 1;
- vor fi rezervate temporar în timpul plății;
- vor deveni indisponibile după confirmarea plății;
- vor fi eliberate dacă plata eșuează sau expiră.

Produsele realizate la comandă nu vor necesita stoc fizic, dar pot avea limite și termene de realizare.

Sistemul va preveni vânzarea peste stoc și va marca automat produsele cu stoc redus.

## 41. Coș și checkout

Coșul va funcționa atât pentru vizitatori, cât și pentru utilizatorii autentificați.

Va păstra:

- produsul și varianta;
- cantitatea;
- personalizările;
- prețul estimat;
- eventualele fișiere încărcate.

Coșul vizitatorului poate fi păstrat temporar în browser. Coșul utilizatorului autentificat poate fi salvat în cont.

Checkout-ul va permite:

- comandă fără cont;
- comandă cu cont;
- persoană fizică sau juridică;
- adresă de livrare;
- date de facturare;
- alegerea livrării;
- plata cu cardul sau ramburs;
- verificarea finală a comenzii.

Pe desktop, checkout-ul va fi pe o singură pagină. Pe mobil, va fi împărțit în pași.

Prețul, stocul și totalurile vor fi validate din nou pe server înainte de plasarea comenzii.

Personalizările simple vor putea fi comandate direct. Cererile complexe vor putea intra într-un flux de verificare manuală.

## 42. Comenzi și statusuri

Comenzile vor păstra copii istorice ale:

- produselor;
- prețurilor;
- personalizărilor;
- adreselor;
- totalurilor;
- datelor de contact și facturare.

Statusuri preliminare:

- `new`;
- `awaiting_payment`;
- `paid`;
- `awaiting_customization_review`;
- `in_progress`;
- `ready`;
- `shipped`;
- `completed`;
- `cancelled`;
- `refunded`;
- `returned`.

Orice schimbare importantă va fi salvată într-un istoric separat, împreună cu data, autorul și o notă opțională.

Comenzile vor avea:

- un ID intern sigur;
- un număr public ușor de comunicat clientului.

Formatul public final va fi stabilit după alegerea numelui brandului.

## 43. Plăți

Stripe Checkout va fi folosit pentru plățile cu cardul.

Fluxul principal:

1. se creează comanda cu status de așteptare a plății;
2. clientul este redirecționat către Stripe;
3. Stripe confirmă plata prin webhook;
4. comanda devine plătită.

Pagina de revenire a clientului nu va fi considerată dovadă suficientă a plății.

Pentru plata ramburs:

- comanda se creează direct;
- plata rămâne neachitată până la confirmarea încasării;
- administratorul procesează comanda normal.

Rambursările vor fi inițiate de administrator și salvate în istoricul comenzii.

Cererile complexe de personalizare vor putea fi verificate înainte de solicitarea plății.

## 44. Livrare

Magazinul va livra inițial doar în România.

MVP-ul va pregăti:

- curier la adresă;
- locker, dacă integrarea este rezonabilă;
- ridicare personală, opțional.

Va fi prioritar un singur curier.

Costul livrării va fi afișat în checkout.

Administratorul va putea adăuga numărul de urmărire, iar clientul va primi e-mail la expediere.

Nu se vor implementa inițial:

- mai mulți curieri;
- livrare internațională;
- reguli complexe pe județe;
- calcul avansat după greutate sau dimensiuni.

## 45. Imagini și fișiere

Supabase Storage va fi folosit pentru:

- imaginile produselor;
- fișierele încărcate pentru personalizări.

Imaginile produselor vor fi publice.

Fișierele încărcate de clienți vor fi private și accesibile doar persoanelor autorizate.

Aplicația va valida:

- tipul fișierului;
- dimensiunea;
- numele sigur;
- drepturile de acces.

Nu vor fi acceptate videoclipuri în MVP.

## 46. E-mailuri și notificări

Magazinul va folosi un serviciu extern de e-mail.

E-mailurile operaționale vor include:

- confirmarea contului;
- resetarea parolei;
- confirmarea comenzii;
- confirmarea plății;
- comanda în lucru;
- comanda pregătită;
- expedierea și numărul de urmărire;
- anularea;
- rambursarea.

Newsletter-ul va fi separat de e-mailurile operaționale.

Erorile de trimitere vor fi înregistrate și nu vor bloca procesarea comenzii.

Administratorul va putea retrimite anumite e-mailuri.

Serviciul final de e-mail rămâne de ales.

## 47. Panoul de administrare

Panoul `/admin` va face parte din aceeași aplicație și va fi accesibil doar administratorilor.

Secțiuni principale:

- Dashboard;
- Produse;
- Categorii și colecții;
- Stocuri;
- Comenzi;
- Cereri de personalizare;
- Clienți;
- Recenzii;
- Newsletter;
- Conținut site;
- Setări.

Dashboard-ul va prioritiza:

1. comenzile noi;
2. produsele cu stoc redus;
3. cererile de personalizare;
4. vânzările;
5. produsele populare;
6. recenziile în așteptare.

Administratorul va putea gestiona produsele, imaginile, stocurile, comenzile, personalizările, recenziile, bannerele și conținutul de bază.

Nu se vor construi inițial rapoarte avansate, permisiuni detaliate pentru mulți angajați sau un editor vizual complet.

## 48. Securitate și protecția datelor

Măsuri principale:

- autentificare și roluri;
- politici RLS;
- validarea tuturor formularelor;
- secrete doar pe server;
- protecția rutelor administrative;
- istoric pentru acțiunile importante;
- actualizarea dependențelor;
- backupuri pentru baza de date.

Vor fi colectate doar datele necesare pentru:

- cont;
- comandă;
- livrare și facturare;
- suport;
- newsletter, cu acord separat.

Cookie-urile neesențiale vor fi activate doar după consimțământ.

Vor exista proceduri pentru accesarea, corectarea și ștergerea datelor, cu excepția informațiilor care trebuie păstrate legal.

Termenele exacte de păstrare și textele juridice vor fi validate înainte de lansare.

## 49. Strategia de testare

Playwright va fi folosit pentru fluxurile critice.

Teste obligatorii:

- înregistrare și autentificare;
- navigarea și filtrarea produselor;
- adăugarea în coș;
- checkout fără cont;
- checkout cu cont;
- plata Stripe în modul test;
- plata ramburs;
- produse unicat și lipsa stocului;
- comenzi personalizate;
- accesul la panoul de administrare;
- crearea și editarea produselor;
- schimbarea statusului unei comenzi.

Înainte de integrarea codului se vor verifica:

- TypeScript;
- stilul codului;
- build-ul;
- testele relevante.

Testele vor folosi doar date fictive și servicii de test, niciodată Production.

## 50. Branch-uri și deploy

Fluxul Git va folosi:

- `main` pentru producție;
- `develop` pentru testare integrată;
- branch-uri scurte pentru fiecare task.

Fiecare task Codex va avea propriul branch.

Fluxul general:

1. branch de lucru;
2. verificări și teste;
3. Pull Request;
4. Vercel Preview;
5. merge în `develop`;
6. testare finală;
7. merge în `main`;
8. deploy în producție.

Nu se va lucra direct pe `main`.

Migrațiile bazei de date vor fi validate în Development înainte de Production.

Va exista o procedură clară de revenire după un deploy cu probleme.

## 51. Limitele MVP-ului

### Incluse

- catalog și categorii;
- produse standard, unicat și la comandă;
- variante și personalizări;
- coș și checkout;
- comandă fără cont;
- cont client;
- card prin Stripe și ramburs;
- livrare în România;
- stocuri;
- comenzi și statusuri;
- e-mailuri automate;
- favorite;
- recenzii verificate;
- newsletter simplu;
- panou de administrare;
- teste pentru fluxurile critice.

### Amânate

- mai mulți curieri;
- livrare internațională;
- reduceri și cupoane complexe;
- program de loialitate;
- marketplace cu mai mulți creatori;
- roluri administrative detaliate;
- rapoarte avansate;
- aplicație mobilă;
- integrare social media;
- automatizări complexe;
- recomandări bazate pe AI;
- Google Sign-In, dacă întârzie lansarea;
- sistem complex pentru pachete;
- asocierea automată a comenzilor vechi cu un cont nou.

O funcție nouă va intra în MVP doar dacă este necesară pentru comandă, procesare, administrare, siguranță, obligații legale sau lansare.

## 52. Schema preliminară a bazei de date

### Utilizatori

- `profiles`;
- `user_roles`;
- `customer_addresses`.

### Catalog

- `products`;
- `product_variants`;
- `product_images`;
- `categories`;
- `collections`;
- `product_categories`;
- `product_collections`;
- `customization_options`.

### Stoc

- `inventory`;
- `inventory_movements`;
- `stock_reservations`.

### Coș și favorite

- `carts`;
- `cart_items`;
- `favorites`.

Coșurile vizitatorilor pot rămâne în browser în MVP.

### Comenzi și operațiuni

- `orders`;
- `order_items`;
- `order_item_customizations`;
- `order_status_history`;
- `payments`;
- `shipments`.

### Recenzii și comunicare

- `reviews`;
- `newsletter_subscribers`;
- `contact_requests`;
- `custom_order_requests`.

### Administrare și conținut

- `site_settings`;
- `content_blocks`;
- `notification_logs`;
- `audit_logs`.

Schema exactă va fi implementată prin migrații mici și verificabile.

## 53. Fluxurile principale

Fluxurile principale aprobate:

1. cumpărare fără cont;
2. cumpărare cu cont;
3. plată cu cardul;
4. plată ramburs;
5. comandă personalizată;
6. administrarea unei comenzi;
7. administrarea unui produs;
8. rezervarea și vânzarea unui produs unicat.

Fiecare flux va avea validări, statusuri clare și notificări pentru momentele importante.

## 54. Decizii rămase deschise după Etapa 3

- numele brandului;
- domeniul;
- curierul final;
- integrarea locker;
- costul transportului;
- pragul pentru transport gratuit;
- disponibilitatea ridicării personale;
- plata obligatorie în avans pentru anumite personalizări;
- serviciul final de e-mail;
- metoda de facturare;
- emiterea facturii pentru persoane fizice;
- politica juridică finală de retur;
- textele juridice;
- Google Sign-In;
- asocierea comenzilor fără cont cu un cont creat ulterior;
- perioadele exacte de păstrare a datelor și fișierelor;
- momentul adăugării mai multor roluri administrative;
- formatul final al numărului public de comandă;
- comportamentul produselor unicat vândute;
- limitele de cantitate pentru produsele realizate la comandă;
- serviciul și regulile finale pentru newsletter.

## 55. Concluzia Etapei 3

Etapa 3 este finalizată.

Arhitectura aprobată folosește:

- o singură aplicație Next.js;
- organizare modulară;
- Supabase pentru bază de date, autentificare și storage;
- Stripe Checkout pentru card;
- Vercel pentru hosting și Preview deployments;
- GitHub pentru versionare;
- Playwright pentru testarea fluxurilor critice;
- două proiecte Supabase separate: Development și Production;
- fără Docker;
- checkout cu și fără cont;
- panou de administrare în aceeași aplicație;
- roluri, validări și Row Level Security;
- migrații versionate în repository.

## 56. Următoarea etapă

**Etapa 4 — Planul de dezvoltare**

În etapa următoare vor fi definite:

- ordinea implementării;
- fazele și sprinturile;
- dependențele dintre funcționalități;
- task-urile mici pentru Codex;
- criteriile de acceptare;
- testele și comenzile de verificare;
- punctele de control;
- pregătirea mediilor și a repository-ului;
- traseul de la proiect gol la MVP lansabil.

# Etapa 4 — Planul de dezvoltare

## 57. Obiectivul Etapei 4

Etapa 4 stabilește traseul complet de la repository gol la MVP lansabil.

Planul urmărește:

- implementarea în ordine logică;
- împărțirea muncii în task-uri mici pentru Codex;
- verificarea fiecărui task înainte de continuare;
- reducerea riscului de refacere;
- păstrarea costurilor și complexității sub control;
- lansarea rapidă, fără compromisuri asupra fluxurilor critice.

Codex nu va primi faze întregi într-un singur prompt. Fiecare fază va fi împărțită în task-uri independente, clare și verificabile.

## 58. Fazele de dezvoltare

Ordinea aprobată este:

1. Pregătirea proiectului;
2. Fundația aplicației;
3. Catalog, produse și stocuri;
4. Magazinul public;
5. Coșul și checkout-ul;
6. Plăți online și rezervarea stocului;
7. Administrarea comenzilor și notificări;
8. Funcțiile secundare ale MVP-ului;
9. Testare completă și securizare;
10. Pregătirea lansării.

Ordinea este obligatorie, cu excepția task-urilor care pot fi executate în paralel fără dependențe sau riscuri.

## 59. Faza 1 — Pregătirea proiectului

Scopul este obținerea unei aplicații care rulează local, are Preview deployment și este conectată în siguranță la serviciile de Development.

Task-uri principale:

1. crearea repository-ului GitHub;
2. crearea branch-urilor `main` și `develop`;
3. inițializarea aplicației Next.js;
4. configurarea TypeScript, App Router, Tailwind CSS și ESLint;
5. crearea structurii inițiale de directoare;
6. adăugarea scripturilor de verificare;
7. configurarea variabilelor de mediu;
8. conectarea la Supabase Development;
9. configurarea Vercel Preview;
10. adăugarea unui test Playwright de bază;
11. verificarea completă a fazei.

Criterii de finalizare:

- aplicația rulează local;
- Supabase Development este conectat;
- Vercel Preview funcționează;
- secretele nu sunt salvate în Git;
- verificările proiectului trec;
- nu se folosește Docker.

## 60. Faza 2 — Fundația aplicației

Scopul este implementarea bazei de date inițiale, autentificării, profilurilor, rolurilor și permisiunilor.

Task-uri principale:

- migrațiile pentru `profiles`, `user_roles` și `customer_addresses`;
- crearea automată a profilului și rolului `customer`;
- înregistrare, autentificare și deconectare;
- resetarea parolei;
- confirmarea adresei de e-mail;
- sesiuni persistente;
- rolurile `customer` și `admin`;
- protecția rutelor administrative;
- politici Row Level Security;
- administrarea profilului și adreselor;
- layout-uri separate pentru magazin, cont și administrare;
- teste pentru autentificare, roluri și izolarea datelor.

Criterii de finalizare:

- migrațiile sunt stabile;
- autentificarea funcționează local și în Preview;
- profilurile și rolurile sunt create corect;
- fiecare utilizator vede doar propriile date;
- accesul administrativ este protejat;
- cheia `service_role` nu ajunge în browser.

## 61. Faza 3 — Catalog, produse și stocuri

Scopul este construirea bazei administrabile a magazinului.

Task-uri principale:

- schema pentru produse, variante, imagini, categorii și colecții;
- opțiuni de personalizare;
- modelul de disponibilitate;
- administrarea categoriilor și colecțiilor;
- administrarea produselor;
- variante cu preț și stoc propriu;
- personalizări cu cost suplimentar;
- imagini în Supabase Storage;
- inventar și istoric al modificărilor;
- teste pentru catalog și acces administrativ.

Criterii de finalizare:

- administratorul poate gestiona catalogul fără acces direct la baza de date;
- imaginile, variantele și personalizările funcționează;
- stocurile sunt urmărite;
- produsele unicat respectă limita maximă de 1;
- datele sunt pregătite pentru magazinul public.

## 62. Faza 4 — Magazinul public

Scopul este construirea interfeței vizibile pentru clienți.

Task-uri principale:

- layout public, header, navigare, footer și meniu mobil;
- homepage;
- pagina Magazin;
- pagini dinamice pentru categorii și colecții;
- căutare;
- filtre și sortare;
- carduri de produs;
- pagina produsului;
- selectarea variantelor și personalizărilor;
- validarea configurației produsului;
- SEO de bază;
- testarea experienței desktop și mobile.

Criterii de finalizare:

- catalogul poate fi explorat ușor;
- produsele sunt prezentate clar;
- filtrele și căutarea funcționează;
- configurațiile invalide sunt blocate;
- produsele indisponibile nu pot fi cumpărate;
- experiența mobilă este funcțională.

## 63. Faza 5 — Coșul și checkout-ul

Scopul este permiterea unei comenzi complete, inclusiv fără cont, înainte de integrarea finală Stripe.

Task-uri principale:

- structura coșului;
- coș pentru vizitatori;
- coș pentru utilizatori autentificați;
- pagina coșului;
- validarea server-side a prețului și stocului;
- checkout pentru persoană fizică și juridică;
- date de livrare și facturare;
- metode configurabile de livrare;
- crearea comenzilor cu copii istorice ale datelor;
- comenzi ramburs;
- golirea sigură a coșului;
- prevenirea comenzilor duplicate;
- teste complete pentru coș și checkout.

Criterii de finalizare:

- coșul funcționează pentru vizitatori și clienți autentificați;
- checkout-ul funcționează fără cont;
- prețurile și stocurile sunt validate pe server;
- comenzile ramburs sunt create corect;
- comenzile vechi nu sunt afectate de modificarea produselor;
- comenzile duplicate sunt prevenite.

## 64. Faza 6 — Plăți online și rezervarea stocului

Scopul este integrarea Stripe și protejarea stocului în timpul procesului de plată.

Task-uri principale:

- integrarea Stripe Checkout în modul test;
- crearea plății pentru o comandă eligibilă;
- webhook-uri Stripe;
- verificarea autenticității evenimentelor;
- actualizarea sigură și idempotentă a plății și comenzii;
- rezervări temporare de stoc;
- expirarea și eliberarea rezervărilor;
- protecția produselor unicat împotriva cumpărării simultane;
- tratarea plăților reușite, eșuate sau expirate;
- rambursări inițiate de administrator;
- teste Stripe în modul test.

Criterii de finalizare:

- pagina de revenire nu este considerată dovadă a plății;
- webhook-ul este sursa confirmării plății;
- evenimentele repetate nu produc efecte duplicate;
- stocul nu poate deveni negativ;
- un produs unicat nu poate fi vândut de două ori;
- rezervările expirate sunt eliberate corect.

## 65. Faza 7 — Administrarea comenzilor și notificări

Scopul este permiterea procesării complete a comenzilor de către administrator.

Task-uri principale:

- listarea și filtrarea comenzilor;
- pagina detaliată a comenzii;
- schimbarea controlată a statusurilor;
- istoricul statusurilor;
- procesarea cererilor de personalizare;
- introducerea numărului de urmărire;
- administrarea expedierii;
- anulări și rambursări;
- e-mailuri operaționale;
- jurnalizarea încercărilor de trimitere;
- retrimiterea anumitor notificări;
- dashboard pentru comenzi noi, stoc redus și personalizări;
- teste pentru procesarea completă a unei comenzi.

Criterii de finalizare:

- administratorul poate procesa o comandă de la creare până la finalizare;
- schimbările importante sunt păstrate în istoric;
- clientul primește notificările relevante;
- erorile de e-mail nu blochează procesarea comenzii;
- accesul la datele comenzilor este controlat.

## 66. Faza 8 — Funcțiile secundare ale MVP-ului

Scopul este completarea funcțiilor necesare lansării care nu fac parte direct din fluxul principal de checkout.

Task-uri principale:

- contul clientului;
- istoricul comenzilor;
- vizualizarea unei comenzi;
- favorite pentru utilizatori autentificați;
- recenzii verificate și moderate;
- newsletter simplu;
- formular de contact;
- cereri generale pentru comenzi personalizate;
- pagini de conținut;
- administrarea bannerelor și blocurilor principale;
- statistici administrative de bază.

Criterii de finalizare:

- clientul își poate vedea comenzile;
- favoritele sunt private;
- doar cumpărătorii eligibili pot trimite recenzii verificate;
- newsletter-ul folosește consimțământ separat;
- paginile și conținutul esențial pot fi administrate.

## 67. Faza 9 — Testare completă și securizare

Scopul este verificarea tuturor fluxurilor critice și eliminarea riscurilor înainte de producție.

Activități principale:

- teste end-to-end pentru fluxurile critice;
- verificarea politicilor RLS;
- verificarea rolurilor și rutelor administrative;
- testarea izolării datelor între utilizatori;
- testarea stocului și produselor unicat;
- testarea comenzilor cu cardul și ramburs;
- testarea personalizărilor și fișierelor private;
- validarea formularelor;
- verificarea variabilelor de mediu;
- verificarea dependențelor;
- testarea responsive și mobilă;
- verificări de accesibilitate de bază;
- testarea erorilor și scenariilor de revenire;
- verificarea build-ului și Preview deployment-ului.

Criterii de finalizare:

- toate fluxurile critice trec;
- nu există vulnerabilități cunoscute critice;
- datele private nu sunt accesibile neautorizat;
- nu există erori critice pe mobil;
- build-ul și testele obligatorii trec.

## 68. Faza 10 — Pregătirea lansării

Scopul este configurarea serviciilor reale și publicarea MVP-ului.

Activități principale:

- crearea și configurarea Supabase Production;
- aplicarea migrațiilor validate;
- configurarea Stripe live;
- alegerea și configurarea serviciului de e-mail;
- configurarea curierului și regulilor reale de livrare;
- configurarea domeniului;
- configurarea facturării;
- adăugarea politicilor juridice validate;
- adăugarea produselor, imaginilor și conținutului reale;
- configurarea backupurilor;
- pregătirea procedurii de rollback;
- testarea unei comenzi complete;
- merge în `main` și deploy final.

Magazinul poate fi lansat doar când:

- plățile cu cardul și ramburs funcționează;
- stocurile se actualizează corect;
- produsele unicat sunt protejate;
- e-mailurile sunt livrate;
- administratorul poate procesa comenzile;
- site-ul funcționează bine pe mobil;
- politicile obligatorii sunt publicate;
- testele critice nu au erori.

## 69. Dimensiunea task-urilor Codex

Fiecare task trebuie să urmărească un singur rezultat principal.

Exemple potrivite:

- inițializarea proiectului Next.js;
- configurarea variabilelor de mediu;
- crearea migrației pentru profiluri;
- implementarea paginii de autentificare;
- protejarea rutelor `/admin`;
- crearea formularului de produs.

Exemple prea mari:

- construirea întregului magazin;
- implementarea catalogului și checkout-ului într-un singur task;
- construirea întregului panou de administrare.

Migrațiile, regulile de business și modificările mari de interfață vor fi separate când acest lucru permite verificarea mai sigură.

## 70. Formatul standard al promptului pentru Codex

Fiecare prompt va conține:

1. contextul proiectului și faza curentă;
2. un singur obiectiv clar;
3. cerințele exacte;
4. restricțiile;
5. criteriile de acceptare;
6. verificările obligatorii;
7. raportul final solicitat.

Restricții standard:

- respectarea Project Bible;
- utilizarea tehnologiilor aprobate;
- fără Docker;
- fără servicii noi neaprobate;
- fără schimbări nejustificate în afara task-ului;
- fără secrete sau date reale în repository;
- fără lucru direct pe `main`;
- fără funcționalități noi neincluse în MVP.

La finalul fiecărui task, Codex trebuie să prezinte:

- rezumatul modificărilor;
- fișierele importante create sau modificate;
- comenzile rulate;
- rezultatele verificărilor;
- lucrurile care nu au putut fi verificate;
- riscurile, limitările sau pașii manuali rămași.

## 71. Verificările obligatorii

În funcție de task, Codex va rula toate verificările relevante disponibile:

- verificarea TypeScript;
- lint;
- build;
- testele unitare sau de integrare disponibile;
- testele Playwright relevante;
- aplicarea sau verificarea migrațiilor;
- verificarea manuală locală;
- verificarea Preview deployment-ului.

Un task nu este considerat terminat doar pentru că a fost scris codul.

Dacă o verificare nu poate fi executată, Codex trebuie să explice clar motivul și pașii necesari pentru verificarea manuală.

## 72. Fluxul de lucru pentru fiecare task

Fluxul aprobat este:

1. se creează un branch scurt pentru task;
2. Codex citește Project Bible și fișierele relevante;
3. implementează doar obiectivul task-ului;
4. rulează verificările;
5. oferă raportul final;
6. modificările sunt analizate;
7. se verifică Preview deployment-ul, când este relevant;
8. problemele sunt corectate;
9. task-ul este aprobat;
10. abia apoi începe următorul task dependent.

Nu se trimit toate task-urile simultan.

## 73. Punctele de control

După fiecare fază se va face un punct de control care include:

- verificarea tuturor criteriilor de acceptare;
- rularea testelor relevante;
- verificarea migrațiilor;
- verificarea accesului și securității;
- verificarea interfeței în Preview;
- actualizarea documentației;
- confirmarea că nu au fost introduse costuri sau servicii neaprobate;
- aprobarea continuării.

Problemele fundației trebuie rezolvate înainte de trecerea la fazele dependente.

## 74. Ordinea primelor task-uri

Primele task-uri pentru Codex vor fi:

1. crearea repository-ului și pregătirea structurii Git;
2. inițializarea aplicației Next.js;
3. adăugarea structurii de directoare;
4. configurarea scripturilor de verificare;
5. configurarea variabilelor de mediu;
6. conectarea la Supabase Development;
7. configurarea Vercel Preview;
8. adăugarea primului test Playwright;
9. verificarea completă a Fazei 1.

Primul task efectiv va fi:

**Task 1.1 — Crearea repository-ului și pregătirea structurii Git.**

Acesta va include repository-ul GitHub, branch-urile `main` și `develop`, `.gitignore`, `README.md`, directorul `docs`, Project Bible și regulile privind Docker și secretele.

## 75. Reguli privind costurile și serviciile externe

Orice serviciu nou, plan plătit sau cost recurent trebuie prezentat și aprobat înainte de adoptare.

În Development se vor prefera:

- planurile gratuite;
- modurile de test;
- datele fictive;
- integrările minime necesare.

Nu se vor activa servicii live sau plăți reale înainte de Faza 10.

## 76. Decizii care trebuie rezolvate înainte de lansare

În timpul implementării pot rămâne temporar deschise, dar trebuie rezolvate înainte de Faza 10:

- numele brandului și domeniul;
- curierul și integrarea locker;
- costul transportului și pragul pentru transport gratuit;
- ridicarea personală;
- plata în avans pentru personalizări;
- serviciul de e-mail;
- facturarea;
- regulile fiscale;
- politicile juridice;
- politica finală de retur;
- regulile finale pentru newsletter;
- perioadele de păstrare a datelor;
- comportamentul produselor unicat vândute;
- limitele produselor realizate la comandă.

Aceste decizii nu trebuie să blocheze task-urile care pot folosi configurări temporare și clar delimitate.

## 77. Concluzia Etapei 4

Etapa 4 este finalizată și aprobată.

Planul de dezvoltare stabilește:

- zece faze de implementare;
- ordinea dependențelor;
- task-uri mici și verificabile pentru Codex;
- un branch separat pentru fiecare task;
- criterii de acceptare și verificări obligatorii;
- puncte de control după fiecare fază;
- interdicția de a folosi Docker;
- aprobarea prealabilă a oricărui cost sau serviciu nou;
- traseul complet de la repository gol la MVP lansabil.

Implementarea va începe cu Faza 1 și Task 1.1. Codex va primi un singur task o dată, iar continuarea se va face numai după verificarea rezultatului.

## 78. Următoarea etapă

**Etapa 5 — Implementarea ghidată cu Codex**

În etapa următoare:

- va fi pregătit promptul complet pentru Task 1.1;
- Codex va începe lucrul în repository;
- rezultatul fiecărui task va fi analizat;
- problemele vor fi transformate în task-uri de corecție;
- Project Bible va fi actualizat când apar decizii aprobate;
- dezvoltarea va continua progresiv până la MVP.


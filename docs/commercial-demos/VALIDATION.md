# Validare 10B.4 — Commercial Demo Showcase

Data: 2026-10-27. Bază template: `0081812` (ultimul develop la începutul task-ului).
Branch: `task/10b4-commercial-demos`. Doar tooling local, fixtures, assets și
documentație; sursa `src/`, schema, infrastructura și logica ecommerce nu se schimbă.

## Mecanisme reutilizate

- `src/lib/config/store.ts`, cele trei palete din `theme.ts`, StoreBrand și
  metadatele existente. Configul fiecărui profil se aplică numai copiei temporare.
- `get_public_store_settings`, `get_public_homepage_blocks` și catalogul public:
  aceleași cititoare/componente SSR, cu date HTTP locale fictive în loc de Supabase.
- ProductConfigurator și coșul browser existente, fără reguli diferite per brand.
- Playwright instalat și experiența testelor 10B.2c; noul runner evită guard-urile
  și fixtures cloud istorice printr-un harness local separat, fără să le modifice.
  Aceasta nu rezolvă blocajul E2E complet per-client.

Nu s-au rulat seed-urile/installerele remote, nici testele care depind de Development
sau demo existente. Datele și comanda Sandbox de audit au rămas neatinse.

## Verificări locale executate

| Verificare | Rezultat |
| --- | --- |
| Export determinist, 3 profiluri × 10 produse | PASS; JSON și SVG originale versionate |
| `npm run test:showcase` | 4/4 PASS: contracte Settings/assets/catalog/inventar, provenance SVG, API read-only/izolare, environment fără credențiale |
| `npm run test:theme` | 8/8 PASS |
| `npm run test:settings` | 6/6 PASS |
| `npm run test:config` | 8/8 PASS |
| `npm run test:email` | 8/8 PASS, fără trimitere reală |
| ESLint și TypeScript | PASS |
| Build-uri `next build --webpack` în workspace temporar | 3/3 PASS, urmate de `next start` |
| `npm run showcase:capture` | PASS pentru Iris, Soare și Poveste; 24 capturi + comparație |
| Scan secrete și manifest migrații | PASS, zero match-uri; 29 migrări intacte |
| Linkuri și diff | Linkuri relative valide; diff verificat, fără modificări `src/`/Supabase/launch |

[Rezultatele capturii](validation.json) consemnează pentru fiecare profil zero
erori JS, zero cereri externe și zero endpoint-uri fixture refuzate neașteptat.
Iris: varianta 141 RON; Soare: varianta 87 RON; Poveste: 119 RON + 18 RON
personalizări = 137 RON. Home/categorie/catalog/produs au fost navigate în browser;
coșul browser și izolarea contextelor au fost verificate. Total unit: **34/34 PASS**.
Capturile homepage, produs și opțiuni au fost inspectate vizual, inclusiv
personalizările mobile și comparația celor trei identități.

Prima încercare a testului Node în sandbox a fost refuzată cu `spawn EPERM`;
rerularea cu subprocese locale autorizate a trecut. Nu s-au schimbat assertions
ca să ascundă refuzul infrastructurii. Node afișează warning-ul existent
MODULE_TYPELESS_PACKAGE_JSON la importul fișierelor TypeScript; nu s-a schimbat
tipul întregului package pentru a elimina un warning în acest task.

Prima captură Iris a produs imagini, dar verificarea contextului gol a citit
localStorage înainte de hidratare și a eșuat pe null. Runner-ul a fost corectat
să aștepte hidratarea; rezultatele acceptate sunt numai cele ale rulării complete
ulterioare, nu fișierele produse de execuția eșuată.

## Ce verifică automat captura

Pentru fiecare profil: build Next real, pornire loopback, răspuns HTTP 200,
Settings/Homepage/reviews RPC citite, identitate proprie și absența celorlalte,
paletă/logo/favicon, 8 produse în homepage/10 în catalog și categoria potrivită,
imagini încărcate, lipsă overflow la 320/390/1440 px, produs real, selecție variantă
și preț actualizat, personalizări text/selecție/Da-Nu pentru Poveste, adăugare în
coș local și context browser separat gol. Se cer zero erori JS și zero cereri
externe/refuzate neașteptate. Serverul local respinge writes, Auth și plăți.

Screenshot-uri per profil: homepage desktop complet și primul ecran, homepage
mobile, catalog desktop, produs desktop/mobile și opțiuni desktop/mobile.
Comparația combină primele ecrane. Viewports: desktop 1440×1000, mobile 390×844;
320 px verificat suplimentar pentru overflow. Testarea nu reprezintă audit complet
de accesibilitate ori de compatibilitate pe toate dispozitivele.

## Ce nu este validat

**NOT RUN:** Supabase/RLS real, Auth/admin save, Storage remote, stoc/rezerve
tranzacționale, checkout, email delivery, Stripe/webhook/plată/refund și deployment
public. Inventarul din JSON nu confirmă stoc fizic. Nu există recenzii sau plăți
fabricate și nu s-a simulat o plată reușită.

Serverul HTTP de fixtures nu este Supabase și nu se instalează pe cloud. Aceste
demo-uri sunt prezentabile local, nu magazine live funcționale. Publicarea
necesită resurse separate și aprobare de ownership/costuri/config/testare;
modelul per-client nu se schimbă. Blocajele Stripe Live și E2E per-client din
[launch](../client-delivery/internal/production-launch.md) rămân în vigoare.

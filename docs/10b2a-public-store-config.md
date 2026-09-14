# 10B.2a — Public store configuration

Data: 15 septembrie 2026. Verdict tehnic: **PASS**, fără merge; așteaptă review.
Branch: `task/10b2a-public-store-config`, pornit din `develop` actualizat la
`cbef493a17c1881007637195c8bf1b73d2345cf7` (PR #49, integrarea 10B.1).

## Contract și consumatori

`src/lib/config/store.ts` exportă `PublicStoreConfig` readonly, versiunea 1,
`STORE_CONFIG` și helperii puri `storeTitle`, `storeText`, `storeMetadata`.
Include nume, tagline, descriere scurtă, descriere SEO, footer, copy public/fallback,
contract declarativ fix RO/ro-RO/RON/Europe/Bucharest și cale statică OG opțională.
Nu citește DB, env sau rețeaua; singurul import este un tip Next.js, eliminat la build.

| Zonă | Implementare |
| --- | --- |
| Storefront / homepage / footer | Numele și copy-ul implicit vin din config; sloturile editoriale deja salvate păstrează prioritatea existentă |
| Auth / account / admin | Nume și titluri comune; nicio schimbare de sesiune, redirect, rol sau bootstrap |
| Global error | Helper pur importabil client-side; nu depinde de funcționarea Supabase |
| SEO | Root metadata, Open Graph, Twitter, template titlu storefront și descrieri publice folosesc aceeași identitate |
| Produse / taxonomii | Nume și descrieri dinamice rămân din catalog; fallback-uri neutre; Open Graph produs primește siteName comun |
| Email | Semnătura text și brandingul HTML folosesc config; HTML escapate inclusiv pentru nume; subiectele fără brand rămân identice |
| Assets | OG static opțional; `null` nu adaugă imagine. Branding text fără logo inventat. Favicon existent prin convenția Next.js; fără upload, bucket sau theme editor |

Nu sunt inventate date de contact/social: nu existau adrese sau linkuri de brand
afișate de centralizat; formularul `/contact` rămâne canalul existent.
APP_URL și FROM/REPLY_TO rămân env. Nicio setare financiară, de inventar sau acces
nu intră în config. Resend delivery/dedupe/idempotency/retry nu sunt modificate.

## Copy și auditul hardcode-urilor

Au fost eliminate presupunerile universale despre atelier, producție manuală,
serii mici sau livrare oriunde. Hero, promo, argumentele de prezentare și empty states
au fallback-uri ecommerce neutre. Nu sunt rescrise date editoriale existente în DB.

Scanare cu `rg` pentru `Brand Handmade|handmade|atelier|lucrate manual|lucrat manual`:

- **Intenționat:** `STORE_CONFIG.name` este unica valoare implicită de branding UI/SEO/email.
- **Compatibilitate:** `handmade-store-cart-v1` și cele două utilizări ale prefixului
  `brand-handmade:card-checkout:` sunt neschimbate. Rebrandingul nu golește coșul.
- **Identitate tehnică, păstrată intenționat:** `src/lib/stripe/client.ts` păstrează
  appInfo SDK `Brand Handmade`. Nu reprezintă brandingul UI sau al paginii Stripe
  Checkout și nu a fost modificată integrarea Stripe în acest task. Poate fi evaluată
  separat ca identitate stabilă a template-ului, nu ca setare financiară editabilă.
- **Teste:** textul `Atelier administrabil 8C` verifică explicit conținut editorial
  fictiv; testele noi verifică prefixele istorice. Nu sunt date comerciale reale.
- **Istoric/documentație:** Project Bible, auditul 10B.1, checklist onboarding și
  introducerea README păstrează contextul original. Nicio înlocuire globală oarbă.

README nu mai descrie proiectul ca prototip Faza 1. Secțiunea
`Store identity configuration` explică modificările sigure, prioritățile fallback,
asset handling și separarea strictă față de secrete/env.

## Verificări executate

| Verificare | Rezultat |
| --- | --- |
| `npm run test:config` | **8/8 PASS**, 0 skipped |
| `npm run test:email` | **8/8 PASS**, 0 skipped |
| Playwright focalizat | **43/43 PASS**, 30.2s, 0 failed/skipped |
| Chromium complet, 6 workers | **170/170 PASS**, 1.4m, 0 failed/skipped/not-run |
| ESLint | PASS |
| TypeScript | PASS |
| Next.js production build | PASS, 37/37 pagini statice generate |
| `git diff --check` | PASS |
| SQL regression | N/A: fără modificări SQL/schema/RPC/RLS |

Cele 43 teste focalizate: `store-identity`, `ux-accessibility-seo`, `homepage`,
`login`, `register`, `password-reset`, `email-confirmation`, `admin-access`.
Suita completă include regresia catalog, coș/checkout, comenzi, Stripe/concurrency,
notificări, conturi, RLS/security, reviews, formulare/conținut și homepage admin.
Nu au fost introduse skip-uri, șterse teste sau slăbite assertions. Assertions pe
vechiul titlu homepage și titlul Magazin folosesc acum valoarea exactă din config.

Cele două branduri fictive (bijuterii/lumânări) sunt numai fixture-uri unitare.
Aceiași helperi generează titluri, metadata și texte Auth/contact diferite.
Pentru fiecare brand, toate cele opt emailuri sunt comparate cu baseline-ul:
numai brandingul diferă, subiectul și conținutul operațional rămân identice.
Sunt testate escaping-ul, fallback-ul OG, lipsa dependențelor DB/env și cheile browserului.

Rularea inițială a runnerului Node în sandbox a fost blocată de `spawn EPERM`;
verificările au fost executate cu permisiunea necesară de pornire a proceselor.
Logurile conțin avertismente Node module-type/color și mesaje Next.js
`The destination stream closed early` în timpul navigărilor E2E, fără test eșuat.
Mesajele despre Resend neconfigurat și semnături Stripe invalide provin din
scenariile negative existente. Nu s-a ascuns output-ul prin schimbarea aplicației.

## Limite și siguranță

- Fără modificări de schemă, migrații, RLS, RPC sau business logic.
- Testele folosesc infrastructura și fixture-urile Development existente;
  nu reprezintă o promisiune că datele Development sunt byte-identice după E2E.
- Nicio dependență adăugată/actualizată; lockfile neschimbat. Script nou `test:config`.
  `allowImportingTsExtensions` cu `noEmit` permite importul aceluiași modul în
  Node strip-types și Next.js, fără loader sau pachet suplimentar.
- Scanare țintită a diff-ului pentru formate de secrete și review manual:
  fără secrete noi; `.env.example` rămâne singurul `.env*` tracked.
- Costuri, servicii, conturi și resurse noi: **0**.
- Nu s-au operat Supabase Production, Vercel Production, Stripe Live, Resend
  Production sau DNS. `main` nu a fost modificat și nu s-a făcut merge în `develop`.
- Arhiva și tag-ul Fazei 9 rămân la `6d84c236d4a91f460549be4cf175fd68e0ca1615`.

## Recomandare pentru 10B.2b — neînceput

După aprobare separată: Admin Store Settings minim, cu singleton pentru un allowlist
de câmpuri strict publice, validare server-side și privilegii admin restrictive.
Definiți explicit prioritatea DB validă → config versionat, invalidarea cache-ului
pentru storefront/SEO/email și fallback fără DB pentru global-error. Nu includeți
secrete, reguli ecommerce, upload-uri sau theme editor în acel contract.

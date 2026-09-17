# 10B.2c — Theme & Brand Assets

Data: 17 septembrie 2026. Branch: `task/10b2c-theme-brand-assets`.
Bază: `develop` = `origin/develop`, `c6597ff6c7e572d1c2ffe55975f205e953a5145c`.
Checkpoint: **PASS**. Fără merge și fără 10B.2d; se așteaptă review-ul ChatGPT.

## Arhitectură și operare

O singură identitate: **Admin Store Settings → fallback `src/lib/config/store.ts`**.
Cele 11 câmpuri text/contact existente rămân administrabile; `resolveStoreSettings`
păstrează paleta și asset-urile versionate și ignoră câmpuri DB nepermise.
Nu există alt config de identitate, upload, CSS/HTML/JS arbitrar sau font URL.

Model ales: **A — asset-uri statice/versionate**, palete tipate. Schimbările vizuale
cer developer/release; proprietarul poate schimba textele din `/admin/settings`.
Explicația acestei limite apare și în pagina Admin. Cache invalidation și public
projection rămân cele din 10B.2b, fără cache persistent adăugat.

### Palete și tokeni

`theme.ts` conține `evergreen`, `plum`, `terracotta`. `store.ts` selectează presetul.
Tokeni CSS: `primary`, `hover`, `foreground`, `accent`, `background`, `surface`,
`text`, `muted`, `border`, `focus`, `tint`, `strong`, `onStrong`, prefix `--brand-`.
Tailwind folosește aliasuri semantice (`bg-brand`, `text-brand`, etc.).
Valorile sunt hex literale revizuite în cod. Temă necunoscută → `evergreen`.
Nu acceptăm expresii CSS, `url()`, variabile arbitrare sau date administrabile în style.
Layout-ul rădăcină și global-error citesc paleta statică, fără o citire DB nouă.

Integrare: header/footer, hero/promo, catalog, carduri/galerie/configurator, coș,
checkout, formulare Auth/account, shell admin și butonul Store Settings.
Admin păstrează suprafețele neutre întunecate; accentul deschis și focus-ul sunt
potrivite pentru acestea. Culorile de status/error/success/warning/plăți/comenzi,
badge-urile de eligibilitate și disponibilitate nu sunt tokeni de brand.
Fontul Arial/Helvetica/sans-serif rămâne comun; fără încărcări externe.

### Logo, favicon și OG

- `assets.logo`: `null` → nume textual; cale validă → componenta comună StoreBrand
  în header storefront/account, slot fix 192×48, object-contain și alt = nume.
  Erorile de încărcare păstrează slotul și afișează numele. React escapează alt/text.
  Footer/Auth/admin/email păstrează identitatea textuală potrivită contextului.
- `assets.icon`: metadata `icons.icon`, fallback `/branding/icon.svg`. ICO-ul starter
  a fost mutat fără modificare în `public/branding/legacy-favicon.ico`, nu mai este
  o convenție Next care suprascrie configul. Nu este referit implicit.
- `assets.ogImage`: **imagine produs → imagine brand → `/brand-og`**. Ultimul fallback
  este PNG generic 1200×630, prerandat static la build prin ImageResponse, fără
  DB, input de request, imagini/fonturi externe. Produsul păstrează titlu/descriere
  și imagine proprie, inclusiv Twitter. APP_URL rămâne exclusiv în env.
- Asset-urile brand sunt fișiere plate sub `public/branding`; fără traversal,
  query/fragment, `%` encoding, URL extern, data URL sau extensii executabile.
  Logo: PNG/JPEG/WebP/SVG; icon: PNG/ICO/SVG; OG: PNG/JPEG/WebP.
  SVG este doar cod versionat/revizuit, nu input sau upload de utilizator.
  Nu s-a modificat bucket-ul product-images sau vreun grant/policy Storage.
- Schimbă numele fișierului (`logo-v2.svg`, `og-v2.png`) pentru cache busting și
  verifică browser/social cache după release. Fișierele trebuie să existe în release;
  nu există mecanism runtime de fetch/fallback pentru un OG configurat dar șters.

Instrucțiuni per client: [onboarding](client-onboarding-checklist.md), secțiunea
Branding versionat. Nu există installer sau clean-install implementat în acest task.

### Email și limite de securitate

Rendererul comun folosește numele cu escaping existent și culoarea principală din
paleta allowlisted. Emailurile rămân text + HTML și funcționează fără logo. Nicio
schimbare la sender/reply-to, delivery, retry, dedupe, idempotency sau failure isolation.
Nicio schimbare la Stripe/COD, stocuri, rezervări, refund, shipments, stări, review
eligibility sau Auth security; cheile browserului sunt identice.
Comparația AST a celor opt componente critice modificate confirmă diferențe doar
de prezentare (clase CSS), după normalizarea LF/CRLF; serviciile business sunt intacte.

## Demonstrație și accesibilitate

Fixture-uri exclusiv în `tests/fixtures/brands.ts`, niciodată salvate în DB:

| Config | Nume | Logo | Primary | Accent | OG |
| --- | --- | --- | --- | --- | --- |
| plum | Bijuterii Iris | SVG fictiv servit numai în test | #701a75 | #fae8ff | /branding/iris-og.png |
| terracotta | Lumânări Soare | fallback textual | #9a3412 | #ffedd5 | /branding/soare-og.png |

Același StoreBrand, HeroBlock și ProductCard sunt randate într-un component harness
cu CSS-ul build-ului real, nu componente duplicate sau route public de test.
Screenshot-uri mobile/desktop sunt produse în test-results. Metadata/OG și email
sunt verificate cu aceleași două configuri. Testele pe rutele aplicației schimbă doar
variabilele CSS în browser pentru a verifica integrarea ambelor palete în header,
footer, home/shop/produs/coș/checkout/Auth/account/admin. Nu pretindem două deploy-uri.

Teste unitare: contrast text cel puțin 4.5:1 pe combinațiile esențiale; focus/border
cel puțin 3:1. Inverse surfaces au focus deschis. Teste browser: 320/375/1280 px,
fără overflow, logo cu dimensiune fixă, skip link cu tastatura, primary CTA,
disabled state și regresia 9B. Nu reprezintă un audit WCAG integral certificat.

## Verificări

| Verificare | Rezultat |
| --- | --- |
| SQL 10B.2c | N/A — fără DB/Storage changes sau migrare nouă |
| Development project ref | `bdyocajhhylvasfhmnal` confirmat |
| Migration list / dry-run | 28/28 Local = Remote; upToDate=true, migrations=[] |
| Store Settings SQL | 53/53 PASS, transaction + rollback |
| Security data integrity SQL | PASS, 59 instrucțiuni ASSERT în script, rollback |
| Homepage/admin stats SQL | PASS, 31 instrucțiuni ASSERT în script, rollback |
| Operational notifications COD SQL | PASS, 39 instrucțiuni ASSERT în script, rollback |
| RLS/public projection/admin writes | PASS prin regresia SQL și Store Settings E2E |
| Storage nou / upload MIME/size | N/A — nu există upload sau Storage nou |
| Unit theme/config/settings/email | 30/30 PASS (8 + 8 + 6 + 8) |
| Playwright 10B.2c | 8/8 PASS + 4/4 Store Settings dependency |
| Regresie storefront/Auth/admin/homepage | 53/53 PASS, inclusiv dependency |
| Chromium complet | 182 PASS / 0 FAILED / 0 SKIPPED / 0 NOT RUN, 2.2 minute |
| ESLint | PASS |
| TypeScript | PASS |
| Next production build | PASS; `/brand-og` static |

Numărul de instrucțiuni ASSERT în cele trei scripturi istorice nu este un contor
runtime de ramuri: unele verifică refuzuri prin excepții. Toate scripturile au
încheiat cu exit 0 și rollback, fără modificări de schemă.

În rulările intermediare, testul original Store Settings a observat autentificarea
încă pending. A fost eliminată citirea DB redundantă introdusă inițial în root layout;
paleta versionată nu o necesită. Testul original a fost păstrat integral și a trecut
în rerulările focalizate. Nu există skip-uri, timeout-uri mărite sau assertions slăbite.
Component harness folosește explicit runtime-ul JSX React, nu transformarea implicită
Playwright pentru componente. Logurile de navigare conțin mesajul Next existent
`The destination stream closed early`; nu este ascuns. Testele negative de email/Stripe
pot emite erorile controlate așteptate. Nu se trimit emailuri reale de branding.

## Livrare și limite

- README, planul de productizare și onboarding actualizate; registrul migrațiilor
  nu necesită modificare deoarece nu există migrare.
- Branch dedicat; commit/push și starea finală sunt raportate la predare.
- Scanarea diferențelor pentru secrete: fără potriviri noi; fără `.env` sau artefacte
  de test în Git. Configul public nu importă env/DB/SDK-uri runtime.
- Dependențe/lockfile neschimbate; doar scriptul `test:theme` adăugat. Costuri/servicii: 0.
- Production, main, Stripe Live, Supabase/Vercel/Resend Production, DNS/domeniu neatinse.
- Arhivă/tag Faza 9 rămân la `6d84c236d4a91f460549be4cf175fd68e0ca1615`.
- Limitări asumate: release pentru assets/palete; cache extern favicon/OG; SVG cere
  code review; aceasta nu este autorizare pentru go-live sau certificare clean-install.

Recomandare 10B.2d (neîncepută): preflight fail-closed pentru env/ref-uri și existența
asset-urilor, seed demo explicit opt-in/idempotent, apoi clean install pe un proiect
Development nou autorizat, cu migrații în ordine și raport de verificare reproductibil.

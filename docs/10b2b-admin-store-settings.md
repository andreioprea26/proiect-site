# 10B.2b — Admin Store Settings

Data: 15 septembrie 2026. Verdict: **PASS**, fără merge; review necesar înainte de 10B.2c.
Branch: `task/10b2b-admin-store-settings`, din `develop`
`60b539c1bed1b9c3c36345670675603a29f9ab97` (PR #50, integrarea 10B.2a).

## Schema și aplicarea Development

Migrare forward-only, aditivă: `20260915120000_public_store_settings.sql`.
Singleton `public.store_settings`, cheie booleană constrânsă la `true`, rând inițial
cu override-uri nule. Fără tenant/org/workspace sau JSON configurabil nelimitat.

| Câmp public | Limită / format |
| --- | --- |
| display_name | 120 caractere |
| tagline | 160 |
| short_description | 500 |
| seo_description | 300 |
| footer_description | 500 |
| public_email | 254, format email |
| public_phone / whatsapp | maximum 16, 7–15 cifre și `+` opțional |
| instagram_url / facebook_url / tiktok_url | 300, HTTPS, domeniul exact al platformei cu www opțional, path simplu |

Metadata internă: `singleton`, `updated_by`, `updated_at`; nu este returnată de RPC-ul
public sau transmisă formularului client. Actorul este stabilit din `auth.uid()`,
nu din parametri. Nu există secrete, origin, SMTP, roluri, reguli financiare,
inventar, HTML/CSS/JS sau destinații webhook în schemă.

Metodă de aplicare efectivă:

1. CLI autentificat, linked ref și proiect confirmate: **bdyocajhhylvasfhmnal**, Development/Test.
2. `supabase migration list`: **27/27** aliniate înainte de migrare.
3. `supabase db push --dry-run --linked`: exclusiv migrarea de mai sus;
   seeds și roles goale. Review: fără DROP/TRUNCATE/DELETE sau mutații comerciale.
4. `supabase db push --linked --yes`: succes, numai această migrare.
5. SQL Settings executat imediat cu transaction + rollback: **53/53 PASS**.
6. `migration list`: **28/28**; dry-run final: **upToDate: true**, zero migrări/seeds/roles.

Nu s-au folosit reset, repair, pull sau diff. Production nu a fost accesat/modificat.

## RLS și grants

| Suprafață | Rezultat |
| --- | --- |
| Tabel | RLS activ; anon fără acces; authenticated SELECT numai prin politica is_admin; fără direct INSERT/UPDATE/DELETE/TRUNCATE |
| get_public_store_settings() | SECURITY DEFINER, search_path gol; EXECUTE explicit anon/authenticated, fără PUBLIC EXECUTE; proiecție exactă de 11 câmpuri |
| save_store_settings(11 text) | SECURITY DEFINER, search_path gol; numai authenticated poate apela; auth.uid + is_admin verificate în RPC; customer refuzat |
| valid_store_setting(text,text) | Validator SQL invoker, search_path gol; fără granturi de execuție anon/authenticated/service_role/PUBLIC |
| Admin aplicație | Layout protejat, loader și Server Action folosesc requireAdminContext; RPC reautorizează independent |

Citirea publică utilizează client cu cheia publică, fără sesiune și fără service role.
`getAdminStoreSettings()` selectează explicit câmpurile formularului și semnalează
indisponibilitatea DB; nu afișează o formă goală editabilă la eroare.

Validarea există în Server Action și DB: trim, limite, valori nule coerente, refuz
HTML/control characters și format email/telefon. Social URLs refuză HTTP,
javascript/data, credentials, porturi, domenii lookalike, query, fragment și path
percent-encoded. Public projection este revalidată și allowlistată în aplicație;
câmpurile necunoscute nu sunt copiate în config sau returnate clientului.

## Precedență, cache și integrare

Valoare DB validă → `src/lib/config/store.ts`. Gol/null elimină override-ul; pentru
contact/social fallback-ul actual este null. Câmp invalid izolat folosește fallback-ul
său. Rând absent, eroare sau timeout de citire: fallback static complet.

`getPublicStoreSettings()` folosește React `cache` pentru memoizare per request,
client anon, fetch `no-store` și timeout 2 secunde. Fără cache cross-request care să
păstreze branding vechi sau outage. `connection()` face metadata request-time,
nu îngheață valorile la build. Cost tehnic: o citire mică de settings per render/request,
partajată între consumatorii RSC; nu serviciu nou. În Route Handler/email nu se
presupune cache global. Save apelează `revalidatePath('/', 'layout')`, inclusiv Router Cache.
Alte tab-uri deja deschise primesc valorile noi la următoarea navigare/reîncărcare,
nu există un canal realtime de sincronizare.

Integrate: storefront/header/footer, metadata root și title template, Auth,
account, admin branding, fallback hero tagline/descriere și email operațional.
Footer afișează numai contact/social prezente și validate. Produse/categorii/colecții
păstrează datele dinamice și canonical-urile lor; APP_URL rămâne env.
Conținutul editorial salvat prin Homepage Admin păstrează precedența sa separată.

Global-error importă în continuare numai fallback-ul static, fără Settings/DB.
Fallback-ul identității nu garantează că operațiunile dependente de catalog/Auth DB
pot funcționa în timpul indisponibilității complete a Supabase.

Email: renderer-ul existent primește configul public rezolvat. Escaping, dedupe,
idempotency, delivery mode, retry și failure isolation sunt păstrate. FROM și
REPLY_TO provin exclusiv din env; emailul public nu devine sender sau credential.
Nu s-au trimis emailuri comerciale reale pentru această verificare.

UI `/admin/settings`: cele 11 input-uri, limite, Save/pending, erori pe câmp,
feedback succes/eroare și explicația valorilor goale. Link în navigarea admin și
dashboard. Fără page builder, upload, theme editor, assets DB sau bucket nou.

## Dovezi de testare

| Verificare | Rezultat |
| --- | --- |
| SQL 10B.2b | **53/53 PASS**, rollback, inclusiv constrângeri, grants, RLS, singleton, anon/customer/admin și proiecția publică |
| Regresie SQL | **3/3 suite PASS**, rollback: security_data_integrity, homepage_admin_stats, operational_notifications_cod |
| Unit Settings | **6/6 PASS**: fallback/outage, allowlist, validare, URL-uri, SEO/email, boundaries/cache/static error |
| Unit config 10B.2a | **8/8 PASS** |
| Unit email | **8/8 PASS** |
| Playwright Settings separat | **4/4 PASS** |
| Playwright focalizat | **47/47 PASS**: 4 Settings + 43 Auth/storefront/SEO/admin-access |
| Chromium complet | **174 PASS / 0 FAILED / 0 SKIPPED / 0 NOT RUN**, 1.9m |
| ESLint / TypeScript / Next production build | **PASS** |

Settings E2E modifică temporar starea globală a magazinului, deci rulează într-un
proiect dependency înainte de celelalte 170 teste Chromium, nu în paralel cu ele.
Testele sunt obligatorii: lipsa credențialelor sau ref diferit de Development produce
eroare, nu skip. `afterAll` restaurează câmpurile originale prin RPC admin. Auditul
updated_by/updated_at păstrează faptul că au existat salvări de test.

Două ajustări legitime de teste, fără slăbirea assertions:

- SQL security refuza inițial orice RPC SECURITY DEFINER nou disponibil anon;
  allowlist-ul include acum exclusiv proiecția publică auditată. Verificările
  globale RLS/search_path/PUBLIC EXECUTE rămân active, iar salvarea nu este allowlistată.
- Locatorul noii alerte E2E a fost restrâns la formular, pentru a nu selecta și
  `__next-route-announcer__`. Mesajul și aria-invalid sunt verificate exact.

Logurile păstrează avertismentele Node și mesajele Next.js `destination stream
closed early` observate și în 10B.2a; checkpoint-ul final nu are failures ascunse.
Scenariile negative Stripe/Resend rămân active. Fără suprimări, skip-uri noi sau
schimbări de business logic pentru verde.

## Siguranță, documente și următorul pas

Documente actualizate: README, productization-plan, client-onboarding-checklist,
registrul Supabase Development și acest raport. Nicio dependență sau lockfile schimbat;
doar scriptul `test:settings` nou și izolarea explicită a proiectului Playwright.
Scanarea țintită a diff-ului pentru secrete și review-ul configului sunt curate;
`.env.example` rămâne singurul `.env*` tracked.

Checkout, Stripe, COD, inventory/reservations, refunds, state machines, shipments,
review eligibility, Auth security și cheile browserului sunt neschimbate.
Niciun cont, serviciu, bucket, domeniu sau cost nou. Nu s-au operat Production,
main, Stripe Live, Vercel Production, Resend Production sau DNS.
Referințele arhivei rămân la `6d84c236d4a91f460549be4cf175fd68e0ca1615`.

Recomandare pentru **10B.2c, numai după aprobare**: contract restrâns pentru logo,
favicon, OG și theme tokens. Stabiliți mai întâi format/dimensiuni/fallback/licențe,
apoi upload cu validare MIME/size și politici Storage restrictive dacă este necesar.
Fără CSS/JS arbitrar sau schimbări financiare. Nu este implementat în 10B.2b.

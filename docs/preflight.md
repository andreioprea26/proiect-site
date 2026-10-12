# Preflight reutilizabil pentru clienți Test și Preview

Actualizare 2026-10-12: scripts/preflight.mjs înlocuiește checklist-ul incomplet din
septembrie. Dependency-free (Node 22+ și Git), read-only și fail-closed. Fără dotenv,
link CLI implicit, cache de autorizare sau fallback offline. Nu creează resurse.

## Configurare

1. Folosește checkout operator curat al repository-ului clientului, cu origin unic.
   Nu instala dependențe aici; păstrează separat workspace-ul aplicației/E2E.
2. Copiază config/client-install.example.json ÎN AFARA repository-ului. Completează
   ref Test/Preview, confirmarea ref-ului, nume, organizație, origin HTTPS exact,
   URL Preview planificat, destinatarul QA, inventarul ref-urilor Production și
   aprobarea seed-ului. Owner-ul trebuie să revizuiască clasificarea Test: furnizorul
   nu poate deduce scopul comercial al unei baze doar din numele ei.
3. Injectează secretele prin secret manager/environment de proces, nu în fișiere,
   argumente, Git sau transcript. Nu copia .env din alt proiect.
4. CLIENT_INSTALL_CONFIG = calea absolută externă a manifestului;
   CLIENT_CONFIRM_PROJECT_REF = ref-ul confirmat separat de owner.
5. Rulează `node scripts/preflight.mjs empty` înainte de migrare.
   Exit 0 + JSON PASS sunt obligatorii; orice alt rezultat = STOP.
6. Pentru writes folosește exclusiv [runner-ul oficial](client-install-runner.md),
   nu un PASS manual urmat de CLI/SQL separat. `migrated` și `e2e` rămân disponibile
   pentru diagnostic; runner-ul repetă gate-urile în același proces cu executorul.

Environment obligatoriu: SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY,
RESEND_API_KEY, EMAIL_DELIVERY_MODE, EMAIL_TEST_RECIPIENT, RESEND_FROM_EMAIL,
RESEND_REPLY_TO_EMAIL. APP_URL și STRIPE_WEBHOOK_SECRET pot lipsi înainte de deploy;
dacă există sunt validate, iar în etapa e2e sunt obligatorii. APP_URL trebuie să
coincidă cu URL aprobat, fără slash final. Nu sunt imprimate valori secrete.

empty/migrated cer planul E2E (required=true, ref identic), nu conturi înainte de
bootstrap. e2e cere E2E_APPROVED_PROJECT_REF, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD,
E2E_TEST_EMAIL, E2E_TEST_PASSWORD. Lipsuri = E2E_CONFIG_MISSING, niciodată skip.
Gate-ul validează configurația; nu face login și nu rulează Playwright.

## Controale

- Exclusiv test/preview, production=false, ref valid confirmat separat. Ref original
  bdyocajhhylvasfhmnal și demo bfmihaxfleztajzyamio blocate în cod în toate etapele.
  Toate ref-urile Production declarate sunt
  blocate. Fără force sau override Production, chiar dacă operatorul îl solicită.
- Clasificare remote obligatorie: `previewBranch.id` și `previewBranch.parentProjectRef`
  aprobate; API-ul Supabase trebuie să confirme ref, UUID, parent, nume, organizație,
  `is_default=false`, `with_data=false`, `preview_project_status=ACTIVE_HEALTHY`.
  Parent-ul nu poate fi unul dintre cele două proiecte originale protejate.
  Standalone/default, răspuns ambiguu, lipsă permisiuni sau metadata = FAIL. Nu ajunge
  doar eticheta environment din manifest. Nu se creează ramuri sau costuri automat.
- Proiect existent, ACTIVE_HEALTHY, nume/organizație exacte. Cheile publică/server
  trebuie să coincidă cu cheile returnate de API pentru proiect și rolul/tipul corect.
  Nu ne bazăm numai pe decodarea JWT.
- Stripe sk_test obligatoriu, Live refuzat. Control de mod/format, nu autentificarea
  contului sau o plată. Contul Sandbox separat se verifică și în checklist.
- Email numai redirect, destinatar exact aprobat, config Resend prezentă și format
  valid. Apartenența contului și livrarea se validează separat, fără email automat.
- Git clean, origin fetch/push unic exact. Scan inclusiv fișiere ignorate: .env*
  exceptând .env.example, .vercel, .supabase, supabase/.temp, .next, node_modules,
  credențiale cloud, private keys, dumps, logs și artefacte test. Symlink-uri și
  fișiere neinspectabile refuzate. Pattern scan de secrete fără imprimarea match-ului.
- supabase/migration-manifest.json: exact 29 nume/ordine/SHA-256, UTF-8 cu CRLF
  normalizat LF. Fără regenerare automată pentru a ascunde drift. Schimbarea
  release-ului cere review al SQL și manifestului împreună.
- Istoric remote SQL read-only: empty cere zero istoric, relații publice, users și
  obiecte Storage. migrated/e2e cer toate versiunile și numele exacte, în ordine.
  Parțial, extra, redenumit sau lipsă = FAIL. Istoricul nu este checksum al schemei:
  nu certifică absența oricărui SQL manual executat anterior.
- Timeout HTTP, redirect refuzat, erori/provider bodies suprimate. Lipsă permisiuni,
  endpoint indisponibil sau format schimbat = BLOCKED, fără query write de rezervă.

API-uri:
[projects](https://supabase.com/docs/reference/api/v1-list-all-projects),
[project keys](https://supabase.com/docs/reference/api/v1-get-project-api-keys),
[read-only query](https://supabase.com/docs/reference/api/v1-read-only-query).
Clasificare: [branches API](https://supabase.com/docs/reference/api/v1-list-all-branches).
Tokenul cere projects read, keys read inclusiv secret pentru comparație exclusiv
în memorie, branching read și database read. Rolul read-only trebuie să vadă catalogul, istoricul,
auth.users și storage.objects. Nu lărgi granturile aplicației pentru gate.

## Seed și limite

`node scripts/seed-demo.mjs catalog --dry-run`, apoi catalog --apply; opțional
shipping --dry-run și shipping --apply. Fiecare invocare rerulează migrated și cere
allowDemoSeed=true. Fără apply implicit. Payload fictiv identic; se adaptează numai
ref-ul guard-ului SQL după verificarea online. Locks, tranzacții, refuzul seed-ului
parțial și idempotency rămân. Rulează înainte de bootstrap users; refuzul unei baze
populate este intenționat. Seed necesită database write separat de preflight.

Comenzile oficiale de migrations/bootstrap execută gate-ul intern, imediat înainte
de write și folosesc inputul fixat și payload-ul verificat. CLI/SQL manual separat
nu mai este flux oficial. Nu există lock distribuit peste API-ul cloud și CLI:
fără operatori concurenți, promovare/renumire branch sau trafic comercial în instalare.
Manifestul trebuie să aparțină unui release revizuit; nu protejează de modificarea
intenționată simultană a codului și manifestului de către un operator privilegiat.

Legacy demo-seed.mjs/provision-demo-e2e.mjs sunt acum intenționat blocate de refuzul
central al demo-ului. Nu le folosi pentru un client nou și nu dezactiva denylist-ul.
Istoricul demo-ului este păstrat; mentenanța lui cere alt task, nu installer-ul client.
Runner-ul demo produce eroare explicită când fișierul E2E lipsește.

## Teste

`npm run test:preflight`: repository-uri temporare, HTTP simulat, fără furnizori.
`npm run verify:migrations`: numai manifest local, nu PASS pentru un target online.
Testele tooling nu înlocuiesc certificarea Auth/email/Stripe/RLS a fiecărui client.

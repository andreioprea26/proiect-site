# Runner oficial pentru instalări client Test și Preview

Scope: final acceptance 10B.2d, 2026-10-12. Node 22+, Git și CLI Supabase cu
`db push --project-ref --skip-vault` (ajutor verificat local pe v2.116.0).
Nu folosește Docker, nu creează servicii și nu schimbă schema ecommerce versionată.

## Identitate și autorizare

Configurează manifestul extern din `config/client-install.example.json` și env
conform [preflight](preflight.md). Noua țintă trebuie să fie o ramură Preview
non-default, fără copiere de date, confirmată de Supabase Management API; UUID/ref/
parent/nume/organizație și healthy status trebuie să coincidă. Standalone/default
și clasificare neverificabilă sunt refuzate. Un nume care conține test nu este probă.
Nu proviziona un plan plătit pentru a ocoli un FAIL: disponibilitatea/costul ramurii
necesită aprobarea owner-ului într-un task separat. Runner-ul nu creează ramura.

Development original și demo existent sunt interzise central, indiferent de etapă,
history valid sau aprobări locale. Nu există force, repair, reset sau override.
Production este refuzat, inclusiv branch default sau ref inventariat ca Production.
Metadata Preview nu certifică legal scopul utilizării: owner-ul nu trebuie să ruleze
servicii comerciale pe o ramură declarată pentru teste.

## Comenzi oficiale

Din checkout operator client curat, fără node_modules/config local:

```text
node scripts/install-client.mjs all --apply
```

Echivalent npm: `npm run client:install -- all --apply` (nu cere npm install).
Flux intern: target validation → preflight empty → CLI dry-run → gate empty nou
→ migrations → preflight migrated exact → bootstrap guarded → verificare finală.

Pentru catalog demonstrativ opțional, înainte de crearea users:

```text
node scripts/install-client.mjs migrate --apply
node scripts/seed-demo.mjs catalog --dry-run
node scripts/seed-demo.mjs catalog --apply
node scripts/seed-demo.mjs shipping --dry-run
node scripts/seed-demo.mjs shipping --apply
node scripts/install-client.mjs bootstrap --apply
```

Seed necesită `allowDemoSeed=true`; fiecare comandă seed își rulează gate-ul.
Nu combina `all` cu seed inițial ulterior: bootstrap-ul creează user, iar seed-ul
inițial refuză users existenți. `bootstrap` înainte de schema completă este FAIL.
Preflight diagnostic: `node scripts/preflight.mjs empty|migrated|e2e` (alege o etapă).
Acesta nu este un permis portabil pentru comenzi manuale separate.

## Migrații

Se refolosește `supabase db push`, nu se inventează un istoric SQL paralel.
Runner-ul capturează fișierele SHA-256 verificate în memorie și copiază numai
acestea într-un director temporar privat, cu config minimală. Nicio stare linked
sau env/copii ale altui proiect nu intră în executor. Ref explicit fixat; fără
include-seed/include-roles, cu skip-vault. PAT explicit în env, fără secrete în argv.
Outputul CLI este capturat și nu este imprimat nici la eroare.

După dry-run se repetă preflight, se compară identitatea, inputul, manifestul,
snapshot-ul DB și istoricul. Schimbare = STOP înainte de apply. După apply,
versiunile/numele remote trebuie să corespundă integral manifestului înainte de
orice bootstrap. Istoric parțial nu este reluat automat; investigație separată.
CLI incompatibil, timeout sau rezultat incert = FAIL fără retry sau cleanup cloud.
Doar directorul temporar local creat de runner este eliminat.

## Bootstrap programatic precis

Este administrator TEHNIC de TEST, nu bootstrap automat al proprietarului Live.
În env injectează `CLIENT_BOOTSTRAP_ADMIN_EMAIL` identic destinatarului QA aprobat
și `CLIENT_BOOTSTRAP_ADMIN_PASSWORD` dedicată de minimum 16 caractere; fără Git/chat.
Contul tehnic este creat cu email_confirm=true, fără email de confirmare trimis de
runner; asta NU validează livrarea emailurilor/Auth. Confirmarea reală se testează
separat cu un cont nou. Nicio parolă implicită, afișată sau salvată de runner.

1. Gate migrated și verificare read-only: fără users, roluri sau comenzi existente.
2. Gate migrated nou, aceeași țintă/stare; Auth Admin createUser pe ref fixat.
3. Revalidare online, exact un user și marker unic în app_metadata server-managed;
   profile/customer role trebuie să provină din trigger-ul existent.
4. Gate nou înainte de promovare, apoi SQL tranzacțional cu locks și verificări
   interne ale UUID/email/marker/profil/customer role/unicității/lipsei comenzilor.
   Numai userul creat în această execuție poate deveni admin.
5. Gate final și probă read-only admin. Fără preluarea sau rotirea unui cont existent.

Auth API și SQL nu formează o singură tranzacție. Dacă crearea reușește dar pasul
următor eșuează, userul rămâne pentru investigare; runner-ul nu îl șterge și nu
reia automat. O nouă execuție refuză users existenți. Acesta este FAIL, nu PASS parțial.

## Limite administrative

Crearea resurselor, billing, DNS, Vercel deploy/env, SMTP, Auth callback URLs și
Stripe webhook nu sunt executate/protejate de acest runner. Sunt task-uri separate,
cu țintă verificată, plan de modificări și autorizare imediată; nu sunt etape de
write ascunse în instalarea oficială. Nu pretindem că un PASS anterior le protejează.
Preflight diagnostic nu le autorizează. Pentru automatizarea lor va fi necesar
un executor specific cu gate în aceeași invocare; nu este introdus în 10B.2d.

Revalidarea este imediată, dar API-ul de control și DDL/Auth nu oferă o tranzacție
atomică comună. Instalarea necesită fereastră exclusivă, fără alți operatori,
deployments automate sau trafic comercial. Nu poate intercepta un SQL Editor
extern privilegiat. Nicio certificare Live nu rezultă din PASS-ul acestui tooling.

## Dovezi

`npm run test:preflight`, `npm run test:client-install`, `npm run verify:migrations`,
lint/type/build și regresie unit. Testele de runner folosesc executoare/HTTP simulate;
nu s-a repetat un clean install real și nu s-au modificat demo/original/Stripe.

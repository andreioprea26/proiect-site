# Preflight înainte de clean install — stare 2026-09-29

**Incomplet: nu există încă un script unic read-only care să acopere toate gate-urile.**
Checklist-ul manual nu este echivalentul unui preflight automat executat.

| Control | Implementare existentă | Limită |
| --- | --- | --- |
| Target Supabase | scripts/demo-seed.mjs, scripts/provision-demo-e2e.mjs, tests/e2e/demo-target.ts | Ref demo hardcoded, nu manifest per client |
| Environment/Production guard | Ref allowlisted, Stripe placeholder și Resend gol în scripts/run-demo-e2e.mjs | Nu verifică mediul real al unui client înainte de instalare |
| Env necesare | scripts/run-demo-e2e.mjs: URL, JWT project binding, credențiale E2E | Nu inventariază complet env Vercel/Auth/Stripe/Resend; numai după provisioning |
| Config/secrets copiate | .gitignore și docs/client-onboarding-checklist.md | Fără detecție automată pre-install a fișierelor locale ignorate/copiate |
| Expected migrations | supabase/seeds/handmade-demo*.sql cer count=29 | Nu compară lista/hash-urile release-ului cu Local/Remote |
| Test config | playwright.config.ts, scripts/run-demo-e2e.mjs, tests/e2e/demo-no-skips-reporter.ts | Demo-only; nu certifică provisioning/env ale unui client nou |

`provision-demo-e2e.mjs` creează users, rol și env local; NU este read-only.
`demo-seed.mjs --apply` scrie date; NU este preflight.
`run-demo-e2e.mjs --full` execută fixture-uri; NU este verificare înaintea instalării.

## Procedură manuală obligatorie până la implementare

1. Identifică repo/commit, owner și ref Test; exclude explicit ref-urile originale și Live.
2. Verifică proiectul online, planul aprobat, branch-ul DB și absența datelor inițiale.
3. Clone curat fără env/config/cache copiate; inspectează origin și secret scan.
4. Verifică numai nume/scope și rezultate booleene pentru secrete, fără valori în logs.
   Inventar: APP_URL, Supabase public URL/key + service role, Stripe Test/webhook,
   Resend key/from/reply-to, EMAIL_DELIVERY_MODE=redirect și destinatar dedicat.
5. Compară lista migrațiilor release-ului, migration list și dry-run targetat explicit.
   Nu executa comanda simplă --linked într-un workspace legat de proiectul original.
6. Înainte de E2E: identități dedicate, schema potrivită, providerii reali dezactivați
   pentru suita automată și reporter care respinge skip/unrun. Fără granturi extra.
7. O lipsă sau nepotrivire = STOP. Un proiect paused nu înseamnă DB goală și READY
   în Vercel nu demonstrează funcționarea bazei, emailurilor sau plăților.

## Criterii pentru scriptul viitor

Manifest ne-secret per instalare/release, target explicit, mediu Test obligatoriu,
interdicții Production/original, inventar env validat fără disclosure, verificare
config locală/copiată + remote Git, manifest exact migrations, probe read-only,
raport PASS/BLOCKED cu exit nonzero la lipsuri, teste negative pentru fiecare guard.
Scriptul nu trebuie să creeze resurse, users, migrations sau webhook-uri implicit.
Aceste criterii sunt cerințe restante, nu funcții implementate în acest checkpoint.

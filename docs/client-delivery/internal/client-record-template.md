# Fișă client, aprobări și acceptanță — [CLIENT]

Copie privată per client, fără secrete/PII de cumpărători. Nu bifa probe
neexecutate. Placeholderele obligatorii lipsă = PENDING/BLOCKED.

## Identitate și release

| Câmp | Valoare de completat |
| --- | --- |
| Client / owner / coordonator / operator | [CLIENT] / [OWNER] / [COORDINATOR] / [OPERATOR] |
| Master release și data aprobării | [RELEASE_SHA] / [DATE] |
| Repo client, branch, SHA/tag și customizări | [REPO_URL] / [BRANCH] / [CLIENT_SHA] / [CUSTOMIZATIONS] |
| Manifest migrații, versiuni și raport | [MANIFEST_PATH] / [VERSIONS] / [EVIDENCE_LOCATION] |
| Destinatar QA / mediu acceptanță | [QA_CONTACT_PRIVATE] / [TEST_OR_PREVIEW] |

## Inventar medii — fără chei

| Mediu | Org/cont deținut de client | Supabase ref/nume/scop | Vercel proiect/origin/SHA | Stripe mod/endpoint | Resend sender/mod |
| --- | --- | --- | --- | --- | --- |
| Test/Preview | [TEST_ACCOUNTS] | [TEST_REF_NAME_NONPRODUCTION] | [PREVIEW_ORIGIN_SHA] | Sandbox / [ENDPOINT] | [SENDER] / redirect |
| Production, neautorizat inițial | [PROD_ACCOUNTS_OR_PENDING] | [PRODUCTION_REF_OR_PENDING] | [DOMAIN_OR_PENDING] | Live BLOCKED | live NEAUTORIZAT |

Inventar complet ref-uri Production `[PRODUCTION_REFS_OR_CONFIRMED_NONE]`;
clasificare semnată de owner `[DATE]`. Aprobarea Test externă: locație privată
`[APPROVAL_LOCATION]`, expirare `[EXPIRY]`, configurație/release `[CONFIG_VERSION]`.
Nu include cheia HMAC, tokens sau fișiere env în fișă.

## Acces și aprobări

| Resursă/operație | Owner | Operator/rol și expirare | Scop/țintă/release/cost aprobat | Aprobat de/la | Revocare verificată |
| --- | --- | --- | --- | --- | --- |
| GitHub/Vercel/Supabase/Stripe/Resend/DNS, câte un rând | [OWNER] | [ROLE_EXPIRY] | [SCOPE] | [APPROVER_DATE] | [DATE_EVIDENCE] |
| Setup Preview/Auth/SMTP/webhook | [OWNER] | [OPERATOR] | [EXACT_PLAN] | [APPROVER_DATE] | [STATUS] |
| Materiale comerciale/legale/date/livrare/taxe | [OWNER] | [SPECIALIST] | [APPROVED_VERSION] | [APPROVER_DATE] | N/A |
| Production resurse/DNS/email/plăți/traffic, câte un rând | [OWNER] | [OPERATOR] | NEAUTORIZAT | [PENDING] | [STATUS] |
| Prima plată și refund Live, rânduri separate | [OWNER] | [OPERATOR] | [AMOUNT_TARGET_RELEASE] | [IMMEDIATE_APPROVAL] | N/A |

Accesurile admin permanente/temporare și recuperarea: `[PRIVATE_ACCESS_REGISTER]`.
Numai nume de variabile și confirmarea binding-ului în inventarul secretelor,
niciodată valori: `[VARIABLE_ENV_OWNER_CONFIGURED_DATE]`.

## Dovezi obligatorii

Pentru fiecare probă din [handover](../client/handover-maintenance.md), înregistrează:

| Probă | Data / SHA / target | PASS/BLOCKED/FAIL | Dovadă privată sanitizată | Responsabil / pas următor |
| --- | --- | --- | --- | --- |
| [PROBE] | [DATE_SHA_REF] | PENDING | [EVIDENCE] | [OWNER_NEXT_STEP] |

Rezultate automate: `[PASS_COUNT]` PASS / `[FAILED_COUNT]` FAILED /
`[SKIPPED_COUNT]` SKIPPED / `[NOT_RUN_COUNT]` NOT RUN; total `[TOTAL]`.
Auth primit/confirm/reset `[EVIDENCE]`; Sandbox webhook/event + payment/order/
rezervare/delta unic `[SANITIZED_EVIDENCE]`; SQL rollback `[EVIDENCE]`.
Un preflight PASS nu completează aceste probe. E2E generic actual `[BLOCKED]`.
Artefactele pot conține PII/secrete; nu le atașa public înainte de inspecție.

## Operațiuni, riscuri și acceptanță

Backup cod/DB/Auth/Storage/config `[COVERAGE_OWNER_FREQUENCY_RETENTION]`;
ultima restaurare în mediu separat `[DATE_TARGET_RESULT]`; deployment bun și
rollback `[RELEASE_PROCEDURE]`. Monitorizare `[OWNER_FREQUENCY_CHANNEL]`;
reconciliere plăți/rezervări `[PROCEDURE]`. Mentenanță și modificări
`[AGREED_SCOPE_WITHOUT_UNAPPROVED_SLA]`.

Riscuri/funcții lipsă `[LIMITATION_IMPACT_OWNER_NEXT_STEP]`;
fixture cleanup/audit păstrat `[STATUS]`; accesuri temporare revocate `[EVIDENCE]`.
Documente predate/versiuni `[DOCUMENTS]`; training `[DATE_ATTENDEES_RESULT]`.

- Verdict pachet client: `[PREVIEW_EVALUATION_ONLY / COMPLETE_ACCEPTANCE_BLOCKED / PASS]`.
- Acceptanță owner, limite și responsabilități: `[NAME_DATE_WRITTEN_REFERENCE]`.
- Lansare: **NEAUTORIZAT** până la toate gate-urile din
  [Production](production-launch.md), apoi aprobare distinctă `[RELEASE_TARGET_DATE]`.

# 10B.2d — clean-install checkpoint (partial, BLOCKED)

Date: 2026-09-18. Demo: `bfmihaxfleztajzyamio` (`project-handmade`).
Source release: `8784dfc3076e7601f3581024a02c747dc48cdec2`.
Demo repository initial commit: `936cb843f714ddf171291e17d3d97346eae70ce3`.

## Installation evidence

- All 28 unchanged migrations applied through CLI `db push --linked` with the
  explicit demo `--project-ref` and `--skip-vault`, from an isolated repository.
- Dry-run afterward: up to date, no pending migrations. Local/Remote 28/28.
- Public tables: 36; tables without RLS: zero.
- No seed installed. Users/products/orders/payments/Storage objects remained zero
  after the initial transaction/rollback checks.
- Original Development link and database were not changed.

## Reviewed pre-existing RLS automation

`public.rls_auto_enable()` existed before installation. It returns `event_trigger`,
is owned by `postgres`, uses PL/pgSQL and exactly `search_path=pg_catalog`.
Its reviewed body only enables RLS on newly created public tables; identifiers
come from `pg_event_trigger_ddl_commands()`, not application request parameters.
It is attached to `ensure_rls` for CREATE TABLE / CREATE TABLE AS / SELECT INTO.
API roles have no CREATE privilege in public. Direct SELECT as anon was rejected
with SQLSTATE 0A000 (event_trigger cannot be displayed as an ordinary result).

The SQL security test now accepts only this exact reviewed body SHA-256, owner,
language, return type, argument count, search_path and event-trigger configuration.
It also checks direct-call rejection for anon and authenticated. This is optional
for databases without the automation. All other application functions retain the
existing empty-search-path and EXECUTE privilege checks. Drift fails closed.
No function, trigger, policy or historical migration was changed. Runtime table
grants were subsequently corrected by the separate forward migration below.

## Actual clean-install blocker

After passing the automation checks, the security script fails at:
`customer cannot read own profile through RLS`.

Read-only catalog evidence: authenticated lacks SELECT on profiles, user_roles
and customer_addresses; service_role lacks SELECT on these tables and on
products/categories/collections. Account migrations create policies but do not
explicitly grant the required table access; later hardening revokes unwanted
privileges without adding the required ones. RLS policies do not grant table access.

This requires a separate reviewed forward-only migration enumerating the minimal
account/server table and sequence privileges required by the application. Do not
enable global automatic exposure/default grants, weaken RLS, rewrite old migrations,
or merely relax the failing assertions. Approval is required before applying grants.

Initial SQL run: 10 passed, security_data_integrity failed, two Stripe scripts not
run after the failure. No full SQL/security PASS or 10B.2d completion is claimed.
Seed/preflight tooling, Auth/Stripe configuration and E2E certification remain pending.

Reference: https://www.postgresql.org/docs/17/plpgsql-trigger.html

## Approved correction — 2026-09-18

User approved minimum runtime privileges on demo only. Applied
`20260918150000_explicit_runtime_table_grants.sql` with an explicit demo ref,
after dry-run listed only that migration. Follow-up dry-run is up to date (29
migrations). Original Development has NOT received this migration.

- authenticated: profiles SELECT/UPDATE, user_roles SELECT, customer_addresses
  SELECT/INSERT/UPDATE/DELETE. Existing ownership policies remain unchanged.
- service_role: SELECT only on orders, order_items, payments, shipments and
  stripe_webhook_events, matching direct reads in checkout, webhook, notification
  and cancellation code. RPC-controlled writes retain their existing grants.
- No automatic/default grants, blanket ALL TABLES grants, sequence grants,
  catalog/Settings writes, or fixture-driven service-role permissions were added.
  Missing service-role catalog SELECT is not itself a runtime requirement.

New `clean_install_account_grants.sql` exercises real own-profile updates and
address CRUD, denies cross-user reads/updates/deletes/ownership transfers/inserts
and role escalation, and runs the five server reads under service_role. All
fixtures are transactional and rolled back.

The event-trigger negative probe now consumes the SELECT result with INTO:
discarding an event_trigger result was not a valid test of API-return behavior.
Final run: **14/14 SQL scripts PASS**, including all 13 historical scripts and
the new account-isolation test. Each script uses BEGIN/ROLLBACK. No assertions
were deleted, no skip introduced. This checkpoint does not certify the full
10B.2d phase. No application TypeScript/Next code or dependencies changed;
lint/build/Playwright were not rerun for this SQL-only correction.

## Demo Auth and Sandbox validation — 2026-09-18

- Demo Auth Site URL is `https://handmade-project-olive.vercel.app`; the allowlist
  contains only the exact `/auth/confirm` and `/auth/reset-password` URLs on that
  host. User confirmed signup, confirmation-email receipt, confirmation, login,
  password reset and subsequent login all work. This is user-reported E2E evidence.
- Demo Vercel Production scope has APP_URL and STRIPE_WEBHOOK_SECRET configured.
  This is the separate demo project's deployment environment, not original Production.
- Stripe Sandbox destination `handmade-demo-vercel` listens for checkout session
  completed/expired and refund created/updated/failed events.
- The first payment delivery returned `400 invalid_signature`. The initial secret
  transfer was incorrect; it was replaced from the exact secret text node after
  explicit user approval, without logging its value or changing application code.
  Redeployment `DN8TC43ozjwpbU2AykKPyjNuqKHn` reached Ready in 48 seconds.
- The same event was resent; no second payment was created. Read-only demo DB audit
  confirms order `CMD-2026-00000101` (ID `5c320cc4-8931-423c-ba2f-91619c22b945`):
  order status `paid`, payment status `paid`, amount 10890 bani, reservation
  `consumed` quantity 1, product stock 10 -> 9, and one processed
  `checkout.session.completed` webhook. Browser shows confirmed payment and cart 0.
- Before webhook processing, the success redirect left payment pending and cart
  intact; it did not confirm payment independently.
- Order/payment confirmation notifications both have status `sent`, no error,
  and the dedicated test recipient. User subsequently confirmed receipt of both
  messages in the test inbox.
- The fictional order and stock movement remain for audit. No real payment or
  carrier shipment was made. Original services/databases were not modified.
- Full 10B.2d remains pending: demo repository synchronization, final automated
  regression and checkpoint. Deployed application source remains demo `936cb84`.

## Final local checks and remaining E2E boundary — 2026-09-18

- ESLint PASS; TypeScript PASS; Next.js production build PASS (38 pages).
- Unit tests: 30/30 PASS, zero failed/skipped (email/config/settings/theme).
- Initial unit/build subprocess startup was denied by the local sandbox (EPERM);
  rerunning with approved process permissions passed. No assertions were changed.
- Full Chromium was deliberately NOT started: local environment targets original
  Development, with original E2E credentials. Those fixtures must not be reused for
  the isolated demo. No skip-based PASS is claimed.
- Before full Chromium: provision dedicated disposable demo admin/customer E2E
  accounts, isolated environment values and reviewed fixture permissions. Do not
  promote the user's manual test account or broaden runtime grants for tests.
- Repository synchronization is prepared on `codex/10b2d-clean-install` in the
  demo repository, not by updating its main branch. No PR/merge is authorized.
- This checkpoint is still BLOCKED for full automated certification, not for the
  manually validated Auth/Stripe/email flow. No application source/dependency
  changes were needed for this validation.

## Approved isolated E2E identities — 2026-09-18

- Executed `scripts/provision-demo-e2e.mjs` with the explicit demo ref and
  `--provision`. Created two fixture-marked `example.invalid` accounts; confirmed
  email via Admin Auth API (no emails sent), random independent passwords.
- Promoted only the exact new marked admin fixture via a transaction; customer
  fixture remains customer. Both login and own-role queries PASS.
- Credentials saved in `.env.e2e-demo.local`, ignored by Git, never printed.
  Original `.env.local` and the manually tested user account remain unchanged.
  Provisioner refuses an existing output file or fixture emails; no silent reset.
- Fixture accounts are retained for subsequent testing. No application table
  privileges, RLS policies or other users were modified.
- Full Chromium is NOT ready merely by switching env files: Store Settings test
  explicitly pins the original Development hostname; several fixture setup/cleanup
  paths directly INSERT/DELETE via service_role. Read-only demo probes confirm
  service_role lacks INSERT on products/orders/inventory and SELECT on reviews.
  These are test-infrastructure requirements, not proven runtime bugs.
- Do not add blanket grants, weaken security assertions or silently skip tests.
  Next work requires an explicitly scoped fixture-infrastructure adaptation:
  target guard plus privileged test setup/cleanup outside runtime API permissions.
  The isolated env file is not automatically loaded by the current Playwright config.

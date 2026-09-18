# 10B.2d — clean-install demo checkpoint (PASS, scoped)

Date: 2026-09-18. Demo: `bfmihaxfleztajzyamio` (`project-handmade`).
Source release: `8784dfc3076e7601f3581024a02c747dc48cdec2`.
Demo repository initial commit: `936cb843f714ddf171291e17d3d97346eae70ce3`.

This document is chronological: earlier BLOCKED sections describe historical
checkpoints, not the result of later corrections. Consult the final section for
the latest certification boundary. All findings and prevention actions are in
[installation findings](10b2d-installation-findings.md).

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

## Approved demo fixture adaptation — 2026-09-18

- The isolated runner now loads the ignored demo environment, verifies URL/ref and
  key project binding, builds against demo, and refuses reuse of an existing server.
- Operator-only CLI transport handles selected test table setup/cleanup with the
  exact demo ref. Browser/API identities and tested RPCs still use real Supabase
  requests. No runtime grants, policies, application code or dependencies changed.
- One worker avoids shared settings races; internal concurrent RPC assertions stay
  concurrent. Four added infrastructure tests cover escaping, target isolation,
  mutation safeguards and preservation of the manual order/seed.
- The first full run reached 178 PASS / 2 FAILED / 6 NOT RUN. Failures were a
  checkout locator also matching Next's route announcer and a COD test incorrectly
  using service_role instead of the guest identity used by runtime. Fixed test
  selectors/identity; no skip added and no assertions removed or weakened.
- Focused final checkout/Stripe/Store Settings regression: **30/30 PASS**, including
  concurrent last-unit reservations, webhook transitions and refund idempotency.
- Latest ESLint and TypeScript PASS; unit tests **30/30 PASS**, zero skipped.
- Full final Chromium and post-suite SQL/security audit are still pending at this
  intermediate checkpoint. The no-skips reporter refuses incomplete certification.
- See [demo E2E workflow](demo-e2e.md). This is a demo-specific operator tool,
  not a generic unattended installer for arbitrary client projects.

## Final demo certification — 2026-09-18

This section supersedes the intermediate BLOCKED/pending results above.

- The second full run reached 172 PASS / 1 FAILED / 13 NOT RUN after the CLI
  fixture process returned no result during 7C setup. Its exact root cause was
  not established. SQL now uses temporary files, bounded CLI execution and safe
  killed/elapsed diagnostics; writes are never automatically retried.
- Focused 7C plus Store Settings after correction: **18/18 PASS**.
- Final full Chromium, including Store Settings dependency: **186 PASS / 0 FAILED
  / 0 SKIPPED / 0 NOT RUN**, 11.7 minutes, exit 0. The no-skips reporter accepted
  the run; `.last-run.json` reports passed with no failed tests.
- ESLint **PASS**; TypeScript **PASS**; unit tests **30/30 PASS**; Next.js production
  build **PASS**, including the final isolated E2E runner's build.
- Post-suite SQL: **14/14 scripts PASS**, each with BEGIN/ROLLBACK:
  admin_fulfillment, admin_orders, checkout_orders, clean_install_account_grants,
  customer_orders_favorites_reviews, homepage_admin_stats,
  newsletter_contact_custom_content, operational_notifications_cod,
  payment_reservations, place_cod_order, public_store_settings,
  security_data_integrity, stripe_checkout_webhook, stripe_hardening_refunds.
- RLS/security **PASS** for account/address ownership, orders, favorites/reviews/
  moderation, private leads/content, settings/homepage/admin statistics, and
  payment/webhook/refund boundaries. Catalog: **29 migrations, 36 public tables,
  zero without RLS**. No service_role INSERT on products/orders/inventory or
  SELECT on reviews was added. COD remains callable by anon, not service_role.
- Final read-only audit: `CMD-2026-00000101` order/payment paid, 10890 bani,
  reservation consumed quantity 1, stock 9, one completed webhook, two sent
  notifications. User-confirmed Auth and email delivery evidence stands.
- Cleanup: zero published non-seed products, active non-seed shipping methods,
  active concurrency reservations, pending concurrency payments or leftover 7C
  orders. Terminal concurrency audit records and dedicated E2E accounts remain
  intentionally; the database is not claimed to be empty.
- Source branch: `codex/10b2d-rls-preflight`; demo branch:
  `codex/10b2d-clean-install`. PR/merge are reserved for the user. No new deployment
  was initiated; demo main/deployed source remains `936cb84`.
- Original Production/main and original Development schema were not modified.
  No new dependencies, paid services or upgrades. Credentials stay in an ignored
  local file. Git synchronization and exact HEADs are reported in the handoff.

**Verdict: PASS for isolated demo clean-install validation**, not certification
of a generic installer, future client installation, Stripe Live or merged/deployed
final release. Operator scripts intentionally pin this demo; do not remove their
guards to reuse them on a client database.

Residual observations: Next.js logs `The destination stream closed early` during
navigation, including passing tests; cause unproven. The earlier CLI interruption's
root cause is also not claimed as proven. Both are in the 20-entry findings register.
Local logs/test artifacts are not published. No business logic, runtime privileges
or assertions were weakened by this fixture adaptation.

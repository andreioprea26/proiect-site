# Demo E2E isolation

Target authorized for this operator workflow: `bfmihaxfleztajzyamio` only.
This is not a generic client installer and must never be run on a client database.

## Setup and execution

- Existing dedicated accounts were created with `scripts/provision-demo-e2e.mjs`.
  Do not repeat it to rotate credentials; it intentionally refuses existing fixtures.
- `.env.e2e-demo.local` is ignored and remains local. Do not copy it into the demo
  repository, docs, messages, or reports. Original `.env.local` remains unchanged.
- Run `node scripts/run-demo-e2e.mjs --full`. The runner checks URL/ref and JWT
  project binding, disables real Stripe/Resend credentials, builds with the isolated
  env and starts Chromium. Use explicit spec filenames for focused checks.
- `--list` discovers tests without DB mutations. Demo mode does not reuse a server.
- Demo runs use one worker because homepage/store identity are shared DB state.
  Internal concurrency tests still exercise concurrent RPCs. CLI operator latency
  is accommodated by a 180-second test timeout, without weakened assertions.
- The final reporter fails certification for skipped/interrupted/unrun tests.

## Fixture versus application boundary

`demo-fixture-client.ts` replaces only direct table fixture operations in explicitly
selected test service clients. It executes typed, escaped SQL via authenticated
Supabase CLI with the explicit demo ref. Table identifiers have an allowlist;
update/delete require filters; manually validated seed/order identifiers are protected.
No database function, credentialed HTTP bridge, default grant or runtime privilege
is added. CLI credentials remain in the operator environment, never in the app.
SQL travels through a private temporary file removed after execution, not argv
(Windows length limits). CLI timeout is 90 seconds; SQL statement timeout remains
20 seconds. Errors report only table/action, safe error identifiers, killed flag
and elapsed time. Writes are never automatically retried after a lost response.

Auth admin fixture creation and all tested RPC calls still go through Supabase API.
Browser/admin/customer/anon clients are NOT wrapped; RLS/security assertions remain
real. Direct fixture table operations are not evidence of runtime service-role
access. SQL security tests and real Sandbox flow provide that separate evidence.

Settings/homepage tests temporarily edit shared demo content and restore snapshots.
Do not have manual testers edit those settings concurrently. Existing namespace-
scoped cleanup policies are retained; audit order and seed must survive the run.
Concurrency fixtures intentionally retain terminal audit records, hide their products
and deactivate their shipping methods; they are not customer data.

See [installation findings](10b2d-installation-findings.md) and
[checkpoint](10b2d-clean-install-checkpoint.md) for outstanding gates and exact results.

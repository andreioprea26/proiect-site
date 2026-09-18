# Controlled demo catalog seed

Target: Supabase `bfmihaxfleztajzyamio` only. Never use on a client or original DB.

```powershell
node scripts/demo-seed.mjs --project-ref=bfmihaxfleztajzyamio --dry-run
node scripts/demo-seed.mjs --project-ref=bfmihaxfleztajzyamio --apply
```

The CLI runner does not load .env or use the workspace's linked project. It passes
the approved demo ref explicitly. Other refs/arguments are rejected before SQL.
The SQL is outside migrations, opt-in, transaction-wrapped, serialized with an
advisory lock and table locks, and requires the reviewed 29-migration schema.
First installation refuses non-empty users/catalog/orders. Partial seed refuses
repair. A complete existing seed is a no-op, preserving operator edits and stock.
It is a dedicated demo operator tool, not a generic client installer.

Manifest: UUID prefix `2d100000`, product suffixes 001/002, category 003, inventory
004/005. Two fictional standard products (89/49 RON), one category, initial stock
10 each. Stock is added with adjust_inventory for audit. No images or external
assets: the UI displays its image placeholder. No users, reviews, contacts, orders,
payments, shipping methods or legal copy. No data copied from original DB.

2026-09-18 evidence:
- dry-run PASS (rollback); apply PASS; repeat apply PASS without duplicates.
- 2 products, 1 category, 20 total stock, 2 inventory movements, 0 users/orders.
- Browser smoke on https://handmade-project-olive.vercel.app: home catalog renders,
  product detail renders, add-to-cart and 89 RON cart subtotal work.
- Checkout renders but intentionally blocks submission without shipping methods.
  No checkout submission, email or payment attempted. Test cart item removed.
- Full application certification is pending: shipping demo, APP_URL, Auth URLs,
  Stripe webhook, dedicated accounts and automated E2E validation.
- Seed remains in demo for testing. No destructive cleanup performed.

## Shipping continuation

An independent opt-in step now adds one fictional shipping method (19.90 RON),
explicitly labelled as demo with no real carrier. It refuses existing unrelated
shipping configuration/orders and never overwrites the existing seed row:

```powershell
node scripts/demo-seed.mjs --project-ref=bfmihaxfleztajzyamio --dry-run --shipping
node scripts/demo-seed.mjs --project-ref=bfmihaxfleztajzyamio --apply --shipping
```

Both commands passed on demo. An anon quote with a deliberately false client
price of 1 ban returned the authoritative 8900 bani and valid=true. This was a
transaction/rollback query, not an order or a Stripe transaction.

Vercel/Auth/Stripe setup remains pending: browser control timed out twice before
any settings mutation. No APP_URL/Auth URLs/webhook configuration is claimed.
Shipping display in the browser has not yet been revalidated after insertion.

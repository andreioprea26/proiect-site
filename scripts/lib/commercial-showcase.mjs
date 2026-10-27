import { createServer } from 'node:http';
import { productIllustration } from '../../tests/fixtures/commercial-demos.mjs';

/** A loopback-only read fixture, NOT Supabase and never an installer/seed executor. */
export async function startFixtureServer(profile, port = 0) {
  const audit = { reads: 0, rejected: 0, paths: new Set() };
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    const reject = () => { audit.rejected++; json(405, { error: 'Local read-only presentation. No writes, accounts, checkout or payments.' }); };
    const rpc = {
      '/rest/v1/rpc/get_public_store_settings': [profile.settings],
      '/rest/v1/rpc/get_public_homepage_blocks': profile.homepage,
      '/rest/v1/rpc/get_approved_product_reviews': [],
    };
    if (req.method === 'POST' && Object.hasOwn(rpc, url.pathname)) {
      // These exact RPC names only return immutable public fixtures.
      req.resume(); audit.reads++; audit.paths.add(url.pathname); return json(200, rpc[url.pathname]);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return reject();
    const image = profile.products.find((p) => url.pathname === `/storage/v1/object/public/product-images/${p.product_images[0].storage_path}`);
    if (image) {
      audit.reads++; audit.paths.add(url.pathname);
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      return res.end(productIllustration(profile, image, profile.products.indexOf(image)));
    }
    const tables = {
      products: profile.products, categories: profile.categories, collections: profile.collections,
      content_pages: [],
      product_categories: profile.products.flatMap((p) => p.product_categories.map((r) => ({ ...r, product_id: p.id }))),
      product_collections: profile.products.flatMap((p) => p.product_collections.map((r) => ({ ...r, product_id: p.id }))),
    };
    const table = url.pathname.replace('/rest/v1/', '');
    if (!url.pathname.startsWith('/rest/v1/') || !Object.hasOwn(tables, table)) return reject();
    let rows = tables[table];
    for (const [key, value] of url.searchParams) {
      if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
      if (value.startsWith('eq.')) rows = rows.filter((r) => String(r[key]) === value.slice(3));
      else if (value.startsWith('in.(') && value.endsWith(')')) {
        const values = value.slice(4, -1).split(',').map((v) => v.replaceAll('"', ''));
        rows = rows.filter((r) => values.includes(String(r[key])));
      } else return reject();
    }
    if (url.searchParams.has('order')) {
      const [key, direction] = url.searchParams.get('order').split('.');
      rows = [...rows].sort((a, b) => String(a[key]).localeCompare(String(b[key]), 'ro') * (direction === 'desc' ? -1 : 1));
    }
    const limit = Number(url.searchParams.get('limit') ?? rows.length);
    rows = rows.slice(0, Number.isFinite(limit) ? limit : 0);
    audit.reads++; audit.paths.add(url.pathname);
    if (req.headers.accept?.includes('application/vnd.pgrst.object+json')) {
      if (rows.length > 1) return json(406, { code: 'PGRST116', details: 'Multiple rows' });
      return json(200, rows[0] ?? null);
    }
    json(200, rows);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { origin: `http://127.0.0.1:${server.address().port}`, audit, close: () => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }) };
}

/** No inherited application/cloud credentials, NODE_OPTIONS, or .env files. */
export function localEnvironment(fixtureOrigin, appOrigin) {
  for (const origin of [fixtureOrigin, appOrigin]) {
    const u = new URL(origin);
    if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || u.pathname !== '/' || u.username || u.password || u.search || u.hash) throw new Error('Loopback origins required');
  }
  const allowed = ['PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'TMPDIR', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'HOME', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE'];
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.some((k) => k.toLowerCase() === key.toLowerCase())));
  return { ...env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: fixtureOrigin, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-showcase-public-placeholder', APP_URL: appOrigin, EMAIL_DELIVERY_MODE: 'redirect' };
}

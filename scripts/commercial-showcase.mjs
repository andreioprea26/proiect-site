import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';
import { createDemoProfile, DEMO_IDS, productIllustration, brandIllustration } from '../tests/fixtures/commercial-demos.mjs';
import { localEnvironment, startFixtureServer } from './lib/commercial-showcase.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs', 'commercial-demos');
const [mode, selected] = process.argv.slice(2);
if (!['export', 'capture', 'serve'].includes(mode) || (selected && !DEMO_IDS.includes(selected)) || process.argv.length > 4 || (mode === 'serve' && !selected)) {
  throw new Error('Use: node scripts/commercial-showcase.mjs export|capture [iris|soare|poveste] OR serve iris|soare|poveste');
}
if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error('Local showcase is forbidden on Vercel');
const ids = selected ? [selected] : DEMO_IDS;
mkdirSync(join(docs, 'assets'), { recursive: true });
mkdirSync(join(docs, 'data'), { recursive: true });
for (const id of ids) {
  const profile = createDemoProfile(id);
  writeFileSync(join(docs, 'data', `${id}.json`), `${JSON.stringify(profile, null, 2)}\n`);
  for (const [i, product] of profile.products.entries()) writeFileSync(join(docs, 'assets', `${id}-${product.slug}.svg`), productIllustration(profile, product, i));
  for (const icon of [false, true]) writeFileSync(join(docs, 'assets', `${id}-${icon ? 'icon' : 'logo'}.svg`), brandIllustration(profile, icon));
}
if (mode === 'export') { console.log('Exported 3-profile public data/assets (or selected profile); no database connection.'); process.exit(0); }

// One disposable workspace, one unchanged app template. Profiles are compiled serially.
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'commercial-showcase-')));
const next = join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
let child;
let fixture;
let browser;
async function stopApp() {
  if (!child || child.exitCode !== null) return;
  const closed = once(child, 'close');
  if (process.platform === 'win32') {
    try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* process may have already exited */ }
  } else { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already exited */ } }
  await closed;
  child = null;
}
async function runNext(args, env, logName) {
  let output = '';
  child = spawn(process.execPath, [next, ...args], { cwd: scratch, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output += chunk.toString(); });
  child.on('error', (e) => { output += String(e); });
  child.on('close', () => writeFileSync(join(scratch, logName), output));
  return { process: child, output: () => output };
}
async function waitReady(origin, proc) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('Local Next server exited before readiness');
    try { const r = await fetch(origin, { signal: AbortSignal.timeout(3000) }); if (r.ok) return; } catch { /* local startup */ }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error('Local Next readiness timeout');
}
const results = [];
try {
  for (const name of ['src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs']) cpSync(join(root, name), join(scratch, name), { recursive: true });
  // Reuse installed dependencies, never copy environment files or other local state.
  symlinkSync(join(root, 'node_modules'), join(scratch, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const masterConfig = readFileSync(join(root, 'src/lib/config/store.ts'), 'utf8');
  for (const id of ids) {
    const profile = createDemoProfile(id);
    const appOrigin = `http://127.0.0.1:${3410 + DEMO_IDS.indexOf(id)}`;
    fixture = await startFixtureServer(profile);
    const env = localEnvironment(fixture.origin, appOrigin);
    const source = masterConfig.replace('export const STORE_CONFIG: PublicStoreConfig = {', 'const BASE_STORE_CONFIG: PublicStoreConfig = {');
    if (source === masterConfig) throw new Error('Master configuration contract changed; review harness');
    const marker = 'export function storeTitle(';
    if (!source.includes(marker)) throw new Error('Master configuration insertion point changed');
    const config = `export const STORE_CONFIG: PublicStoreConfig = { ...BASE_STORE_CONFIG, ...${JSON.stringify(profile.store)}, copy: { ...BASE_STORE_CONFIG.copy, ...${JSON.stringify(profile.store.copy)} } };\n\n`;
    writeFileSync(join(scratch, 'src/lib/config/store.ts'), source.replace(marker, config + marker));
    for (const icon of [false, true]) writeFileSync(join(scratch, 'public/branding', `${id}-${icon ? 'icon' : 'logo'}.svg`), brandIllustration(profile, icon));
    console.log(`${id}: building the real Next app in an environment-free temporary workspace`);
    const build = await runNext(['build', '--webpack'], env, `build-${id}.log`);
    const [code] = await once(build.process, 'close');
    if (code !== 0) throw new Error(`Local ${id} build failed: ${build.output().slice(-6000)}`);
    const app = await runNext(['start', '--hostname', '127.0.0.1', '--port', new URL(appOrigin).port], env, `server-${id}.log`);
    await waitReady(appOrigin, app.process);
    if (mode === 'serve') {
      console.log(`LOCAL PRESENTATION ONLY: ${profile.store.name} at ${appOrigin}. Read fixtures, no accounts/checkout/payments. Ctrl+C to stop.`);
      await new Promise((r) => { process.once('SIGINT', r); process.once('SIGTERM', r); });
    } else {
      browser ??= await chromium.launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
      const external = [];
      await context.route('**/*', async (route) => {
        const u = new URL(route.request().url());
        if (!['127.0.0.1'].includes(u.hostname) || ![appOrigin, fixture.origin].includes(u.origin) || !['GET', 'HEAD'].includes(route.request().method())) {
          external.push(`${route.request().method()} ${u.origin}${u.pathname}`); return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const output = join(docs, 'screenshots', id);
      mkdirSync(output, { recursive: true });
      const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const imagesReady = async () => {
        await page.locator('img').evaluateAll(async (images) => { await Promise.all(images.map((im) => { im.loading = 'eager'; return im.decode(); })); });
        await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((im) => im.complete && im.naturalWidth > 0))).toBe(true);
      };
      const goto = async (path) => { const response = await page.goto(`${appOrigin}${path}`); expect(response.status()).toBe(200); await imagesReady(); };
      await goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(profile.homepage[0].title);
      await expect(page.locator('header img')).toHaveAttribute('alt', profile.store.name);
      await expect(page.locator('footer')).toContainText('DEMO FICTIV');
      const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim());
      expect(primary).toBe({ iris: '#701a75', soare: '#9a3412', poveste: '#065f46' }[id]);
      for (const other of DEMO_IDS.filter((x) => x !== id)) await expect(page.locator('body')).not.toContainText(createDemoProfile(other).store.name);
      await expect(page.getByTestId('product-card')).toHaveCount(8);
      await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', profile.store.assets.icon);
      await noOverflow();
      await page.screenshot({ path: join(output, 'homepage-desktop.png'), fullPage: true });
      await page.screenshot({ path: join(output, 'homepage-desktop-fold.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await noOverflow();
      await page.screenshot({ path: join(output, 'homepage-mobile.png'), fullPage: true });
      await page.setViewportSize({ width: 320, height: 800 }); await noOverflow();
      await page.setViewportSize({ width: 1440, height: 1000 });
      await goto('/shop'); await expect(page.getByTestId('product-card')).toHaveCount(10);
      await page.screenshot({ path: join(output, 'catalog-desktop.png'), fullPage: true });
      await goto(`/categories/${profile.categories[0].slug}`); await expect(page.getByTestId('product-card')).toHaveCount(profile.products.filter((p) => p.product_categories[0].category_id === profile.categories[0].id).length);
      const product = profile.products[0];
      await goto(`/products/${product.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(product.name);
      const options = page.getByRole('radio');
      await expect(options).toHaveCount(2);
      await options.nth(1).check();
      let expectedPrice = product.product_variants[1].price_override;
      if (id === 'poveste') {
        await page.getByLabel('Răspunsul tău').fill('Pentru Ana');
        await page.getByLabel('Alege o opțiune').selectOption('Aniversare');
        await page.getByLabel('Da, doresc această opțiune').check();
        expectedPrice += 18;
      }
      await expect(page.getByTestId('configured-price')).toHaveText(new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(expectedPrice));
      await page.screenshot({ path: join(output, 'product-desktop.png'), fullPage: true });
      const configurator = page.getByTestId('configured-price').locator('..').locator('..');
      await configurator.screenshot({ path: join(output, 'options-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 }); await noOverflow();
      await page.screenshot({ path: join(output, 'product-mobile.png'), fullPage: true });
      await configurator.screenshot({ path: join(output, 'options-mobile.png') });
      await page.getByRole('button', { name: 'Adaugă în coș', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('articol a fost adăugat');
      // Browser-only cart is demonstrable; do not navigate to checkout or fake payment.
      const stored = await page.evaluate(() => localStorage.getItem('handmade-store-cart-v1'));
      expect(stored).toContain(product.id);
      const emptyContext = await browser.newContext();
      await emptyContext.route('**/*', (route) => {
        const u = new URL(route.request().url());
        return [appOrigin, fixture.origin].includes(u.origin) && ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort();
      });
      const cleanPage = await emptyContext.newPage();
      await cleanPage.goto(appOrigin);
      await expect.poll(() => cleanPage.evaluate(() => localStorage.getItem('handmade-store-cart-v1'))).not.toBeNull();
      expect(await cleanPage.evaluate(() => localStorage.getItem('handmade-store-cart-v1'))).not.toContain(product.id);
      await emptyContext.close();
      expect(external).toEqual([]); expect(errors).toEqual([]);
      for (const rpc of ['get_public_store_settings', 'get_public_homepage_blocks', 'get_approved_product_reviews']) expect(fixture.audit.paths.has(`/rest/v1/rpc/${rpc}`)).toBe(true);
      expect(fixture.audit.rejected).toBe(0);
      results.push({ id, app: 'real Next routes', data: 'immutable loopback HTTP fixtures (not Supabase)', products: 10, homepageProducts: 8, theme: profile.theme, responsiveWidths: [320, 390, 1440], variants: 'selected, price asserted', customizations: id === 'poveste' ? 'text + selection + boolean; +18 RON asserted' : 'not applicable', cart: 'local browser only; isolated context empty', checkout: 'NOT RUN', payments: 'NOT RUN', database: 'NOT RUN', browserErrors: errors, externalRequests: external, fixtureReads: fixture.audit.reads, fixtureRejected: fixture.audit.rejected });
      await context.close();
      console.log(`${id}: screenshots and route/identity/option assertions PASS`);
    }
    await stopApp(); await fixture.close(); fixture = null;
  }
  if (mode === 'capture') {
    writeFileSync(join(docs, selected ? `validation-${selected}.json` : 'validation.json'), `${JSON.stringify({ templateCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), runtime: 'next build --webpack + next start, loopback only', results }, null, 2)}\n`);
    if (!selected) {
      const board = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
      const panels = DEMO_IDS.map((id) => { const p = createDemoProfile(id); const png = readFileSync(join(docs, 'screenshots', id, 'homepage-desktop-fold.png')).toString('base64'); return `<article><p>${p.store.name}</p><small>${p.theme} · 10 produse fictive</small><img src="data:image/png;base64,${png}" alt="${p.store.name}"/></article>`; }).join('');
      await board.setContent(`<html lang="ro"><head><meta charset="utf-8"/><style>*{box-sizing:border-box}body{margin:0;padding:48px;background:#f4f1eb;color:#25231f;font:16px Arial}h1{font:42px Georgia;margin:10px 0 18px}header>p{letter-spacing:3px;font-size:12px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:40px}article{background:white;padding:18px;border:1px solid #ddd6cb;border-radius:16px;overflow:hidden}article p{font:26px Georgia;margin:0 0 8px}small{color:#686159}img{width:100%;margin-top:20px;border:1px solid #e6e1d9}footer{margin-top:30px;color:#686159}</style></head><body><header><p>COMMERCIAL DEMO SHOWCASE · 10B.4</p><h1>Același template. Trei identități.</h1><div>Comparație din capturi ale aplicației reale, randată local cu fixtures fictive.</div></header><main>${panels}</main><footer>Prezentare locală · Nu sunt magazine live · Checkout și plăți nevalidate · Ilustrații originale</footer></body></html>`);
      await board.locator('img').evaluateAll((images) => Promise.all(images.map((im) => im.decode())));
      await board.screenshot({ path: join(docs, 'comparison.png'), fullPage: true });
      await board.close();
    }
  }
} finally {
  await browser?.close(); await stopApp(); await fixture?.close();
  // Only remove the private temporary directory created by this invocation.
  if (dirname(scratch) !== realpathSync(tmpdir()) || !scratch.split(/[\\/]/).at(-1).startsWith('commercial-showcase-')) throw new Error('Unsafe temporary cleanup target');
  if (existsSync(scratch)) rmSync(scratch, { recursive: true, force: true });
}

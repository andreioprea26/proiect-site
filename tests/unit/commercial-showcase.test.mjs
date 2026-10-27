import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDemoProfile, DEMO_IDS, productIllustration, brandIllustration } from '../fixtures/commercial-demos.mjs';
import { startFixtureServer, localEnvironment } from '../../scripts/lib/commercial-showcase.mjs';
import { normalizeSettings } from '../../src/lib/store-settings/model.ts';
import { brandAsset, getTheme } from '../../src/lib/config/theme.ts';

test('profiles obey real Settings/assets contracts and have coherent independent catalog fixtures', () => {
  const allIds = new Set();
  for (const id of DEMO_IDS) {
    const p = createDemoProfile(id);
    assert.equal(p.products.length, 10);
    assert.deepEqual(normalizeSettings(p.settings).errors, {});
    assert.equal(getTheme(p.theme).primary, { iris: '#701a75', soare: '#9a3412', poveste: '#065f46' }[id]);
    for (const kind of ['logo', 'icon']) assert.equal(brandAsset(p.store.assets[kind], kind), p.store.assets[kind]);
    assert.equal(p.fictitious, true); assert.equal(p.checkoutValidated, false);
    assert.deepEqual(p.reviews, []); assert.deepEqual(p.orders, []); assert.deepEqual(p.payments, []);
    assert.equal(new Set(p.products.map((product) => product.slug)).size, 10);
    for (const product of p.products) {
      assert.match(product.id, /^[0-9a-f-]{36}$/);
      assert(!allIds.has(product.id)); allIds.add(product.id);
      assert(product.base_price > 0 && product.description.length > 60);
      assert.equal(product.publication_status, 'published');
      assert(p.categories.some((c) => c.id === product.product_categories[0].category_id));
      assert(p.collections.some((c) => c.id === product.product_collections[0].collection_id));
      assert.equal(product.is_customizable, product.customization_options.length > 0);
      for (const variant of product.product_variants) assert(p.inventory.some((r) => r.variant_id === variant.id));
      if (!product.product_variants.length) assert(p.inventory.some((r) => r.product_id === product.id));
      for (const option of product.customization_options) assert(['text', 'boolean', 'selection'].includes(option.option_type));
    }
    assert.deepEqual(p.homepage.map((b) => b.slot).sort(), ['categories', 'collections', 'hero', 'products', 'promo']);
    assert(p.homepage.every((b) => b.is_active && b.cta_href.startsWith('/') && !b.cta_href.startsWith('//')));
    const exported = JSON.parse(readFileSync(new URL(`../../docs/commercial-demos/data/${id}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(exported, p, 'versioned public data must reproduce exactly');
  }
  assert.throws(() => createDemoProfile('production'));
});

test('original vector assets contain no scripts, handlers, external resources or embedded images', () => {
  for (const id of DEMO_IDS) {
    const p = createDemoProfile(id);
    const assets = [brandIllustration(p), brandIllustration(p, true), ...p.products.map((v, i) => productIllustration(p, v, i))];
    for (const svg of assets) {
      assert.match(svg, /^<svg /);
      assert.doesNotMatch(svg, /<script|<foreignObject|\son\w+=|href=|<image|url\(/i);
      assert.doesNotMatch(svg.replace('http://www.w3.org/2000/svg', ''), /https?:/);
    }
  }
});

test('loopback fixture exposes public reads only; rejects writes/auth/admin/payment and isolates brands', async () => {
  const iris = await startFixtureServer(createDemoProfile('iris'));
  const soare = await startFixtureServer(createDemoProfile('soare'));
  try {
    const products = await (await fetch(`${iris.origin}/rest/v1/products?publication_status=eq.published&limit=8`)).json();
    assert.equal(products.length, 8);
    const detail = await (await fetch(`${iris.origin}/rest/v1/products?slug=eq.colier-petala`, { headers: { Accept: 'application/vnd.pgrst.object+json' } })).json();
    assert.equal(detail.name, 'Colier Petală');
    const foreign = await (await fetch(`${soare.origin}/rest/v1/products?slug=eq.colier-petala`)).json();
    assert.deepEqual(foreign, []);
    const settings = await (await fetch(`${iris.origin}/rest/v1/rpc/get_public_store_settings`, { method: 'POST' })).json();
    assert.equal(settings[0].display_name, 'Bijuterii Iris');
    for (const [method, route] of [['POST', '/rest/v1/products'], ['PATCH', '/rest/v1/products'], ['DELETE', '/rest/v1/products'], ['POST', '/rest/v1/rpc/place_cod_order'], ['GET', '/rest/v1/orders'], ['GET', '/auth/v1/user'], ['POST', '/api/stripe/webhook'], ['GET', '/storage/v1/object/public/product-images/../secret']]) {
      assert.equal((await fetch(iris.origin + route, { method })).status, 405);
    }
    const image = await fetch(`${iris.origin}/storage/v1/object/public/product-images/iris/colier-petala.svg`);
    assert.equal(image.headers.get('content-type'), 'image/svg+xml');
    assert.equal((await image.text()).includes('ILUSTRAȚIE'), true);
    assert.equal((await fetch(`${iris.origin}/rest/v1/products?slug=like.*`)).status, 405);
  } finally { await iris.close(); await soare.close(); }
});

test('child process environment never inherits cloud credentials or user NODE_OPTIONS', () => {
  const previous = { token: process.env.SUPABASE_ACCESS_TOKEN, options: process.env.NODE_OPTIONS };
  try {
    process.env.SUPABASE_ACCESS_TOKEN = 'must-not-inherit'; process.env.NODE_OPTIONS = '--inspect';
    const env = localEnvironment('http://127.0.0.1:3500', 'http://127.0.0.1:3410');
    assert.equal(env.SUPABASE_ACCESS_TOKEN, undefined); assert.equal(env.NODE_OPTIONS, undefined);
    assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, undefined); assert.equal(env.STRIPE_SECRET_KEY, undefined);
    assert.equal(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'local-showcase-public-placeholder');
    assert.throws(() => localEnvironment('https://example.com', 'http://127.0.0.1:3410'));
    assert.throws(() => localEnvironment('http://0.0.0.0:3500', 'http://127.0.0.1:3410'));
  } finally {
    for (const [key, value] of [['SUPABASE_ACCESS_TOKEN', previous.token], ['NODE_OPTIONS', previous.options]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

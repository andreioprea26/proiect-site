// GET-only anonymous smoke checks against the verified handmade 9.3 branch Preview.
// No credentials, cookies, form submissions, service SDKs, or deployment calls.
const origin = "https://proiect-site-git-task-4af756-andreioprea26x-gmailcoms-projects.vercel.app";
const approvedOrigins = new Set([
  origin,
]);
const checks = [
  ["/", 200], ["/shop", 200],
  ["/shop?q=ceramic%C4%83&sort=price_asc", 200],
  ["/categories", 200], ["/categories/accesorii-demo", 200],
  ["/collections", 200], ["/collections/colectia-atelier-demo", 200],
  ["/products/cana-ceramica-padure-demo", 200],
  ["/products/geanta-crosetata-sage-demo", 200],
  ["/products/bratara-unicat-luna-demo", 200],
  ["/cart", 200], ["/checkout", 200],
  ["/login", 200], ["/register", 200], ["/forgot-password", 200],
  ["/reset-password", 200], ["/contact", 200], ["/custom-orders", 200],
  // No tokens/codes supplied: these must fail closed via a local error redirect,
  // without OTP verification or session exchange.
  ["/auth/confirm", 307], ["/auth/reset-password", 307],
  ["/account", 307], ["/admin/products", 307],
  ["/robots.txt", 200], ["/sitemap.xml", 200],
  ["/api/stripe/webhook", 405], ["/missing-handmade-regression", 404],
];
const results = [];
for (const [path, expectedStatus] of checks) {
  const response = await fetch(new URL(path, origin), {
    method: "GET", redirect: "manual", signal: AbortSignal.timeout(30000),
  });
  const location = response.headers.get("location");
  const body = await response.text();
  const safeRedirect = !location || approvedOrigins.has(new URL(location, origin).origin);
  const pass = response.status === expectedStatus && safeRedirect;
  results.push({
    path, status: response.status, expectedStatus, pass,
    location: location ? new URL(location, origin).pathname : null,
    title: body.match(/<title>([^<]*)<\/title>/)?.[1] ?? null,
    h1: body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, "").trim() ?? null,
    canonical: body.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1] ?? null,
    robots: response.headers.get("x-robots-tag"),
  });
}
console.log(JSON.stringify({ origin, method: "GET", anonymous: true, results }, null, 2));
if (results.some((result) => !result.pass)) process.exitCode = 1;

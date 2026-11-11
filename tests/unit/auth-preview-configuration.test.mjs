import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextResponse } = require("next/server");
const preview = "https://handmade-preview.example.invalid";

// Run the real route and environment source, with only the Supabase dependency
// replaced. No .env, credentials, browser, listening server, or network access.
function loadRoute(file, { appUrl = preview, fail = "return", recovery = false } = {}) {
  const calls = [];
  const rejectToken = async (method) => {
    calls.push(method);
    if (fail === "throw") throw new Error("synthetic provider failure");
    return { data: { session: null }, error: { code: "synthetic_invalid_token" } };
  };
  const auth = {
    verifyOtp: () => rejectToken("verifyOtp"),
    exchangeCodeForSession: () => rejectToken("exchangeCodeForSession"),
    getClaims: async () => ({ data: { claims: { amr: [{ method: recovery ? "recovery" : "password" }] } }, error: null }),
    signOut: async () => { calls.push("signOut"); return { error: null }; },
  };
  if (fail === "session") {
    auth.exchangeCodeForSession = async () => {
      calls.push("exchangeCodeForSession");
      return { data: { session: { access_token: "synthetic-session" } }, error: null };
    };
  }
  const cache = new Map();
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative).exports;
    const source = readFileSync(new URL(`../../${relative}`, import.meta.url), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const loadedModule = { exports: {} };
    cache.set(relative, loadedModule);
    const allowed = {
      "@/lib/config/env": "src/lib/config/env.ts",
      "@/lib/auth/password-reset": "src/lib/auth/password-reset.ts",
      "@/lib/auth/registration": "src/lib/auth/registration.ts",
    };
    vm.runInNewContext(output, {
      module: loadedModule, exports: loadedModule.exports, URL, Response,
      process: { env: appUrl === null ? {} : { APP_URL: appUrl } },
      require(specifier) {
        if (specifier === "next/server") return { NextResponse };
        if (specifier === "@/lib/supabase/server") return { createClient: async () => ({ auth }) };
        if (allowed[specifier]) return load(allowed[specifier]);
        throw new Error(`Unexpected dependency: ${specifier}`);
      },
    }, { filename: relative });
    return loadedModule.exports;
  }
  return { route: load(file), calls };
}

for (const [kind, target] of [["confirm", "/auth/confirmed"], ["reset-password", "/reset-password"]]) {
  test(`${kind}: missing APP_URL reproduces configuration failure without an Auth call`, async () => {
    const { route, calls } = loadRoute(`src/app/auth/${kind}/route.ts`, { appUrl: null });
    await assert.rejects(route.GET(new Request(`https://incoming.example.invalid/auth/${kind}`)),
      /Missing required environment variable: APP_URL/);
    assert.deepEqual(calls, []);
  });
  test(`${kind}: configured APP_URL rejects absent tokens with a safe 307 redirect`, async () => {
    const { route, calls } = loadRoute(`src/app/auth/${kind}/route.ts`);
    const response = await route.GET(new Request(`https://incoming.example.invalid/auth/${kind}?next=https://external.example.invalid`));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), `${preview}${target}?status=error`);
    assert.deepEqual(calls, []);
  });
  for (const fail of ["return", "throw"]) {
    test(`${kind}: invalid code (${fail}) is handled when APP_URL exists`, async () => {
      const { route, calls } = loadRoute(`src/app/auth/${kind}/route.ts`, { fail });
      const response = await route.GET(new Request(`https://incoming.example.invalid/auth/${kind}?code=synthetic-invalid`));
      assert.equal(response.status, 307);
      assert.equal(response.headers.get("location"), `${preview}${target}?status=error`);
      assert.deepEqual(calls, ["exchangeCodeForSession"]);
    });
  }
}

test("confirm: invalid email OTP is handled without exposing provider details", async () => {
  const { route, calls } = loadRoute("src/app/auth/confirm/route.ts");
  const response = await route.GET(new Request("https://incoming.example.invalid/auth/confirm?token_hash=synthetic-invalid&type=email"));
  assert.equal(response.headers.get("location"), `${preview}/auth/confirmed?status=error`);
  assert.deepEqual(calls, ["verifyOtp"]);
});

test("confirm: unsupported token type never calls Auth", async () => {
  const { route, calls } = loadRoute("src/app/auth/confirm/route.ts");
  const response = await route.GET(new Request("https://incoming.example.invalid/auth/confirm?token_hash=synthetic&type=recovery"));
  assert.equal(response.headers.get("location"), `${preview}/auth/confirmed?status=error`);
  assert.deepEqual(calls, []);
});

for (const recovery of [false, true]) {
  test(`reset: session recovery=${recovery} retains the recovery-claim check`, async () => {
    const { route, calls } = loadRoute("src/app/auth/reset-password/route.ts", { fail: "session", recovery });
    const response = await route.GET(new Request("https://incoming.example.invalid/auth/reset-password?code=synthetic"));
    assert.equal(response.headers.get("location"), `${preview}/reset-password?status=${recovery ? "ready" : "error"}`);
    assert.deepEqual(calls, recovery ? ["exchangeCodeForSession"] : ["exchangeCodeForSession", "signOut"]);
  });
}

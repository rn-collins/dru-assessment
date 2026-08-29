import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const r = p => readFile(new URL("../" + p, import.meta.url), "utf8");

test("method boundaries prohibit composite interpretation", async () => {
  const s = (await r("public/index.html")) + (await r("public/methodology.html"));
  assert.match(s, /does not[^.]*knowledge gain/i);
  assert.match(s, /must not be summed/);
  assert.doesNotMatch(s, /percent improvement|effectiveness score/i);
});

test("export is self describing", async () => {
  const s = await r("public/app.js");
  for (const x of ["noCompositeScore", "responseOptions", "pseudonymousNotAnonymous", "ordinal"])
    assert.match(s, new RegExp(x));
});

test("strict CSP and bounded storage", async () => {
  assert.doesNotMatch(await r("vercel.json"), /unsafe-inline/);
  const s = await r("public/app.js");
  assert.match(s, /Array\.isArray/);
  assert.match(s, /seen\.has/);
});

test("connect-src stays 'none' — the browser-local guarantee", async () => {
  assert.match(await r("vercel.json"), /connect-src 'none'/);
});

test("no runtime network call exists in any shipped script", async () => {
  const s = await r("public/app.js");
  assert.doesNotMatch(s, /\bfetch\s*\(/);
  assert.doesNotMatch(s, /new\s+(XMLHttpRequest|WebSocket|EventSource)\s*\(/);
  assert.doesNotMatch(s, /sendBeacon\s*\(/);
  assert.doesNotMatch(s, /import\s*\(/);
});

test("no page loads a third-party asset", async () => {
  for (const p of ["public/index.html", "public/methodology.html", "public/design.html", "public/privacy.html", "public/404.html"]) {
    const s = await r(p);
    for (const m of s.matchAll(/\b(?:src|href)\s*=\s*"([^"]+)"/g)) {
      const u = m[1];
      if (/^https?:\/\//i.test(u)) {
        assert.match(u, /^https:\/\/(dru-assessment\.vercel\.app|www\.fda\.gov|www\.nccih\.nih\.gov|doi\.org|eur-lex\.europa\.eu)\//,
          `${p} references off-site asset or link: ${u}`);
      }
    }
  }
});

test("paired view reports labels, never a score", async () => {
  const s = await r("public/app.js");
  assert.match(s, /no total, no change score, no effect estimate/i);
  assert.doesNotMatch(s, /reduce\(\s*\(a,\s*b\)\s*=>\s*a\s*\+\s*b/);
});

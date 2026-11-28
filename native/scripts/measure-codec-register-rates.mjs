#!/usr/bin/env node
// native/scripts/measure-codec-register-rates.mjs — MEASURE the rate-based register read (codec-register.mjs registerByRates) on documents nothing has seen.
// Every document falls in one of five parts by a hash of its path. Parts 3 and 4 choose each source's terms (GenrePrior@1's declared test); part 2 measures each source's hit rates inside and outside its
// genre (documents the terms were not chosen on); the read is scored on passages from the part named by --test (0 = the passages the first, negative run saw: DEV; 1 = FRESH).
// Arms: PATTERN (registerByPattern: each register a hypothesis over the hits of ALL sources), RATES (registerByRates: each source alone against the rest), V1 (registerOf, the size-priced read recorded negative), COUNT (most hits, never abstains), MAJORITY.
// Usage: node native/scripts/measure-codec-register-rates.mjs --zenodotus <checkout> --test 0|1 [--tokens 300]
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const { registerOf, registerByRates, registerByPattern, termsOf } = await import("../the-fold/codec-register.mjs");
const Z = arg("zenodotus"), LEN = Number(arg("tokens", 300)), TEST = Number(arg("test", 0)), CAP = 400, GENRES = { literature: "01-literature-books", encyclopedic: "02-encyclopedic", academic: "05-academic-papers", "government-legal": "06-government-legal" };
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f, out); else if (e.name.endsWith(".txt")) out.push(f); } return out; };
const part = (f) => parseInt(crypto.createHash("sha256").update(path.relative(Z, f)).digest("hex").slice(0, 8), 16) % 5;
// A REGISTER SOURCE IS SCOPED BY LANGUAGE (found on DEV, 2026-11-28: the "literature" shelf holds Don Quixote in Spanish, Les Miserables in French, the Iliad in Greek, the Aeneid in Latin; pooled, its
// rates were another language's). Each document's root is read by codec-regions on a slice from its middle, and only documents whose main root is --root (default eng) are used, for terms, rates and test alike.
const { regionCodecs } = await import("../the-fold/codec-regions.mjs"), ROOT = arg("root", "eng"), docs = {}, dropped = {};
for (const [g, dir] of Object.entries(GENRES)) { docs[g] = []; dropped[g] = 0; for (const f of walk(path.join(Z, dir)).sort().slice(0, CAP)) { const text = fs.readFileSync(f, "utf8"), terms = termsOf(text); if (terms.length < LEN * 2) continue;
  const mid = Math.floor(text.length / 2), r = await regionCodecs(text.slice(mid, mid + 1500)), main = Object.entries(r.mixture ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null; if (main !== ROOT) { dropped[g]++; continue; } docs[g].push({ part: part(f), terms }); } }
console.log(`documents whose main root is not ${ROOT}, left out:`, JSON.stringify(dropped));
const of = (g, ps) => docs[g].filter((d) => ps.includes(d.part)), G = Object.keys(GENRES);
const g2 = (a, b, c, d) => { const n = a + b + c + d, e = (x, r, k) => (x > 0 ? x * Math.log(x / ((r * k) / n)) : 0); return 2 * (e(a, a + b, a + c) + e(b, a + b, b + d) + e(c, c + d, a + c) + e(d, c + d, b + d)); };
const df = {}, tf = {}; for (const g of G) { df[g] = new Map(); tf[g] = new Map(); for (const d of of(g, [3, 4])) { for (const w of d.terms) tf[g].set(w, (tf[g].get(w) ?? 0) + 1); for (const w of new Set(d.terms)) df[g].set(w, (df[g].get(w) ?? 0) + 1); } }
const sources = G.map((g) => { const n1 = of(g, [3, 4]).length, others = G.filter((x) => x !== g), n0 = others.reduce((s, x) => s + of(x, [3, 4]).length, 0), terms = new Set();
  for (const [w, a] of df[g]) { if ((tf[g].get(w) ?? 0) < 4) continue; const c = others.reduce((s, x) => s + (df[x].get(w) ?? 0), 0); if (a / n1 > c / n0 && g2(a, n1 - a, c, n0 - c) >= 3.841) terms.add(w); }
  // hit rates on part 2 (each document one vote, so a long book does not set the rate): the mean over documents of the share of each document's terms among the genre's own documents (in) and of every other genre's documents (out), each OTHER genre weighted equally so the largest does not set the rate
  const rate = (ds) => { let s = 0; for (const d of ds) { let k = 0; for (const w of d.terms) if (terms.has(w)) k++; s += k / d.terms.length; } return ds.length ? s / ds.length : null; }, rin = rate(of(g, [2])), outs = others.map((x) => rate(of(x, [2]))).filter((x) => x != null);
  return { id: `rebuilt:${g}`, register: g, terms, standing: "measured", rates: { in: +rin.toFixed(4), out: +(outs.reduce((a, b) => a + b, 0) / outs.length).toFixed(4), by: Object.fromEntries(G.map((h) => [h, rate(of(h, [2]))])) }, docs: { terms: n1, rates: of(g, [2]).length } }; });
console.log("sources:", sources.map((s) => `${s.register} terms ${s.terms.size} (from ${s.docs.terms} docs) in ${s.rates.in} out ${s.rates.out} (rates from ${s.docs.rates} docs)`).join(" | "));
const tests = []; for (const g of G) for (const d of of(g, [TEST])) { const m = Math.floor(d.terms.length / 2); tests.push({ gold: g, passage: d.terms.slice(m, m + LEN).join(" ") }); }
const maj = Object.entries(tests.reduce((m, t) => ((m[t.gold] = (m[t.gold] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])[0][0];
const arms = { PATTERN: (t) => registerByPattern(t, { sources }).register, RATES: (t) => registerByRates(t, { sources }).register, V1: (t) => registerOf(t, { sources }).register, COUNT: (t) => sources.map((s) => ({ g: s.register, k: termsOf(t).filter((w) => s.terms.has(w)).length })).sort((a, b) => b.k - a.k)[0].g, MAJORITY: () => maj };
console.log(`test part ${TEST}${TEST === 0 ? " (DEV: seen)" : " (FRESH)"}: ${tests.length} passages of ${LEN} terms: ${G.map((g) => `${g} ${tests.filter((t) => t.gold === g).length}`).join(", ")}`);
for (const [name, fn] of Object.entries(arms)) { const T = { correct: 0, wrong: 0, abstain: 0 }, by = {}, conf = {}; for (const t of tests) { const got = fn(t.passage), k = got === null ? "abstain" : got === t.gold ? "correct" : "wrong"; T[k]++; by[t.gold] ??= [0, 0, 0]; by[t.gold][["correct", "wrong", "abstain"].indexOf(k)]++; if (k === "wrong") conf[`${t.gold}->${got}`] = (conf[`${t.gold}->${got}`] ?? 0) + 1; }
  console.log(name.padEnd(9), JSON.stringify(T), "| by genre c/w/a:", G.map((g) => `${g} ${(by[g] ?? [0, 0, 0]).join("/")}`).join("  "), "|", JSON.stringify(conf)); }

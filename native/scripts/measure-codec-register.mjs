#!/usr/bin/env node
// native/scripts/measure-codec-register.mjs — MEASURE the register read (the-fold/codec-register.mjs) on documents its sources NEVER SAW.
// The shipped GenrePrior@1 files were measured over the whole Zenodotus corpus, so scoring them on Zenodotus documents would be circular. Here the sources are REBUILT from a training part of each genre's
// documents by GenrePrior@1's own declared test (a term of 4+ letters, 4+ occurrences, over-represented in the genre's documents against the other genres: 2x2 G-squared at 3.841), and the read is
// scored on passages from the held-out documents. The split is by a hash of the file path (every fifth document is held out): no document is chosen by hand.
// Arms: REGISTER (the module: fitted share, description-length bar, may abstain), COUNT (the source with the most hits, never abstains), MAJORITY (the commonest genre among the test passages).
// Usage: node native/scripts/measure-codec-register.mjs --zenodotus <checkout> [--tokens 300] [--cap 400]
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const { registerOf, termsOf } = await import("../the-fold/codec-register.mjs");
const Z = arg("zenodotus"), LEN = Number(arg("tokens", 300)), CAP = Number(arg("cap", 400)), GENRES = { literature: "01-literature-books", encyclopedic: "02-encyclopedic", academic: "05-academic-papers", "government-legal": "06-government-legal" };
if (!Z) { console.error("usage: measure-codec-register.mjs --zenodotus <checkout>"); process.exit(2); }
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f, out); else if (e.name.endsWith(".txt")) out.push(f); } return out; };
const held = (f) => parseInt(crypto.createHash("sha256").update(path.relative(Z, f)).digest("hex").slice(0, 8), 16) % 5 === 0;
const docs = {}; for (const [g, dir] of Object.entries(GENRES)) { const files = walk(path.join(Z, dir)).sort().slice(0, CAP); docs[g] = files.map((f) => ({ f, test: held(f), terms: termsOf(fs.readFileSync(f, "utf8")) })).filter((d) => d.terms.length >= LEN * 2); }
// rebuild the sources from the TRAIN documents (GenrePrior@1's declared test, one arm)
const g2 = (a, b, c, d) => { const n = a + b + c + d, e = (x, r, k) => (x > 0 ? x * Math.log(x / ((r * k) / n)) : 0); return 2 * (e(a, a + b, a + c) + e(b, a + b, b + d) + e(c, c + d, a + c) + e(d, c + d, b + d)); };
const train = Object.fromEntries(Object.entries(docs).map(([g, ds]) => [g, ds.filter((d) => !d.test)])), df = {}, tf = {};
for (const [g, ds] of Object.entries(train)) { df[g] = new Map(); tf[g] = new Map(); for (const d of ds) { for (const w of d.terms) tf[g].set(w, (tf[g].get(w) ?? 0) + 1); for (const w of new Set(d.terms)) df[g].set(w, (df[g].get(w) ?? 0) + 1); } }
const sources = Object.keys(GENRES).map((g) => { const n1 = train[g].length, others = Object.keys(GENRES).filter((x) => x !== g), n0 = others.reduce((s, x) => s + train[x].length, 0), terms = new Set();
  for (const [w, a] of df[g]) { if ((tf[g].get(w) ?? 0) < 4) continue; const c = others.reduce((s, x) => s + (df[x].get(w) ?? 0), 0); if (a / n1 > c / n0 && g2(a, n1 - a, c, n0 - c) >= 3.841) terms.add(w); }
  return { id: `rebuilt:${g}`, register: g, terms, standing: "measured", docs: n1 }; });
console.log("train docs:", Object.entries(train).map(([g, d]) => `${g} ${d.length}`).join(", "), "| terms:", sources.map((s) => `${s.register} ${s.terms.size}`).join(", "));
// score passages from the HELD-OUT documents: one passage of LEN terms from the middle of each
const tests = []; for (const [g, ds] of Object.entries(docs)) for (const d of ds.filter((x) => x.test)) { const m = Math.floor(d.terms.length / 2); tests.push({ gold: g, passage: d.terms.slice(m, m + LEN).join(" ") }); }
const count = (t) => sources.map((s) => ({ g: s.register, k: termsOf(t).filter((w) => s.terms.has(w)).length })).sort((a, b) => b.k - a.k)[0].g, maj = Object.entries(tests.reduce((m, t) => ((m[t.gold] = (m[t.gold] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])[0][0];
const T = { correct: 0, wrong: 0, abstain: 0 }, byG = {}, conf = {}; let okCount = 0;
for (const t of tests) { const r = registerOf(t.passage, { sources }), got = r.register; byG[t.gold] ??= { correct: 0, wrong: 0, abstain: 0, n: 0 }; byG[t.gold].n++; const k = got === null ? "abstain" : got === t.gold ? "correct" : "wrong"; T[k]++; byG[t.gold][k]++; if (k === "wrong") conf[`${t.gold}->${got}`] = (conf[`${t.gold}->${got}`] ?? 0) + 1; if (count(t.passage) === t.gold) okCount++; }
console.log(`held-out passages: ${tests.length} of ${LEN} terms`); console.log("REGISTER", JSON.stringify(T), "| COUNT correct", okCount, "| MAJORITY correct", tests.filter((t) => t.gold === maj).length, `(${maj})`);
console.log("by genre:", JSON.stringify(byG)); console.log("confusions:", JSON.stringify(conf));

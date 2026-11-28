#!/usr/bin/env node
// native/scripts/measure-codec-register-enron.mjs — A BUSINESS-EMAIL REGISTER SOURCE from the Enron corpus (CMU release 2015-05-07; public, fetched on the owner's word, never committed), and a
// FIVE-WAY test of the register read (codec-register.mjs) on authors and documents nothing has seen.
// Enron: only what a mailbox owner WROTE (the sent folders), headers dropped, quoted and forwarded material dropped (the mail format's own markers), a body of at least --tokens terms, at most --per
// bodies per mailbox so one prolific sender does not set the register. Every MAILBOX falls in one of five parts by a hash of its name, so a test author is never a training author.
// Zenodotus genres (literature, encyclopedic, academic, government-legal): split by a hash of the path, as in measure-codec-register-rates.mjs. Every document must have English as its main root (codec-regions).
// Parts 3 and 4 choose terms (GenrePrior@1's declared test, five genres); part 2 measures hit rates (each document one vote); the read is scored on part --test (1 = FRESH).
// Usage: node native/scripts/measure-codec-register-enron.mjs --zenodotus <checkout> --enron <maildir> [--test 1] [--tokens 40] [--per 12]
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const { registerByRates, registerByPattern, termsOf } = await import("../the-fold/codec-register.mjs"), { regionCodecs } = await import("../the-fold/codec-regions.mjs");
const Z = arg("zenodotus"), E = arg("enron"), LEN = Number(arg("tokens", 40)), TEST = Number(arg("test", 1)), PER = Number(arg("per", 12)), CAP = 400, BUS = "business-email";
if (!Z || !E) { console.error("usage: measure-codec-register-enron.mjs --zenodotus <checkout> --enron <maildir>"); process.exit(2); }
const h5 = (s) => parseInt(crypto.createHash("sha256").update(s).digest("hex").slice(0, 8), 16) % 5;
const walk = (d, ok, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f, ok, out); else if (ok(e.name)) out.push(f); } return out; };
const english = async (text) => { const mid = Math.max(0, Math.floor(text.length / 2) - 750), r = await regionCodecs(text.slice(mid, mid + 1500)); return (Object.entries(r.mixture ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) === "eng"; };
/** the body a sender wrote: after the first blank line (the header block ends there), up to the first quoted or forwarded block; lines of quoted mail dropped. Mail FORMAT, not language. */
function bodyOf(raw) {
  const i = raw.indexOf("\n\n"); let b = i < 0 ? "" : raw.slice(i + 2);
  for (const mark of ["-----Original Message-----", "----- Forwarded by", "---------------------- Forwarded by", "-----Original Appointment-----"]) { const k = b.indexOf(mark); if (k >= 0) b = b.slice(0, k); }
  return b.split("\n").filter((l) => !l.startsWith(">") && !l.trimStart().startsWith("To:") && !l.trimStart().startsWith("cc:") && !l.trimStart().startsWith("From:") && !l.trimStart().startsWith("Subject:") && !l.trimStart().startsWith("Sent:")).join("\n");
}
const GENRES = { literature: "01-literature-books", encyclopedic: "02-encyclopedic", academic: "05-academic-papers", "government-legal": "06-government-legal" }, docs = {}, left = {};
for (const [g, dir] of Object.entries(GENRES)) { docs[g] = []; left[g] = 0; for (const f of walk(path.join(Z, dir), (n) => n.endsWith(".txt")).sort().slice(0, CAP)) { const text = fs.readFileSync(f, "utf8"), terms = termsOf(text); if (terms.length < LEN * 2) continue; if (!(await english(text))) { left[g]++; continue; } docs[g].push({ part: h5(path.relative(Z, f)), terms }); } }
docs[BUS] = []; left[BUS] = 0; let boxes = 0, seen = new Set();
for (const user of fs.readdirSync(E).sort()) { const sent = fs.readdirSync(path.join(E, user), { withFileTypes: true }).filter((d) => d.isDirectory() && d.name.toLowerCase().includes("sent")).map((d) => path.join(E, user, d.name)); if (!sent.length) continue; boxes++;
  let kept = 0; for (const f of sent.flatMap((d) => walk(d, () => true)).sort()) { if (kept >= PER) break; const body = bodyOf(fs.readFileSync(f, "latin1")), terms = termsOf(body); if (terms.length < LEN) continue; const key = terms.slice(0, 30).join(" "); if (seen.has(key)) continue; seen.add(key);   // the same mail filed in two sent folders is one mail
    if (!(await english(body))) { left[BUS]++; continue; } docs[BUS].push({ part: h5(user), terms }); kept++; } }
const G = Object.keys(docs), of = (g, ps) => docs[g].filter((d) => ps.includes(d.part));
console.log(`mailboxes with a sent folder: ${boxes}; not English, left out:`, JSON.stringify(left)); console.log("documents by part [0..4]:", G.map((g) => `${g} ${[0, 1, 2, 3, 4].map((p) => of(g, [p]).length).join("/")}`).join(" | "));
const g2 = (a, b, c, d) => { const n = a + b + c + d, e = (x, r, k) => (x > 0 ? x * Math.log(x / ((r * k) / n)) : 0); return 2 * (e(a, a + b, a + c) + e(b, a + b, b + d) + e(c, c + d, a + c) + e(d, c + d, b + d)); };
const df = {}, tf = {}; for (const g of G) { df[g] = new Map(); tf[g] = new Map(); for (const d of of(g, [3, 4])) { for (const w of d.terms) tf[g].set(w, (tf[g].get(w) ?? 0) + 1); for (const w of new Set(d.terms)) df[g].set(w, (df[g].get(w) ?? 0) + 1); } }
const rate = (terms, ds) => { let s = 0; for (const d of ds) { let k = 0; for (const w of d.terms) if (terms.has(w)) k++; s += k / d.terms.length; } return ds.length ? s / ds.length : null; };
const sources = G.map((g) => { const n1 = of(g, [3, 4]).length, others = G.filter((x) => x !== g), n0 = others.reduce((s, x) => s + of(x, [3, 4]).length, 0), terms = new Set();
  for (const [w, a] of df[g]) { if ((tf[g].get(w) ?? 0) < 4) continue; const c = others.reduce((s, x) => s + (df[x].get(w) ?? 0), 0); if (a / n1 > c / n0 && g2(a, n1 - a, c, n0 - c) >= 3.841) terms.add(w); }
  const outs = others.map((x) => rate(terms, of(x, [2]))).filter((x) => x != null); return { id: `rebuilt:${g}`, register: g, terms, standing: "measured", rates: { in: rate(terms, of(g, [2])), out: outs.reduce((a, b) => a + b, 0) / outs.length, by: Object.fromEntries(G.map((h2) => [h2, rate(terms, of(h2, [2]))])) }, docs: n1 }; });
console.log("sources:", sources.map((s) => `${s.register} ${s.terms.size} terms from ${s.docs} docs, in ${s.rates.in?.toFixed(3)} out ${s.rates.out?.toFixed(3)}`).join(" | "));
const bus = sources.find((s) => s.register === BUS), top = [...df[BUS]].filter(([w]) => bus.terms.has(w)).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([w]) => w); console.log("the business-email source's 40 most widespread terms:", top.join(" "));
// test: one passage of LEN terms per held-out document (from its middle), at most 60 per genre so no genre is the test
const tests = []; for (const g of G) for (const d of of(g, [TEST]).slice(0, 60)) { const m = Math.max(0, Math.floor(d.terms.length / 2) - Math.floor(LEN / 2)); tests.push({ gold: g, passage: d.terms.slice(m, m + LEN).join(" ") }); }
const maj = Object.entries(tests.reduce((m, t) => ((m[t.gold] = (m[t.gold] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])[0][0];
const arms = { PATTERN: (t) => registerByPattern(t, { sources }).register, RATES: (t) => registerByRates(t, { sources }).register, COUNT: (t) => sources.map((s) => ({ g: s.register, k: termsOf(t).filter((w) => s.terms.has(w)).length })).sort((a, b) => b.k - a.k)[0].g, MAJORITY: () => maj };
console.log(`test part ${TEST}${TEST === 1 ? " (FRESH)" : " (DEV)"}: ${tests.length} passages of ${LEN} terms: ${G.map((g) => `${g} ${tests.filter((t) => t.gold === g).length}`).join(", ")}`);
for (const [name, fn] of Object.entries(arms)) { const T = { correct: 0, wrong: 0, abstain: 0 }, by = {}, conf = {}; for (const t of tests) { const got = fn(t.passage), k = got === null ? "abstain" : got === t.gold ? "correct" : "wrong"; T[k]++; by[t.gold] ??= [0, 0, 0]; by[t.gold][["correct", "wrong", "abstain"].indexOf(k)]++; if (k === "wrong") conf[`${t.gold}->${got}`] = (conf[`${t.gold}->${got}`] ?? 0) + 1; }
  console.log(name.padEnd(9), JSON.stringify(T), "| c/w/a:", G.map((g) => `${g} ${(by[g] ?? [0, 0, 0]).join("/")}`).join("  "), "|", JSON.stringify(conf)); }
// the sentence that started this (a hand example, not a measurement), and how often codec-regions cuts a fresh business mail into more than one root
const line = "Per my last email, kindly revert by EOD so we can circle back and align on the deliverables."; console.log("hand example:", JSON.stringify(line), "-> PATTERN", registerByPattern(line, { sources }).register, "| RATES", registerByRates(line, { sources }).register);
let one = 0, n = 0; for (const d of of(BUS, [TEST]).slice(0, 200)) { const r = await regionCodecs(d.terms.join(" ")); n++; if (r.roots.length === 1 && r.roots[0] === "eng") one++; } console.log(`codec-regions on fresh business mail (terms of 4+ letters only): one root, English, in ${one} of ${n}`);

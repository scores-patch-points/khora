#!/usr/bin/env node
// clause-witness-agreement.mjs — do clause boundaries (adapters/text/clause-spans.js) respect what an INDEPENDENT reader found, in any
// language? Language-neutral: the witness is relations.js, as stored on each atom of a pinned Callimachus record.
//
//   node native/scripts/clause-witness-agreement.mjs --out DIR --lang eng|spa|fra|… [--parser] [--draws N --seed S]
//
// Replays the record from DIR/layers (each page must reproduce its pinned sha256). For every sentence that carries a relations.js
// witness (subject surface + predicate), clauseSpans cuts the sentence, in up to three modes:
//   bare    the module's defaults (priors.js, English) — or, for another language, its closed classes derived from the received UD POS
//           prior (closedClassesFromPrior), never hand-typed;
//   prior   the same plus the POS prior itself (predicates by dominant tag: fronted adjuncts, pro-drop coordination);
//   parser  (English only, --parser) the same plus khora's UD parse, every cut needing the parse's agreement.
// Measured per mode: boundaries found, fronted segments found, and WITNESS AGREEMENT — the share of witnessed (subject … predicate)
// stretches that no boundary cuts. The null re-deals the same number of boundaries per sentence uniformly over its word starts
// (DRAWS seeded draws); p = share of draws whose agreement reaches the observed. Only the draws and the seed are declared.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { makePinax, parseAddress } from "../organs/pinax.js";
import { clauseSpans, closedClassesFromPrior } from "../adapters/text/clause-spans.js";
import { seeded } from "../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = resolve(opt("--out", "callimachus-out"));
const lang = opt("--lang", "eng");
const DRAWS = Number(opt("--draws", 999)), SEED = opt("--seed", "clause-witness");

const EXTRACTOR = { name: "web.js#extractReadable", sha256: createHash("sha256").update(readFileSync(join(here, "../organs/web.js"))).digest("hex") };
const prior = JSON.parse(readFileSync(join(out, "record.json"), "utf8"));
const store = {};
for (const s of prior.sources) {
  const raw = readFileSync(join(out, "layers", `${s.id}.raw`));
  const text = readFileSync(join(out, "layers", `${s.id}.txt`), "utf8");
  const rec = await makePinax({ url: s.url, finalUrl: s.final_url, retrievedAt: s.retrieved_at, fetch: s.fetch, raw: new Uint8Array(raw), text, extractor: EXTRACTOR });
  if (rec.entry.id !== s.id || rec.entry.text.sha256 !== s.text.sha256) { console.error(`replay: ${s.id} does not reproduce from its layers`); process.exit(3); }
  store[rec.entry.id] = rec;
}
const dec = new TextDecoder();
const bytesOf = (a) => { const p = parseAddress(a); return p && store[p.pinax] ? { L: store[p.pinax].layers[p.layer], ...p } : null; };

// Sentences with their witnessed stretches, in UTF-16 offsets of the sentence.
const sentences = new Map();
for (const a of prior.atoms) {
  if (!a.relation?.pred || !a.relation.subj_surface) continue;
  const sp = bytesOf(a.span), sj = bytesOf(a.relation.subj_surface);
  if (!sp || !sj || sj.start < sp.start || sj.end > sp.end) continue;
  const text = dec.decode(sp.L.subarray(sp.start, sp.end));
  const subjFrom = dec.decode(sp.L.subarray(sp.start, sj.start)).length, subjTo = subjFrom + dec.decode(sp.L.subarray(sj.start, sj.end)).length;
  const verbAt = text.indexOf(a.relation.pred, subjTo);
  if (verbAt < 0) continue;
  const e = sentences.get(a.span) ?? sentences.set(a.span, { text, stretches: [] }).get(a.span);
  if (!e.stretches.some((x) => x[0] === subjFrom && x[1] === verbAt)) e.stretches.push([subjFrom, verbAt, a.relation.pred.toLowerCase()]);
}

const posPrior = JSON.parse(readFileSync(join(here, `../priors/pos-${lang}.json`), "utf8"));
// The stricter subset: the witness's predicate is VERB- or AUX-dominant in this language's own POS prior (relations.js also names
// prepositions and stray English words as predicates on non-English pages).
const domTag = (f) => Object.entries(posPrior.forms?.[f] ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
const VERBAL = args.includes("--verbal");
if (VERBAL) for (const e of sentences.values()) e.stretches = e.stretches.filter(([, , p]) => ["VERB", "AUX"].includes(domTag(p)));
for (const [k, e] of [...sentences]) if (!e.stretches.length) sentences.delete(k);
// GAP 1, measured: --add-sub WORD adds a form the module excludes ("that", Spanish "que") to the subordinators, as an extra arm.
const addSub = args.flatMap((a, i) => (a === "--add-sub" ? [args[i + 1]] : []));
const derived = lang === "eng" ? {} : closedClassesFromPrior(posPrior);
const { SUBORDINATING_CONJUNCTIONS } = await import("../adapters/text/priors.js");
const baseSub = derived.subordinators ?? SUBORDINATING_CONJUNCTIONS;
const modes = { bare: () => ({ ...derived }), prior: () => ({ ...derived, posPrior }) };
if (addSub.length) modes[`+${addSub.join("+")}`] = () => ({ ...derived, posPrior, subordinators: new Set([...baseSub, ...addSub]) });
let parse = null;
if (args.includes("--parser")) {
  if (lang !== "eng") { console.error("--parser: there is no parser for this language on disk"); process.exit(2); }
  const { readRows } = await import("../organs/claim-realize.js");
  const { loadModel } = await import("../adapters/text/english-parser.js");
  const model = loadModel(JSON.parse(readFileSync(join(here, "../priors/parser-eng-ewt.json"), "utf8")));
  parse = (t) => readRows(model, t);
  modes.parser = (t) => ({ ...derived, posPrior, rows: parse(t), opaqueQuotes: true });
}

const cutsOf = (spans) => spans.slice(1).map((c) => c.start);
const cuts = (stretches, bs) => stretches.filter(([a, b]) => bs.some((x) => x > a && x <= b)).length;
console.log(`${lang}${VERBAL ? " (verbal witnesses only)" : ""}: ${prior.sources.length} pages, ${sentences.size} witnessed sentences, ${[...sentences.values()].reduce((n, e) => n + e.stretches.length, 0)} witnessed stretches; POS prior: ${posPrior.provenance?.giver?.split(" (")[0]}`);
if (lang !== "eng") console.log(`  derived closed classes: coordinators ${derived.coordinators.size} [${[...derived.coordinators].join(" ")}], subordinators ${derived.subordinators.size} [${[...derived.subordinators].join(" ")}]; ${derived.disclosed}`);
for (const [name, mk] of Object.entries(modes)) {
  let nb = 0, nf = 0, st = 0, cut = 0;
  const per = [];
  for (const { text, stretches } of sentences.values()) {
    const spans = clauseSpans(text, mk(text));
    const bs = cutsOf(spans);
    nb += bs.length; nf += spans.filter((c) => c.fronted).length; st += stretches.length; cut += cuts(stretches, bs);
    const starts = [...text.matchAll(/[\p{L}\p{N}']+/gu)].map((m) => m.index).slice(1);
    per.push({ stretches, k: Math.min(bs.length, starts.length), starts });
  }
  const rnd = seeded(`${SEED}:${lang}:${name}`);
  const agree = 1 - cut / st;
  let atLeast = 0, nullSum = 0;
  for (let d = 0; d < DRAWS; d++) {
    let c = 0;
    for (const p of per) {
      const pool = [...p.starts], bs = [];
      for (let i = 0; i < p.k; i++) bs.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      c += cuts(p.stretches, bs);
    }
    const a = 1 - c / st;
    nullSum += a;
    if (a >= agree) atLeast++;
  }
  console.log(`  ${name.padEnd(6)} boundaries ${String(nb).padStart(4)} (fronted ${nf})  witness agreement ${(100 * agree).toFixed(1)}%  null ${(100 * nullSum / DRAWS).toFixed(1)}%  p = ${((atLeast + 1) / (DRAWS + 1)).toFixed(4)} (${DRAWS} draws, seed "${SEED}")`);
}

#!/usr/bin/env node
// native/scripts/measure-shape-genesis.mjs — MEASURE the sentence shape (roles by kāraka, polarity, parse-consistency) on Genesis in every language the corpus holds
// (christos-c/bible-corpus, CC0; the same table measure-codec-fold.mjs reads). No gold for roles: what is measured is COVERAGE per edition (codec held, pointed at, or absent;
// tokenizer; marker table; specific-role share; flag rate) and a GOLD-FREE check of negation: Genesis is verse-aligned, so an edition's "this verse has a negated predication"
// should track the reference edition's. Statistic: Cohen's kappa against the reference, with a permuted-verse null whose 95th percentile is the bar (read from the data, not typed).
// Usage: node native/scripts/measure-shape-genesis.mjs --genesis <genesis-all.json> [--verses 200] [--ref English-WEB] [--out <dir>]
//   genesis-all.json = { "<edition>": { iso, verses: { "<id>": text } } }. The corpus text is never written out: per edition a JSON of counts and one boolean per verse id.
// The corpus' language codes are ISO 639-2/B or macrolanguage codes in places; CORPUS_ISO maps them to the priors' ISO 639-3 (a table about this corpus' metadata, not about language).
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
export const CORPUS_ISO = Object.freeze({ alb: "sqi", ara: "arb", arm: "hye", cze: "ces", gre: "ell", rum: "ron", jap: "jpn", mao: "mri", nor: "nob" });
const GEN = arg("genesis"), N = Number(arg("verses", 200)), REF = arg("ref", "English-WEB"), OUT = arg("out", null), ONE = arg("one", null);
if (!GEN) { console.error("usage: measure-shape-genesis.mjs --genesis <genesis-all.json> [--verses 200] [--ref English-WEB] [--out <dir>]"); process.exit(2); }
const all = JSON.parse(fs.readFileSync(GEN, "utf8")), ids = Object.keys(all[REF]?.verses ?? {}).slice(0, N); if (!ids.length) { console.error(`reference edition ${REF} not in the table`); process.exit(2); }

async function readEdition(name) {
  const PF = await import("../the-fold/pharos-reading.mjs"), { karakaRows, karakaCoverage, markerTableFor } = await import("../adapters/text/karaka-total.mjs"), { readPolarity, polaritySource } = await import("../adapters/text/negation-read.js"), { consistencyOf } = await import("../adapters/text/parse-consistency.mjs");
  const L = all[name], code = CORPUS_ISO[L.iso] ?? L.iso, out = { name, iso: L.iso, code }, g = await PF.grammarFor(code);
  if (g.gap) return { ...out, gap: g.gap, licence: g.licence ?? null };
  out.from = g.from; out.tokenizer = g.tokenizer ? "prior" : g.adapterTokenize ? "adapter" : "absent"; out.markers = !!markerTableFor(code); const src = polaritySource(g.parser); out.polarity = { available: src.available, carriers: src.carriers };
  let sentences = 0, flagged = 0, tokens = 0, errs = 0; const gaps = {}, labelled = [], neg = {};
  for (const id of ids) { const text = L.verses[id]; if (!text) continue; try {
    const by = new Map(); for (const r of PF.readingRows(g, text)) { if (!by.has(r.s)) by.set(r.s, []); by.get(r.s).push(r); } let n = false;
    for (const rs of by.values()) { sentences++; tokens += rs.length; const k = karakaRows(rs, { stem: code }); labelled.push(k); const c = consistencyOf(k, { lexicon: g.parser.lexicon }); if (!c.consistent) { flagged++; for (const x of c.gaps) gaps[x.gap] = (gaps[x.gap] ?? 0) + 1; }
      if (src.available && readPolarity(g.parser, rs).heads.size) n = true; }
    neg[id] = src.available ? n : null; } catch (e) { errs++; out.firstError ??= String(e.message).slice(0, 120); } }
  const cov = karakaCoverage(labelled); return { ...out, verses: Object.keys(neg).length, sentences, tokens, errs, flagged, flagRate: sentences ? +(flagged / sentences).toFixed(3) : null, gaps, labelledRate: cov.labelledRate, specificRate: +(cov.specificRate ?? 0).toFixed(3), neg };
}
if (ONE) { process.stdout.write(JSON.stringify(await readEdition(ONE))); process.exit(0); }

// one child process per edition: a parser model is large, and an edition's failure must not take the run down
const rs = [], self = fileURLToPath(import.meta.url);
for (const name of Object.keys(all)) { const r = spawnSync(process.execPath, [self, "--genesis", GEN, "--verses", String(N), "--ref", REF, "--one", name], { encoding: "utf8", maxBuffer: 1 << 26, timeout: 600000 }); let o; try { o = JSON.parse(r.stdout); } catch { o = { name, iso: all[name].iso, gap: "run_failed", why: String(r.stderr ?? "").slice(-200) }; } rs.push(o); if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(o)); } }
const kappa = (a, b) => { const n = a.length; let po = 0, a1 = 0, b1 = 0; for (let i = 0; i < n; i++) { if (a[i] === b[i]) po++; if (a[i]) a1++; if (b[i]) b1++; } po /= n; const pe = (a1 / n) * (b1 / n) + (1 - a1 / n) * (1 - b1 / n); return pe === 1 ? 0 : (po - pe) / (1 - pe); };
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296, shuffle = (x) => { const a = [...x]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ref = rs.find((r) => r.name === REF), rows = [];
for (const r of rs.filter((x) => !x.gap).sort((a, b) => a.name.localeCompare(b.name))) {
  const row = { name: r.name, code: r.code, from: r.from, tokenizer: r.tokenizer, markers: r.markers, sentences: r.sentences, flagRate: r.flagRate, specificRate: r.specificRate, carriers: r.polarity.carriers, errs: r.errs, topGaps: Object.entries(r.gaps).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k}:${v}`) };
  if (!r.polarity.available) row.negation = "abstain:no-polarity-source";
  else if (!ref || ref.gap || !ref.polarity.available) row.negation = "no-reference";
  else { const both = Object.keys(r.neg).filter((i) => ref.neg[i] != null && r.neg[i] != null), a = both.map((i) => r.neg[i]), b = both.map((i) => ref.neg[i]), k = kappa(a, b), bar = Array.from({ length: 1000 }, () => kappa(shuffle(a), b)).sort((x, y) => x - y)[949];
    Object.assign(row, { negatedVerses: a.filter(Boolean).length, kappa: +k.toFixed(2), nullBar: +bar.toFixed(2), negation: r.name === REF ? "reference" : k > bar ? "tracks" : "not-read" }); }
  rows.push(row);
}
const gapsBy = rs.filter((x) => x.gap).reduce((m, r) => ((m[r.gap] ??= []).push(r.name), m), {}), count = (v) => rows.filter((r) => r.negation === v).length;
const summary = { verses: N, reference: REF, editions: rs.length, read: rows.length, gaps: gapsBy, negation: { tracks: count("tracks"), notRead: count("not-read"), abstain: count("abstain:no-polarity-source") }, rows };
if (OUT) fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 1));
for (const r of rows) console.log([r.name.padEnd(15), r.code, String(r.from).padEnd(11), String(r.tokenizer).padEnd(7), r.markers ? "mk" : "--", "flag", String(r.flagRate).padEnd(5), "spec", String(r.specificRate).padEnd(5), "neg", String(r.negatedVerses ?? "-").padStart(3), "k", String(r.kappa ?? "-").padStart(5), "bar", String(r.nullBar ?? "-").padStart(5), r.negation].join(" "));
console.log(JSON.stringify({ editions: summary.editions, read: summary.read, negation: summary.negation, gaps: Object.fromEntries(Object.entries(gapsBy).map(([k, v]) => [k, v.length])) })); for (const [k, v] of Object.entries(gapsBy)) console.log(`${k}: ${v.join(", ")}`);

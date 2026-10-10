// collect.mjs -- ant-code: read the sampled occurrences with impact.mjs's prior-free readers. usage: node collect.mjs LANG FILEIDX VARIANT
// LANG js|py|ud; VARIANT np (primary), raw (punctuation kept in the text), shuf (within-unit shuffled NP text), la16 (FIRST rows only, F=16 lookahead, NON-CAUSAL, exploratory), sham (control).
// Output data/rec/<lang>-<variant>-<idx>.json: {recs: {"s:i": {...slim record, rivals, company, meta}}, pairs, cost}. No gold reaches any reader (gold is only recorded as row metadata).
import fs from "node:fs"; import path from "node:path";
import { impactBatch, readConlluStream, seedFor } from "../../law/impact.mjs";
import { DATA, M, npView, occurrences, indexStream, rivalsOf, companyOf, slim, shuffleTracked } from "./lib.mjs";
const [lang, idxS, variant] = process.argv.slice(2); const idx = Number(idxS);
const smp = JSON.parse(fs.readFileSync(path.join(DATA, "sample", `${lang}.json`), "utf8"));
let view;
if (lang === "ud") {
  const { sents, upos } = readConlluStream("/private/tmp/claude-501/ud-eval/eng/dev.conllu");
  view = { stream: sents, cls: upos.map((u) => u.map((t) => (t === "PROPN" ? "U" : ["NOUN", "VERB", "ADJ"].includes(t) ? "E" : "A"))), decl: sents.map((u) => u.map(() => 0)) };
} else view = npView(JSON.parse(fs.readFileSync(path.join(DATA, "lex", `${lang}-${idx}.json`), "utf8")));
const lexRaw = lang === "ud" ? null : JSON.parse(fs.readFileSync(path.join(DATA, "lex", `${lang}-${idx}.json`), "utf8")).units;
const key = (s, i) => `${s}:${i}`;
const pairs = { later: {}, first: {} }; const need = new Set();
for (const kind of ["later", "first"]) for (const [pn, list] of Object.entries(smp[kind] ?? {})) {
  if (variant === "la16" && kind === "later") continue; if (variant === "shuf" && kind === "first") continue;
  pairs[kind][pn] = list.filter((x) => x.file === idx).map((x) => ({ p: key(...x.p), n: key(...x.n), nCls: x.nCls }));
  for (const x of pairs[kind][pn]) { need.add(x.p); need.add(x.n); }
}
const occs = occurrences(view.stream, view.cls, view.decl); const byKey = new Map(occs.map((o) => [key(o.s, o.i), o]));
let stream = view.stream, map = (s, i) => [s, i];
if (variant === "raw") { stream = lexRaw; map = (s, i) => [view.unitOf[s], view.idxOf[s][i]]; }
if (variant === "shuf") { const sh = shuffleTracked(view.stream, seedFor("ant-code", "shuf", lang, idx)); stream = sh.stream; map = (s, i) => [s, sh.newIndex[s][i]]; }
const rows = [...need].map((k) => { const o = byKey.get(k); const [s2, i2] = map(o.s, o.i); return { k, o, s: s2, i: i2 }; });
const t0 = Date.now(); const F = variant === "la16" ? 16 : 0;
const modes = variant === "sham" ? ["sham"] : ["delete"];
const res = impactBatch(stream, rows.map((r) => ({ s: r.s, i: r.i, id: r.o.form })), { M, F, modes, seedTag: `ant-code:${lang}:${idx}`, withC: true });
const nsStream = variant === "shuf" ? stream : view.stream; const occN = indexStream(nsStream); const cache = new Map();
const recs = {}; let gaps = 0;
rows.forEach((r, n) => {
  const rec = res.records[modes[0]][n]; if (!rec || rec.gap) { gaps += 1; return; }
  const ns = variant === "shuf" ? [r.s, r.i] : [r.o.s, r.o.i];
  recs[r.k] = { ...slim(rec), rivals: rivalsOf(nsStream, occN, M, ns[0], ns[1]), company: companyOf(nsStream, occN, M, ns[0], ns[1], cache),
    meta: { s: r.o.s, i: r.o.i, form: r.o.form, c: r.o.c, decl: r.o.decl, k: r.o.k, pw: r.o.pw, wm: r.o.wm, freq: r.o.freq, len: r.o.len, ll: r.o.ll, init: r.o.init, gap: r.o.gap } };
});
let det = null;
if (variant === "np" && rows.length) { const sub = rows.slice(0, 20); const r2 = impactBatch(stream, sub.map((r) => ({ s: r.s, i: r.i, id: r.o.form })), { M, F, modes: ["delete"], seedTag: `ant-code:${lang}:${idx}`, withC: true }); det = { n: sub.length, same: r2.records.delete.filter((x, n) => x && res.records.delete[n] && x.hash === res.records.delete[n].hash).length }; }
fs.mkdirSync(path.join(DATA, "rec"), { recursive: true });
fs.writeFileSync(path.join(DATA, "rec", `${lang}-${variant}-${idx}.json`), JSON.stringify({ lang, idx, variant, M, F, pairs, recs, gaps, det, cost: res.cost, seconds: (Date.now() - t0) / 1000 }));
console.error(`${lang} ${idx} ${variant}: ${Object.keys(recs).length} recs, gaps ${gaps}, ${((Date.now() - t0) / 1000).toFixed(1)}s`);

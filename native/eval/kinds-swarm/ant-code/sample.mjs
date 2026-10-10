// sample.mjs -- ant-code: OFFLINE sampling + matching + balance gate (no reader is run here). usage: node sample.mjs js|py|ud
// Writes data/sample/<lang>.json: per file the sampled rows (positives U, matched negatives E/O) for datasets LATER (PE, PO) and FIRST, plus the balance tables and the chosen calipers.
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { readConlluStream, seedFor } from "../../law/impact.mjs";
import { lexJs } from "./lex_js.mjs";
import { DATA, M, npView, occurrences, candidates, covOf, selectPositives, matchInto, balanceOf, CALIPERS, sd, PMAX, r5 } from "./lib.mjs";
const lang = process.argv[2];
fs.mkdirSync(path.join(DATA, "lex"), { recursive: true }); fs.mkdirSync(path.join(DATA, "sample"), { recursive: true });
function lexFile(lg, idx, file) {
  const cache = path.join(DATA, "lex", `${lg}-${idx}.json`);
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, "utf8"));
  const lex = lg === "js" ? lexJs(file) : JSON.parse(execFileSync(lg === "rb" ? "ruby" : "python3", [path.join(path.dirname(new URL(import.meta.url).pathname), lg === "rb" ? "lex_rb.rb" : "lex_py.py"), file], { maxBuffer: 1 << 28 }));
  fs.writeFileSync(cache, JSON.stringify(lex)); return lex;
}
const UD = "/private/tmp/claude-501/ud-eval/eng/dev.conllu";
const files = [];
if (lang === "ud") {
  const { sents, upos } = readConlluStream(UD);
  const cls = upos.map((u) => u.map((t) => (t === "PROPN" ? "U" : ["NOUN", "VERB", "ADJ"].includes(t) ? "E" : "A")));
  files.push({ idx: 0, file: UD, view: { stream: sents, cls, decl: sents.map((u) => u.map(() => 0)) } });
  PMAX.later = 300; PMAX.first = 0;
} else {
  const list = JSON.parse(fs.readFileSync(path.join(DATA, "files.json"), "utf8"))[lang];
  list.forEach((x, idx) => files.push({ idx, file: x.file, view: npView(lexFile(lang, idx, x.file)) }));
}
const out = { lang, M, files: [], balance: {}, caliper: {} };
for (const f of files) {
  const occs = occurrences(f.view.stream, f.view.cls, f.view.decl);
  f.later = candidates(occs, "later"); f.first = lang === "ud" ? [] : candidates(occs, "first");
  f.posL = selectPositives(f.later, "later", seedFor("ant-code", "pos", lang, f.idx, "later")); f.posF = selectPositives(f.first, "first", seedFor("ant-code", "pos", lang, f.idx, "first"));
  console.error(`${lang} ${f.idx} units ${f.view.stream.length} cand later ${f.later.length} (U ${f.later.filter((c) => c.f === "U").length} E ${f.later.filter((c) => c.f === "E").length} O ${f.later.filter((c) => c.f === "O").length}) first ${f.first.length} (U ${f.first.filter((c) => c.f === "U").length}) pos ${f.posL.length}/${f.posF.length}`);
}
const sdOf = (kind) => { const fi = kind === "first"; const all = files.flatMap((f) => (fi ? f.first : f.later)); const V = all.map((c) => covOf(c, fi)); return V[0] ? V[0].map((_, d) => sd(V.map((v) => v[d]))) : []; };
const SD = { later: sdOf("later"), first: sdOf("first") };
function runMatching(kind, pools, caliper) {
  const res = {};
  for (const pn of pools) res[pn] = [];
  files.forEach((f) => { const pos = kind === "later" ? f.posL : f.posF, cand = kind === "later" ? f.later : f.first;
    for (const pn of pools) { const pool = cand.filter((c) => (pn === "N" ? c.f === "E" || c.f === "O" : c.f === pn)); const prs = matchInto(pos, pool, { kind, caliper, sdv: SD[kind], seed: seedFor("ant-code", "match", lang, f.idx, kind, pn) }); prs.forEach((x) => { x.file = f.idx; }); res[pn].push(...prs); } });
  return res;
}
for (const [kind, pools] of [["later", lang === "ud" ? ["E"] : ["E", "O"]], ["first", lang === "ud" ? [] : ["N"]]]) {
  if (!pools.length) continue;
  let chosen = null;
  for (const cal of (process.env.CAL ? process.env.CAL.split(",").map(Number) : CALIPERS)) {
    const m = runMatching(kind, pools, cal); const bal = Object.fromEntries(pools.map((pn) => [pn, balanceOf(m[pn], kind === "first")]));
    out.balance[`${kind}@${cal}`] = bal; console.error(kind, cal, pools.map((pn) => `${pn}: n=${bal[pn].n} pass=${bal[pn].pass} maxSMD=${Math.max(...bal[pn].rows.map((r) => Math.abs(r.smd)))} aucRange=[${Math.min(...bal[pn].rows.map((r) => r.auc))},${Math.max(...bal[pn].rows.map((r) => r.auc))}]`).join(" | "));
    if (!chosen && pools.every((pn) => bal[pn].pass)) chosen = { cal, m };
  }
  const cal = chosen ? chosen.cal : 0.3; const m = chosen ? chosen.m : runMatching(kind, pools, 0.3);
  out.caliper[kind] = { caliper: cal, undermatched: !chosen };
  out[kind] = Object.fromEntries(pools.map((pn) => [pn, m[pn].map((x) => ({ file: x.file, p: [x.p.s, x.p.i], n: [x.n.s, x.n.i], d: r5(x.d), nCls: x.n.c }))]));
}
out.files = files.map((f) => ({ idx: f.idx, file: f.file, units: f.view.stream.length, posL: f.posL.length, posF: f.posF.length }));
fs.writeFileSync(path.join(DATA, "sample", `${lang}.json`), JSON.stringify(out));
console.error("caliper", JSON.stringify(out.caliper));

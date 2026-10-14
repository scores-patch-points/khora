#!/usr/bin/env node
// eval-attested-tags.mjs — is "closed classes held to what EWT attests" (english-parser.js tagSentenceAttested) better than the plain
// tagger, on sentences the tagger never trained on? Admission test for the constraint: it is used only if it wins here.
//
//   node native/scripts/eval-attested-tags.mjs --gold FILE.conllu [--gold FILE2.conllu] [--draws N --seed S]
//
// Gold tokenization is fed to both arms (the tokenizer is the same in both, so it is not what is measured). Reported per arm: UPOS
// accuracy, UAS, LAS. The null is a paired sign-flip permutation over sentences: each sentence's (constrained − plain) LAS difference
// keeps or flips its sign at random; the p-value is the share of draws whose mean difference reaches the observed one. Only the draw
// count and the seed are declared.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseConllu } from "../kernel/eot-rich.js";
import { loadModel, analyse, analyseAttested, seeded } from "../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const all = (k) => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DRAWS = Number(opt("--draws", 999)), SEED = opt("--seed", "attested-tags");
const model = loadModel(JSON.parse(readFileSync(join(here, "../priors/parser-eng-ewt.json"), "utf8")));
const sents = all("--gold").flatMap((f) => parseConllu(readFileSync(f, "utf8")));
const arm = () => ({ n: 0, upos: 0, uas: 0, las: 0, per: [] });
const A = { plain: arm(), closed: arm(), all: arm() };
const changed = new Map();
for (const s of sents) {
  const forms = s.tokens.map((t) => t.form);
  const out = { plain: analyse(model, forms), closed: analyseAttested(model, forms, { scope: "closed" }), all: analyseAttested(model, forms, { scope: "all" }) };
  for (const [k, rows] of Object.entries(out)) {
    let las = 0;
    s.tokens.forEach((g, i) => { const r = rows[i]; A[k].n++; if (r.upos === g.upos) A[k].upos++; if (r.head === g.head) { A[k].uas++; if (r.deprel === g.deprel) { A[k].las++; las++; } } });
    A[k].per.push(las);
  }
  s.tokens.forEach((g, i) => { const p = out.plain[i].upos, a = out.all[i].upos; if (p !== a) { const key = `${g.form.toLowerCase()}: ${p}→${a} (gold ${g.upos})`; changed.set(key, (changed.get(key) ?? 0) + 1); } });
}
const pct = (a, b) => (100 * a / b).toFixed(2);
for (const [k, x] of Object.entries(A)) console.log(`${k.padEnd(9)} sentences ${sents.length}  words ${x.n}  UPOS ${pct(x.upos, x.n)}  UAS ${pct(x.uas, x.n)}  LAS ${pct(x.las, x.n)}`);
const rnd = seeded(SEED);
for (const k of ["closed", "all"]) {
  const diff = A[k].per.map((v, i) => v - A.plain.per[i]);
  const obs = diff.reduce((a, b) => a + b, 0);
  let atLeast = 0;
  for (let d = 0; d < DRAWS; d++) { let s = 0; for (const x of diff) s += rnd() < 0.5 ? x : -x; if (s >= obs) atLeast++; }
  console.log(`${k} vs plain: LAS words gained ${obs} over ${diff.filter((x) => x).length} changed sentences; sign-flip null p = ${((atLeast + 1) / (DRAWS + 1)).toFixed(4)} (${DRAWS} draws, seed "${SEED}")`);
}
{
  const diff = A.all.per.map((v, i) => v - A.closed.per[i]);
  const obs = diff.reduce((a, b) => a + b, 0);
  let atLeast = 0;
  for (let d = 0; d < DRAWS; d++) { let s = 0; for (const x of diff) s += rnd() < 0.5 ? x : -x; if (s >= obs) atLeast++; }
  console.log(`all vs closed: LAS words gained ${obs}; sign-flip null p = ${((atLeast + 1) / (DRAWS + 1)).toFixed(4)}`);
}
console.log("tag changes, all vs plain:");
const flips = [...changed].sort((a, b) => b[1] - a[1]);
const right = flips.filter(([k]) => { const m = k.match(/→(\S+) \(gold (\S+)\)/); return m[1] === m[2]; }).reduce((a, [, n]) => a + n, 0);
const wrong = flips.filter(([k]) => { const m = k.match(/: (\S+)→\S+ \(gold (\S+)\)/); return m[1] === m[2]; }).reduce((a, [, n]) => a + n, 0);
console.log(`tag changes: ${flips.reduce((a, [, n]) => a + n, 0)}; now right ${right}, was right and now wrong ${wrong}`);
for (const [k, n] of flips.slice(0, 15)) console.log(`  ${n}  ${k}`);

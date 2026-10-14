#!/usr/bin/env node
// polarity-ablation.mjs — where can the SEED of predicate polarity come from, with no declared word list?
//
//   node native/eval/callimachus/polarity-ablation.mjs --out DIR [--topic "sunshine protection act"]
//
// TASK: held-out parity. The corpus states contrast edges ("A, but B": opposite poles, parity 1, flipped by negation) between predicate
// lemmas. Each predictor guesses a pair's parity from something that is NOT that edge; it may abstain. Reported per predictor:
// coverage (pairs it speaks to), accuracy on those, and a born null (the same coverage, parity drawn at the base rate of the edges,
// 1999 seeded draws): the predictor is "better than chance" only if its accuracy is in the top 5% of its null.
//
// PREDICTORS (arms)
//   frames   the declared STANCE_FRAMES (perspectives.js): pro~pro / con~con 0, pro~con 1
//   affix    derivational antonymy found IN THE CORPUS'S OWN vocabulary: lemma L and un|dis|non|anti|de + L both attested → parity 1
//   cube     the act prior's operator for each verb (VerbNet class → the nine acts, act-prior-en.json): MAKE group {INS, SYN, CON} vs
//            UNMAKE group {NUL, SEG}; the same group 0, different groups 1; EVA/DEF/SIG/REC and contested entries abstain
//   corpus   leave-one-out: the signed graph of every OTHER corpus edge (the coverage ceiling for the corpus's own constructions)
//   union    affix + cube + corpus (the arms that need no declared list)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax } from "../../organs/pinax.js";
import { readCorpus } from "../../organs/callimachus.js";
import { readPerspectives, STANCE_FRAMES } from "../../organs/perspectives.js";
import { loadModel, seeded } from "../../adapters/text/english-parser.js";
import { readRows } from "../../organs/claim-realize.js";
import { splitSentences } from "../../adapters/text/spans.js";

const here = dirname(fileURLToPath(import.meta.url)), R = join(here, "../../");
const args = process.argv.slice(2), opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = opt("--out"); if (!out) { console.error("--out DIR required"); process.exit(2); }
const topic = (opt("--topic", "sunshine protection act")).toLowerCase();
const model = loadModel(JSON.parse(readFileSync(join(R, "priors/parser-eng-ewt.json"), "utf8")), { morphology: JSON.parse(readFileSync(join(R, "priors/morphology-eng.json"), "utf8")) });
const act = JSON.parse(readFileSync(join(R, "priors/act-prior-en.json"), "utf8")).forms;
const rec = JSON.parse(readFileSync(join(out, "record.json"), "utf8"));
const recs = [], texts = new Map();
for (const s of rec.sources) {
  const raw = readFileSync(join(out, "layers", `${s.id}.raw`)), text = readFileSync(join(out, "layers", `${s.id}.txt`), "utf8");
  const p = await makePinax({ url: s.url, finalUrl: s.final_url, retrievedAt: s.retrieved_at, raw: new Uint8Array(raw), text, extractor: s.extractor });
  p.declared = s.declared; recs.push(p); texts.set(p.entry.id, text);
}
const record = readCorpus(recs, { question: rec.question });
const spec = readPerspectives(record, { model, question: { focus: [], reading: { relation: { lemma: "oppose" } } }, texts, topicSurfaces: [topic], frames: null });
const E = spec.edgeList.filter((e) => e.kind === "contrast");
console.log(`contrast edges ${E.length} (of ${spec.edgeList.length}); parity-1 share ${(E.filter((e) => e.parity === 1).length / E.length).toFixed(2)}`);

// the corpus's own predicate vocabulary (verbs and adjectives, lemmatised), for the affix arm
const vocab = new Set();
for (const [, t] of texts) for (const sn of splitSentences(t).slice(0, 400)) {
  const x = sn.text.trim(); if (x.length < 20 || x.length > 400) continue;
  try { for (const r of readRows(model, x)) if (r.upos === "VERB" || r.upos === "ADJ") vocab.add(String(r.lemma).toLowerCase()); } catch { /* skip */ }
}
const PREFIX = ["un", "dis", "non", "anti", "de"];
const affixPartner = (l) => PREFIX.some((p) => l.startsWith(p) && vocab.has(l.slice(p.length)) && l.length - p.length >= 3) ? true : PREFIX.some((p) => vocab.has(p + l));
const affixParity = (a, b) => {
  // opposite iff one is the other with a negating prefix (the corpus attests both)
  const rel = (x, y) => PREFIX.some((p) => x === p + y && y.length >= 3);
  return rel(a, b) || rel(b, a) ? 1 : null;
};
const MAKE = new Set(["INS", "SYN", "CON"]), UNMAKE = new Set(["NUL", "SEG"]);
const groupOf = (l) => {
  const f = act[l]; if (!f) return null;
  const cands = f.candidates ?? [f];
  const ops = new Set(cands.map((c) => c.op));
  const g = new Set([...ops].map((o) => (MAKE.has(o) ? "make" : UNMAKE.has(o) ? "unmake" : "other")));
  return g.size === 1 && !g.has("other") ? [...g][0] : null; // a contested or non-building verb abstains
};
const cubeParity = (a, b) => { const x = groupOf(a), y = groupOf(b); return x && y ? (x === y ? 0 : 1) : null; };
const grp = (l) => (STANCE_FRAMES.pro.includes(l) ? "pro" : STANCE_FRAMES.con.includes(l) ? "con" : null);
const frameParity = (a, b) => { const x = grp(a), y = grp(b); return x && y ? (x === y ? 0 : 1) : null; };
// leave-one-out corpus graph by BFS over the other edges
const corpusParity = (a, b, skip) => {
  const adj = new Map();
  for (const e of spec.edgeList) { if (e === skip) continue; for (const [u, v] of [[e.a, e.b], [e.b, e.a]]) { if (!adj.has(u)) adj.set(u, []); adj.get(u).push([v, e.parity]); } }
  const seen = new Map([[a, 0]]), q = [a];
  while (q.length) { const u = q.shift(); if (u === b) return seen.get(u); for (const [v, p] of adj.get(u) ?? []) if (!seen.has(v)) { seen.set(v, seen.get(u) ^ p); q.push(v); } }
  return null;
};
const arms = {
  frames: (e) => frameParity(e.a, e.b),
  affix: (e) => affixParity(e.a, e.b),
  cube: (e) => cubeParity(e.a, e.b),
  corpus: (e) => corpusParity(e.a, e.b, e),
};
arms.union = (e) => arms.affix(e) ?? arms.cube(e) ?? arms.corpus(e);
// negation flips what the sentence MEANS but not the lemma-pair parity the predictor speaks to: the truth for a pair is the parity of
// its LEMMAS, so a contrast edge's lemma parity = edge.parity ^ negA ^ negB is already what the edge stores.
const rnd = seeded("polarity-ablation"), base = E.filter((e) => e.parity === 1).length / E.length;
for (const [name, f] of Object.entries(arms)) {
  const rows = E.map((e) => [f(e), e.parity]).filter(([g]) => g !== null);
  const acc = rows.length ? rows.filter(([g, t]) => g === t).length / rows.length : null;
  let ge = 0; const N = 1999;
  for (let d = 0; d < N; d++) { let k = 0; for (let i = 0; i < rows.length; i++) if ((rnd() < base ? 1 : 0) === rows[i][1]) k++; if (rows.length && k / rows.length >= acc) ge++; }
  console.log(`${name.padEnd(7)} coverage ${String(rows.length).padStart(2)}/${E.length}  accuracy ${acc === null ? "—" : acc.toFixed(2)}  null p=${rows.length ? ((ge + 1) / (N + 1)).toFixed(3) : "—"}`);
}
console.log("\nwhat each arm says on the corpus's contrast pairs (lemma pair, truth, frames/affix/cube/corpus):");
for (const e of E.slice(0, 24)) console.log(`  ${e.a}~${e.b} truth ${e.parity}  | ${[arms.frames(e), arms.affix(e), arms.cube(e), arms.corpus(e)].map((x) => x ?? "·").join(" ")}`);

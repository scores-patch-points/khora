// scene/earn-joins.mjs — RUN THE FOR-WHOM MEET OVER THE CROSS-SOURCE
// CANDIDATES, and report the first EARNED joins.  (2026-10-11)
//
//   node eval/the-fold/scene/earn-joins.mjs [--max N]
//
// What identity the corpus can EARN today, modelessly. The operator FIXES the
// frame (S113: identity exists only for-whom): the UDHR corpus is ONE document
// in many translations, so — in THIS frame — identical surfaces across sources
// name the same being unless some admitted frame splits them. The supports are
// NOT invented: each same-form candidate carries the two Recorded addresses
// where its form appears. The gate (coherence/relevance) and the meet decide;
// a candidate that no admitted frame holds is REFUSED, and a held pair with no
// split SURVIVES. Swatch: 0 model tokens.
//
// Limit disclosed: we bring one frame and no homonym-split frame — so the
// falsifier (a pair one frame joins and another splits) cannot fire here; it
// stays the named next adjudication.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createForWhom } from "../../../kernel/for-whom.js";
import {
  parseWeftJsonl, candidateJoins, resolveCrossSource, applyJoins, holographAll, foldOf,
} from "../../../the-fold/eot-weft.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const max = Number(args[args.indexOf("--max") + 1] ?? 400);

const weft = parseWeftJsonl(fs.readFileSync(path.join(HERE, "corpus.eot.jsonl"), "utf8"));

// Teach the record every POINT (the cast), not only the bound relations, so
// the meet can translate a candidate's form onto its points.
const extraEntries = [];
for (const pass of weft) {
  for (const c of pass.cast ?? []) {
    extraEntries.push({
      schema: "EOHyperedge@1", id: `cast:${pass.seq}:${c.ref}`, witness: `${pass.address}#0`,
      participants: [{ surface: c.surface, ref: c.ref }],
    });
  }
}

// The candidates worth meeting: content forms carried on points in >=2 sources.
const STOP = new Set("a an and are as at be been being by del de der des die that the en e is it its la las le los lo of or in on un une was were will with for from to not no has have had this these those which who whom whose y o el i".split(" "));
const cands = candidateJoins(weft).filter((c) => {
  if (c.form.length < 4 || STOP.has(c.form)) return false;
  const srcs = new Set(c.points.map((p) => p.split("::")[0]));
  return srcs.size >= 2;
}).slice(0, max);

console.log(`candidates to meet: ${cands.length} (content forms, >=2 sources, bounded at ${max})`);

// THE FRAME: the UDHR is one instrument. Supports = the recorded addresses of
// each form's appearances (evidence, never an invented fact).
const frame = {
  // The frame voices the record's own content (UDHR Art. 1 + the fold's bound
  // relations) — the operator asks what the corpus itself answers; the gate
  // admits it (measured relevance 1.000) and REFUSES empty framing (0.012).
  forWhom: createForWhom({ id: "udhr-same-document", question: "all human beings have rights and freedoms and the conscience should act", giver: "operator" }),
  ctx: {
    extraEntries,
    supports: cands.flatMap((c) => c.witnesses.map((w) => ({ left: c.form, right: c.form, witness: w }))),
    gateOpts: { minRelevance: 0.5 },
  },
};

const r = resolveCrossSource(weft, { reads: [frame] });

// A candidate (form -> points) is EARNED iff the meet joined its own points.
const earned = [], apart = [];
for (const c of cands) {
  if (c.points.length < 2) continue;
  const joined = r.survivors.some((pair) => c.points.includes(pair[0]) && c.points.includes(pair[1]));
  (joined ? earned : apart).push(c);
}

console.log(`meet: admitted-less refused ${r.refused.length} · splits ${r.splits.length} · survivors ${r.survivors.length}`);
console.log(`earned joins: ${earned.length} · stayed apart: ${apart.length}`);

const sz = (c) => new Set(c.points.map((p) => p.split("::")[0] + ":" + p.split("::")[1])).size;
console.log("");
console.log("── FIRST EARNED JOINS (0 model tokens) ──");
for (const c of earned.slice(0, 12)) {
  const pair = r.survivors.find((p) => c.points.includes(p[0]) && c.points.includes(p[1]));
  console.log(`  ${c.form}  →  ${pair ? pair[0].split("::")[0].split("/").pop() + " ⇄ " + pair[1].split("::")[0].split("/").pop() : "?"}`);
  if (c.witnesses[0]) console.log(`      at ${c.witnesses[0].slice(0, 72).split("/").slice(-1)[0]} …`);
}

// The falsifier we CANNOT fire today (disclosed): no homonym-split frame.
const joined = holographAll(weft, { joins: r.survivors.slice(0, 2000) });
console.log("");
console.log(`after join: cloth ${joined.referents.length} referents (pre-join ${holographAll(weft).referents.length})`);
console.log(`swatch:     0 model tokens — every term above is a fold over the record`);
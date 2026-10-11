// eval/identity/cross-source-judge.mjs — THE PRIOR INSTRUMENT ON CROSS-SOURCE
// REFERENTS: identity-induction's four null tests, driven on the UDHR corpus
// (2026-10-11). Grounded in identity-at-a-point.md: identity is the fold at a
// point via induced kinds, for-whom, DMD-bounded. Here we ask the measured
// machine itself whether a being in English is the SAME being in Spanish —
// not by spelling (refused by the prior work), but by universes-folded,
// with the four null tests (exchangeability → weight → consequence → settled).
//
//   node eval/identity/cross-source-judge.mjs
//
// PRE-REGISTERED CLAIM. The pair {law(eng), ley(spa)} — the same concept in two
// translations of the same instrument — reads the same being WHERE THE READ IS
// RICH ENOUGH; a negative pair (two genuinely different beings, within or
// across a language) must NOT read bound. The honest outcome on a sparse read
// is UNBOUND (starved: not_enough_reading / idle) — reported, never forced.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeIdentityInduction } from "../../kernel/identity-induction.js";
import { parseWeftJsonl } from "../../the-fold/eot-weft.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEFT = path.join(HERE, "..", "the-fold", "scene", "corpus.eot.jsonl");
const weft = parseWeftJsonl(fs.readFileSync(WEFT, "utf8"));

// The record the identity machine reads: node = a referent POINT (source::birth);
// occurrence = one relation it participates in, features tagged by hop:
//   hop 1: the relation label and its partner's surface
//   hop 2: the partner's own relation labels (the shared neighbourhood)
const relsFor = new Map();   // point -> relations it is in (its {f,hop} occurrence list)
const relPartners = new Map(); // point -> [{ relation, other }]
for (const pass of weft) {
  for (const rel of pass.relations ?? []) {
    for (const p of rel.participants ?? []) {
      if (!p?.ref || !p.surface) continue;
      const other = rel.participants.find((q) => q !== p);
      if (!relsFor.has(p.ref)) { relsFor.set(p.ref, []); relPartners.set(p.ref, []); }
      relPartners.get(p.ref).push({ relation: rel.relation, other: other?.surface ?? null, otherRef: other?.ref ?? null, at: rel.at ?? null });
    }
  }
}
// hop-2: each occurrence carries its partner's own relations (the shared world).
const record = new Map();
for (const [point, partners] of relPartners) {
  const occ = partners.map((pr) => {
    const fs = [{ f: `rel:${pr.relation}`, hop: 1 }];
    if (pr.other) fs.push({ f: `x:${String(pr.other).toLowerCase()}`, hop: 1 });
    const hop2 = new Set();
    for (const q of relPartners.get(pr.otherRef) ?? []) hop2.add(`p2:${q.relation}`);
    for (const f of hop2) fs.push({ f, hop: 2 });
    return { at: pr.at, features: fs };
  });
  record.set(point, occ);
}

// The for-whom the machine judges for (the UDHR as one instrument).
const BY = Object.freeze({ id: "udhr-as-one-instrument", giver: "operator", question: "is the same right/being across languages one being" });

// The operational pairs: positives (should be SAME) and negatives (must NOT be).
const surfacePoint = (src, surface) => {
  const pass = weft.find((p) => String(p.address).includes(src) && (p.cast ?? []).some((c) => c.surface === surface));
  return pass?.cast?.find((c) => c.surface === surface)?.ref ?? null;
};
const pairs = [
  { label: "law(eng) ↔ ius(lat)  — SAME being (law/right), rich on both sides",
    a: surfacePoint("udhr-eng", "law"), b: surfacePoint("udhr-lat", "ius") },
  { label: "law(eng) ↔ ley(spa)  — SAME being, diff language",
    a: surfacePoint("udhr-eng", "law"), b: surfacePoint("udhr-spa", "ley") },
  { label: "law(eng) ↔ law(eng)  — identical (control: trivial bound)",
    a: surfacePoint("udhr-eng", "law"), b: surfacePoint("udhr-eng", "law") },
  { label: "law(eng) ↔ religion(eng) — DIFFERENT beings, same language",
    a: surfacePoint("udhr-eng", "law"), b: surfacePoint("udhr-eng", "religion") },
  { label: "ley(spa) ↔ desarrollo(spa) — DIFFERENT beings, same language",
    a: surfacePoint("udhr-spa", "ley"), b: surfacePoint("udhr-spa", "desarrollo") },
  { label: "law(eng) ↔ justícia(spa) — DIFFERENT beings, cross language",
    a: surfacePoint("udhr-eng", "law"), b: surfacePoint("udhr-spa", "justícia") },
];

const ind = makeIdentityInduction(record, {
  draws: 200, alpha: 0.05, seed: 7, minOccurrences: 2, maxHop: 2,
  smooth: 1, resolution: 1, minFeatureCount: 1, relevant: null, namesNode: null,
});

console.log(`record: ${record.size} nodes · minOccurrences 2 · judges for ${BY.giver}:${BY.id}`);
console.log("");
for (const { label, a, b } of pairs) {
  const read = { a: record.get(a)?.length ?? 0, b: record.get(b)?.length ?? 0 };
  const v = ind.judge(a, b);
  console.log(`── ${label}`);
  console.log(`   read ${String(read.a).padStart(2)} / ${String(read.b).padStart(2)} occ`);
  console.log(`   → ${v.verdict}${v.reason ? ` · ${v.reason}` : ""}${v.hop ? ` · hop ${v.hop}` : ""}`);
  if (v.tests?.worlds) console.log(`      worlds     match=${v.tests.worlds.match} (obs ${v.tests.worlds.observed.toFixed(3)} ≥ floor ${v.tests.worlds.floor.toFixed(3)})`);
  if (v.tests?.weight) console.log(`      weight     a.carries=${v.tests.weight.a.carries} b.carries=${v.tests.weight.b.carries}`);
  if (v.tests?.consequence) console.log(`      consequence aligned=${v.tests.consequence.aligned} (obs ${v.tests.consequence.observed.toFixed(3)} > ceil ${v.tests.consequence.ceiling.toFixed(3)})`);
  if (v.tests?.bound) console.log(`      bound      settled=${v.tests.bound.settled} hop ${v.tests.bound.hop}`);
}
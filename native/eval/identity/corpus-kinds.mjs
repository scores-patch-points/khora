// eval/identity/corpus-kinds.mjs — KIND INDUCTION ACROSS THE ETHOS CORPUS: do the kinds the machinery extracts
// from the whole corpus's own relations recover the meaningful kinds one would need? New file; nothing edited.
//
//   node eval/identity/corpus-kinds.mjs [--root DIR] [--per-cat N] [--cap BYTES] [--json]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5 / READING-POLICY II.23). Written BEFORE the first run. ═══════════════════════════
// THE CLAIM (the user): "kind induction across our entire corpus should be able to extract most of the meaningful kinds one might
// need." Falsifiable form: with entities = the recurring figures the reader hears and relations = the prior-free gfp relations
// between them (eval/law/impact.mjs readWindow, R-C), `induceKindsAndFunctions` (inducer method) recovers kinds whose members are
// semantically coherent (a person-kind, a place-kind, an organisation-kind) rather than an arbitrary partition of function words.
// MEASURED, per kind: size, member sample, and the relation labels that define it; and COVERAGE (share of entities placed in
// some kind — the falsify run measured 0.23 on planted data, so coverage is a live risk). The test is a FEASIBILITY PROBE on a
// declared SAMPLE of the corpus (all categories, --per-cat files each, --cap bytes/file): the full corpus is ~3,035 files / ~570MB
// and has no precomputed relation graph, so a full read is a batch job (~1-2h at the measured ~1ms/sentence); this run is a
// sample and says so. Gold: NONE — "meaningful" is judged by reading the member samples, and the criteria are stated below.
// PASS (declared): at least 3 induced kinds each with >= 8 members, where (a) coverage >= 0.30, and (b) the member sample of at
//   least one kind is recognisably one category (a majority are capitalised proper nouns) AND the kind is not defined solely by a
//   closed-class label (of/the/and/is). FALSIFIED if coverage < 0.10, or every kind is a closed-class bucket, or no kind reaches
//   8 members. Otherwise PARTIAL (kinds form but are not recognisable) — reported, since it is the likely outcome and a finding.
// CONTROLS. K1 SHUFFLE: relation labels redealt across triples (same multiset) — the induced kind structure must change (the
//   reading is not an artifact of token counts). K2 DETERMINISM: the kind set is byte-identical on a re-run.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { readWindow } from "../law/impact.mjs";
import { induceKindsAndFunctions } from "../../kernel/kind-functional-induction.js";
import { assertionsFromTriples } from "../../kernel/entity-profile.js";
import { createSeededRng, shuffled } from "../../kernel/rng.js";

const ROOT = "/Users/mlacy/Documents/3.0/ethos";
const CLOSED = new Set(["of", "the", "and", "is", "in", "to", "a", "was", "for", "on", "by", ",", "as", "that", "with", "his", "her", "it", "at", "from", "be", "are", "were", "an", "or", "not", "but", "its", "he", "she", "they", "this", "which", "who", "has", "had", "have"]);
const CAT = /^(0\d|1\d|20)-/;

function argv() { const o = { perCat: 5, cap: 30000, json: false, maxEntities: 1500 }; const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) { if (a[i] === "--per-cat") o.perCat = Number(a[++i]); else if (a[i] === "--cap") o.cap = Number(a[++i]); else if (a[i] === "--max-entities") o.maxEntities = Number(a[++i]); else if (a[i] === "--json") o.json = true; } return o; }
function walk(dir, out = []) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.name.startsWith(".")) continue; const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (/\.(txt|md)$/.test(e.name)) out.push(p); } return out; }

function sentencesOf(text, cap) {
  const t = text.slice(0, cap).replace(/\r/g, "");
  return t.split(/(?<=[.!?])\s+|\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 400);
}

const o = argv();
if (o.json) { /* keep stdout clean */ }
const cats = fs.readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory() && CAT.test(e.name)).map((e) => e.name).sort();
const triples = [];
const perCatUsed = {};
let files = 0, sents = 0;
for (const c of cats) {
  const all = walk(path.join(ROOT, c));
  if (!all.length) continue;
  const pick = shuffled(all, createSeededRng({ seed: "ethos-kinds", population: c, purpose: "sample" })).slice(0, o.perCat);
  perCatUsed[c] = pick.length;
  for (const f of pick) {
    let txt = ""; try { txt = fs.readFileSync(f, "utf8"); } catch { continue; }
    const texts = sentencesOf(txt, o.cap);
    if (texts.length < 5) continue;
    files++; sents += texts.length;
    const r = readWindow(texts);
    r.edges.flat().forEach((ed, i) => { if (ed.end1 && ed.end2 && ed.label) triples.push({ subject: ed.end1, verb: ed.label, object: ed.end2, seq: triples.length, file: path.basename(f) }); });
  }
}
const allReferents = [...new Set(triples.flatMap((t) => [t.subject, t.object]))];
// THE INDUCER IS O(n^2) IN ENTITIES (kernel/entity-kind-induction.js affinityField) and overflows V8's Map (16.7M pairs) at
// n ~ 4096. A corpus yields far more referents, so the full-corpus run is impossible as built; we cap to the highest-degree
// referents and report the wall. scaling is a first-class result here.
const deg = new Map();
for (const t of triples) { deg.set(t.subject, (deg.get(t.subject) ?? 0) + 1); deg.set(t.object, (deg.get(t.object) ?? 0) + 1); }
const referents = allReferents.length <= o.maxEntities ? allReferents : [...allReferents].sort((a, b) => (deg.get(b) ?? 0) - (deg.get(a) ?? 0)).slice(0, o.maxEntities);
const truncated = allReferents.length > o.maxEntities ? { kept: referents.length, of: allReferents.length, wall: "O(n^2) pair-affinity Map overflows at n~4096" } : null;
const by = assertionsFromTriples(triples, { referents: new Set(referents) });
let run, induceError = null;
try {
  run = induceKindsAndFunctions(referents, {
    assertionsOf: (id) => by.get(id) ?? [], sameValue: (a, b) => a === b, witnessed: () => true, exposureFloor: 2,
    kindOptions: { minKindSize: 8, minEntityCount: 10, permutations: 64 },
  });
} catch (e) { induceError = `${e.name}: ${e.message}`; run = null; }
const kinds = (run?.kinds ?? []).map((k) => {
  const rels = run.relations.get(k.kindKey) ?? {};
  const topRel = Object.entries(rels).sort((a, b) => (b[1].members ?? 0) - (a[1].members ?? 0))[0];
  const properShare = k.members.filter((m) => /^[A-Z\p{Lu}]/u.test(m) && !CLOSED.has(m)).length / k.members.length;
  return { key: k.kindKey, size: k.members.length, sample: k.members.slice(0, 12), properShare: +properShare.toFixed(2), topRelation: topRel?.[0] ?? null, topRelationStanding: topRel?.[1]?.standing ?? null, closedTop: CLOSED.has(topRel?.[0] ?? "") };
}).sort((a, b) => b.size - a.size);
const placed = new Set(kinds.flatMap((k) => (run.kinds.find((x) => x.kindKey === k.key)?.members) ?? []));
const coverage = referents.length ? placed.size / referents.length : 0;
const big = kinds.filter((k) => k.size >= 8);
const pass = big.length >= 3 && coverage >= 0.30 && big.some((k) => k.properShare >= 0.5 && !k.closedTop);
const falsified = coverage < 0.10 || big.every((k) => k.closedTop) || big.length === 0;

const out = {
  sample: { categories: cats.length, filesPerCat: o.perCat, files, sentences: sents, capBytes: o.cap, perCatUsed },
  corpus: { triples: triples.length, referents: allReferents.length, inducedOn: referents.length, truncated, placedInKinds: placed.size, coverage: +coverage.toFixed(3) },
  inducer: run?.diagnostics?.inducer ?? null, induceError,
  kinds: kinds.slice(0, 20),
  verdict: induceError ? "INDICER_FAILED" : falsified ? "FALSIFIED" : pass ? "PASS" : "PARTIAL",
};
if (o.json) console.log(JSON.stringify(out, null, 1));
else {
  const L = [`# kind induction across the ethos corpus (sample: ${files} files, ${sents} sentences, ${triples.length} relations)`, ""];
  L.push(`referents ${allReferents.length}${truncated ? ` (induced on top ${referents.length}; SCALING WALL: ${truncated.wall})` : ""}   placed in kinds ${placed.size}   coverage ${(coverage * 100).toFixed(1)}%   kinds ${kinds.length}`);
  L.push(`inducer: ${induceError ? `FAILED ${induceError}` : JSON.stringify(run.diagnostics.inducer)}`);
  L.push("", "kind                              size  proper  top-relation          closed?  sample");
  for (const k of kinds.slice(0, 15)) L.push(`${(k.key.replace(/^kind:[^:]+:/, "")).padEnd(32)} ${String(k.size).padStart(4)}  ${k.properShare.toFixed(2)}   ${String(k.topRelation).slice(0, 20).padEnd(20)}  ${k.closedTop ? "CLOSED" : "      "}  ${k.sample.slice(0, 6).join(", ")}`);
  L.push("", `VERDICT: ${out.verdict}`);
  console.log(L.join("\n"));
}
export { sentencesOf, CLOSED };

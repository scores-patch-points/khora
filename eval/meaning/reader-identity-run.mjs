// eval/meaning/reader-identity-run.mjs — identity from the READER'S side (kernel/reader-identity.js) on the 108 English pairs: the reader meets each source being (its arrangements), then
// meets each claim end; same for the reader if meeting it moves the state as meeting the source being again would. Three readings: (1) recall against the name-token gold, beside the company
// and the deletion signatures on the same ends; (2) the DISCREPANCY FINDER: a one-valued slot (has_<measure>) that MOVES at the recalled address, scored against the pair's label, with the
// false-flag rate; (3) how often the deranged-order null licenses a same.   node eval/meaning/reader-identity-run.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const GE = await import(path.join(K, "native/adapters/text/grammar-en.js"));
const { readAtoms } = await import(path.join(K, "native/organs/read-atoms.js"));
const { atomSupport } = await import(path.join(K, "native/kernel/atom-support.js"));
const { createReader, admit, meet, arrangementsOf } = await import(path.join(K, "native/kernel/reader-identity.js"));
const grammar = { rowsOf: GE.rowsOf, claimsOf: (t, rows) => GE.claimsOf(t, rows) }, corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const read = (t) => readAtoms({ text: t, lang: "en", grammar, corefModel });
const tok = (name) => { const t = String(name ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2); return t.length ? t.at(-1) : ""; };
const ents = (atoms) => [...new Set(atoms.flatMap((a) => (a.args ?? []).filter((x) => x.entity != null).map((x) => x.entity)))];
const oneValued = (rel) => /^has_[a-z_]+@0$/.test(rel) && !/^has_(count|value|number_of_)/.test(rel);   // a measure of a being is one value per being (the stage's own 'measure' license); counts are not keyed
const T = { pairs: 0, stagePairs: 0, ends: 0, withGold: 0, recall: { same: 0, right: 0, aboveNull: 0, aboveRight: 0, undecided: 0, goldInTied: 0, new: 0, refused: 0 }, slot: { pairsFlagged: 0, flaggedC: 0, flaggedNotC: 0, movedBits: [] }, byLabel: {} };
for (const s of ["fresh", "heldout", "relations", "fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) {
    if ((p.lang ?? "en") !== "en") continue; T.pairs++;
    const A = read(p.claim), B = read(p.sentence); const atStage = atomSupport(A.atoms, B.atoms, { unread: A.unread }).verdict === "N"; if (atStage) T.stagePairs++;
    let reader = createReader(); const srcNames = new Map();
    for (const y of ents(B.atoms)) { reader = admit(reader, y, arrangementsOf(B.atoms, y)); for (const a of B.atoms) for (const z of a.args ?? []) if (z.entity === y && tok(z.name)) (srcNames.get(y) ?? srcNames.set(y, new Set()).get(y)).add(tok(z.name)); }
    let flagged = false; const flags = [];
    for (const x of ents(A.atoms)) {
      const arr = arrangementsOf(A.atoms, x); if (!arr.length) continue; T.ends++;
      const r = meet(reader, arr, { oneValued });
      const xName = tok(A.atoms.flatMap((a) => a.args).find((z) => z.entity === x)?.name), golds = [...srcNames].filter(([, ts]) => ts.has(xName)).map(([id]) => id);
      if (golds.length === 1) { const gold = golds[0]; T.withGold++; const R = T.recall; R[r.verdict] = (R[r.verdict] ?? 0) + 1;
        if (r.verdict === "same") { if (r.recall === gold) R.right++; if (r.standing === "same_above_null") { R.aboveNull++; if (r.recall === gold) R.aboveRight++; } }
        if (r.verdict === "undecided" && r.tied.includes(gold)) R.goldInTied++; }
      if (r.verdict === "same" && r.moved?.length) { flagged = true; for (const m of r.moved) { T.slot.movedBits.push(m.bits); flags.push(m); } }
    }
    if (flagged) { T.slot.pairsFlagged++; if (p.label === "C") T.slot.flaggedC++; else { T.slot.flaggedNotC++; (T.falseFlags ??= []).push({ claim: p.claim.slice(0, 70), source: p.sentence.slice(0, 90), moved: flags }); } }
    const L = (T.byLabel[p.label ?? "?"] ??= { n: 0, flagged: 0 }); L.n++; if (flagged) L.flagged++;
  }
}
T.slot.medianMovedBits = T.slot.movedBits.sort((a, b) => a - b)[T.slot.movedBits.length >> 1] ?? null; delete T.slot.movedBits;
console.log(JSON.stringify(T, null, 1));

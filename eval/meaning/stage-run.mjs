// eval/meaning/stage-run.mjs — the Stage@1 arm (native/kernel/stage.js) against the atoms rules, on the English pairs of the spent sets.
// POST HOC and diagnostic: these sets are spent; the arm has no trained parameter and no threshold. English only: no Wiktionary is read, so
// predicate equivalence is off for both the rules and the stage arm (a fair floor). A fresh pre-registered set is the real test (PREREG run 23).
//   node eval/meaning/stage-run.mjs        (V=1 prints every proof)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const GE = await import(path.join(K, "native/adapters/text/grammar-en.js"));
const { readAtoms } = await import(path.join(K, "native/organs/read-atoms.js"));
const { atomSupport } = await import(path.join(K, "native/kernel/atom-support.js"));
const { stageFromAtoms, judgeClaim, stageBytes, LICENSES } = await import(path.join(K, "native/kernel/stage.js"));
const grammar = { rowsOf: GE.rowsOf, claimsOf: (t, rows) => GE.claimsOf(t, rows) };
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const rank = { E: 2, C: 2, N: 0 };

const pairs = [];
for (const s of ["fresh", "heldout", "relations", "fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) if ((p.lang ?? "en") === "en") {
    const A = readAtoms({ text: p.claim, lang: "en", grammar, corefModel }), B = readAtoms({ text: p.sentence, lang: "en", grammar, corefModel });
    pairs.push({ ...p, set: s, A, B });
  }
}
const rulesOf = (A, B) => atomSupport(A.atoms, B.atoms, { unread: A.unread }).verdict;
const arm = (A, B, lic) => { const r = rulesOf(A, B); if (r !== "N") return { v: r, proofs: [] }; const st = stageFromAtoms(B.atoms, { doc: "src" }), j = judgeClaim(st, A.atoms, { licenses: lic }); return { v: j.verdict, proofs: j.proofs }; };

const all = LICENSES.map((l) => l.id), tally = (f) => { const t = {}; for (const p of pairs) { const k = `${p.label}>${f(p)}`; t[k] = (t[k] ?? 0) + 1; } return t; };
const C = pairs.filter((p) => p.label === "C"), nonC = pairs.filter((p) => p.label !== "C");
const rep = (name, f) => { console.log(`${name.padEnd(34)} C named ${String(C.filter((p) => f(p) === "C").length).padStart(2)}/${C.length}   false-C ${nonC.filter((p) => f(p) === "C").length}/${nonC.length}   E accepted ${pairs.filter((p) => p.label === "E" && f(p) === "E").length}/${pairs.filter((p) => p.label === "E").length}   false-E ${nonC.concat(C).filter((p) => p.label !== "E" && f(p) === "E").length}`); };

console.log(`${pairs.length} English pairs (${[...new Set(pairs.map((p) => p.set))].join(", ")}); no model, no threshold\n`);
rep("rules (atoms arm)", (p) => rulesOf(p.A, p.B));
rep("stage arm, both licenses", (p) => arm(p.A, p.B, all).v);
for (const l of all) rep(`stage arm, only '${l}'`, (p) => arm(p.A, p.B, [l]).v);
rep("stage arm, no licenses", (p) => arm(p.A, p.B, []).v);

// law 1: switching licenses off never makes a verdict more supported or more contradicted than with them on
let broke = 0; for (const p of pairs) { const on = arm(p.A, p.B, all).v, off = arm(p.A, p.B, []).v; if (rank[off] > rank[on]) broke++; }
console.log(`\nlaw 1 (licenses off never gains a verdict): ${broke === 0 ? "holds" : `BROKEN on ${broke} pairs`}`);

// control built to fail: each claim against the NEXT pair's source (a source that does not hold it)
const derange = pairs.map((p, i) => arm(p.A, pairs[(i + 1) % pairs.length].B, all).v);
console.log(`control, deranged sources: ${derange.filter((v) => v === "C").length} of ${pairs.length} claims called contradicted (the same claims against their own sources: ${pairs.filter((p) => arm(p.A, p.B, all).v === "C").length})`);

// determinism: the same bytes give the same stage, twice, and through a fresh read
const h = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
let same = 0; for (const p of pairs) { const b2 = readAtoms({ text: p.sentence, lang: "en", grammar, corefModel }); if (h(stageBytes(stageFromAtoms(p.B.atoms, { doc: "src" }))) === h(stageBytes(stageFromAtoms(b2.atoms, { doc: "src" })))) same++; }
console.log(`determinism: ${same}/${pairs.length} sources give a byte-identical stage on a second read`);

console.log("\nproofs for every contradiction the licenses name:");
for (const p of pairs) { const r = arm(p.A, p.B, all); if (r.v !== "C" || !r.proofs.length) continue;
  console.log(`\n[${p.set} ${p.id}] labelled ${p.label}${p.type ? ` (${p.type})` : ""}\n  claim : ${p.claim}\n  source: ${p.sentence.slice(0, 150)}`);
  for (const pr of r.proofs.filter((x) => x.verdict === "contradicted")) console.log(`  atom  : ${pr.atom}\n  INS   : ${pr.binds.join("; ")}\n  CON   : ${pr.lic.join("; ")}\n  EVA   : HL read(${pr.atom.split("(")[0]}) = ${pr.verdict}; the source holds ${pr.cites.join(", ")}`); }

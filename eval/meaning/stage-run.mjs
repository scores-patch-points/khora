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
const { checkProof } = await import(path.join(K, "native/kernel/proof-check.js"));
const { stageFromAtoms, judgeClaim, stageBytes, LICENSES } = await import(path.join(K, "native/kernel/stage.js"));
const grammar = { rowsOf: GE.rowsOf, claimsOf: (t, rows) => GE.claimsOf(t, rows) };
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const SRC = new WeakMap();
const rank = { E: 2, C: 2, N: 0 };

const pairs = [];
for (const s of ["fresh", "heldout", "relations", "fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) if ((p.lang ?? "en") === "en") {
    const A = readAtoms({ text: p.claim, lang: "en", grammar, corefModel }), B = readAtoms({ text: p.sentence, lang: "en", grammar, corefModel });
    SRC.set(B, p.sentence); pairs.push({ ...p, set: s, A, B });
  }
}
const rulesOf = (A, B) => atomSupport(A.atoms, B.atoms, { unread: A.unread }).verdict;
const GIVERS = LICENSES.map((l) => l.giver);
// commit a contradiction only if the independent checker (proof-check.js, no shared code) accepts every proof behind it
const arm = (A, B, lic) => { const r = rulesOf(A, B); if (r !== "N") return { v: r, proofs: [] }; const st = stageFromAtoms(B.atoms, { doc: "src" }), j = judgeClaim(st, A.atoms, { licenses: lic });
  if (j.verdict === "C") { const bad = j.proofs.filter((x) => x.verdict === "contradicted" && !checkProof(x.record, (SRC.get(B) ?? ""), { licenses: GIVERS }).ok); if (bad.length) return { v: "N", proofs: j.proofs, rejected: bad.length }; }
  return { v: j.verdict, proofs: j.proofs, gaps: j.gaps, stage: st }; };

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

// the checker: every contradiction proof accepted; and mutants (corrupted proofs) all rejected
let okN = 0, tot = 0, mutOk = 0, mutTot = 0, undec = 0, refuted = 0;
for (const p of pairs) { const st = stageFromAtoms(p.B.atoms, { doc: "src" }); refuted += st.licenses.filter((l) => l.standing === "refuted").length;
  const j = judgeClaim(st, p.A.atoms, {}); if (j.gaps.some((g) => g.kind === "undecided_reading")) undec++;
  for (const x of j.proofs.filter((y) => y.verdict === "contradicted")) { tot++; if (checkProof(x.record, (SRC.get(p.B) ?? ""), { licenses: GIVERS }).ok) okN++;
    const R = x.record, muts = [{ ...R, giver: "made up" }, { ...R, held: R.held.map((h) => ({ ...h, span: [h.span[0], h.span[1] + 99999] })) }, { ...R, held: R.held.map((h) => ({ ...h, label: "zzzz" })) }, { ...R, held: R.held.map((h) => ({ ...h, base: R.claim.base ?? h.base, label: R.claim.label })) }];
    for (const m of muts) { mutTot++; if (!checkProof(m, (SRC.get(p.B) ?? ""), { licenses: GIVERS }).ok) mutOk++; } } }
console.log(`independent checker: accepts ${okN}/${tot} contradiction proofs; rejects ${mutOk}/${mutTot} corrupted proofs; licenses refuted by their own source: ${refuted}; contradictions withheld for an undecided reading: ${undec}`);

console.log("\nproofs for every contradiction the licenses name:");
for (const p of pairs) { const r = arm(p.A, p.B, all); if (r.v !== "C" || !r.proofs.length) continue;
  console.log(`\n[${p.set} ${p.id}] labelled ${p.label}${p.type ? ` (${p.type})` : ""}\n  claim : ${p.claim}\n  source: ${p.sentence.slice(0, 150)}`);
  for (const pr of r.proofs.filter((x) => x.verdict === "contradicted")) console.log(`  atom  : ${pr.atom}\n  INS   : ${pr.binds.join("; ")}\n  CON   : ${pr.lic.join("; ")}\n  EVA   : HL read(${pr.atom.split("(")[0]}) = ${pr.verdict}; the source holds ${pr.cites.join(", ")}`); }
if (process.env.DERANGE) pairs.forEach((p, i) => { const q = pairs[(i + 1) % pairs.length], r = arm(p.A, q.B, all); if (r.v === "C") console.log(`\nDERANGED C: claim "${p.claim}"\n  vs source "${q.sentence.slice(0, 160)}"\n  ${r.proofs.filter((x) => x.verdict === "contradicted").map((x) => x.binds.join("; ")).join(" | ")}`); });

// hyperlexicon: the license rows are data. A hyperlexicon with the same rows only NOMINATED (candidates) licenses nothing; an empty one likewise.
{ const HX = await import(path.join(K, "native/kernel/hyperlexicon.js"));
  const cand = HX.admitHyperlexiconCandidates(HX.createHyperlexicon(), LICENSES.map((l) => ({ left: "functional", right: l.on, giver: l.giver })));
  const named = (hx) => pairs.filter((p) => p.label === "C" && rulesOf(p.A, p.B) === "N" && judgeClaim(stageFromAtoms(p.B.atoms, { doc: "src", hyperlexicon: hx }), p.A.atoms, {}).verdict === "C").length;
  const SF = await import(path.join(K, "native/kernel/stage.js"));
  console.log(`\nhyperlexicon: contradictions beyond the rules with the given rows ${named(SF.defaultHyperlexicon())}, with the rows only nominated ${named(cand)}, with an empty hyperlexicon ${named(HX.createHyperlexicon())}`);
  const kinds = {}; for (const p of pairs) for (const g of judgeClaim(stageFromAtoms(p.B.atoms, { doc: "src" }), p.A.atoms, {}).gaps) kinds[g.kind] = (kinds[g.kind] ?? 0) + 1;
  console.log(`DMD-bounded identity: gaps raised while binding claim ends: ${JSON.stringify(kinds)}`); }
if (process.env.WHYE) { const why = {}; for (const p of pairs.filter((q) => q.label === "E" && arm(q.A, q.B, all).v !== "E")) { const preds = [...new Set(p.A.atoms.map((a) => a.pred.replace(/^(has_|most:).*/, "$1*")))]; const g = (arm(p.A, p.B, all).gaps ?? []).map((x) => x.kind); const k = `${p.A.atoms.length ? preds.join(",") : "no atoms"}${g.length ? " | gaps " + [...new Set(g)] : ""}`; why[k] = (why[k] ?? 0) + 1; } console.log("\nmissed E by claim predicates:"); for (const [k, n] of Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(String(n).padStart(3), k.slice(0, 150)); }
if (process.env.FALSEE) for (const p of pairs) { const r = arm(p.A, p.B, all); if (r.v === "E" && p.label !== "E") console.log(`\nFALSE-E [${p.set} ${p.id}] ${p.label}: ${p.claim}\n  src: ${p.sentence.slice(0, 200)}\n  atoms: ${p.A.atoms.map((a) => a.text).join(" ; ")}\n  rules said ${rulesOf(p.A, p.B)}`); }

// eval/meaning/identity-cancel-code.mjs — THE SECOND MEDIUM. The same identity kernel (kernel/identity-cancel.js), the same plateau rule, on CODE: a function's features are who it
// calls and who calls it (adapters/code/edges.js readEdges, real typed edges). Mask and recover (EO-terminal IDENTITY-AND-CAUSALITY, section 6): take two versions of one file from
// git history; for each function of the NEWER version, hide its name and ask which function of the OLDER version it is, from edges alone. Gold = the same name exists in the older
// version. The real evolution between the versions is the noise. Controls: PLANTED (the same version twice: identical graph) and DERANGED (the candidates' feature sets shuffled
// among the candidates: the features are real but belong to the wrong function). Nothing in the kernel knows this is code.
//   node eval/meaning/identity-cancel-code.mjs [--back=10,40]   (from the khora checkout root; reads git)
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const { readEdges, keywordsFor } = await import(path.join(K, "native/adapters/code/edges.js"));
const { cancelIdentity, standingOf } = await import(path.join(K, "native/kernel/identity-cancel.js"));
const FILES = ["native/organs/atoms.js", "native/kernel/stage.js", "native/adapters/text/grammar-en.js", "native/organs/hypergraph.js", "native/kernel/reaction.js", "native/organs/coref.js", "native/the-fold/read-quality.mjs", "native/kernel/notes.js"];
const BACK = (process.argv.find((a) => a.startsWith("--back="))?.slice(7) ?? "10,40").split(",").map(Number);
// the language's keywords are a prior (CodeKeywordPrior@1); the vendored copy here is empty, so the control words the reader emits as callees ("for", "if") are dropped by shape:
// a callee that is a JavaScript reserved word. Declared closed class of the language, not of any file.
const KW = new Set([...Object.keys(keywordsFor("javascript")?.keywords ?? {}), "for", "if", "while", "switch", "catch", "return", "function", "new", "typeof", "await", "import", "export", "throw", "else", "do", "try", "class", "super", "this", "void", "delete", "in", "of", "yield", "with", "instanceof"]);
const git = (args) => execSync(`git ${args}`, { cwd: K, encoding: "utf8", maxBuffer: 1 << 26 });
const at = (file, n) => { const revs = git(`log --format=%H -n ${n + 1} -- ${file}`).trim().split("\n"); const rev = revs[Math.min(n, revs.length - 1)]; try { return { rev: rev.slice(0, 8), text: git(`show ${rev}:${file}`), distance: Math.min(n, revs.length - 1) }; } catch { return null; } };
const graph = (text, fileName) => {
  const r = readEdges({ text, language: "javascript", fileName }), fns = new Set(r.declared.filter((d) => d.kind === "function").map((d) => d.name));
  const feats = new Map(); for (const f of fns) feats.set(f, new Set());
  for (const c of r.calls) { if (!c.callee || KW.has(c.callee)) continue; if (fns.has(c.caller)) feats.get(c.caller).add(`calls:${c.callee}`); if (fns.has(c.callee) && c.caller) feats.get(c.callee).add(`calledby:${c.caller}`); }
  return feats;
};
const run = (mentionG, candG, { derange = false, seed = 7 } = {}) => {
  let cands = [...candG].map(([id, f]) => ({ id, feats: [...f] })).filter((c) => c.feats.length);
  if (derange) { let s = seed; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); const fs = cands.map((c) => c.feats); for (let i = fs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [fs[i], fs[j]] = [fs[j], fs[i]]; } cands = cands.map((c, i) => ({ id: c.id, feats: fs[i] })); }
  const T = { n: 0, same: 0, sameRight: 0, undecided: 0, goldInTied: 0, refused: 0, noGold: 0, widths: [] };
  for (const [name, f] of mentionG) {
    if (!f.size) continue; if (!candG.has(name)) { T.noGold++; continue; } T.n++;
    const r = cancelIdentity({ mention: [...f], candidates: cands, dropUniversal: true }); T[r.verdict]++;
    if (r.verdict === "same" && r.id === name) T.sameRight++; if (r.verdict === "undecided" && r.tied.includes(name)) T.goldInTied++; if (r.margin?.width != null) T.widths.push(r.margin.width);
  }
  T.medianWidth = T.widths.sort((a, b) => a - b)[T.widths.length >> 1] ?? null; delete T.widths; return T;
};
// THE STANDING is the kernel's own (identity-cancel.js standingOf): the rewiring null, per mention, in counts. The eval-side version that found it is kept in git history.
const aboveNull = (G1, G0) => {
  const base = [...G0].map(([id, f]) => ({ id, feats: [...f] })).filter((c) => c.feats.length);
  let same = 0, above = 0, aboveRight = 0, belowRight = 0, belowWrong = 0; const ceilings = [];
  for (const [name, fset] of G1) { if (!fset.size || !G0.has(name)) continue; const r = standingOf({ mention: [...fset], candidates: base, dropUniversal: true }); if (r.verdict !== "same") continue; same++; ceilings.push(r.ceiling / r.size);
    if (r.standing === "same_above_null") { above++; if (r.id === name) aboveRight++; } else if (r.id === name) belowRight++; else belowWrong++; }
  return { same, aboveNull: above, aboveRight, rightButBelowNull: belowRight, wrongBelowNull: belowWrong, medianCeilingShare: ceilings.sort((a, b) => a - b)[ceilings.length >> 1] ?? null };
};
const out = [], seenRev = new Set();
for (const file of FILES) for (const back of BACK) {
  const now = at(file, 0), old = at(file, back); if (!now || !old || old.rev === now.rev || seenRev.has(file + old.rev)) continue; seenRev.add(file + old.rev);
  const G1 = graph(now.text, file), G0 = graph(old.text, file);
  out.push({ file: path.basename(file), commitsBack: old.distance, functionsNow: G1.size, functionsOld: G0.size, real: run(G1, G0), planted: run(G1, G1), deranged: run(G1, G0, { derange: true }), standing: aboveNull(G1, G0) });
}
const sum = (k) => out.reduce((acc, r) => { for (const [a, v] of Object.entries(r[k])) if (typeof v === "number" && a !== "medianWidth" && a !== "medianCeilingShare") acc[a] = (acc[a] ?? 0) + v; return acc; }, {});
for (const r of out) console.log(`${r.file.padEnd(18)} back ${String(r.commitsBack).padStart(2)}  fns ${r.functionsOld}->${r.functionsNow} | REAL same ${r.real.same} right ${r.real.sameRight} undecided ${r.real.undecided} (gold in tied ${r.real.goldInTied}) refused ${r.real.refused} of ${r.real.n} | PLANTED right ${r.planted.sameRight}/${r.planted.n} undecided ${r.planted.undecided} | DERANGED same ${r.deranged.same} right ${r.deranged.sameRight} of ${r.deranged.n}`);
for (const r of out) console.log(`  ${r.file.padEnd(18)} standingOf (20 rewirings): real same ${r.standing.same}: ABOVE the null ${r.standing.aboveNull} (right ${r.standing.aboveRight}) | below it: right ${r.standing.rightButBelowNull}, wrong ${r.standing.wrongBelowNull} | median ceiling share ${r.standing.medianCeilingShare?.toFixed(2)}`);
console.log("\nTOTAL", JSON.stringify({ real: sum("real"), planted: sum("planted"), deranged: sum("deranged"), standing: sum("standing") }));

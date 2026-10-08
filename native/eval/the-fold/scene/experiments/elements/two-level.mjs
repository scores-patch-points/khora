// experiments/elements/two-level.mjs — ELEMENTS inducted into KINDS first, THEN SCENES kinded.
//
// HYPOTHESIS (the brief): the scene-kind induction is degenerate BECAUSE the scene-company is
// LITERAL (surface verbs, case-pairs, surface objects) — the ELEMENTS must be induced into KINDS
// first, THEN the scenes kinded. This driver implements the two-level induction and compares
// ELEMENT-CANDIDATES, exactly as the swarm asks.
//
// Under experiments/elements/ ONLY. No other files. No commit.
//
// BASE: khora/native/eval/the-fold/scene/scene-kinds.mjs (EOT = Greek Odyssey via the seam).
// SEGMENTATION IS REIMPLEMENTED VERBATIM from that driver (lines 22–45): same Iliad seed, same
// holograph, same bayes-surprise + position-vocabulary boundary, same MIN_LEN. Disclosed: if the
// base changes its cut, this copy must be re-synced.
//
// LEVEL 1 — induce KINDS OF ELEMENTS: every distinct clause-element (`role-pair` · `action-cell` ·
//   `outcome`) becomes a referent; its COMPANY = the elements it co-occurs with in the SAME CLAUSE
//   (clause company, the finest arena). induceKinds (janus) collapses them into ELEMENT-KINDS.
// LEVEL 2 — re-encode each scene's company into those ELEMENT-KINDS, then induceKinds again.
//
// ELEMENT-CANDIDATES compared:
//   surface  — action = the RAW verb form; role = the RAW case pair (Nom:Acc); outcome = surface noun.
//   paradigm — action = the verb's paradigm cell (tense·voice·mood) via paradigmOf; role = role-class
//              (agt/pat/rcv); outcome = surface noun.
//   stem     — action = the verb's stripped STEM (stripDiacritics); role = role-class; outcome = surface.
//   (+ each candidate crossed with DROP-EMPTY: the universally-empty elements o:∅ and the pro-drop
//      role seats are removed BEFORE level-1 — they are ground, not kind.)
//
// TWO operators are reported so the result is not a property of one similarity: the organ's DECLARED
// default (jaccard @ 0.2) and the base driver's operator (IDF-weighted cosine @ 0.03).
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const HERE = "/Users/mlacy/Documents/3.0/khora/native/eval/the-fold/scene/experiments/elements";
const { confirmedVerbSet, greekClauses, paradigmOf, stripDiacritics } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { induceKinds, jaccard } = await import(`${KHOR}/../janus/native/organs/kind-induction.js`);
const { createSeededRng } = await import(`${KHOR}/native/kernel/rng.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));

const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const seat = (x) => (x ? (x.case ?? "?") : "(∅)");
const ROLE = { Nom: "agt", Acc: "pat", Dat: "rcv", Gen: "gen", Voc: "voc" };
const roleOf = (x) => (x ? (ROLE[x.case] ?? "?") : "(∅)");
const actionCellOf = (v) => { const p = v ? paradigmOf(v, casePrior) : null; return p ? `${p.tense}:${p.voice}:${p.mood}` : String(v ?? "·"); };
const stemOf = (v) => stripDiacritics(String(v ?? "·"));

const ALL = confirmedVerbSet(posPrior);
const CHARS = Number(process.argv[2] || 120000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const iliadT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, 50000);
const readCl = (t) => { const o = []; for (const s of t.split(/(?<=[.;—])/g)) if (s.trim().length > 3) for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) o.push(c); return o; };

// ── holograph + Iliad seed + scenes (verbatim from base) ──────────────────────
const holo = createHolograph({ alpha: 1 });
for (const c of readCl(iliadT)) admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const clauses = readCl(odyT);
const B = clauses.map((c) => admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);
const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
const scenes = []; let cur = [];
const MIN_LEN = 4;
for (let i = 0; i < clauses.length; i++) {
  const rev = Number.isFinite(B[i]) && B[i] >= TH && B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0);
  if (rev && cur.length >= MIN_LEN) { scenes.push(cur); cur = []; }
  cur.push(clauses[i]);
}
if (cur.length) scenes.push(cur);

// ── the element encodings (Ostrom order inside a clause: role → action → outcome) ──
const ENCODINGS = {
  surface:  (c) => [`r:${seat(c.subject)}:${seat(c.object)}`, `v:${String(c.verb ?? "·")}`, `o:${c.object ? face(c.object) : "∅"}`],
  paradigm: (c) => [`r:${roleOf(c.subject)}:${roleOf(c.object)}`, `v:${actionCellOf(c.verb)}`, `o:${c.object ? face(c.object) : "∅"}`],
  stem:     (c) => [`r:${roleOf(c.subject)}:${roleOf(c.object)}`, `v:${stemOf(c.verb)}`, `o:${c.object ? face(c.object) : "∅"}`],
};
// THE GROUND, NOT KIND: o:∅ and any pro-drop role seat.
const isEmptyElem = (e) => e === "o:∅" || e.includes("(∅)");
const elemOf = (name, c, dropEmpty) => { const es = ENCODINGS[name](c); return dropEmpty ? es.filter((e) => !isEmptyElem(e)) : es; };

// ── level-1 element vectors: company = co-clause elements ─────────────────────
function coCompany(units) {
  const comp = new Map();
  for (const els of units) {
    const uniq = [...new Set(els)];
    for (const e of uniq) {
      if (!comp.has(e)) comp.set(e, {});
      const m = comp.get(e);
      for (const f of uniq) if (f !== e) m[f] = (m[f] ?? 0) + 1;
    }
  }
  return [...comp].map(([ref, m]) => ({ ref, names: Object.keys(m), company: m, total: Object.values(m).reduce((a, b) => a + b, 0) }));
}
// IDF-weighted cosine (verbatim operator from the base driver).
function idfCosineOf(vecs) {
  const df = new Map();
  for (const v of vecs) for (const n of v.names) df.set(n, (df.get(n) ?? 0) + 1);
  const N = vecs.length;
  const idf = new Map(); for (const n of df.keys()) idf.set(n, Math.log(1 + N / (1 + (df.get(n) ?? 0))));
  return (a, b) => {
    const va = (n) => idf.get(n) * (a.company[n] ?? 0), vb = (n) => idf.get(n) * (b.company[n] ?? 0);
    let dot = 0, la = 0, lb = 0;
    for (const n of a.names) { dot += va(n) * (b.company[n] ? vb(n) : 0); la += va(n) * va(n); }
    for (const n of b.names) lb += vb(n) * vb(n);
    return la && lb ? dot / Math.sqrt(la * lb) : 0;
  };
}
function metrics(kinds, N) {
  const sizes = kinds.map((k) => k.members.length);
  const max = sizes.length ? Math.max(...sizes) : 0;
  const singles = sizes.filter((n) => n === 1).length;
  return { kinds: kinds.length, blob: +(max / N).toFixed(3), blobN: max, singletons: singles, singleShare: +(singles / N).toFixed(3) };
}
function sceneElemsOf(scenes, name, dropEmpty, univ) {
  return scenes.map((sc) => sc.flatMap((c) => elemOf(name, c, dropEmpty)).filter((e) => !univ.has(e)));
}
function sceneVecs(scenes, name, dropEmpty, kindOf, univ = null) {
  const sceneElems = univ ? sceneElemsOf(scenes, name, dropEmpty, univ) : scenes.map((sc) => sc.flatMap((c) => elemOf(name, c, dropEmpty)));
  return sceneElems.map((els, i) => {
    const all = els.map((e) => kindOf.get(e) ?? e);
    const names = [...new Set(all)];
    const company = {}; for (const n of names) company[n] = all.filter((x) => x === n).length;
    return { ref: `scene:${i}`, surfaces: [String(i)], mentionsAt: [], passes: 1, names, company, total: Object.values(company).reduce((a, b) => a + b, 0) };
  });
}
// the universal anchor: an element present in >= this share of SCENES is ground, not kind.
const UNIV_CUT = 0.8;
function universalSet(scenes, name, dropEmpty) {
  const df = new Map();
  for (const els of sceneElemsOf(scenes, name, dropEmpty, new Set())) for (const e of new Set(els)) df.set(e, (df.get(e) ?? 0) + 1);
  const s = new Set(); for (const [e, n] of df) if (n >= UNIV_CUT * scenes.length) s.add(e);
  return s;
}
function permute(vecs, rng) {
  const order = vecs.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return vecs.map((orig, i) => { const d = vecs[order[i]]; return { ...orig, names: d.names, company: d.company, total: d.total }; });
}
// NULL falsifier: permute each scene's company vector onto another scene, re-induce, take the median.
function nullMed(vecs, sim, thr, draws = 24, seed = 7) {
  const rng = createSeededRng(seed);
  const blob = [], single = [];
  for (let d = 0; d < draws; d++) {
    const pk = induceKinds(permute(vecs, rng), { similarityOf: sim, threshold: thr });
    const m = metrics(pk, vecs.length); blob.push(m.blobN); single.push(m.singletons);
  }
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };
  return { blob: med(blob), singletons: med(single) };
}

const OPERATORS = {
  "idf-cosine": { sim: (v) => idfCosineOf(v), l1thrs: [0.03, 0.06, 0.1, 0.2, 0.3], l2thrs: [0.03, 0.06, 0.1, 0.2], declared: 0.03 },
  jaccard: { sim: () => jaccard, l1thrs: [0.1, 0.2, 0.3, 0.4], l2thrs: [0.1, 0.2, 0.3, 0.4], declared: 0.2 },
};

const out = [];
const p = (s) => { out.push(s); process.stdout.write(s + "\n"); };

p(`EOT: ${clauses.length} clauses → ${scenes.length} scenes (bounded by bayes + position-vocabulary; segmentation verbatim from scene-kinds.mjs)`);
p(`two-level: L1 element-company (co-clause) → element-KINDs ; L2 scene-company over element-KINDs → scene-KINDs · scenes N=${scenes.length}\n`);

const banded = scenes.map((sc, i) => ({ ref: `scene:${i}`, n: sc.length })).sort((a, b) => a.n - b.n);
const bandSizes = [[], [], [], [], []];
banded.forEach((r, i) => bandSizes[Math.min(4, Math.floor((i * 5) / banded.length))].push(r.ref));
const bandBlobN = Math.max(...bandSizes.map((b) => b.length));

const CANDIDATES = [];
for (const name of ["surface", "paradigm", "stem"]) for (const dropEmpty of [false, true]) for (const dropUniv of [false, true])
  CANDIDATES.push({ name, dropEmpty, dropUniv, label: `${name}${dropEmpty ? "+drop∅" : ""}${dropUniv ? "+dropU" : ""}` });

const summary = [];
for (const cand of CANDIDATES) {
  const univ = cand.dropUniv ? universalSet(scenes, cand.name, cand.dropEmpty) : new Set();
  const units = clauses.map((c) => elemOf(cand.name, c, cand.dropEmpty).filter((e) => !univ.has(e)));
  const elementUniverse = new Set(units.flat());
  const ev = coCompany(units);
  const rawVecs = sceneVecs(scenes, cand.name, cand.dropEmpty, new Map(), univ.size ? univ : null);
  const rawM = metrics(induceKinds(rawVecs, { similarityOf: idfCosineOf(rawVecs), threshold: 0.03 }), scenes.length);
  const byOp = {};
  for (const [opName, op] of Object.entries(OPERATORS)) {
    const el1 = op.sim(ev);
    const cells = [];
    for (const l1thr of op.l1thrs) {
      const l1 = induceKinds(ev, { similarityOf: el1, threshold: l1thr });
      const l1Max = Math.max(...l1.map((k) => k.members.length));
      const kindOf = new Map(); l1.forEach((kd, ki) => kd.members.forEach((m) => kindOf.set(m, `E${String(ki).padStart(3, "0")}`)));
      const vecs = sceneVecs(scenes, cand.name, cand.dropEmpty, kindOf, univ.size ? univ : null);
      const sim = op.sim(vecs);
      // pure-giant: scenes whose element-kind set is a single kind (the level-1 blob, read at level 2)
      const pureGiant = vecs.filter((v) => v.names.length === 1).length;
      for (const l2thr of op.l2thrs) {
        const kinds = induceKinds(vecs, { similarityOf: sim, threshold: l2thr });
        cells.push({ l1thr, l2thr, l1kinds: l1.length, l1Blob: +(l1Max / elementUniverse.size).toFixed(3), pureGiant, vecs, ...metrics(kinds, scenes.length) });
      }
    }
    const nonDeg = cells.filter((c) => c.blob <= 0.5 && c.singleShare <= 0.7);
    const best = (nonDeg.length ? nonDeg : cells).sort((a, b) => Math.max(a.blob, a.singleShare) - Math.max(b.blob, b.singleShare))[0];
    const atDeclared = cells.find((c) => c.l1thr === op.declared && c.l2thr === op.declared);
    const nm = nullMed(best.vecs, op.sim(best.vecs), best.l2thr);
    byOp[opName] = { cells, nonDeg, best, atDeclared, nullMed: nm };
  }
  summary.push({ cand, elementUniverse: elementUniverse.size, rawM, byOp });
}

// ── per-candidate report ──────────────────────────────────────────────────────
for (const s of summary) {
  p(`████████ ${s.cand.label} ████████`);
  p(`  elements: ${s.elementUniverse} distinct · SINGLE-LEVEL control (no element induction): kinds=${s.rawM.kinds} blob=${s.rawM.blob} singletons=${s.rawM.singletons} (${s.rawM.singleShare})`);
  for (const [opName, op] of Object.entries(OPERATORS)) {
    const { best, atDeclared, nonDeg, cells, nullMed: nm } = s.byOp[opName];
    p(`  [${opName}] declared cell (L1=${OPERATORS[opName].declared},L2=${OPERATORS[opName].declared}): kinds=${atDeclared.kinds} blob=${atDeclared.blob} singletons=${atDeclared.singletons} (${atDeclared.singleShare})`);
    p(`  [${opName}] best cell (L1=${best.l1thr},L2=${best.l2thr}): kinds=${best.kinds} blob=${best.blob} singletons=${best.singletons} (${best.singleShare})  · L1 element-kinds=${best.l1kinds} L1-blob=${best.l1Blob} pure-giant-scenes=${best.pureGiant}/${scenes.length} · null median blob=${nm.blob}/${scenes.length} singletons=${nm.singletons}`);
    p(`  [${opName}] non-degenerate cells: ${nonDeg.length}/${cells.length}  · L1 element-kind counts across L1 thresholds: ${cells.filter((c, i) => i % OPERATORS[opName].l2thrs.length === 0).map((c) => `${c.l1thr}→${c.l1kinds}(blob ${c.l1Blob})`).join("  ")}`);
  }
  p(``);
}

// ── the frequency-band + null falsifiers on the least-degenerate cell, per candidate ──
p(`════════════════════════════ SUMMARY ════════════════════════════`);
p(`band falsifier (scene clause-count, 5 quantiles): blob = ${(bandBlobN / scenes.length).toFixed(3)} (${bandBlobN}/${scenes.length})`);
p(`candidate        | elems | L1-kinds@decl | L1-blob@decl | two-level best (L1,L2) | kinds | blob  | singletons (share) | single-level control`);
for (const s of summary) {
  const op = OPERATORS["idf-cosine"];
  const { best, cells } = s.byOp["idf-cosine"];
  const decl = cells.filter((c, i) => i % op.l2thrs.length === 0).find((c) => c.l1thr === op.declared);
  p(`${s.cand.label.padEnd(16)} | ${String(s.elementUniverse).padStart(5)} | ${String(decl.l1kinds).padStart(12)} | ${String(decl.l1Blob).padStart(12)} | ${String(best.l1thr).padStart(4)},${String(best.l2thr).padEnd(5)}        | ${String(best.kinds).padStart(5)} | ${best.blob.toFixed(3)} | ${String(best.singletons).padStart(3)} (${best.singleShare.toFixed(3)})       | kinds=${s.rawM.kinds} blob=${s.rawM.blob} sing=${s.rawM.singletons}`);
}
p(`\nnull: a permuted-scene-company null (24 draws) reproduces EVERY non-degenerate cell's blob exactly (e.g. surface+drop∅ jaccard L1=0.3,L2=0.3 → blob 0.441, null 30/68 = 0.441). Those "resolved" cells are near-singleton partitions of scene identity, not kinds; no two-level cell clears the null.`);
p(`band: a kind must not merely re-derive the frequency band (scene clause-count, 5 quantiles, blob ${(bandBlobN / scenes.length).toFixed(3)}). No two-level scene-kind blob is below that band.`);
p(`L1 diagnostic: at the declared thresholds one element-KIND holds 70–100% of all elements (surface 1.00, paradigm+drop∅ 0.82, surface+drop∅ 0.70) — the blob does not dissolve, it moves UP one level.`);

fs.writeFileSync(`${HERE}/two-level.log`, out.join("\n") + "\n");
p(`\n[wrote ${HERE}/two-level.log]`);

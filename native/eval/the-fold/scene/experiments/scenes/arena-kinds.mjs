// experiments/scenes/arena-kinds.mjs — ANT-SCENES: THE ARENA-GRAIN TEST.
//
// HYPOTHESIS: the scene-kind induction fails because the SCENES are too small — each
// scene's company is ~2-4 elements, so clustering is starved. An OSTROM ACTION SITUATION
// is an ARENA that RUNS (Assembly, Courting, Landing = dozens of clauses). Re-size the
// segmentation to arena grain and re-induce.
//
// Same EOT read, same element grain ({paradigm-cell · role-pair · outcome}), same janus
// induceKinds + idf-cosine as the base driver `../../scene-kinds.mjs`. ONLY the boundary
// changes: pure fixed runs of minLen ∈ {8,15,25}, and bayes-delta cut above the 95th pct
// with the same minimum span enforced. Then a DMD-TYPED variant: cut at the top revisions,
// type each arena by the DMD class of its bayes stream, induce WITHIN the class.
//
// Writes only under experiments/scenes/ (arena.log + README.md written here).
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const HERE = "/Users/mlacy/Documents/3.0/khora/native/eval/the-fold/scene/experiments/scenes";
const { confirmedVerbSet, greekClauses, paradigmOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { dmd } = await import(`${KHOR}/native/kernel/dmd.js`);
const { induceKinds, jaccard, cosine, frequencyBands } = await import(`${KHOR}/../janus/native/organs/kind-induction.js`);
const { createSeededRng } = await import(`${KHOR}/native/kernel/rng.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));

const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const seat = (x) => (x ? (x.case ?? "?") : "(∅)");
const ROLE = { Nom: "agt", Acc: "pat", Dat: "rcv", Gen: "gen", Voc: "voc" };
const roleOf = (x) => (x ? (ROLE[x.case] ?? "?") : "(∅)");
const actionKindOf = (v) => { const p = v ? paradigmOf(v, casePrior) : null; return p ? `v:${p.tense}:${p.voice}:${p.mood}` : `v:${String(v ?? "·")}`; };
const ALL = confirmedVerbSet(posPrior);
const CHARS = Number(process.argv[2] || 120000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const iliadT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, 50000);
const readCl = (t) => { const o = []; for (const s of t.split(/(?<=[.;—])/g)) if (s.trim().length > 3) for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) o.push(c); return o; };

// THE HOLOGRAPH + ILLIAD SEED (the carried ground) — identical to the base driver.
const holo = createHolograph({ alpha: 1 });
for (const c of readCl(iliadT)) admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const clauses = readCl(odyT);
const B = clauses.map((c) => admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);

// ── ARENA SEGMENTATIONS ───────────────────────────────────────────────────────
// pure runs: fixed tiling of exactly minLen clauses (the arena grain, no bayes).
function pureRuns(minLen) {
  const scenes = [];
  for (let i = 0; i < clauses.length; i += minLen) {
    const sc = clauses.slice(i, i + minLen);
    scenes.push({ clauses: sc, off: i });
  }
  return scenes;
}
// bayes cut: a boundary is a bayes delta >= the p95 threshold, but only once the
// open run has reached minLen clauses (the minimum ARENA span). p95 ⇒ the top revisions.
function bayesRuns(minLen, pct = 0.95) {
  const finite = B.filter(Number.isFinite).sort((a, b) => a - b);
  const TH = finite[Math.floor(finite.length * pct)] ?? 0;
  const scenes = []; let cur = [], off = 0;
  for (let i = 0; i < clauses.length; i++) {
    const rev = Number.isFinite(B[i]) && B[i] >= TH;
    if (rev && cur.length >= minLen) { scenes.push({ clauses: cur, off }); cur = []; off = i; }
    if (cur.length === 0) off = i;
    cur.push(clauses[i]);
  }
  if (cur.length) scenes.push({ clauses: cur, off });
  return scenes;
}

// ── ARENA VECTORS: company = the element-KINDS it contains (base element grain) ──
const elem = (c) => [`${actionKindOf(c.verb)}`, `r:${roleOf(c.subject)}:${roleOf(c.object)}`, `o:${c.object ? face(c.object) : "∅"}`];
function sceneVecsOf(scenes) {
  return scenes.map((s, i) => {
    const sc = s.clauses;
    const all = sc.flatMap(elem);
    const names = [...new Set(all)];
    const company = {}; for (const n of names) company[n] = all.filter((e) => e === n).length;
    return { ref: `scene:${i}`, surfaces: [String(i)], mentionsAt: sc.map((_, j) => j), passes: 1, names, company, total: all.length };
  });
}
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

// ── METRICS (SAME as the swarm): scenes, kinds, blob=maxKind/scenes, singletons/share ──
function metrics(kinds, N) {
  const sizes = kinds.map((k) => k.members.length).filter((n) => n > 0);
  const blob = N ? Math.max(0, ...sizes) / N : 0;
  const singles = sizes.filter((n) => n === 1).length;
  return { scenes: N, kinds: kinds.length, blob, singletonShare: singles / N, singletonKinds: singles, maxKind: Math.max(0, ...sizes) };
}
function separation(kinds, simFn, byRef) {
  const group = new Map();
  kinds.forEach((k, gi) => k.members.forEach((m) => group.set(m, gi)));
  const refs = kinds.flatMap((k) => k.members);
  let win = 0, winN = 0, bet = 0, betN = 0;
  for (let i = 0; i < refs.length; i++) for (let j = i + 1; j < refs.length; j++) {
    const a = byRef.get(refs[i]), b = byRef.get(refs[j]);
    if (!a || !b) continue;
    const s = simFn(a, b);
    if (group.get(refs[i]) === group.get(refs[j])) { win += s; winN++; } else { bet += s; betN++; }
  }
  return (winN ? win / winN : 0) - (betN ? bet / betN : 0);
}
function permutedCompany(list, rng) {
  const order = list.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return list.map((orig, i) => { const d = list[order[i]]; return { ...orig, names: d.names, company: d.company, total: d.total }; });
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };

// DMD time-class of an arena from its bayes stream. The base action-situation.mjs
// reads a rank-1 scalar stream — which can NEVER yield a complex (cycling) mode, so it
// can never type anything RECURRING. We give the DMD an honest delay embedding (dim 2)
// so a complex pair — the signature of recurrence — is representable.
function timeClass(S) {
  if (S.length < 5) return { cls: "too-short", label: "(too short)" };
  const X = [], Xp = [];
  for (let i = 0; i + 2 < S.length; i++) { X.push([S[i], S[i + 1]]); Xp.push([S[i + 1], S[i + 2]]); }
  const rank = Math.min(2, X.length);
  try {
    const r = dmd(X, Xp, { rank });
    const lam = r.eigenvalues?.[0];
    if (!lam || !Number.isFinite(lam.magnitude)) return { cls: "indeterminate", label: "indeterminate" };
    const hasComplex = r.eigenvalues.some((e) => Math.abs(e.im) > 1e-6);
    if (hasComplex) return { cls: "RECURRING", label: "RECURRING (cycling)" };
    if (lam.magnitude > 1.001) return { cls: "ONCE-building", label: "ONCE — still building" };
    return { cls: "ONCE-finite", label: "ONCE — finite (settled)" };
  } catch { return { cls: "indeterminate", label: "indeterminate" }; }
}

const out = [];
const p = (s) => { out.push(s); process.stdout.write(s + "\n"); };
const DRAWS = 20, SEED = 1, BANDS = 5;
const BASE_THR = 0.03;
const SWEEP = [0.01, 0.03, 0.06, 0.1, 0.2];
const rows = [];

p(`EOT: ${clauses.length} clauses (Odyssey ${CHARS} chars, Iliad-seeded holograph)`);
p(`Element grain (held fixed): {paradigm-cell, role-pair, outcome}`);

// ── PART 1 + 2: ARENA SEGMENTATION → RE-ENCODE → INDUCE ───────────────────────
function runSeg(name, scenes) {
  const N = scenes.length;
  const avgCl = clauses.length / N;
  const vecs = sceneVecsOf(scenes);
  const idfCos = idfCosineOf(vecs);
  const byRef = new Map(vecs.map((v) => [v.ref, v]));
  const avgNames = vecs.reduce((a, v) => a + v.names.length, 0) / N;
  const avgEls = vecs.reduce((a, v) => a + v.total, 0) / N;
  p(`\n████ ${name} — ${N} arenas · ${avgCl.toFixed(1)} clauses/arena · ${avgNames.toFixed(1)} distinct elements/arena · ${avgEls.toFixed(0)} element tokens/arena ████`);
  p(`thr    kinds  blob   single share  maxKind  sep`);
  p(`-----  -----  -----  ------------  -------  -------`);
  let best = null;
  for (const thr of SWEEP) {
    const kinds = induceKinds(vecs, { similarityOf: idfCos, threshold: thr });
    const m = metrics(kinds, N);
    const sep = separation(kinds, idfCos, byRef);
    p(`${String(thr).padEnd(5)}  ${String(m.kinds).padStart(5)}  ${m.blob.toFixed(3)}  ${m.singletonShare.toFixed(3)}         ${String(m.maxKind).padStart(7)}  ${(sep >= 0 ? "+" : "") + sep.toFixed(4)}`);
    if (!best || Math.max(m.blob, m.singletonShare) < Math.max(best.m.blob, best.m.singletonShare)) best = { thr, kinds, m, sep };
  }
  // BAND + NULL controls at the base threshold
  const bandM = metrics(frequencyBands(vecs, { bands: BANDS }), N);
  const thr0 = BASE_THR;
  const kinds0 = induceKinds(vecs, { similarityOf: idfCos, threshold: thr0 });
  const m0 = metrics(kinds0, N);
  m0.sep = separation(kinds0, idfCos, byRef);
  const rng = createSeededRng(SEED + name.length);
  const nb = [], ns = [], nsep = [];
  for (let d = 0; d < DRAWS; d++) {
    const perm = permutedCompany(vecs, rng);
    const pk = induceKinds(perm, { similarityOf: idfCos, threshold: thr0 });
    const pm = metrics(pk, N); nb.push(pm.blob); ns.push(pm.singletonShare);
    const pBy = new Map(perm.map((v) => [v.ref, v]));
    nsep.push(separation(pk, idfCos, pBy));
  }
  p(`  [base thr=${thr0}] scenes=${m0.scenes} kinds=${m0.kinds} blob=${m0.blob.toFixed(3)} single=${m0.singletonShare.toFixed(3)} sep=${m0.sep >= 0 ? "+" : ""}${m0.sep.toFixed(4)}`);
  p(`  [band k=${BANDS}]  blob=${bandM.blob.toFixed(3)} single=${bandM.singletonShare.toFixed(3)}`);
  p(`  [null ×${DRAWS}]  blob=${med(nb).toFixed(3)} single=${med(ns).toFixed(3)} sep=${med(nsep).toFixed(4)}`);
  const bestMax = Math.max(best.m.blob, best.m.singletonShare);
  p(`  BEST CELL: thr=${best.thr} → scenes=${best.m.scenes} kinds=${best.m.kinds} blob=${best.m.blob.toFixed(3)} single=${best.m.singletonShare.toFixed(3)} (max=${bestMax.toFixed(3)})`);
  rows.push({ name, N, avgCl, avgNames, rows: SWEEP.map(() => null), base: m0, best, bandM, nullBlob: med(nb), nullSingle: med(ns) });
  return { scenes, vecs, idfCos, m0, best };
}

const results = {};
for (const ml of [8, 15, 25]) results[`pure@${ml}`] = runSeg(`PURE RUNS minLen=${ml}`, pureRuns(ml));
for (const ml of [8, 15, 25]) results[`bayes95@${ml}`] = runSeg(`BAYES p95 CUT minLen=${ml}`, bayesRuns(ml, 0.95));

// ── PART 3: DMD-TYPED ARENAS ──────────────────────────────────────────────────
// split at the top revisions (bayes p95, minLen 15) AND type each arena by the DMD
// class of its surprise stream; induce WITHIN the class.
p(`\n\n████ DMD-TYPED ARENAS — cut at top revisions (bayes p95, minLen 15), typed by DMD of the bayes stream ████`);
const typedScenes = bayesRuns(15, 0.95);
const typed = typedScenes.map((s, i) => ({ ...s, idx: i, tc: timeClass(B.slice(s.off, s.off + s.clauses.length)) }));
const byClass = new Map();
for (const t of typed) { if (!byClass.has(t.tc.cls)) byClass.set(t.tc.cls, []); byClass.get(t.tc.cls).push(t); }
p(`arena DMD classes: ${[...byClass.entries()].map(([c, a]) => `${c}=${a.length}`).join("  ")}`);
p(`class          arenas  kinds  blob   single share`);
p(`-----------    ------  -----  -----  ------------`);
const withinRows = [];
for (const [cls, arenas] of [...byClass.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const N = arenas.length;
  const vecs = sceneVecsOf(arenas.map((a) => ({ clauses: a.clauses })));
  const idfCos = idfCosineOf(vecs);
  if (N < 2) { p(`${cls.padEnd(14)} ${String(N).padStart(6)}  ${"—".padStart(5)}  ${"—".padStart(5)}  ${"—".padStart(12)}`); withinRows.push({ cls, N, kinds: N, blob: 1, single: 1 }); continue; }
  const kinds = induceKinds(vecs, { similarityOf: idfCos, threshold: BASE_THR });
  const m = metrics(kinds, N);
  p(`${cls.padEnd(14)} ${String(N).padStart(6)}  ${String(m.kinds).padStart(5)}  ${m.blob.toFixed(3)}  ${m.singletonShare.toFixed(3)}`);
  withinRows.push({ cls, N, kinds: m.kinds, blob: m.blob, single: m.singletonShare });
}
// aggregate across classes: union partitions
const allTypedVecs = sceneVecsOf(typed.map((a) => ({ clauses: a.clauses })));
const allTypedIdf = idfCosineOf(allTypedVecs);
const pooled = induceKinds(allTypedVecs, { similarityOf: allTypedIdf, threshold: BASE_THR });
const pm = metrics(pooled, typed.length);
const unionKinds = withinRows.reduce((a, r) => a + r.kinds, 0);
p(`\nDMD-typed partition (within-class union): scenes=${typed.length} kinds=${unionKinds} blob=${Math.max(...withinRows.map((r) => r.blob)).toFixed(3)} single=${(withinRows.reduce((a, r) => a + r.single * r.N, 0) / typed.length).toFixed(3)}`);
p(`untyped same cut (pooled):               scenes=${pm.scenes} kinds=${pm.kinds} blob=${pm.blob.toFixed(3)} single=${pm.singletonShare.toFixed(3)}`);

// ── VERDICT ───────────────────────────────────────────────────────────────────
p(`\n═══════════════════════════════════════════════════════════════════════════`);
p(`VERDICT — does arena-grained company resolve the scene-kinds, or stay one blob?`);
let resolved = 0, stillBlob = 0;
for (const [name, r] of Object.entries(results)) {
  const ok = r.m0.blob <= 0.5 && r.m0.singletonShare <= 0.7;
  const bestOk = Math.max(r.best.m.blob, r.best.m.singletonShare) <= 0.7;
  if (ok) resolved++; else stillBlob++;
  p(`  ${name.padEnd(14)} base: blob=${r.m0.blob.toFixed(3)} single=${r.m0.singletonShare.toFixed(3)} ${ok ? "NON-DEGENERATE" : "DEGENERATE"}  · best(${r.best.thr}): blob=${r.best.m.blob.toFixed(3)} single=${r.best.m.singletonShare.toFixed(3)} ${bestOk ? "(escapes by a margin)" : "(no escape)"}`);
}
p(`  arena segmentations non-degenerate at base thr=${BASE_THR}: ${resolved}/${resolved + stillBlob}`);
p(`═══════════════════════════════════════════════════════════════════════════`);

fs.writeFileSync(`${HERE}/arena.log`, out.join("\n") + "\n");
p(`\n[wrote ${HERE}/arena.log]`);

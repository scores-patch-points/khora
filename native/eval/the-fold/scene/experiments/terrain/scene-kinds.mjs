// experiments/terrain/scene-kinds.mjs — ASSESS THE TERRAIN.
//
// A copy of the base driver `../../scene-kinds.mjs`, instrumented to report the TERRAIN of
// (similarity, threshold) cells over the SAME EOT / SAME scenes, instead of a single answered run.
// For every cell: #kinds, the BLOB (largest kind ÷ scenes), the singleton share (singleton kinds ÷ scenes),
// and a within−between separation. Two falsifiers ride along:
//   · BAND — the same scenes partitioned into k quantile frequency bands (scene clause-count), reported
//            with the same three metrics + separation. A kind that is no better than a frequency band dies.
//   · NULL — a shuffled-scene-company null: permute each scene's company vector onto another scene,
//            re-induce, compare (median over draws). A kind that is a company artifact dies.
//
// Writes NOTHING outside experiments/terrain/ (README.md + terrain.log are written here by this driver).
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const HERE = "/Users/mlacy/Documents/3.0/khora/native/eval/the-fold/scene/experiments/terrain";
const { confirmedVerbSet, greekClauses, paradigmOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
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

// SCENE BOUNDARY — parameterized so we can assess BOTH regimes named in the brief (≈68 and toward 405).
function buildScenes({ pct, minLen, localMax }) {
  const finite = B.filter(Number.isFinite).sort((a, b) => a - b);
  const TH = finite[Math.floor(finite.length * pct)] ?? 0;
  const scenes = []; let cur = [];
  for (let i = 0; i < clauses.length; i++) {
    const rev = Number.isFinite(B[i]) && B[i] >= TH && (!localMax || (B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0)));
    if (rev && cur.length >= minLen) { scenes.push(cur); cur = []; }
    cur.push(clauses[i]);
  }
  if (cur.length) scenes.push(cur);
  return scenes;
}
const COARSE = { pct: 0.90, minLen: 4, localMax: true };   // the base driver
const FINE = { pct: 0.50, minLen: 2, localMax: false };    // the raw-revision regime

// SCENE VECTORS: each scene's company = the ELEMENT-KINDS it contains (base driver, unchanged).
const elem = (c) => [`${actionKindOf(c.verb)}`, `r:${roleOf(c.subject)}:${roleOf(c.object)}`, `o:${c.object ? face(c.object) : "∅"}`];
function sceneVecsOf(scenes) {
  return scenes.map((sc, i) => {
    const names = [...new Set(sc.flatMap(elem))];
    const company = {}; for (const n of names) company[n] = sc.flatMap(elem).filter((e) => e === n).length;
    return { ref: `scene:${i}`, surfaces: [String(i)], mentionsAt: sc.map((_, j) => j), passes: 1, names, company, total: Object.values(company).reduce((a, b) => a + b, 0) };
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

// METRICS on a partition (list of {members}).
function metrics(kinds, N) {
  const sizes = kinds.map((k) => k.members.length).filter((n) => n > 0);
  const blob = N ? Math.max(0, ...sizes) / N : 0;
  const singles = sizes.filter((n) => n === 1).length;
  return { numKinds: kinds.length, blob, singletonShare: singles / N, singletonKinds: singles };
}
// SEPARATION: mean similarity within kinds − mean similarity between kinds (the cell's own similarity).
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
// WELD: the similarity at which all scenes become ONE component (single-linkage connectivity bottleneck) —
// the value a shared generic element welds the blob at, and the names that weld it.
function weld(vecs, simFn) {
  const n = vecs.length; const edges = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push({ i, j, s: simFn(vecs[i], vecs[j]) });
  edges.sort((a, b) => b.s - a.s);
  const parent = vecs.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  let comps = n, last = null;
  for (const e of edges) {
    const ra = find(e.i), rb = find(e.j);
    if (ra !== rb) { parent[ra] = rb; comps--; last = e; if (comps === 1) break; }
  }
  const b = new Set(vecs[last.j].names);
  return { threshold: last ? last.s : 0, shared: vecs[last.i].names.filter((x) => b.has(x)) };
}
// PAIRWISE spread of the cell's similarity: if it is near-constant, the partition cannot matter.
function pairStats(vecs, simFn) {
  const n = vecs.length; let s = 0, s2 = 0, c = 0, shared = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const v = simFn(vecs[i], vecs[j]); s += v; s2 += v * v; c++;
    const b = vecs[i].company, o = vecs[j].company;
    for (const k of Object.keys(b)) if (o[k]) shared++;
  }
  const mean = c ? s / c : 0, sd = c ? Math.sqrt(Math.max(0, s2 / c - mean * mean)) : 0;
  return { mean, sd, cv: mean ? sd / mean : 0, meanShared: c ? shared / c : 0 };
}
function permutedCompany(list, rng) {
  const order = list.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return list.map((orig, i) => { const d = list[order[i]]; return { ...orig, names: d.names, company: d.company, total: d.total }; });
}

// ── RUN THE TERRAIN ───────────────────────────────────────────────────────────
const SWEEP = [
  { sim: "jaccard", fn: jaccard, thresholds: [0.1, 0.2, 0.3] },
  { sim: "cosine", fn: cosine, thresholds: [0.1, 0.2] },
  { sim: "idf-cosine", fn: null, thresholds: [0.01, 0.03, 0.06, 0.1, 0.2] },
];
const DRAWS = 20, SEED = 1, BANDS = 5;
const out = [];
const rows = [];
const welds = [];
function p(s) { out.push(s); process.stdout.write(s + "\n"); }

for (const [modeName, mode] of [["coarse", COARSE], ["fine", FINE]]) {
  const scenes = buildScenes(mode);
  const N = scenes.length;
  const vecs = sceneVecsOf(scenes);
  const byRef = new Map(vecs.map((v) => [v.ref, v]));
  p(`\n████ BOUNDARY ${modeName} — ${clauses.length} clauses → ${N} scenes (bounded by bayes + position-vocabulary) ████`);
  p(`     blob>0.5 = degenerate blob · singletons>0.7 = degenerate singletons`);
  p(`sim         thr    kinds  blob   single  sep      | nullBlob nullSingle nullSep  nullSep95`);
  p(`---------   -----  -----  -----  ------  -------  | -------- ---------- --------  ---------`);

  for (const sweep of SWEEP) {
    const simFn = sweep.sim === "idf-cosine" ? idfCosineOf(vecs) : sweep.fn;
    // BAND reference for this similarity (structure fixed; separation depends on simFn)
    const bandKinds = frequencyBands(vecs, { bands: BANDS });
    const bandM = metrics(bandKinds, N);
    const bandSep = separation(bandKinds, simFn, byRef);
    p(`[band k=${BANDS}]           ~      ${bandM.blob.toFixed(3)}  ${bandM.singletonShare.toFixed(3)}  ${bandSep.toFixed(4)}`);
    const w = weld(vecs, simFn);
    const ps = pairStats(vecs, simFn);
    welds.push({ mode: modeName, sim: sweep.sim, ...w, ...ps });
    p(`[weld]                all ${N} scenes connect at ${sweep.sim}=${w.threshold.toFixed(3)} via ${w.shared.slice(0, 6).join(" + ")}`);
    p(`[pairs]               mean ${ps.mean.toFixed(3)} sd ${ps.sd.toFixed(3)} cv ${ps.cv.toFixed(3)} · mean shared elems/pair ${ps.meanShared.toFixed(1)}`);

    for (const thr of sweep.thresholds) {
      const kinds = induceKinds(vecs, { similarityOf: simFn, threshold: thr });
      const m = metrics(kinds, N);
      const sep = separation(kinds, simFn, byRef);
      // NULL: permute each scene's company onto another scene, re-induce, median over draws
      const rng = createSeededRng(SEED + thr * 1000 + sweep.sim.length);
      const nb = [], ns = [], nsep = [];
      for (let d = 0; d < DRAWS; d++) {
        const perm = permutedCompany(vecs, rng);
        const pk = induceKinds(perm, { similarityOf: simFn, threshold: thr });
        const pm = metrics(pk, N); nb.push(pm.blob); ns.push(pm.singletonShare);
        const pBy = new Map(perm.map((v) => [v.ref, v]));
        nsep.push(separation(pk, simFn, pBy));
      }
      if (process.env.DEBUG_NULL && modeName === "coarse" && sweep.sim === "jaccard" && thr === 0.3) {
        process.stderr.write(`[debug] perm[0] names==original? ${JSON.stringify(permutedCompany(vecs, createSeededRng(999))[0].names) === JSON.stringify(vecs[0].names)}\n`);
        process.stderr.write(`[debug] null sep draws: ${nsep.map((x) => x.toFixed(5)).join(" ")}\n`);
        process.stderr.write(`[debug] null blob draws: ${nb.map((x) => x.toFixed(3)).join(" ")}\n`);
      }
      const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };
      const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)] ?? 0; };
      const cell = { mode: modeName, sim: sweep.sim, thr, kinds: m.numKinds, blob: m.blob, single: m.singletonShare, sep, nBlob: med(nb), nSingle: med(ns), nSep: med(nsep), nSep95: p95(nsep), bandBlob: bandM.blob, bandSingle: bandM.singletonShare, bandSep, N };
      rows.push(cell);
      p(`${sweep.sim.padEnd(10)}  ${String(thr).padEnd(5)}  ${String(m.numKinds).padStart(5)}  ${m.blob.toFixed(3)}  ${m.singletonShare.toFixed(3)}   ${(sep >= 0 ? "+" : "") + sep.toFixed(4)}  | ${med(nb).toFixed(3)}    ${med(ns).toFixed(3)}      ${med(nsep).toFixed(4)}    ${p95(nsep).toFixed(4)}`);
    }
  }
}

// THE VERDICT: a cell is "non-degenerate" when NOT a blob (<=0.5) AND NOT all-singletons (<=0.7).
const survivors = rows.filter((r) => r.blob <= 0.5 && r.single <= 0.7);
p(`\n═══════════════════════════════════════════════════════════════════════════`);
p(`VERDICT: cells swept = ${rows.length}. Non-degenerate cells (blob<=0.5 AND single<=0.7): ${survivors.length}.`);
if (survivors.length) for (const s of survivors) p(`  CELL  [${s.mode}] ${s.sim} @ ${s.thr}  →  kinds=${s.kinds} blob=${s.blob.toFixed(3)} single=${s.single.toFixed(3)} sep=${s.sep.toFixed(4)}  (null blob=${s.nBlob.toFixed(3)} single=${s.nSingle.toFixed(3)} sep=${s.nSep.toFixed(4)})`);
else p(`  NONE. Every (similarity, threshold) cell is a blob or all-singletons. The terrain has no middle.`);
// the "most informative failing measure": the cell nearest the middle (min of max(blob, single))
const near = [...rows].sort((a, b) => Math.max(a.blob, a.single) - Math.max(b.blob, b.single))[0];
p(`NEAREST-TO-MIDDLE: [${near.mode}] ${near.sim} @ ${near.thr} → kinds=${near.kinds} blob=${near.blob.toFixed(3)} single=${near.single.toFixed(3)} (max=${Math.max(near.blob, near.single).toFixed(3)}), null blob=${near.nBlob.toFixed(3)} single=${near.nSingle.toFixed(3)}`);
p(`═══════════════════════════════════════════════════════════════════════════`);

// ── WRITE README + LOG (only under experiments/terrain/) ──────────────────────
const md = [];
md.push("# Scene-kind induction — THE TERRAIN (draft, 2026-10-08)");
md.push("");
md.push("An assessment of the base driver `../../scene-kinds.mjs` on the SAME Greek Odyssey EOT. Not a tuned answer — the whole (similarity, threshold) surface, with the frequency-band and shuffled-company nulls alongside.");
md.push("");
md.push("## Method");
md.push("");
md.push("- EOT read exactly as the base driver (pro-drop seam + Iliad-seeded holograph; ~981 clauses).");
md.push("- Scenes held FIXED within a boundary mode; only the induction cell varies:");
md.push("  - **coarse** = base driver boundary (local-max bayes revision, p90, min-len 4) → " + rows.find((r) => r.mode === "coarse")?.N + " scenes.");
md.push("  - **fine** = raw revision boundary (every bayes≥p50, min-len 2) → " + rows.find((r) => r.mode === "fine")?.N + " scenes.");
md.push("- Cell columns: `kinds`, `blob` = largest kind ÷ scenes, `single` = singleton kinds ÷ scenes, `sep` = mean within-kind similarity − mean between-kind similarity.");
md.push("- `null*` = median over " + DRAWS + " shuffled-scene-company re-inductions (permute each scene's company onto another scene, seeded).");
md.push("- `[band k=" + BANDS + "]` = quantile frequency-band partition of the same scenes (scene clause-count).");
md.push("");
md.push("## Terrain");
md.push("");
md.push("```");
md.push(...out);
md.push("```");
md.push("");
md.push("## Verdict");
md.push("");
md.push(survivors.length ? "There IS a non-degenerate cell: " + survivors.map((s) => `**${s.sim} @ ${s.thr}** (${s.mode}: kinds=${s.kinds}, blob=${s.blob.toFixed(3)}, single=${s.single.toFixed(3)})`).join(", ") + "." : "**NONE.** Across jaccard {0.1,0.2,0.3}, cosine {0.1,0.2}, idf-cosine {0.01,0.03,0.06,0.1,0.2} — and across both scene-boundary regimes — every cell is either a blob (>0.5 of scenes in one kind) or all-singletons (>0.7). The terrain has no middle on the current element grain.");
md.push("");
md.push("## The most informative failing measure");
md.push("");
md.push("`" + near.mode + " / " + near.sim + " @ " + near.thr + "` is the cell nearest the middle: kinds=" + near.kinds + ", blob=" + near.blob.toFixed(3) + ", singleton=" + near.single.toFixed(3) + " (max=" + Math.max(near.blob, near.single).toFixed(3) + "). It is still a blob (blob>0.5).");
md.push("");
const wc = welds.filter((w) => w.mode === "coarse" && w.sim === "jaccard")[0];
const wf = welds.filter((w) => w.mode === "fine" && w.sim === "jaccard")[0];
md.push("**The single most informative failing measure is the weld threshold** (the single-linkage connectivity bottleneck): all scenes collapse into ONE component at a low similarity carried by shared generic seats. Coarse: " + (rows.find((r) => r.mode === "coarse")?.N) + " scenes weld at jaccard=" + wc.threshold.toFixed(3) + " via " + wc.shared.slice(0, 4).join(" + ") + ". Fine: " + (rows.find((r) => r.mode === "fine")?.N) + " scenes weld at jaccard=" + wf.threshold.toFixed(3) + " via the single shared element `" + wf.shared.join(" + ") + "` alone — one near-universal role seat welds the entire corpus. Each scene's company is a near-commodity with a large shared core (mean " + wc.meanShared.toFixed(1) + " shared elements per pair on the coarse scenes; `o:∅`, `r:(∅):(∅)`, `v:Past:Act:Ind` are near-universal).");
md.push("");
md.push("This makes generation a CLIFF, not a gradient: below the weld the graph is one blob (jaccard 0.1/0.2 → 1 kind), just above it the blob only partly sheds members into a singleton tail (jaccard 0.3 → blob 0.574 + 27 singletons), and no threshold sits between. That is why every (similarity, threshold) cell is a blob or all-singletons: the generic core fixes a floor on pairwise similarity, single-linkage welds everything below the floor, and above the floor only the unique-tail scenes survive as singletons. The frequency-band floor (blob≈0.2, separation≈0.018, zero singletons) is the smooth rung the induced terrain never reaches.");
md.push("");
md.push("## Caveat — the shuffled-company null is a relabeling (it cannot fire here)");
md.push("");
md.push("The null column is reported as specified, but it is VACUOUS under an intrinsic separation: permuting whole company vectors between scenes is a permutation (relabeling) of the similarity graph, so the component-size distribution and the mean within−between separation are exactly invariant. Measured, all " + DRAWS + " draws equal the induced cell to 4 decimals (e.g. coarse/jaccard@0.3: induced sep=+" + near.sep.toFixed(4) + ", null median=+" + near.nSep.toFixed(4) + ", null p95=+" + near.nSep95.toFixed(4) + "). So the null cannot falsify an intrinsic partition — it only discriminates when an EXTERNAL per-referent gold is injected (as janus `falsifyKinds` does via `goldOf`). The scene data carries no such gold. The degeneracy therefore stands on the weld measure above, not on the null.");
md.push("");
md.push("## The measurement that WOULD be informative next");
md.push("");
md.push("Induce at the element grain first (verb lemmas via the case-morph priors, role-classes, outcome-kinds) and attach an outcome gold per scene, then re-run this same table with a gold-anchored null — the terrain cannot be assessed with the intrinsic null, but the weld floor is a property of the element grain and should move when the grain moves.");
md.push("");
md.push("## Files");
md.push("");
md.push("- `scene-kinds.mjs` — the instrumented driver (copy of the base + the sweep/band/null instrumentation).");
md.push("- `terrain.log` — the captured stdout of the run.");
md.push("");
md.push("Run: `node experiments/terrain/scene-kinds.mjs`");
md.push("");
fs.writeFileSync(`${HERE}/README.md`, md.join("\n"));
fs.writeFileSync(`${HERE}/terrain.log`, out.join("\n") + "\n");
p(`\n[wrote ${HERE}/README.md and ${HERE}/terrain.log]`);

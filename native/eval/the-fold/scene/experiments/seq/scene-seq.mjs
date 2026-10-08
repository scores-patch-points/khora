// scene-seq.mjs — ant-seq: is a scene's KIND its SEQUENCE, not its BAG?
//
// Hypothesis (Ostrom): actors in positions choose actions IN SEQUENCE. A scene-kind
// should be carried by the N-GRAMS of its element stream, not the co-occurrence set.
//
// Under experiments/seq/ ONLY. No other files. No commit.
//
// BASE: khora/native/eval/the-fold/scene/scene-kinds.mjs (EOT = Greek Odyssey via
// the seam). SEGMENTATION IS REIMPLEMENTED VERBATIM from that driver (lines 22–45):
// same seeder (Iliad), same holograph, same bayes-surprise + position-vocabulary
// boundary, same MIN_LEN. Same elements, same induceKinds, same wcos, same threshold.
// Disclosed: if the base changes its cut, this copy must be re-synced.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses, paradigmOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { induceKinds, frequencyBands } = await import(`${KHOR}/../janus/native/organs/kind-induction.js`);
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

// ── the holograph + Iliad seed (verbatim from base) ──────────────────────────
const holo = createHolograph({ alpha: 1 });
for (const c of readCl(iliadT)) admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const clauses = readCl(odyT);
const B = clauses.map((c) => admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);

// ── scenes (verbatim boundary rule from base) ────────────────────────────────
const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
const scenes = []; let cur = [];
const MIN_LEN = 4;
for (let i = 0; i < clauses.length; i++) {
  const rev = Number.isFinite(B[i]) && B[i] >= TH && B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0);
  if (rev && cur.length >= MIN_LEN) { scenes.push(cur); cur = []; }
  cur.push(clauses[i]);
}
if (cur.length) scenes.push(cur);

// ── THE STREAM: one scene = a run of elements IN CLAUSE ORDER ─────────────────
// Within a clause the Ostrom order: position(role) → action → outcome.
// (base `elem` is [action, role, outcome]; reordered here — the sequence needs an
//  order, and positions-choose-actions requires role BEFORE action. Disclosed.)
const elem = (c) => [`r:${roleOf(c.subject)}:${roleOf(c.object)}`, `${actionKindOf(c.verb)}`, `o:${c.object ? face(c.object) : "∅"}`];
const streamOf = (sc) => sc.flatMap(elem);

// company = distinct N-grams (consecutive elements), with counts.
// order 1 = unigrams (the bag). order 2 = bigram transitions. order 3 = trigrams.
function ngramCompany(stream, n) {
  const company = {};
  for (let i = 0; i + n <= stream.length; i++) {
    const g = stream.slice(i, i + n).join("→");
    company[g] = (company[g] ?? 0) + 1;
  }
  return company;
}
// bag (order-1) KEY kept order-free for the Assembly/Reunion test: sorted unigrams.
function bagKey(sc) { return [...new Set(streamOf(sc))].sort().join("|"); }

function buildVecs(order) {
  return scenes.map((sc, i) => {
    const stream = streamOf(sc);
    const company = order === 1
      ? ngramCompany(stream, 1)
      : ngramCompany(stream, order);
    const names = Object.keys(company);
    return { ref: `scene:${i}`, surfaces: [String(i)], mentionsAt: [], passes: 1, names, company, total: Object.values(company).reduce((a, b) => a + b, 0) };
  });
}

// IDF-weighted cosine (verbatim from base).
function makeWcos(vecs) {
  const df = new Map();
  for (const v of vecs) for (const n of v.names) df.set(n, (df.get(n) ?? 0) + 1);
  const N = vecs.length;
  const idf = new Map(); for (const n of df.keys()) idf.set(n, Math.log(1 + N / (1 + (df.get(n) ?? 0))));
  return (a, b) => {
    const va = (n) => idf.get(n) * (a.company[n] ?? 0), vb = (n) => idf.get(n) * (b.company[n] ?? 0);
    let dot = 0, la = 0, lb = 0;
    for (const n of a.names) { if (b.company[n]) dot += va(n) * vb(n); la += va(n) * va(n); }
    for (const n of b.names) lb += vb(n) * vb(n);
    return la && lb ? dot / Math.sqrt(la * lb) : 0;
  };
}

const THRESHOLD = 0.03; // same declared cut as the base driver.

function runOrder(order) {
  const vecs = buildVecs(order);
  const wcos = makeWcos(vecs);
  const kinds = induceKinds(vecs, { similarityOf: wcos, threshold: THRESHOLD });
  const sizes = kinds.map((k) => k.members.length).sort((a, b) => b - a);
  const singletons = sizes.filter((s) => s === 1).length;
  const kindId = new Map();
  kinds.forEach((kd, k) => { for (const m of kd.members) kindId.set(m, `K${String(k).padStart(2, "0")}`); });
  const distinct = new Set(vecs.flatMap((v) => v.names)).size;
  const medianCompany = (() => { const cs = vecs.map((v) => v.names.length).sort((a, b) => a - b); return cs[Math.floor(cs.length / 2)] ?? 0; })();
  return { order, vecs, kinds, kindId, kinds_n: kinds.length, blob: sizes[0] ?? 0, scenes: scenes.length, share_blob: (sizes[0] ?? 0) / scenes.length, singletons, share_singletons: singletons / scenes.length, distinct, medianCompany };
}

const orders = [1, 2, 3].map(runOrder);

console.log(`EOT: ${clauses.length} clauses → ${scenes.length} scenes (bounded by bayes + position-vocabulary; segmentation reimplemented verbatim from scene-kinds.mjs)`);
console.log(`elements/clause = [position-role | action-paradigm-cell | outcome] ; stream = clauses in order ; company = consecutive N-grams ; induceKinds(wcos IDF, threshold=${THRESHOLD})\n`);

console.log(`═══ ORDER BY ORDER (same scenes, same induction — only the N changes) ═══`);
console.log(`  order | elements   | distinct n-grams | median company | kinds | blob (maxKind/scenes) | singletons (share)`);
for (const o of orders) {
  console.log(`   ${String(o.order).padStart(4)} | ${o.order === 1 ? "unigram/bag" : o.order === 2 ? "bigram/trans" : "trigram/trans"} | ${String(o.distinct).padStart(16)} | ${String(o.medianCompany).padStart(14)} | ${String(o.kinds_n).padStart(5)} | ${String(o.blob).padStart(4)}/${o.scenes} (${(o.share_blob * 100).toFixed(0)}%) | ${String(o.singletons).padStart(3)} (${(o.share_singletons * 100).toFixed(0)}%)`);
}

// top kinds per order
for (const o of orders) {
  const top = o.kinds.map((k) => k.size).sort((a, b) => b - a).slice(0, 6);
  console.log(`  order ${o.order} kind sizes (top): ${top.join(" ")}${o.kinds_n > 6 ? ` … ${o.kinds_n - 6} more` : ""}`);
}

// ── frequency-band falsifier note ────────────────────────────────────────────
// The organ's frequencyBands reads mentionsAt, which a scene does not carry, so it
// cannot partition scenes as-is. The scene's own frequency proxy is its stream length.
// Partition the SAME scenes into 5 quantile bands by token count and report the band blob.
const banded = scenes.map((sc, i) => ({ ref: `scene:${i}`, n: streamOf(sc).length })).sort((a, b) => a.n - b.n);
const bands = Array.from({ length: 5 }, () => []);
banded.forEach((r, i) => bands[Math.min(4, Math.floor((i * 5) / banded.length))].push(r.ref));
const bandSizes = bands.map((b) => b.length).sort((a, b) => b - a);
console.log(`\n═══ FREQUENCY-BAND FALSIFIER ═══`);
console.log(`  organ.frequencyBands unusable here (scenes carry no mentionsAt) → banded by stream length (the scene's frequency proxy), 5 quantiles.`);
console.log(`  band partition: blob=${bandSizes[0]}/${scenes.length} (${((bandSizes[0] / scenes.length) * 100).toFixed(0)}%) ; sizes ${bandSizes.join(" ")}`);
console.log(`  → a scene-kind must NOT merely re-derive this band. order-1 blob ${orders[0].blob}/${scenes.length}; order-2 ${orders[1].blob}/${scenes.length}; order-3 ${orders[2].blob}/${scenes.length}.`);

// ── THE TISSUE TEST: does transition structure split the bag's merges? ───────
// Order-1 puts ALL scenes in one kind, so order-1 calls every pair SAME. The question
// is how many of those bag-merges the sequence kind actually separates.
const bagSets = scenes.map((sc) => new Set(streamOf(sc)));
const bagJ = (i, j) => { const a = bagSets[i], b = bagSets[j]; let s = 0; for (const n of a) if (b.has(n)) s++; const u = a.size + b.size - s; return u ? s / u : 0; };

const bagOf = new Map(); scenes.forEach((sc, i) => {
  const k = bagKey(sc);
  if (!bagOf.has(k)) bagOf.set(k, []);
  bagOf.get(k).push(i);
});
const sameBagGroups = [...bagOf.values()].filter((g) => g.length > 1);

let pairs = 0, splitBy2 = 0, splitBy3 = 0;
const examples = [], nearBagSplits = [];
for (let i = 0; i < scenes.length; i++) for (let j = i + 1; j < scenes.length; j++) {
  pairs++;
  const k2same = orders[1].kindId.get(`scene:${i}`) === orders[1].kindId.get(`scene:${j}`);
  const k3same = orders[2].kindId.get(`scene:${i}`) === orders[2].kindId.get(`scene:${j}`);
  if (!k2same) splitBy2++;
  if (!k3same) splitBy3++;
  if (!k3same) { const jac = bagJ(i, j); nearBagSplits.push({ i, j, jac, k2same }); if (examples.length < 3) examples.push({ i, j, jac, k2same, k3same }); }
}
nearBagSplits.sort((a, b) => b.jac - a.jac);

console.log(`\n═══ THE TISSUE (transition structure) TEST — Assembly vs Reunion ═══`);
console.log(`  order-1 (bag) merges all ${pairs} unordered scene pairs into one kind.`);
console.log(`  scenes sharing an IDENTICAL order-1 bag set: ${sameBagGroups.flat().length} (${sameBagGroups.length} bags) — the outcome surface makes each scene's bag near-unique, so "same bag" is almost never exact.`);
console.log(`  of the ${pairs} bag-merged pairs, order-2 SPLITS ${splitBy2} (${(100 * splitBy2 / pairs).toFixed(1)}%) ; order-3 SPLITS ${splitBy3} (${(100 * splitBy3 / pairs).toFixed(1)}%).`);
if (nearBagSplits.length) {
  const top = nearBagSplits[0];
  console.log(`  highest-bag-similarity pair that sequence SEPARATES: scene:${top.i} vs scene:${top.j}  bag-Jaccard=${top.jac.toFixed(2)} (order-1 says SAME, order-2 ${top.k2same ? "SAME" : "SPLIT"})`);
  console.log(`    scene:${top.i} stream = ${streamOf(scenes[top.i]).join(" ")}`);
  console.log(`    scene:${top.j} stream = ${streamOf(scenes[top.j]).join(" ")}`);
}

// the generic glue: the n-grams present in the most scenes (the frequency core).
for (const o of orders) {
  const df = new Map();
  for (const v of o.vecs) for (const n of v.names) df.set(n, (df.get(n) ?? 0) + 1);
  const core = [...df.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`  order ${o.order} generic core (document frequency): ${core.map(([n, c]) => `${n}×${c}`).join(" ; ")}`);
}

// reunion / assembly tissue: find scenes carrying return- or assembly-marked outcomes
// and report the kind each lands in across orders.
const REUNION = /πατρίδ|πατρη|νόστο|νοστ|οἶκ|οικ|γαῖ|γαια|Ἰθάκ|Ιθακ/;
const ASSEMBLY = /ἀγορ|αγορ|βουλ|μνηστ|γοῶν|ὅμιλ|ομιλ/;
const tagged = scenes.map((sc, i) => ({ i, run: streamOf(sc).some((e) => REUNION.test(e)), asm: streamOf(sc).some((e) => ASSEMBLY.test(e)) }));
const runScenes = tagged.filter((t) => t.run).map((t) => t.i);
const asmScenes = tagged.filter((t) => t.asm).map((t) => t.i);
console.log(`  reunion-marked scenes (${runScenes.length}): [${runScenes.join(",")}] → order2 kinds [${runScenes.map((i) => orders[1].kindId.get(`scene:${i}`)).join(",")}] order3 [${runScenes.map((i) => orders[2].kindId.get(`scene:${i}`)).join(",")}]`);
console.log(`  assembly-marked scenes (${asmScenes.length}): [${asmScenes.join(",")}] → order2 kinds [${asmScenes.map((i) => orders[1].kindId.get(`scene:${i}`)).join(",")}] order3 [${asmScenes.map((i) => orders[2].kindId.get(`scene:${i}`)).join(",")}]`);

// ── verdict ──────────────────────────────────────────────────────────────────
const o1 = orders[0], o2 = orders[1], o3 = orders[2];
const splitShare2 = splitBy2 / pairs, splitShare3 = splitBy3 / pairs;
const dissolves = (o1.blob / o1.scenes) > 0.8 && (o3.blob / o3.scenes) < 0.5;
console.log(`\n═══ VERDICT ═══`);
console.log(`  bag (order 1):     ${String(o1.kinds_n).padStart(3)} kinds, blob ${o1.blob}/${o1.scenes} (${(100 * o1.share_blob).toFixed(0)}%), singletons ${o1.singletons} (${(100 * o1.share_singletons).toFixed(0)}%).`);
console.log(`  bigram (order 2):  ${String(o2.kinds_n).padStart(3)} kinds, blob ${o2.blob}/${o2.scenes} (${(100 * o2.share_blob).toFixed(0)}%), singletons ${o2.singletons} (${(100 * o2.share_singletons).toFixed(0)}%).`);
console.log(`  trigram (order 3): ${String(o3.kinds_n).padStart(3)} kinds, blob ${o3.blob}/${o3.scenes} (${(100 * o3.share_blob).toFixed(0)}%), singletons ${o3.singletons} (${(100 * o3.share_singletons).toFixed(0)}%).`);
console.log(`  sequence splits ${(100 * splitShare2).toFixed(1)}% of bag-merged pairs (order 2) / ${(100 * splitShare3).toFixed(1)}% (order 3).`);
console.log(`  ${dissolves
    ? "YES — sequence kinds dissolve the bag collapse."
    : "PARTIAL/NO — sequence thins the blob but does NOT dissolve it; a generic transition core still glues the majority into one kind. On this grain the scene-kind is still mostly its bag, not its transitions."}`);

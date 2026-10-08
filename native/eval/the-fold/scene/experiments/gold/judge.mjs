// judge.mjs — ant-gold's JUDGE. Compares hand-labelled gold (GoldScenes@1) against
// the scene-kinds induced by (a) the base driver and (b) the ant-seq experiment.
// The gold is READ here only. It never enters any inducer.
//
// Segmentation + element vectors + induction are reimplemented VERBATIM from
// ../../scene-kinds.mjs (base) and ../seq/scene-seq.mjs (other ant), so scene:i
// indices align with both. Disclosed: if a driver changes its cut, re-sync here.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses, paradigmOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { induceKinds } = await import(`${KHOR}/../janus/native/organs/kind-induction.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));
const gold = JSON.parse(fs.readFileSync(new URL("./gold.json", import.meta.url), "utf8"));

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

const elemBase = (c) => [`${actionKindOf(c.verb)}`, `r:${roleOf(c.subject)}:${roleOf(c.object)}`, `o:${c.object ? face(c.object) : "∅"}`];
const elemSeq = (c) => [`r:${roleOf(c.subject)}:${roleOf(c.object)}`, `${actionKindOf(c.verb)}`, `o:${c.object ? face(c.object) : "∅"}`];
function vecsOf(elem, order) {
  return scenes.map((sc, i) => {
    const stream = sc.flatMap(elem);
    const company = {};
    if (order === 1) for (const n of stream) company[n] = (company[n] ?? 0) + 1;
    else for (let k = 0; k + order <= stream.length; k++) { const g = stream.slice(k, k + order).join("→"); company[g] = (company[g] ?? 0) + 1; }
    const names = Object.keys(company);
    return { ref: `scene:${i}`, surfaces: [String(i)], mentionsAt: [], passes: 1, names, company, total: Object.values(company).reduce((a, b) => a + b, 0) };
  });
}
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
function kindIdOf(vecs, threshold = 0.03) {
  const kinds = induceKinds(vecs, { similarityOf: makeWcos(vecs), threshold });
  const map = new Map(); let k = 0;
  for (const kd of kinds) { for (const m of kd.members) map.set(m, `K${String(k).padStart(2, "0")}`); k++; }
  return { map, nkinds: kinds.length, sizes: kinds.map((k) => k.size).sort((a, b) => b - a) };
}

// ── metrics ──────────────────────────────────────────────────────────────────
const labelsOf = (m, refs) => refs.map((r) => m.get(r) ?? "∅");
function counts(pairs) { const m = new Map(); for (const [x, y] of pairs) m.set(`${x}\u0000${y}`, (m.get(`${x}\u0000${y}`) ?? 0) + 1); return m; }
function margin(pairs, i) { const counts = {}; for (const p of pairs) counts[p[i]] = (counts[p[i]] ?? 0) + 1; return counts; }
function H(counts, n) { let h = 0; for (const c of Object.values(counts)) { const p = c / n; if (p > 0) h -= p * Math.log2(p); } return h; }
function NMI(s, t) {
  const n = s.length; if (!n) return 0;
  const pairs = s.map((x, i) => [x, t[i]]);
  const cxy = counts(pairs), cx = margin(pairs, 0), cy = margin(pairs, 1);
  const Hx = H(cx, n), Hy = H(cy, n);
  if (Hx === 0 && Hy === 0) return 1; if (Hx === 0 || Hy === 0) return 0;
  let I = 0;
  for (const [key, c] of cxy) { const [x, y] = key.split("\u0000"); const p = c / n; I += p * Math.log2((c * n) / (cx[x] * cy[y])); }
  return (2 * I) / (Hx + Hy);
}

// ── run ──────────────────────────────────────────────────────────────────────
const base = kindIdOf(vecsOf(elemBase, 1));
const seq = { 1: kindIdOf(vecsOf(elemSeq, 1)), 2: kindIdOf(vecsOf(elemSeq, 2)), 3: kindIdOf(vecsOf(elemSeq, 3)) };

const goldScenes = Object.keys(gold.scenes).map((i) => Number(i)).sort((a, b) => a - b);
const refs = goldScenes.map((i) => `scene:${i}`);
const yGold = labelsOf(new Map(goldScenes.map((i) => [`scene:${i}`, gold.scenes[String(i)]])), refs);

function judge(name, kd) {
  const yInd = labelsOf(kd.map, refs);
  const nmi = NMI(yGold, yInd);
  // per-type purity: for each gold type, the fraction of its scenes in the modal induced kind
  const byType = new Map();
  goldScenes.forEach((gi, idx) => { const t = gold.scenes[String(gi)]; if (!byType.has(t)) byType.set(t, []); byType.get(t).push(idx); });
  let wp = 0, wn = 0; const perType = [];
  for (const [t, idxs] of [...byType.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const c = {}; for (const idx of idxs) c[yInd[idx]] = (c[yInd[idx]] ?? 0) + 1;
    const [mk, mc] = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    const pur = mc / idxs.length; wp += pur * idxs.length; wn += idxs.length;
    perType.push({ t, n: idxs.length, purity: pur, kind: mk, spread: Object.keys(c).length });
  }
  // per-induced-kind gold homogeneity
  const byKind = new Map();
  yInd.forEach((k, idx) => { if (!byKind.has(k)) byKind.set(k, []); byKind.get(k).push(idx); });
  const kindRows = [...byKind.entries()].map(([k, idxs]) => { const c = {}; for (const idx of idxs) c[yGold[idx]] = (c[yGold[idx]] ?? 0) + 1; const [mt, mc] = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return { k, n: idxs.length, top: mt, homog: mc / idxs.length }; }).sort((a, b) => b.n - a.n);
  return { name, nkinds_all: kd.nkinds, sizes_all: kd.sizes, nkinds_on30: byKind.size, nmi, meanPurity: wp / wn, perType, kindRows };
}

const runs = [judge("base (scene-kinds.mjs)", base), judge("seq order-1 (bag)", seq[1]), judge("seq order-2 (bigram)", seq[2]), judge("seq order-3 (trigram)", seq[3])];

// ── report ───────────────────────────────────────────────────────────────────
const L = [];
L.push(`GOLD GoldScenes@1 — ${goldScenes.length} scenes hand-labelled (base cuts at ${CHARS} chars: ${scenes.length} scenes total)`);
const tc = {}; for (const i of goldScenes) tc[gold.scenes[String(i)]] = (tc[gold.scenes[String(i)]] ?? 0) + 1;
L.push(`  gold types (n): ${Object.entries(tc).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}:${n}`).join("  ")}`);
L.push(`  gold labels:    ${goldScenes.map((i) => gold.scenes[String(i)]).join(" ")}`);
L.push("");
L.push(`JUDGMENT — NMI(gold, induced) and per-gold-type purity (modal induced kind)`);
L.push(`  run                     | kinds(all) | kinds(on30) | NMI   | meanPurity | block sizes (top)`);
for (const r of runs) L.push(`  ${r.name.padEnd(23)} | ${String(r.nkinds_all).padStart(10)} | ${String(r.nkinds_on30).padStart(11)} | ${r.nmi.toFixed(3)} | ${String((r.meanPurity * 100).toFixed(1) + "%").padStart(10)} | ${r.sizes_all.slice(0, 6).join(" ")}`);
L.push("");
for (const r of runs) {
  L.push(`── ${r.name} ──  NMI ${r.nmi.toFixed(3)}  meanPurity ${(r.meanPurity * 100).toFixed(1)}%`);
  L.push(`   per gold-type:  ${r.perType.map((p) => `${p.t}(${p.n})→${p.kind}/${(p.purity * 100).toFixed(0)}%${p.spread > 1 ? `[${p.spread}k]` : ""}`).join("  ")}`);
  L.push(`   per induced-kind (top):  ${r.kindRows.slice(0, 8).map((k) => `${k.k}×${k.n}→${k.top}/${(k.homog * 100).toFixed(0)}%`).join("  ")}`);
  L.push("");
}
// verdict on separation
const b = runs[0];
L.push(`VERDICT — base induction on the 30 gold scenes: ${b.nkinds_on30} induced kind(s) present; NMI ${b.nmi.toFixed(3)}.`);
L.push(`  ${b.nkinds_on30 <= 1 ? "ALL THIRTY in one kind: separation ~0 (the blob). High per-type purity is vacuous — a single kind is pure by construction." : "Some separation present."}`);
fs.writeFileSync(new URL("./judgment.txt", import.meta.url), L.join("\n"));
console.log(L.join("\n"));

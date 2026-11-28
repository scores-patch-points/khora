// unit-sniffer-eval.mjs — FALSIFY the bare-unit sniffer: does a unit's OWN embedding, against canonical centroids built from other languages, say which
// cell it acts in, in a language family it was never taught? Preregistered in PREREG-UNIT-SNIFFER.md; frozen in FREEZE-UNIT-SNIFFER.md before the one run.
// REUSED SPLIT: the same lemma split, labels, embedder and clause items as ablation-eval.mjs and unit-eval.mjs.
//
//   node unit-sniffer-eval.mjs --selftest     synthetic data only, no model
//   node unit-sniffer-eval.mjs run            the one run (qwen3-embedding:4b, local)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeEmbedder } from "./embed-client.mjs";
import { goldOf, hash32, isTestLemma, stride, balancedAccuracy } from "./ablation-eval.mjs";
import { readTrees, occurrencesOf } from "./unit-eval.mjs";
import { unit, cosine, unitTexts } from "../../../native/adapters/text/ablation-sniffer.mjs";
import { classMeans, poolCanon, claimBounds, unitCanonToPrior } from "../../../native/adapters/text/unit-sniffer.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLD = process.env.EO_LEX ?? "/Users/mlacy/eo-lexical-analysis";
const SMOKE = process.env.ABLATION_SMOKE === "1";
const SEED = 20261123, B_BOOT = SMOKE ? 50 : 2000, B_NULL = SMOKE ? 5 : 200, SUF = SMOKE ? "-smoke" : "";
const MODEL = { model: "qwen3-embedding:4b", prefix: "" };
const CAP = SMOKE ? { perCell: 1, perOp: 1, testWords: 2, clausePerLang: 2, clauseMin: 2 } : { perCell: 2, perOp: 6, testWords: 30, clausePerLang: 15, clauseMin: 8 };
const OPS = ["NUL", "DES", "INS", "SEG", "CON", "SYN", "ALT", "SUP", "REC"];
const SD = 2048; // surface baseline dimension

const mulberry32 = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mean = (xs) => { let s = 0, n = 0; for (const x of xs) if (x != null && !Number.isNaN(x)) { s += x; n++; } return n ? s / n : NaN; };
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

/** the surface baseline: a unit's characters (1 to 4 grams with edge markers) hashed into SD signed buckets, unit length. No meaning, only spelling. */
export function surfaceVec(text) {
  const cps = Array.from(`^${String(text).toLowerCase()}$`), v = new Float32Array(SD);
  const hit = (s) => { const h = hash32(s); v[h % SD] += (h >>> 31) ? -1 : 1; };
  for (let n = 1; n <= 4; n++) for (let i = 0; i + n <= cps.length; i++) hit(`${n}:${cps.slice(i, i + n).join("")}`);
  hit(`len:${Math.min(cps.length - 2, 12)}`);
  return unit(v);
}

// ── data ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function languages() {
  const dir = `${GOLD}/data/crossling`, out = [];
  for (const l of fs.readdirSync(dir).filter((x) => fs.existsSync(`${dir}/${x}/classified.json`)).sort()) {
    const gold = goldOf(l); if (!gold.size) continue;
    const family = String(readJson(`${dir}/${l}/classified.json`).family ?? l);
    const rf = `${dir}/${l}/referent_axis.json`, cell = new Map(); if (fs.existsSync(rf)) for (const r of readJson(rf)) cell.set(String(r.verb).toLowerCase().normalize("NFC"), `${r.operator}|${r.referent}`);
    out.push({ lang: l, family, gold, cell, dir: `${dir}/${l}` });
  }
  return out;
}
/** canonical words of one language (train lemmas only): up to perCell per cell, then topped up to perOp per operator, in hash order; and its test words */
export function wordsOf(L) {
  const train = [], test = [];
  for (const [v, lab] of L.gold) (isTestLemma(`${L.lang}:${v}`) ? test : train).push({ lang: L.lang, lemma: v, op: lab.op, alt: lab.alt, cell: L.cell.get(v) ?? null });
  const byHash = (tag) => (a, b) => hash32(`${tag}\n${L.lang}\n${a.lemma}`) - hash32(`${tag}\n${L.lang}\n${b.lemma}`);
  const canon = new Map();
  const cells = new Map(); for (const w of train.filter((x) => x.cell)) { if (!cells.has(w.cell)) cells.set(w.cell, []); cells.get(w.cell).push(w); }
  for (const ws of cells.values()) for (const w of ws.sort(byHash("w2")).slice(0, CAP.perCell)) canon.set(w.lemma, w);
  for (const op of OPS) { const have = [...canon.values()].filter((w) => w.op === op).length; for (const w of train.filter((x) => x.op === op && !canon.has(x.lemma)).sort(byHash("w2")).slice(0, Math.max(0, CAP.perOp - have))) canon.set(w.lemma, w); }
  return { canon: [...canon.values()], test: test.sort(byHash("t")).slice(0, CAP.testWords) };
}

// ── scoring ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function classify(vec, canon) { let b = null, s = -2, s2 = -2; for (const [cls, c] of Object.entries(canon.classes)) { const v = cosine(vec, c.centroid); if (v > s) { s2 = s; s = v; b = cls; } else if (v > s2) s2 = v; } return { cls: b, margin: s - s2, cos: s }; }
function clusterBootByLanguage(items, fns, seed) {
  const by = new Map(); items.forEach((it, i) => { if (!by.has(it.lang)) by.set(it.lang, []); by.get(it.lang).push(i); }); const keys = [...by.keys()], r = mulberry32(seed), res = fns.map(() => []);
  for (let b = 0; b < B_BOOT; b++) { const idx = []; for (let k = 0; k < keys.length; k++) idx.push(...by.get(keys[Math.floor(r() * keys.length)])); const sub = idx.map((i) => items[i]); fns.forEach(([, f], q) => res[q].push(f(sub))); }
  return fns.map(([name], q) => { const v = res[q].filter((x) => !Number.isNaN(x)).sort((a, b) => a - b); return { name, ci95: [pct(v, 0.025), pct(v, 0.975)] }; });
}
const baOf = (its, arm) => balancedAccuracy(its.map((i) => i.pred[arm]), its.map((i) => i.gold));

/** one head (op or cell) in one exclusion mode (lfo: leave the language's family out; lolo: leave the language out) over one vector space */
function runHead({ langs, wordsBy, vecOf, head, mode, testBy, space }) {
  const groups = langs.map((L) => ({ id: L.lang, means: classMeans(wordsBy.get(L.lang).canon.filter((w) => (head === "op" ? true : w.cell)).map((w) => ({ cls: head === "op" ? w.op : w.cell, vec: vecOf(w, space) }))) }));
  const exKey = (L) => (mode === "lfo" ? L.family : L.lang), canons = new Map(), items = [];
  for (const L of langs) { const key = exKey(L); if (!canons.has(key)) canons.set(key, poolCanon(groups, new Set(langs.filter((x) => exKey(x) === key).map((x) => x.lang)))); }
  for (const L of langs) for (const w of testBy.get(L.lang)) { const gold = head === "op" ? w.op : w.cell; if (!gold) continue; const r = classify(unit(w.vec[space]) ?? w.vec[space], canons.get(exKey(L))); items.push({ lang: L.lang, family: L.family, lemma: w.lemma, gold, alt: w.alt, vec: w.vec[space], pred: { S: r.cls }, margin: r.margin }); }
  return { items, canons, groups };
}

async function run(log) {
  const E = makeEmbedder({ ...MODEL, cacheFile: path.join(HERE, `cache-qwen3${SUF}.jsonl`), batch: 16, log });
  const langs = languages(), wordsBy = new Map(langs.map((L) => [L.lang, wordsOf(L)]));
  const all = []; for (const L of langs) { const w = wordsBy.get(L.lang); all.push(...w.canon, ...w.test); }
  log(`unit-sniffer: ${langs.length} languages, ${langs.map((L) => L.family).filter((f, i, a) => a.indexOf(f) === i).length} families, ${wordsBy.size && [...wordsBy.values()].reduce((s, w) => s + w.canon.length, 0)} canonical words, ${[...wordsBy.values()].reduce((s, w) => s + w.test.length, 0)} test words`);
  const t0 = Date.now(), vs = await E.embed(all.map((w) => w.lemma)); const embedMs = Date.now() - t0;
  all.forEach((w, i) => { w.vec = { sem: vs[i], surf: surfaceVec(w.lemma) }; });
  const vecOf = (w, space) => w.vec[space], testBy = new Map(langs.map((L) => [L.lang, wordsBy.get(L.lang).test]));
  const result = { model: MODEL.model, caps: CAP, languages: langs.length, embedSecondsNewWords: embedMs / 1000, heads: {} };

  for (const head of ["op", "cell"]) {
    const res = {};
    for (const mode of ["lfo", "lolo"]) {
      const sem = runHead({ langs, wordsBy, vecOf, head, mode, testBy, space: "sem" }), srf = runHead({ langs, wordsBy, vecOf, head, mode, testBy, space: "surf" });
      const key = (it) => `${it.lang}|${it.lemma}`, sm = new Map(srf.items.map((i) => [key(i), i.pred.S]));
      const items = sem.items.map((i) => ({ ...i, pred: { S1: i.pred.S, S2: sm.get(key(i)) } })).filter((i) => i.pred.S2 !== undefined);
      const sorted = [...items].sort((a, b) => a.margin - b.margin), third = Math.floor(sorted.length / 3); const lo = new Set(sorted.slice(0, third)), hi = new Set(sorted.slice(2 * third));
      items.forEach((i) => { i.terc = lo.has(i) ? "low" : hi.has(i) ? "high" : "mid"; });
      const gold = items.map((i) => i.gold), classes = new Set(gold).size;
      // shuffled-label null: each language's canonical labels dealt out again, centroids rebuilt, the same test items
      const r = mulberry32(SEED + (head === "op" ? 3 : 4) + (mode === "lfo" ? 0 : 100)), nullBA = [];
      for (let b = 0; b < B_NULL; b++) {
        const groups = langs.map((L) => { const ws = wordsBy.get(L.lang).canon.filter((w) => (head === "op" ? true : w.cell)), labels = ws.map((w) => (head === "op" ? w.op : w.cell)); for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; } return { id: L.lang, means: classMeans(ws.map((w, i) => ({ cls: labels[i], vec: w.vec.sem }))) }; });
        const canons = new Map(); const exKey = (L) => (mode === "lfo" ? L.family : L.lang), byLang = new Map(langs.map((L) => [L.lang, L]));
        const pred = items.map((it) => { const L = byLang.get(it.lang), k = exKey(L); if (!canons.has(k)) canons.set(k, poolCanon(groups, new Set(langs.filter((x) => exKey(x) === k).map((x) => x.lang)))); return classify(unit(it.vec) ?? it.vec, canons.get(k)).cls; });
        nullBA.push(balancedAccuracy(pred, gold));
      }
      nullBA.sort((a, b) => a - b);
      const boot = clusterBootByLanguage(items, [["S1 minus surface baseline (S2)", (s) => baOf(s, "S1") - baOf(s, "S2")], ["top-margin tercile minus bottom", (s) => balancedAccuracy(s.filter((i) => i.terc === "high").map((i) => i.pred.S1), s.filter((i) => i.terc === "high").map((i) => i.gold)) - balancedAccuracy(s.filter((i) => i.terc === "low").map((i) => i.pred.S1), s.filter((i) => i.terc === "low").map((i) => i.gold))], ["S1", (s) => baOf(s, "S1")]], SEED + 7);
      const ba = (arm) => balancedAccuracy(items.map((i) => i.pred[arm]), gold);
      const perFamily = {}; for (const f of new Set(items.map((i) => i.family))) { const s = items.filter((i) => i.family === f); perFamily[f] = { n: s.length, ba: baOf(s, "S1"), plain: mean(s.map((i) => (i.pred.S1 === i.gold ? 1 : 0))) }; }
      res[mode] = { n: items.length, classesPresent: classes, chanceBalancedAccuracy: 1 / classes, balancedAccuracy: { S1: ba("S1"), S2_surface: ba("S2") }, plainAccuracy: { S1: mean(items.map((i) => (i.pred.S1 === i.gold ? 1 : 0))), S2_surface: mean(items.map((i) => (i.pred.S2 === i.gold ? 1 : 0))) }, shuffledLabelNull: { n: B_NULL, mean: mean(nullBA), p975: pct(nullBA, 0.975) }, bootstrapByLanguage: boot, tercileBA: Object.fromEntries(["low", "mid", "high"].map((t) => [t, balancedAccuracy(items.filter((i) => i.terc === t).map((i) => i.pred.S1), items.filter((i) => i.terc === t).map((i) => i.gold))])), H1: ba("S1") > pct(nullBA, 0.975), H2: boot[0].ci95[0] > 0, H3: boot[1].ci95[0] > 0, perFamily, perLanguage: Object.fromEntries(langs.map((L) => { const s = items.filter((i) => i.lang === L.lang); return [L.lang, { n: s.length, plain: mean(s.map((i) => (i.pred.S1 === i.gold ? 1 : 0))) }]; })) };
      if (head === "op" && mode === "lfo") {
        // the multi-label read: every cell whose centroid the word clears its own null bound for, against {operator, alternative}
        const claimsByKey = new Map(); let tp = 0, fp = 0, fn = 0, anyHit = 0, size = 0, empty = 0;
        for (const it of items) { const L = langs.find((x) => x.lang === it.lang), ex = new Set(langs.filter((x) => x.family === L.family).map((x) => x.lang)); if (!claimsByKey.has(L.family)) { const ents = langs.filter((x) => !ex.has(x.lang)).flatMap((x) => wordsBy.get(x.lang).canon.map((w) => ({ cls: w.op, vec: w.vec.sem }))); claimsByKey.set(L.family, { canon: sem.canons.get(L.family), bounds: claimBounds(sem.canons.get(L.family), ents) }); } const { canon, bounds } = claimsByKey.get(L.family), u = unit(it.vec), g = new Set([it.gold, it.alt].filter(Boolean)), p = new Set(Object.keys(canon.classes).filter((c) => bounds[c] != null && cosine(u, canon.classes[c].centroid) >= bounds[c])); size += p.size; if (!p.size) empty++; let hit = false; for (const c of p) { if (g.has(c)) { tp++; hit = true; } else fp++; } for (const c of g) if (!p.has(c)) fn++; if (hit) anyHit++; }
        const P = tp + fp ? tp / (tp + fp) : 0, R = tp + fn ? tp / (tp + fn) : 0;
        res.multiLabelLFO = { meanCellsClaimed: size / items.length, unitsWithNoClaim: empty / items.length, anyHit: anyHit / items.length, precision: P, recall: R, f1: P + R ? (2 * P * R) / (P + R) : 0 };
      }
      if (head === "op" && mode === "lfo") res.staged = sem;
    }
    result.heads[head] = res;
  }

  // clause level (reused items, cached embeddings): the bare clause's embedding against the same canon, operator head
  const occ = []; for (const L of langs) { const trees = fs.readdirSync(L.dir).filter((f) => f.endsWith(".conllu")); const use = trees.filter((f) => f !== "combined.conllu"), files = (use.length ? use : trees).sort(), t = files.flatMap((f) => readTrees(`${L.dir}/${f}`)); const o = stride(occurrencesOf(t, L.gold, L.lang, (lem) => isTestLemma(`${L.lang}:${lem}`)), CAP.clausePerLang); if (o.length >= CAP.clauseMin) occ.push(...o.map((x) => ({ ...x, family: L.family }))); }
  const cv = await E.embed(occ.map((o) => unitTexts(o.forms, o.units[2]).unitText));
  const clause = {}; for (const mode of ["lfo", "lolo"]) {
    const groups = langs.map((L) => ({ id: L.lang, means: classMeans(wordsBy.get(L.lang).canon.map((w) => ({ cls: w.op, vec: w.vec.sem }))) })), exKey = (L) => (mode === "lfo" ? L.family : L.lang), canons = new Map(), items = [];
    occ.forEach((o, k) => { const L = langs.find((x) => x.lang === o.lang), key = exKey(L); if (!canons.has(key)) canons.set(key, poolCanon(groups, new Set(langs.filter((x) => exKey(x) === key).map((x) => x.lang)))); const u = unit(cv[k]); if (u) items.push({ lang: o.lang, gold: o.op, pred: { S1: classify(u, canons.get(key)).cls } }); });
    clause[mode] = { n: items.length, classesPresent: new Set(items.map((i) => i.gold)).size, balancedAccuracy: balancedAccuracy(items.map((i) => i.pred.S1), items.map((i) => i.gold)), plain: mean(items.map((i) => (i.pred.S1 === i.gold ? 1 : 0))) };
  }
  result.clauseLevel = clause;

  const op = result.heads.op.lfo, verdict = op.H1 && op.H2 ? (op.H3 ? "SUPPORTED" : "PROPOSER-ONLY") : "FALSIFIED";
  result.verdict = verdict; result.failed = [!op.H1 && "H1", !op.H2 && "H2", !op.H3 && "H3"].filter(Boolean);
  // staged priors: the canon over every language, both heads, marked not wired
  fs.mkdirSync(path.join(HERE, `stage${SUF}`), { recursive: true });
  for (const head of ["op", "cell"]) {
    const groups = langs.map((L) => ({ id: L.lang, means: classMeans(wordsBy.get(L.lang).canon.filter((w) => (head === "op" ? true : w.cell)).map((w) => ({ cls: head === "op" ? w.op : w.cell, vec: w.vec.sem }))) })), canon = poolCanon(groups), ents = langs.flatMap((L) => wordsBy.get(L.lang).canon.filter((w) => (head === "op" ? true : w.cell)).map((w) => ({ cls: head === "op" ? w.op : w.cell, vec: w.vec.sem })));
    fs.writeFileSync(path.join(HERE, `stage${SUF}`, `unit-cells-qwen3-embedding_4b-${head}.json`), JSON.stringify(unitCanonToPrior(canon, claimBounds(canon, ents), { model: MODEL.model, head, giver: "operator labels and referent axis of eo-lexical-analysis/data/crossling/<language>/{classified,referent_axis}.json (an LLM giver's labels through English glosses, claude-sonnet-4); canonical words are train-split lemmas, equal weight per language", languages: langs.length, wordsPerClass: Object.fromEntries(Object.entries(canon.classes).map(([k, v]) => [k, v.n])), falsification: { verdict, failed: result.failed, balancedAccuracyLFO: result.heads[head].lfo.balancedAccuracy.S1, chance: result.heads[head].lfo.chanceBalancedAccuracy }, status: "STAGED, not wired: only SUPPORTED or PROPOSER-ONLY with the owner's word licenses wiring" })));
  }
  delete result.heads.op.staged; delete result.heads.cell.staged; result.modelCalls = E.modelCalls();
  return result;
}

function selftest() {
  let bad = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.error(`FAIL ${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } else console.log(`ok   ${m}`); };
  const a = surfaceVec("walking"), b = surfaceVec("walked"), c = surfaceVec("xqzv");
  eq(cosine(a, b) > cosine(a, c), true, "spelling neighbours are closer than unrelated strings"); eq(Math.abs(cosine(a, a) - 1) < 1e-5, true, "a surface vector is unit length");
  const m1 = classMeans([{ cls: "a", vec: Float32Array.of(1, 0) }, { cls: "a", vec: Float32Array.of(1, 0.2) }, { cls: "b", vec: Float32Array.of(0, 1) }]);
  const pool = poolCanon([{ id: "x", means: m1 }, { id: "y", means: classMeans([{ cls: "a", vec: Float32Array.of(0, 1) }]) }], new Set(["y"]));
  eq(Object.keys(pool.classes).sort(), ["a", "b"], "poolCanon keeps the classes of the languages not excluded"); eq(pool.classes.a.groups, 1, "an excluded language contributes nothing");
  const w = wordsOf({ lang: "t", gold: new Map(Array.from({ length: 40 }, (_, i) => [`v${i}`, { op: OPS[i % 9], alt: null }])), cell: new Map([["v0", "NUL|FIGURE"], ["v9", "NUL|FIGURE"], ["v18", "NUL|FIGURE"]]) });
  eq(w.canon.every((x) => !isTestLemma(`t:${x.lemma}`)) && w.test.every((x) => isTestLemma(`t:${x.lemma}`)), true, "canonical words are train lemmas, test words are test lemmas, never mixed");
  const eqBA = balancedAccuracy(["a", "a", "a"], ["a", "b", "b"]); eq(+eqBA.toFixed(3), 0.5, "balanced accuracy of a constant guess");
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1); } console.log("selftest passed");
}

async function main() {
  const stage = process.argv[2]; if (stage === "--selftest") return selftest();
  if (stage !== "run") { console.error("usage: unit-sniffer-eval.mjs run|--selftest"); process.exit(2); }
  const log = (m) => console.error(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
  const out = await run(log);
  fs.writeFileSync(path.join(HERE, `RESULTS-UNIT-SNIFFER${SUF}.json`), JSON.stringify(out, null, 1));
  if (SMOKE) { console.log("smoke ok: unit sniffer ran end to end; numbers deliberately not printed"); return; }
  console.log(JSON.stringify({ verdict: out.verdict, failed: out.failed, op: { lfo: out.heads.op.lfo, lolo: out.heads.op.lolo } , cellLFO: out.heads.cell.lfo, clause: out.clauseLevel, multiLabelLFO: out.heads.op.multiLabelLFO }, (k, v) => (k === "perLanguage" || k === "perFamily" ? undefined : typeof v === "number" ? +v.toFixed(4) : v), 1));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });

// backoff-test.mjs — does a MEANING back-off for an unseen name head raise how well a unit's name predicts what it does?
// Joint work with the code generation session ("Code generation in mini app"): its H1 (eval/code-roles/PREREG.md) scores a fresh unit by the shrunk dev rate
// of its head word; a head with fewer than 5 dev units (67% of fresh Python units, 45% of fresh JavaScript units) gets almost nothing but the global rate.
// This replaces the PRIOR for such heads (the global rate) by a prior built from what the head's word MEANS, and asks whether the AUC rises.
// Preregistered in PREREG-CODE-NAME-BACKOFF.md; frozen in FREEZE-CODE-NAME-BACKOFF.md before the one run. REUSED SPLIT: the code-roles fresh split is spent.
// Reads eval/code-roles/data read-only; nothing of theirs is imported or changed (their AUC and permutation code is copied here).
//
//   node backoff-test.mjs --selftest   synthetic data only
//   node backoff-test.mjs --gate       reproduce the code-roles baseline AUCs (no embedding, no back-off)
//   node backoff-test.mjs run          the one run (qwen3-embedding:4b for the head words, local)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeEmbedder } from "../ablation-sniffer/embed-client.mjs";
import { unit, cosine, sniffCells } from "../../../native/adapters/text/ablation-sniffer.mjs";
import { loadUnitCanon } from "../../../native/adapters/text/unit-sniffer.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CR = process.env.CODE_ROLES ?? "/Users/mlacy/Downloads/workspace/khora-chat/eval/code-roles";
const LEX = "/Users/mlacy/Downloads/workspace/janus/priors/pos-eng-lexicon.json";
const SEED = 20261124, PERMS = 2000, BOOT = 1000, SHRINK = 5, MIN_POS = 30, MODEL = { model: "qwen3-embedding:4b", prefix: "" };
const LANGS = ["python", "javascript"], TARGETS = ["writes", "returnsBool"];
const writes = (r) => !!(r.effects.writesParam || r.effects.writesSelf || r.effects.writesOuter), isBool = (r) => !!r.effects.returnsBool, TARGET = { writes, returnsBool: isBool };
const mulberry32 = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

// ── AUC, average ranks for ties (the same definition as eval/code-roles/run.mjs, written here) ──────────────────────────
export function ranksOf(scores) {
  const idx = scores.map((_, i) => i).sort((a, b) => scores[a] - scores[b]), r = new Array(scores.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && scores[idx[j + 1]] === scores[idx[i]]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k]] = avg; i = j + 1; }
  return r;
}
export function aucOf(scores, labels) { const r = ranksOf(scores); let sp = 0, np = 0; for (let i = 0; i < labels.length; i++) if (labels[i]) { sp += r[i]; np++; } const nn = labels.length - np; return np && nn ? (sp - np * (np + 1) / 2) / (np * nn) : NaN; }

// ── the dev table and the baseline score of code-roles H1 ───────────────────────────────────────────────────────────────
export function devTable(rows, target) { const t = new Map(); let k = 0; for (const r of rows) { if (!r.words.length) continue; const h = r.words[0], e = t.get(h) ?? { n: 0, k: 0 }; e.n++; if (target(r)) { e.k++; k++; } t.set(h, e); } return { t, p0: rows.length ? k / rows.filter((r) => r.words.length).length : 0 }; }
export const baseScore = (tb, h) => { const e = tb.t.get(h); return e ? (e.k + SHRINK * tb.p0) / (e.n + SHRINK) : tb.p0; };
/** a head's score when its PRIOR q (instead of the global rate) is shrunk toward by its own dev counts: the same formula with q for p0 */
export const priorScore = (tb, h, q) => { const e = tb.t.get(h) ?? { n: 0, k: 0 }; return (e.k + SHRINK * q) / (e.n + SHRINK); };

/** class back-off (the operator sniff, or the verb flag): the prior of head h is the dev rate of the OTHER anchor heads in its class, shrunk toward p0 */
export function classPriors(tb, anchors, classOf, heads) {
  const sums = new Map(); for (const a of anchors) { const c = classOf.get(a), e = tb.t.get(a); const s = sums.get(c) ?? { n: 0, k: 0 }; s.n += e.n; s.k += e.k; sums.set(c, s); }
  const out = new Map();
  for (const h of heads) { const c = classOf.get(h), s = sums.get(c) ?? { n: 0, k: 0 }, own = tb.t.get(h) ?? { n: 0, k: 0 }, n = s.n - own.n, k = s.k - own.k; out.set(h, n > 0 ? (k + SHRINK * tb.p0) / (n + SHRINK) : tb.p0); }
  return out;
}
/** neighbour back-off: the prior of head h is the rate of the anchors weighted by max(0, z-score of cosine) times n/(n+5); W is rows = heads, columns = anchors */
export function neighbourWeights(vecOf, anchors, heads) {
  const W = heads.map((h) => { const sims = anchors.map((a) => (a === h ? NaN : cosine(vecOf.get(h), vecOf.get(a)))), ok = sims.filter((s) => !Number.isNaN(s)), m = mean(ok), sd = Math.sqrt(mean(ok.map((s) => (s - m) ** 2))) || 1; return Float32Array.from(sims, (s, i) => (Number.isNaN(s) ? 0 : Math.max(0, (s - m) / sd))); });
  return W;
}
export function neighbourPriors(tb, anchors, W, heads) {
  const rate = anchors.map((a) => { const e = tb.t.get(a); return (e.k + SHRINK * tb.p0) / (e.n + SHRINK); }), rel = anchors.map((a) => { const n = tb.t.get(a).n; return n / (n + SHRINK); });
  const out = new Map(); heads.forEach((h, u) => { let num = 0, den = 0; const w = W[u]; for (let j = 0; j < anchors.length; j++) { const x = w[j] * rel[j]; num += x * rate[j]; den += x; } out.set(h, den > 0 ? num / den : tb.p0); });
  return out;
}

// ── the analysis for one language and target ────────────────────────────────────────────────────────────────────────────
function analyse({ lang, tname, dev, fresh, vecOf, opOf, verbOf, rand }) {
  const target = TARGET[tname], tr = dev.filter((r) => r.lang === lang && r.words.length), te = fresh.filter((r) => r.lang === lang && r.words.length), tb = devTable(tr, target);
  const y = te.map((r) => (target(r) ? 1 : 0)), heads = te.map((r) => r.words[0]), s0 = heads.map((h) => baseScore(tb, h));
  const covered = (h) => (tb.t.get(h)?.n ?? 0) >= SHRINK, uncIdx = heads.map((h, i) => i).filter((i) => !covered(heads[i])), U = [...new Set(uncIdx.map((i) => heads[i]))], anchors = [...tb.t.keys()];
  const yU = uncIdx.map((i) => y[i]), pos = yU.reduce((a, b) => a + b, 0), neg = yU.length - pos, underpowered = !(pos >= MIN_POS && neg >= MIN_POS);
  const sub = (scoreOfHead) => uncIdx.map((i) => scoreOfHead.get(heads[i])), base = new Map(U.map((h) => [h, baseScore(tb, h)])), aucBaseSub = aucOf(sub(base), yU);
  const toScores = (priors) => new Map(U.map((h) => [h, priorScore(tb, h, priors.get(h))]));
  const allHeads = [...new Set([...anchors, ...U])];
  // arm B1 (operator class from the wired sniffer), B3 (verb or noun flag from the UniMorph lexicon, no embedding), B2 (embedding neighbours)
  const arms = {};
  arms.B1 = { name: "operator class of the head word (the wired sniffer)", scores: toScores(classPriors(tb, anchors, opOf, U)) };
  arms.B3 = { name: "verb-or-noun flag of the head word (UniMorph lexicon, no embedding)", scores: toScores(classPriors(tb, anchors, verbOf, U)) };
  const W = neighbourWeights(vecOf, anchors, U); arms.B2 = { name: "embedding neighbours of the head word", scores: toScores(neighbourPriors(tb, anchors, W, U)) };
  const res = { lang, target: tname, freshUnits: te.length, uncoveredUnits: uncIdx.length, uncoveredHeads: U.length, anchors: anchors.length, positivesUncovered: pos, negativesUncovered: neg, underpowered, aucBaselineAll: aucOf(s0, y), aucBaselineUncovered: aucBaseSub, arms: {} };
  // the nulls: the same arm with its class labels (B1, B3) or its anchors' rates (B2) dealt out at random
  const shuffled = (arrOrMap) => { const keys = [...arrOrMap.keys()], vals = keys.map((k) => arrOrMap.get(k)); for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; } return new Map(keys.map((k, i) => [k, vals[i]])); };
  const rate = anchors.map((a) => { const e = tb.t.get(a); return (e.k + SHRINK * tb.p0) / (e.n + SHRINK); }), rel = anchors.map((a) => { const n = tb.t.get(a).n; return n / (n + SHRINK); });
  const nullGains = { B1: [], B2: [], B3: [] };
  if (!underpowered) for (let p = 0; p < PERMS; p++) {
    const o = shuffled(new Map(allHeads.map((h) => [h, opOf.get(h)]))), v = shuffled(new Map(allHeads.map((h) => [h, verbOf.get(h)])));
    nullGains.B1.push(aucOf(sub(toScores(classPriors(tb, anchors, o, U))), yU) - aucBaseSub); nullGains.B3.push(aucOf(sub(toScores(classPriors(tb, anchors, v, U))), yU) - aucBaseSub);
    const perm = anchors.map((_, i) => i); for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const q = new Map(U.map((h, u) => { let num = 0, den = 0; const w = W[u]; for (let j = 0; j < anchors.length; j++) { const x = w[j] * rel[j]; num += x * rate[perm[j]]; den += x; } return [h, den > 0 ? num / den : tb.p0]; }));
    nullGains.B2.push(aucOf(sub(toScores(q)), yU) - aucBaseSub);
  }
  // bootstrap over files for the gains and for each arm against the verb-or-noun control
  const files = [...new Set(uncIdx.map((i) => te[i].file))], byFile = new Map(files.map((f) => [f, []])); uncIdx.forEach((i, k) => byFile.get(te[i].file).push(k));
  const r = mulberry32(SEED + 17), boots = { B1: [], B2: [], B3: [], B1vsB3: [], B2vsB3: [] };
  if (!underpowered) for (let b = 0; b < BOOT; b++) {
    const ks = []; for (let f = 0; f < files.length; f++) ks.push(...byFile.get(files[Math.floor(r() * files.length)])); const yy = ks.map((k) => yU[k]);
    const a0 = aucOf(ks.map((k) => sub(base)[k]), yy), s1 = sub(arms.B1.scores), s2 = sub(arms.B2.scores), s3 = sub(arms.B3.scores), a1 = aucOf(ks.map((k) => s1[k]), yy), a2 = aucOf(ks.map((k) => s2[k]), yy), a3 = aucOf(ks.map((k) => s3[k]), yy);
    boots.B1.push(a1 - a0); boots.B2.push(a2 - a0); boots.B3.push(a3 - a0); boots.B1vsB3.push(a1 - a3); boots.B2vsB3.push(a2 - a3);
  }
  const ci = (xs) => (xs.length ? [quantile(xs, 0.025), quantile(xs, 0.975)] : [null, null]);
  for (const k of ["B1", "B2", "B3"]) {
    const sU = sub(arms[k].scores), auc = aucOf(sU, yU), gain = auc - aucBaseSub, n = nullGains[k], hi = n.length ? quantile(n, 0.975) : null;
    // the whole fresh set with the back-off scores for uncovered heads and the baseline for covered ones
    const sAll = heads.map((h, i) => (covered(h) ? s0[i] : arms[k].scores.get(h)));
    res.arms[k] = { name: arms[k].name, aucUncovered: auc, gain, gainCI95: ci(boots[k]), nullGainMean: n.length ? mean(n) : null, nullGain975: hi, supported: hi == null ? null : gain > 0 && gain > hi, aucAll: aucOf(sAll, y), distinctPriors: new Set(U.map((h) => arms[k].scores.get(h))).size };
    if (k !== "B3") res.arms[k].vsVerbFlag = { diff: auc - aucOf(sub(arms.B3.scores), yU), ci95: ci(boots[`${k}vsB3`]), beatsFlag: boots[`${k}vsB3`].length ? ci(boots[`${k}vsB3`])[0] > 0 : null };
  }
  return res;
}

// ── data and embeddings ─────────────────────────────────────────────────────────────────────────────────────────────────
const load = (f) => fs.readFileSync(path.join(CR, "data", f), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
function gate() {
  const dev = load("dev.jsonl"), fresh = load("fresh.jsonl"), theirs = JSON.parse(fs.readFileSync(path.join(CR, "RESULTS.json"), "utf8")).h1, out = [];
  for (const lang of LANGS) for (const t of TARGETS) {
    const tr = dev.filter((r) => r.lang === lang && r.words.length), te = fresh.filter((r) => r.lang === lang && r.words.length), tb = devTable(tr, TARGET[t]);
    const mine = aucOf(te.map((r) => baseScore(tb, r.words[0])), te.map((r) => (TARGET[t](r) ? 1 : 0))), want = theirs[lang][t].auc; out.push({ lang, t, mine, want, ok: Math.abs(mine - want) < 1e-9 });
  }
  return out;
}

async function run(log) {
  const g = gate(); if (!g.every((x) => x.ok)) throw new Error(`reproduction gate failed: ${JSON.stringify(g)}; nothing else was run`);
  const dev = load("dev.jsonl"), fresh = load("fresh.jsonl"), lex = JSON.parse(fs.readFileSync(LEX, "utf8")).classes, verbCapable = new Set([...lex.VERB, ...lex["NOUN|VERB"]]);
  const prior = loadUnitCanon(MODEL.model, "op"); if (!prior) throw new Error("the wired unit-cells prior is not in the priors home (typed gap); nothing was run");
  // every head word that any analysis needs a vector for: all dev heads, and the fresh heads the dev table does not cover
  const need = new Set(); const covN = {}; for (const lang of LANGS) { const tr = dev.filter((r) => r.lang === lang && r.words.length), n = new Map(); for (const r of tr) n.set(r.words[0], (n.get(r.words[0]) ?? 0) + 1); covN[lang] = n; for (const h of n.keys()) need.add(h); for (const r of fresh.filter((x) => x.lang === lang && x.words.length)) if ((n.get(r.words[0]) ?? 0) < SHRINK) need.add(r.words[0]); }
  const words = [...need].sort(); log(`backoff: ${words.length} distinct head words to embed`);
  const E = makeEmbedder({ ...MODEL, cacheFile: path.join(HERE, "cache-qwen3-heads.jsonl"), batch: 16, log }), t0 = Date.now(), vs = await E.embed(words), seconds = (Date.now() - t0) / 1000;
  const vecOf = new Map(words.map((w, i) => [w, unit(vs[i]) ?? vs[i]])), opOf = new Map(words.map((w) => [w, sniffCells(vecOf.get(w), prior.canon, prior.bounds).best])), verbOf = new Map(words.map((w) => [w, verbCapable.has(w) ? "verbcapable" : "other"]));
  const rand = mulberry32(SEED), results = [];
  for (const lang of LANGS) for (const t of TARGETS) { results.push(analyse({ lang, tname: t, dev, fresh, vecOf, opOf, verbOf, rand })); log(`backoff: ${lang} ${t} done`); }
  const verdict = {}; for (const arm of ["B1", "B2"]) for (const t of TARGETS) { const rs = results.filter((r) => r.target === t), ok = (r) => r.arms[arm].supported && r.arms[arm].vsVerbFlag.beatsFlag; verdict[`${arm} ${t}`] = rs.some((r) => r.underpowered) ? "undecided (underpowered)" : rs.every(ok) ? "SUPPORTED" : rs.some(ok) ? "PARTIAL (one language)" : "NOT SUPPORTED"; }
  const opMix = {}; for (const w of words) opMix[opOf.get(w)] = (opMix[opOf.get(w)] ?? 0) + 1;
  return { seed: SEED, perms: PERMS, boot: BOOT, shrink: SHRINK, model: MODEL.model, headWordsEmbedded: words.length, embedSeconds: seconds, gate: g, headOperatorMix: opMix, results, verdict, modelCalls: E.modelCalls() };
}

function selftest() {
  let bad = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.error(`FAIL ${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } else console.log(`ok   ${m}`); };
  eq(aucOf([3, 4, 1, 2], [1, 1, 0, 0]), 1, "AUC of a perfect separation is 1"); eq(aucOf([1, 1, 1, 1], [1, 0, 1, 0]), 0.5, "tied scores give 0.5"); eq(ranksOf([5, 1, 5, 3]), [3.5, 1, 3.5, 2], "ties take average ranks");
  const rows = [...Array(6)].map(() => ({ words: ["get"], effects: { returnsBool: false } })).concat([...Array(4)].map(() => ({ words: ["is"], effects: { returnsBool: true } })), [{ words: ["rare"], effects: { returnsBool: true } }]);
  const tb = devTable(rows, isBool); eq(tb.t.get("get"), { n: 6, k: 0 }, "the dev table counts per head"); eq(+tb.p0.toFixed(4), +(5 / 11).toFixed(4), "the global rate");
  eq(baseScore(tb, "unseen"), tb.p0, "an unseen head scores the global rate"); eq(priorScore(tb, "unseen", 0.9), 0.9 * SHRINK / SHRINK, "with no counts a head takes its prior");
  const cls = new Map([["get", "A"], ["is", "B"], ["rare", "B"], ["unseen", "B"]]); const cp = classPriors(tb, ["get", "is", "rare"], cls, ["unseen", "rare"]);
  eq(+cp.get("unseen").toFixed(4), +((5 + SHRINK * tb.p0) / (5 + SHRINK)).toFixed(4), "a class prior is the rate of the class's anchors, shrunk");
  eq(+cp.get("rare").toFixed(4), +((4 + SHRINK * tb.p0) / (4 + SHRINK)).toFixed(4), "a head's own counts are left out of its class prior");
  const vec = new Map([["get", Float32Array.of(1, 0)], ["is", Float32Array.of(0, 1)], ["rare", Float32Array.of(0.1, 1)], ["u", Float32Array.of(0.05, 1)]]), W = neighbourWeights(vec, ["get", "is", "rare"], ["u"]);
  eq(W[0][1] > W[0][0], true, "a head is weighted toward the anchor it is closer to"); const np = neighbourPriors(tb, ["get", "is", "rare"], W, ["u"]); eq(np.get("u") > tb.p0, true, "a head near the boolean heads gets a boolean-leaning prior");
  const g = gate(); eq(g.every((x) => x.ok), true, "the code-roles baseline AUCs are reproduced to 1e-9");
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1); } console.log("selftest passed");
}

async function main() {
  const mode = process.argv[2];
  if (mode === "--selftest") return selftest();
  if (mode === "--gate") { console.log(JSON.stringify(gate(), null, 1)); return; }
  if (mode !== "run") { console.error("usage: backoff-test.mjs --selftest|--gate|run"); process.exit(2); }
  const log = (m) => console.error(`[${new Date().toISOString().slice(11, 19)}] ${m}`), out = await run(log);
  fs.writeFileSync(path.join(HERE, "RESULTS-CODE-NAME-BACKOFF.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.verdict, null, 1));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });

// ablation-eval.mjs — FALSIFY the ablation sniffer: does the negative space of a removed unit, cosined against canonical centroids, say which cell
// the unit acts in? Preregistered in PREREG-ABLATION-SNIFFER.md; frozen in FREEZE-ABLATION-SNIFFER.md before the one run.
//
//   node ablation-eval.mjs --selftest         synthetic data only, no model
//   node ablation-eval.mjs english            stage 1: English, nomic-embed-text, large
//   node ablation-eval.mjs cross              stage 2: other languages, qwen3-embedding:4b, small
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeEmbedder } from "./embed-client.mjs";
import { ablationTexts, negativeSpace, buildCanon, nullBounds, sniffCells, unit, cosine, canonToPrior } from "../../../native/adapters/text/ablation-sniffer.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLD = process.env.EO_LEX ?? "/Users/mlacy/eo-lexical-analysis";
const SMOKE = process.env.ABLATION_SMOKE === "1"; // plumbing check only: tiny caps, separate caches and outputs
const SEED = 20261123, B_BOOT = SMOKE ? 50 : 2000, B_NULL = SMOKE ? 5 : 200, SUF = SMOKE ? "-smoke" : "";
const OPS = ["NUL", "DES", "INS", "SEG", "CON", "SYN", "ALT", "SUP", "REC"]; // the study's operator names (DES = DEF, ALT = SIG, SUP = EVA in the current cube)
const MODELS = { english: { model: "nomic-embed-text:latest", prefix: "classification: " }, cross: { model: "qwen3-embedding:4b", prefix: "" } };
const CAP = SMOKE ? { englishWordsPerOp: 6, englishTrainOccPerOp: 5, englishTest: 20, crossWordsPerOp: 2, crossPerLanguage: 2, crossMinPerLanguage: 2 } : { englishWordsPerOp: 400, englishTrainOccPerOp: 250, englishTest: 1000, crossWordsPerOp: 35, crossPerLanguage: 30, crossMinPerLanguage: 10 };

// ── small tools ─────────────────────────────────────────────────────────────────────────────────────────────────────
const mulberry32 = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const sha = (s) => crypto.createHash("sha256").update(s).digest();
export const hash32 = (s) => sha(s).readUInt32BE(0);
export const isTestLemma = (key) => hash32(`split\n${key}`) % 5 === 0;
export const stride = (arr, cap) => { if (arr.length <= cap) return arr.slice(); const k = arr.length / cap, out = []; for (let i = 0; i < cap; i++) out.push(arr[Math.floor(i * k)]); return out; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
/** balanced accuracy: mean over the gold classes present of the share of their items predicted right (chance = 1 / classes present; a constant guess scores exactly that) */
export function balancedAccuracy(pred, gold) { const hit = new Map(), n = new Map(); gold.forEach((g, i) => { n.set(g, (n.get(g) ?? 0) + 1); if (pred[i] === g) hit.set(g, (hit.get(g) ?? 0) + 1); }); return mean([...n].map(([g, c]) => (hit.get(g) ?? 0) / c)); }
const accuracy = (pred, gold) => mean(gold.map((g, i) => (pred[i] === g ? 1 : 0)));
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const altOf = (a) => (typeof a === "string" && OPS.includes(a) ? a : null);

// ── gold: the study's own labels (an LLM giver applied to VerbNet/WordNet/FrameNet verbs; the label is the giver's, not a fact) ─────────────
export function goldOf(lang) {
  const f = lang === "English" && fs.existsSync(`${GOLD}/data/llm_classifications.json`) ? `${GOLD}/data/llm_classifications.json` : `${GOLD}/data/crossling/${lang}/classified.json`;
  const j = readJson(f), m = new Map();
  for (const c of j.classifications) if (OPS.includes(c.operator)) m.set(String(c.verb).toLowerCase().normalize("NFC"), { op: c.operator, alt: altOf(c.alternative) });
  return m;
}
const referentOf = (lang) => { const f = `${GOLD}/data/crossling/${lang}/referent_axis.json`; return fs.existsSync(f) ? new Map(readJson(f).map((r) => [String(r.verb).toLowerCase().normalize("NFC"), r.referent])) : new Map(); };
export function readConllu(file) {
  const sents = []; let forms = [], lemmas = [], upos = [];
  const flush = () => { if (forms.length) sents.push({ forms, lemmas, upos }); forms = []; lemmas = []; upos = []; };
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line) { flush(); continue; } if (line.charCodeAt(0) === 35) continue;
    const f = line.split("\t"); if (f.length < 4) continue; let ok = f[0].length > 0; for (let k = 0; k < f[0].length; k++) { const c = f[0].charCodeAt(k); if (c < 48 || c > 57) { ok = false; break; } } if (!ok) continue;
    forms.push(f[1]); lemmas.push(String(f[2]).toLowerCase().normalize("NFC")); upos.push(f[3]);
  }
  flush(); return sents;
}
/** every VERB token whose lemma the gold knows: { lang, lemma, forms, i, upos[] } */
export function occurrencesIn(sents, gold, lang, keep) {
  const out = []; for (const s of sents) for (let i = 0; i < s.forms.length; i++) if (s.upos[i] === "VERB" && gold.has(s.lemmas[i]) && keep(s.lemmas[i])) out.push({ lang, lemma: s.lemmas[i], forms: s.forms, upos: s.upos, i, ...gold.get(s.lemmas[i]) });
  return out;
}
/** a control unit: another word of the same sentence, never punctuation, never the unit itself (seeded by the occurrence, so it never changes) */
function controlIndex(o) { const c = []; o.forms.forEach((_, j) => { if (j !== o.i && o.upos[j] !== "PUNCT") c.push(j); }); if (!c.length) return null; return c[Math.floor(mulberry32(hash32(`ctl\n${o.lang}\n${o.lemma}\n${o.forms.join(" ")}`))() * c.length)]; }

// ── statistics: cluster bootstrap over lemmas, paired across arms ────────────────────────────────────────────────────
function clusterBoot(items, arms, fns, seed) {
  // items: [{ key, gold, pred: { arm: cls } }]; fns: [[name, (preds) => number]] computed from per-arm prediction arrays
  const by = new Map(); items.forEach((it, i) => { if (!by.has(it.key)) by.set(it.key, []); by.get(it.key).push(i); }); const keys = [...by.keys()], r = mulberry32(seed), res = fns.map(() => []);
  for (let b = 0; b < B_BOOT; b++) {
    const idx = []; for (let k = 0; k < keys.length; k++) idx.push(...by.get(keys[Math.floor(r() * keys.length)]));
    const gold = idx.map((i) => items[i].gold), preds = {}; for (const a of arms) preds[a] = idx.map((i) => items[i].pred[a]);
    fns.forEach(([, f], q) => res[q].push(f(preds, gold)));
  }
  return fns.map(([name], q) => { const v = res[q].filter((x) => !Number.isNaN(x)).sort((a, b) => a - b); return { name, ci95: [pct(v, 0.025), pct(v, 0.975)] }; });
}
const best = (vec, canon) => { let b = null, s = -2, s2 = -2; for (const [cls, c] of Object.entries(canon.classes)) { const v = cosine(vec, c.centroid); if (v > s) { s2 = s; s = v; b = cls; } else if (v > s2) s2 = v; } return { cls: b, margin: s - s2 }; };

/** the arms of one stage, scored against the same gold; the shuffled-label null; the three falsifiers */
function judge(items, wEntries, wCanon, deltaOf, seed) {
  const gold = items.map((i) => i.gold), arms = Object.keys(items[0].pred), balanced = {}, acc = {};
  for (const a of arms) { const p = items.map((i) => i.pred[a]); balanced[a] = balancedAccuracy(p, gold); acc[a] = accuracy(p, gold); }
  // null: the same centroids built from SHUFFLED labels, the same negative spaces
  const r = mulberry32(seed + 3), nullBA = [];
  for (let b = 0; b < B_NULL; b++) { const labels = wEntries.map((e) => e.cls); for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; } const canon = buildCanon(wEntries.map((e, i) => ({ cls: labels[i], vec: e.vec }))); nullBA.push(balancedAccuracy(items.map((it) => best(deltaOf(it), canon).cls), gold)); }
  nullBA.sort((a, b) => a - b);
  const BA = (arm) => (preds, g) => balancedAccuracy(preds[arm], g);
  const diffs = clusterBoot(items, arms, [["P1 minus control unit (P5)", (p, g) => BA("P1")(p, g) - BA("P5")(p, g)], ["P1 minus bare word (P4)", (p, g) => BA("P1")(p, g) - BA("P4")(p, g)], ["P1", (p, g) => BA("P1")(p, g)]], seed + 5);
  const chance = 1 / new Set(gold).size;
  const H1 = balanced.P1 > pct(nullBA, 0.975), H2 = diffs[0].ci95[0] > 0, H3 = diffs[1].ci95[0] > 0;
  return { n: items.length, classesPresent: new Set(gold).size, chanceBalancedAccuracy: chance, balancedAccuracy: balanced, accuracy: acc, shuffledLabelNull: { n: B_NULL, mean: mean(nullBA), p975: pct(nullBA, 0.975), max: nullBA[nullBA.length - 1] }, bootstrap: diffs, H1_beatsShuffledLabels: H1, H2_unitNotJustSentence: H2, H3_ablationAddsBeyondTheWord: H3, verdict: H1 && H2 && H3 ? "SUPPORTED" : "FALSIFIED", failed: [!H1 && "H1", !H2 && "H2", !H3 && "H3"].filter(Boolean) };
}

// ── stage 1: English ─────────────────────────────────────────────────────────────────────────────────────────────────
async function english(log) {
  const E = makeEmbedder({ ...MODELS.english, cacheFile: path.join(HERE, `cache-nomic${SUF}.jsonl`), log });
  const gold = goldOf("English"), ref = referentOf("English");
  const lemmas = [...gold.keys()].sort((a, b) => hash32(a) - hash32(b)), train = lemmas.filter((l) => !isTestLemma(`eng:${l}`)), trainSet = new Set(train), testSet = new Set(lemmas.filter((l) => isTestLemma(`eng:${l}`)));
  // words for the canonical centroids: per operator, referent-labelled lemmas first, then the rest, capped
  const words = []; for (const op of OPS) { const ls = train.filter((l) => gold.get(l).op === op); const pri = ls.filter((l) => ref.has(l)), rest = ls.filter((l) => !ref.has(l)); words.push(...[...pri, ...rest].slice(0, CAP.englishWordsPerOp).map((l) => ({ lemma: l, cls: op, cell: ref.has(l) ? `${op}|${ref.get(l)}` : null }))); }
  log(`english: ${lemmas.length} gold verbs, ${train.length} train / ${testSet.size} test lemmas, ${words.length} centroid words`);
  const wv = await E.embed(words.map((w) => w.lemma)); const wEntries = words.map((w, i) => ({ cls: w.cls, vec: wv[i], cell: w.cell }));
  const wCanon = buildCanon(wEntries);
  // train occurrences for the delta centroids and the null bounds
  const ewt = (s) => readConllu(`${GOLD}/data/crossling/English/en_ewt-ud-${s}.conllu`);
  const trainOcc = []; { const all = occurrencesIn(ewt("train"), gold, "English", (l) => trainSet.has(l)); for (const op of OPS) trainOcc.push(...stride(all.filter((o) => o.op === op), CAP.englishTrainOccPerOp)); }
  log(`english: ${trainOcc.length} train occurrences`);
  const tt = trainOcc.map((o) => ablationTexts(o.forms, o.i)), tv = await E.embed(tt.flatMap((t) => [t.withText, t.withoutText, t.maskText]));
  trainOcc.forEach((o, k) => { o.drm = negativeSpace(tv[3 * k], tv[3 * k + 1]); o.dmk = negativeSpace(tv[3 * k], tv[3 * k + 2]); });
  const tr = trainOcc.filter((o) => o.drm && o.dmk);
  const dCanon = buildCanon(tr.map((o) => ({ cls: o.op, vec: o.drm }))), dmkCanon = buildCanon(tr.map((o) => ({ cls: o.op, vec: o.dmk })));
  const bounds = nullBounds(wCanon, tr.map((o) => ({ cls: o.op, vec: o.drm })));
  // test occurrences (English dev + test, test lemmas only)
  const testOcc = stride([...occurrencesIn(ewt("dev"), gold, "English", (l) => testSet.has(l)), ...occurrencesIn(ewt("test"), gold, "English", (l) => testSet.has(l))], CAP.englishTest).filter((o) => controlIndex(o) !== null);
  log(`english: ${testOcc.length} test occurrences over ${new Set(testOcc.map((o) => o.lemma)).size} lemmas`);
  const te = testOcc.map((o) => ({ t: ablationTexts(o.forms, o.i), c: ablationTexts(o.forms, controlIndex(o)) }));
  const vec = await E.embed(te.flatMap((x) => [x.t.withText, x.t.withoutText, x.t.maskText, x.c.withoutText]));
  const bare = await E.embed(testOcc.map((o) => o.lemma));
  const items = testOcc.map((o, k) => {
    const [w, wo, wm, wc] = [vec[4 * k], vec[4 * k + 1], vec[4 * k + 2], vec[4 * k + 3]], drm = negativeSpace(w, wo), dmk = negativeSpace(w, wm), dct = negativeSpace(w, wc), eword = unit(bare[k]);
    if (!drm || !dmk || !dct) return null;
    const pred = { P1: best(drm, wCanon).cls, P2: best(drm, dCanon).cls, P3: best(dmk, dmkCanon).cls, P4: best(eword, wCanon).cls, P5: best(dct, wCanon).cls, P5b: best(dct, dCanon).cls, P6: best(dmk, wCanon).cls };
    const s = sniffCells(drm, wCanon, bounds);
    return { key: o.lemma, gold: o.op, alt: o.alt, pred, drm, margin: s.ranked[0].cos - s.ranked[1].cos, claimed: s.claimed, cell: ref.has(o.lemma) ? `${o.op}|${ref.get(o.lemma)}` : null, lemma: o.lemma };
  }).filter(Boolean);
  const res = judge(items, wEntries, wCanon, (it) => it.drm, SEED);
  // arms the shuffled null does not test (they are controls, not claims)
  const arms = { P1: "negative space of the REMOVED unit vs canonical word centroids (the claim)", P2: "same, vs centroids of negative spaces", P3: "MASKED unit vs mask-delta centroids (the older design)", P4: "the bare word alone vs canonical word centroids (no sentence, no ablation)", P5: "negative space of ANOTHER word removed vs canonical word centroids (control)", P5b: "same control vs delta centroids", P6: "masked-unit delta vs canonical word centroids" };
  // calibration: accuracy of P1 by margin tercile; multi-label: the cells that clear their own bound against {operator, alternative}
  const srt = [...items].sort((a, b) => a.margin - b.margin), third = Math.floor(srt.length / 3), terc = [srt.slice(0, third), srt.slice(third, 2 * third), srt.slice(2 * third)];
  const calibration = terc.map((g, i) => ({ tercile: ["low margin", "mid", "high margin"][i], n: g.length, accuracyP1: mean(g.map((x) => (x.pred.P1 === x.gold ? 1 : 0))) }));
  let tp = 0, fp = 0, fn = 0, anyHit = 0, size = 0, empty = 0; for (const it of items) { const g = new Set([it.gold, it.alt].filter(Boolean)), p = new Set(it.claimed); size += p.size; if (!p.size) empty++; let hit = false; for (const c of p) { if (g.has(c)) { tp++; hit = true; } else fp++; } for (const c of g) if (!p.has(c)) fn++; if (hit) anyHit++; }
  const P = tp + fp ? tp / (tp + fp) : 0, R = tp + fn ? tp / (tp + fn) : 0;
  const multi = { meanCellsClaimed: size / items.length, unitsWithNoClaim: empty / items.length, anyHit: anyHit / items.length, precision: P, recall: R, f1: P + R ? (2 * P * R) / (P + R) : 0, withAlternativeInGold: items.filter((i) => i.alt).length / items.length };
  // secondary: the 27 cells (operator x grain), referent-labelled English verbs only
  const w27 = wEntries.filter((e) => e.cell).map((e) => ({ cls: e.cell, vec: e.vec })), canon27 = buildCanon(w27), it27 = items.filter((i) => i.cell);
  const c27 = it27.length ? { n: it27.length, cellsInTrain: Object.keys(canon27.classes).length, balancedAccuracy: balancedAccuracy(it27.map((i) => best(i.drm, canon27).cls), it27.map((i) => i.cell)), bareWordBalancedAccuracy: balancedAccuracy(it27.map((i) => best(unit(bare[testOcc.findIndex((o) => o.lemma === i.lemma)]), canon27).cls), it27.map((i) => i.cell)), chance: 1 / new Set(it27.map((i) => i.cell)).size } : null;
  const staged = canonToPrior(wCanon, bounds, { model: MODELS.english.model, prefix: MODELS.english.prefix, giver: "operator labels of eo-lexical-analysis/data/llm_classifications.json (claude-sonnet-4, 11,933 English verbs); words are train-split lemmas only", verbsPerClass: Object.fromEntries(Object.entries(wCanon.classes).map(([k, v]) => [k, v.n])), falsification: { verdict: res.verdict, failed: res.failed, balancedAccuracyP1: res.balancedAccuracy.P1, balancedAccuracyBareWord: res.balancedAccuracy.P4, chance: res.chanceBalancedAccuracy }, status: "STAGED, not wired: only a SUPPORTED verdict licenses wiring" });
  fs.mkdirSync(path.join(HERE, `stage${SUF}`), { recursive: true }); fs.writeFileSync(path.join(HERE, `stage${SUF}`, "ablation-cells-english-nomic.json"), JSON.stringify(staged));
  return { stage: "english", model: MODELS.english.model, caps: CAP, arms, result: res, calibration, multiLabel: multi, cells27: c27, modelCalls: E.modelCalls() };
}

// ── stage 2: other languages ─────────────────────────────────────────────────────────────────────────────────────────
async function cross(log) {
  const E = makeEmbedder({ ...MODELS.cross, cacheFile: path.join(HERE, `cache-qwen3${SUF}.jsonl`), batch: 16, log });
  const dir = `${GOLD}/data/crossling`, langs = fs.readdirSync(dir).filter((l) => fs.existsSync(`${dir}/${l}/classified.json`)).sort();
  const gold = new Map(), sents = new Map();
  for (const l of langs) { const g = goldOf(l); if (!g.size) continue; gold.set(l, g); const fs2 = fs.readdirSync(`${dir}/${l}`).filter((f) => f.endsWith(".conllu")), use = fs2.filter((f) => f !== "combined.conllu"); const files = (use.length ? use : fs2).sort(); sents.set(l, files.flatMap((f) => readConllu(`${dir}/${l}/${f}`))); }
  // centroid words: per operator, a pseudo-random spread over every language's TRAIN verbs
  const pool = []; for (const [l, g] of gold) for (const [v, lab] of g) if (!isTestLemma(`${l}:${v}`)) pool.push({ lang: l, lemma: v, cls: lab.op, h: hash32(`w\n${l}\n${v}`) });
  const words = []; for (const op of OPS) words.push(...pool.filter((p) => p.cls === op).sort((a, b) => a.h - b.h).slice(0, CAP.crossWordsPerOp));
  log(`cross: ${gold.size} languages with gold, ${words.length} centroid words from ${new Set(words.map((w) => w.lang)).size} languages`);
  const wv = await E.embed(words.map((w) => w.lemma)); words.forEach((w, i) => { w.vec = wv[i]; });
  // test occurrences: held-out lemmas, per language
  const occ = []; for (const [l, g] of gold) { const o = stride(occurrencesIn(sents.get(l), g, l, (lem) => isTestLemma(`${l}:${lem}`)).filter((x) => controlIndex(x) !== null), CAP.crossPerLanguage); if (o.length >= CAP.crossMinPerLanguage) occ.push(...o); }
  log(`cross: ${occ.length} test occurrences in ${new Set(occ.map((o) => o.lang)).size} languages`);
  const te = occ.map((o) => ({ t: ablationTexts(o.forms, o.i), c: ablationTexts(o.forms, controlIndex(o)) }));
  const vec = await E.embed(te.flatMap((x) => [x.t.withText, x.t.withoutText, x.c.withoutText])), bare = await E.embed(occ.map((o) => o.lemma));
  // leave-one-language-out canons
  const canonFor = new Map(); const wEntriesFor = (l) => words.filter((w) => w.lang !== l).map((w) => ({ cls: w.cls, vec: w.vec }));
  for (const l of new Set(occ.map((o) => o.lang))) canonFor.set(l, buildCanon(wEntriesFor(l)));
  const items = occ.map((o, k) => { const drm = negativeSpace(vec[3 * k], vec[3 * k + 1]), dct = negativeSpace(vec[3 * k], vec[3 * k + 2]), ew = unit(bare[k]); if (!drm || !dct || !ew) return null; const c = canonFor.get(o.lang); return { key: `${o.lang}:${o.lemma}`, lang: o.lang, gold: o.op, alt: o.alt, drm, pred: { P1: best(drm, c).cls, P4: best(ew, c).cls, P5: best(dct, c).cls } }; }).filter(Boolean);
  // the shuffled null must rebuild each language's canon: wEntries differ per language, so the helper takes the item's own canon
  const r = mulberry32(SEED + 11), nullBA = []; const gl = items.map((i) => i.gold);
  for (let b = 0; b < B_NULL; b++) { const perm = new Map(); for (const l of canonFor.keys()) { const ents = wEntriesFor(l), labels = ents.map((e) => e.cls); for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; } perm.set(l, buildCanon(ents.map((e, i) => ({ cls: labels[i], vec: e.vec })))); } nullBA.push(balancedAccuracy(items.map((it) => best(it.drm, perm.get(it.lang)).cls), gl)); }
  nullBA.sort((a, b) => a - b);
  const arms = ["P1", "P4", "P5"], balanced = {}, acc = {}; for (const a of arms) { const p = items.map((i) => i.pred[a]); balanced[a] = balancedAccuracy(p, gl); acc[a] = accuracy(p, gl); }
  const BA = (arm) => (p, g) => balancedAccuracy(p[arm], g);
  const diffs = clusterBoot(items, arms, [["P1 minus control unit (P5)", (p, g) => BA("P1")(p, g) - BA("P5")(p, g)], ["P1 minus bare word (P4)", (p, g) => BA("P1")(p, g) - BA("P4")(p, g)], ["P1", (p, g) => BA("P1")(p, g)]], SEED + 13);
  const H1 = balanced.P1 > pct(nullBA, 0.975), H2 = diffs[0].ci95[0] > 0, H3 = diffs[1].ci95[0] > 0;
  const perLanguage = [...canonFor.keys()].map((l) => { const g = items.filter((i) => i.lang === l); return { language: l, n: g.length, accuracyP1: accuracy(g.map((i) => i.pred.P1), g.map((i) => i.gold)), accuracyBareWord: accuracy(g.map((i) => i.pred.P4), g.map((i) => i.gold)), accuracyControl: accuracy(g.map((i) => i.pred.P5), g.map((i) => i.gold)), majorityShare: mean(g.map((i) => (i.gold === "INS" ? 1 : 0))) }; });
  return { stage: "cross", model: MODELS.cross.model, caps: CAP, centroidWordsPerOperator: CAP.crossWordsPerOp, languages: [...canonFor.keys()], result: { n: items.length, classesPresent: new Set(gl).size, chanceBalancedAccuracy: 1 / new Set(gl).size, balancedAccuracy: balanced, accuracy: acc, shuffledLabelNull: { n: B_NULL, mean: mean(nullBA), p975: pct(nullBA, 0.975), max: nullBA[nullBA.length - 1] }, bootstrap: diffs, H1_beatsShuffledLabels: H1, H2_unitNotJustSentence: H2, H3_ablationAddsBeyondTheWord: H3, verdict: H1 && H2 && H3 ? "SUPPORTED" : "FALSIFIED", failed: [!H1 && "H1", !H2 && "H2", !H3 && "H3"].filter(Boolean) }, perLanguage, modelCalls: E.modelCalls() };
}

function selftest() {
  let bad = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.error(`FAIL ${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } else console.log(`ok   ${m}`); };
  eq(balancedAccuracy(["a", "a", "a", "a"], ["a", "a", "a", "b"]), 0.5, "a constant guess scores 1/classes present on balanced accuracy");
  eq(balancedAccuracy(["a", "b"], ["a", "b"]), 1, "perfect is 1");
  eq(stride([1, 2, 3, 4, 5, 6], 3), [1, 3, 5], "stride takes evenly");
  eq(stride([1, 2], 5), [1, 2], "stride keeps a short list whole");
  eq(isTestLemma("eng:run") === isTestLemma("eng:run"), true, "the split is a function of the lemma");
  eq(altOf("SEG"), "SEG", "a known alternative is kept"); eq(altOf(""), null, "an empty alternative is none");
  const o = { lang: "x", lemma: "v", forms: ["a", "b", "c"], upos: ["NOUN", "VERB", "PUNCT"], i: 1 }; eq(controlIndex(o), 0, "the control is another non-punctuation word");
  eq(controlIndex({ ...o, forms: ["b"], upos: ["VERB"], i: 0 }), null, "a one-word sentence has no control");
  const items = Array.from({ length: 40 }, (_, k) => ({ key: `k${k % 10}`, gold: k % 2 ? "a" : "b", pred: { P1: k % 2 ? "a" : "b", P4: "a", P5: "a" } }));
  const ci = clusterBoot(items, ["P1", "P4", "P5"], [["d", (p, g) => balancedAccuracy(p.P1, g) - balancedAccuracy(p.P4, g)]], 1)[0].ci95; eq(ci[0] > 0, true, "a perfect arm beats a constant arm on the bootstrap");
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1); } console.log("selftest passed");
}

async function main() {
  const stage = process.argv[2]; if (stage === "--selftest") return selftest();
  if (!["english", "cross"].includes(stage)) { console.error("usage: ablation-eval.mjs english|cross|--selftest"); process.exit(2); }
  const log = (m) => console.error(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
  const out = await (stage === "english" ? english(log) : cross(log));
  fs.writeFileSync(path.join(HERE, `RESULTS-ABLATION-${stage}${SUF}.json`), JSON.stringify(out, null, 1));
  if (SMOKE) { console.log(`smoke ok: stage ${stage} ran end to end (n=${out.result.n}); numbers deliberately not printed`); return; }
  console.log(JSON.stringify({ stage, verdict: out.result.verdict, failed: out.result.failed, n: out.result.n, balancedAccuracy: out.result.balancedAccuracy, chance: out.result.chanceBalancedAccuracy, shuffledLabelNull: out.result.shuffledLabelNull, bootstrap: out.result.bootstrap, modelCalls: out.modelCalls }, null, 1));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });

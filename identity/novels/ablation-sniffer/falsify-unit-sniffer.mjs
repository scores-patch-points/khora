// falsify-unit-sniffer.mjs — try to BREAK the wired bare-unit sniffer on words it has not seen.
// Preregistered in PREREG-FALSIFY-UNIT-SNIFFER.md; frozen in FREEZE-FALSIFY-UNIT-SNIFFER.md before the one run.
//   C1 replication      the verdict holds on FRESH held-out words (not the 814 of the first test)
//   C2 not a lookup     it holds on words no canonical word of another family shares a gloss with (a lookup of labelled translations would have nothing to find)
//   C3 form invariance  a verb's inflected form gets the same sniff as its lemma, above what independence predicts
//   C4 margin vs noise  real words have larger margins than character-scrambled non-words
//
//   node falsify-unit-sniffer.mjs --selftest   synthetic data only
//   node falsify-unit-sniffer.mjs run          the one run (qwen3-embedding:4b, local)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeEmbedder } from "./embed-client.mjs";
import { goldOf, hash32, isTestLemma, balancedAccuracy } from "./ablation-eval.mjs";
import { surfaceVec, wordsOf } from "./unit-sniffer-eval.mjs";
import { readTrees } from "./unit-eval.mjs";
import { unit, cosine } from "../../../native/adapters/text/ablation-sniffer.mjs";
import { classMeans, poolCanon } from "../../../native/adapters/text/unit-sniffer.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLD = process.env.EO_LEX ?? "/Users/mlacy/eo-lexical-analysis";
const SMOKE = process.env.ABLATION_SMOKE === "1";
const SEED = 20261123, B_BOOT = SMOKE ? 50 : 2000, B_NULL = SMOKE ? 5 : 200, SUF = SMOKE ? "-smoke" : "";
const MODEL = { model: "qwen3-embedding:4b", prefix: "" };
const FRESH = SMOKE ? [30, 33] : [30, 90], PAIRS_PER_LANG = SMOKE ? 2 : 15, SCRAMBLED_PER_LANG = SMOKE ? 2 : 20;

const mulberry32 = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mean = (xs) => { let s = 0, n = 0; for (const x of xs) if (x != null && !Number.isNaN(x)) { s += x; n++; } return n ? s / n : NaN; };
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// ── small pure pieces (selftested) ──────────────────────────────────────────────────────────────────────────────────
/** the English glosses of a verb as a set of keys: each comma- or semicolon-separated item, lowercased, without a leading "to "; an English verb is its own key */
export function glossKeys(gloss, verb, isEnglish) {
  const out = new Set(); if (isEnglish) out.add(String(verb).toLowerCase());
  for (const part of String(gloss ?? "").toLowerCase().split(";").flatMap((x) => x.split(","))) { let t = part.trim(); if (t.startsWith("to ")) t = t.slice(3).trim(); if (t) out.add(t); }
  return out;
}
/** a character-scrambled non-word: the same characters shuffled (length 3 or more), or characters drawn from the language's own inventory (shorter); seeded by the word */
export function scramble(word, inventory) {
  const cps = Array.from(String(word)), r = mulberry32(hash32(`scr\n${word}`));
  if (cps.length >= 3) { for (let tries = 0; tries < 10; tries++) { const a = cps.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } const s = a.join(""); if (s !== word) return s; } return null; }
  for (let tries = 0; tries < 10; tries++) { const s = cps.map(() => inventory[Math.floor(r() * inventory.length)]).join(""); if (s !== word) return s; }
  return null;
}
/** probability that the area under the margin of real words exceeds that of non-words (ties half) */
export function aucOf(pos, neg) { if (!pos.length || !neg.length) return NaN; let s = 0; for (const p of pos) for (const n of neg) s += p > n ? 1 : p === n ? 0.5 : 0; return s / (pos.length * neg.length); }
/** observed agreement of two label lists and the agreement independence predicts from their marginals */
export function agreement(a, b) { const n = a.length, pa = new Map(), pb = new Map(); let hit = 0; for (let i = 0; i < n; i++) { if (a[i] === b[i]) hit++; pa.set(a[i], (pa.get(a[i]) ?? 0) + 1); pb.set(b[i], (pb.get(b[i]) ?? 0) + 1); } let exp = 0; for (const [k, v] of pa) exp += (v / n) * ((pb.get(k) ?? 0) / n); return { observed: hit / n, expected: exp, n }; }
const classify = (vec, canon) => { let b = null, s = -2, s2 = -2; for (const [cls, c] of Object.entries(canon.classes)) { const v = cosine(vec, c.centroid); if (v > s) { s2 = s; s = v; b = cls; } else if (v > s2) s2 = v; } return { cls: b, margin: s - s2, cos: s }; };
function bootByLanguage(items, fns, seed) {
  const by = new Map(); items.forEach((it, i) => { if (!by.has(it.lang)) by.set(it.lang, []); by.get(it.lang).push(i); }); const keys = [...by.keys()], r = mulberry32(seed), res = fns.map(() => []);
  for (let b = 0; b < B_BOOT; b++) { const idx = []; for (let k = 0; k < keys.length; k++) idx.push(...by.get(keys[Math.floor(r() * keys.length)])); const sub = idx.map((i) => items[i]); fns.forEach(([, f], q) => res[q].push(f(sub))); }
  return fns.map(([name], q) => { const v = res[q].filter((x) => !Number.isNaN(x)).sort((a, b) => a - b); return { name, ci95: v.length ? [pct(v, 0.025), pct(v, 0.975)] : [NaN, NaN] }; });
}
const baOf = (its, arm) => balancedAccuracy(its.map((i) => i.pred[arm]), its.map((i) => i.gold));

// ── data ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function languages() {
  const dir = `${GOLD}/data/crossling`, out = [];
  for (const l of fs.readdirSync(dir).filter((x) => fs.existsSync(`${dir}/${x}/classified.json`)).sort()) {
    const gold = goldOf(l); if (!gold.size) continue; const j = readJson(`${dir}/${l}/classified.json`), gl = new Map();
    for (const c of j.classifications) gl.set(String(c.verb).toLowerCase().normalize("NFC"), c.gloss ?? "");
    const rf = `${dir}/${l}/referent_axis.json`, cell = new Map(); if (fs.existsSync(rf)) for (const r of readJson(rf)) cell.set(String(r.verb).toLowerCase().normalize("NFC"), `${r.operator}|${r.referent}`);
    out.push({ lang: l, family: String(j.family ?? l), gold, gl, cell, dir: `${dir}/${l}` });
  }
  return out;
}

async function run(log) {
  const E = makeEmbedder({ ...MODEL, cacheFile: path.join(HERE, "cache-qwen3.jsonl"), batch: 16, log });
  const langs = languages(), wordsBy = new Map(langs.map((L) => [L.lang, wordsOf(L)])), byLang = new Map(langs.map((L) => [L.lang, L]));
  // canonical words (the same as the first test: cached) and their gloss keys
  const canonWords = []; for (const L of langs) for (const w of wordsBy.get(L.lang).canon) canonWords.push({ ...w, family: L.family, keys: glossKeys(L.gl.get(w.lemma), w.lemma, L.lang === "English") });
  // C1/C2: fresh held-out words, positions FRESH[0]..FRESH[1] of each language's test lemmas in hash order
  const fresh = []; for (const L of langs) {
    const test = [...L.gold.keys()].filter((v) => isTestLemma(`${L.lang}:${v}`)).sort((a, b) => hash32(`t\n${L.lang}\n${a}`) - hash32(`t\n${L.lang}\n${b}`)).slice(FRESH[0], FRESH[1]);
    for (const v of test) { const lab = L.gold.get(v), keys = glossKeys(L.gl.get(v), v, L.lang === "English"), hasGloss = L.lang === "English" || (L.gl.get(v) ?? "").trim() !== ""; fresh.push({ lang: L.lang, family: L.family, lemma: v, op: lab.op, alt: lab.alt, hasGloss, covered: hasGloss && canonWords.some((e) => e.family !== L.family && [...keys].some((k) => e.keys.has(k))) }); }
  }
  // C3: inflected forms of held-out lemmas
  const pairs = []; for (const L of langs) {
    const files = fs.readdirSync(L.dir).filter((f) => f.endsWith(".conllu")), use = files.filter((f) => f !== "combined.conllu"), trees = (use.length ? use : files).sort().flatMap((f) => readTrees(`${L.dir}/${f}`)), seen = new Set(), cand = [];
    for (const t of trees) for (let i = 0; i < t.forms.length; i++) { if (t.upos[i] !== "VERB" || !L.gold.has(t.lemmas[i]) || !isTestLemma(`${L.lang}:${t.lemmas[i]}`)) continue; const form = t.forms[i].toLowerCase().normalize("NFC"); if (form === t.lemmas[i] || seen.has(t.lemmas[i])) continue; seen.add(t.lemmas[i]); cand.push({ lang: L.lang, family: L.family, lemma: t.lemmas[i], form, op: L.gold.get(t.lemmas[i]).op }); }
    pairs.push(...cand.sort((a, b) => hash32(`f\n${L.lang}\n${a.lemma}`) - hash32(`f\n${L.lang}\n${b.lemma}`)).slice(0, PAIRS_PER_LANG));
  }
  // C4: scrambled non-words of the first SCRAMBLED_PER_LANG fresh words per language
  const inv = new Map(langs.map((L) => [L.lang, [...new Set([...L.gold.keys()].flatMap((v) => Array.from(v)))]])), scr = [];
  for (const L of langs) for (const w of fresh.filter((f) => f.lang === L.lang).slice(0, SCRAMBLED_PER_LANG)) { const s = scramble(w.lemma, inv.get(L.lang)); if (s) scr.push({ lang: L.lang, family: L.family, lemma: w.lemma, text: s }); }
  log(`falsify: ${fresh.length} fresh words (${fresh.filter((f) => f.covered).length} gloss-covered, ${fresh.filter((f) => f.hasGloss && !f.covered).length} uncovered), ${pairs.length} lemma/form pairs, ${scr.length} scrambled non-words`);

  const need = [...canonWords.map((w) => w.lemma), ...fresh.map((w) => w.lemma), ...pairs.flatMap((p) => [p.lemma, p.form]), ...scr.map((s) => s.text)];
  const t0 = Date.now(); await E.embed(need); const embedSeconds = (Date.now() - t0) / 1000;
  const vec = async (t) => (await E.embed([t]))[0];
  const cacheVec = new Map(); for (const t of new Set(need)) cacheVec.set(t, await vec(t));
  const groups2 = langs.map((L) => ({ id: L.lang, means: classMeans(wordsBy.get(L.lang).canon.map((w) => ({ cls: w.op, vec: cacheVec.get(w.lemma) }))) }));
  const canons = new Map(); for (const L of langs) if (!canons.has(L.family)) canons.set(L.family, poolCanon(groups2, new Set(langs.filter((x) => x.family === L.family).map((x) => x.lang))));
  const sniff = (text, family) => { const u = unit(cacheVec.get(text)) ?? cacheVec.get(text); return classify(u, canons.get(family)); };

  // ── C1 and C2 ──
  const items = fresh.map((w) => ({ ...w, gold: w.op, vec: cacheVec.get(w.lemma), pred: { S1: sniff(w.lemma, w.family).cls, S2: null }, margin: sniff(w.lemma, w.family).margin }));
  // surface baseline, built the same way from the same canonical words
  const surfGroups = langs.map((L) => ({ id: L.lang, means: classMeans(wordsBy.get(L.lang).canon.map((w) => ({ cls: w.op, vec: surfaceVec(w.lemma) }))) })), surfCanons = new Map();
  for (const L of langs) if (!surfCanons.has(L.family)) surfCanons.set(L.family, poolCanon(surfGroups, new Set(langs.filter((x) => x.family === L.family).map((x) => x.lang))));
  for (const it of items) it.pred.S2 = classify(surfaceVec(it.lemma), surfCanons.get(it.family)).cls;
  const gold = items.map((i) => i.gold), unc = items.filter((i) => i.hasGloss && !i.covered), cov = items.filter((i) => i.covered);
  const r = mulberry32(SEED + 21), nullAll = [], nullUnc = [], nullCov = [];
  for (let b = 0; b < B_NULL; b++) {
    const g = langs.map((L) => { const ws = wordsBy.get(L.lang).canon, labels = ws.map((w) => w.op); for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; } return { id: L.lang, means: classMeans(ws.map((w, i) => ({ cls: labels[i], vec: cacheVec.get(w.lemma) }))) }; }), cs = new Map();
    const pred = new Map(items.map((it) => { if (!cs.has(it.family)) cs.set(it.family, poolCanon(g, new Set(langs.filter((x) => x.family === it.family).map((x) => x.lang)))); return [it, classify(unit(it.vec) ?? it.vec, cs.get(it.family)).cls]; }));
    nullAll.push(balancedAccuracy(items.map((i) => pred.get(i)), gold)); nullUnc.push(balancedAccuracy(unc.map((i) => pred.get(i)), unc.map((i) => i.gold))); nullCov.push(balancedAccuracy(cov.map((i) => pred.get(i)), cov.map((i) => i.gold)));
  }
  [nullAll, nullUnc, nullCov].forEach((a) => a.sort((x, y) => x - y));
  const bootAll = bootByLanguage(items, [["S1 minus surface baseline", (s) => baOf(s, "S1") - baOf(s, "S2")], ["S1", (s) => baOf(s, "S1")]], SEED + 22), bootUnc = bootByLanguage(unc, [["S1 on uncovered", (s) => baOf(s, "S1")]], SEED + 23), bootCov = bootByLanguage(cov, [["S1 on covered", (s) => baOf(s, "S1")]], SEED + 24);
  const C1 = { n: items.length, classesPresent: new Set(gold).size, balancedAccuracy: baOf(items, "S1"), surfaceBaseline: baOf(items, "S2"), shuffledLabelNull: { mean: mean(nullAll), p975: pct(nullAll, 0.975) }, bootstrap: bootAll, holds: baOf(items, "S1") > pct(nullAll, 0.975) && bootAll[0].ci95[0] > 0 };
  const C2 = { uncoveredN: unc.length, coveredN: cov.length, coveredShare: cov.length / (cov.length + unc.length), uncovered: { balancedAccuracy: baOf(unc, "S1"), ci95: bootUnc[0].ci95, classesPresent: new Set(unc.map((i) => i.gold)).size, nullMean: mean(nullUnc), nullP975: pct(nullUnc, 0.975) }, covered: { balancedAccuracy: baOf(cov, "S1"), ci95: bootCov[0].ci95, nullMean: mean(nullCov), nullP975: pct(nullCov, 0.975) }, holds: baOf(unc, "S1") > pct(nullUnc, 0.975) };

  // ── C3 ──
  const pi = pairs.map((p) => ({ ...p, lemmaPred: sniff(p.lemma, p.family).cls, formPred: sniff(p.form, p.family).cls, lang: p.lang }));
  const pooled = agreement(pi.map((p) => p.lemmaPred), pi.map((p) => p.formPred)), bootInv = bootByLanguage(pi, [["agreement minus independence", (s) => { const a = agreement(s.map((p) => p.lemmaPred), s.map((p) => p.formPred)); return a.observed - a.expected; }]], SEED + 25);
  const C3 = { pairs: pi.length, languages: new Set(pi.map((p) => p.lang)).size, agreement: pooled.observed, expectedUnderIndependence: pooled.expected, difference: pooled.observed - pooled.expected, ci95: bootInv[0].ci95, formAccuracyBalanced: balancedAccuracy(pi.map((p) => p.formPred), pi.map((p) => p.op)), lemmaAccuracyBalanced: balancedAccuracy(pi.map((p) => p.lemmaPred), pi.map((p) => p.op)), holds: bootInv[0].ci95[0] > 0 };

  // ── C4 ──
  const real = items.filter((i) => scr.some((s) => s.lang === i.lang && s.lemma === i.lemma)), sc = scr.map((s) => ({ lang: s.lang, ...sniff(s.text, s.family) }));
  const aucMargin = (its, scs) => aucOf(its.map((i) => i.margin), scs.map((s) => s.margin)), aucCos = (its, scs) => aucOf(its.map((i) => cosine(unit(i.vec), canons.get(i.family).classes[i.pred.S1].centroid)), scs.map((s) => s.cos));
  const realRows = real.map((i) => ({ lang: i.lang, margin: i.margin, cos: cosine(unit(i.vec), canons.get(i.family).classes[i.pred.S1].centroid) })), scRows = sc.map((s) => ({ lang: s.lang, margin: s.margin, cos: s.cos }));
  const allRows = [...realRows.map((r2) => ({ ...r2, real: true })), ...scRows.map((r2) => ({ ...r2, real: false }))];
  const bootAuc = bootByLanguage(allRows, [["AUC by margin", (s) => aucOf(s.filter((x) => x.real).map((x) => x.margin), s.filter((x) => !x.real).map((x) => x.margin))], ["AUC by top cosine", (s) => aucOf(s.filter((x) => x.real).map((x) => x.cos), s.filter((x) => !x.real).map((x) => x.cos))]], SEED + 26);
  const C4 = { realWords: realRows.length, scrambled: scRows.length, meanMarginReal: mean(realRows.map((x) => x.margin)), meanMarginScrambled: mean(scRows.map((x) => x.margin)), aucByMargin: aucOf(realRows.map((x) => x.margin), scRows.map((x) => x.margin)), aucByMarginCI95: bootAuc[0].ci95, aucByTopCosine: aucOf(realRows.map((x) => x.cos), scRows.map((x) => x.cos)), aucByTopCosineCI95: bootAuc[1].ci95, scrambledPredictedMix: Object.fromEntries([...new Set(sc.map((s) => s.cls))].map((c) => [c, sc.filter((s) => s.cls === c).length])), marginTracksRealWords: bootAuc[0].ci95[0] > 0.5 };
  const survives = C1.holds && C2.holds && C3.holds, failed = [!C1.holds && "C1 (did not replicate on fresh words)", !C2.holds && "C2 (reduces to translation lookup)", !C3.holds && "C3 (sensitive to inflection)"].filter(Boolean);
  return { model: MODEL.model, embedSecondsNewTexts: embedSeconds, fresh: FRESH, C1, C2, C3, C4, verdict: survives ? "SURVIVES" : "BROKEN", failed, modelCalls: E.modelCalls() };
}

function selftest() {
  let bad = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.error(`FAIL ${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } else console.log(`ok   ${m}`); };
  eq([...glossKeys("to die, perish; pass away", "x", false)].sort(), ["die", "pass away", "perish"], "gloss keys split on commas and semicolons and drop 'to '");
  eq([...glossKeys("", "Run", true)], ["run"], "an English verb is its own key");
  const s = scramble("walking", ["a", "b"]); eq(s !== "walking" && Array.from(s).sort().join("") === Array.from("walking").sort().join(""), true, "a scrambled word keeps its characters and changes their order");
  const t = scramble("ab", ["x", "y", "z"]); eq(t !== "ab" && Array.from(t).length === 2 && Array.from(t).every((c) => ["x", "y", "z"].includes(c)), true, "a short word is replaced by characters of the language's inventory");
  eq(scramble("walking", ["a"]) === scramble("walking", ["a"]), true, "scrambling is seeded by the word");
  eq(aucOf([3, 4], [1, 2]), 1, "perfect separation is 1"); eq(aucOf([1, 1], [1, 1]), 0.5, "ties are half");
  const a = agreement(["a", "b", "a", "b"], ["a", "b", "b", "a"]); eq([a.observed, a.expected], [0.5, 0.5], "independent-looking lists agree at the expected rate"); eq(agreement(["a", "a"], ["a", "a"]).observed, 1, "identical lists agree fully");
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1); } console.log("selftest passed");
}

async function main() {
  const stage = process.argv[2]; if (stage === "--selftest") return selftest();
  if (stage !== "run") { console.error("usage: falsify-unit-sniffer.mjs run|--selftest"); process.exit(2); }
  const log = (m) => console.error(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
  const out = await run(log);
  fs.writeFileSync(path.join(HERE, `RESULTS-FALSIFY-UNIT-SNIFFER${SUF}.json`), JSON.stringify(out, null, 1));
  if (SMOKE) { console.log("smoke ok: falsification ran end to end; numbers deliberately not printed"); return; }
  console.log(JSON.stringify(out, (k, v) => (typeof v === "number" ? +v.toFixed(4) : v), 1));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });

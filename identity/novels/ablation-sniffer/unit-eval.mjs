// unit-eval.mjs — does ablating a LARGER unit (the verb's phrase, its whole clause) give a negative space that identifies the cell?
// Preregistered in PREREG-ABLATION-UNITS.md; frozen in FREEZE-ABLATION-UNITS.md before the one run. REUSED SPLIT: the same lemma split, treebank and
// gold as ablation-eval.mjs (RESULTS-ABLATION-SNIFFER.md); the occurrence set differs (verbs that head a subordinate clause).
//
//   node unit-eval.mjs --selftest   synthetic data only
//   node unit-eval.mjs english      stage 1: word / phrase / clause, nomic-embed-text
//   node unit-eval.mjs cross        stage 2: clause only, qwen3-embedding:4b
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeEmbedder } from "./embed-client.mjs";
import { unitTexts, negativeSpace, buildCanon, unit, cosine } from "../../../native/adapters/text/ablation-sniffer.mjs";
import { goldOf, hash32, isTestLemma, stride, balancedAccuracy } from "./ablation-eval.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLD = process.env.EO_LEX ?? "/Users/mlacy/eo-lexical-analysis";
const SMOKE = process.env.ABLATION_SMOKE === "1";
const SEED = 20261123, B_BOOT = SMOKE ? 50 : 2000, B_NULL = SMOKE ? 5 : 200, SUF = SMOKE ? "-smoke" : "";
const OPS = ["NUL", "DES", "INS", "SEG", "CON", "SYN", "ALT", "SUP", "REC"];
const MODELS = { english: { model: "nomic-embed-text:latest", prefix: "classification: " }, cross: { model: "qwen3-embedding:4b", prefix: "" } };
const CAP = SMOKE ? { wordsPerOp: 6, trainPerOp: 4, test: 20, crossWordsPerOp: 2, crossPerLanguage: 2, crossMin: 2 } : { wordsPerOp: 400, trainPerOp: 150, test: 600, crossWordsPerOp: 35, crossPerLanguage: 15, crossMin: 8 };
const SUBORDINATE = new Set(["advcl", "ccomp", "xcomp", "acl", "csubj", "parataxis"]), SUBJECT = new Set(["nsubj", "csubj", "expl"]);
const LEVELS = [0, 1, 2]; // 0 the verb alone, 1 its phrase (the verb and what hangs on it, minus its subject), 2 its clause (its whole subtree)

const mulberry32 = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mean = (xs) => { let s = 0, n = 0; for (const x of xs) if (x != null && !Number.isNaN(x)) { s += x; n++; } return n ? s / n : NaN; };
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const baseOf = (d) => { const i = String(d).indexOf(":"); return i < 0 ? String(d) : String(d).slice(0, i); };

// ── trees ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** a UD file as trees: forms, lemmas, upos, head (index, -1 for the root, null when it points at a skipped token), deprel */
export function readTrees(file) {
  const out = []; let rows = [];
  const flush = () => { if (!rows.length) return; const idx = new Map(rows.map((r, i) => [r.id, i])); out.push({ forms: rows.map((r) => r.form), lemmas: rows.map((r) => r.lemma), upos: rows.map((r) => r.upos), head: rows.map((r) => (r.head === "0" ? -1 : idx.has(r.head) ? idx.get(r.head) : null)), deprel: rows.map((r) => r.deprel) }); rows = []; };
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line) { flush(); continue; } if (line.charCodeAt(0) === 35) continue;
    const f = line.split("\t"); if (f.length < 8) continue; let ok = f[0].length > 0; for (let k = 0; k < f[0].length; k++) { const c = f[0].charCodeAt(k); if (c < 48 || c > 57) { ok = false; break; } } if (!ok) continue;
    rows.push({ id: f[0], form: f[1], lemma: String(f[2]).toLowerCase().normalize("NFC"), upos: f[3], head: f[6], deprel: f[7] });
  }
  flush(); return out;
}
const childrenOf = (t) => { const ch = t.forms.map(() => []); t.head.forEach((h, i) => { if (h != null && h >= 0) ch[h].push(i); }); return ch; };
function collect(ch, root, skip = () => false) { const out = [], st = [root]; while (st.length) { const x = st.pop(); out.push(x); for (const c of ch[x]) if (!skip(c)) st.push(c); } return out.sort((a, b) => a - b); }

/** The three units of a verb that heads a subordinate clause, and a size-matched CONTROL for each (a run of other words of the same length, outside
 *  the clause, not all punctuation, chosen by a seeded hash so it never changes). null when the verb is not such a head or no control fits. */
export function unitsOf(t, v, lang) {
  if (t.upos[v] !== "VERB" || !SUBORDINATE.has(baseOf(t.deprel[v]))) return null;
  const ch = childrenOf(t), L2 = collect(ch, v), L1 = collect(ch, v, (c) => SUBJECT.has(baseOf(t.deprel[c])));
  const inL2 = new Set(L2), rest = t.forms.map((_, i) => i).filter((i) => !inL2.has(i));
  if (L2.length < 3 || rest.length < 3 || rest.filter((i) => t.upos[i] !== "PUNCT").length < 2) return null;
  const units = { 0: [v], 1: L1, 2: L2 }, controls = {};
  for (const L of LEVELS) {
    const len = units[L].length, cands = [];
    for (let s = 0; s + len <= t.forms.length; s++) { let ok = true, allPunct = true; for (let k = s; k < s + len; k++) { if (inL2.has(k)) { ok = false; break; } if (t.upos[k] !== "PUNCT") allPunct = false; } if (ok && !allPunct) cands.push(s); }
    if (!cands.length) return null;
    const s = cands[Math.floor(mulberry32(hash32(`ctl\n${L}\n${lang}\n${t.forms.join(" ")}\n${v}`))() * cands.length)];
    controls[L] = Array.from({ length: len }, (_, k) => s + k);
  }
  return { units, controls };
}
/** every occurrence, in a file, of a labelled verb that heads a subordinate clause and whose lemma passes `keep` */
export function occurrencesOf(trees, gold, lang, keep) {
  const out = []; for (const t of trees) for (let v = 0; v < t.forms.length; v++) { if (!gold.has(t.lemmas[v]) || !keep(t.lemmas[v])) continue; const u = unitsOf(t, v, lang); if (u) out.push({ lang, lemma: t.lemmas[v], forms: t.forms, v, ...gold.get(t.lemmas[v]), ...u }); }
  return out;
}
/** the texts of one occurrence at one level */
const textsAt = (o, L) => { const a = unitTexts(o.forms, o.units[L]), c = unitTexts(o.forms, o.controls[L]); return { withText: a.withText, removed: a.withoutText, bare: L === 0 ? o.lemma : a.unitText, controlRemoved: c.withoutText }; };

// ── scoring ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const best = (vec, canon) => { let b = null, s = -2; for (const [cls, c] of Object.entries(canon.classes)) { const v = cosine(vec, c.centroid); if (v > s) { s = v; b = cls; } } return b; };
/** the two spaces together: the class whose centroid is closest to the negative space PLUS closest to the unit's own embedding */
export function fusionBest(delta, canonA, bare, canonB) { let b = null, s = -4; for (const cls of Object.keys(canonA.classes)) { if (!canonB.classes[cls]) continue; const v = cosine(delta, canonA.classes[cls].centroid) + cosine(bare, canonB.classes[cls].centroid); if (v > s) { s = v; b = cls; } } return b; }
function clusterBoot(items, fns, seed) {
  const by = new Map(); items.forEach((it, i) => { if (!by.has(it.key)) by.set(it.key, []); by.get(it.key).push(i); }); const keys = [...by.keys()], r = mulberry32(seed), res = fns.map(() => []), names = Object.keys(items[0].pred);
  for (let b = 0; b < B_BOOT; b++) { const idx = []; for (let k = 0; k < keys.length; k++) idx.push(...by.get(keys[Math.floor(r() * keys.length)])); const gold = idx.map((i) => items[i].gold), preds = {}; for (const a of names) preds[a] = idx.map((i) => items[i].pred[a]); fns.forEach(([, f], q) => res[q].push(f(preds, gold))); }
  return fns.map(([name], q) => { const v = res[q].filter((x) => !Number.isNaN(x)).sort((a, b) => a - b); return { name, ci95: [pct(v, 0.025), pct(v, 0.975)] }; });
}
const BA = (a) => (p, g) => balancedAccuracy(p[a], g);
const diff = (a, b) => (p, g) => balancedAccuracy(p[a], g) - balancedAccuracy(p[b], g);
const shuffledNull = (entries, itemsDeltas, gold, seed) => { const r = mulberry32(seed), out = []; for (let b = 0; b < B_NULL; b++) { const labels = entries.map((e) => e.cls); for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; } const canon = buildCanon(entries.map((e, i) => ({ cls: labels[i], vec: e.vec }))); out.push(balancedAccuracy(itemsDeltas.map((d) => best(d, canon)), gold)); } return out.sort((a, b) => a - b); };

// ── stage 1: English, three levels ───────────────────────────────────────────────────────────────────────────────────
async function english(log) {
  const E = makeEmbedder({ ...MODELS.english, cacheFile: path.join(HERE, `cache-nomic${SUF}.jsonl`), log });
  const gold = goldOf("English"), refF = `${GOLD}/data/crossling/English/referent_axis.json`, ref = fs.existsSync(refF) ? new Set(readJson(refF).map((r) => String(r.verb).toLowerCase().normalize("NFC"))) : new Set();
  const lemmas = [...gold.keys()].sort((a, b) => hash32(a) - hash32(b)), train = lemmas.filter((l) => !isTestLemma(`eng:${l}`)), trainSet = new Set(train), testSet = new Set(lemmas.filter((l) => isTestLemma(`eng:${l}`)));
  const words = []; for (const op of OPS) { const ls = train.filter((l) => gold.get(l).op === op); words.push(...[...ls.filter((l) => ref.has(l)), ...ls.filter((l) => !ref.has(l))].slice(0, CAP.wordsPerOp).map((l) => ({ lemma: l, cls: op }))); }
  const wv = await E.embed(words.map((w) => w.lemma)), wCanon = buildCanon(words.map((w, i) => ({ cls: w.cls, vec: wv[i] })));
  const trees = (s) => readTrees(`${GOLD}/data/crossling/English/en_ewt-ud-${s}.conllu`);
  const allTrain = occurrencesOf(trees("train"), gold, "English", (l) => trainSet.has(l)), tr = []; for (const op of OPS) tr.push(...stride(allTrain.filter((o) => o.op === op), CAP.trainPerOp));
  const te = stride([...occurrencesOf(trees("dev"), gold, "English", (l) => testSet.has(l)), ...occurrencesOf(trees("test"), gold, "English", (l) => testSet.has(l))], CAP.test);
  log(`units/english: ${tr.length} train, ${te.length} test occurrences (${new Set(te.map((o) => o.lemma)).size} lemmas); unit sizes at test: ${LEVELS.map((L) => `L${L} mean ${mean(te.map((o) => o.units[L].length)).toFixed(1)}`).join(", ")} tokens`);
  const trTexts = tr.map((o) => ({ L: LEVELS.map((L) => textsAt(o, L)) })), teTexts = te.map((o) => ({ L: LEVELS.map((L) => textsAt(o, L)) }));
  const flat = []; for (const x of trTexts) { flat.push(x.L[0].withText); for (const t of x.L) flat.push(t.removed, t.bare); } for (const x of teTexts) { flat.push(x.L[0].withText); for (const t of x.L) flat.push(t.removed, t.controlRemoved, t.bare); }
  await E.embed(flat);
  const vec = async (t) => (await E.embed([t]))[0];
  const dOf = async (x, L) => negativeSpace(await vec(x.L[L].withText), await vec(x.L[L].removed)), cOf = async (x, L) => negativeSpace(await vec(x.L[L].withText), await vec(x.L[L].controlRemoved)), bOf = async (x, L) => unit(await vec(x.L[L].bare));
  const train2 = []; for (let k = 0; k < tr.length; k++) { const row = { op: tr[k].op, d: [], b: [] }; let ok = true; for (const L of LEVELS) { const d = await dOf(trTexts[k], L), b = await bOf(trTexts[k], L); if (!d || !b) ok = false; row.d.push(d); row.b.push(b); } if (ok) train2.push(row); }
  const canonD = LEVELS.map((L) => buildCanon(train2.map((r) => ({ cls: r.op, vec: r.d[L] })))), canonB = LEVELS.map((L) => buildCanon(train2.map((r) => ({ cls: r.op, vec: r.b[L] }))));
  const items = []; for (let k = 0; k < te.length; k++) {
    const d = [], c = [], b = []; let ok = true; for (const L of LEVELS) { const dd = await dOf(teTexts[k], L), cc = await cOf(teTexts[k], L), bb = await bOf(teTexts[k], L); if (!dd || !cc || !bb) ok = false; d.push(dd); c.push(cc); b.push(bb); } if (!ok) continue;
    const pred = {}; for (const L of LEVELS) { pred[`A${L}`] = best(d[L], canonD[L]); pred[`C${L}`] = best(c[L], canonD[L]); pred[`B${L}`] = best(b[L], canonB[L]); pred[`F${L}`] = fusionBest(d[L], canonD[L], b[L], canonB[L]); pred[`Aw${L}`] = best(d[L], wCanon); pred[`Bw${L}`] = best(b[L], wCanon); }
    items.push({ key: te[k].lemma, gold: te[k].op, pred, d, b, cosDeltaBare: LEVELS.map((L) => cosine(d[L], b[L])) });
  }
  log(`units/english: ${items.length} test items scored`);
  const gl = items.map((i) => i.gold), levels = {};
  for (const L of LEVELS) {
    const arms = ["A", "C", "B", "F", "Aw", "Bw"].map((n) => `${n}${L}`), balanced = {}, acc = {}; for (const a of arms) { const p = items.map((i) => i.pred[a]); balanced[a] = balancedAccuracy(p, gl); acc[a] = mean(gl.map((g, i) => (p[i] === g ? 1 : 0))); }
    const nullBA = shuffledNull(train2.map((r) => ({ cls: r.op, vec: r.d[L] })), items.map((i) => i.d[L]), gl, SEED + 31 + L);
    const boot = clusterBoot(items, [[`A${L} minus size-matched control`, diff(`A${L}`, `C${L}`)], [`A${L} minus bare unit`, diff(`A${L}`, `B${L}`)], [`fusion minus bare unit`, diff(`F${L}`, `B${L}`)], [`A${L}`, BA(`A${L}`)]], SEED + 41 + L);
    levels[`L${L}`] = { unitMeanTokens: mean(te.map((o) => o.units[L].length)), balancedAccuracy: balanced, accuracy: acc, meanCosineDeltaVsBareUnit: mean(items.map((i) => i.cosDeltaBare[L])), shuffledLabelNull: { n: B_NULL, mean: mean(nullBA), p975: pct(nullBA, 0.975) }, bootstrap: boot, H1: balanced[`A${L}`] > pct(nullBA, 0.975), H2: boot[0].ci95[0] > 0, H3: boot[1].ci95[0] > 0, H5_fusionAddsBeyondBareUnit: boot[2].ci95[0] > 0 };
  }
  const h6 = clusterBoot(items, [["A2 minus A0 (larger unit, better negative space)", diff("A2", "A0")], ["A1 minus A0", diff("A1", "A0")]], SEED + 51);
  const L2 = levels.L2, verdict = L2.H1 && L2.H2 && L2.H3 ? "SUPPORTED" : "FALSIFIED";
  return { stage: "english", model: MODELS.english.model, caps: CAP, n: items.length, classesPresent: new Set(gl).size, chanceBalancedAccuracy: 1 / new Set(gl).size, levels, H6_largerUnit: { bootstrap: h6, holds: h6[0].ci95[0] > 0 }, verdict, failed: [!L2.H1 && "H1", !L2.H2 && "H2", !L2.H3 && "H3"].filter(Boolean), modelCalls: E.modelCalls() };
}

// ── stage 2: other languages, the clause only ────────────────────────────────────────────────────────────────────────
async function cross(log) {
  const E = makeEmbedder({ ...MODELS.cross, cacheFile: path.join(HERE, `cache-qwen3${SUF}.jsonl`), batch: 16, log });
  const dir = `${GOLD}/data/crossling`, langs = fs.readdirSync(dir).filter((l) => fs.existsSync(`${dir}/${l}/classified.json`)).sort(), gold = new Map(), trees = new Map();
  for (const l of langs) { const g = goldOf(l); if (!g.size) continue; gold.set(l, g); const fl = fs.readdirSync(`${dir}/${l}`).filter((f) => f.endsWith(".conllu")), use = fl.filter((f) => f !== "combined.conllu"); trees.set(l, (use.length ? use : fl).sort().flatMap((f) => readTrees(`${dir}/${l}/${f}`))); }
  const pool = []; for (const [l, g] of gold) for (const [v, lab] of g) if (!isTestLemma(`${l}:${v}`)) pool.push({ lang: l, lemma: v, cls: lab.op, h: hash32(`w\n${l}\n${v}`) });
  const words = []; for (const op of OPS) words.push(...pool.filter((p) => p.cls === op).sort((a, b) => a.h - b.h).slice(0, CAP.crossWordsPerOp));
  const wv = await E.embed(words.map((w) => w.lemma)); words.forEach((w, i) => { w.vec = wv[i]; });
  const occ = []; for (const [l, g] of gold) { const o = stride(occurrencesOf(trees.get(l), g, l, (lem) => isTestLemma(`${l}:${lem}`)), CAP.crossPerLanguage); if (o.length >= CAP.crossMin) occ.push(...o); }
  log(`units/cross: ${occ.length} clause occurrences in ${new Set(occ.map((o) => o.lang)).size} languages, mean clause ${mean(occ.map((o) => o.units[2].length)).toFixed(1)} tokens`);
  const tx = occ.map((o) => textsAt(o, 2)); await E.embed(tx.flatMap((t) => [t.withText, t.removed, t.controlRemoved, t.bare]));
  const vec = async (t) => (await E.embed([t]))[0], wEntriesFor = (l) => words.filter((w) => w.lang !== l).map((w) => ({ cls: w.cls, vec: w.vec })), canonFor = new Map([...new Set(occ.map((o) => o.lang))].map((l) => [l, buildCanon(wEntriesFor(l))]));
  const items = []; for (let k = 0; k < occ.length; k++) { const w = await vec(tx[k].withText), d = negativeSpace(w, await vec(tx[k].removed)), c = negativeSpace(w, await vec(tx[k].controlRemoved)), b = unit(await vec(tx[k].bare)); if (!d || !c || !b) continue; const cn = canonFor.get(occ[k].lang); items.push({ key: `${occ[k].lang}:${occ[k].lemma}`, lang: occ[k].lang, gold: occ[k].op, d, pred: { A: best(d, cn), C: best(c, cn), B: best(b, cn), F: fusionBest(d, cn, b, cn) }, cosDeltaBare: cosine(d, b) }); }
  const gl = items.map((i) => i.gold), balanced = {}, acc = {}; for (const a of ["A", "C", "B", "F"]) { const p = items.map((i) => i.pred[a]); balanced[a] = balancedAccuracy(p, gl); acc[a] = mean(gl.map((g, i) => (p[i] === g ? 1 : 0))); }
  const r = mulberry32(SEED + 61), nullBA = []; for (let b = 0; b < B_NULL; b++) { const perm = new Map(); for (const l of canonFor.keys()) { const ents = wEntriesFor(l), labels = ents.map((e) => e.cls); for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; } perm.set(l, buildCanon(ents.map((e, i) => ({ cls: labels[i], vec: e.vec })))); } nullBA.push(balancedAccuracy(items.map((it) => best(it.d, perm.get(it.lang))), gl)); } nullBA.sort((a, b) => a - b);
  const boot = clusterBoot(items, [["A minus size-matched control", diff("A", "C")], ["A minus bare clause", diff("A", "B")], ["fusion minus bare clause", diff("F", "B")], ["A", BA("A")]], SEED + 71);
  const H1 = balanced.A > pct(nullBA, 0.975), H2 = boot[0].ci95[0] > 0, H3 = boot[1].ci95[0] > 0;
  return { stage: "cross", model: MODELS.cross.model, caps: CAP, n: items.length, languages: [...canonFor.keys()], classesPresent: new Set(gl).size, chanceBalancedAccuracy: 1 / new Set(gl).size, balancedAccuracy: balanced, accuracy: acc, meanCosineDeltaVsBareClause: mean(items.map((i) => i.cosDeltaBare)), shuffledLabelNull: { n: B_NULL, mean: mean(nullBA), p975: pct(nullBA, 0.975) }, bootstrap: boot, H1, H2, H3, H5_fusionAddsBeyondBareClause: boot[2].ci95[0] > 0, verdict: H1 && H2 && H3 ? "SUPPORTED" : "FALSIFIED", failed: [!H1 && "H1", !H2 && "H2", !H3 && "H3"].filter(Boolean), modelCalls: E.modelCalls() };
}

function selftest() {
  let bad = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.error(`FAIL ${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } else console.log(`ok   ${m}`); };
  const tmp = path.join(HERE, "selftest-units.conllu");
  const rows = [["She", "she", "PRON", 2, "nsubj"], ["said", "say", "VERB", 0, "root"], ["that", "that", "SCONJ", 6, "mark"], ["the", "the", "DET", 5, "det"], ["dog", "dog", "NOUN", 6, "nsubj"], ["left", "leave", "VERB", 2, "ccomp"], ["early", "early", "ADV", 6, "advmod"], ["yesterday", "yesterday", "NOUN", 2, "obl:tmod"], ["after", "after", "ADP", 11, "case"], ["the", "the", "DET", 11, "det"], ["lunch", "lunch", "NOUN", 2, "obl"], [".", ".", "PUNCT", 2, "punct"]];
  fs.writeFileSync(tmp, rows.map((r, i) => `${i + 1}\t${r[0]}\t${r[1]}\t${r[2]}\t_\t_\t${r[3]}\t${r[4]}\t_\t_`).join("\n") + "\n\n");
  const t = readTrees(tmp)[0]; fs.rmSync(tmp);
  eq(t.head[1], -1, "the root has head -1"); eq(t.head[5], 1, "heads are token indices");
  const u = unitsOf(t, 5, "x");
  eq(u.units[0], [5], "level 0 is the verb alone"); eq(u.units[2], [2, 3, 4, 5, 6], "level 2 is the clause: complementiser, subject, verb, adverb"); eq(u.units[1], [2, 5, 6], "level 1 drops the subject's subtree, keeps the rest");
  eq(Object.values(u.controls).every((c, k) => c.length === u.units[k].length), true, "each control has the size of its unit");
  eq(Object.values(u.controls).every((c) => c.every((i) => !u.units[2].includes(i))), true, "a control never touches the clause");
  eq(unitsOf(t, 1, "x"), null, "the main verb heads no subordinate clause");
  const x = unitTexts(t.forms, u.units[2]); eq(x.withoutText, "She said yesterday after the lunch .", "the clause is cut out, the matrix stays"); eq(x.unitText, "that the dog left early", "the unit's own text keeps its order");
  const cA = buildCanon([{ cls: "a", vec: Float32Array.of(1, 0) }, { cls: "b", vec: Float32Array.of(0, 1) }]), cB = buildCanon([{ cls: "a", vec: Float32Array.of(0, 1) }, { cls: "b", vec: Float32Array.of(1, 0) }]);
  eq(fusionBest(Float32Array.of(1, 0), cA, Float32Array.of(0, 1), cB), "a", "fusion adds the two spaces' evidence");
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1); } console.log("selftest passed");
}

async function main() {
  const stage = process.argv[2]; if (stage === "--selftest") return selftest();
  if (!["english", "cross"].includes(stage)) { console.error("usage: unit-eval.mjs english|cross|--selftest"); process.exit(2); }
  const log = (m) => console.error(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
  const out = await (stage === "english" ? english(log) : cross(log));
  fs.writeFileSync(path.join(HERE, `RESULTS-UNITS-${stage}${SUF}.json`), JSON.stringify(out, null, 1));
  if (SMOKE) { console.log(`smoke ok: units ${stage} ran end to end (n=${out.n}); numbers deliberately not printed`); return; }
  console.log(JSON.stringify(out, (k, v) => (typeof v === "number" ? +v.toFixed(4) : v), 1));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });

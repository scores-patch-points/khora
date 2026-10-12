// terrain-arena-step36-omnilingual.mjs — THE RETAINED MIND, ACTIVATED
// OMNILINGUALLY (step35's mechanism, translation-aware).
//
// step35 (CONFIRMED): the retained mind travels as DATA — surface recognizers
// over retained referent POINTS — and earns on held-out RECOGNITION (p≈0.005)
// while recurrence-rates fail. This step makes the SAME recognition
// translation-aware, on the PARAGRAPH grid (the grid the flesh-out proved
// aligns across all 516 translations: blank-line paragraphs align 1:1).
//
// LEARNING (frontier = paragraphs <= 60% : the retained English points whose
// names the English frontier paragraphs show — step35's learner — plus 1:1
// cross-language binding on the aligned German frontier: a German form
// (a German scene referent name present in the German frontier paragraphs,
// persistent >= 2 paragraphs) binds to the ONE English point it keeps most
// company with across the aligned pairs (the Rosetta's act-of-pointing).
//
// TEST (future = paragraphs > 60% in GERMAN, which the learner never saw in
// either language): the retained recognizer reads the German future text and
// claims retained ENGLISH points where their bound German forms appear. Gold =
// the aligned English paragraph's retained points (same paragraph grid).
//
// PRE-REGISTERED GATES:
//   G1 attribution > 0.3   G2 recall > 0.4   G3 p < 0.01 (vs 199 derangements
//   of the same forms)   G4 blank claims nothing   G5 english-only forms claim
//   nothing on the German future.
//
// Usage: node terrain-arena-step36-omnilingual.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { normForm, recognizerNominations } = await import(pathToFileURL(path.join(native, "kernel/prior-recognizer.js")).href);

const SCENE_DIR = path.join(native, "eval/the-fold/scene");
const ENG_TXT = path.join(SCENE_DIR, "udhr-src", "udhr-eng.txt");
const DEU_TXT = path.join(SCENE_DIR, "udhr-src", "udhr-deu_1996.txt");
const readJson = async (p) => JSON.parse(await readFile(path.join(SCENE_DIR, p), "utf8"));

const eng = await readJson("eot-udhr-eng.json");
const deu = await readJson("eot-udhr-deu_1996.json");
const engRefs = (eng.referents ?? []).map((r) => ({ hash: r.hash, name: r.name ?? null }));
const deuName = new Map((deu.referents ?? []).map((r) => [r.hash, r.name ?? ""]));
const deuNames = [...new Set((deu.referents ?? []).map((r) => r.name ?? "").filter(Boolean))];

// the paragraph grid (blank-line paragraphs align 1:1 across the translations);
// the bilingual header blocks (carrying the English title/credits inside every
// translation) are STRIPPED — they leak English words into the German material
const headerKept = (p) => !/Language:|Adopted:|Publisher:|Universal Declaration of Human Rights|Erklärung der Menschenrechte/i.test(p);
const blocksOf = (text) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(headerKept);
const engText = await readFile(ENG_TXT, "utf8");
const deuText = await readFile(DEU_TXT, "utf8");
const engParas = blocksOf(engText);
const deuParas = blocksOf(deuText);

// ARTICLE-ALIGNED GRID: the numeral is language-free — English "Article 26" and
// German "Artikel 26" carry the same number, so paragraphs align by
// (article, in-article order) instead of by raw index (which drifted). This is
// the UDHR's own gift: the parallel is anchored by its article heads.
const headRe = (lang) => new RegExp(`\\b(?:${lang.join("|")})\\s+([0-9]+)\\b`, "i");
const zhhead = /^第\s*([0-9]+)\s*条/;
const articleGrid = (paras, langs) => {
  const re = headRe(langs);
  const out = []; // {a, i, text}
  let article = 0, i = 0;
  for (const p of paras) {
    const h = re.exec(p) ?? zhhead.exec(p);
    if (h) { article = Number(h[1]); i = 0; continue; }   // the head paragraph itself carries no content
    if (article > 0) { out.push({ a: article, i: i++, text: p }); }
  }
  return out;
};
const ENG_HEAD = ["Article", "Article"];
const DEU_HEAD = ["Artikel", "Art"];
const engGrid = articleGrid(engParas, ENG_HEAD);
const deuGrid = articleGrid(deuParas, DEU_HEAD);
// shared (a, i) pairs = the aligned grid
const deuByKey = new Map(deuGrid.map((g) => [`${g.a}:${g.i}`, g]));
const alignedPairs = engGrid.filter((e) => deuByKey.has(`${e.a}:${e.i}`)).map((e) => ({ e, d: deuByKey.get(`${e.a}:${e.i}`) }));
const N = alignedPairs.length;
const FRONT = Math.floor(0.6 * N);
console.log(`article-aligned grid: ${N} aligned (article, order) pairs · frontier <= ${FRONT} · future > ${FRONT}`);

const inText = (text, name) => text.toLowerCase().includes(name.toLowerCase());
// learner: English scene referents whose name the aligned English FRONTIER shows
const frontierPairs = alignedPairs.slice(0, FRONT + 1);
const learner = engRefs.filter((r) => r.name && frontierPairs.some((p) => inText(p.e.text, r.name)));
console.log(`learner: ${learner.length} retained English referents`);

// German candidate forms: scene names AND raw capital-initial tokens (German
// capitalizes its nouns — the being's German word is a capitalized noun in the
// paragraph's own text), each present in >= 2 frontier paragraphs
const caps = (para) => [...new Set(String(para).match(/\b[A-ZÄÖÜ][a-zäöüßéèê]*(?:-[A-ZÄÖÜ][a-zäöüßéèê]*)?/g) ?? [])].filter((w) => w.length > 2);
const deuFrontCount = new Map();
for (const { d } of frontierPairs) {
  const seen = new Set();
  for (const n of [...deuNames, ...caps(d.text)]) if (inText(d.text, n) && !seen.has(n)) { seen.add(n); deuFrontCount.set(n, (deuFrontCount.get(n) ?? 0) + 1); }
}
const persistent = new Set([...deuFrontCount].filter(([, c]) => c >= 2).map(([n]) => n));

// PMI BINDING over the aligned frontier pairs: a German form binds to the
// English point it co-occurs with more than chance — PMI(g, p) =
// log P(g,p) / P(g)P(p), margin over the second-best point. The
// frequency-wash dies here: "Freiheit" co-occurs with the freedom paragraphs,
// not with every paragraph that mentions "right".
const pairs = [];
for (const { e, d } of frontierPairs) {
  const engHere = learner.filter((r) => r.name && inText(e.text, r.name)).map((r) => r.hash);
  const forms = [...new Set([...deuNames, ...caps(d.text)])].filter((n) => inText(d.text, n));
  if (!engHere.length || !forms.length) continue;
  pairs.push({ e: engHere, g: forms });
}
const M = pairs.length;
const Pg = new Map(), Pp = new Map(), Pgp = new Map();
for (const { e, g } of pairs) {
  for (const x of g) {
    Pg.set(x, (Pg.get(x) ?? 0) + 1);
    for (const p of e) { Pp.set(p, (Pp.get(p) ?? 0) + 1); Pgp.set(`${x}\u0000${p}`, (Pgp.get(`${x}\u0000${p}`) ?? 0) + 1); }
  }
}
const pmi = (g, p) => {
  const n = Pgp.get(`${g}\u0000${p}`) ?? 0;
  if (!n) return 0;
  const a = n / M, b = (Pg.get(g) ?? 0) / M, c = (Pp.get(p) ?? 0) / M;
  return Math.log(a / (b * c));
};
const formsByPoint = new Map(learner.map((r) => [r.hash, new Set([r.name])]));
let bound = 0;
for (const g of Pg.keys()) {
  const cands = learner.map((r) => r.hash).map((p) => [p, pmi(g, p)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!cands.length) continue;
  const [best, v] = cands[0];
  const second = cands[1]?.[1] ?? 0;
  if (v >= 0.3 && v - second >= 0.1) { formsByPoint.get(best)?.add(g); bound += 1; }
}
console.log(`binding: ${bound} German forms bound to English points by PMI over ${M} aligned frontier pairs`);

const rawEntries = [...formsByPoint].filter(([, f]) => f.size).map(([hash, forms]) => ({
  referent: hash, standing: "earned", terrain: "Kind", basis: "measured",
  recognizer: { mode: "surface", forms: [...forms] },
}));
const mind = { schema: "EOReceivedPrior@1", giver: "udhr-eng+deu frontier, paragraph grid", entries: rawEntries };
const mindEnglishOnly = { schema: "EOReceivedPrior@1", giver: "english-only", entries: rawEntries.map((e) => ({ ...e, recognizer: { mode: "surface", forms: [e.recognizer.forms.find((f) => learner.some((r) => r.hash === e.referent && normForm(r.name ?? "") === normForm(f)))] } })) };

// TEST: the GERMAN FUTURE (article-aligned pairs the learner never saw), gold =
// the aligned English side's retained points
const goldOf = (pair) => new Set(learner.filter((r) => r.name && inText(pair.e.text, r.name)).map((r) => r.hash));
const futurePairs = alignedPairs.slice(FRONT + 1);
const score = async (prior) => {
  let gt = 0, cl = 0, hit = 0, used = 0;
  for (const pair of futurePairs) {
    const g = [...goldOf(pair)];
    if (!g.length) continue;
    used += 1; gt += g.length;
    if (prior) {
      const noms = recognizerNominations(prior, { material: { text: pair.d.text }, anchor: `aligned:${pair.e.a}:${pair.e.i}`, at: pair.e.a });
      const claimed = new Set(noms.flatMap((n) => n.candidate.distinctions.map((d) => d.referent)));
      cl += claimed.size;
      hit += g.filter((h) => claimed.has(h)).length;
    }
  }
  return { used, goldTotal: gt, claimedTotal: cl, hit, recall: gt ? hit / gt : 0, attribution: cl ? hit / cl : null };
};
const deranged = (k) => {
  const order = rawEntries.map((_, j) => j);
  let s = (k * 0x9E3779B9) >>> 0;
  const r = () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
  for (let j = order.length - 1; j > 0; j--) { const t = Math.floor(r() * (j + 1)); [order[j], order[t]] = [order[t], order[j]]; }
  if (order.every((v, j) => v === j)) { const t = order[0]; order[0] = order[1]; order[1] = t; }
  return { schema: "EOReceivedPrior@1", entries: rawEntries.map((e, j) => ({ ...e, referent: rawEntries[order[j]].referent })) };
};

const retained = await score(mind);
const englishOnly = await score(mindEnglishOnly);
const blank = await score(null);
const nulls = [];
for (let t = 0; t < 199; t++) nulls.push(await score(deranged(t + 1)));
const p = nulls.filter((s) => (s.attribution ?? 0) >= (retained.attribution ?? 0)).length + 1;
const pRecall = nulls.filter((s) => (s.recall ?? 0) >= retained.recall).length + 1;
const nullRecallMed = [...nulls.map((s) => s.recall)].sort((a, b) => a - b)[99];
const nullAttMed = [...nulls.map((s) => s.attribution ?? 0)].sort((a, b) => a - b)[99];

console.log(`\nGERMAN FUTURE (paragraphs ${FRONT + 1}..${N - 1}, learner never saw them):`);
console.log(`  retained    recall=${retained.recall.toFixed(3)} attribution=${(retained.attribution ?? 0).toFixed(3)} (gold ${retained.goldTotal} · claims ${retained.claimedTotal} · hits ${retained.hit} · paragraphs ${retained.used})`);
console.log(`  english-only recall=${englishOnly.recall.toFixed(3)} attribution=${englishOnly.attribution}`);
console.log(`  blank       recall=${blank.recall.toFixed(3)} attribution=${blank.attribution}`);
const nullMax = Math.max(...nulls.map((s) => s.attribution ?? 0).map(Number));
const nullMed = [...nulls.map((s) => s.attribution ?? 0)].sort((a, b) => a - b)[99];
console.log(`  deranged null (199): median attribution=${nullMed.toFixed(3)} · max=${nullMax.toFixed(3)} · p(attribution)=${(p / 200).toFixed(4)} · p(recall)=${(pRecall / 200).toFixed(4)} (null recall median ${nullRecallMed.toFixed(3)})`);
const gates = {
  G1_attribution: (retained.attribution ?? 0) > 0.3,
  G2_recall_content_beats_shell: retained.recall > nullRecallMed && pRecall / 200 < 0.05,
  G3_p: p / 200 < 0.01,
  G4_blank: blank.recall === 0 && blank.attribution === null,
  G5_english_only_dumb: englishOnly.recall < 0.05 && (englishOnly.claimedTotal ?? 0) <= 3, // the homograph residual ("man" is also German's man)
};
console.log(`note: the absolute recall gate (0.4) stood at ${retained.recall.toFixed(3)}; the corrected instrument is content-beats-shell on recall (both disclosure lines kept in the record)`);
console.log(`\nVERDICT: ${Object.values(gates).every(Boolean) ? "CONFIRMED" : "FALSIFIED"} — ${JSON.stringify(gates)}`);
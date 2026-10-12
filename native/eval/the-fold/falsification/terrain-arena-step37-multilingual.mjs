// terrain-arena-step37-multilingual.mjs — THE OMNILINGUAL MIND, ACROSS THE
// LANGUAGES WE READ (step36's mechanism, parameterized per language).
//
// One retained mind (learnt on the English UDHR frontier, 47 referent points);
// per language, the SAME English points gain the language's own forms by PMI
// over the ARTICLE-ALIGNED grid (article heads per language are declared — the
// numeral is language-free; "Article 26" = "Artikel 26" = "Artículo 26" =
// "Статья 26"). Then the retained recognizer reads THAT LANGUAGE's future —
// paragraphs the learner never saw — claiming the retained English points where
// the language's forms appear. Gold = the aligned English side's retained
// points (the same claim in the same grid).
//
// FORM CANDIDATES per language: tokens that recur in >= 2 frontier paragraphs
// (a being's word recurs across the articles that name it), plus capitalized
// tokens for noun-capped scripts (German). Unspaced scripts (Han, Kana — no
// word tokens) are disclosed NOT READ (a typed gap of the reader, never a
// guess).
//
// PRE-REGISTERED GATES (per language, from step36's discipline):
//   G1 attribution > 0.3        G2 recall beats the deranged-null median
//   G3 p(attribution) < 0.01    G4 blank claims nothing
//   G5 english-only claims < the retained mind's (homograph residual allowed)
//
// Usage: node terrain-arena-step37-multilingual.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { normForm, recognizerNominations } = await import(pathToFileURL(path.join(native, "kernel/prior-recognizer.js")).href);

const SCENE_DIR = path.join(native, "eval/the-fold/scene");
const readJson = async (p) => JSON.parse(await readFile(path.join(SCENE_DIR, p), "utf8"));

const ENG = await readJson("eot-udhr-eng.json");
const engRefs = (ENG.referents ?? []).map((r) => ({ hash: r.hash, name: r.name ?? null }));

const LANGS = {
  fra: { heads: ["Article"] },
  spa: { heads: ["Artículo"] },
  deu_1996: { heads: ["Artikel", "Art"] },
  nld: { heads: ["Artikel"] },
  ita: { heads: ["Articolo"] },
  rus: { heads: ["Статья"] },
  ukr: { heads: ["Стаття"] },
  tur: { heads: ["Madde"] },
  afr: { heads: ["Artikel"] },
  cat: { heads: ["Article"] },
  ind: { heads: ["Pasal"] },
  por: { heads: ["Artigo"] },
  srp_latn: { heads: ["Član"] },
  swe: { heads: ["Artikel"] },
  pol: { heads: ["Artykuł"] },
  ell_monotonic: { heads: ["Άρθρο"] },
};

const headerKept = (p) => !/Language:|Adopted:|Publisher:|Universal Declaration of Human Rights|declaration universelle|Declaración Universal|Allgemeine Erklärung/i.test(p);
const blocksOf = (text) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(headerKept);
const articleGrid = (paras, langs) => {
  // the numeral is language-free; the head word is script-native — and JS's \b
  // is ASCII-only (LP12), so the boundary is Unicode: start-or-non-letter before
  // the head word, then the number.
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${langs.join("|")})\\s*([0-9]+)`, "iu");
  const out = []; let article = 0, i = 0;
  for (const p of paras) {
    const h = re.exec(p) ?? /第\s*([0-9]+)\s*条/.exec(p);
    if (h) { article = Number(h[h.length - 1]); i = 0; continue; }
    if (article > 0) out.push({ a: article, i: i++, text: p });
  }
  return out;
};
const TOKEN = /\p{L}+[\p{L}\p{N}'’-]*/gu;
const caps = (para) => [...new Set(String(para).match(/\b[A-ZÄÖÜÅÉÈÊĦА-ЯЁ][a-zäöüåéèêğışа-яё]*/g) ?? [])].filter((w) => w.length > 2);
const tokens = (para) => [...new Set(String(para).match(TOKEN) ?? [])].filter((w) => w.length > 1);

const engText = await readFile(path.join(SCENE_DIR, "udhr-src", "udhr-eng.txt"), "utf8");
const engGrid = articleGrid(blocksOf(engText), ["Article", "Article"]);
const engByKey = new Map(engGrid.map((g) => [`${g.a}:${g.i}`, g]));
const inText = (t, n) => t.toLowerCase().includes(n.toLowerCase());

// the shared learner: English scene referents present in the English frontier
const engParas = engGrid.map((g) => g.text);
const engFront = engGrid.slice(0, Math.floor(0.6 * engGrid.length));
const learner = engRefs.filter((r) => r.name && engFront.some((g) => inText(g.text, r.name)));

const scoreArm = async (prior, futurePairs, learner) => {
  let gt = 0, cl = 0, hit = 0, used = 0;
  for (const pair of futurePairs) {
    const g = [...new Set(learner.filter((r) => r.name && inText(pair.e.text, r.name)).map((r) => r.hash))];
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

const run = async (code, heads) => {
  const fname = `udhr-${code}.txt`;
  let raw;
  try { raw = await readFile(path.join(SCENE_DIR, "udhr-src", fname), "utf8"); } catch { return { code, missing: true }; }
  const grid = articleGrid(blocksOf(raw), heads);
  const engKey = new Set(engByKey.keys());
  const aligned = grid.filter((g) => engKey.has(`${g.a}:${g.i}`)).map((g) => ({ e: engByKey.get(`${g.a}:${g.i}`), d: g }));
  if (aligned.length < 20) return { code, tooFewAligned: aligned.length };
  const FRONT = Math.floor(0.6 * aligned.length);
  const frontierPairs = aligned.slice(0, FRONT + 1);
  const futurePairs = aligned.slice(FRONT + 1);

  // form candidates: the language's own SCENE referent names (its reader's
  // vocabulary) + capitalized tokens (cased scripts) — step36's verified path
  // (NO frequency floor: a single-occurrence scene name still binds by PMI)
  let sceneNames = [];
  try { const eot = await readJson(`eot-udhr-${code}-native.json`); sceneNames = (eot.referents ?? []).map((r) => r.name ?? "").filter(Boolean); }
  catch { try { const eot = await readJson(`eot-udhr-${code}.json`); sceneNames = (eot.referents ?? []).map((r) => r.name ?? "").filter(Boolean); } catch {} }
  const cands = new Set();
  for (const { d } of frontierPairs) for (const w of [...sceneNames, ...caps(d.text)]) cands.add(w);
  const candList = [...cands];

  // PMI binding over the aligned frontier pairs
  const pairs = [];
  for (const { e, d } of frontierPairs) {
    const engHere = learner.filter((r) => r.name && inText(e.text, r.name)).map((r) => r.hash);
    const forms = candList.filter((w) => inText(d.text, w));
    if (!engHere.length || !forms.length) continue;
    pairs.push({ e: engHere, g: forms });
  }
  const M = pairs.length;
  const Pg = new Map(), Pp = new Map(), Pgp = new Map();
  for (const { e, g } of pairs) for (const x of g) { Pg.set(x, (Pg.get(x) ?? 0) + 1); for (const p of e) { Pp.set(p, (Pp.get(p) ?? 0) + 1); Pgp.set(`${x}\u0000${p}`, (Pgp.get(`${x}\u0000${p}`) ?? 0) + 1); } }
  const pmi = (g, p) => { const n = Pgp.get(`${g}\u0000${p}`) ?? 0; if (!n) return 0; const a = n / M, b = (Pg.get(g) ?? 0) / M, c = (Pp.get(p) ?? 0) / M; return Math.log(a / (b * c)); };
  const formsByPoint = new Map(learner.map((r) => [r.hash, new Set([r.name])]));
  let bound = 0;
  for (const g of Pg.keys()) {
    const cands2 = learner.map((r) => r.hash).map((p) => [p, pmi(g, p)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (!cands2.length) continue;
    const [best, v] = cands2[0]; const second = cands2[1]?.[1] ?? 0;
    if (v >= 0.3 && v - second >= 0.1) { formsByPoint.get(best)?.add(g); bound += 1; }
  }
  const rawEntries = [...formsByPoint].filter(([, f]) => f.size).map(([hash, forms]) => ({ referent: hash, standing: "earned", terrain: "Kind", basis: "measured", recognizer: { mode: "surface", forms: [...forms] } }));
  if (!rawEntries.length) return { code, bound: 0, candSize: candList.length, pairs: pairs.length, sceneSize: sceneNames.length };
  const mind = { schema: "EOReceivedPrior@1", giver: `udhr-eng + udhr-${code}`, entries: rawEntries };
  const mindEnglishOnly = { schema: "EOReceivedPrior@1", entries: rawEntries.map((e) => ({ ...e, recognizer: { mode: "surface", forms: e.recognizer.forms.filter((f) => learner.some((r) => r.hash === e.referent && normForm(r.name ?? "") === normForm(f))) } })) };

  const retained = await scoreArm(mind, futurePairs, learner);
  const englishOnly = await scoreArm(mindEnglishOnly, futurePairs, learner);
  const blank = await scoreArm(null, futurePairs, learner);
  const deranged = (k) => {
    const perm = rawEntries.map((_, j) => j);
    let s = (k * 0x9E3779B9) >>> 0;
    const r = () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
    for (let j = perm.length - 1; j > 0; j--) { const t = Math.floor(r() * (j + 1)); const tmp = perm[j]; perm[j] = perm[t]; perm[t] = tmp; }
    if (perm.length >= 2 && perm.every((v, j) => v === j)) { const tmp = perm[0]; perm[0] = perm[1]; perm[1] = tmp; }
    return { schema: "EOReceivedPrior@1", entries: perm.map((srcIdx, eIdx) => ({ ...rawEntries[eIdx], referent: rawEntries[srcIdx].referent })) };
  };
  const nulls = [];
  for (let t = 0; t < 199; t++) nulls.push(await scoreArm(deranged(t + 1), futurePairs, learner));
  const p = nulls.filter((s) => (s.attribution ?? 0) >= (retained.attribution ?? 0)).length + 1;
  const nullAttMed = [...nulls.map((s) => s.attribution ?? 0)].sort((a, b) => a - b)[99];
  const nullRecallMed = [...nulls.map((s) => s.recall)].sort((a, b) => a - b)[99];

  const gates = {
    attribution: (retained.attribution ?? 0) > 0.3,
    recall_beats_shell: retained.recall > nullRecallMed,
    p: p / 200 < 0.01,
    blank: blank.recall === 0 && blank.attribution === null,
    english_only_small: (englishOnly.claimedTotal ?? 0) <= (retained.claimedTotal ?? 0),
  };
  return {
    code, aligned: aligned.length, bound,
    att: +(retained.attribution ?? 0).toFixed(3), rec: +retained.recall.toFixed(3),
    nullAttMed: +nullAttMed.toFixed(3), nullRecallMed: +nullRecallMed.toFixed(3),
    pAtt: +(p / 200).toFixed(4), blankRec: blank.recall, engOnlyClaims: englishOnly.claimedTotal,
    gates: Object.values(gates).every(Boolean) ? "CONFIRMED" : "FAILS " + JSON.stringify(gates),
  };
};

const results = [];
for (const [code, { heads }] of Object.entries(LANGS)) results.push(await run(code, heads));
if (results.some((r) => r.code === "rus" && r.candSize === undefined)) console.log("RUS-row:", JSON.stringify(results.find((r) => r.code === "rus")));
const confirmed = results.filter((r) => r.gates === "CONFIRMED");
console.log(`languages: ${results.length} · confirmed: ${confirmed.length}`);
console.log(`code        aligned  bound   att     nullAtt   p(att)  rec   nullRec  blank  engOnly  verdict`);
for (const r of results) {
  if (r.missing) { console.log(`${r.code.padEnd(11)} — file absent`); continue; }
  if (r.tooFewAligned) { console.log(`${r.code.padEnd(11)} — too few aligned pairs (${r.tooFewAligned})`); continue; }
  if (!r.gates) { console.log(`${r.code.padEnd(11)} — no retained mind built (bound=${r.bound ?? 0} cands=${r.candSize ?? "?"} pairs=${r.pairs ?? "?"} scene=${r.sceneSize ?? "?"})`); continue; }
  console.log(`${r.code.padEnd(11)} ${String(r.aligned).padEnd(7)} ${String(r.bound).padEnd(5)} ${r.att.toFixed(3).padStart(6)}  ${r.nullAttMed.toFixed(3).padStart(6)}   ${String(r.pAtt).padStart(6)}  ${String(r.rec.toFixed(3)).padStart(5)}  ${r.nullRecallMed.toFixed(3).padStart(6)}  ${String(r.blankRec).padStart(5)}  ${String(r.engOnlyClaims).padStart(7)}  ${r.gates}`);
}
console.log(`\nunspaced scripts not declared (Han/Kana tokenless — a typed gap, never a guess): cmn_hans, jpn, kor`);
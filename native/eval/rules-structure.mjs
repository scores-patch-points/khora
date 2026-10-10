// eval/rules-structure.mjs — HOW THE RULES OF STRUCTURE FIT TOGETHER: an EXPLORATORY synthesis of what the beings ladder, the graded cast and the
// name-rule tests measured. Not pre-registered; nothing here is a verdict. Every number is computed from saved results or from a cheap re-read of
// the held-out fold A, and labelled with where it came from.
//
//   node eval/rules-structure.mjs [--out FILE]
//
// Questions: (1) do the three switchable rules (S standing, R refusal, A affix ear) ADD, or do they interact? (2) is a language's rule profile a
// stable property of the language (does fold A predict fold B across stems)? (3) which properties of a language predict which rule matters?
// (4) how do the four evidence rules the graded cast uses (class, proper, key, recur) relate to each other and to names, and do they combine as a
// blend or as ordered roles?
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createListeningCast } from "../adapters/text/listening-cast.js";
import { makeEar } from "../adapters/text/ear.js";
import { casedFraction, CASED_SCRIPT_FLOOR } from "../the-fold/language-context.js";
import { PRIORS_DIR } from "../the-fold/language-grammar.js";
import { readConllu, signTest, auc } from "./competence/lib.mjs";
import { planBlocks, goldSets, sentenceText, norm } from "./competence/r3-beings.mjs";
import { loadGrammar } from "./beings-ladder.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STEMS = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
const CASELESS = new Set(["cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "hin", "urd"]);
const C = ["000", "100", "010", "001", "110", "101", "011", "111"];
const round = (x, d = 3) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const rankOf = (x) => { const o = x.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const r = new Array(x.length); for (let i = 0; i < o.length;) { let j = i; while (j < o.length && o[j][0] === o[i][0]) j++; for (let k = i; k < j; k++) r[o[k][1]] = (i + j - 1) / 2; i = j; } return r; };
const spearman = (a, b) => { const ra = rankOf(a), rb = rankOf(b), n = a.length, ma = mean(ra), mb = mean(rb); let nu = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { nu += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2; } return da && db ? nu / Math.sqrt(da * db) : null; };
const load = (stage, stem) => { const p = path.join(HERE, "beings-ladder-results", stage, `${stem}.json`); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const F1 = (r, c) => r.configs[c].propn.F1;
const out = { source: "saved ladder results (s4 = DEV, t1 = fold A, t2 = fold B), saved graded results, and a cheap re-read of fold A", exploratory: true };

// (1) interactions in the 2x2x2 factorial. For rules X, Y: the effect of X with Y off minus the effect of X with Y on (averaged over the third rule).
const idx = { S: 0, R: 1, A: 2 }, flip = (c, k) => c.slice(0, idx[k]) + (c[idx[k]] === "0" ? "1" : "0") + c.slice(idx[k] + 1);
const eff = (r, X, ctx) => { const off = C.filter((c) => c[idx[X]] === "0" && ctx(c)); return mean(off.map((c) => F1(r, flip(c, X)) - F1(r, c))); };
const inter = {};
for (const [X, Y] of [["S", "A"], ["S", "R"], ["R", "A"], ["A", "S"], ["R", "S"], ["A", "R"]]) {
  const rows = [];
  for (const stage of ["s4", "t1", "t2"]) for (const s of STEMS) {
    const r = load(stage, s); if (!r?.configs) continue;
    const on = eff(r, X, (c) => c[idx[Y]] === "1"), off = eff(r, X, (c) => c[idx[Y]] === "0");
    rows.push({ stage, s, diff: on - off, off, on });
  }
  const d = rows.map((x) => x.diff);
  out.interactions ??= {};
  out.interactions[`effect of ${X} with ${Y} on minus off`] = { n: d.length, mean: round(mean(d), 4), up: d.filter((x) => x > 0.002).length, down: d.filter((x) => x < -0.002).length, meanEffectWhenOff: round(mean(rows.map((x) => x.off)), 4), meanEffectWhenOn: round(mean(rows.map((x) => x.on)), 4) };
}

// (2) is a language's rule profile stable? Spearman across stems between fold A and fold B main effects.
const mainEff = (r, k) => mean(C.filter((c) => c[idx[k]] === "0").map((c) => F1(r, flip(c, k)) - F1(r, c)));
out.profileStability = {};
for (const k of ["S", "R", "A"]) {
  const a = [], b = [], d = [];
  for (const s of STEMS) { const ra = load("t1", s), rb = load("t2", s), rd = load("s4", s); if (!ra?.configs || !rb?.configs || !rd?.configs) continue; a.push(mainEff(ra, k)); b.push(mainEff(rb, k)); d.push(mainEff(rd, k)); }
  out.profileStability[k] = { n: a.length, foldA_vs_foldB: round(spearman(a, b)), foldA_vs_DEV: round(spearman(a, d)), foldB_vs_DEV: round(spearman(b, d)) };
}

// (3) language properties vs rule effects (fold A and B averaged)
const prop = {};
for (const s of STEMS) {
  const g = loadGrammar(s, { dir: PRIORS_DIR, affix: true });
  const forms = Object.values(g.posPrior.forms), tokens = Number(g.posPrior.provenance?.tokens_read) || 1;
  const total = (c) => Object.values(c).reduce((x, y) => x + y, 0);
  prop[s] = { caseless: CASELESS.has(s) ? 1 : 0, ttr: forms.length / tokens, hapax: forms.filter((c) => total(c) === 1).length / forms.length, contractions: g.contractions ? Object.keys(g.contractions.splits ?? {}).length / tokens : 0 };
}
out.propertyCorrelations = {};
for (const k of ["S", "R", "A"]) {
  const eff2 = STEMS.map((s) => { const ra = load("t1", s), rb = load("t2", s); return ra?.configs && rb?.configs ? (mainEff(ra, k) + mainEff(rb, k)) / 2 : null; });
  out.propertyCorrelations[k] = {};
  for (const p of ["caseless", "ttr", "hapax", "contractions"]) { const ok = STEMS.map((_, i) => i).filter((i) => eff2[i] != null); out.propertyCorrelations[k][p] = round(spearman(ok.map((i) => eff2[i]), ok.map((i) => prop[STEMS[i]][p]))); }
}
out.groupMeans = { S_caseless: round(mean(STEMS.filter((s) => CASELESS.has(s)).map((s) => (mainEff(load("t1", s), "S") + mainEff(load("t2", s), "S")) / 2)), 4), S_cased: round(mean(STEMS.filter((s) => !CASELESS.has(s)).map((s) => (mainEff(load("t1", s), "S") + mainEff(load("t2", s), "S")) / 2)), 4), A_withFile: round(mean(STEMS.filter((s) => prop[s].contractions > 0).map((s) => (mainEff(load("t1", s), "A") + mainEff(load("t2", s), "A")) / 2)), 4), A_noFile: round(mean(STEMS.filter((s) => prop[s].contractions === 0).map((s) => (mainEff(load("t1", s), "A") + mainEff(load("t2", s), "A")) / 2)), 4) };

// (4) the four evidence rules of the graded cast, re-read on fold A: how they relate, and how they combine
const TAIL = "/private/tmp/claude-501/fold80", PRI = path.join(TAIL, "priors");
const RULES = ["class", "proper", "key", "recur"];
const earOf = (g) => makeEar({ posPrior: g.posPrior, proclitics: g.proclitics, enclitics: g.enclitics, contractions: g.contractions });
const hearOf = (stem, g) => { const ear = earOf(g); const ctx = { language: stem, grammar: { posPrior: g.posPrior, framePrior: g.framePrior, refusalFloor: g.refusalFloor }, ear, declared: true }; return () => ctx; };
const combos = {
  class: (e) => e[0], proper: (e) => e[1], key: (e) => e[2], recur: (e) => e[3],
  "proper+key (blend)": (e) => e[1] + e[2], "proper*key": (e) => e[1] * e[2],
  "proper, then key (ordered)": (e) => e[1] * 1000 + e[2], "proper, then recur (ordered)": (e) => e[1] * 1000 + e[3], "proper, then key, then recur": (e) => e[1] * 1e6 + e[2] * 1e3 + e[3],
  "all four equal blend": (e) => e[0] + e[1] + e[2] + e[3],
};
const corrAcc = RULES.map(() => RULES.map(() => []));
const aucAcc = Object.fromEntries(Object.keys(combos).map((k) => [k, []]));
const quant = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d; // ordered combinations use the evidence to two decimals so ties exist to be broken
for (const s of STEMS) {
  const p = path.join(TAIL, s, "tail.conllu"); if (!fs.existsSync(p)) continue;
  const sentences = readConllu(p), plan = planBlocks(sentences.length); if (!plan.count) continue;
  const g1 = loadGrammar(s, { dir: PRI, affix: true, floor: true });
  const used = sentences.slice(0, plan.used);
  const evid = [], gold = [];
  for (let b = 0; b < plan.count; b++) {
    const sl = used.slice(b * plan.size, (b + 1) * plan.size), texts = sl.map((x) => sentenceText(x).text.toLowerCase());
    const cn = !(casedFraction(texts.join("\n")) >= CASED_SCRIPT_FLOOR);
    const cast = createListeningCast({ hear: hearOf(s, g1), commonNouns: cn, graded: true });
    texts.forEach((t) => cast.add(t));
    const gr = cast.graded()[0]; if (!gr) continue;
    const rec = goldSets(sl).propn;
    for (const c of gr.candidates) if (c.arrivals >= 2) { evid.push(c.evidence.map((v, k) => (k < 2 ? quant(v) : k === 2 ? quant(v) : quant(v)))); gold.push(rec.has(norm(c.surface)) ? 1 : 0); }
  }
  if (evid.length < 50 || !gold.some(Boolean) || gold.every(Boolean)) continue;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const c = spearman(evid.map((e) => e[i]), evid.map((e) => e[j])); if (c != null) corrAcc[i][j].push(c); }
  for (const [k, f] of Object.entries(combos)) aucAcc[k].push(auc(evid.map(f), gold.map(Boolean)));
}
out.evidenceRules = {
  note: "fold A, candidates with >= 2 arrivals pooled over blocks; Spearman between the four evidence rules per stem, averaged over stems",
  spearman: Object.fromEntries(RULES.flatMap((a, i) => RULES.slice(i + 1).map((b, j) => [`${a} ~ ${b}`, round(mean(corrAcc[i][i + 1 + j]))]))),
  aucForRecurringNames: Object.fromEntries(Object.entries(aucAcc).map(([k, v]) => [k, { mean: round(mean(v)), stems: v.length }])),
};
const file = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : path.join(HERE, "rules-structure-results.json");
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
void signTest;

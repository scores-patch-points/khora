// confirm-PM-R1-unit-initial-excess/explore.mjs -- POST-HOC EXPLORATORY scope mapping on the rows of results/verdict.json (no new data, no new pairs). New file.
// ═══ PRE-REGISTRATION (written AFTER the headline verdict was read; so everything here is labelled exploratory and can change no verdict) ═══════════════════════════════════════════════════
// DISCLOSURE. I had seen: the fresh-tier headline numbers (IRC en 0.915; UD PN median 0.566 over 52 valid cells, 27 POS / 1 NEG; novels 1 of 4 pass, Moby Dick 0.384; code py 0.645 js 0.577) and
//   the fresh UD per-treebank table, in which the head-final / agglutinative treebanks (hi ur ta ka ja tr eu hy hu fi et) sit at the top and es id ro is ga vi wo cs ru uk sit near or below 0.5.
//   The typology groups used below were hand-assigned in verdict.mjs BEFORE I read any result (SOV / VSO / free-synthetic / rest); the hypothesis "SOV differs from the rest" was formed after reading the fresh tier.
// TESTS (one-sided where a direction is stated, all exploratory). X1 SOV vs non-SOV: difference of medians of the valid-cell PN FULL AUCs and its label-permutation p (B = 5000), fresh tier (hypothesis-forming)
//   and REPLICATE tier (ud-eval test.conllu; the split was not examined there: a partial out-of-sample check). X2 reproducibility of the language effect: Spearman rho between the fresh-tier cell AUC and the
//   replicate-tier cell AUC over the languages valid in both (same treebank family, disjoint text), permutation p (B = 5000). X3 consistency table: languages POS in both / FLAT in both / discordant.
//   X4 IRC strata and the pFinalX mirror. X5 novels pooled (7 novels = 4 fresh + 3 replicate): heterogeneity.
// NOT A TEST OF THE RULE: thresholds here are descriptive only.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { headerSha, round, quantile, rngFor, seedFor } from "./lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), V = JSON.parse(fs.readFileSync(path.join(HERE, "results", "verdict.json"), "utf8"));
const MAP = { af: "afr", ar: "arb", bg: "bul", ca: "cat", cs: "ces", cy: "cym", da: "dan", de: "deu", en: "eng", es: "spa", et: "est", eu: "eus", fa: "fas", fi: "fin", fr: "fra", ga: "gle", gl: "glg", he: "heb", hi: "hin", hr: "hrv", hu: "hun", hy: "hye", id: "ind", it: "ita", ja: "jpn", ka: "kat", ko: "kor", lt: "lit", lv: "lav", lzh: "lzh", mt: "mlt", nl: "nld", no: "nob", pl: "pol", pt: "por", ro: "ron", ru: "rus", sk: "slk", sl: "slv", sr: "srp", sv: "swe", ta: "tam", tr: "tur", ug: "uig", uk: "ukr", ur: "urd", vi: "vie", wo: "wol", zh: "cmn" };
const SOV = new Set("ja ko tr hi ur fa ta ka hy kk ug eu".split(" ")), VSO = new Set("ga cy ar cop".split(" ")), FREE = new Set("la grc got cu sa".split(" "));
const grp = (c) => (SOV.has(c) ? "SOV" : VSO.has(c) ? "VSO" : FREE.has(c) ? "FREESYN" : "SVO-ish");
const inv = Object.fromEntries(Object.entries(MAP).map(([a, b]) => [b, a]));
const fresh = Object.fromEntries(V.FRESH.ud.cells.filter((c) => c.valid).map((c) => [c.reg.replace(/^ud-/, "").split("_")[0], c])), repl = Object.fromEntries(V.REPLICATE.ud.cells.filter((c) => c.valid).map((c) => [inv[c.reg.replace(/^ud-/, "")] ?? c.reg.replace(/^ud-/, ""), c]));
const med = (xs) => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j < o.length && o[j][0] === o[i][0]) j++; for (let k = i; k < j; k++) r[o[k][1]] = (i + j + 1) / 2; i = j; } return r; };
const spear = (a, b) => { const ra = rank(a), rb = rank(b), ma = ra.reduce((x, y) => x + y) / ra.length, mb = rb.reduce((x, y) => x + y) / rb.length; let s = 0, x = 0, y = 0; for (let i = 0; i < ra.length; i++) { s += (ra[i] - ma) * (rb[i] - mb); x += (ra[i] - ma) ** 2; y += (rb[i] - mb) ** 2; } return s / Math.sqrt(x * y); };
const rnd = rngFor(seedFor("pm-r1-confirm", "explore"));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const out = { headerSha: headerSha(fileURLToPath(import.meta.url)) };
function x1(name, tbl) {
  const items = Object.entries(tbl).map(([c, v]) => ({ c, g: grp(c), a: v.auc })), s = items.filter((x) => x.g === "SOV").map((x) => x.a), r = items.filter((x) => x.g !== "SOV").map((x) => x.a);
  const obs = med(s) - med(r); let ge = 0; for (let b = 0; b < 5000; b++) { const lab = shuffle(items.map((x) => x.g === "SOV")), a = items.filter((_, i) => lab[i]).map((x) => x.a), c = items.filter((_, i) => !lab[i]).map((x) => x.a); if (med(a) - med(c) >= obs - 1e-12) ge++; }
  const groups = {}; for (const x of items) (groups[x.g] ??= []).push(x.a);
  out[name] = { nSOV: s.length, nRest: r.length, medSOV: round(med(s)), medRest: round(med(r)), diff: round(obs), p: round((ge + 1) / 5001), groups: Object.fromEntries(Object.entries(groups).map(([g, v]) => [g, { n: v.length, med: round(med(v)), min: round(Math.min(...v)), max: round(Math.max(...v)) }])), sovList: items.filter((x) => x.g === "SOV").map((x) => `${x.c}:${x.a}`), restBelow50: items.filter((x) => x.g !== "SOV" && x.a < 0.5).map((x) => `${x.c}:${x.a}`) };
}
x1("X1_fresh", fresh); x1("X1_replicate", repl);
const both = Object.keys(fresh).filter((c) => repl[c]), a = both.map((c) => fresh[c].auc), b = both.map((c) => repl[c].auc), rho = spear(a, b); let ge = 0; for (let k = 0; k < 5000; k++) { if (spear(a, shuffle(b.slice())) >= rho - 1e-12) ge++; }
out.X2 = { n: both.length, rho: round(rho), p: round((ge + 1) / 5001), pairs: both.map((c) => `${c}:${fresh[c].auc}|${repl[c].auc}`) };
const sg = (c) => c.sign; out.X3 = { posBoth: both.filter((c) => sg(fresh[c]) === "POS" && sg(repl[c]) === "POS"), flatOrNegBoth: both.filter((c) => sg(fresh[c]) !== "POS" && sg(repl[c]) !== "POS"), discordant: both.filter((c) => (sg(fresh[c]) === "POS") !== (sg(repl[c]) === "POS")) };
const ircRows = fs.readFileSync(path.join(HERE, "results", "irc.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const ircFull = ircRows.find((r) => r.reg === "irc-en-fresh" && r.def === "NK" && r.mode === "FULL" && r.ctl === "real");
out.X4 = { ircStrata: ircFull.strata, ircPairs: ircFull.pairs };
const P = V.FRESH.irc.primary; out.X4.ircPrimary = { auc: P.auc, pInit: P.pInit, invLen: P.invLen, pFinalX: P.pFinalX };
out.X5 = { novels: [...V.FRESH.book.cells.map((c) => ({ tier: "FRESH", reg: c.reg, auc: c.auc, lo: c.lo, hi: c.hi, causal: c.causal, delta: c.delta })), ...V.REPLICATE.book.cells.map((c) => ({ tier: "REPLICATE", reg: c.reg, auc: c.auc, lo: c.lo, hi: c.hi, causal: c.causal, delta: c.delta }))] };
out.X5.median = round(med(out.X5.novels.map((n) => n.auc))); out.X5.nPos = out.X5.novels.filter((n) => n.auc >= 0.55 && n.lo > 0.5).length; out.X5.n = out.X5.novels.length;
fs.writeFileSync(path.join(HERE, "results", "explore.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));

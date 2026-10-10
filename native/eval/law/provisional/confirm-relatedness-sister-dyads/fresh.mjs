// eval/law/provisional/confirm-relatedness-sister-dyads/fresh.mjs — shared helpers of this confirmation (data location, fresh windows, cache I/O). NEW FILE; imports, edits nothing.
// It carries no test and no pre-registration of its own: every script that computes an AUC (confirm.mjs) carries its own frozen header.
// Env NAME_COMPANY_PAIRBLOCK=1 is required BEFORE node starts (the scoper's lib.mjs / name-company.mjs read it at import).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readConllu, packRow, unpackRow, ARMS, pairsOf, rngFor, seedFor, shuffleIn, sha256, round, mean, quantile, fitProbe, pairSample, aucOn, aucOf } from "../family-vs-relatedness/lib.mjs";
export { ARMS, pairsOf, rngFor, seedFor, shuffleIn, sha256, round, mean, quantile, fitProbe, pairSample, aucOn, aucOf };

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DATA_UD = "/Users/mlacy/Documents/data/ud";          // full UD tree (train/dev/test) — the scoper read only /private/tmp/claude-501/ud-eval dev + test
export const UD_EVAL = "/private/tmp/claude-501/ud-eval";          // the scoper's dev/test files: read here ONLY to hash sentence text for de-duplication
export const WINDOW_UNITS = 40000;                                 // word units per fresh window (whole file when smaller)

/** roster stem -> data/ud treebank directory (the 52-stem roster of the scoper's groups.mjs, those with a train split in data/ud). */
export const TB = {
  afr: "af_afribooms", arb: "ar_padt", bul: "bg_btb", cat: "ca_ancora", ces: "cs_pdt", cmn: "zh_gsd", cym: "cy_ccg", dan: "da_ddt", deu: "de_gsd", eng: "en_ewt", est: "et_edt",
  eus: "eu_bdt", fas: "fa_seraji", fin: "fi_tdt", fra: "fr_gsd", gle: "ga_idt", glg: "gl_treegal", heb: "he_htb", hin: "hi_hdtb", hrv: "hr_set", hun: "hu_szeged", hye: "hy_armtdp",
  ind: "id_gsd", ita: "it_isdt", jpn: "ja_gsd", kat: "ka_glc", kor: "ko_gsd", lav: "lv_lvtb", lit: "lt_alksnis", lzh: "lzh_kyoto", mlt: "mt_mudt", nld: "nl_alpino", nob: "no_bokmaal",
  pol: "pl_pdb", por: "pt_bosque", ron: "ro_rrt", rus: "ru_syntagrus", slk: "sk_snk", slv: "sl_ssj", spa: "es_gsd", srp: "sr_set", swe: "sv_talbanken", tam: "ta_ttb", tur: "tr_imst",
  uig: "ug_udt", ukr: "uk_iu", urd: "ur_udtb", vie: "vi_vtb", wol: "wo_wtb",
};
/** EXTENSION targets: languages outside the scoper's roster (never donors, never in a control mean). stem -> [treebank, genus, sub-branch cluster]. */
export const EXT = { bel: ["be_hse", "Slavic", "ESl"], isl: ["is_icepahc", "Germanic", "NGm"], fao: ["fo_farpahc", "Germanic", "NGm"] };
export const trainFileOf = (tb) => { const d = path.join(DATA_UD, tb), fs_ = fs.readdirSync(d).filter((f) => /-ud-train.*\.conllu$/.test(f)).sort(); return fs_.length ? path.join(d, fs_[0]) : null; };

/** hash set of the scoper's dev+test sentence texts for a stem (for exact-text de-duplication of the fresh window). */
export function evalTextSet(stem) {
  const set = new Set();
  for (const sp of ["dev", "test"]) { const p = path.join(UD_EVAL, stem, `${sp}.conllu`); if (fs.existsSync(p)) for (const s of readConllu(p).sents) set.add(s.join(" ")); }
  return set;
}
const OPEN = new Set(["NOUN", "VERB", "ADJ"]);
/** fresh document for a stem: de-duplicated (against the scoper's dev/test text and against itself), windowed, optionally within-sentence shuffled. Returns {doc, meta}. */
export function freshDoc(stem, tb, shuffled = false, attempt = 0) {
  const file = trainFileOf(tb); if (!file) return null;
  const { sents: S0, upos: U0 } = readConllu(file), ev = evalTextSet(stem), seen = new Set(), sents = [], upos = []; let removedEval = 0, removedDup = 0;
  S0.forEach((s, k) => { const t = s.join(" "); if (ev.has(t)) { removedEval++; return; } if (seen.has(t)) { removedDup++; return; } seen.add(t); sents.push(s); upos.push(U0[k]); });
  const total = sents.reduce((a, s) => a + s.length, 0), pre = [0]; sents.forEach((s) => pre.push(pre[pre.length - 1] + s.length));
  let a = 0, b = sents.length;
  if (total > WINDOW_UNITS) {
    const last = pre.findIndex((x) => x > total - WINDOW_UNITS), rnd = rngFor(seedFor("conf-rel-sister", stem, attempt ? `window${attempt}` : "window"));
    a = Math.floor(rnd() * Math.max(1, last)); b = a; while (b < sents.length && pre[b] - pre[a] < WINDOW_UNITS) b++;
  }
  let ws = sents.slice(a, b), wu = upos.slice(a, b);
  if (shuffled) { const rnd = rngFor(seedFor("conf-rel-sister", stem, "shuffle")); const idx = ws.map((s) => shuffleIn(s.map((_, i) => i), rnd)); ws = ws.map((s, k) => idx[k].map((j) => s[j])); wu = wu.map((u, k) => idx[k].map((j) => u[j])); }
  const n = ws.length;
  return { doc: { name: stem, stream: ws, cls: (s, i) => (wu[s][i] === "PROPN" ? "P" : OPEN.has(wu[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) },
    meta: { stem, treebank: tb, file: path.relative(DATA_UD, file), sentencesInFile: S0.length, removedAsEvalText: removedEval, removedAsDuplicate: removedDup, attempt, windowStart: a, windowEnd: b, sentences: n, units: pre[b] - pre[a], wholeFile: total <= WINDOW_UNITS } };
}

export const cacheFile = (stem, stratum, tag = "") => path.join(HERE, "data", "cache", `${stem}.${stratum}${tag}.json`);
const oh = (n, k) => { const v = new Array(k).fill(0); v[Math.min(n, k - 1)] = 1; return v; };
/** cached language/stratum as {pairs, rows, y, block, X:{BOTH,LEFT,POSITION}} or null (same shape as the scoper's loadLang). */
export function loadFresh(stem, stratum, tag = "") {
  const p = cacheFile(stem, stratum, tag); if (!fs.existsSync(p)) return null;
  const j = JSON.parse(fs.readFileSync(p, "utf8")), rows = j.rows.map(unpackRow), X = {};
  for (const a of ["BOTH", "LEFT", "POSITION"]) X[a] = rows.map((r) => ARMS[a](r.f));
  return { stem, stratum, pairs: j.pairs, dropped: j.dropped, rows, y: rows.map((r) => r.y), block: rows.map((r) => r.block), X };
}
export { packRow, readConllu };

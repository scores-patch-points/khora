// attack-relatedness-romance-set/atk-bx-build.mjs — DATA PREPARATION ONLY (windows and pair counts; no probe, no AUC): builds two NEW fresh sample sets X and Y of UD TRAIN text that are DISJOINT from the
// confirmer's contiguous windows A and B (and Y disjoint from X), for the re-derivation of the scope (attack B). AMENDMENT (before any AUC was computed on X or Y): the first version also excluded the ten
// chunks of set C, which left only 9 languages with a 30k window; C's chunks are therefore NOT excluded, and the token overlap of X and Y with C is measured and reported. Same pipeline as the rule: split syntactic words, PUNCT dropped, name-company coarse matching, FIRST stratum.
//   NAME_COMPANY_PAIRBLOCK=1 node atk-bx-build.mjs <stem,stem,...|roster>
import fs from "node:fs";
import path from "node:path";
import { HERE, CONF, readRaw, keepOf, docOf, trainFile, pairsOf, rs } from "./atk-lib.mjs";
import { withExtras, balance, packX } from "./atk-pairs.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";

export const W = 30000;
const endFor = (cum, s, w) => { const N = cum.length - 1; if (cum[N] - cum[s] < w) return -1; let lo = s + 1, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] - cum[s] >= w) hi = m; else lo = m + 1; } return lo; };
/** sentence-index ranges (in keep-index space) used by the confirmer for this language: A, B (one range each), C (ten chunks). */
function forbiddenOf(stem) {
  const meta = JSON.parse(fs.readFileSync(path.join(CONF, "cache", "meta", `${stem}.json`), "utf8")), f = [];
  for (const s of ["A", "B"]) { const m = meta[s]; if (m) f.push(m.sentenceRange); }
  return f;
}
const free = (s, e, forb) => forb.every(([a, b]) => e <= a || s >= b);
const cRanges = (stem) => { const m = JSON.parse(fs.readFileSync(path.join(CONF, "cache", "meta", `${stem}.json`), "utf8")).C; return m ? m.sentenceRange : []; };
const overlapSents = (s, e, rr) => rr.reduce((t, [a, b]) => t + Math.max(0, Math.min(e, b) - Math.max(s, a)), 0);
if (process.argv[1].endsWith("atk-bx-build.mjs")) {
  const arg = process.argv[2], stems = arg === "roster" ? STEMS : (arg || "").split(",").filter(Boolean);
  if (!stems.length || stems.includes("run")) throw new Error("usage: node atk-bx-build.mjs <stem,..|roster>");
  const OUT = path.join(HERE, "cache-atk"); fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
  for (const stem of stems) {
    const t0 = Date.now(), file = trainFile(stem); if (!fs.existsSync(file)) { console.error(`${stem}: no train file`); continue; }
    const raw = readRaw(file), { keep, cum } = keepOf(stem, raw), forb = forbiddenOf(stem), rep = { stem, tokens: cum[cum.length - 1] }, N = keep.length;
    for (const set of ["X", "Y"]) {
      const valid = []; for (let s = 0; s < N; s++) { const e = endFor(cum, s, W); if (e < 0) break; if (free(s, e, forb)) valid.push(s); }
      if (!valid.length) { rep[set] = null; continue; }
      const r = rs("window", set, stem), s0 = valid[Math.floor(r() * valid.length)], e0 = endFor(cum, s0, W); forb.push([s0, e0]);
      const sents = keep.slice(s0, e0).map((i) => raw[i]), doc = docOf(stem, sents, {}), pr = pairsOf(doc, "FIRST", rs("pairs", "V0M0", set, stem, "real")), rows = withExtras(doc, pr.rows);
      fs.mkdirSync(path.join(OUT, set, "V0M0"), { recursive: true });
      fs.writeFileSync(path.join(OUT, set, "V0M0", `${stem}.FIRST.json`), JSON.stringify({ stem, set, variant: "V0M0", range: [s0, e0], pairs: pr.pairs, dropped: pr.dropped, balance: balance(rows), rows: rows.map(packX) }));
      rep[set] = { range: [s0, e0], sentences: e0 - s0, pairs: pr.pairs, validStarts: valid.length, overlapWithC: Number((overlapSents(s0, e0, cRanges(stem)) / (e0 - s0)).toFixed(3)) };
    }
    console.error(`${stem} ${JSON.stringify(rep)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}

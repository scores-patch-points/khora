// attack-relatedness-romance-set/atk-build.mjs — DATA PREPARATION ONLY (counts and balance, no probe, no AUC). Re-derives the confirmer's windows A/B/C from raw CoNLL-U and builds matched-pair
// rows under the attack variants (tokenisation x matching), writing cache-atk/<set>/<variant>/<stem>.<stratum>[.shuf].json with packed rows + extras.
//   NAME_COMPANY_PAIRBLOCK=1 node atk-build.mjs <stem,stem,...|roster> [sets=A,B,C] [variants=V0M0,V0M1,...]
// VARIANTS  tokenisation: V0 = confirmer (split syntactic words, gold PUNCT dropped); V1 = surface tokens (multiword tokens unsplit), PUNCT dropped; V2 = split words, PUNCT kept as tokens;
//           V3 = surface tokens and PUNCT kept (closest to raw text). matching: M0 = name-company coarse key; M1 = strict (count +-1, chars +-1, index exact <=3 else +-2, sentence length +-2, greedy nearest);
//           M2 = M1 plus sentence index within +-60 (local time). F3 = M0 with candidates of >= 3 characters (the reader's figure floor); R2 = M0 with candidates whose form occurs >= 2 times (recurrence floor).
import fs from "node:fs";
import path from "node:path";
import { HERE, CONF, readRaw, confWindow, docOf, trainFile, pairsOf, rs, rngFor, seedFor, packRow } from "./atk-lib.mjs";
import { strictPairs, withExtras, balance, packX, stats } from "./atk-pairs.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";

const M1 = { dc: 1, dl: 1, di: 2, dsl: 2, ds: null }, M2 = { ...M1, ds: 60 };
export const VARIANTS = {
  V0M0: { tok: {}, m: "coarse" }, V0M1: { tok: {}, m: M1 }, V0M2: { tok: {}, m: M2 }, V1M0: { tok: { surface: true }, m: "coarse" }, V2M0: { tok: { punct: true }, m: "coarse" },
  V3M0: { tok: { surface: true, punct: true }, m: "coarse" }, V3M1: { tok: { surface: true, punct: true }, m: M1 }, F3: { tok: {}, m: "coarse", minLen: 3 }, R2: { tok: {}, m: "coarse", minCount: 2 },
  // POST-HOC (added after attack A's first results): V4 = surface tokens + punctuation removed by a SURFACE rule (no letter and no digit), i.e. no gold label at all; V5 = split words + surface-rule punctuation removal.
  V4M0: { tok: { surface: true, punct: "surface" }, m: "coarse" }, V4M1: { tok: { surface: true, punct: "surface" }, m: M1 }, V5M0: { tok: { punct: "surface" }, m: "coarse" },
};
export const SHUF_VARIANTS = ["V0M0", "V0M1", "V3M0", "V3M1", "V4M1"];
const OUT = path.join(HERE, "cache-atk");
const outPath = (set, v, stem, st, shuf) => path.join(OUT, set, v, `${stem}.${st}${shuf ? ".shuf" : ""}.json`);
function filtered(doc, v) {
  if (!v.minLen && !v.minCount) return doc;
  const st = stats(doc.stream), base = doc.cls;
  return { ...doc, cls: (s, i) => { const c = base(s, i); if (!c) return null; const w = doc.stream[s][i]; if (v.minLen && [...w].length < v.minLen) return null; if (v.minCount && st.count.get(w) < v.minCount) return null; return c; } };
}
function build(stem, set, sents, vname, shuf, log) {
  const v = VARIANTS[vname], doc = filtered(docOf(stem, sents, v.tok, shuf, `${set}${vname}`), v), st = "FIRST";
  let pr;
  if (v.m === "coarse") {
    const r = vname === "V0M0" && !shuf ? rngFor(seedFor("conf-rel", "pairs", set, stem, "real")) : rs("pairs", vname, set, stem, shuf ? "shuf" : "real");
    if (vname === "V0M0" && !shuf) pairsOf(doc, "LATER", r);       // the confirmer consumed the LATER draws first
    pr = pairsOf(doc, st, r); pr = { ...pr, rows: withExtras(doc, pr.rows) };
  } else pr = strictPairs(doc, st, rs("pairs", vname, set, stem, shuf ? "shuf" : "real"), 600, v.m);
  fs.mkdirSync(path.dirname(outPath(set, vname, stem, st, shuf)), { recursive: true });
  fs.writeFileSync(outPath(set, vname, stem, st, shuf), JSON.stringify({ stem, set, variant: vname, shuf, pairs: pr.pairs, dropped: pr.dropped, balance: balance(pr.rows), rows: pr.rows.map(packX) }));
  log[`${vname}${shuf ? "s" : ""}`] = pr.pairs; return pr;
}
function verifyV0(stem, set, pr) {
  const theirs = JSON.parse(fs.readFileSync(path.join(CONF, "cache", set, `${stem}.FIRST.json`), "utf8")).rows, mine = pr.rows.map(packRow);
  return mine.length === theirs.length && mine.every((a, i) => a.every((x, k) => x === theirs[i][k]));
}
if (process.argv[1].endsWith("atk-build.mjs")) {
  const arg = process.argv[2], stems = arg === "roster" ? STEMS : (arg || "").split(",").filter(Boolean), sets = (process.argv[3] || "A,B,C").split(","), vs = (process.argv[4] || Object.keys(VARIANTS).join(",")).split(",");
  if (!stems.length || stems.includes("run")) throw new Error("usage: node atk-build.mjs <stem,..|roster> [A,B,C] [variants]");
  for (const stem of stems) {
    const t0 = Date.now(), file = trainFile(stem); if (!fs.existsSync(file)) { console.error(`${stem}: no train file`); continue; }
    const raw = readRaw(file), rep = { stem, sets: {} };
    for (const set of sets) {
      const w = confWindow(stem, set, raw); if (!w) { rep.sets[set] = null; continue; }
      const log = { hashOk: w.ok, sentences: w.sents.length }; rep.sets[set] = log;
      for (const vn of vs) { const pr = build(stem, set, w.sents, vn, false, log); if (vn === "V0M0") log.identicalToConfirmer = verifyV0(stem, set, pr); if (SHUF_VARIANTS.includes(vn)) build(stem, set, w.sents, vn, true, log); }
    }
    console.error(`${stem} ${JSON.stringify(rep)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}

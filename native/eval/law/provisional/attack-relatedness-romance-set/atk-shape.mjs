// attack-relatedness-romance-set/atk-shape.mjs — DESCRIPTIVE ONLY (no test, no threshold, no AUC): where in the slots does a proper noun's first-mention company differ from its matched open-class word, per language class?
//   NAME_COMPANY_PAIRBLOCK=1 node atk-shape.mjs   -> results/shape.json and a printed table. Written after attacks A/B/C were read (disclosed); used only to describe the shape behind the Romance/Germanic bonus.
// ═══ PRE-REGISTRATION (descriptive; no hypothesis is tested) ═══════════════════════════════════════════════════════════════════════════════════════════
// Rows: V0M0 FIRST pairs of sample sets A, B, C. Classes R (cat fra ita por spa), G (afr dan deu eng nld nob swe), S (Slavic), O (the rest). Slots L1 and R1: share of positives and of matched negatives in each rank bin
// (0 = the commonest form, 1 = ranks 2-3, 2 = ranks 4-7, 3 = ranks 8-15, ..., 11 = rare/unseen, 12 = sentence edge). Reported: log-odds (positive vs negative) per bin pooled by class, and the same per language for the biggest bins.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { HERE, ROM, GER } from "./atk-lib.mjs";
import { loadRoster, round } from "./atk-eval.mjs";
import { SLA, OTH } from "./atk-b.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
const am = (v) => v.indexOf(Math.max(...v)), PRIM = ["cat", "fra", "ita", "por", "spa"], cls = { R: PRIM, G: GER, S: SLA, O: OTH }, out = {};
for (const [cn, ts] of Object.entries(cls)) {
  const cnt = { L1: [Array(13).fill(0), Array(13).fill(0)], R1: [Array(13).fill(0), Array(13).fill(0)], L2: [Array(13).fill(0), Array(13).fill(0)], R2: [Array(13).fill(0), Array(13).fill(0)] };
  for (const set of ["A", "B", "C"]) { const langs = loadRoster(set, "V0M0", ts, false, ["BOTH"]); for (const L of Object.values(langs)) for (const r of L.rows) for (const k of Object.keys(cnt)) cnt[k][r.y ? 0 : 1][am(r.f[k])]++; }
  out[cn] = {}; for (const k of Object.keys(cnt)) { const np = cnt[k][0].reduce((a, b) => a + b, 0), nn = cnt[k][1].reduce((a, b) => a + b, 0); out[cn][k] = cnt[k][0].map((c, b) => ({ bin: b, pos: round(c / np, 3), neg: round(cnt[k][1][b] / nn, 3), logOdds: round(Math.log(((c + 0.5) / np) / ((cnt[k][1][b] + 0.5) / nn)), 2) })); out[cn][k].n = [np, nn]; }
}
fs.writeFileSync(path.join(HERE, "results", "shape.json"), JSON.stringify(out, null, 1));
for (const k of ["L1", "R1"]) for (const cn of Object.keys(out)) console.log(`${k} ${cn} n=${out[cn][k].n}: ` + out[cn][k].filter((x) => Math.abs(x.logOdds) >= 0.25 || x.pos >= 0.08 || x.neg >= 0.08).map((x) => `b${x.bin} ${x.pos}/${x.neg} (${x.logOdds > 0 ? "+" : ""}${x.logOdds})`).join("  "));

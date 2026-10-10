// attack-relatedness-romance-set/atk-a2.mjs — ATTACK A, POST-HOC EXTENSION: tokenisations that use NO gold label at all. NAME_COMPANY_PAIRBLOCK=1 node atk-a2.mjs <A|B|C>  |  node atk-a2.mjs sum
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written AFTER the results of atk-a.mjs were read, so every statement below about V4/V5 is POST-HOC / DIAGNOSTIC, not a confirmatory test) ═══════════════════════════
// DISCLOSURE. Seen: all of attack A (V0M0..R2, results/A-summary.json): in the rule's own pipeline Romance donors beat Germanic donors by only +0.028; with surface tokens (V1) the Romance bonus a - e falls from 0.083
//   to 0.0755, with PUNCT tokens kept (V2, V3) the AUC falls (a 0.675 -> 0.654 / 0.634) and with surface tokens plus strict matching (V3M1) a - g is +0.006. The confound between "treebank gold label used" and "punctuation
//   tokens present" is NOT separated by A: V0/V1 use the gold PUNCT label to delete punctuation, V2/V3 keep punctuation as tokens. This extension separates them.
// VARIANTS (atk-build.mjs): V5M0 = syntactic split words (as the rule) with punctuation removed by a SURFACE rule (a token with no letter and no digit is punctuation: no gold label);
//   V4M0 = surface tokens (multiword tokens unsplit) + surface-rule punctuation removal; V4M1 = V4M0 with strict matching (the closest to a gold-free reader that still matches on position/length/frequency);
//   V0M0 and V1M0 are re-run as in-script references. Everything else as atk-a.mjs (windows A/B/C, FIRST, BOTH, fresh-window donors, K=3 x 100 pairs, 20 draws, pools a/g/o/e, pair-flip q95).
// QUESTIONS (not pass/fail thresholds because post-hoc; the descriptive criteria are fixed here): (Q1) does the gold PUNCT label matter: |a - e|[V5M0] - [V0M0]| <= 0.01 => no. (Q2) is the rule's Romance bonus present in the gold-free
//   reader V4M1: a - e >= 0.05 with a lower language-bootstrap bound > 0 => present; (Q3) is relatedness beyond Germanic present there: a - g >= 0.03 => present, else absent.
// BLIND PREDICTIONS (written after attack A, so they carry less weight): V5M0 within 0.01 of V0M0 on a and on a - e (the label only removes tokens a surface rule also removes); V4M0 within 0.01 of V1M0; V4M1 a - e 0.065 (0.05-0.08),
//   a - g 0.015 (-0.01 to 0.04) i.e. Q2 present, Q3 absent.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, ROM, GER } from "./atk-lib.mjs";
import { loadRoster, tripleAuc, boot, round, mean } from "./atk-eval.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
import { headerHash } from "../family-vs-relatedness/lib.mjs";

const SELF = fileURLToPath(import.meta.url), VARS2 = ["V0M0", "V1M0", "V5M0", "V4M0", "V4M1"], SHUF2 = ["V4M1"], PRIMARY = ["cat", "fra", "ita", "por", "spa"];
if (process.argv[1] === SELF && ["A", "B", "C"].includes(process.argv[2])) {
  const set = process.argv[2], out = { set, headerSha256: headerHash(SELF), variants: {} }, t0 = Date.now();
  for (const v of VARS2) {
    const langs = loadRoster(set, v, STEMS, false, ["BOTH", "POSITION"]), shufs = SHUF2.includes(v) ? loadRoster(set, v, [...ROM, ...GER], true, ["BOTH"]) : {}, rec = out.variants[v] = {};
    for (const T of [...ROM, ...GER]) {
      const L = langs[T]; if (!L || L.pairs < 60) { rec[T] = { pairs: L ? L.pairs : 0, thin: true }; continue; }
      const own = ROM.includes(T) ? ROM : GER, other = ROM.includes(T) ? GER : ROM, rest = STEMS.filter((s) => !ROM.includes(s) && !GER.includes(s)), tag = (p) => `${set}|${v}|${p}`;
      const a = tripleAuc(T, L, own, langs, ["BOTH", "POSITION"], tag("a"), 20, shufs[T] ?? null, true), g = tripleAuc(T, L, other, langs, ["BOTH"], tag("g")), e = tripleAuc(T, L, [...other, ...rest], langs, ["BOTH"], tag("e"));
      rec[T] = { pairs: L.pairs, a: a && { auc: round(a.means.BOTH), pos: round(a.means.POSITION), shuf: round(a.shuf), q95: round(a.q95) }, g: g && { auc: round(g.means.BOTH) }, e: e && { auc: round(e.means.BOTH) } };
    }
    console.error(`${set} ${v} ${PRIMARY.map((t) => `${t}:${rec[t]?.a?.auc}/${rec[t]?.e?.auc}/${rec[t]?.g?.auc}`).join(" ")} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  fs.writeFileSync(path.join(HERE, "results", `A2-${set}.json`), JSON.stringify(out, null, 1));
} else if (process.argv[1] === SELF && process.argv[2] === "sum") {
  const R = ["A", "B", "C"].map((s) => JSON.parse(fs.readFileSync(path.join(HERE, "results", `A2-${s}.json`), "utf8"))), res = { headerSha256: headerHash(SELF), variants: {} };
  const tab = (targets, v) => { const per = targets.map((t) => { const rows = R.map((r) => r.variants[v][t]).filter((x) => x && !x.thin && x.a && x.e && x.g); return rows.length ? { t, a: mean(rows.map((x) => x.a.auc)), g: mean(rows.map((x) => x.g.auc)), e: mean(rows.map((x) => x.e.auc)), pos: mean(rows.map((x) => x.a.pos)), shuf: rows.some((x) => x.a.shuf != null) ? mean(rows.filter((x) => x.a.shuf != null).map((x) => x.a.shuf)) : null, n: rows.length, pass: rows.filter((x) => x.a.auc >= 0.6 && x.a.auc > x.a.q95 && x.a.auc - x.e.auc >= 0.05).length } : null; }).filter(Boolean);
    return { n: per.length, a: round(mean(per.map((x) => x.a))), g: round(mean(per.map((x) => x.g))), e: round(mean(per.map((x) => x.e))), aMinusE: boot(per.map((x) => x.a - x.e)), aMinusG: boot(per.map((x) => x.a - x.g)), pos: round(mean(per.map((x) => x.pos))), shuf: per.some((x) => x.shuf != null) ? round(mean(per.filter((x) => x.shuf != null).map((x) => x.shuf))) : null, pass: `${per.reduce((s, x) => s + x.pass, 0)}/${per.reduce((s, x) => s + x.n, 0)}`, perLanguage: Object.fromEntries(per.map((x) => [x.t, { a: round(x.a), g: round(x.g), e: round(x.e) }])) }; };
  for (const v of VARS2) res.variants[v] = { primary: tab(PRIMARY, v), secondary: tab(["glg", "ron"], v), germanic: tab(GER, v) };
  const d = (v, k) => res.variants[v].primary[k];
  res.Q1 = { aMinusE_V5minusV0: round(d("V5M0", "aMinusE").mean - d("V0M0", "aMinusE").mean), a_V5minusV0: round(d("V5M0", "a") - d("V0M0", "a")) }; res.Q2 = { aMinusE: d("V4M1", "aMinusE") }; res.Q3 = { aMinusG: d("V4M1", "aMinusG") };
  fs.writeFileSync(path.join(HERE, "results", "A2-summary.json"), JSON.stringify(res, null, 1));
  for (const v of VARS2) for (const g of ["primary", "secondary", "germanic"]) { const p = res.variants[v][g]; console.log(`${v} ${g.padEnd(9)} n${p.n} pass ${p.pass} a ${p.a} g ${p.g} e ${p.e} a-e ${p.aMinusE.mean} [${p.aMinusE.lo},${p.aMinusE.hi}] a-g ${p.aMinusG.mean} [${p.aMinusG.lo},${p.aMinusG.hi}] pos ${p.pos} shuf ${p.shuf}`); }
  console.log(JSON.stringify({ Q1: res.Q1, Q2: res.Q2, Q3: res.Q3 }));
}

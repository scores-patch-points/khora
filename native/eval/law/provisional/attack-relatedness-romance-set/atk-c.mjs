// attack-relatedness-romance-set/atk-c.mjs — ATTACK C (COUNT RIVAL) on rule "relatedness-romance-set": does a cheaper observable reproduce the company probe, or its Romance bonus, on the SAME rows?
//   NAME_COMPANY_PAIRBLOCK=1 node atk-c.mjs <A|B|C>     writes results/C-<set>.json      |      node atk-c.mjs sum     pools the three sets, applies the thresholds below, writes results/C-summary.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first AUC of this file was computed) ═══════════════════════════════════════════════════
// DISCLOSURE. As atk-a.mjs: the confirmer's cell numbers and post-hoc E2-E4 text; the V0M0 rows rebuilt byte-identical to the confirmer's cache (so "the SAME rows" is literal). Seen of this attack's own: nothing. Seen of
//   attack A: the first line of V0M0 per-target means (a, e, g) of the three sets (Germanic donors sit close to Romance donors; e is lower). Not seen: any AUC of any rival arm.
// DATA. FIRST stratum rows of the confirmer's windows A, B, C (V0M0), all languages; targets cat fra glg ita por ron spa (Romance) and afr dan deu eng nld nob swe (Germanic); donors = the same windows' other languages
//   (>= 100 pairs); pools a (same genus), g (the other of Romance/Germanic), e (not the target's genus); K=3 donors x 100 pairs, 20 seeded draws; EVERY ARM IS FITTED ON THE SAME TRIPLES AND SCORED ON THE SAME TARGET ROWS.
// ARMS (all computed from the rank-bin slots and the matched-out rivals; none uses caps, POS, strings, lists, speaker): BOTH (the rule: 52 features); RIVAL ARMS fitted as ridge-logistic probes on the same donors:
//   POSITION, CHARLEN, FREQ, RIVALS (all matched out: they must sit near 0.50, and are the leak check of the matching on the SAME rows; the rule's confirmation checked only POSITION); NBRMEAN (2 features: mean rank bin of the
//   neighbours present, number of edges); NBRRARE (number of neighbours with bin >= 10, edges); FUNC (number of neighbours among the 3 and the 15 commonest forms, edges); ADJ (one-hot left-1 and right-1: adjacent only);
//   DIST2 (one-hot left-2 and right-2); LEFT1 (one-hot left-1); BAG (order-free: mean rank bin and rare fraction of the OTHER tokens of the same sentence); BOTH+BAG; BOTH+RIVALS.
//   FIXED SCORES (no donors, no fitting; direction fixed here in advance: names keep RARER company): FIX_RARE = mean rank bin of the neighbours present; FIX_NOFUNC = minus the number of neighbours among the 15 commonest forms.
// TESTS (thresholds fixed; SESOI 0.03 as the rule's own family; pooled over the primary targets cat fra ita por spa and the three sets, language-level means):
//   C1 LEVEL. A rival REPRODUCES THE LEVEL iff mean AUC(a-pool) >= AUC(BOTH, a-pool) - 0.03.
//   C2 BONUS. A rival REPRODUCES THE BONUS iff (a - e)(rival) >= (a - e)(BOTH) - 0.03 AND (a - e)(rival) >= 0.05.
//   C3 MATCHING LEAK. If any of POSITION CHARLEN FREQ RIVALS has mean AUC(a-pool) outside [0.45, 0.55] the matching leaks that variable (reported with its size).
//   C4 CHEAP-PLUS. BOTH+BAG - BOTH >= 0.01 would mean sentence composition adds beyond the company slots (reported).
//   ATTACK SUCCEEDS iff some arm with <= 4 parameters (NBRMEAN NBRRARE FUNC BAG FIX_*) reproduces the level (C1) or the bonus (C2); or ADJ reproduces both (then the rule's 52-slot company is not needed).
// BLIND PREDICTIONS (primary, pooled a-pool AUC): BOTH 0.68; POSITION 0.50 (0.49-0.51), CHARLEN 0.50 (0.48-0.53), FREQ 0.52 (0.50-0.56), RIVALS 0.53 (0.50-0.57); NBRMEAN 0.60 (0.55-0.64); NBRRARE 0.59; FUNC 0.60;
//   BAG 0.56 (0.53-0.60); ADJ 0.66 (0.63-0.68); DIST2 0.60; LEFT1 0.60; BOTH+BAG 0.685; FIX_RARE 0.60 (0.55-0.64). No <=4-parameter rival within 0.03 of BOTH; their (a - e) <= 0.02. ADJ reproduces the level with p = 0.5
//   and the bonus with p = 0.5. Thresholds may be tightened after seeing discovery data, never loosened.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, ROM, GER } from "./atk-lib.mjs";
import { loadRoster, tripleAuc, ARM2, boot, round, mean, aucOf } from "./atk-eval.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
import { headerHash } from "../family-vs-relatedness/lib.mjs";

const SELF = fileURLToPath(import.meta.url), PRIMARY = ["cat", "fra", "ita", "por", "spa"];
const ARMS_C = ["BOTH", "POSITION", "CHARLEN", "FREQ", "RIVALS", "NBRMEAN", "NBRRARE", "FUNC", "ADJ", "DIST2", "LEFT1", "BAG", "BOTH+BAG", "BOTH+RIVALS"], SMALL = ["NBRMEAN", "NBRRARE", "FUNC", "BAG", "FIX_RARE", "FIX_NOFUNC"];
const fixed = (L) => ({ FIX_RARE: aucOf(L.rows.map((r) => ARM2.NBRMEAN(r.f)[0]), L.y), FIX_NOFUNC: aucOf(L.rows.map((r) => -ARM2.FUNC(r.f)[1]), L.y) });
if (process.argv[1] === SELF && ["A", "B", "C"].includes(process.argv[2])) {
  const set = process.argv[2], langs = loadRoster(set, "V0M0", STEMS, false, ARMS_C), out = { set, headerSha256: headerHash(SELF), targets: {} }, t0 = Date.now();
  for (const T of [...ROM, ...GER]) {
    const L = langs[T]; if (!L || L.pairs < 60) { out.targets[T] = { thin: true, pairs: L ? L.pairs : 0 }; continue; }
    const own = ROM.includes(T) ? ROM : GER, other = ROM.includes(T) ? GER : ROM, rest = STEMS.filter((s) => !ROM.includes(s) && !GER.includes(s)), tag = (p) => `${set}|C|${p}`;
    const pick = (r) => r && Object.fromEntries(Object.entries(r.means).map(([k, v]) => [k, round(v)]));
    out.targets[T] = { pairs: L.pairs, a: pick(tripleAuc(T, L, own, langs, ARMS_C, tag("a"))), g: pick(tripleAuc(T, L, other, langs, ARMS_C, tag("g"))), e: pick(tripleAuc(T, L, [...other, ...rest], langs, ARMS_C, tag("e"))), fixed: Object.fromEntries(Object.entries(fixed(L)).map(([k, v]) => [k, round(v)])) };
    console.error(`${set} ${T} ${JSON.stringify(out.targets[T].a)} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  fs.mkdirSync(path.join(HERE, "results"), { recursive: true }); fs.writeFileSync(path.join(HERE, "results", `C-${set}.json`), JSON.stringify(out, null, 1));
} else if (process.argv[1] === SELF && process.argv[2] === "sum") {
  const R = ["A", "B", "C"].map((s) => JSON.parse(fs.readFileSync(path.join(HERE, "results", `C-${s}.json`), "utf8"))), res = { headerSha256: headerHash(SELF), arms: {}, groups: {} };
  for (const [gname, targets] of [["romance", PRIMARY], ["romanceAll7", ROM], ["germanic", GER]]) {
    const per = (pool, arm) => targets.map((t) => { const v = R.map((r) => (r.targets[t]?.thin ? null : r.targets[t]?.[pool]?.[arm])).filter((x) => x != null); return v.length ? mean(v) : null; });
    const fx = (arm) => targets.map((t) => { const v = R.map((r) => (r.targets[t]?.thin ? null : r.targets[t]?.fixed?.[arm])).filter((x) => x != null); return v.length ? mean(v) : null; });
    const tab = {}, bothA = per("a", "BOTH").filter((x) => x != null), bothE = per("e", "BOTH");
    for (const arm of [...ARMS_C, "FIX_RARE", "FIX_NOFUNC"]) {
      const fixedArm = arm.startsWith("FIX_"), a = fixedArm ? fx(arm) : per("a", arm), e = fixedArm ? fx(arm) : per("e", arm), g = fixedArm ? fx(arm) : per("g", arm), ok = a.map((x, i) => x != null && e[i] != null && g[i] != null);
      const A = a.filter((_, i) => ok[i]), E = e.filter((_, i) => ok[i]), G = g.filter((_, i) => ok[i]);
      tab[arm] = { a: round(mean(A)), g: round(mean(G)), e: round(mean(E)), aMinusE: boot(A.map((x, i) => x - E[i])), aMinusG: boot(A.map((x, i) => x - G[i])), n: A.length };
    }
    const b = tab.BOTH; for (const arm of Object.keys(tab)) { const t = tab[arm]; t.reproducesLevel = t.a >= b.a - 0.03; t.reproducesBonus = t.aMinusE.mean >= b.aMinusE.mean - 0.03 && t.aMinusE.mean >= 0.05; t.shareOfAboveChance = round((t.a - 0.5) / (b.a - 0.5)); }
    res.groups[gname] = tab;
  }
  const t = res.groups.romance; res.attackSucceeds = SMALL.filter((a) => t[a].reproducesLevel || t[a].reproducesBonus); res.adjReproducesBoth = t.ADJ.reproducesLevel && t.ADJ.reproducesBonus;
  res.matchingLeak = ["POSITION", "CHARLEN", "FREQ", "RIVALS"].map((a) => ({ arm: a, a: t[a].a, outsideBand: t[a].a < 0.45 || t[a].a > 0.55 })); res.cheapPlus = round(t["BOTH+BAG"].a - t.BOTH.a);
  fs.writeFileSync(path.join(HERE, "results", "C-summary.json"), JSON.stringify(res, null, 1));
  for (const g of ["romance", "germanic"]) { console.log(`== ${g}`); for (const [arm, v] of Object.entries(res.groups[g])) console.log(`${arm.padEnd(12)} a ${v.a} g ${v.g} e ${v.e} a-e ${v.aMinusE.mean} [${v.aMinusE.lo},${v.aMinusE.hi}] a-g ${v.aMinusG.mean} share ${v.shareOfAboveChance} level ${v.reproducesLevel} bonus ${v.reproducesBonus}`); }
  console.log(JSON.stringify({ attackSucceeds: res.attackSucceeds, adjReproducesBoth: res.adjReproducesBoth, matchingLeak: res.matchingLeak, cheapPlus: res.cheapPlus }));
}

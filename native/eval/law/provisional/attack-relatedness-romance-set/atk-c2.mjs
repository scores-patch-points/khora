// attack-relatedness-romance-set/atk-c2.mjs — ATTACK C2 (WHERE DOES THE ROMANCE BONUS SIT?): column ablation of the rule's probe on the SAME rows. NAME_COMPANY_PAIRBLOCK=1 node atk-c2.mjs <A|B|C>  |  node atk-c2.mjs sum
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first AUC of this file was computed; POST-HOC relative to attacks A/B/C, written after atk-shape.mjs showed that in Romance the left neighbour of a name is the
// commonest form far more often than for matched words, and the right neighbour far less often, while rare neighbours and edges mark names in every class) ═══════════════════════════════════════════════════════════════
// DISCLOSURE. Seen: A, A2, B, B2, B3, C (ADJ-only arm reproduces BOTH; LEFT1 reproduces the bonus), the descriptive slot table (atk-shape.mjs). Not seen: any AUC of the arms below.
// ARMS (all on V0M0 FIRST rows of the confirmer's windows A, B, C; the 52 columns = 4 slots x 13 bins; bin 0 = the commonest form, 1 = ranks 2-3, 2 = 4-7, 3 = 8-15, 4..8 mid ranks, 9..11 rare/unseen, 12 = sentence edge):
//   BOTH (the rule); NOTOP2 = BOTH without the bin 0 and bin 1 columns of every slot (drops the 3 commonest forms); ONLYTOP4 = only bins 0-3 (the 15 commonest forms); MID = only bins 4-8; RARE = only bins 9-12 (rare, unseen, edge).
// TESTS (SESOI 0.03; pooled over the five primary Romance targets and the three sets; pools a = Romance donors, g = Germanic, e = non-Romance; same triples and rows across arms):
//   C2a TOP-DRIVEN: the bonus sits in the commonest forms iff (a - e)[ONLYTOP4] >= 0.06 and (a - e)[RARE] <= 0.03. C2b NOTOP2: the bonus needs the 3 commonest forms iff (a - e)[NOTOP2] <= (a - e)[BOTH] - 0.03.
//   C2c Germanic targets (descriptive): same arms with a = Germanic donors, e = non-Germanic.
// BLIND PREDICTIONS. a-pool AUC: BOTH 0.678; NOTOP2 0.65 (0.62-0.67); ONLYTOP4 0.62 (0.58-0.66); MID 0.58 (0.55-0.61); RARE 0.64 (0.61-0.67). (a - e): BOTH +0.084; NOTOP2 +0.05 (0.03-0.07); ONLYTOP4 +0.06 (0.04-0.09);
//   MID +0.03; RARE +0.015 (0.00-0.03). So C2a holds (p = 0.6) and C2b holds (p = 0.55).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, ROM, GER } from "./atk-lib.mjs";
import { loadRoster, tripleAuc, boot, round, mean } from "./atk-eval.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
import { headerHash } from "../family-vs-relatedness/lib.mjs";
const SELF = fileURLToPath(import.meta.url), PRIM = ["cat", "fra", "ita", "por", "spa"], ARMS_C2 = ["BOTH", "NOTOP2", "ONLYTOP4", "MID", "RARE"];
const keep = (pred) => (x) => x.filter((_, j) => pred(j % 13));
const COLS = { BOTH: () => true, NOTOP2: (b) => b > 1, ONLYTOP4: (b) => b <= 3, MID: (b) => b >= 4 && b <= 8, RARE: (b) => b >= 9 };
if (process.argv[1] === SELF && ["A", "B", "C"].includes(process.argv[2])) {
  const set = process.argv[2], langs = loadRoster(set, "V0M0", STEMS, false, ["BOTH"]), out = { set, headerSha256: headerHash(SELF), targets: {} };
  for (const L of Object.values(langs)) for (const a of ARMS_C2) if (a !== "BOTH") L.X[a] = L.X.BOTH.map(keep(COLS[a]));
  for (const T of [...ROM, ...GER]) {
    const L = langs[T]; if (!L || L.pairs < 60) continue;
    const own = ROM.includes(T) ? ROM : GER, other = ROM.includes(T) ? GER : ROM, rest = STEMS.filter((s) => !ROM.includes(s) && !GER.includes(s)), tag = (p) => `${set}|C2|${p}`, pick = (r) => r && Object.fromEntries(Object.entries(r.means).map(([k, v]) => [k, round(v)]));
    out.targets[T] = { a: pick(tripleAuc(T, L, own, langs, ARMS_C2, tag("a"))), g: pick(tripleAuc(T, L, other, langs, ARMS_C2, tag("g"))), e: pick(tripleAuc(T, L, [...other, ...rest], langs, ARMS_C2, tag("e"))) };
    console.error(`${set} ${T} ${JSON.stringify(out.targets[T].a)}`);
  }
  fs.writeFileSync(path.join(HERE, "results", `C2-${set}.json`), JSON.stringify(out, null, 1));
} else if (process.argv[1] === SELF && process.argv[2] === "sum") {
  const R = ["A", "B", "C"].map((s) => JSON.parse(fs.readFileSync(path.join(HERE, "results", `C2-${s}.json`), "utf8"))), res = { headerSha256: headerHash(SELF), groups: {} };
  for (const [gn, ts] of [["romance", PRIM], ["germanic", GER]]) {
    const per = (pool, arm) => ts.map((t) => { const v = R.map((r) => r.targets[t]?.[pool]?.[arm]).filter((x) => x != null); return v.length ? mean(v) : null; }), tab = {};
    for (const arm of ARMS_C2) { const a = per("a", arm), g = per("g", arm), e = per("e", arm), ok = a.map((x, i) => x != null && g[i] != null && e[i] != null), A = a.filter((_, i) => ok[i]), G = g.filter((_, i) => ok[i]), E = e.filter((_, i) => ok[i]); tab[arm] = { a: round(mean(A)), g: round(mean(G)), e: round(mean(E)), aMinusE: boot(A.map((x, i) => x - E[i])), aMinusG: boot(A.map((x, i) => x - G[i])), n: A.length }; }
    res.groups[gn] = tab;
  }
  const t = res.groups.romance; res.C2a = { holds: t.ONLYTOP4.aMinusE.mean >= 0.06 && t.RARE.aMinusE.mean <= 0.03, onlytop: t.ONLYTOP4.aMinusE.mean, rare: t.RARE.aMinusE.mean }; res.C2b = { holds: t.NOTOP2.aMinusE.mean <= t.BOTH.aMinusE.mean - 0.03, notop2: t.NOTOP2.aMinusE.mean, both: t.BOTH.aMinusE.mean };
  fs.writeFileSync(path.join(HERE, "results", "C2-summary.json"), JSON.stringify(res, null, 1));
  for (const gn of Object.keys(res.groups)) { console.log(`-- ${gn}`); for (const [arm, v] of Object.entries(res.groups[gn])) console.log(`${arm.padEnd(9)} a ${v.a} g ${v.g} e ${v.e} a-e ${v.aMinusE.mean} [${v.aMinusE.lo},${v.aMinusE.hi}] a-g ${v.aMinusG.mean}`); }
  console.log(JSON.stringify({ C2a: res.C2a, C2b: res.C2b }));
}

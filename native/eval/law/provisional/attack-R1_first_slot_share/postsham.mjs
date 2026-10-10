// attack-R1_first_slot_share/postsham.mjs: POST-HOC SHAM-GOLD control built to fail (announced): positives are the speaker nicks of ANOTHER day (not nicks of the scored day), so the label is irrelevant to the scored stream. Usage: node postsham.mjs (never "run").
// ═══ PRE-REGISTRATION (written before the first run of this script; POST-HOC) ═══
// DISCLOSURE. I had read attackA/B/C, postdiag, postbot, postsmall results. Not seen: any sham-gold score.
// DESIGN. EN RC days (R + C). For day d take d2 = the next EN RC day in a fixed cyclic order, d2 != d, and set nicks(d) := nicks(d2) minus nicks(d) (sham positives: forms that are nick forms elsewhere but did not speak in d), topic := none. Negatives unchanged (tokens >= 3 chars that are not sham nicks and not true nicks of d).
//   S0 1-1 matching within day exactly as the real run; two shifts (next day, day after next) = two independent shams. Real run repeated in the same script for the identical set.
// BAR (control must FAIL): sham AUC <= 0.60 in both shifts, else the score separates rare/odd tokens in general and the gold-specificity of the effect is in doubt. PREDICTION: sham AUC in [0.45,0.58] (0.8).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, SETS, headerSha, LANG } from "./lib.mjs";
import { matchDay, sumPairs, round } from "./match.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const SHA = headerSha(import.meta.url), EN = (k) => LANG[k.split("/")[0]] === "en", RC = [...SETS.R, ...SETS.C].filter(EN), t0 = Date.now(), out = { headerSha256: SHA, status: "POST-HOC exploratory", cells: {} };
const docs = RC.map((k) => loadDay(k));
for (const shift of [0, 1, 2]) {
  const P = [], npos = []; docs.forEach((d, j) => { let x = d; if (shift) { const o = docs[(j + shift * 3) % docs.length], sham = new Set([...o.nicks].filter((n) => !d.nicks.has(n))); x = { ...d, nicks: sham, topic: new Set() }; } const m = matchDay(x, "S0", { max: 400, seed: "sham" + shift }); P.push(...m.pairs); npos.push(m.nPos); });
  const s = sumPairs(P, ["ishare"], ["i", "len", "cl", "lc", "b", "rec"], "SH" + shift); s.nPosDay = npos.reduce((a, b) => a + b, 0); out.cells[shift ? `sham${shift}` : "real"] = s; console.error(shift ? "sham" + shift : "real", s.n, s.auc.ishare, JSON.stringify(s.dayCi));
}
out.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(new URL("./results/post.sham.json", import.meta.url), JSON.stringify(out)); console.log(JSON.stringify({ sha: SHA, seconds: out.seconds }));

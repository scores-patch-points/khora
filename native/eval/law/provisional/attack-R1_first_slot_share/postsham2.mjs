// attack-R1_first_slot_share/postsham2.mjs: POST-HOC follow-up of postsham.mjs (announced): sham positives from days that share (almost) no community with the scored day. Usage: node postsham2.mjs (never "run").
// ═══ PRE-REGISTRATION (written before the first run of this script; POST-HOC) ═══
// DISCLOSURE. postsham.mjs result (read): real 0.870; sham1 (day j+3 in the RC list) 0.623 [0.44,0.78] n=1382; sham2 (j+6) 0.527 [0.34,0.69] n=749. Bar of that script ("<= 0.60 in both shifts") was MISSED by sham1 (0.623).
//   Hypothesis for the miss (untested): neighbouring days of the same channel share regular users; their nicks are real addressees in the scored day who spoke < 3 messages there (gold-negative, true names), so the sham label is partly the true label.
// DESIGN. As postsham.mjs (S0 1-1, EN RC days, sham positives = nicks(d2) minus nicks(d), no topic exclusion) with d2 chosen to share no community: XCHAN = a day of the OTHER channel (ubuntu <-> kubuntu) with |year gap| >= 4; XYEAR = same channel with |year gap| >= 6. The first such day in list order (deterministic); days without a partner are skipped.
// BAR (control must FAIL): sham AUC <= 0.60 in XCHAN and in XYEAR. PREDICTION: both in [0.45,0.58] (0.7). If either exceeds 0.60 the effect is not specific to the true gold label and the scope is narrowed accordingly.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, SETS, headerSha, LANG } from "./lib.mjs";
import { matchDay, sumPairs, round } from "./match.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const SHA = headerSha(import.meta.url), EN = (k) => LANG[k.split("/")[0]] === "en", RC = [...SETS.R, ...SETS.C].filter(EN).filter((k) => /^(ubuntu|kubuntu)\//.test(k)), t0 = Date.now(), out = { headerSha256: SHA, status: "POST-HOC exploratory", cells: {} };
const docs = RC.map((k) => loadDay(k));
for (const [vn, ok] of [["XCHAN", (d, o) => d.channel !== o.channel && Math.abs(d.year - o.year) >= 4], ["XYEAR", (d, o) => d.channel === o.channel && Math.abs(d.year - o.year) >= 6]]) {
  const P = []; let used = 0, skipped = 0;
  for (const d of docs) { const o = docs.find((x) => ok(d, x)); if (!o) { skipped++; continue; } used++; const sham = new Set([...o.nicks].filter((n) => !d.nicks.has(n))), x = { ...d, nicks: sham, topic: new Set() }; P.push(...matchDay(x, "S0", { max: 400, seed: "sham2" + vn }).pairs); }
  const s = sumPairs(P, ["ishare"], ["i", "len", "cl", "lc", "b", "rec"], "SH2" + vn); s.daysUsed = used; s.daysSkipped = skipped; out.cells[vn] = s; console.error(vn, "days", used, "n", s.n, s.auc.ishare, JSON.stringify(s.dayCi));
}
out.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(new URL("./results/post.sham2.json", import.meta.url), JSON.stringify(out)); console.log(JSON.stringify({ sha: SHA, seconds: out.seconds }));

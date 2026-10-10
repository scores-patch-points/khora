// attack-PM-R2-left-company-polarity/attack-C2-dispersion.mjs -- ATTACK C2: recency / burstiness (dispersion) rival added to the strict key. NEW FILE.
//   node attack-C2-dispersion.mjs irc|code|book|ud [stem,stem|-] [tag]  -> results/C2.<fam>[.tag].jsonl     (never pass "run" as first arg)
//
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══
// DISCLOSURE. After attacks A, A2, B, C: IRC does not survive edge-share matching (en-all M2 0.485, M4 0.465), code survives M2/M4/M5 (js 0.65-0.72, py 0.56-0.61, rb 0.53-0.59), novels get lower (0.31-0.45), UD pooled M2 0.437, UD windows agree (rho +0.35). Untested rival: local mention
//   structure / recency. Names in chat are day-local and identifiers in code are function-local, so a form's mentions can be bursty (all mentions in a small span of the stream) or spread. The rule's pairsOf matches neither the span nor the burstiness of the form, and its FULL statistic pools all mentions.
// RIVAL. sp = span share = (last mention unit index - first mention unit index) / number of units of the stream (form-level, label-free, from the stream only). Burstiness is also captured by the count (matched +-1) together with sp.
// VARIANT M6 = M5 (count +-1, es +-0.10, fs +-0.10, char length +-1, mean unit length within 25%) + |sp - sp'| <= 0.10. M2 and the registered pipeline numbers are in A/C. Valid cell: pairs >= 40 and controls pos/logn/es/fs/sp in [0.45,0.55]. Cluster bootstrap CI over positive forms (B=300).
// CRITERIA (fixed now). The code HIGH claim survives M6 iff the family-pooled AUC (valid cells) >= 0.55 with CI lower > 0.5 (js and py each >= 0.55); the novel / UD LOW claim survives iff pooled AUC <= 0.47 with CI upper < 0.5. A rival "explains" the effect if the pooled AUC under M6 is
//   within 0.03 of 0.5 or on the other side.
// BLIND PREDICTIONS. code pooled M6 >= 0.55 with CI lower > 0.5 (0.6); js >= 0.60 (0.75), py >= 0.55 (0.5), rb >= 0.55 (0.35). Books pooled M6 <= 0.47 (0.8). UD pooled M6 <= 0.47 (0.75). IRC: no valid cell (0.8).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { specs, headerSha, HERE, round, mean, rngFor, seedFor, wr } from "./attack-lib.mjs";
import { candidates, strictPairs, capPerForm, aucOfRows, VAL } from "./attack-lib2.mjs";
const fam = process.argv[2], stems = process.argv[3] && process.argv[3] !== "-" ? process.argv[3].split(",") : null, tag = process.argv[4] ?? "";
const SHA = headerSha(fileURLToPath(import.meta.url)), OUT = path.join(HERE, "results", `C2.${fam}${tag ? "." + tag : ""}.jsonl`), emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ sha: SHA.slice(0, 16), ...o }) + "\n");
const M6 = { cn: 1, ces: 0.1, cfs: 0.1, cch: 1, cml: 0.25, csp: 0.1 }, inb = (x) => x >= 0.45 && x <= 0.55, B = 300;
for (const s of specs(fam, stems && fam === "ud" ? { stems } : {}).filter((x) => !stems || fam === "ud" || stems.includes(x.reg))) {
  const t0 = Date.now(), bases = s.bases(); if (!bases) continue; const rows = [], per = Math.ceil(600 / bases.length); let dropped = 0;
  for (const b of bases) { const pr = strictPairs(candidates(b, s.def), rngFor(seedFor("pm-r2-attack-C2", "M6", s.reg, b.name)), M6, Math.max(3000, per * 5)); dropped += pr.dropped; rows.push(...capPerForm(pr.rows, 3).slice(0, per * 2)); }
  const n = rows.length / 2, rnd = rngFor(seedFor("pm-r2-attack-C2", "eval", s.reg)); if (!n) { emit({ reg: s.reg, fam: s.fam, variant: "M6", pairs: 0, dropped }); continue; }
  const ctrl = {}; for (const c of ["pos", "logn", "es", "fs", "sp", "ch", "ml"]) ctrl[c] = aucOfRows(rows, VAL[c], 0, rnd).auc;
  const d = aucOfRows(rows, VAL.DLx, B, rnd), wins = [], cl = [], ids = new Map();
  for (let k = 0; k < n; k++) { wins.push(wr(VAL.DLx(rows[2 * k]), VAL.DLx(rows[2 * k + 1]))); const c = `${rows[2 * k].doc}|${rows[2 * k].w}`; if (!ids.has(c)) ids.set(c, ids.size); cl.push(ids.get(c)); }
  emit({ reg: s.reg, fam: s.fam, variant: "M6", pairs: n, dropped, DLx: d, Dobs: aucOfRows(rows, VAL.Dobs, 0, rnd).auc, ctrl, valid: n >= 40 && ["pos", "logn", "es", "fs", "sp"].every((c) => inb(ctrl[c])), wins: wins.map((w) => (w === 1 ? "1" : w === 0 ? "0" : "h")).join(""), cl });
  console.error(`${s.reg} done ${((Date.now() - t0) / 1000).toFixed(1)}s pairs ${n}`);
}

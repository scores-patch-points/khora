// attack-PM-R2-left-company-polarity/summarize-A2.mjs -- mechanical summary of results/A2.irc.*.jsonl (criteria fixed in attack-A2-irc-wide.mjs's header). NEW FILE.  node summarize-A2.mjs -> results/A2-summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, round } from "./attack-lib.mjs";
const RES = path.join(HERE, "results"), all = fs.readdirSync(RES).filter((f) => /^A2\.irc\..*\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const props = Object.fromEntries(all.filter((r) => r.kind === "props").map((r) => [r.reg, r])), out = {};
for (const reg of Object.keys(props)) { out[reg] = { days: props[reg].days, units: props[reg].units, tokens: props[reg].tokens };
  for (const v of ["R0", "M1", "M2", "M4"]) { const c = all.find((r) => r.reg === reg && r.variant === v); if (!c) continue; out[reg][v] = { pairs: c.pairs, auc: c.DLx?.auc, ci: c.DLx ? [c.DLx.lo, c.DLx.hi] : null, Dobs: c.Dobs, valid: c.valid, ctrl: c.ctrl, esP: c.meanEsP, esN: c.meanEsN, ruleExact: c.ruleAucExact, ruleTieTol: c.ruleAucTieTol, dropped: c.dropped }; } }
fs.writeFileSync(path.join(RES, "A2-summary.json"), JSON.stringify(out, null, 1));
for (const [reg, o] of Object.entries(out)) { console.log(`== ${reg} days ${o.days} tokens ${o.tokens}`); for (const v of ["R0", "M1", "M2", "M4"]) if (o[v]) console.log(`   ${v} pairs ${o[v].pairs} auc ${o[v].auc} ci ${JSON.stringify(o[v].ci)} Dobs ${o[v].Dobs} valid ${o[v].valid} ctrl(pos/logn/es/fs) ${o[v].ctrl ? [o[v].ctrl.pos, o[v].ctrl.logn, o[v].ctrl.es, o[v].ctrl.fs].join("/") : "-"} es P/N ${o[v].esP}/${o[v].esN}${o[v].ruleExact != null ? ` rule exact ${o[v].ruleExact} tieTol ${o[v].ruleTieTol}` : ""}`); }

// eval/meaning/attach-stage2.mjs — ATTACH-PRIOR-PREREG.md stage 2: on held-out dev SENTENCES run through khora's own parser (not gold), the attachment the parser gave
// against gold, with and without the prior. Pooled prior of a language (Amendment 1). Bar: strictly fewer wrong attachments among the instances the prior decides.
//   node eval/meaning/attach-stage2.mjs --code=en --dirs=UD_English-EWT,... [--ud=data/ud]      (run from the workspace root)
import fs from "node:fs";
import path from "node:path";
import { parseConllu } from "../../native/kernel/eot-rich.js";
import { buildPrior, decide, instancesOf } from "../../native/kernel/attach-prior.js";
import { RECIPIENT } from "../../native/adapters/text/grammar-packs.js";
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const CODE = arg("code"), DIRS = arg("dirs").split(","), UD = path.resolve(process.cwd(), arg("ud", "data/ud"));
const adps = new Set([RECIPIENT[CODE]].filter(Boolean));
const read = (d, f) => parseConllu(fs.readFileSync(path.join(UD, d, f), "utf8")).filter((s) => s.tokens.length && s.tokens.every((t) => t.head !== null));
const use = DIRS.map((d) => { const fl = fs.readdirSync(path.join(UD, d)), g = (x) => fl.find((f) => f.endsWith(`-ud-${x}.conllu`)); return { d, tr: g("train"), dv: g("dev") }; }).filter((x) => x.tr && x.dv);
const prior = buildPrior(use.flatMap((x) => read(x.d, x.tr)), { adps });
let rowsOf;
if (CODE === "en") { const GE = await import("../../native/adapters/text/grammar-en.js"); rowsOf = GE.rowsOf; }
else { const { loadGrammar } = await import("../../native/adapters/text/grammar-ud.js"); const g = await loadGrammar(CODE, {}); rowsOf = g.rowsOf; }
const parsedAttach = (rows, ins) => { const k = rows.find((r) => r.id === ins.k); if (!k) return "other"; if (k.head === ins.v) return "verb"; const h = rows.find((r) => r.id === k.head); return h && h.head === ins.v && h.deprel === "obj" ? "noun" : "other"; };
let vnW = 0, vnPriorW = 0, vnN = 0, sentences = 0, skipped = 0, inst = 0, decided = 0, parserWrong = 0, priorWrong = 0, combinedWrong = 0, parserOther = 0, agree = 0;
for (const x of use) for (const s of read(x.d, x.dv)) {
  const gold = instancesOf(s, { adps }); if (!gold.length) continue; sentences++;
  const rows = rowsOf(s.text ?? s.tokens.map((t) => t.form).join(" "));
  if (rows.length !== s.tokens.length || rows.some((r, i) => r.form !== s.tokens[i].form)) { skipped++; continue; }
  for (const g of gold) {
    inst++; const pa = parsedAttach(rows, g), d = decide(prior, g.verb); if (!d) continue;
    decided++; if (pa === "other") parserOther++;
    const pw = pa !== g.attach, dw = d !== g.attach; parserWrong += pw; priorWrong += dw; if (pa === d) agree++;
    if (pa !== "other") { vnN++; vnW += pw; vnPriorW += dw; }   // the instances where the parser chose between the verb and the noun
    combinedWrong += dw;   // with the prior, a decided instance takes the prior's attachment
  }
}
console.log(JSON.stringify({ code: CODE, devSentencesWithInstances: sentences, skippedTokenizationMismatch: skipped, instances: inst, decided, parserWrongOfDecided: parserWrong, withPriorWrongOfDecided: combinedWrong, parserAndPriorAgree: agree, parserAttachedElsewhere: parserOther, verbOrNounOnly: { n: vnN, parserWrong: vnW, withPriorWrong: vnPriorW }, bar: combinedWrong < parserWrong }));

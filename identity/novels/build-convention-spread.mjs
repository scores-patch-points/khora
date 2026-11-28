// build-convention-spread.mjs <en_gum-ud-train.conllu> — PREREG-ROUND31-CONVENTION-ADDENDUM-2.md. The reference SPREAD the convention rung reads:
// for every GUM train document, the rung's own counts (adapters/text/name-convention.js conventionCounts) over the reader's own sentence cut
// (adapters/text/spans.js splitSentences), and the distribution of per-document rates k/n. Writes native/priors-shipped/convention-spread-eng.json.
// Gold-free: the counts use the POS prior's dominant class, exactly as the read does; the gold tags are not read. Train only.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { pathToFileURL, fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const KH = path.resolve(HERE, "..", ".."); const imp = (p) => import(pathToFileURL(path.join(KH, p)).href);
const { conventionCounts } = await imp("native/adapters/text/name-convention.js"); const { splitSentences } = await imp("native/adapters/text/spans.js"); const { priorsFor } = await imp("native/the-fold/read-core.mjs");
const file = process.argv[2]; if (!file) { console.error("usage: build-convention-spread.mjs <en_gum-ud-train.conllu>"); process.exit(2); }
const bytes = fs.readFileSync(file); const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
const forms = priorsFor("eng").posPrior?.forms; if (!forms) { console.error("no POS prior for eng (janus priors/pos-eng.json)"); process.exit(3); }
const docs = []; let cur = null;
for (const line of bytes.toString("utf8").split("\n")) {   // the conllu's own header lines: a file format, read by prefix
  if (line.startsWith("# newdoc id")) { cur = { id: line.split("=")[1].trim(), sents: [] }; docs.push(cur); }
  else if (line.startsWith("# text = ") && cur) cur.sents.push(line.slice(9));
}
const per = docs.map((d) => { const { k, n } = conventionCounts(splitSentences(d.sents.join(" ")), { forms }); return { id: d.id, k, n, rate: n ? k / n : 0 }; }).filter((d) => d.n > 0);
const rates = per.map((d) => d.rate).sort((a, b) => a - b); const q = (x) => rates[Math.floor(x * (rates.length - 1))];
const out = {
  schema: "ConventionSpread@1", language: "eng",
  says: "how often a modern document capitalizes a token not first in its sentence whose lower-case form the POS prior holds as other than PROPN: the spread over documents",
  ground: "UD_English-GUM train (en_gum-ud-train.conllu), UniversalDependencies/UD_English-GUM master", sha256, documents: per.length,
  counting: "khora native/adapters/text/name-convention.js conventionCounts over native/adapters/text/spans.js splitSentences; POS prior janus priors/pos-eng.json (UD_English-EWT train)",
  builder: "identity/novels/build-convention-spread.mjs", licence: "GUM: CC BY 4.0 (the text), CC BY-SA 4.0 (some sources); only counts are kept here",
  p50: q(0.5), p90: q(0.9), p95: q(0.95), max: rates[rates.length - 1],
  perDocument: per.map((d) => [d.id, d.k, d.n]),
};
const dest = path.join(KH, "native", "priors-shipped", "convention-spread-eng.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ dest, documents: out.documents, p50: out.p50, p90: out.p90, p95: out.p95, max: out.max }));

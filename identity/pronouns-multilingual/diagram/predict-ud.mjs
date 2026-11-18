// predict-ud.mjs <gold.conllu> <out.conllu> <diagram|raw> — PREREG-ROUND26. Writes our parser's output in CoNLL-U for the official scorer.
// diagram: gold tokenization and multiword tokens kept; our tagger, lemmatiser, parser and labeller fill UPOS, lemma, feats, head, deprel.
// raw: the file's sentence texts joined; our own sentence split and tokenizer (english-parser.js), no multiword-token lines; the scorer aligns by characters.
import fs from "node:fs"; import path from "node:path"; import { pathToFileURL, fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const KH = path.resolve(HERE, "../../.."); const imp = (p) => import(pathToFileURL(path.join(KH, p)).href);
const EP = await imp("native/adapters/text/english-parser.js"); const { priorJson } = await imp("native/the-fold/prior-source.mjs");
const [goldFile, outFile, mode] = process.argv.slice(2); const prior = priorJson("parser-eng-ewt.json"); if (!prior) throw new Error("parser-eng-ewt.json not in the priors home"); const model = EP.loadModel(prior);
const blocks = fs.readFileSync(goldFile, "utf8").split(/\n\n+/).filter((b) => b.trim()); const row = (r) => [r.id, r.form, r.lemma, r.upos, "_", r.feats || "_", r.head, r.deprel, "_", "_"].join("\t");
const sents = blocks.map((b) => { const lines = b.split("\n"); const meta = lines.filter((l) => l.startsWith("#")); const toks = lines.filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t")); return { meta, toks, text: (meta.find((l) => l.startsWith("# text =")) ?? "").replace(/^# text =\s*/, "") }; });
const out = [];
if (mode === "diagram") {
  for (const s of sents) { const words = s.toks.filter((t) => /^\d+$/.test(t[0])); const rows = words.length ? EP.analyse(model, words.map((t) => t[1])) : [];
    out.push(s.meta.filter((l) => l.startsWith("# sent_id") || l.startsWith("# text")).join("\n")); let w = 0; for (const t of s.toks) { if (/^\d+-\d+$/.test(t[0])) { out.push(t.slice(0, 2).concat(["_", "_", "_", "_", "_", "_", "_", "_"]).join("\t")); continue; } if (!/^\d+$/.test(t[0])) continue; const r = rows[w++]; out.push(row({ ...r, head: r.head, deprel: r.deprel })); } out.push(""); }
} else {
  const text = sents.map((s) => s.text).join("\n"); let n = 0; for (const sn of EP.sentences(text)) { const toks = EP.tokenize(sn.text); if (!toks.length) continue; const rows = toks.length ? EP.analyse(model, toks.map((t) => t.form)) : []; out.push(`# sent_id = r${++n}`); out.push(`# text = ${sn.text}`); for (const r of rows) out.push(row(r)); out.push(""); }
}
fs.writeFileSync(outFile, out.join("\n") + "\n"); console.log("wrote", outFile, mode, sents.length, "gold sentences");

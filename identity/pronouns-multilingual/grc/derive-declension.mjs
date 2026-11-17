// derive-declension.mjs <out.json> [--exclude BOOK,BOOK] — DeclensionPrior@1 for Ancient Greek from the treebanks' own proper-noun (form, lemma) pairs.
// A rule = (the form's ending after the longest common prefix with its lemma) -> (the lemma's ending). Kept iff attested in 2 or more DISTINCT lemmas (a transform, not an item; PREREG-GRC.md).
// Consumed only pairwise by adapters/text/declension.js (does observed form A reach observed form B), never as a per-word lemma.
import fs from "node:fs"; import path from "node:path";
const DATA = process.env.GRC_DATA ?? "/Users/mlacy/Documents/khora-cast/khora/identity/pronouns-multilingual/data";
const out = process.argv[2]; const ex = new Set((process.argv.includes("--exclude") ? process.argv[process.argv.indexOf("--exclude") + 1] : "").split(",").filter(Boolean));
const nf = (s) => s.normalize("NFC");
const R = new Map(); let pairs = 0, names = 0; const CASES = new Map();   // form (NFC, lower-cased) -> { Case: count } over PROPN tokens
for (const d of ["grc-proiel", "grc-perseus"]) for (const f of fs.readdirSync(path.join(DATA, d)).filter((x) => x.endsWith(".conllu"))) {
  let code = null;
  for (const ln of fs.readFileSync(path.join(DATA, d, f), "utf8").split("\n")) {
    if (ln.startsWith("# sent_id")) { code = null; continue; } if (!ln || ln[0] === "#") continue;
    const c = ln.split("\t"); if (c.length < 10 || /[-.]/.test(c[0])) continue;
    if (d === "grc-proiel") { const m = /Ref=([A-Z0-9]+)_/.exec(c[9]); if (m) code = m[1]; if (code && ex.has(code)) continue; }
    if (c[3] !== "PROPN") continue; names++;
    { const cs = /(?:^|\|)Case=([A-Za-z]+)/.exec(c[5]); if (cs) { const k = nf(c[1]).toLowerCase(); const m = CASES.get(k) ?? CASES.set(k, {}).get(k); m[cs[1]] = (m[cs[1]] ?? 0) + 1; } }
    const form = nf(c[1]), lemma = nf(c[2]); if (form === lemma) continue; pairs++;
    let i = 0; while (i < form.length && i < lemma.length && form[i] === lemma[i]) i++;
    if (i < 2) continue;   // the declension organ's own minimum stem
    const k = form.slice(i) + "\u0000" + lemma.slice(i); const r = R.get(k) ?? R.set(k, { from: form.slice(i), to: lemma.slice(i), count: 0, lemmas: new Set() }).get(k); r.count++; r.lemmas.add(lemma);
  }
}
const rules = [...R.values()].filter((r) => r.lemmas.size >= 2).map((r) => ({ from: r.from, to: r.to, count: r.count, lemmas: r.lemmas.size })).sort((a, b) => b.count - a.count);
// nameCases: a case belongs to a form's set when its count is at least half the form's most frequent case (the form's own spread decides, no fixed number)
const nameCases = {}; for (const [k, m] of CASES) { const top = Math.max(...Object.values(m)); nameCases[k] = Object.entries(m).filter(([, n]) => n * 2 >= top).map(([c]) => c).sort(); }
fs.writeFileSync(out, JSON.stringify({ schema: "DeclensionPrior@1", language: "grc", mode: "co-lemma", provenance: { source: "UD Ancient_Greek-PROIEL and -Perseus, PROPN tokens (form, lemma)", giver: "identity/pronouns-multilingual/grc/derive-declension.mjs", license: "CC BY-NC-SA 3.0 / 2.5 (aggregate suffix counts only)", proper_noun_tokens: names, inflected_pairs: pairs, min_distinct_lemmas: 2, excluded_books: [...ex], note: "rules only, consumed pairwise by adapters/text/declension.js; a rule is kept iff attested in 2 or more distinct lemmas" }, rules, nameCases }));
console.log(out, "nameCases forms", Object.keys(nameCases).length, "rules", rules.length, rules.slice(0, 12).map((r) => `${r.from}>${r.to}:${r.lemmas}`).join(" "));

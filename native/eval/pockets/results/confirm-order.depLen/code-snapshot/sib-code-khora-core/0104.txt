// khora · build-enclitic-prior — UD CoNLL-U in, EncliticPrior@1 out: the bound
// particles a language writes onto the END of a nominal (Korean 은/는/이/가/을/를/에서…),
// derived mechanically from the treebank's own morpheme annotation, never typed.
//
// The sibling of build-proclitic-prior.mjs (which reads multi-word-token splits
// for Arabic/Hebrew PREFIXES). A treebank that annotates morphemes in the LEMMA
// column ("정도+는") tells us which string is the stem and which the suffix. A
// suffix is KEPT when, over NOUN/PROPN/PRON eojeol-like tokens whose surface is
// exactly stem+suffix, it recurs >= MIN_COUNT times (the treebank's own tag
// string marks it a particle, `j…`) and is also attested as a standalone
// ADP/PART/AUX form.
//
// Usage: node native/scripts/build-enclitic-prior.mjs <train.conllu> <out.json> <lang> [min_count=30]
import { readFileSync, writeFileSync } from "node:fs";
const [IN, OUT, LANGUAGE, MIN = "30"] = process.argv.slice(2);
if (!IN || !OUT || !LANGUAGE) { console.error("usage: build-enclitic-prior.mjs <train.conllu> <out.json> <lang> [min_count]"); process.exit(1); }
const MIN_COUNT = Number(MIN);
const tail = new Map(); const standalone = new Map();
let nominals = 0;
for (const line of readFileSync(IN, "utf8").split("\n")) {
  if (line.startsWith("#") || !line.trim()) continue;
  const c = line.split("\t"); if (!/^[0-9]+$/.test(c[0])) continue;
  const [, form, lemma, upos, xpos] = c;
  if (["ADP", "PART", "AUX"].includes(upos)) standalone.set(form, (standalone.get(form) ?? 0) + 1);
  if (!lemma.includes("+")) continue;
  const parts = lemma.split("+"); const xparts = String(xpos ?? "").split("+");
  // a nominal-plus-particle token: the treebank's own tag string marks the
  // first morph a nominal (n…) and the last a particle (j…) — read, not typed
  if (parts.length < 2 || parts.length !== xparts.length || !/^n/i.test(xparts[0]) || !/^j/i.test(xparts[xparts.length - 1])) continue;
  nominals += 1;
  const suffix = parts[parts.length - 1];
  if (!suffix || !form.endsWith(suffix) || form.length === suffix.length) continue;
  if (!/^[\p{L}]+$/u.test(suffix)) continue;
  tail.set(suffix, (tail.get(suffix) ?? 0) + 1);
}
const enclitics = [...tail].filter(([s, n]) => n >= MIN_COUNT && standalone.has(s)).sort((a, b) => b[1] - a[1]).map(([s]) => s);
writeFileSync(OUT, JSON.stringify({
  schema: "EncliticPrior@1", language: LANGUAGE,
  provenance: { giver: `Universal Dependencies treebank (train split) — lemma-column morpheme splits`, builder: "khora native/scripts/build-enclitic-prior.mjs", min_count: MIN_COUNT, nominal_tokens_read: nominals,
    note: "a suffix is kept when it recurs as the final morpheme of nominal tokens AND is attested standalone as ADP/PART/AUX in the same treebank — derived, never hand-typed" },
  enclitics,
}, null, 1) + "\n");
console.log(`${LANGUAGE}: ${enclitics.length} enclitics from ${nominals} nominal tokens -> ${OUT}: ${enclitics.slice(0, 20).join(" ")}`);

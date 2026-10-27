// eval/meaning/weft-parity.mjs — does the meaning layer read the same atoms THROUGH the master reader's entry as it does by cutting and parsing for itself?
// Every claim and source of the spent sets: atoms by readAtoms with the grammar's own rowsOf (the old path) against atoms from the weft entry (reading.js
// readDocument with rows: true, then weft-atoms.js). Same parser behind both, so they must agree wherever the weft's cut is the text's own; every disagreement is
// printed and typed. No arm, no threshold: a parity check.   node eval/meaning/weft-parity.mjs [--langs=en,es,fr,de,ja]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const { readDocument, rowsOfFor } = await import(path.join(K, "native/reading.js"));
const { atomsFromWeft } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const { readAtoms } = await import(path.join(K, "native/organs/read-atoms.js"));
const { PACKS } = await import(path.join(K, "native/adapters/text/grammar-packs.js"));
const { stemOf } = await import(path.join(K, "native/the-fold/language-grammar.js"));
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const WANT = new Set((process.argv.find((a) => a.startsWith("--langs="))?.slice(8) ?? "en,es,fr,de,ja").split(","));
const norm = (atoms) => JSON.stringify(atoms.map((a) => [a.pred, a.args.map((x) => x.entity ?? x.value), a.args.map((x) => x.name ?? x.value), a.neg, a.hedged, a.approx, a.tense, a.time, a.person, a.text]));
const P = {};
const stat = { texts: 0, equal: 0, differ: 0, noParser: 0, gaps: {}, byLang: {} };
const differ = [];
for (const s of ["fresh", "heldout", "relations", "fresh19", "fresh20", "fresh-ml"]) {
  const f = path.join(HERE, `${s}.json`); if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const p of d.pairs ?? d) {
    const [src, clm] = String(p.lang ?? "en").split("-");
    for (const [t, l] of [[p.sentence, src], [p.claim, clm ?? src]]) {
      if (!t || !WANT.has(l)) continue;
      const stem = stemOf(l); P[stem] ??= await rowsOfFor(stem); const par = P[stem];
      if (!par.rowsOf) { stat.noParser++; continue; }
      stat.texts++; (stat.byLang[l] ??= { texts: 0, equal: 0 }).texts++;
      const direct = readAtoms({ text: t, lang: l, grammar: { rowsOf: par.rowsOf, claimsOf: par.claimsOf }, pack: PACKS[l] ?? null, corefModel });
      const w = await readDocument(t, { language: l, lexicon: false, minCharacters: 0, rows: true });
      const via = atomsFromWeft(w, { claimsOf: par.claimsOf, corefModel, lang: l });
      for (const g of via.gaps) stat.gaps[g.gap] = (stat.gaps[g.gap] ?? 0) + 1;
      if (norm(direct.atoms) === norm(via.atoms)) { stat.equal++; stat.byLang[l].equal++; }
      else { stat.differ++; if (differ.length < 12) differ.push({ l, t: t.slice(0, 90), sentences: w.sentences.length, gaps: via.gaps.map((g) => g.gap), direct: direct.atoms.length, via: via.atoms.length }); }
    }
  }
}
console.log(JSON.stringify(stat));
for (const x of differ) console.log(JSON.stringify(x));

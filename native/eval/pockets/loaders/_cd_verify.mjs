// loaders/_cd_verify.mjs — builds every "cd" pocket once (one at a time), validates it, checks determinism on 3 pockets and writes loaders/codemisc.manifest.json.
// Usage: nohup node loaders/_cd_verify.mjs > /tmp/x.out 2> /tmp/x.err &   (progress lines go to stderr)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENTRIES } from "./codemisc.mjs";
import { SKIPPED } from "./_cd_skipped.mjs";
import { validate, sha256, MAX_TOKENS } from "../lib/pocket.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
const entries = ENTRIES().filter((e) => !only.length || only.includes(e.id));
const KINDS = [[/^cd-cc-/, "code-corpus-language"], [/^cd-e09-(c|cpp|go|python|eoapp-js)$/, "ethos-code"], [/^cd-e09-docs$/, "ethos-docs"], [/^cd-smiles-/, "smiles-database"], [/^cd-iupac-/, "chem-name-registry"], [/^cd-chess-/, "chess-source"], [/^cd-ipa-/, "ipa-script-class"],
  [/^cd-bpmn-/, "bpmn-lineage"], [/^cd-(dot|mermaid|sbgn)$/, "diagram-language"], [/^cd-(abc-lieder|abc-quartets|lilypond|musicxml|mscx)$/, "music-notation"], [/^cd-(protein-aa|codons)$/, "genetic-sequence"], [/^cd-abc-lyrics$/, "lyrics"], [/^cd-(gene-products|chebi-defs|taxon-en)$/, "technical-text"]];
const kindOf = (id) => (KINDS.find(([re]) => re.test(id)) ?? [null, "other"])[1];
const dig = (p) => sha256(JSON.stringify([p.units, p.docOf]));
const pockets = [], failures = [], det = [];
for (const e of entries) {
  const t0 = Date.now();
  try {
    const p = await e.build();
    if (!p) { failures.push({ id: e.id, error: "build returned null" }); continue; }
    const v = validate(p), vocab = new Set(); for (const u of p.units) for (const w of u) vocab.add(w);
    const notNfc = [...vocab].filter((w) => w !== w.normalize("NFC")).length; if (notNfc) throw new Error(`${notNfc} vocabulary items are not NFC`);
    if (p.docOf.some((d, i) => i && d < p.docOf[i - 1])) throw new Error("docOf not nondecreasing");
    const nonLatinWord = new Map(); let nonLatinTokens = 0;
    for (const u of p.units) for (const w of u) { let b = nonLatinWord.get(w); if (b === undefined) { b = /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u.test(w); nonLatinWord.set(w, b); } if (b) nonLatinTokens++; }
    const lens = p.units.map((u) => u.length).sort((a, b) => a - b);
    const seen = new Map(); for (const u of p.units) { const k = u.join(" "); seen.set(k, (seen.get(k) ?? 0) + 1); }
    const dupUnits = p.units.length - seen.size; // units that repeat an earlier identical unit (licence headers, boilerplate, repeated moves ...)
    pockets.push({ id: p.id, kind: kindOf(p.id), tokens: v.tokens, units: v.units, docs: v.docs, thin: v.thin, overCap: v.overCap, register: p.register, language: p.language, script: p.script, group: p.group,
      vocab: vocab.size, nonLatinTokenFrac: +(nonLatinTokens / v.tokens).toFixed(4), uniqueUnits: seen.size, dupUnitFrac: +(dupUnits / p.units.length).toFixed(4), meanUnitLen: +(v.tokens / v.units).toFixed(2), maxUnitLen: lens[lens.length - 1], tokenisation: p.meta.tokenisation, docDef: p.meta.docDef, source: p.meta.source, notes: p.meta.notes });
    if (["cd-e09-go", "cd-cc-lua", "cd-chess-broadcast"].includes(p.id)) { const h1 = dig(p), p2 = await e.build(); det.push({ id: p.id, identical: h1 === dig(p2), sha256: h1 }); }
    console.error(`${p.id}\t${v.tokens}\t${v.docs}\t${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (err) { failures.push({ id: e.id, error: String(err.message).slice(0, 300) }); console.error(`FAIL ${e.id}: ${err.message}`); }
}
const xcPath = path.join(HERE, "codemisc.crosscheck.json");
const xc = fs.existsSync(xcPath) ? JSON.parse(fs.readFileSync(xcPath, "utf8")) : null;
const man = { group: "cd", loader: "loaders/codemisc.mjs", maxTokens: MAX_TOKENS, pocketCount: pockets.length, failures, determinism: det, tokenisationCrossCheck: xc && { against: xc.source, filesChecked: xc.filesChecked, medianCoverage: xc.medianCoverage, minCoverage: xc.minCoverage, medianShareOfMine: xc.medianShareOfMine, minShare: xc.minShare,
  meaning: "coverage = share of the parser-gold identifier/keyword tokens that this tokeniser also emits; shareOfMine = share of this tokeniser's tokens that are parser-gold identifiers/keywords (the rest are comment words, string-literal words, other words)" },
  totals: { tokens: pockets.reduce((n, p) => n + p.tokens, 0), thin: pockets.filter((p) => p.thin).map((p) => p.id), overCap: pockets.filter((p) => p.overCap).map((p) => p.id) }, pockets, skipped: SKIPPED };
if (!only.length) fs.writeFileSync(path.join(HERE, "codemisc.manifest.json"), JSON.stringify(man, null, 1));
console.error(`done: ${pockets.length} pockets, ${failures.length} failures, ${man.totals.tokens} tokens`);
console.log(JSON.stringify({ pockets: pockets.length, failures, determinism: det, thin: man.totals.thin, overCap: man.totals.overCap }));

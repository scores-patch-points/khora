// scene/demo-hyperlexicon.mjs — SEE IT WORKING, end to end, model-free.
//
//   node eval/the-fold/scene/demo-hyperlexicon.mjs
//
// The single corpus EOT (the weft) is loaded; the field is FOLDED from its
// addressed attestations; a relation's address is REOPENED to its real UDHR
// bytes; and a plain ask is answered from the field — every step zero model
// tokens. Nothing asserted is not printed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fieldFromWeft } from "../../../../../janus/native/organs/ruliad.js";
import { reopen } from "../../../the-fold/weft.js";
import { parseWeftJsonl, foldOf, weftAttestations } from "../../../the-fold/eot-weft.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const weft = parseWeftJsonl(fs.readFileSync(path.join(HERE, "corpus.eot.jsonl"), "utf8"));
const readBytes = (src) => { try { return fs.readFileSync(src, "utf8"); } catch { return null; } };

const line = "─".repeat(66);
console.log(line);
console.log("THE SINGLE CORPUS EOT — one append-only file, one pass per document read");
console.log(line);
for (const p of weft) console.log(`  seq ${String(p.seq).padStart(2)} · ${String(p.relations?.length ?? 0).padStart(3)} bound · ${path.basename(p.address)}`);

const field = fieldFromWeft(weft);
const rows = Object.values(field.hyperlexicon.composition).map((r) => ({
  left: r.left, right: r.right, labels: r.meta?.labels ?? {}, witnesses: r.witnesses?.length ?? 0, giver: r.giver,
})).sort((a, b) => b.witnesses - a.witnesses);

console.log("");
console.log(line);
console.log("THE FIELD — folded from the weft's ADDRESSED attestations (0 model tokens)");
console.log(line);
console.log(`  ${field.stats.attestations} attestations → ${field.stats.pairs} rows · ${field.stats.distinctLabels} labels · ${field.stats.distinctWitnesses} addresses`);
console.log(`  every row: standing candidate · giver "${rows[0]?.giver}" · witnesses re-expand by address`);
console.log(`  top rows:`);
for (const r of rows.slice(0, 5)) {
  const lab = Object.entries(r.labels).map(([k, v]) => `${k}×${v}`).join(" ");
  console.log(`    ${String(r.left).padEnd(12)} ${lab.padEnd(24)} → ${r.right}  (${r.witnesses} addr)`);
}

console.log("");
console.log(line);
console.log("THE HOLOGRAPH PROPERTY — a relation's address re-expands to its real UDHR bytes");
console.log(line);
const engAtt = [...weftAttestations(weft)].filter((a) => a.source.includes("udhr-eng"));
const shown = new Set();
for (const a of engAtt) {
  if (a.witness in shown) continue; shown[a.witness] = true;
  const src = a.source; const byteAt = a.at ?? parseInt(a.witness.split("#")[1], 10);
  const r = reopen(a.witness, { read: readBytes });
  console.log("");
  console.log(`  ${a.label} —${a.left.surface}→ ${a.right.surface}`);
  console.log(`  ▸ ${("...") + (r.text ?? `GAP ${r.gap}`).replace(/\s+/g, " ").slice(0, 150)}`);
  console.log(`    at ${path.basename(src)}#${byteAt}`);
}
console.log("");

async function main() {
  // A MODELESS ASK, answered from the field, zero model tokens:
  const ask = "what does the record hold about religion";
  const term = "religion";
  const hits = rows.filter((r) => r.left === term || r.right === term);
  console.log(line);
  console.log(`A MODELESS ASK — “${ask}”`);
  console.log(line);
  console.log(`  resolved to the field row on "${term}", 0 model tokens: ${hits.length ? "" : "(none bound yet)"}`);
  for (const h of hits) {
    const lab = Object.keys(h.labels).join("/");
    const other = h.left === term ? h.right : h.left;
    console.log(`    \u2022 ${term} —${lab}→ ${other}  (${h.witnesses} witnesses, ${h.giver})`);
    for (const w of h.witnesses) {
      const r = reopen(w, { read: readBytes });
      if (r.text) console.log(`        ▸ ${r.text.replace(/\s+/g, " ").slice(0, 110)}`);
    }
  }
  console.log("");
  console.log(line);
  console.log("SWATCH — that was ${field.stats.pairs} rows, ${field.stats.attestations} attestations, 0 model draws. Every byte italic above is read from the record by address.");
}

main().catch((e) => { console.error(e); process.exit(1); });
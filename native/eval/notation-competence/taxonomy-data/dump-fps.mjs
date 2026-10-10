// dump-fps.mjs — writes the reader's R3 false positives of a split (beings that match no gold mention and lie in no neutral span) for GBIF adjudication.
//   node eval/notation-competence/taxonomy-data/dump-fps.mjs [split]      -> $TAXONOMY_ROOT/results/<split>-fps.json
// The adjudication (adjudicate.py) asks the GBIF Backbone whether each distinct false-positive string is a name it knows: a "false positive" the Backbone
// confirms is a name the curators did not tag (gold incompleteness), not a reading error. Reported next to, never inside, any pass rule.
import fs from "node:fs";
import path from "node:path";
import * as I from "../taxonomy.mjs";

const split = process.argv[2] ?? "dev";
const data = I.loadData(split);
const reader = I.adapterReader();
const out = [];
for (const d of data.docs) {
  const z = I.zones(d.mentions);
  const gold = new Set(d.mentions.filter((m) => m.status === "gold").map((m) => `${m.core[0]}:${m.core[1]}`));
  for (const b of reader.read(d.text).beings) {
    const k = `${b.span[0]}:${b.span[1]}`;
    if (gold.has(k) || I.overlaps(z, b.span[0], b.span[1])) continue;
    out.push({ doc: d.id, journal: d.journal, id: b.id, kind: b.kind, abbrev: !!b.abbrev, resolved: b.resolved !== false, ctx: d.text.slice(Math.max(0, b.span[0] - 40), b.span[1] + 40).replace(/\n/g, " ") });
  }
}
const dir = path.join(I.ROOT, "results"); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${split}-fps.json`), JSON.stringify(out));
console.log(`${split}: ${out.length} false-positive beings (${new Set(out.map((x) => x.id)).size} distinct ids)`);

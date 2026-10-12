// ukr-read.mjs — READ THE UDHR IN UKRAINIAN through the recovered seam (greek.mjs).
// The same case-seam read as rus-read.mjs. Ukrainian has pos-ukr.json but NO
// case-marking-ukr prior; per the poverty-of-stimulus discipline the Russian
// case prior is DECLARED for Ukrainian (closely related case systems — a
// declared parameter, disclosed, never measured from a corpus: a ParameterSet
// built from a corpus is 'a treebank in another hat').
// Emits eot-udhr-ukr-native.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekBeings, greekClauses, nominalClass, caseOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);

const FILE = path.join(HERE, "udhr-src", "udhr-ukr.txt");
const OUT = path.join(HERE, "eot-udhr-ukr-native.json");
const raw = fs.readFileSync(FILE, "utf8");
const body = raw.replace(/^---[\s\S]*?\n---\n/, "");

const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-ukr.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-rus.json", "utf8"));
const verbs = confirmedVerbSet(posPrior);
console.log(`priors: pos-ukr forms=${Object.keys(posPrior.forms ?? posPrior).length} · case prior: case-marking-RUS (DECLARED for ukr — disclosed parameter) · verbs confirmed=${verbs.size}`);

const beings = greekBeings(body, posPrior, { minOccurrences: 2 });
console.log(`beings: ${beings.length} · sample: ${beings.slice(0, 12).map((b) => b.stem).join(", ")}`);

const sents = body.split(/(?<=[.;—])/g);
const clauses = [];
for (const s of sents) if (s.trim().length > 3) {
  for (const c of greekClauses(s.trim(), verbs, posPrior, casePrior, { beings, articleMode: "off", minShare: 0.6, minCount: 20 })) clauses.push(c);
}
console.log(`clauses read: ${clauses.length}`);

const face = (x) => { if (!x) return null; return typeof x === "string" ? String(x) : String(x.head ?? x.surface ?? x.text ?? x.ref ?? ""); };
const hashOf = (id) => { let h = 0x811c9dc5; for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return `r_${h.toString(16).padStart(8, "0")}`; };
const nameById = new Map();
const idFor = (f) => {
  const n = String(f).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!n) return null;
  if (!nameById.has(n)) nameById.set(n, { name: n, hash: hashOf(n) });
  return nameById.get(n);
};
const refs = new Map();
const edges = [];
let seq = 0;
for (const c of clauses) {
  const s = face(c.subject); const o = face(c.object); const v = String(c.verb ?? "·");
  let sh = null, oh = null;
  if (s) { const r = idFor(s); if (r) { sh = r.hash; refs.set(r.hash, r); } }
  if (o) { const r = idFor(o); if (r) { oh = r.hash; refs.set(r.hash, r); } }
  if (sh && oh) edges.push({ at: seq++, seq, relation: v, subject: sh, object: oh });
}
console.log(`referents: ${refs.size} · both-bound edges: ${edges.length}`);
console.log(`referents sample: ${[...refs.values()].slice(0, 20).map((r) => r.name).join(", ")}`);

const eot = {
  schema: "@field/EOT-v1", medium: "text", language: "ukr",
  source: FILE,
  tools: "greekClauses seam + pos-ukr + case-marking-rus (DECLARED for ukr; disclosed)",
  counts: { clauses: clauses.length, bindings: edges.length, referents: refs.size },
  referents: [...refs.values()],
  edges,
};
fs.writeFileSync(OUT, JSON.stringify(eot, null, 2));
console.log(`wrote ${OUT}`);
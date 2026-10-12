// rus-read.mjs — READ THE UDHR IN RUSSIAN through the recovered seam (greek.mjs).
// The same case-seam that reads Greek/Latin/German, with the Russian priors only
// (GREAT-SCROLL: "Russian shares the Greek/Latin seam; only the priors differ").
// Emits a scene EOT (@field/EOT-v1) whose referent NAMES are the real Russian
// vocabulary — the thing the weak universal read never produced (LP20's wall).
//
//   node rus-read.mjs [--chars N] [--out eot-udhr-rus-native.json]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekBeings, greekClauses, nominalClass, caseOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);

const args = process.argv.slice(2);
const oi = args.indexOf("--chars"); const CHARS = oi >= 0 ? Number(args[oi + 1]) : Infinity;
const OO = args.indexOf("--out"); const OUT = OO >= 0 ? args[OO + 1] : path.join(HERE, "eot-udhr-rus-native.json");

const FILE = path.join(HERE, "udhr-src", "udhr-rus.txt");
const raw = fs.readFileSync(FILE, "utf8");
const body = raw.replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);

const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-rus.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-rus.json", "utf8"));
const verbs = confirmedVerbSet(posPrior);
console.log(`priors: pos-rus forms=${Object.keys(posPrior.forms ?? posPrior).length} · case-marking-rus endings=${Object.keys(casePrior.nominalEndings ?? {}).length} · verbs confirmed=${verbs.size}`);

const beings = greekBeings(body, posPrior, { minOccurrences: 2 });
console.log(`beings: ${beings.length} · sample: ${beings.slice(0, 16).map((b) => b.stem).join(", ")}`);

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
const refs = new Map(); // hash -> {hash,name}
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
  schema: "@field/EOT-v1", medium: "text", language: "rus",
  source: FILE,
  tools: "greekClauses seam + pos-rus + case-marking-rus (the native case read; GREAT-SCROLL's seam)",
  counts: { clauses: clauses.length, bindings: edges.length, referents: refs.size },
  referents: [...refs.values()],
  edges,
};
fs.writeFileSync(OUT, JSON.stringify(eot, null, 2));
console.log(`wrote ${OUT}`);
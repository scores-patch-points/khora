// scene/build-corpus-eot.mjs — build the single corpus EOT.
//
//   node eval/the-fold/scene/build-corpus-eot.mjs [--out corpus.eot.jsonl] [--dry]
//
// Reads every per-source reading in THIS directory (eot-*.json, `@field/EOT-v1`)
// and appends each as one pass to ONE append-only file — the WEFT (see
// `native/the-fold/eot-weft.mjs`). One document read = one line. The file is
// never rewritten: the driver regenerates it from the EOTs, and any later run
// appends (the weft is the log; the holograph is its cloth).
//
// The EOTs here are single-source scene readings, several of the SAME source at
// different char budgets (e.g. rigveda-12000/20000/60000). The driver keeps ONE
// pass per distinct `source` — the read with the most bound edges — and
// discloses the ones it dropped, so the file is not triple-counting a document.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendEot, emptyWeft, serializeWeftJsonl, holographAll, weftAttestations, weftReferents,
} from "../../../the-fold/eot-weft.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const OUT = path.resolve(HERE, opt("--out", "corpus.eot.jsonl"));
const DRY = args.includes("--dry");

const files = fs.readdirSync(HERE)
  .filter((f) => /^eot-.*\.json$/.test(f) && !/\.min\.json$/.test(f))
  .sort();

// The pass ADDRESS must be a source position, not prose. Some EOTs (e.g.
// eot-english-pnp.json) stored the text in `source` by mistake; a plausible
// path has no newline, is short, and looks like a path (a separator or a file
// extension). Anything else falls back to the scene file name, disclosed.
const plausiblePath = (s) => typeof s === "string" && s.length > 0 && s.length <= 1024 &&
  !s.includes("\n") && (s.includes("/") || /\.[a-z0-9]{1,8}$/i.test(s));
const addressOf = (eot, file) => (plausiblePath(eot.source) ? eot.source : file);

// One pass per distinct source: keep the read with the most bound edges.
const bySource = new Map();
const dropped = [];
for (const f of files) {
  let eot;
  try { eot = JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8")); } catch (e) { console.error(`skip ${f}: ${e.message}`); continue; }
  if (!eot || typeof eot !== "object" || !Array.isArray(eot.edges)) { console.error(`skip ${f}: not an EOT`); continue; }
  const bound = eot.edges.filter((e) => e.subject && e.object && e.action).length;
  const src = addressOf(eot, f);
  const prev = bySource.get(src);
  if (!prev || bound > prev.bound) {
    if (prev) dropped.push({ file: prev.file, bound: prev.bound });
    bySource.set(src, { file: f, eot, bound, address: src });
  } else dropped.push({ file: f, bound });
}

let weft = emptyWeft();
const perSource = [];
for (const { file, eot, bound, address } of bySource.values()) {
  weft = appendEot(weft, eot, { address });
  perSource.push({ source: path.basename(address), file, bound, language: eot.language ?? null });
}

const jsonl = serializeWeftJsonl(weft);

// The projections (pure): the whole-corpus cloth, the attestations, the refs.
const cloth = holographAll(weft);
const attestations = [...weftAttestations(weft)];
const referents = [...weftReferents(weft)];
const multiPass = referents.filter((r) => r.passes > 1).length;

if (!DRY) fs.writeFileSync(OUT, jsonl);

console.log(`corpus EOT — ${weft.length} pass(es) → ${path.relative(process.cwd(), OUT)}`);
console.log(`  bytes:      ${Buffer.byteLength(jsonl, "utf8")}`);
for (const p of perSource) console.log(`  pass  ${String(p.bound).padStart(6)} bound  ${p.language ?? "?"}  ${p.source}`);
if (dropped.length) console.log(`  dropped (older/shorter read of a kept source): ${dropped.map((d) => d.file).join(", ")}`);
console.log(`  cloth:      ${cloth.referents.length} referent holons · ${cloth.relations.length} relations`);
console.log(`  referents:  ${referents.length} across the corpus · ${multiPass} seen in >1 pass`);
console.log(`  attest:     ${attestations.length} addressed relations (the hyperlexicon's seam)`);

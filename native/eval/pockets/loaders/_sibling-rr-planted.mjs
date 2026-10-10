// loaders/_sibling-rr-planted.mjs — INSTRUMENT-CHECK pockets for the replication of comp.rigidR (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// Two NEW planted worlds, built with the atlas planted machinery UNCHANGED (loaders/planted.mjs buildPocket, _planted-core/_planted-worlds*) but under NEW pocket ids, so every document has its own new seeded rng
// (rngOf(seedOf("planted-v1", id, "doc", d))): independent replicates of the atlas worlds pl-null and pl-frames, not the same text.
//   rr-pl-null    iid Zipf(1.0) over 5000 types, no structure of any kind (planted law: NONE)           expected: comp.rigidR not PRESENT
//   rr-pl-frames  7 rigid frames over 8 function words and two open classes + vocative slot            expected: comp.rigidR PRESENT+ (atlas pl-frames: z +33 / +78)
// These are SYNTHETIC (group "sib", register "planted"); they test the instrument, never the empirical generality of the law, and are reported apart from the real siblings.
import { validate } from "../lib/pocket.mjs";
import { NDOCS } from "./_planted-core.mjs";
import { NULL } from "./_planted-worlds1.mjs";
import { FRAMES_WORLD } from "./_planted-worlds2.mjs";
import { buildPocket } from "./planted.mjs";

const SPECS = [
  { id: "rr-pl-null", world: NULL, ndocs: NDOCS, notes: "replicate of pl-null (new id, new seeds): iid Zipf(1.0) over 5000 types; unit lengths iid lognormal D1; NO structure of any kind" },
  { id: "rr-pl-frames", world: FRAMES_WORLD, ndocs: NDOCS, notes: "replicate of pl-frames (new id, new seeds): 7 rigid frames over 8 function words and two open classes (Zipf within class) plus a unit-initial vocative slot filled from a per-document cast" },
];
export const IDS = SPECS.map((s) => s.id);
export async function load(onlyIds = null) {
  const out = [];
  for (const s of SPECS) { if (onlyIds && !onlyIds.includes(s.id)) continue; const p = buildPocket(s); p.group = "sib"; validate(p); out.push(p); }
  return out;
}

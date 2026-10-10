// loaders/_sibling-ent-ctl.mjs — LAW-FREE CONTROLS of three sibling pockets for the confirmation of order.entSlope (the sibling kind where the law is ABSENT BY CONSTRUCTION).
// Built exactly as the atlas ct-* controls (loaders/ctrl.mjs): same unigram counts, same multiset of unit lengths, same units per document; all tokens shuffled globally, unit lengths re-assigned by a global shuffle.
import { controlOf } from "./_sibling-ent-common.mjs";
import * as mouret from "./_sibling-ent-en-mouret.mjs";
import * as awakening from "./_sibling-ent-en-awakening.mjs";
import * as code from "./_sibling-ent-code.mjs";
export const SOURCES = { "ent-ctl-mouret": [mouret, "ent-en-mouret"], "ent-ctl-awakening": [awakening, "ent-en-awakening"], "ent-ctl-cd-ts": [code, "ent-cd-ts"] };
export async function load(onlyIds = null) {
  const out = [];
  for (const [cid, [mod, sid]] of Object.entries(SOURCES)) {
    if (onlyIds && !onlyIds.includes(cid)) continue;
    const src = (await mod.load([sid])).find((p) => p.id === sid);
    if (src) out.push(controlOf(src, cid));
  }
  return out;
}

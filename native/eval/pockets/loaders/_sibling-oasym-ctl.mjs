// loaders/_sibling-oasym-ctl.mjs — the ABSENT-KIND siblings of the order.asym replication (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// The atlas has NO real pocket where order.asym is ABSENT (390 of 390 PRESENT+), so the kind "where the law is absent" is the law-free kind: pockets with no word order.
//   oasym-ctl-aesop, oasym-ctl-ita, oasym-ctl-c : token-global-shuffled controls of three new siblings, built exactly as the atlas ct-* controls (loaders/ctrl.mjs): vocabulary, unigram law, unit-length law and
//                                                  document grid of a REAL new sibling, every word-order regularity destroyed (ABSENT by construction).
//   oasym-pl-iid, oasym-pl-iid2                  : FRESH iid Zipf worlds (the atlas pl-null / pl-null2 designs, new document seeds, new lexicon): no structure of any kind.
//   oasym-pl-markov                              : FRESH rank-bin Markov world (the atlas pl-markov design, new seeds): the instrument's known-PRESENT world (not an absent-kind pocket).
import { controlOf, plantedFresh } from "./_sibling-oasym-common2.mjs";
import * as prose from "./_sibling-oasym-prose.mjs";
import * as ud from "./_sibling-oasym-ud.mjs";
import * as code from "./_sibling-oasym-code.mjs";
export const CTL = { "oasym-ctl-aesop": ["oasym-en-aesop", prose], "oasym-ctl-ita": ["oasym-ud-ita-train", ud], "oasym-ctl-c": ["oasym-cd-c-held", code] };
export const PL = { "oasym-pl-iid": "iid", "oasym-pl-iid2": "iid2", "oasym-pl-markov": "markov" };
export const IDS = [...Object.keys(CTL), ...Object.keys(PL)];
export async function load(onlyIds = null) {
  const out = [];
  for (const [id, [srcId, mod]] of Object.entries(CTL)) { if (onlyIds && !onlyIds.includes(id)) continue; const [src] = await mod.load([srcId]); out.push(controlOf(src, id)); }
  for (const [id, kind] of Object.entries(PL)) if (!onlyIds || onlyIds.includes(id)) out.push(plantedFresh(id, kind));
  return out;
}

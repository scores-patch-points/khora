// loaders/_sibling-rigidl-ctl.mjs — LAW-FREE CONTROLS for the SIBLING REPLICATION of comp.rigidL (underscore: ignored by run-atlas.mjs). NEW FILE.
// A control is the token-global shuffle of a sibling (builder controlOf of _sibling-ent-common.mjs, the same as the atlas ct-* group: every token shuffled across the pocket, unit lengths re-assigned by a global shuffle, same units per
// document): it keeps vocabulary, unigram law, unit-length law and the document grid and destroys all order. rigidL must not fire on it. INSTRUMENT CHECK, never part of the law's count.
import { controlOf } from "./_sibling-ent-common.mjs";
import * as prose from "./_sibling-asym-prose.mjs";
import * as js from "./_sibling-js.mjs";
export const SRC = { "rl-ctl-en-mouret": ["asym-en-mouret", prose], "rl-ctl-js-fold": ["sib-js-fold", js] };
export const IDS = Object.keys(SRC);
export async function load(onlyIds = null) {
  const out = [];
  for (const [id, [srcId, mod]] of Object.entries(SRC)) { if (onlyIds && !onlyIds.includes(id)) continue; const [src] = await mod.load([srcId]); out.push(controlOf(src, id)); }
  return out;
}

// loaders/_sibling-asym-ctl.mjs — LAW-FREE CONTROLS of two comp.asym siblings (underscore: ignored by run-atlas.mjs). NEW FILE.
// A control is the token-global shuffle of its source exactly as the atlas ct-* controls (loaders/ctrl.mjs; builder controlOf in _sibling-ent-common.mjs: all tokens shuffled globally, unit lengths re-assigned by a global
// shuffle, same number of units per document). It keeps the vocabulary, the unigram law, the unit-length law and the document grid and destroys every word-order regularity: ABSENT by construction.
// They are an INSTRUMENT CHECK (no false PRESENT on a real vocabulary), not a test of the law.
import { controlOf } from "./_sibling-ent-common.mjs";
import * as prose from "./_sibling-asym-prose.mjs";
import * as code from "./_sibling-asym-code.mjs";
export const SRC = { "asym-ctl-about-london": ["asym-en-about-london", prose], "asym-ctl-cd-js": ["asym-cd-js", code] };
export const IDS = Object.keys(SRC);
export async function load(onlyIds = null) {
  const out = [];
  for (const [id, [srcId, mod]] of Object.entries(SRC)) { if (onlyIds && !onlyIds.includes(id)) continue; const [src] = await mod.load([srcId]); out.push(controlOf(src, id)); }
  return out;
}

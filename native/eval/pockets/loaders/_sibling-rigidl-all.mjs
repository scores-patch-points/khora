// loaders/_sibling-rigidl-all.mjs — aggregate of every sibling pocket of the confirmation of comp.rigidL (underscore: ignored by run-atlas.mjs). NEW FILE.
// MODS lists, per loader module, the pocket ids that the confirmation uses (the other pockets of a module are never built here). Loaders written by earlier agents are IMPORTED UNCHANGED (their material is documented in their own headers
// and in results/confirm-comp.rigidL/confirm.mjs); loaders prefixed _sibling-rigidl- are new for this confirmation.
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MODS = [
  ["_sibling-js.mjs", ["sib-js-fold", "sib-js-heimdall", "sib-js-eoreader7"]],
  ["_sibling-py.mjs", ["sib-py-foldvenv"]],
  ["_sibling-asym-code.mjs", ["asym-cd-js", "asym-cd-ts", "asym-cd-py"]],
  ["_sibling-ent-code.mjs", ["ent-cd-js", "ent-cd-ts", "ent-cd-py"]],
  ["_sibling-sfx-code.mjs", ["sfx-cd-py314", "sfx-cd-rb26", "sfx-cd-chdr", "sfx-cd-npmjs"]],
  ["_sibling-rigidl-repos.mjs", ["rl-css-repos", "rl-yaml-repos"]],
  ["_sibling-asym-prose.mjs", ["asym-en-about-london", "asym-en-among-forces", "asym-en-dolls-house", "asym-en-mouret", "asym-en-poe2", "asym-en-awakening", "asym-en-waikna", "asym-en-early-plays"]],
  ["_sibling-entcurv-en-yonge.mjs", ["ec-en-yonge"]],
  ["_sibling-entcurv-en-swisshelm.mjs", ["ec-en-swisshelm"]],
  ["_sibling-entcurv-en-shakespeare.mjs", ["ec-en-shakespeare"]],
  ["_sibling-entcurv-en-children.mjs", ["ec-en-children"]],
  ["_sibling-asym-chat.mjs", ["asym-oc-irc-ho-0607", "asym-oc-irc-ho-0809"]],
  ["_sibling-asym-ud.mjs", ["asym-ud-ita", "asym-ud-nld", "asym-ud-rus", "asym-ud-ces", "asym-ud-dan", "asym-ud-lit", "asym-ud-ell", "asym-ud-tur", "asym-ud-hye", "asym-ud-kat", "asym-ud-gle", "asym-ud-afr", "asym-ud-mlt", "asym-ud-wol"]],
  ["_sibling-ent-ud-lat-perseus.mjs", ["ent-ud-lat-perseus"]],
  ["_sibling-bpmn.mjs", ["sib-bpmn-miwg-heldout", "sib-bpmn-kogito-heldout", "sib-bpmn-activiti-heldout"]],
  ["_sibling-rigidl-law.mjs", ["rl-law-fr-heldout"]],
  ["_sibling-para-notation.mjs", ["sp-protein-aa", "sp-smiles-ccd"]],
  ["_sibling-rigidl-chem.mjs", ["rl-smiles-pubchem-heldout", "rl-codons-heldout"]],
  ["_sibling-rigidl-ctl.mjs", ["rl-ctl-en-mouret", "rl-ctl-js-fold"]],
];
export const IDS = MODS.flatMap(([, ids]) => ids);
/** load(onlyIds): build only the pockets whose id is in onlyIds (all when null); each module is asked only for its own ids. */
export async function load(onlyIds = null) {
  const out = [];
  for (const [file, ids] of MODS) {
    const want = onlyIds ? ids.filter((i) => onlyIds.includes(i)) : ids;
    if (!want.length) continue;
    const m = await import(pathToFileURL(path.join(HERE, file)).href);
    for (const p of await m.load(want)) { p.meta = { ...(p.meta ?? {}), siblingModule: file }; out.push(p); }
  }
  return out;
}

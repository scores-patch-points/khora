// loaders/_sibling-entcurv-ctl.mjs — LAW-FREE CONTROLS for the confirmation of order.entCurv: token-global-shuffled copies (built exactly as the atlas ct-* controls, see controlOf in
// _sibling-entcurv-common.mjs) of the novel sibling ec-en-yonge and the JavaScript sibling ec-cd-js. They hold the real vocabulary, the real unit-length distribution and the real documents, and no arrangement at all:
// they test the INSTRUMENT (no false PRESENT on real vocabularies and unit-length laws), not the law.
import { controlOf } from "./_sibling-entcurv-common.mjs";
import * as yonge from "./_sibling-entcurv-en-yonge.mjs";
import * as code from "./_sibling-entcurv-code.mjs";
export const IDS = ["ec-ctl-yonge", "ec-ctl-js"];
export async function load(onlyIds = null) {
  const want = (id) => !onlyIds || onlyIds.includes(id), out = [];
  if (want("ec-ctl-yonge")) out.push(controlOf((await yonge.load([yonge.ID]))[0], "ec-ctl-yonge"));
  if (want("ec-ctl-js")) out.push(controlOf((await code.load(["ec-cd-js"]))[0], "ec-ctl-js"));
  return out;
}

// loaders/_sibling-rr-ctl.mjs — LAW-FREE CONTROLS for the replication of comp.rigidR (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// Each control is a token-global-shuffled copy of one sibling, built EXACTLY as loaders/ctrl.mjs builds the atlas ct-* controls (all tokens shuffled globally, unit lengths re-assigned by a global shuffle, same
// number of units per document; seed = seedOf("ctrl-v1", sourceId)). Law-free by construction: every order statistic is a draw from its own null. They are instrument checks, not siblings of the law.
//   rr-ct-en-mouret  control of rr-en-mouret (English novel)       rr-ct-cd-js  control of rr-cd-js (JavaScript)
import { validate, rngOf, seedOf } from "../lib/pocket.mjs";
import { load as loadProse } from "./_sibling-rr-prose.mjs";
import { load as loadCode } from "./_sibling-rr-code.mjs";

function controlOf(src, id) {
  const rnd = rngOf(seedOf("ctrl-v1", src.id)), sh = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const flat = sh(src.units.flat()), lens = sh(src.units.map((u) => u.length));
  let o = 0; const units = lens.map((n) => { const u = flat.slice(o, o + n); o += n; return u; });
  const p = { id, group: "sib", register: "control", language: src.language, script: src.script ?? null, units, docOf: src.docOf.slice(),
    meta: { tokenisation: `control of ${src.id}: ${src.meta?.tokenisation ?? ""}`, docDef: "same units-per-document counts as the source", source: `shuffled-real control of ${src.id}`, controlOf: src.id, sibling: true,
      notes: "tokens shuffled globally, unit lengths re-assigned by a global shuffle; law-free by construction (instrument check, as the atlas ct-* group)" } };
  validate(p);
  return p;
}
export const IDS = ["rr-ct-en-mouret", "rr-ct-cd-js"];
export async function load(onlyIds = null) {
  const out = [];
  if (!onlyIds || onlyIds.includes("rr-ct-en-mouret")) out.push(controlOf((await loadProse(["rr-en-mouret"]))[0], "rr-ct-en-mouret"));
  if (!onlyIds || onlyIds.includes("rr-ct-cd-js")) out.push(controlOf((await loadCode(["rr-cd-js"]))[0], "rr-ct-cd-js"));
  return out;
}

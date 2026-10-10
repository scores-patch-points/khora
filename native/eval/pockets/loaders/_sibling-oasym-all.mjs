// loaders/_sibling-oasym-all.mjs — aggregate of every order.asym sibling loader (underscore: ignored by run-atlas.mjs). NEW FILE.
import * as prose from "./_sibling-oasym-prose.mjs";
import * as ud from "./_sibling-oasym-ud.mjs";
import * as code from "./_sibling-oasym-code.mjs";
import * as ctl from "./_sibling-oasym-ctl.mjs";
export const MODS = [prose, ud, code, ctl];
export const IDS = MODS.flatMap((m) => m.IDS);
export async function load(onlyIds = null) { const out = []; for (const m of MODS) { const want = onlyIds ? m.IDS.filter((i) => onlyIds.includes(i)) : null; if (want && !want.length) continue; out.push(...await m.load(want)); } return out; }

// loaders/_sibling-asym-all.mjs — aggregate of every comp.asym sibling loader (underscore: ignored by run-atlas.mjs). NEW FILE.
import * as prose from "./_sibling-asym-prose.mjs";
import * as chat from "./_sibling-asym-chat.mjs";
import * as code from "./_sibling-asym-code.mjs";
import * as ud from "./_sibling-asym-ud.mjs";
import * as ctl from "./_sibling-asym-ctl.mjs";
export const MODS = [prose, chat, code, ud, ctl];
export const IDS = MODS.flatMap((m) => m.IDS);
export async function load(onlyIds = null) { const out = []; for (const m of MODS) { const want = onlyIds ? m.IDS.filter((i) => onlyIds.includes(i)) : null; if (want && !want.length) continue; out.push(...await m.load(want)); } return out; }

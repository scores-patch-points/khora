// eval/pockets/loaders/_ud_ml_run.mjs — finish a pocket (cap, validate, thin check) and drive a lazy spec list. Shared by loaders/ud.mjs and loaders/ml.mjs.
import { validate, tokenCount } from "../lib/pocket.mjs";
import { capByHash } from "./_ud_ml_common.mjs";

/** finish({id, group, register, language, script, units, docOf, meta}) -> {pocket, row} or {thin:{tokens,docs}}. Drops nothing silently: the caller records thin pockets. */
export function finish(p) {
  const raw = tokenCount(p.units), rawDocs = new Set(p.docOf).size;
  if (raw < 20000 || rawDocs < 20) return { thin: { tokens: raw, docs: rawDocs, units: p.units.length } };
  const c = capByHash(p.id, p.units, p.docOf);
  const pocket = { id: p.id, group: p.group, register: p.register, language: p.language, script: p.script ?? null, units: c.units, docOf: c.docOf, meta: { ...p.meta, cap: p.meta?.cap ?? c.cap } };
  const v = validate(pocket);
  if (v.thin) return { thin: { tokens: v.tokens, docs: v.docs, units: v.units } };
  const row = { id: pocket.id, group: pocket.group, tokens: v.tokens, units: v.units, docs: v.docs, register: pocket.register, language: pocket.language, script: pocket.script,
    tokenisation: pocket.meta.tokenisation, grain: /^(ud-[a-z-]+|char-[a-z]+):/.exec(pocket.meta.tokenisation)?.[1] ?? "word", docDef: pocket.meta.docDef, source: pocket.meta.source, cap: pocket.meta.cap, notes: pocket.meta.notes ?? null };
  return { pocket, row };
}

/** runLoader(specs, onlyIds): specs = [{id, build: async () => pocketInput | {skip: reason}}]. Builds lazily (only ids in onlyIds when given).
 *  Returns {pockets, rows, skipped:[{id, reason, tokens?, docs?}]}. */
export async function runLoader(specs, onlyIds = null) {
  const pockets = [], rows = [], skipped = [];
  for (const s of specs) {
    if (onlyIds && !onlyIds.includes(s.id)) continue;
    let r;
    try { r = await s.build(); } catch (e) { skipped.push({ id: s.id, reason: `build error: ${String(e.message).slice(0, 200)}` }); continue; }
    if (!r || r.skip) { skipped.push({ id: s.id, reason: r?.skip ?? "empty" }); continue; }
    let f;
    try { f = finish(r); } catch (e) { skipped.push({ id: s.id, reason: `validate error: ${String(e.message).slice(0, 200)}` }); continue; }
    if (f.thin) { skipped.push({ id: s.id, reason: "thin (<20,000 tokens or <20 documents)", ...f.thin }); continue; }
    pockets.push(f.pocket); rows.push(f.row);
  }
  return { pockets, rows, skipped };
}

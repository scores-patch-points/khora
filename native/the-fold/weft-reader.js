// weft-reader.js — THE READER IS A PROJECTION OF THE WEFT. The weft (weft.js) is the one append-only log of reading passes; a reading of a document is a pass, and a RE-ENTRY (reread.js) is
// another pass at the same address, carrying what the more careful reading added as relations and what it retracted by key. The reader of reader-identity.js is then `readerAt(weft, cursor)`,
// projected from the passes exactly as the cloth is (clothAt), so the reader's state, the record of getting to the read, and the holograph are one log at a cursor. No second store.
//   passOf({ address, category, atoms, before, pass, tier, trigger }) → a weft pass in the SidecarRead@2 shape the weft's consumers read (cast, relations with byte offsets), plus
//                       `pass`, `tier`, `trigger`, `retracted` (the keys of relations the earlier reading had that this one has not). The first reading is pass 0 with no `before`.
//   readerAt(weft, { asOf }) → a reader-identity reader: every relation of every pass up to the cursor admitted at its first participant's address (and at its second, in position 1), each
//                       retraction applied; the address of a being is its ref, its surface its name.
// Pure. The weft is never mutated (appendPass is immutable); this module reads it.
import { appendPass } from "./weft.js";
import { createReader, admit, retract } from "../kernel/reader-identity.js";

const keyOf = (a) => a.text ?? JSON.stringify([a.pred, (a.args ?? []).map((x) => x.entity ?? x.value)]);
const part = (x) => (x?.entity != null ? { ref: x.entity, surface: x.name ?? "", standing: "referent" } : { ref: null, surface: x?.measure && x?.base != null ? `${x.measure}:${x.base}` : String(x?.value ?? ""), standing: x?.measure ? "figure" : "value" });
const atOf = (a) => (Number.isFinite(a.doc?.start) ? a.doc.start : Number.isFinite(a.start) ? a.start : null);

export function passOf({ address, category = null, atoms = [], before = null, pass = 0, tier = "reading", trigger = null } = {}) {
  if (!address) throw new TypeError("weft-reader: a pass must carry an address");
  const had = before ? new Set(before.map(keyOf)) : null, has = new Set(atoms.map(keyOf));
  const fresh = had ? atoms.filter((a) => !had.has(keyOf(a))) : atoms, retracted = before ? before.filter((a) => !has.has(keyOf(a))).map(keyOf) : [];
  const cast = new Map(); for (const a of fresh) for (const x of a.args ?? []) if (x.entity != null) { const c = cast.get(x.entity) ?? cast.set(x.entity, { ref: x.entity, surface: x.name ?? "", mentionsAt: [] }).get(x.entity); const at = atOf(a); if (at != null) c.mentionsAt.push(at); }
  const relations = fresh.map((a) => ({ relation: a.pred, key: keyOf(a), participants: (a.args ?? []).map(part), slots: a.slots ?? null, at: atOf(a), neg: !!a.neg, time: a.time ?? null }));
  return { address, category, pass, tier, trigger, cast: [...cast.values()], relations, retracted };
}
export const appendReading = (weft, opts) => appendPass(weft, passOf(opts));

// a relation as the arrangements of each referent participant (the shape reader-identity's arrangementsOf gives from atoms)
function arrangementsOfRelation(rel) {
  const out = []; const ps = rel.participants ?? [];
  ps.forEach((p, i) => { if (p.ref == null) return; const pos = rel.slots?.[i] ?? i; const others = ps.filter((_, j) => j !== i);
    const mine = [];
    if (i === 0 && p.surface) { const t = String(p.surface).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2); if (t.length) mine.push({ rel: "name", value: t.at(-1) }); }
    for (const o of others) mine.push({ rel: `${rel.relation}@${pos}`, value: o.standing === "figure" ? o.surface : String(o.surface ?? "").toLowerCase() });
    if (!others.length) mine.push({ rel: `${rel.relation}@${pos}`, value: "" });
    out.push({ ref: p.ref, arrangements: mine }); });
  return out;
}
export function readerAt(weft, { asOf = Infinity, alpha = 1 } = {}) {
  let r = createReader({ alpha }); const byKey = new Map(); const named = new Set();
  for (const pass of weft) {
    if (Number.isFinite(pass.seq) && pass.seq > asOf) break;
    for (const rel of pass.relations ?? []) { if (!rel.key) continue; byKey.set(rel.key, rel);
      for (const { ref, arrangements } of arrangementsOfRelation(rel)) { const arr = named.has(ref) ? arrangements.filter((a) => a.rel !== "name") : arrangements; named.add(ref); r = admit(r, ref, arr, { pass: pass.pass ?? 0, tier: pass.tier ?? "reading", doc: pass.address }); } }
    for (const key of pass.retracted ?? []) { const rel = byKey.get(key); if (!rel) continue; for (const { ref, arrangements } of arrangementsOfRelation(rel)) r = retract(r, ref, arrangements.filter((a) => a.rel !== "name"), { pass: pass.pass ?? 0, tier: pass.tier ?? "reading", doc: pass.address }); }
  }
  return r;
}

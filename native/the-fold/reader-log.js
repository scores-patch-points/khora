// reader-log.js — THE READER'S STATE AND THE RECORD OF GETTING TO THE READ ARE ONE LOG. A reading admits each being's arrangements (pass 0); a re-entry pass (reread.js) appends what the more
// careful reading added as admissions and what it removed as retractions, each tagged with the pass; the reader at any cursor is the projection (reader-identity.js stateAt), and a being's
// identity is its trajectory across the cursors: what meeting it did to the reader, pass by pass. The read is a projection of the record; the record is the content.
//   readerOf(atoms, { doc }) → a reader with every being's arrangements admitted at pass 0
//   admitPass(reader, { before, after, pass, tier, doc }) → the reader after the pass: admissions for the atoms the pass added, retractions for the ones it removed
//   trajectoryOf(reader, address) → [{ at, kind, pass, tier, rel, value }] the being's own events, in order
//   logOf(reader) → the whole log as rows (RereadAdmission@1), for the weft or a jsonl
import { createReader, admit, retract, arrangementsOf } from "../kernel/reader-identity.js";

export function readerOf(atoms, { doc = "src", alpha = 1 } = {}) {
  let r = createReader({ alpha });
  for (const id of [...new Set(atoms.flatMap((a) => (a.args ?? []).filter((x) => x.entity != null).map((x) => x.entity)))]) r = admit(r, id, arrangementsOf(atoms, id), { pass: 0, tier: "reading", doc });
  return r;
}
const key = (a) => a.text ?? JSON.stringify([a.pred, (a.args ?? []).map((x) => x.entity ?? x.value)]);
export function admitPass(reader, { before = [], after = [], pass, tier, doc = "src" } = {}) {
  const had = new Set(before.map(key)), has = new Set(after.map(key));
  const added = after.filter((a) => !had.has(key(a))), removed = before.filter((a) => !has.has(key(a)));
  let r = reader;
  for (const id of [...new Set(added.flatMap((a) => (a.args ?? []).filter((x) => x.entity != null).map((x) => x.entity)))]) r = admit(r, id, arrangementsOf(added, id, { name: !reader.addresses.has(id) }), { pass, tier, doc });
  for (const id of [...new Set(removed.flatMap((a) => (a.args ?? []).filter((x) => x.entity != null).map((x) => x.entity)))]) r = retract(r, id, arrangementsOf(removed, id, { name: false }), { pass, tier, doc });
  return r;
}
export const trajectoryOf = (reader, address) => reader.admissions.filter((a) => a.address === address).map(({ at, kind, pass, tier, rel, value }) => ({ at, kind, pass, tier, rel, value }));
export const logOf = (reader) => reader.admissions.map((a) => ({ schema: "RereadAdmission@1", ...a }));

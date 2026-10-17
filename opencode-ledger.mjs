// opencode-ledger.mjs — THE LEDGER: <task>/weft.jsonl, the one append-only store the meaning framework writes to.
// It is the human-readable twin of the weft's packed segments, NOT a parallel schema: every row carries the
// weft-lean envelope (native/the-fold/weft-lean.mjs leanOf: a address, l layer, g, w, ws, s seq, ins, seg, con, eva —
// INS a being, CON a relation at an address, EVA only where a sign changed), so asPass()/clothAt() (weft.js) read it
// unchanged. The framework's audit numbers ride in `m`, beside the envelope, never in it. Bytes stay in git and the
// files; a row is the MEANING, keyed to its bytes by `git: {commit,file,span}` when the caller has them.
//
// DMD GATE AT THE WRITE BOUNDARY: "EVA recorded ONLY where it made a difference; the default is not a record."
// A row that says `dmd:false` (a restatement, a repeat) is not appended; a second row for the same
// (schema, block, reader, register, generation) is a repeat and is not appended. Append-only does NOT mean
// record every edit — that path is the 13 GB database.
//
// Every row is one JSON line with a `schema`, an EO `op`, and a content address `id` (sha256 of the row without it).
// Delta rows, stake hits, pathos concessions and closure verdicts are all rows here; every view is a projection (fold).
//
// THE FOLD IS INCREMENTAL (the eodb pattern: state(t) = fold(events[0..t]) with a cursor, an index kept as rows
// arrive, never a rescan): a per-file cursor holds the byte offset already folded, so a read costs only the bytes
// appended since. Indexes by schema and by referent are maintained as rows land. A torn last line (a write in
// flight) is left for the next read, never dropped; a file that shrank is refolded from zero.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { taskDir } from "./opencode-worknotes.mjs";
import { emptyWeft, appendPass, clothAt } from "./native/the-fold/weft.js";
import { asPass } from "./native/the-fold/weft-store.mjs";

export const ledgerFile = (task) => { const d = taskDir(task); return d ? path.join(d, "weft.jsonl") : null; };
const idOf = (row) => crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex").slice(0, 16);

const cursors = new Map(); // file -> { offset, rows, bySchema, byReferent, bytesRead }
const fresh = () => ({ offset: 0, rows: [], bySchema: new Map(), byReferent: new Map(), bytesRead: 0 });

/** Append one row. Single O_APPEND write of one line: concurrent writers interleave whole lines, never bytes. */
export function append(task, row) {
  const file = ledgerFile(task);
  if (!file || !row || typeof row.schema !== "string" || typeof row.op !== "string") return { ok: false, gap: "bad-row" };
  if (row.dmd === false) return { ok: true, skipped: "no-difference" };
  if (row.block && fold(task).rows.some((r) => r.schema === row.schema && r.block === row.block && r.reader === row.reader && r.register === row.register && r.generation === row.generation)) return { ok: true, skipped: "repeat" };
  const body = { ...row, ts: row.ts ?? Date.now() };
  const full = { ...body, id: idOf(body) };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(full) + "\n");
  return { ok: true, id: full.id };
}

/** The weft-lean envelope for a row: ins (beings admitted), con ([end1,label,end2,at,start,end,clause]), eva (sign changes, only). */
export function lean(task, { layer = "meaning", ins = [], con = [], eva = [], at = -1, clause = "" } = {}) {
  return {
    a: `${task}/weft`, l: layer, g: null, w: 0, ws: null, s: fold(task).rows.length,
    ins, seg: [], con: con.map(([e1, label, e2]) => [e1, label, e2, at, 0, 0, clause]), eva,
  };
}

/** Fold the ledger to its current state, reading only what was appended since the last fold of this file. */
export function fold(task) {
  const file = ledgerFile(task);
  if (!file) return fresh();
  let c = cursors.get(file);
  let size = 0;
  try { size = fs.statSync(file).size; } catch { cursors.delete(file); return fresh(); }
  if (!c || size < c.offset) { c = fresh(); cursors.set(file, c); }
  if (size === c.offset) return c;
  const fd = fs.openSync(file, "r");
  let buf;
  try { buf = Buffer.alloc(size - c.offset); fs.readSync(fd, buf, 0, buf.length, c.offset); } finally { fs.closeSync(fd); }
  c.bytesRead += buf.length;
  const text = buf.toString("utf8");
  const end = text.lastIndexOf("\n") + 1; // a torn tail waits for its newline
  let consumed = 0;
  for (const line of text.slice(0, end).split("\n")) {
    consumed += Buffer.byteLength(line) + 1;
    if (!line) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; } // a line that does not parse is dropped, never a kill
    c.rows.push(r);
    if (!c.bySchema.has(r.schema)) c.bySchema.set(r.schema, []);
    c.bySchema.get(r.schema).push(r);
    if (r.referent) { if (!c.byReferent.has(r.referent)) c.byReferent.set(r.referent, []); c.byReferent.get(r.referent).push(r); }
  }
  c.offset += Buffer.byteLength(text.slice(0, end));
  return c;
}

/** Rows of one schema (and optionally one referent), in ledger order. */
export function rows(task, { schema, referent } = {}) {
  const c = fold(task);
  const base = referent ? (c.byReferent.get(referent) ?? []) : schema ? (c.bySchema.get(schema) ?? []) : c.rows;
  return schema && referent ? base.filter((r) => r.schema === schema) : base;
}

/** The ledger's rows as passes the weft's own functions read (weft-store.asPass), appended with weft.js appendPass. */
export function weft(task) {
  let w = emptyWeft();
  for (const r of rows(task)) if (r.a && Array.isArray(r.con)) w = appendPass(w, asPass(r));
  return w;
}
/** The cloth (hologram) projected from the ledger at a cursor: weft.js clothAt. */
export const cloth = (task, { asOf = Infinity } = {}) => clothAt(weft(task), { asOf });

/** Test seam: forget the cursors (a fresh process). */
export const _forget = () => cursors.clear();

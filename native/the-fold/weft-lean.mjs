// the-fold/weft-lean.mjs — THE WEFT AS DISTINCTIONS THAT MAKE A DIFFERENCE, in binary.  (2026-10-14)
//
// A distinction that makes a difference (DMD; Bateson; kernel/obligations.js `materiality.makesDifference`) is the only thing a
// log of reading has to keep — and what it keeps is not the corpus. The mind's substrate is the RECORD OF TRANSFORMATIONS: what
// the reading DID, as acts of the nine operators, each at the byte it was done at. The corpus stays where it is; an address
// re-expands it (the weft's own rule, weft.js: "a holon stands in for its material, re-expandable by address").
//
//   INS  a being was admitted from the Void          [surface]
//   SEG  a sentence was cut into a clause, under a parent, by a relation (complement, adverbial, relative …) and a marker
//                                                       [id, parent, relation, marker, at]
//   CON  two ends were connected by a connector, at a byte, inside a clause     [end1, label, end2, at, clause]
//   EVA  an evaluation changed a sign — recorded ONLY where it made a difference (a negation); the default is not a record
//                                                       [kind ("con" | "seg"), index]
//
// What a full pass carries and this does not: the sentence text of every edge and every clause (the file holds those bytes), the
// constant polarity "+" on 93% of edges, `assertion: { standing: "single-witness", statements: 1 }`, `end1Face: null`, a
// clause's token list, the localRefs the reader numbered before the file addressed them. Measured on the foundation read (204
// passes, 44,689 edges, 206,212 clauses): 178.5 MB of JSON, 141.7 MB of it the clause records (79%); as transformation
// records 12 MB of JSON, 0.4 MB per 60 passes in binary (1.75% of the JSON).
//
//   leanOf(pass)            → the transformation records of one pass (plain JSON, canonical)
//   pack(passes)            → Buffer: magic · brotli( varint sections over one string table )
//   unpack(buf)             → the records back, exactly
//   expand(lean, read)      → what the dropped text would be, from the file's own bytes (`read(file) → Buffer`)
//
// Pure. No model. Lossless over the transformations, not over the full pass (weft-lean.test.js: the dropped text re-expands
// from the bytes, and a consumer of attestations sees the same relations).

import zlib from "node:zlib";

export const LEAN_SCHEMA = "WeftLean@1";
const MAGIC = Buffer.from("WEFT1\u0000");
const REL = ["root", "complement", "open-complement", "subject-clause", "adverbial", "adnominal", "relative", "parataxis", "coordinate", "list", "apposition"];
const relId = (r) => { const i = REL.indexOf(r); return i < 0 ? REL.length : i; };
const atOf = (a) => { const m = /#(\d+)$/.exec(String(a ?? "")); return m ? Number(m[1]) : -1; };

/** One full pass → its transformation records. Every number is a file BYTE offset or a small enum; every string is a name. */
export function leanOf(p) {
  const clauses = p.clauses ?? [];
  const idxOf = new Map(clauses.map((c, i) => [c.id, i]));
  const con = [], eva = [];
  for (const e of p.edges ?? []) {
    if (!(e?.end1 && e?.label && e?.end2)) continue;
    const s0 = e.spans?.[0];
    con.push([e.end1Face ?? e.end1, e.label, e.end2Face ?? e.end2, atOf(s0?.ref ?? e.refs?.[0]), s0?.start ?? 0, s0?.end ?? 0, e.clause ?? ""]);
    if (e.polarity === "-") eva.push(["con", con.length - 1]);
  }
  for (const r of p.relations ?? []) {                           // the door's shape: a connector at a byte, no span text to drop
    if (!r?.relation) continue;
    con.push([r.relation, r.participants?.[0]?.surface ?? "", r.participants?.[1]?.surface ?? "", Number.isFinite(r.at) ? r.at : -1, 0, 0, ""]);
  }
  const seg = clauses.map((c, i) => { if (c.polarity === "-") eva.push(["seg", i]); return [c.id, c.parent ?? "", relId(c.relation), c.marker ?? "", atOf(c.own?.at)]; });
  void idxOf;
  return {
    a: p.address, l: p.foundation?.layer ?? p.category ?? null, g: p.foundation?.language ?? p.language ?? null,
    w: p.foundation?.windowStart ?? p.window?.startChar ?? 0, ws: Number.isFinite(p.foundation?.windowStart) ? p.foundation.windowStart : null, s: p.seq ?? null,
    ins: (p.cast ?? []).map((c) => c.surface).filter(Boolean),
    seg, con, eva,
  };
}

// ── varint / string-table codec ────────────────────────────────────────────────────────────────────────────────────
class W {
  constructor() { this.b = []; this.t = new Map(); this.strs = []; }
  u(n) { n = Math.max(0, Math.floor(n)); while (n >= 128) { this.b.push((n & 127) | 128); n = Math.floor(n / 128); } this.b.push(n); }
  s(x) { x = String(x ?? ""); let i = this.t.get(x); if (i === undefined) { i = this.strs.length; this.t.set(x, i); this.strs.push(x); } this.u(i); }
  i(n) { this.u(n < 0 ? 0 : n + 1); }                      // signed-ish: -1 → 0
}
class R {
  constructor(buf, strs) { this.b = buf; this.p = 0; this.strs = strs; }
  u() { let n = 0, m = 1, c; do { c = this.b[this.p++]; n += (c & 127) * m; m *= 128; } while (c & 128); return n; }
  s() { return this.strs[this.u()]; }
  i() { const n = this.u(); return n === 0 ? -1 : n - 1; }
}

export function pack(passes, { quality = 11 } = {}) {
  const w = new W();
  w.u(passes.length);
  for (const p of passes) {
    const l = p.ins !== undefined && Array.isArray(p.con) && Array.isArray(p.seg) ? p : leanOf(p);
    w.s(l.a); w.s(l.l); w.s(l.g); w.i(l.w); w.i(l.ws ?? -1); w.i(l.s ?? -1);
    w.u(l.ins.length); for (const x of l.ins) w.s(x);
    w.u(l.seg.length); for (const c of l.seg) { w.s(c[0]); w.s(c[1]); w.u(c[2]); w.s(c[3]); w.i(c[4]); }
    w.u(l.con.length); for (const e of l.con) { w.s(e[0]); w.s(e[1]); w.s(e[2]); w.i(e[3]); w.u(e[4]); w.u(e[5]); w.s(e[6]); }
    w.u(l.eva.length); for (const v of l.eva) { w.u(v[0] === "seg" ? 1 : 0); w.u(v[1]); }
  }
  // the string table goes first so a reader can resolve ids as it walks
  const table = new W();
  table.u(w.strs.length);
  const enc = Buffer.concat(w.strs.map((x) => { const bb = Buffer.from(x, "utf8"); const len = []; let n = bb.length; while (n >= 128) { len.push((n & 127) | 128); n = Math.floor(n / 128); } len.push(n); return Buffer.concat([Buffer.from(len), bb]); }));
  const body = Buffer.concat([Buffer.from(table.b), enc, Buffer.from(w.b)]);
  return Buffer.concat([MAGIC, zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: quality } })]);
}

export function unpack(buf) {
  if (buf.subarray(0, MAGIC.length).compare(MAGIC) !== 0) throw new Error("weft-lean: not a WEFT1 file");
  const body = zlib.brotliDecompressSync(buf.subarray(MAGIC.length));
  let p = 0;
  const u = () => { let n = 0, m = 1, c; do { c = body[p++]; n += (c & 127) * m; m *= 128; } while (c & 128); return n; };
  const nStr = u(); const strs = [];
  for (let i = 0; i < nStr; i++) { const len = u(); strs.push(body.toString("utf8", p, p + len)); p += len; }
  const r = new R(body, strs); r.p = p;
  const out = []; const n = r.u();
  for (let k = 0; k < n; k++) {
    const l = { a: r.s(), l: r.s() || null, g: r.s() || null, w: r.i(), ws: r.i(), s: r.i() };
    if (l.s < 0) l.s = null;
    if (l.ws < 0) l.ws = null;
    l.ins = []; for (let m = r.u(); m > 0; m--) l.ins.push(r.s());
    l.seg = []; for (let m = r.u(); m > 0; m--) l.seg.push([r.s(), r.s(), r.u(), r.s(), r.i()]);
    l.con = []; for (let m = r.u(); m > 0; m--) l.con.push([r.s(), r.s(), r.s(), r.i(), r.u(), r.u(), r.s()]);
    l.eva = []; for (let m = r.u(); m > 0; m--) l.eva.push([r.u() === 1 ? "seg" : "con", r.u()]);
    out.push(l);
  }
  return out;
}

/**
 * Re-expand what the lean pass does not hold, from the file's own bytes. `read(file) → Buffer | null`.
 * A clause's own words begin at its byte and run to the end of its first sentence (the clause's own end is a character offset in
 * the READ window, which the file reader cannot resolve without the window — so the clause is re-expanded to its sentence).
 */
export function expand(lean, read) {
  const buf = read(lean.a); if (!buf) return null;
  const sentenceAt = (at) => {
    if (at < 0) return null;
    const win = buf.subarray(at, at + 900).toString("utf8");
    const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(win);
    return (m ? m[0] : win.split(/\n/)[0]).replace(/\s+/g, " ").trim();
  };
  const neg = (kind) => new Set(lean.eva.filter((v) => v[0] === kind).map((v) => v[1]));
  const nc = neg("con"), ns = neg("seg");
  return {
    connections: lean.con.map((e, i) => ({ end1: e[0], label: e[1], end2: e[2], at: e[3], sentence: sentenceAt(e[3]), negative: nc.has(i) })),
    cuts: lean.seg.map((c, i) => ({ id: c[0], parent: c[1] || null, relation: REL[c[2]] ?? "other", marker: c[3] || null, negative: ns.has(i), at: c[4], text: sentenceAt(c[4]) })),
  };
}

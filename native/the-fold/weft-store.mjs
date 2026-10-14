// the-fold/weft-store.mjs — the weft's STORE: transformation records in binary segments, append-only.  (2026-10-14)
//
//   <dir>/seg-000001.bin, seg-000002.bin …   each one `pack(leanPasses)` (weft-lean.mjs), immutable once written
//
// The corpus stays where it is; this directory holds what the reading DID to it (INS, SEG, CON, EVA at byte addresses).
// A segment is never rewritten; a rerun resumes (a pass already in a segment, by address and window, is skipped).
// `baseSeq` is how many passes precede this store in the one weft (the committed UDHR baseline), so `seq` is the weft's own.
//
//   openStore(dir)            → { dir, passes(), keys(), nextSeq(baseSeq), append(leanPasses) }
//   asPass(lean)              → a pass-shaped object (address, seq, edges) the generic weft functions
//                               (weftAttestations, fieldFromWeft) consume; edges carry address + span offsets, no text
//   keyOf(lean)               → the resume key: address, or address@windowStart for a windowed read

import fs from "node:fs";
import path from "node:path";
import { pack, unpack } from "./weft-lean.mjs";

export const keyOf = (l) => (Number.isFinite(l.ws) ? `${l.a}@${l.ws}` : l.a);

export function openStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const segs = () => fs.readdirSync(dir).filter((f) => /^seg-\d{6}\.bin$/.test(f)).sort();
  const passes = () => segs().flatMap((f) => unpack(fs.readFileSync(path.join(dir, f))));
  return {
    dir,
    segments: () => segs().length,
    passes,
    keys: () => new Set(passes().map(keyOf)),
    count: () => passes().length,
    append(lean) {
      if (!lean.length) return null;
      const n = segs().length + 1;
      const file = path.join(dir, `seg-${String(n).padStart(6, "0")}.bin`);
      const tmp = file + ".tmp";
      fs.writeFileSync(tmp, pack(lean));                   // a segment appears whole or not at all
      fs.renameSync(tmp, file);
      return file;
    },
  };
}

/** A lean pass as the pass-shaped object the generic weft consumers read. No sentence text: spans carry offsets only. */
export function asPass(l) {
  const edges = l.con.filter((e) => e[3] >= 0 || e[4] || e[5]).map((e, i) => ({
    end1: e[0], label: e[1], end2: e[2], end1Face: null, end2Face: null,
    refs: e[3] >= 0 ? [`${l.a}#${e[3]}`] : [], spans: [{ ref: e[3] >= 0 ? `${l.a}#${e[3]}` : null, start: e[4], end: e[5] }],
    polarity: "+", clause: e[6] || undefined,
  }));
  const negCon = new Set(l.eva.filter((v) => v[0] === "con").map((v) => v[1]));
  let k = 0;
  l.con.forEach((e, i) => { if (e[3] >= 0 || e[4] || e[5]) { if (negCon.has(i)) edges[k].polarity = "-"; k += 1; } });
  return { schema: "WeftLeanPass@1", address: l.a, seq: l.s, layer: l.l, language: l.g, edges,
    cast: l.ins.map((s) => ({ surface: s })), clauses: l.seg.map((c, i) => ({ id: c[0], parent: c[1] || null, relation: c[2], marker: c[3] || null, at: c[4], negative: l.eva.some((v) => v[0] === "seg" && v[1] === i) })) };
}

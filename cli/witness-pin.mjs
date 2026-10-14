// cli/witness-pin.mjs — A WITNESS KNOWS ITS UNIT AND ITS BYTES (nesting-fix J D8, 2026-10-14).
//
// The janus spiral takes a witness as an address `file#from-to` (organs/reasoning-spiral.js: `^[^#\s]+#\d+-\d+$`).
// The wiring wrote two different things in that one syntax — a BYTE span from khora's code reader and a LINE span
// from citeGround (coerced to `#L-(L+1)` to pass the regex; the +1 is not part of the evidence) — so an expander
// could not tell which unit it held, and nothing was kept to tell whether the bytes at the span are still the bytes
// that were read: 43 of the 67 witnesses in the live logs sat on files modified after their assessment, and
// whether the spans changed was UNKNOWN. janus's address grammar cannot carry a unit, and janus is not edited from
// here, so the unit and the pin travel beside the address on the event, in `witnessPins` — a typed sidecar the
// janus projection ignores and every khora reader uses:
//
//   { at, unit: "byte" | "line", file, from, to, bytes, sha256 }
//     at      the address exactly as janus holds it (`file#a-b`)
//     unit    what from/to count: "byte" (UTF-8 offsets) or "line" (1-based, from..to inclusive; for a line
//             witness `to` is the TRUE last line, not the coerced +1 in `at`)
//     sha256  of the bytes the span names, when read — the pin
//
// A witness with no pin (every event written before this file existed) reads as unit "unmarked", state "unpinned":
// kept, never guessed. Pure over (file bytes, pin); the only I/O is reading the named file.
import fs from "node:fs";
import crypto from "node:crypto";

export const WITNESS_UNITS = Object.freeze(["byte", "line"]);
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/** `file#from-to` → {file, from, to}; null when it is not one. The LAST `#` splits (a path may hold `#`). */
export function parseAddress(a) {
  const m = /^(.+)#(\d+)-(\d+)$/.exec(String(a ?? ""));
  return m ? { file: m[1], from: Number(m[2]), to: Number(m[3]) } : null;
}

/** The bytes a (unit, from, to) span names in `buf`, or null when it is outside the file. */
export function spanBytes(buf, unit, from, to) {
  if (unit === "byte") return from >= 0 && to <= buf.length && to > from ? buf.subarray(from, to) : null;
  if (unit === "line") {
    // 1-based, inclusive; a line is its bytes without the terminating \n
    let line = 1, start = 0, begin = null;
    for (let i = 0; i <= buf.length; i++) {
      if (i === buf.length && start === i) break; // nothing after the final newline is a line
      if (i === buf.length || buf[i] === 0x0a) {
        if (line === from) begin = start;
        if (line === to && begin !== null) return buf.subarray(begin, i);
        line++; start = i + 1;
      }
    }
    return null;
  }
  return null;
}

/** Pin a witness: read the file now, hash the span. `d` = {address, unit, file, from, to}. Never throws. */
export function pinWitness(d) {
  const base = { at: d.address, unit: d.unit, file: d.file, from: d.from, to: d.to };
  try {
    const span = spanBytes(fs.readFileSync(d.file), d.unit, d.from, d.to);
    return span ? { ...base, bytes: span.length, sha256: sha(span) } : { ...base, bytes: null, sha256: null };
  } catch { return { ...base, bytes: null, sha256: null }; }
}

/** What the file says now about a pin: {state: "fresh"|"stale"|"missing"|"out-of-range"|"unpinned", ...}. */
export function witnessState(pin) {
  if (!pin || typeof pin.sha256 !== "string") return { state: "unpinned" };
  let buf;
  try { buf = fs.readFileSync(pin.file); } catch { return { state: "missing" }; }
  const span = spanBytes(buf, pin.unit, pin.from, pin.to);
  if (!span) return { state: "out-of-range" };
  return sha(span) === pin.sha256 ? { state: "fresh" } : { state: "stale" };
}

/** A legacy witness address (no pin) described honestly: its file and numbers, unit unmarked. */
export const describeUnpinned = (address) => { const p = parseAddress(address); return p ? { at: address, unit: "unmarked", file: p.file, from: p.from, to: p.to, sha256: null } : null; };

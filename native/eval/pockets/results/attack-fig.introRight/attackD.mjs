// attackD.mjs -- ATTACK D: planted worlds. For every world: introRight cells in both halves (atlas procedure: halves by document parity, 10 within-unit draws, atlas seed scheme with seedId = world id),
//  plus the diagnostics that separate an INTRODUCTION effect from a TYPE-CLASS effect: introRight computed on the SECOND occurrence of recurring types (v2, same strata, same hapax negatives) and the paired first-vs-second contrast.
//   node attackD.mjs <set>   sets: atlas | markov | slot | frame | iid
import fs from "node:fs"; import path from "node:path";
import { halves, HERE, f, statusOf, sha256 } from "./lib.mjs";
import { cellFn, introSide, firstVsLater, dCell } from "./variants.mjs";
import * as W from "./dworlds.mjs";
const set = process.argv[2], tag = process.argv[3] ?? set;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
function diag(w) {
  const H = halves({ id: w.id, units: w.units, docOf: w.docOf }), r = { id: w.id, tokens: w.units.reduce((n, u) => n + u.length, 0), types: new Set(w.units.flat()).size };
  const defs = { v1: (P) => introSide(P, { side: "R", occ: 1 }), v2: (P) => introSide(P, { side: "R", occ: 2 }), fs: (P) => firstVsLater(P), L1: (P) => introSide(P, { side: "L", occ: 1 }) };
  for (const [k, fn] of Object.entries(defs)) { const a = cellFn(H.discover, fn, 10, w.id, "discover"), b = cellFn(H.confirm, fn, 10, w.id, "confirm"); r[k] = { zD: a.z, zC: b.z, dD: dCell(a), dC: dCell(b), d: dCell(a) != null && dCell(b) != null ? (dCell(a) + dCell(b)) / 2 : null, status: statusOf(a, b) }; }
  return r;
}
const show = (r) => console.error(`${r.id.padEnd(26)} tok ${String(r.tokens).padStart(6)} | introRight ${r.v1.status.padEnd(2)} d ${f(r.v1.d, 3)} z ${f(r.v1.zD, 1)}/${f(r.v1.zC, 1)} | 2nd-occ d ${f(r.v2.d, 3)} z ${f(r.v2.zD, 1)}/${f(r.v2.zC, 1)} ratio ${r.v1.d ? f(r.v2.d / r.v1.d, 2) : "NA"} | first-vs-2nd d ${f(r.fs.d, 3)} z ${f(r.fs.zD, 1)}/${f(r.fs.zC, 1)} | introLeft ${r.L1.status} d ${f(r.L1.d, 3)}`);
const out = [];
const L45 = W.shortLen(4.5), D1 = W.lognormLen();
if (set === "atlas") {   // the atlas's own planted worlds: re-run through the same diagnostics (loaders/planted.mjs is imported, not edited)
  const { load } = await import("../../loaders/planted.mjs");
  for (const p of await load()) { const r = diag(p); out.push(r); show(r); }
} else if (set === "markov") {
  const spec = [["mk-orig-D1", W.FLOW_ORIG, 11, D1, 100], ["mk-inv-D1", W.inverse(W.FLOW_ORIG), 11, D1, 100], ["mk-str3-D1", W.FLOW_ORIG, 3, D1, 100], ["mk-str0-D1", W.FLOW_ORIG, 0, D1, 100],
    ["mk-orig-short", W.FLOW_ORIG, 11, L45, 300], ["mk-inv-short", W.inverse(W.FLOW_ORIG), 11, L45, 300], ["mk-str3-short", W.FLOW_ORIG, 3, L45, 300], ["mk-str0-short", W.FLOW_ORIG, 0, L45, 300]];
  for (const [id, flow, s, len, nd] of spec) for (let rep = 0; rep < 3; rep++) { const r = diag(W.markovWorld(`${id}-r${rep}`, flow, s, len, nd)); out.push(r); show(r); }
} else if (set === "slot") {
  for (const o of ["+", "-", "0"]) for (let rep = 0; rep < 3; rep++) { const r = diag(W.slotWorld(`slot${o === "+" ? "P" : o === "-" ? "M" : "Z"}-r${rep}`, o, L45, 300)); out.push(r); show(r); }
} else if (set === "slotlam") {   // grammar-strength dose: lambda in {0.25, 0.5}
  for (const o of ["+", "-"]) for (const lam of [0.25, 0.5]) for (let rep = 0; rep < 3; rep++) { const r = diag(W.slotWorld(`slot${o === "+" ? "P" : "M"}-lam${lam}-r${rep}`, o, L45, 300, 1000, lam)); out.push(r); show(r); }
} else if (set === "frame") {
  for (const m of ["first", "all"]) for (let rep = 0; rep < 3; rep++) { const r = diag(W.frameWorld(`frame-${m}-r${rep}`, m, L45, 300)); out.push(r); show(r); }
} else if (set === "iid") {   // false-PRESENT calibration of introRight at code-like size and unit length: iid Zipf worlds (no structure at all)
  for (let rep = 0; rep < 20; rep++) { const r = diag(W.markovWorld(`iid-r${rep}`, W.FLOW_ORIG, 0, L45, 300)); out.push(r); show(r); }
}
fs.writeFileSync(path.join(HERE, `D_${tag}.json`), JSON.stringify(out, null, 1));

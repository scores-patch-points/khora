// attackA3.mjs -- ATTACK A (continued) on order.entCurv, ALL 391 real non-thin pockets (not only the PRESENT ones):
//   (i) BIN GRANULARITY sweep: the same tokens, the same within-unit null (atlas seeds), the entropy computed over other rank-class partitions: oct (atlas), oct2 (two-octave bins), half (half-octave bins),
//       mass2 / mass3 / mass4 / mass8 / mass16 (equal-token-mass rank bins; a type is never split).
//   (ii) UNIT-LENGTH STRATA: octave bins and ranks from the WHOLE half-view (as in the atlas), but only units of length in the stratum enter the entropies (fractional thirds as in the atlas); within-unit null as in the atlas.
//        strata: 3-5, 6-9, 10-15, 16-30, 31+ tokens. A stratum cell is defined only with >= 300 units and >= 2000 tokens in the half (the family's own guard).
//   node attackA3.mjs PART NPARTS [idFilterCSV] -> A3_raw_<PART>.jsonl
import fs from "node:fs";
import path from "node:path";
import { loadCached, halves, cell, entc, statusOf, prep, HERE, TABLE } from "./lib.mjs";
const [PART, NP, FILTER] = [Number(process.argv[2] || 0), Number(process.argv[3] || 1), process.argv[4]];
const T = TABLE(), rows = T.rows.filter((r) => r.kind === "real" && !r.thin && (!FILTER || FILTER.split(",").includes(r.id)));
const mine = rows.filter((_, i) => i % NP === PART);
const SCHEMES = ["oct", "oct2", "half", "mass2", "mass3", "mass4", "mass8", "mass16"];
const STRATA = [[3, 5], [6, 9], [10, 15], [16, 30], [31, Infinity]];
const fnScheme = (s) => (s === "oct2" ? (P) => entc(P, { bsOverride: Uint8Array.from(P.bs, (b) => b >> 1) })?.curv : (P) => entc(P, { scheme: s })?.curv);
const fnStratum = ([a, b]) => (P) => entc(P, { minL: a, maxL: b })?.curv;
const pack = (c) => (c ? { v: c.v, z: c.z, N: c.N } : null);
const out = fs.createWriteStream(path.join(HERE, `A3_raw_${PART}.jsonl`));
for (const r of mine) {
  const p = loadCached(r.id), H = halves(p), o = { id: r.id, group: r.group, register: r.register, grain: r.grain, language: r.language, script: r.script, mul: r.mul, tokens: r.tokens, status0: r.status, schemes: {}, strata: {} };
  const Ps = { discover: prep(H.discover), confirm: prep(H.confirm) };
  for (const s of SCHEMES) {
    const D = cell(H.discover, { fn: fnScheme(s), P: Ps.discover }), C = cell(H.confirm, { fn: fnScheme(s), P: Ps.confirm });
    o.schemes[s] = D && C ? { D: pack(D), C: pack(C), status: statusOf(D, C) } : { status: "undef" };
  }
  for (const st of STRATA) {
    const key = `${st[0]}-${st[1] === Infinity ? "inf" : st[1]}`, D = cell(H.discover, { fn: fnStratum(st), P: Ps.discover }), C = cell(H.confirm, { fn: fnStratum(st), P: Ps.confirm });
    const e = [entc(Ps.discover, { minL: st[0], maxL: st[1] }), entc(Ps.confirm, { minL: st[0], maxL: st[1] })];
    o.strata[key] = D && C && D.z != null && C.z != null && e[0] && e[1] ? { D: pack(D), C: pack(C), status: statusOf(D, C), nU: [e[0].nU, e[1].nU], nTok: [e[0].nTok, e[1].nTok] } : { status: "undef" };
  }
  out.write(JSON.stringify(o) + "\n");
  console.error(`${r.id} ${r.status} schemes ${SCHEMES.map((s) => o.schemes[s].status).join(",")} strata ${Object.values(o.strata).map((x) => x.status).join(",")}`);
}
out.end();

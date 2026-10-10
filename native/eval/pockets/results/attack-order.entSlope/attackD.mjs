// attackD.mjs -- ATTACK D (planted worlds WITHOUT the claimed register mechanism).  Worlds are built here from scratch (own seeds, namespace attackD-v1); only the atlas machinery (halves, nullView seeds, posStats) is reused.
//   W0  law-free iid Zipf(alpha0) over V types, lognormal unit lengths (D1 of the planted core): v must be ~0 at every size.
//   W1  ONE register-free mechanism: "rarer later": the token at relative position r of a unit is drawn from Zipf(alpha0 + delta (1 - 2r)) (9 position bands), delta in {0.05, 0.1, 0.3} (fixed within a world); only alpha0, V, size vary.
//   W2  "rare closer": last token of a unit drawn from the Zipf tail (types of rank > 100) with prob 0.4, else iid Zipf(alpha0).     W3 "frequent opener": first token from the top 10 types with prob 0.4.
//   node attackD.mjs [part nparts] -> D_raw_<part>.jsonl
import fs from "node:fs";
import path from "node:path";
import { rngOf, seedOf, halves, cell, statusOf, HERE } from "./lib.mjs";
import { measure, subsample } from "./lib2.mjs";
import { makeLen, drawCdf, cdfOf, zipfW } from "../../loaders/_planted-core.mjs";
const [PART, NP] = [Number(process.argv[2] || 0), Number(process.argv[3] || 1)];
const D1 = makeLen("D1"), NDOC = 150, DOCTOK = 1000, BANDS = 9;
const cdfs = new Map(); const zc = (V, a) => { const k = V + "|" + a.toFixed(4); if (!cdfs.has(k)) cdfs.set(k, cdfOf(zipfW(V, a))); return cdfs.get(k); };
function world(kind, V, a0, delta, id) {
  const base = zc(V, a0), band = Array.from({ length: BANDS }, (_, k) => zc(V, Math.max(0.05, a0 + delta * (1 - (2 * (k + 0.5)) / BANDS)))), tail = cdfOf(zipfW(V - 100, a0).map((x) => x)), head = cdfOf(zipfW(10, a0));
  const units = [], docOf = [];
  for (let d = 0; d < NDOC; d++) {
    const rng = rngOf(seedOf("attackD-v1", id, "doc", d)); let tok = 0;
    while (tok < DOCTOK) {
      const L = D1(rng), u = [];
      for (let i = 0; i < L; i++) {
        const r = L > 1 ? i / (L - 1) : 0; let t;
        if (kind === "W1") t = drawCdf(band[Math.min(BANDS - 1, Math.floor(r * BANDS))], rng());
        else if (kind === "W2" && i === L - 1 && rng() < 0.4) t = 100 + drawCdf(tail, rng());
        else if (kind === "W3" && i === 0 && rng() < 0.4) t = drawCdf(head, rng());
        else t = drawCdf(base, rng());
        u.push("t" + t.toString(36));
      }
      units.push(u); docOf.push(d); tok += L;
    }
  }
  return { id, units, docOf };
}
const sizes = [7500, 20000, 40000, Infinity], V_ = [3000, 30000], A_ = [0.8, 1.0, 1.2, 1.4];
const jobs = []; for (const V of V_) for (const a0 of A_) { jobs.push(["W0", V, a0, 0]); for (const dl of [0.05, 0.1, 0.3]) jobs.push(["W1", V, a0, dl]); if (V === 30000) { jobs.push(["W2", V, a0, 0]); jobs.push(["W3", V, a0, 0]); } }
const out = fs.createWriteStream(path.join(HERE, `D_raw_${PART}.jsonl`));
jobs.forEach((j, ji) => {
  if (ji % NP !== PART) return;
  const [kind, V, a0, delta] = j, id = `d-${kind}-V${V}-a${a0}` + (kind === "W1" ? `-dl${delta}` : ""), p = world(kind, V, a0, delta, id), H = halves(p), o = { id, kind, V, alpha0: a0, delta, tokens: p.units.reduce((n, u) => n + u.length, 0), cells: [] };
  for (const N of sizes) {
    const c = { N: Number.isFinite(N) ? N : "full" }, views = {}; let ok = true;
    for (const w of ["discover", "confirm"]) { const v = subsample(H[w], N, "d", id); if (!v) { ok = false; break; } views[w] = v; }
    if (!ok) { c.skipped = "too small"; o.cells.push(c); continue; }
    for (const w of ["discover", "confirm"]) { const m = measure(views[w]), cl = cell(views[w], { stats: ["entSlope"], seedId: id, which: w }); c[w] = { ...m, z: cl?.entSlope.z ?? null }; }
    c.status = statusOf({ z: c.discover.z }, { z: c.confirm.z }); o.cells.push(c);
  }
  out.write(JSON.stringify(o) + "\n"); console.error(id, o.cells.map((c) => c.status ?? c.skipped).join(","));
});
out.end();

// attackCcal.mjs -- ATTACK C part 1: empirical false-PRESENT rate of prefixCopy at REAL pocket sizes under an EXCHANGEABLE world.
// For every defined pocket and half, the "observed" statistic is taken on an independent unit-order shuffle (an exactly exchangeable twin of the half: same units, same doc positions, same pair filters),
// and compared with the atlas design (10 further unit-order draws).  R replicates per pocket.  Output out/C/cal.json: per pocket, per rep, [zDiscover, zConfirm].
//   node attackCcal.mjs [R=20]
import fs from "node:fs";
import path from "node:path";
import { halves, prepView, bundle, loadCached, HERE, seedOf, globalPerm } from "./lib.mjs";
const R = Number(process.argv[2] ?? 20), IDS = fs.readFileSync(path.join(HERE, "defined385.txt"), "utf8").split("\n").filter(Boolean);
fs.mkdirSync(path.join(HERE, "out/C"), { recursive: true });
const out = {}, stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) }; };
for (const id of IDS) {
  const H = halves(loadCached(id)); out[id] = [];
  const PV = {}; for (const w of ["discover", "confirm"]) PV[w] = prepView(H[w]);
  for (let r = 0; r < R; r++) {
    const zs = [];
    for (const w of ["discover", "confirm"]) {
      const P = PV[w], U = P.U, obs = bundle(P, globalPerm(U, P.docOf, id, w, seedOf(id, w, "Ccal", "obs", r))).prefixCopy;
      const xs = []; for (let k = 0; k < 10; k++) { const b = bundle(P, globalPerm(U, P.docOf, id, w, seedOf(id, w, "Ccal", "null", r, k))).prefixCopy; if (Number.isFinite(b)) xs.push(b); }
      const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
      zs.push(Number.isFinite(obs) && sd > 0 ? (obs - m) / sd : null);
    }
    out[id].push(zs);
  }
  console.error(id);
}
fs.writeFileSync(path.join(HERE, "out/C/cal.json"), JSON.stringify(out));

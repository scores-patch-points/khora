// check-variants.mjs -- asymVar() with defaults must equal the repo's asymStat().eq bit for bit on both halves of a few pockets.   node check-variants.mjs id1,id2,...
import { halves, loadCached, prep, asymStat, f } from "./lib.mjs";
import { asymVar } from "./asymvar.mjs";
let worst = 0;
for (const id of (process.argv[2] ?? "bk-alice,bk-aeneid-la,oc-irc-ubuntu-0607,cd-cc-dart,ml-deu-drama-0").split(",")) {
  let p; try { p = loadCached(id); } catch { console.error("not cached", id); continue; }
  const H = halves(p);
  for (const w of ["discover", "confirm"]) {
    const P = prep(H[w]), a = asymStat(P).eq, b = asymVar(P), d = a == null || b == null ? (a === b ? 0 : 1) : Math.abs(a - b);
    worst = Math.max(worst, d); console.error(id, w, f(a, 8), f(b, 8), d);
  }
}
console.error("max abs diff", worst);

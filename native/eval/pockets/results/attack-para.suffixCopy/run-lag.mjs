// run-lag.mjs -- how local is the adjacency-specific excess? suffix hit rate between unit u and unit u-L (same document), L = 1,2,3,4,8,16, against the within-document null (10 draws), both halves, every real pocket.
import fs from "node:fs";
import path from "node:path";
import { halves, prepView, loadCached, HERE, CACHE, makeGroups, groupPerm, seedOf, optOf } from "./lib.mjs";
const o = optOf(process.argv.slice(2)), OUT = path.join(HERE, o("--out", "out/lag.json")), LAGS = [1, 2, 3, 4, 8, 16], DRAWS = 10;
const lagHits = (P, perm, L) => { let np = 0, S2 = 0; for (let u = L; u < P.U; u++) { if (P.docOf[u] !== P.docOf[u - L]) continue; const a = perm[u - L], b = perm[u]; if (P.len[a] < 2 || P.len[b] < 2) continue; np++; if (P.L1[a] === P.L1[b] && P.L2[a] === P.L2[b]) S2++; } return { np, S2 }; };
const ids = fs.readdirSync(CACHE).filter((x) => x.endsWith(".json")).map((x) => x.slice(0, -5)).sort(), res = {};
for (const id of ids) {
  const p = loadCached(id), H = halves(p); res[id] = { register: p.register, group: p.group, lags: {} };
  for (const L of LAGS) res[id].lags[L] = { hits: 0, np: 0, nullHits: 0 };
  for (const which of ["discover", "confirm"]) {
    const P = prepView(H[which]), groups = makeGroups(P, "within-doc"), ident = Int32Array.from({ length: P.U }, (_, k) => k), perms = [];
    for (let k = 0; k < DRAWS; k++) perms.push(groupPerm(groups, P.U, seedOf(id, which, "sfxatk-lag", "within-doc", k)));
    for (const L of LAGS) { const ob = lagHits(P, ident, L); let nh = 0; for (const pm of perms) nh += lagHits(P, pm, L).S2; res[id].lags[L].hits += ob.S2; res[id].lags[L].np += ob.np; res[id].lags[L].nullHits += nh / DRAWS; }
  }
}
fs.writeFileSync(OUT, JSON.stringify(res));
console.error("DONE", ids.length);

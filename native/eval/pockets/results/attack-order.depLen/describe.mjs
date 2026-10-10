// describe.mjs -- per cached PRESENT pocket: half sizes, unit-length summary, types, tokenisation note  -> describe.json
import fs from "node:fs";
import { halves, loadCached, TABLE, HERE, tokensOf } from "./lib.mjs";
const rows = TABLE().filter((r) => r.kind === "real" && (r.status === "P+" || r.status === "P-")), out = [];
for (const r of rows) {
  const p = loadCached(r.id), H = halves(p), o = { id: r.id, status: r.status, group: r.group, register: r.register, grain: r.grain, tok: tokensOf(p.units), tokenisation: (p.meta?.tokenisation ?? "").slice(0, 160) };
  for (const w of ["discover", "confirm"]) {
    const u = H[w].units, N = tokensOf(u), ls = u.map((x) => x.length).sort((a, b) => a - b), n3 = u.filter((x) => x.length >= 3);
    const cnt = new Map(); for (const x of u) for (const t of x) cnt.set(t, (cnt.get(t) || 0) + 1);
    let hap = 0; for (const c of cnt.values()) if (c === 1) hap++;
    o[w] = { N, units: u.length, mul: N / u.length, med: ls[ls.length >> 1], p90: ls[Math.floor(ls.length * 0.9)], share3: tokensOf(n3) / N, mul3: tokensOf(n3) / Math.max(1, n3.length), V: cnt.size, hapShare: hap / cnt.size };
  }
  out.push(o);
}
fs.writeFileSync(HERE + "/describe.json", JSON.stringify(out));
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) * p)]; };
for (const w of ["discover", "confirm"]) console.log(w, "N quantiles 0/10/50/90/100:", [0, .1, .5, .9, 1].map((p) => q(out.map((o) => o[w].N), p)).join(" "), "| mean unit len q:", [0, .1, .5, .9, 1].map((p) => q(out.map((o) => o[w].mul), p).toFixed(1)).join(" "));
const uniq = {}; for (const o of out) uniq[o.grain + "|" + o.tokenisation.slice(0, 80)] = (uniq[o.grain + "|" + o.tokenisation.slice(0, 80)] || 0) + 1;
console.log(Object.entries(uniq).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => v + " " + k).join("\n"));

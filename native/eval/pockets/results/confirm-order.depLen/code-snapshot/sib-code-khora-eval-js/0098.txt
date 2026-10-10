// count4.mjs — COUNT-ONLY: pooled-negative coverage for alternative coarse keys (no score computed).
import { loadIrcDay, streamIndex } from "./lib.mjs";
import { ircClass } from "./pairs.mjs";
const ibk = (i) => (i <= 3 ? i : i <= 5 ? 4 : i <= 9 ? 5 : 6), fq2 = (n) => Math.floor(2 * Math.log2(Math.max(1, n))), clb = (w) => Math.min(11, [...w].length), mlb4 = (n) => (n <= 4 ? 0 : n <= 8 ? 1 : n <= 16 ? 2 : 3);
const mlb3 = (n) => (n <= 5 ? 0 : n <= 12 ? 1 : 2), ib3 = (i) => Math.min(i, 3), cl3 = (w) => { const l = [...w].length; return l <= 5 ? 0 : l <= 7 ? 1 : 2; };
const KEYS = { A_cl_exact: (o, ix) => [ibk(o.i), fq2(ix.count.get(o.w)), clb(o.w), mlb4(o.len)].join("|"), B_cl_exact_mlen3: (o, ix) => [ibk(o.i), fq2(ix.count.get(o.w)), clb(o.w), mlb3(o.len)].join("|"), C_ib3_cl_exact_mlen3: (o, ix) => [ib3(o.i), fq2(ix.count.get(o.w)), clb(o.w), mlb3(o.len)].join("|"), D_cl_exact_nolen: (o, ix) => [ibk(o.i), fq2(ix.count.get(o.w)), clb(o.w)].join("|") };
const G = { EN: [], NONEN: [] };
for (const k of process.argv.slice(2)) { const d = loadIrcDay(k); G[d.lang === "en" ? "EN" : "NONEN"].push(d); }
for (const [name, keyFn] of Object.entries(KEYS)) {
  const out = {};
  for (const [g, days] of Object.entries(G)) {
    const P = [], N = new Map();
    for (const d of days) { const ix = streamIndex(d.T), seen = new Map();
      d.T.forEach((m, k) => m.forEach((w, i) => { const kk = seen.get(w) ?? 0; seen.set(w, kk + 1); if (kk === 0) return; const c = ircClass(d, k, i, w); if (!c) return; const o = { w, i, len: m.length }; o.key = keyFn(o, ix); if (c === "P") P.push(o); else (N.get(o.key) ?? N.set(o.key, []).get(o.key)).push(o); })); }
    let pairs = 0; const used = new Map(); for (const p of P) { const a = N.get(p.key), u = used.get(p.key) ?? 0; if (a && u < a.length) { used.set(p.key, u + 1); pairs++; } }
    out[g] = { pos: P.length, pairs };
  }
  console.log(name, JSON.stringify(out));
}

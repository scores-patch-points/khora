// count3.mjs — COUNT-ONLY: coverage when NEGATIVES are pooled across the days of one language group (positive and its matched negative are each scored inside their own day). No score computed.
import { loadIrcDay, streamIndex } from "./lib.mjs";
import { ircClass, KEY_EXACT, KEY_COARSE } from "./pairs.mjs";
const G = { EN: [], NONEN: [] };
for (const k of process.argv.slice(2)) { const d = loadIrcDay(k); G[d.lang === "en" ? "EN" : "NONEN"].push(d); }
for (const keyName of ["EXACT", "COARSE"]) {
  const keyFn = keyName === "EXACT" ? KEY_EXACT : KEY_COARSE, out = {};
  for (const [g, days] of Object.entries(G)) {
    const P = [], N = new Map();
    for (const d of days) { const ix = streamIndex(d.T), seen = new Map();
      d.T.forEach((m, k) => m.forEach((w, i) => { const kk = seen.get(w) ?? 0; seen.set(w, kk + 1); if (kk === 0) return; const c = ircClass(d, k, i, w); if (!c) return; const o = { w, i, len: m.length }; o.key = keyFn(o, ix); if (c === "P") P.push(o); else (N.get(o.key) ?? N.set(o.key, []).get(o.key)).push(o); })); }
    let pairs = 0; const used = new Map(); for (const p of P) { const a = N.get(p.key), u = used.get(p.key) ?? 0; if (a && u < a.length) { used.set(p.key, u + 1); pairs++; } }
    out[g] = { pos: P.length, negTokens: [...N.values()].reduce((s, a) => s + a.length, 0), pairs };
  }
  console.log(keyName, JSON.stringify(out));
}

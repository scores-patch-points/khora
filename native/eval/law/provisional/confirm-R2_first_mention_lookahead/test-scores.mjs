// test-scores.mjs — brute-force check of ix.mjs scores on a SCOPER-DISCOVERY day (no confirm data).
import { loadIrc } from "./lib.mjs";
import { buildIx, scoresAt } from "./ix.mjs";
const d = loadIrc("ubuntu/2012-03-15.txt"), ix = buildIx(d.T); let bad = 0, n = 0;
const brute = (m, w) => { let init = 0, cnt = 0, c128 = 0, last = 0, sec = 0; d.T.forEach((t, k) => { if (k === m) return; if (t[0] === w) init++; if (t.includes(w)) { cnt++; if (Math.abs(k - m) <= 128) c128++; } if (t[t.length - 1] === w) last++; if (t[1] === w) sec++; }); return { INIT_Tinf: init, CNT_Tinf: cnt, CNT_T128: c128, LAST_Tinf: last, SEC_Tinf: sec }; };
for (let t = 0; t < 400; t++) { const m = Math.floor(Math.random() * d.T.length), i = Math.floor(Math.random() * d.T[m].length), w = d.T[m][i], s = scoresAt(ix, m, i, w), b = brute(m, w); n++; for (const k of Object.keys(b)) if (s[k] !== b[k]) { bad++; console.log("MISMATCH", k, s[k], b[k], w, m); } }
console.log({ n, bad, msgs: d.T.length });

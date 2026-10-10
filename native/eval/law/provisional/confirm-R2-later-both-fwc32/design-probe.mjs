// design-probe.mjs: DESIGN-STAGE availability probe (NOT a test; computes no AUC, no company feature). Prints, per candidate file: sentences, tokens (punct dropped), PROPN/NOUN/VERB/ADJ counts, FWC32.
import fs from "node:fs";
const R = "/Users/mlacy/Documents/EO Testing/EO Embedding testing/data/ud";
function rd(file) { const S = []; let cur = []; for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) { if (!line) { if (cur.length) S.push(cur); cur = []; continue; } if (line[0] === "#") continue; const f = line.split("\t"); if (f.length < 10 || !/^\d+$/.test(f[0]) || f[3] === "PUNCT") continue; cur.push([f[1].normalize("NFC").toLowerCase(), f[3]]); } if (cur.length) S.push(cur); return S; }
for (const spec of process.argv.slice(2)) { const [dir, ...kinds] = spec.split(":"); for (const k of kinds) { const p = `${R}/${dir}/${dir}-ud-${k}.conllu`; if (!fs.existsSync(p)) { console.log(dir, k, "MISSING"); continue; }
  const S = rd(p), c = new Map(), u = {}; let n = 0; for (const s of S) for (const [w, t] of s) { c.set(w, (c.get(w) ?? 0) + 1); u[t] = (u[t] ?? 0) + 1; n += 1; }
  const top = [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 32).reduce((t, x) => t + x[1], 0);
  console.log(dir, k, "sents", S.length, "tokens", n, "PROPN", u.PROPN ?? 0, "NOUN", u.NOUN ?? 0, "VERB", u.VERB ?? 0, "ADJ", u.ADJ ?? 0, "fwc32", (top / n).toFixed(3)); } }

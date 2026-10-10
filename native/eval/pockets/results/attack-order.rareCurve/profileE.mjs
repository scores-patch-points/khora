// profileE.mjs -- positional profile of x (ln mid-rank) minus the unit mean, units of 8..16 tokens, relative position in 8 bins, discover half, for representative pockets of each class. -> E_profile.json
import fs from "node:fs";
import path from "node:path";
import { loadCached, halves, prep, HERE } from "./lib.mjs";
const IDS = ["ud-eng", "ud-deu", "ud-fra", "bk-alice", "bk-dracula", "oc-irc-ubuntu-0406", "ml-lat-summa", "fm-law-uk", "ud-hin", "ud-kor", "fm-pali-dn", "cd-cc-typescript", "cd-cc-javascript", "cd-cc-rust", "cd-cc-python", "pl-frames"];
const out = {};
for (const id of IDS) {
  let p; try { p = loadCached(id); } catch { out[id] = "not cached"; continue; }
  const P = prep(halves(p).discover), B = 8, s = new Float64Array(B), n = new Float64Array(B);
  for (let u = 0; u < P.U; u++) { const a = P.unitStart[u], L = P.unitStart[u + 1] - a; if (L < 8 || L > 16) continue; let m = 0; for (let i = 0; i < L; i++) m += P.xs[a + i]; m /= L; for (let i = 0; i < L; i++) { const b = Math.min(B - 1, Math.floor((i / L) * B)); s[b] += P.xs[a + i] - m; n[b]++; } }
  out[id] = { tokensInUnits8to16: n.reduce((a, b) => a + b, 0), meanDevByEighth: Array.from(s, (x, i) => +(x / n[i]).toFixed(3)) };
}
fs.writeFileSync(path.join(HERE, "E_profile.json"), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(22), typeof v === "string" ? v : v.meanDevByEighth.join(" "));

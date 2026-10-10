// exploratory.mjs — NOT pre-registered (labelled as such in REPORT): is the heterogeneity of per-kind slopes (log1p changed slots on log1p local mentions) larger than under frequency-stratified random kind labels?
import fs from "node:fs"; import path from "node:path"; import * as L from "./lib.mjs";
const rows = []; const seen = new Set();
for (const st of ["dev", "conf"]) for (const f of fs.readdirSync(L.RESULTS).filter((x) => x.startsWith(`rows.irc.${st}.single`) && x.endsWith(".jsonl"))) for (const l of fs.readFileSync(path.join(L.RESULTS, f), "utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l), key = `${st}|${r.block}|${r.s}|${r.i}`; if (seen.has(key) || !r.tags.some((t) => t.startsWith("S"))) continue; seen.add(key); rows.push({ st, block: `${st}:${r.block}`, kind: r.kind, x: Math.log1p(r.inWin), y: Math.log1p(r.rec.S_ALL), bin: L.log2bin(r.inWin + 1) }); }
const slope = (rs) => { const mx = L.mean(rs.map((r) => r.x)), my = L.mean(rs.map((r) => r.y)); let a = 0, b = 0; for (const r of rs) { a += (r.x - mx) * (r.y - my); b += (r.x - mx) ** 2; } return b > 1e-9 ? a / b : null; };
const stat = (lab) => { const by = new Map(); rows.forEach((r, i) => (by.get(lab[i]) ?? by.set(lab[i], []).get(lab[i])).push(r)); const s = [...by.values()].filter((v) => v.length >= 15).map(slope).filter((x) => x !== null); const m = L.mean(s); return { sd: Math.sqrt(L.mean(s.map((v) => (v - m) ** 2))), n: s.length, min: Math.min(...s), max: Math.max(...s) }; };
const out = {};
for (const st of ["dev", "conf"]) {
  const sub = rows.filter((r) => r.st === st); rows.splice(0, rows.length, ...rows); // keep
}
for (const st of ["dev", "conf", "both"]) {
  const R = rows.filter((r) => st === "both" || r.st === st), obs = (() => { const by = new Map(); R.forEach((r) => (by.get(r.kind) ?? by.set(r.kind, []).get(r.kind)).push(r)); const s = [...by.values()].filter((v) => v.length >= 15).map(slope).filter((x) => x !== null), m = L.mean(s); return { sd: Math.sqrt(L.mean(s.map((v) => (v - m) ** 2))), n: s.length, min: L.round(Math.min(...s)), max: L.round(Math.max(...s)) }; })();
  const rnd = L.rngFor(L.seedFor("kinds-chat", "explor", st)), strata = new Map(); R.forEach((r, i) => { const k = `${r.block}|${r.bin}`; (strata.get(k) ?? strata.set(k, []).get(k)).push(i); });
  const nulls = [];
  for (let p = 0; p < 300; p++) { const lab = R.map((r) => r.kind); for (const idx of strata.values()) { const l = idx.map((i) => R[i].kind); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } idx.forEach((i, q) => { lab[i] = l[q]; }); }
    const by = new Map(); R.forEach((r, i) => (by.get(lab[i]) ?? by.set(lab[i], []).get(lab[i])).push(r)); const s = [...by.values()].filter((v) => v.length >= 15).map(slope).filter((x) => x !== null), m = L.mean(s); nulls.push(Math.sqrt(L.mean(s.map((v) => (v - m) ** 2)))); }
  out[st] = { rows: R.length, observedSD: L.round(obs.sd), kinds: obs.n, slopeRange: [obs.min, obs.max], nullSD_mean: L.round(L.mean(nulls)), nullSD_q95: L.round(L.quantile(nulls, 0.95)) };
}
fs.writeFileSync(path.join(L.RESULTS, "exploratory.slopes.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));

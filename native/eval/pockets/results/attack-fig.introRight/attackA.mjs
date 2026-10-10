// attackA.mjs -- ATTACK A (size and tokenisation) on fig.introRight. New file; reads cached pockets (dump.mjs), imports the repo's own statistic code.
//   node attackA.mjs <design> <idlist|file> ; designs: tok | size | match  -> A_<design>.json (+ stdout table)
// Designs (all deterministic: seeds from sha256 of pocket id / rep / unit or doc index; no Math.random, no Date):
//  tok   full pocket, atlas halves, 10 within-unit draws, ALTERNATIVE TOKENISATIONS of the stored token stream:
//        T0 baseline (must equal the atlas cell), T1 drop the 1% rarest TYPES (ceil(0.01*types) types in order of count asc, ties by sha256(type)), T2 split every token at underscores (empty parts dropped),
//        T3 drop tokens that contain a digit, T4 prefix-5 truncation (first 5 code points) merging types. Units emptied by a drop disappear.
//  size  equal-TOKEN subsamples of WHOLE documents in sha256 order, B = 32k / 64k / 128k tokens (stop at the first document that reaches B), 4 replicates each; skipped when the pocket has < 1.15 B tokens.
//  match equal tokens AND equal unit-length histogram: units of length 1..12 drawn per length class by sha256 key so that every pocket gets the SAME histogram (pooled over the code+diagram PRESENT pockets) and
//        the same total tokens (32k nominal; scaled down when a class is short, pocket reported INFEASIBLE if it would fall under 20k tokens); original order and docOf kept; 6 replicates.
import fs from "node:fs";
import path from "node:path";
import { halves, cellOf, statusOf, loadCached, HERE, sha256, f, tokensOf } from "./lib.mjs";
const [design, idsArg] = process.argv.slice(2);
const ids = fs.existsSync(idsArg) ? fs.readFileSync(idsArg, "utf8").trim().split(",") : idsArg.split(",");
const atlas = (id) => JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8"));
const key = (...p) => parseInt(sha256(p.join("\x1f")).slice(0, 12), 16);
const dOf = (a, b) => (a.v - a.nullMean + b.v - b.nullMean) / 2;
function run(p, units, docOf, seedId) {
  const H = halves({ id: p.id, units, docOf }), a = cellOf(H.discover, "introRight", 10, seedId, "discover"), b = cellOf(H.confirm, "introRight", 10, seedId, "confirm");
  const ok = a.v != null && b.v != null && a.nullMean != null && b.nullMean != null;
  return { tokens: tokensOf(units), zD: a.z, zC: b.z, d: ok ? dOf(a, b) : null, status: statusOf(a, b) };
}
const restream = (p, fn) => { const units = [], docOf = []; p.units.forEach((u, k) => { const w = fn(u); if (w.length) { units.push(w); docOf.push(p.docOf[k]); } }); return { units, docOf }; };
const TOK = {
  T0: (p) => ({ units: p.units, docOf: p.docOf }),
  T1: (p) => { const c = new Map(); for (const u of p.units) for (const w of u) c.set(w, (c.get(w) || 0) + 1); const ty = [...c.keys()].sort((x, y) => c.get(x) - c.get(y) || (sha256(x) < sha256(y) ? -1 : 1)); const drop = new Set(ty.slice(0, Math.ceil(0.01 * ty.length))); return restream(p, (u) => u.filter((w) => !drop.has(w))); },
  T2: (p) => restream(p, (u) => u.flatMap((w) => w.split("_").filter(Boolean))),
  T3: (p) => restream(p, (u) => u.filter((w) => !/\d/.test(w))),
  T4: (p) => restream(p, (u) => u.map((w) => [...w].slice(0, 5).join(""))),
};
const out = {};
if (design === "tok") {
  for (const id of ids) {
    const p = loadCached(id), at = atlas(id), base = dOf(at.halves.discover["fig.introRight"], at.halves.confirm["fig.introRight"]); out[id] = { atlasD: base, variants: {} };
    for (const [t, fn] of Object.entries(TOK)) { const { units, docOf } = fn(p); out[id].variants[t] = run(p, units, docOf, id); }
    console.error(id, "d0", f(base), Object.entries(out[id].variants).map(([t, r]) => `${t}:${r.status}${f(r.d, 2)}/${f(r.zD, 1)},${f(r.zC, 1)}`).join(" "));
  }
} else if (design === "size") {
  for (const id of ids) {
    const p = loadCached(id), at = atlas(id), base = dOf(at.halves.discover["fig.introRight"], at.halves.confirm["fig.introRight"]), N = tokensOf(p.units);
    const docs = [...new Set(p.docOf)], len = new Map(); p.units.forEach((u, k) => len.set(p.docOf[k], (len.get(p.docOf[k]) || 0) + u.length));
    out[id] = { atlasD: base, tokens: N, B: {} };
    for (const B of [32000, 64000, 128000]) {
      if (N < 1.15 * B) continue; const reps = [];
      for (let r = 0; r < 4; r++) {
        const order = docs.slice().sort((x, y) => key(id, "size", r, x) - key(id, "size", r, y)), keep = new Set(); let s = 0;
        for (const d of order) { keep.add(d); s += len.get(d); if (s >= B) break; }
        const { units, docOf } = restream(p, (u) => u), sel = { units: [], docOf: [] };
        p.units.forEach((u, k) => { if (keep.has(p.docOf[k])) { sel.units.push(u); sel.docOf.push(p.docOf[k]); } });
        reps.push(run(p, sel.units, sel.docOf, `${id}|size${B}|${r}`));
      }
      out[id].B[B] = reps;
    }
    console.error(id, "d0", f(base), Object.entries(out[id].B).map(([B, rs]) => `${B / 1000}k:d${rs.map((r) => f(r.d, 2)).join("/")} z${rs.map((r) => f(r.zD, 0) + "," + f(r.zC, 0)).join(";")}`).join(" | "));
  }
} else if (design === "match") {
  const PRES = ["cd-cc-cpp", "cd-cc-csharp", "cd-cc-css", "cd-cc-dart", "cd-cc-fortran", "cd-cc-java", "cd-cc-kotlin", "cd-cc-ocaml", "cd-cc-perl", "cd-cc-php", "cd-cc-python", "cd-cc-scala", "cd-cc-verilog", "cd-e09-c", "cd-bpmn-activiti", "cd-bpmn-camunda", "cd-bpmn-kogito", "cd-bpmn-miwg", "cd-dot", "cd-musicxml"];
  const hist = new Array(13).fill(0); for (const id of PRES) for (const u of loadCached(id).units) if (u.length <= 12) hist[u.length]++;
  const tot = hist.reduce((a, b) => a + b, 0), w = hist.map((x) => x / tot), meanL = w.reduce((s, x, l) => s + x * l, 0), B = 32000, nUnits = B / meanL;
  out._target = { weights: w.map((x) => +x.toFixed(5)), meanUnitLength: meanL, nominalTokens: B, nominalUnits: Math.round(nUnits) };
  console.error("target mean unit length", f(meanL, 3), "units", Math.round(nUnits));
  for (const id of ids) {
    const p = loadCached(id), at = atlas(id), base = dOf(at.halves.discover["fig.introRight"], at.halves.confirm["fig.introRight"]);
    const byLen = Array.from({ length: 13 }, () => []); p.units.forEach((u, k) => { if (u.length <= 12) byLen[u.length].push(k); });
    let scale = 1; for (let l = 1; l <= 12; l++) if (w[l] > 0 && byLen[l].length < nUnits * w[l]) scale = Math.min(scale, byLen[l].length / (nUnits * w[l]));
    out[id] = { atlasD: base, scale, feasible: scale * B >= 20000, reps: [] };
    if (!out[id].feasible) { console.error(id, "INFEASIBLE scale", f(scale, 3)); continue; }
    for (let r = 0; r < 6; r++) {
      const keep = new Set();
      for (let l = 1; l <= 12; l++) { const n = Math.floor(nUnits * w[l] * scale); const s = byLen[l].slice().sort((x, y) => key(id, "match", r, x) - key(id, "match", r, y)); for (const k of s.slice(0, n)) keep.add(k); }
      const sel = { units: [], docOf: [] }; p.units.forEach((u, k) => { if (keep.has(k)) { sel.units.push(u); sel.docOf.push(p.docOf[k]); } });
      const res = run(p, sel.units, sel.docOf, `${id}|match|${r}`); res.meanUL = sel.units.length ? tokensOf(sel.units) / sel.units.length : null; out[id].reps.push(res);
    }
    const rs = out[id].reps; console.error(id, "d0", f(base), `scale ${f(scale, 2)} tok ${rs[0].tokens} ul ${f(rs[0].meanUL, 2)}`, "d", rs.map((r) => f(r.d, 2)).join("/"), "st", rs.map((r) => r.status).join(","));
  }
}
fs.writeFileSync(path.join(HERE, `A_${design}${process.argv[4] ? "_" + process.argv[4] : ""}.json`), JSON.stringify(out, null, 1));

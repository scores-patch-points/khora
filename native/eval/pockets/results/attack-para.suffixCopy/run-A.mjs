// run-A.mjs -- attack A (size and tokenisation): for every real pocket, suffixCopy (and rivals) under
//   tokenisation variants (drop the 1% rarest types; drop all hapax types; merge by first-5-characters; strip diacritics),
//   equal-length bands (both units of a pair inside [2,6] / [6,14] / [15,40]), and deterministic WHOLE-DOCUMENT subsamples to equal token counts (40k twice, 100k once) and 40k + band [6,14].
// All with the atlas null (unit-order), 20 draws, both halves. Output out/A/<id>.json.
import fs from "node:fs";
import path from "node:path";
import { halves, cells, prepView, loadCached, HERE, CACHE, tokensOf, optOf, sha256 } from "./lib.mjs";
const o = optOf(process.argv.slice(2)), ids0 = o("--ids", "all"), DRAWS = Number(o("--draws", 20)), OUT = path.join(HERE, o("--out", "out/A"));
fs.mkdirSync(OUT, { recursive: true });
const ids = ids0 === "all" ? fs.readdirSync(CACHE).filter((x) => x.endsWith(".json")).map((x) => x.slice(0, -5)).sort() : ids0.split(",");
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const typeCounts = (units) => { const m = new Map(); for (const u of units) for (const t of u) m.set(t, (m.get(t) || 0) + 1); return m; };
function tokenMaps(p) {
  const tc = typeCounts(p.units), types = [...tc.keys()].sort((a, b) => tc.get(a) - tc.get(b) || fnv(a) - fnv(b) || (a < b ? -1 : 1));
  const rare = new Set(types.slice(0, Math.ceil(0.01 * types.length))), hap = new Set(types.filter((t) => tc.get(t) <= 1));
  return {
    "tok-rare1pct": (t) => (rare.has(t) ? null : t),
    "tok-hapax": (t) => (hap.has(t) ? null : t),
    "tok-stem5": (t) => { const a = Array.from(t); return a.length > 5 ? a.slice(0, 5).join("") : t; },
    "tok-nodiacr": (t) => { const s = t.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC"); return s || t; },
  };
}
const BANDS = { "band-S": [2, 6], "band-M": [6, 14], "band-L": [15, 40] };
function subsample(p, T0, rep) {
  const dt = new Map(); p.units.forEach((u, i) => dt.set(p.docOf[i], (dt.get(p.docOf[i]) || 0) + u.length));
  const order = [...dt.keys()].sort((a, b) => { const x = sha256(`${p.id}:sub${T0}:${rep}:${a}`), y = sha256(`${p.id}:sub${T0}:${rep}:${b}`); return x < y ? -1 : x > y ? 1 : 0; });
  const keep = new Set(); let tok = 0;
  for (const d of order) { if (tok >= T0) break; keep.add(d); tok += dt.get(d); }
  const units = [], docOf = []; p.units.forEach((u, i) => { if (keep.has(p.docOf[i])) { units.push(u); docOf.push(p.docOf[i]); } });
  return { id: p.id, units, docOf };
}
const runCells = (pk, band, map) => {
  const H = halves(pk), r = {};
  for (const which of ["discover", "confirm"]) { const P = prepView(H[which], map); r[which] = P.U >= 2 ? cells(P, { id: pk.id, which, nullKind: "unit-order", draws: DRAWS, band, keys: ["suffixCopy", "lastCopy", "prefixCopy", "condSecond"] }) : null; if (r[which]) r[which]._meta.nullS2 = r[which]._meta.nullS2; }
  return r;
};
for (const id of ids) {
  const file = path.join(OUT, `${id}.json`);
  if (fs.existsSync(file)) continue;
  const p = loadCached(id), tokens = tokensOf(p.units), res = { id, meta: { group: p.group, register: p.register, language: p.language, script: p.script ?? null, grain: p.meta?.grain ?? null, tokens, units: p.units.length, docs: new Set(p.docOf).size, meanUnitLength: tokens / p.units.length }, draws: DRAWS, variants: {}, skipped: {} };
  for (const [name, map] of Object.entries(tokenMaps(p))) res.variants[name] = runCells(p, null, map);
  for (const [name, band] of Object.entries(BANDS)) res.variants[name] = runCells(p, band, null);
  for (const [name, T0, rep, band] of [["sub40-r0", 40000, 0, null], ["sub40-r1", 40000, 1, null], ["sub100-r0", 100000, 0, null], ["sub40band-r0", 40000, 0, [6, 14]]]) {
    if (tokens < T0 * 1.0) { res.skipped[name] = `pocket has ${tokens} tokens < ${T0}`; continue; }
    const sp = subsample(p, T0, rep); res.variants[name] = runCells(sp, band, null); res.variants[name].realisedTokens = tokensOf(sp.units); res.variants[name].realisedDocs = new Set(sp.docOf).size;
  }
  fs.writeFileSync(file, JSON.stringify(res));
  console.error(id, "done", Object.keys(res.variants).length, "variants");
}
console.error("ALL DONE", ids.length);

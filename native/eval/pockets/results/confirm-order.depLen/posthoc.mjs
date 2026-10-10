// results/confirm-order.depLen/posthoc.mjs — POST-HOC checks written AFTER the frozen verdict was computed (they cannot change it; every number from here on is exploratory):
//   B1 pooled power check: depLen on the WHOLE sibling pocket (both document halves pooled), 10 within-unit draws, z of the pooled view.
//   B2 repeat-collapse adversary (the cheaper rival burst.repAdj): every immediate exact repeat "w w" inside a unit is collapsed to one token and depLen is recomputed (same nulls on the collapsed view).
//   B3 tokenisation adversary for UD: the same train splits read at SURFACE grain (multiword tokens kept whole) instead of syntactic words.
//   B4 atlas priors: UNSELECTED quantiles of v in atlas prose / treebank / code pockets (not only the PRESENT cells), within-group Spearman of depLen v with burst.repAdj v.
//   node posthoc.mjs [--ids a,b,c]  -> posthoc.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { halves, nullView, seedOf, tokenCount } from "../../lib/pocket.mjs";
import * as order from "../../laws/order.mjs";
const SETS = { prose: ["sib-bk-zola", "sib-bk-chopin", "sib-bk-poe", "sib-bk-about-london", "sib-bk-waikna"], ud: ["sib-ud-ita", "sib-ud-nld", "sib-ud-ces", "sib-ud-dan", "sib-ud-rus"],
  code: ["sib-code-khora-core", "sib-code-khora-eval-js", "sib-code-fold-js", "sib-code-misc-js", "sib-code-py"], exploratory: ["sib-bk-siddhartha", "sib-bk-kafka", "sib-ud-lit", "sib-ud-ell", "sib-ud-gle", "sib-ud-afr", "sib-ud-mlt", "sib-ud-wol", "sib-ud-tur", "sib-ud-kat", "sib-ud-hye"] };
const status = (zd, zc) => (zd == null || zc == null ? "UNDEFINED" : zd >= 4 && zc >= 4 ? "PRESENT+" : zd <= -4 && zc <= -4 ? "PRESENT-" : Math.abs(zd) < 2 && Math.abs(zc) < 2 ? "ABSENT" : "AMBIGUOUS");
const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
const spearman = (x, y) => { const n = x.length; if (n < 3) return null; const a = rank(x), b = rank(y), ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };
const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), ids = (argv.indexOf("--ids") >= 0 ? argv[argv.indexOf("--ids") + 1].split(",") : Object.values(SETS).flat());
const LOADERS = ["_sibling-deplen-prose.mjs", "_sibling-deplen-ud.mjs", "_sibling-deplen-code-frozen.mjs"];
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const depCell = (view, label, k = 10) => {
  const v = order.compute(view).depLen, xs = [];
  for (let i = 0; i < k; i++) { const x = order.compute(nullView(view, "within-unit", seedOf(view.id, view.which, label, "within-unit", i))).depLen; if (Number.isFinite(x)) xs.push(x); }
  const { m, sd } = stat(xs); return { v, nullMean: m, nullSd: sd, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null };
};
const pooled = (p) => ({ id: p.id, which: "all", units: p.units, docOf: p.docOf });
const collapse = (view) => ({ ...view, units: view.units.map((u) => u.filter((w, i) => i === 0 || w !== u[i - 1])) });
const out = { note: "POST-HOC (after the frozen verdict); exploratory", B1_pooled: {}, B2_collapse: {}, B3_udSurface: {}, B4_atlasPriors: {} };
async function loadAll() {
  const ps = [];
  for (const f of LOADERS) { const m = await import(pathToFileURL(path.join(HERE, "../../loaders", f)).href); const mine = ids.filter((i) => m.ids().includes(i)); if (mine.length) ps.push(...await m.load(mine)); }
  return ps;
}
for (const p of await loadAll()) {
  const H = halves(p), W = ["discover", "confirm"];
  out.B1_pooled[p.id] = depCell(pooled(p), "pooled");
  const c = W.map((w) => depCell(collapse({ ...H[w], id: p.id }), "collapse"));
  const o = W.map((w) => depCell({ ...H[w], id: p.id }, "plain-recheck"));
  out.B2_collapse[p.id] = { collapsedV: c.map((x) => x.v), collapsedZ: c.map((x) => x.z), plainV: o.map((x) => x.v), plainZ: o.map((x) => x.z), statusCollapsed: status(c[0].z, c[1].z), signKept: c.every((x, i) => Math.sign(x.v) === Math.sign(o[i].v)), repeatShare: tokenCount(p.units) ? 1 - collapse(pooled(p)).units.reduce((a, u) => a + u.length, 0) / tokenCount(p.units) : null };
  console.error(`${p.id} done`);
}

// ---- B3: UD siblings re-read at SURFACE grain (multiword-token ranges kept as one token) with the same blocks, cap, halves
{
  const { interner, scriptOf } = await import(pathToFileURL(path.join(HERE, "../../loaders/_ud_ml_common.mjs")).href);
  const { readConllu } = await import(pathToFileURL(path.join(HERE, "../../loaders/_conllu.mjs")).href);
  const { finish } = await import(pathToFileURL(path.join(HERE, "../../loaders/_ud_ml_run.mjs")).href);
  for (const id of ids.filter((i) => SETS.ud.includes(i))) {
    const stem = id.slice("sib-ud-".length), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 };
    const sents = readConllu(`/private/tmp/claude-501/tb/${stem}/train.conllu`, interner(), st, "surface");
    const f = finish({ id, group: "ud", register: "treebank", language: stem, script: scriptOf(sents), units: sents, docOf: sents.map((_, k) => Math.floor(k / 25)), meta: { tokenisation: "ud-surface" } });
    if (f.thin) { out.B3_udSurface[id] = { thin: f.thin }; continue; }
    const H = halves(f.pocket), c = ["discover", "confirm"].map((w) => depCell({ ...H[w], id }, "surface"));
    out.B3_udSurface[id] = { tokens: tokenCount(f.pocket.units), mwtTokens: st.mwtTokens, v: c.map((x) => x.v), z: c.map((x) => x.z), status: status(c[0].z, c[1].z) };
    console.error(`${id} surface done`);
  }
}
// ---- B4: atlas priors (unselected) and within-group rank correlation with the rival burst.repAdj
{
  const dir = path.join(HERE, "../atlas"), rows = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (/^(pl|ct)-/.test(f)) continue;
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); if (!j.halves?.discover) continue;
    const g = (w, k) => j.halves[w]?.[k]; const d = g("discover", "order.depLen"), c = g("confirm", "order.depLen"); if (d?.v == null || c?.v == null) continue;
    rows.push({ id: f.replace(".json", ""), group: j.meta.group, register: j.meta.register, language: j.meta.language, tokens: j.meta.tokens, vD: d.v, vC: c.v, zD: d.z, zC: c.z, status: status(d.z, c.z), repAdj: [g("discover", "burst.repAdj")?.v, g("confirm", "burst.repAdj")?.v] });
  }
  const q = (a, p) => { a = a.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(p * (a.length - 1))] : null; };
  const qs = (a) => ({ n: a.length, q05: q(a, 0.05), q25: q(a, 0.25), median: q(a, 0.5), q75: q(a, 0.75), q95: q(a, 0.95) });
  const sel = (fn) => rows.filter(fn).flatMap((r) => [r.vD, r.vC]);
  const PROSE = new Set(["novel", "memoir", "reportage", "essay", "academic", "treatise", "dialect", "biography", "history", "book", "translation"]);
  const ROMANCE = new Set(["cat", "spa", "por", "glg", "fra", "ron", "ita"]);
  out.B4_atlasPriors = {
    bkProseAllCells_v: qs(sel((r) => r.group === "bk" && r.language === "en" && PROSE.has(r.register))), bkNovelAllCells_v: qs(sel((r) => r.group === "bk" && r.register === "novel" && r.language === "en")),
    bkProseOver100kTokens_v: qs(rows.filter((r) => r.group === "bk" && r.language === "en" && PROSE.has(r.register) && r.tokens >= 100000).flatMap((r) => [r.vD, r.vC])),
    udAllCells_v: qs(sel((r) => r.group === "ud")), udRomance: rows.filter((r) => r.group === "ud" && ROMANCE.has(r.language)).map((r) => ({ id: r.id, vD: r.vD, vC: r.vC, status: r.status })), udNonRomance_v: qs(sel((r) => r.group === "ud" && !ROMANCE.has(r.language))),
    codeCcAllCells_v: qs(sel((r) => r.id.startsWith("cd-cc-") || r.id.startsWith("cd-e09-"))),
    repAdjSpearmanByGroup: Object.fromEntries(["bk", "cd", "ud", "fm", "ml", "oc"].map((gname) => { const rs = rows.filter((r) => r.group === gname && r.repAdj[0] != null && r.repAdj[1] != null); return [gname, { n: rs.length, rho_v: spearman(rs.map((r) => (r.vD + r.vC) / 2), rs.map((r) => (r.repAdj[0] + r.repAdj[1]) / 2)) }]; })),
  };
}
// ---- B5: atlas base rates for pockets of the sibling kind and size, and the binomial probability of the observed number of PRESENT+ siblings under them
{
  const dir = path.join(HERE, "../atlas"), rows = [];
  for (const f of fs.readdirSync(dir).sort()) { if (/^(pl|ct)-/.test(f)) continue; const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); if (!j.halves?.discover) continue; const d = j.halves.discover["order.depLen"], c = j.halves.confirm["order.depLen"]; if (d?.z == null || c?.z == null) continue; rows.push({ id: f.replace(".json", ""), group: j.meta.group, register: j.meta.register, language: j.meta.language, tokens: j.meta.tokens, status: status(d.z, c.z) }); }
  const PROSE = new Set(["novel", "memoir", "reportage", "essay", "academic", "treatise", "dialect", "biography", "history", "book", "translation"]);
  const rate = (rs) => ({ n: rs.length, presentPlus: rs.filter((r) => r.status === "PRESENT+").length, presentMinus: rs.filter((r) => r.status === "PRESENT-").length, absent: rs.filter((r) => r.status === "ABSENT").length, ambiguous: rs.filter((r) => r.status === "AMBIGUOUS").length });
  const prose = rows.filter((r) => r.group === "bk" && r.language === "en" && PROSE.has(r.register) && r.tokens >= 50000 && r.tokens <= 130000), ud = rows.filter((r) => r.group === "ud" && r.tokens >= 50000), udAll = rows.filter((r) => r.group === "ud");
  const code = rows.filter((r) => r.id.startsWith("cd-cc-") && r.tokens >= 200000);
  const binomLE = (k, n, p) => { let s = 0, c = 1; for (let i = 0; i <= k; i++) { if (i > 0) c = (c * (n - i + 1)) / i; s += c * p ** i * (1 - p) ** (n - i); } return s; };
  const rp = rate(prose), ru = rate(ud);
  out.B5_atlasBaseRates = { englishProse50to130kTokens: rp, treebanksOver50kTokens: ru, treebanksAll: rate(udAll), codeCorpusOver200kTokens: rate(code),
    P_atMost1ofProse5_given_atlasRate: binomLE(1, 5, rp.presentPlus / rp.n), P_atMost1ofUd5_given_atlasRate: binomLE(1, 5, ru.presentPlus / ru.n), P_atMost2of10_given_pooledRate: binomLE(2, 10, (rp.presentPlus + ru.presentPlus) / (rp.n + ru.n)), P_atMost2of10_given_p0p4: binomLE(2, 10, 0.4),
    P_atLeast3of5CodePresentMinus_given_atlasRate: 1 - binomLE(2, 5, rate(code).presentMinus / rate(code).n) };
}
fs.writeFileSync(path.join(HERE, "posthoc.json"), JSON.stringify(out, null, 1));
console.error("posthoc.json written");

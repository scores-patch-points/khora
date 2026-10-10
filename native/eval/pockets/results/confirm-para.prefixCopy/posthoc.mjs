// results/confirm-para.prefixCopy/posthoc.mjs — POST-HOC reading of confirm-result.json (written AFTER the verdict; none of it enters the pre-registered verdict; every number is labelled post hoc).
//   node posthoc.mjs  -> posthoc.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ATLAS = path.join(HERE, "../atlas"), R = JSON.parse(fs.readFileSync(path.join(HERE, "confirm-result.json"), "utf8"));
const statusOf = (a, b) => (a.z == null || b.z == null || a.v == null || b.v == null ? "UNDEFINED" : a.z >= 4 && b.z >= 4 ? "PRESENT+" : a.z <= -4 && b.z <= -4 ? "PRESENT-" : Math.abs(a.z) < 2 && Math.abs(b.z) < 2 ? "ABSENT" : "AMBIGUOUS");
const atlas = [];
for (const f of fs.readdirSync(ATLAS)) { const j = JSON.parse(fs.readFileSync(path.join(ATLAS, f), "utf8")); if (!j.halves?.discover) continue; const a = j.halves.discover["para.prefixCopy"], b = j.halves.confirm["para.prefixCopy"]; if (a && b) atlas.push({ id: j.meta.id, group: j.meta.group, register: j.meta.register, lang: j.meta.language, tokens: j.meta.tokens, status: statusOf(a, b) }); }
const proseEn = atlas.filter((r) => ["novel", "memoir", "reportage", "treatise", "essay"].includes(r.register) && /^(en|eng)$/.test(r.lang));
const BINS = [[0, 30000], [30000, 45000], [45000, 70000], [70000, 120000], [120000, 1e12]];
const rateIn = (tok) => { const [lo, hi] = BINS.find(([a, b]) => tok >= a && tok < b), S = proseEn.filter((r) => r.tokens >= lo && r.tokens < hi); return { bin: [lo, hi], n: S.length, rate: S.filter((r) => r.status === "PRESENT+").length / S.length }; };
const pb = (ps) => { let d = [1]; for (const p of ps) { const e = new Array(d.length + 1).fill(0); d.forEach((x, k) => { e[k] += x * (1 - p); e[k + 1] += x * p; }); d = e; } return d; };
const prose = R.rows.filter((r) => r.class === "prose"), rates = prose.map((r) => ({ id: r.id, tokens: r.tokens, ...rateIn(r.tokens) })), pmf = pb(rates.map((x) => x.rate));
const out = { label: "POST HOC (after the verdict; not part of the pre-registered rule)", verdictFromPreregistration: R.verdict, holding: R.holding, failing: R.failing };
out.proseExpectedUnderAtlasSizeBinRates = { rates, expectedPresent: rates.reduce((a, x) => a + x.rate, 0), observedPresent: prose.filter((r) => r.status === "PRESENT+").length, pAtMost5: pmf.slice(0, 6).reduce((a, b) => a + b, 0), pAtLeast6: pmf.slice(6).reduce((a, b) => a + b, 0), pmf,
  note: "rates = atlas PRESENT+ share of English novel/memoir/reportage/treatise/essay pockets in the same token-size bin (bin 0-30k has n=2); the threshold >= 6 of 8 (0.65) was fixed before the siblings were computed" };
const small = atlas.filter((r) => r.register === "children" && r.tokens < 30000);
out.atlasChildrenUnder30k = { n: small.length, ids: small.map((r) => `${r.id}:${r.status}`), nAliceTexts: small.filter((r) => /alice/.test(r.id)).length, note: "the atlas basis of the 'children weaker' prediction (0 PRESENT of 6 under 30k tokens) is five translations/copies of one book plus one fairy-tale collection: not six independent pockets" };
const ok = R.rows.filter((r) => r.status !== "UNDEFINED"), pl = ok.filter((r) => r.status === "PRESENT+"), plNL = ok.filter((r) => r.class !== "notation");
out.overallPresentRate = { allDefined: `${pl.length}/${ok.length}`, excludingNotation: `${pl.length}/${plNL.length} = ${(pl.length / plNL.length).toFixed(3)}`, atlasLawRate: 0.7844, atlasPositive: "299 PRESENT+ of 385 = 0.777" };
out.withinDocumentNull = { presentUnderAtlasNull: pl.length, stillPresentUnderWithinDocNull: pl.filter((r) => r.supplementary.statusDocNull === "PRESENT+").length, lostStatus: pl.filter((r) => r.supplementary.statusDocNull !== "PRESENT+").map((r) => `${r.id}:${r.supplementary.statusDocNull}`),
  byClass: Object.fromEntries(["code", "prose", "ud", "children"].map((c) => [c, `${pl.filter((r) => r.class === c && r.supplementary.statusDocNull === "PRESENT+").length}/${pl.filter((r) => r.class === c).length}`])), medianZRatio: R.adversary.topic.meanZRatioDocNullOverUnitOrder,
  note: "UD documents are arbitrary 25-sentence blocks, so the within-document null of a treebank re-deals sentences inside one block; code files and book blocks are real documents or ~100-sentence blocks" };
out.undefinedCells = R.rows.filter((r) => r.status === "UNDEFINED").map((r) => ({ id: r.id, discover: r.discover, confirm: r.confirm }));
out.shortHalves = R.rows.filter((r) => r.class === "prose" && r.status === "AMBIGUOUS").map((r) => ({ id: r.id, tokens: r.tokens, units: r.units, zD: r.discover.z, zC: r.confirm.z, vD: r.discover.v, vC: r.confirm.v, nullSdD: r.discover.nullSd, nullSdC: r.confirm.nullSd }));
const pp = ok.filter((r) => r.supplementary.posParStatus === "PRESENT+");
out.rivalPosPar = { presentPosPar: `${pp.length}/${ok.length}`, presentPrefixCopy: `${pl.length}/${ok.length}`, posParPresentWherePrefixCopyAmbiguous: ok.filter((r) => r.status === "AMBIGUOUS" && r.supplementary.posParStatus === "PRESENT+").map((r) => r.id), spearmanZ: R.adversary.rivalPosPar.spearmanZ, atlasRho: 0.9 };
fs.writeFileSync(path.join(HERE, "posthoc.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 6000));

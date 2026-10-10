// results/confirm-comp.rigidR/posthoc.mjs — POST-HOC diagnostics, run AFTER the registered verdict (confirm-result.json) was written. None of it changes a verdict or a registered number; all of it is labelled post-hoc.
//  (a) effect sizes: v / nullMean and v - nullMean for every sibling, Spearman of z against log tokens (z is size-sensitive, the excess is the effect);
//  (b) why O3 failed: the types that carry the soft rigid-right share in the two English plays and two prose siblings (descriptive, word strings shown, no statistic uses them);
//  (c) leakage: exact duplicate units (>= 6 tokens, or >= 30 letters for the protein kin) between a sibling and the atlas pocket(s) of its own source.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const R = JSON.parse(fs.readFileSync(path.join(HERE, "confirm-result.json"), "utf8")), out = { note: "POST-HOC; not part of the registered verdict" };
const load = async (mod, ids) => (await import(pathToFileURL(path.join(ROOT, "loaders", mod)).href)).load(ids);
const ranks = (xs) => { const ix = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = []; for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; for (let k = i; k <= j; k++) r[ix[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
const rho = (a, b) => { const x = ranks(a), y = ranks(b), n = x.length, mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n; let c = 0, p = 0, q = 0; for (let i = 0; i < n; i++) { c += (x[i] - mx) * (y[i] - my); p += (x[i] - mx) ** 2; q += (y[i] - my) ** 2; } return c / Math.sqrt(p * q); };
// (a)
const rowsA = R.rows.filter((r) => r.cls !== "I" && r.zD != null);
out.effect = rowsA.map((r) => ({ id: r.id, kind: r.kind, ratioD: +(r.vD / r.nullMeanD).toFixed(3), ratioC: +(r.vC / r.nullMeanC).toFixed(3), excessD: +r.excessD.toFixed(5), excessC: +r.excessC.toFixed(5), zD: +r.zD.toFixed(1), zC: +r.zC.toFixed(1), tokens: r.tokens }));
out.effectSummary = { minRatio: Math.min(...out.effect.flatMap((e) => [e.ratioD, e.ratioC])), medianRatio: out.effect.map((e) => (e.ratioD + e.ratioC) / 2).sort((a, b) => a - b)[Math.floor(out.effect.length / 2)],
  rhoLogTokensVsMinAbsZ: +rho(rowsA.map((r) => Math.log(r.tokens)), rowsA.map((r) => Math.min(r.zD, r.zC))).toFixed(3), rhoLogTokensVsMeanV: +rho(rowsA.map((r) => Math.log(r.tokens)), rowsA.map((r) => r.v)).toFixed(3) };
// (b)
function carriers(p, top = 12) {
  const cnt = new Map(), nR = new Map(), pair = new Map(); let N = 0;
  for (const u of p.units) for (let i = 0; i < u.length; i++) { N++; const t = u[i]; cnt.set(t, (cnt.get(t) || 0) + 1); if (i < u.length - 1) { nR.set(t, (nR.get(t) || 0) + 1); const k = t + "\u0001" + u[i + 1]; pair.set(k, (pair.get(k) || 0) + 1); } }
  const best = new Map(); for (const [k, c] of pair) { const t = k.split("\u0001")[0]; if (!best.has(t) || c > best.get(t).c) best.set(t, { c, nb: k.split("\u0001")[1] }); }
  const rows = []; let total = 0, elig = 0;
  for (const [t, n] of nR) { if (cnt.get(t) < 8 || n < 10) continue; elig++; const m = best.get(t).c / n, s = m >= 0.8 ? 1 : Math.exp(-(0.8 - m) / 0.15); total += s; rows.push({ type: t, next: best.get(t).nb, m: +m.toFixed(2), n, soft: +s.toFixed(3) }); }
  rows.sort((a, b) => b.soft - a.soft || b.n - a.n);
  const top10 = rows.slice(0, 10).reduce((a, r) => a + r.soft, 0);
  return { tokens: N, eligible: elig, softShare: +(total / elig).toFixed(4), top10ShareOfTotal: +(top10 / total).toFixed(3), top: rows.slice(0, top) };
}
out.carriers = {};
for (const p of await load("_sibling-rr-prose.mjs", ["rr-en-dolls-house", "rr-en-early-plays", "rr-en-about-london", "rr-en-mouret"])) out.carriers[p.id] = carriers(p);
// (c)
const unitKeys = (p, minTok) => new Set(p.units.filter((u) => u.length >= minTok).map((u) => u.join(" ")));
const pairs = [["_sibling-rr-diag.mjs", "codemisc.mjs", ["rr-bpmn-miwg-heldout", "cd-bpmn-miwg"], ["rr-bpmn-kogito-heldout", "cd-bpmn-kogito"], ["rr-bpmn-activiti-heldout", "cd-bpmn-activiti"]],
  ["_sibling-rr-chat.mjs", "organic.mjs", ["rr-oc-irc-ho-0607", "oc-irc-ubuntu-0607"], ["rr-oc-irc-ho-0809", "oc-irc-ubuntu-0809"]], ["_sibling-rr-seq.mjs", "codemisc.mjs", ["rr-seq-protein", "cd-protein-aa"], ["rr-seq-codons", "cd-codons"]],
  ["_sibling-rr-fm.mjs", "formal-legal.mjs", ["rr-law-fr-heldout", "fm-law-fr"], ["rr-factbook-heldout", "fm-factbook"]], ["_sibling-rr-fm.mjs", "formal-reference.mjs", ["rr-wiki-heldout", "fm-wikipedia"], ["rr-ntrs-heldout", "fm-ntrs-1965-71"]],
  ["_sibling-rr-code.mjs", "codemisc.mjs", ["rr-cd-js", "cd-e09-eoapp-js"], ["rr-cd-py", "cd-e09-python"]]];
out.leak = [];
for (const [sm, am, ...ps] of pairs) {
  const sib = await load(sm, ps.map((x) => x[0])), atl = await load(am, ps.map((x) => x[1]));
  for (const [sid, aid] of ps) {
    const s = sib.find((p) => p.id === sid), a = atl.find((p) => p.id === aid); if (!s || !a) { out.leak.push({ sibling: sid, atlas: aid, error: "not built" }); continue; }
    const minTok = /seq/.test(sid) && /protein/.test(sid) ? 30 : 6, A = unitKeys(a, minTok), mine = s.units.filter((u) => u.length >= minTok), dup = mine.filter((u) => A.has(u.join(" "))).length;
    out.leak.push({ sibling: sid, atlas: aid, siblingUnitsChecked: mine.length, exactDuplicateUnits: dup, share: mine.length ? +(dup / mine.length).toFixed(4) : null });
  }
}
fs.writeFileSync(path.join(HERE, "posthoc.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ effectSummary: out.effectSummary, leak: out.leak }, null, 0));
for (const [id, c] of Object.entries(out.carriers)) console.log(id, c.tokens, "eligible", c.eligible, "softShare", c.softShare, "top10Share", c.top10ShareOfTotal, c.top.slice(0, 8).map((r) => `${r.type}>${r.next}:${r.m}/${r.n}`).join(" "));

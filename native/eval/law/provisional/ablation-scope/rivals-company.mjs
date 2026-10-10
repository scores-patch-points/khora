// eval/law/provisional/ablation-scope/rivals-company.mjs — MECHANISM CHECK (post hoc, descriptive): is the company-arm score (c.dSelf, c.surprisalDestroyed) more than a plain count of how the form's own mentions
// in the window are arranged (neighbour diversity, share of mentions that open a message)?
//
//   node rivals-company.mjs --data DIR [--data2 DIR] --out FILE [--B 500]
//
// ═══ PRE-REGISTRATION (written before this script was first run; it is labelled POST HOC because it is run after the confirmation numbers of confirm-rules.mjs were read) ═══
// WHY. c.dSelf is the l2 shift of the token's window-local company descriptor [log(1+count), distinct-left/count, distinct-right/count, entropy-left, entropy-right, initial share, final share] when ONE mention is deleted.
// It is a closed-form function of the form's own mention arrangement, so it needs no reader at all. If a single plain arrangement count has the same per-stratum AUC, the "ablation" part of the company arm is decoration and the
// rule should be stated in the plain count. This script computes plain counts from the stream (not from the record): for each evaluated token, over the reader's window [s-M, s]:
//   R_LDIV = distinct left neighbours / c      R_RDIV = distinct right neighbours / c      R_INIT = share of the c mentions that open their message
//   R_LENT = entropy of the left-neighbour distribution      R_RENT = entropy of the right-neighbour distribution      R_SAMEPOS = share of the OTHER mentions at the same position class as this one (initial vs not)
//   R_FIN = share of mentions that close their message.
// ORIENTATION. The sign of each rival is read from its stratified AUC on --data (discovery round 2) and frozen; the AUC reported on --data2 (confirmation) uses that frozen sign. Also reported: Spearman correlation
// of each rival with c.dSelf and c.surprisalDestroyed over the pooled members, and the AUC of the best rival vs the frozen component. No threshold, no verdict: a table.
// BLIND EXPECTATION (belief 0.6): the arrangement counts reproduce most of c.dSelf's AUC (within 0.05) in IRC B, i.e. the company arm is a statement about the form's own neighbour/position arrangement.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadIrcDay, loadWp, IRC_ROOT } from "./lib-data.mjs";
import { loadMiddlemarch } from "./lib-book.mjs";
import { loadRows, buildPairs, cellPairs } from "./features.mjs";
import { vec, indexOfName } from "./components.mjs";
import { aucPN, stratAuc, bootStrat, round } from "./stats.mjs";

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DATA = opt("--data", "data/discovery2"), DATA2 = opt("--data2", null), OUTF = opt("--out", "results/rivals-company.json"), B = Number(opt("--B", 500));
const RIV = ["R_LDIV", "R_RDIV", "R_INIT", "R_LENT", "R_RENT", "R_SAMEPOS", "R_FIN"], POOLED = ["c2", "c3", "c4_6", "c7_15", "c16p"];
const J_DSELF = indexOfName("c.dSelf"), J_SD = indexOfName("c.surprisalDestroyed");
const ent = (m) => { let t = 0; for (const v of m.values()) t += v; let h = 0; for (const v of m.values()) h -= (v / t) * Math.log(v / t); return h; };
const docs = new Map(), occs = new Map();
function docOf(name, corpus) {
  if (!docs.has(name)) { const d = corpus === "irc" ? loadIrcDay(path.join(IRC_ROOT, `${name}.txt`), name) : corpus === "wp" ? loadWp() : loadMiddlemarch(); docs.set(name, d); const o = new Map(); d.stream.forEach((sent, s) => sent.forEach((w, i) => { (o.get(w) ?? o.set(w, []).get(w)).push([s, i]); })); occs.set(name, o); }
  return [docs.get(name), occs.get(name)];
}
function rivals(r, M) {
  const [d, o] = docOf(r.doc, r.corpus), list = (o.get(r.w) ?? []).filter(([s]) => s >= r.s - M && s <= r.s);
  const L = new Map(), R = new Map(); let init = 0, fin = 0, same = 0, others = 0;
  for (const [s, i] of list) {
    const sent = d.stream[s], l = i > 0 ? sent[i - 1] : "^", rr = i + 1 < sent.length ? sent[i + 1] : "$";
    L.set(l, (L.get(l) ?? 0) + 1); R.set(rr, (R.get(rr) ?? 0) + 1); if (i === 0) init += 1; if (i === sent.length - 1) fin += 1;
    if (!(s === r.s && i === r.i)) { others += 1; if ((i === 0) === (r.i === 0)) same += 1; }
  }
  const c = list.length;
  return { R_LDIV: L.size / c, R_RDIV: R.size / c, R_INIT: init / c, R_LENT: ent(L), R_RENT: ent(R), R_SAMEPOS: others ? same / others : 0.5, R_FIN: fin / c };
}
function prep(dir) {
  const pairs = buildPairs(loadRows(dir));
  for (const x of pairs) { const M = x.kind === "irc" ? 256 : 128; for (const m of [x.p, x.n]) { Object.assign(m, rivals(m.raw, M)); m.v = vec(m.raw.rec); } }
  return pairs;
}
const spearman = (a, b) => { const rk = (v) => { const idx = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = new Array(v.length); for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && idx[j][0] === idx[i][0]) j++; for (let k = i; k < j; k++) r[idx[k][1]] = (i + j + 1) / 2; i = j; } return r; }; const x = rk(a), y = rk(b), n = a.length, mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };

async function main() {
  const t0 = Date.now(), P1 = prep(DATA), P2 = DATA2 ? prep(DATA2) : null, out = { module: "rivals-company.mjs", data: DATA, data2: DATA2, cells: {} };
  for (const [kind, kind2, grp] of [["irc", "irc", "A"], ["irc", "irc", "B"], ["wp", "mm", "A"], ["wp", "mm", "B"]]) {
    const by1 = cellPairs(P1, kind, grp, POOLED), by2 = P2 ? cellPairs(P2, kind2, grp, POOLED) : null;
    const key = `${kind2}.${grp}`, cell = { n1: Object.values(by1).flat().length, n2: by2 ? Object.values(by2).flat().length : 0, rivals: {}, components: {} };
    if (cell.n1 < 60) { out.cells[key] = { ...cell, skipped: "too few discovery pairs" }; continue; }
    const comps = { "c.dSelf": (m) => m.v[J_DSELF], "c.surprisalDestroyed": (m) => m.v[J_SD] };
    for (const [name, f] of [...RIV.map((r) => [r, (m) => m[r]]), ...Object.entries(comps)]) {
      const a1 = stratAuc(by1, f), sign = a1 >= 0.5 ? 1 : -1, g = (m) => sign * f(m);
      const rec = { sign, auc1: round(sign === 1 ? a1 : 1 - a1) };
      if (by2 && cell.n2 >= 30) { const b = bootStrat(by2, g, { B, seed: 99 }); rec.auc2 = b.point; rec.ci2 = [b.lo, b.hi]; }
      (name.startsWith("R_") ? cell.rivals : cell.components)[name] = rec;
    }
    const pool = Object.values(by1).flat().flatMap((x) => [x.p, x.n]);
    cell.spearmanWithDSelf = Object.fromEntries(RIV.map((r) => [r, round(spearman(pool.map((m) => m[r]), pool.map((m) => m.v[J_DSELF])))]));
    cell.spearmanWithSurprisalDestroyed = Object.fromEntries(RIV.map((r) => [r, round(spearman(pool.map((m) => m[r]), pool.map((m) => m.v[J_SD])))]));
    out.cells[key] = cell;
    console.error(`${key} done ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  out.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ file: OUTF, headerSha256: out.headerSha256 }));
}
await main();

// eval/law/provisional/ablation-scope/rival-scope.mjs — POST HOC: inside the FROZEN scopes of the two reported rules, how does the plain arrangement count R_INIT (share of the form's in-window mentions that open a message)
// compare with the ablation scores? One table, no verdict.
//
//   node rival-scope.mjs --data data/confirmation --out results/rival-scope.json [--B 1000]
//
// ═══ PRE-REGISTRATION (post hoc; written before this script was first run; run after the confirmation numbers and rivals-company.json were read) ═══
// Frozen scopes: IRC B c4_6..c16p (rule 1, S_ENTRY >= 1) and IRC A c2..c4_6 (rule 2, -c.dSelf). Orientation of R_INIT: + in IRC B and IRC A (the signs read from discovery in rivals-company.json). Reported: stratified AUC with
// a 95% cluster-bootstrap interval for R_INIT, R_SAMEPOS, R_LDIV, the frozen score, and the paired difference frozen score - R_INIT, per scope and for the pooled scope; and R_INIT's AUC per stratum c2..c16p.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadIrcDay, loadWp, IRC_ROOT } from "./lib-data.mjs";
import { loadMiddlemarch } from "./lib-book.mjs";
import { loadRows, buildPairs, cellPairs } from "./features.mjs";
import { vec, indexOfName } from "./components.mjs";
import { aucPairs, bootStrat, round } from "./stats.mjs";

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DATA = opt("--data", "data/confirmation"), OUTF = opt("--out", "results/rival-scope.json"), B = Number(opt("--B", 1000));
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
  const P = prep(DATA), out = { data: DATA, B, scopes: {} };
  const SCOPES = [["irc.B.rule1", "irc", "B", ["c4_6", "c7_15", "c16p"], (m) => m.S_ENTRY, "S_ENTRY"], ["irc.A.rule2", "irc", "A", ["c2", "c3", "c4_6"], (m) => -m.v[J_DSELF], "-c.dSelf"]];
  for (const [id, kind, grp, strata, f, fname] of SCOPES) {
    const by = cellPairs(P, kind, grp, strata), res = { n: Object.values(by).flat().length, frozen: fname, pooled: {}, perStratumRINIT: {} };
    const sc = { [fname]: f, R_INIT: (m) => m.R_INIT, R_SAMEPOS: (m) => (grp === "A" ? m.R_SAMEPOS : -m.R_SAMEPOS), R_LDIV: (m) => -m.R_LDIV };
    for (const [name, g] of Object.entries(sc)) { const b = bootStrat(by, g, { B, seed: 5 }); res.pooled[name] = [b.point, b.lo, b.hi]; }
    for (const name of ["R_INIT", "R_SAMEPOS", "R_LDIV"]) { const b = bootStrat(by, f, { B, seed: 6, g: sc[name] }); res.pooled[`${fname} - ${name}`] = [b.point, b.lo, b.hi]; }
    const all = cellPairs(P, kind, grp, ["c2", "c3", "c4_6", "c7_15", "c16p"]);
    for (const st of Object.keys(all)) if (all[st].length >= 10) res.perStratumRINIT[st] = [round(aucPairs(all[st], (m) => m.R_INIT)), all[st].length];
    out.scopes[id] = res; console.error(id, JSON.stringify(res.pooled));
  }
  out.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  fs.writeFileSync(OUTF, JSON.stringify(out, null, 1)); console.log(JSON.stringify({ file: OUTF, headerSha256: out.headerSha256 }));
}
await main();

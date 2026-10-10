// diag-c4.mjs — EXPLORATORY (PREREG disclosure C4; post-hoc, not gating): can company vectors alone separate the cast from other forms, inside the cast-holding kind and overall?
import fs from "node:fs";
import path from "node:path";
import { loadNovel, castWP, formTable, companyCounts, projector, project, seedFor, rngFor, binFreq, fold, round, mean, OUT, INDUCE } from "./lib.mjs";
import { auc } from "../../competence/lib.mjs";
const book = loadNovel("wp"), stream = book.stream, P = INDUCE;
const T = formTable(stream, { nmin: P.nmin, ctxMin: P.ctxMin });
const [cA, cB] = companyCounts(stream, T, null); // half null => everything into matrix 0
const X = project(cA, T, projector(T.D, P.d, seedFor("induce-wp", "proj")), P.d), d = P.d;
const KJ = JSON.parse(fs.readFileSync(path.join(OUT, "kinds-wp.json"), "utf8")), cast = castWP();
const topKind = KJ.C1.topKind;
const vec = (f) => Array.from({ length: d }, (_, k) => X[f * d + k]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), norm = (a) => { const n = Math.sqrt(dot(a, a)) || 1; return a.map((x) => x / n); };
const rnd = rngFor(seedFor("c4"));
const bef = (f) => { let tot = 0; for (let j = 0; j < T.C; j++) tot += cA[f * T.D + j]; return tot ? cA[f * T.D] / tot : 0; };
function run(pool, label) {
  const ids = pool.filter((f) => true), isCast = (f) => cast.core.has(fold(T.forms[f]));
  const cs = ids.filter(isCast), ncs = ids.filter((f) => !isCast(f));
  if (cs.length < 8) return { label, cast: cs.length };
  const sumV = new Array(d).fill(0); cs.forEach((f) => vec(f).forEach((x, k) => { sumV[k] += x; }));
  const score = (f) => { const mine = isCast(f) ? sumV.map((x, k) => x - vec(f)[k]) : sumV; return dot(vec(f), norm(mine)); };
  const byBin = new Map(); ncs.forEach((f) => { const b = binFreq(T.cnt.get(T.forms[f])); (byBin.get(b) ?? byBin.set(b, []).get(b)).push(f); });
  const rows = [];
  for (const f of cs) { rows.push({ f, y: 1 }); const pl = byBin.get(binFreq(T.cnt.get(T.forms[f]))) ?? []; for (let q = 0; q < 5 && pl.length; q++) rows.push({ f: pl[Math.floor(rnd() * pl.length)], y: 0 }); }
  const y = rows.map((r) => r.y === 1);
  return { label, cast: cs.length, nonCast: ncs.length, matchedRows: rows.length, aucCompany: round(auc(rows.map((r) => score(r.f)), y)), aucBeforeCaretShare: round(auc(rows.map((r) => bef(r.f)), y)) };
}
const inTop = T.forms.map((w, f) => [w, f]).filter(([w]) => KJ.formKind[w] === topKind).map(([, f]) => f);
console.log(JSON.stringify({ topKind, insideCastKind: run(inTop, "inside kind " + topKind), allInducedForms: run(T.forms.map((_, f) => f), "all forms n>=20") }, null, 1));

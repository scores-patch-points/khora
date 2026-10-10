// results/confirm-comp.rigidR/confirm-summarise.mjs — reads pockets/<id>.json (written by confirm.mjs --run) and applies the REGISTERED rules R1-R5 of PREREG (confirm.mjs, frozen header, sha256 in prereg.sha256).
// Nothing here changes a registered threshold: it only counts. Output: confirm-result.json and a table on stdout.
import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../../lib/pocket.mjs";

const avg = (a, b) => (a == null || b == null ? null : (a + b) / 2);
function ranks(xs) {   // average ranks
  const ix = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length);
  for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[ix[k][1]] = m; i = j + 1; }
  return r;
}
function spearman(xs, ys) {
  const a = ranks(xs), b = ranks(ys), n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null;
}
export async function summarise(P, { statusOf, PK, HERE }) {
  const rows = [];
  for (const s of P.siblings) {
    const f = path.join(PK, `${s.id}.json`);
    if (!fs.existsSync(f)) { rows.push({ ...s, status: "MISSING" }); continue; }
    const r = JSON.parse(fs.readFileSync(f, "utf8"));
    if (r.unbuilt) { rows.push({ ...s, status: r.thin ? "THIN" : "UNBUILT" }); continue; }
    const d = r.halves.discover, c = r.halves.confirm, a = d.rigidR, b = c.rigidR, st = statusOf(a.z, b.z), v = avg(a.v, b.v);
    const holds = st === "UNDEFINED" ? null : s.predict === "PRESENT+" ? st === "PRESENT+" : st !== "PRESENT+";
    rows.push({ id: s.id, cls: s.cls, kind: s.kind, predict: s.predict, status: st, predictionHolds: holds, v, vD: a.v, vC: b.v, nullMeanD: a.nullMean, nullMeanC: b.nullMean, zD: a.z, zC: b.z, excessD: a.v == null ? null : a.v - a.nullMean, excessC: b.v == null ? null : b.v - b.nullMean,
      range: s.range, inRange: s.range && v != null ? v >= s.range[0] && v <= s.range[1] : null, tokens: r.meta.tokens, tokensD: d.tokens, tokensC: c.tokens, eligD: d.eligR, eligC: c.eligR, hardRD: d.hardR, hardRC: c.hardR,
      twinRigidL: { vD: d.rigidL.v, vC: c.rigidL.v, zD: d.rigidL.z, zC: c.rigidL.z, status: statusOf(d.rigidL.z, c.rigidL.z) }, kin: s.kin, note: s.note });
  }
  const byId = Object.fromEntries(rows.map((r) => [r.id, r])), A = rows.filter((r) => r.cls === "A"), defA = A.filter((r) => r.status !== "UNDEFINED" && r.status !== "MISSING" && r.status !== "THIN" && r.status !== "UNBUILT");
  const cnt = (xs, s) => xs.filter((r) => r.status === s).length, nA = defA.length, nPresent = cnt(defA, "PRESENT+");
  const R = {};
  R.R1 = { rule: P.passRule.R1, nDefinedA: nA, presentPlus: nPresent, absent: cnt(defA, "ABSENT"), presentMinus: cnt(defA, "PRESENT-"), ambiguous: cnt(defA, "AMBIGUOUS"), fractionPresentPlus: nA ? nPresent / nA : null,
    notPresentPlus: defA.filter((r) => r.status !== "PRESENT+").map((r) => `${r.id}:${r.status}`), pass: cnt(defA, "ABSENT") === 0 && cnt(defA, "PRESENT-") === 0 && cnt(defA, "AMBIGUOUS") <= 1 };
  const B = byId["rr-seq-protein"];
  R.R2 = { rule: P.passRule.R2, status: B?.status, zD: B?.zD, zC: B?.zC, v: B?.v, pass: !!B && B.status !== "UNDEFINED" && B.status !== "PRESENT+" && B.status !== "MISSING" && B.status !== "UNBUILT" && B.status !== "THIN" };
  const inR = defA.filter((r) => r.inRange === true).length;
  R.R3 = { rule: P.passRule.R3, inRange: inR, of: nA, fraction: nA ? inR / nA : null, outOfRange: defA.filter((r) => r.inRange === false).map((r) => ({ id: r.id, v: r.v, range: r.range })), pass: nA > 0 && inR / nA >= 0.8 };
  const vOf = (id) => byId[id]?.v, O = {};
  for (const k of ["O1", "O2", "O3"]) {
    const o = P.order[k], g = o.greater.map((id) => [id, vOf(id)]).filter((x) => x[1] != null), l = o.less.map((id) => [id, vOf(id)]).filter((x) => x[1] != null);
    const gMin = g.reduce((m, x) => (x[1] < m[1] ? x : m), g[0]), lMax = l.reduce((m, x) => (x[1] > m[1] ? x : m), l[0]);
    const violations = []; for (const [gi, gv] of g) for (const [li, lv] of l) if (!(gv > lv)) violations.push({ greater: gi, vGreater: gv, less: li, vLess: lv });
    O[k] = { text: o.text, minOfGreater: gMin, maxOfLess: lMax, nPairs: g.length * l.length, nViolations: violations.length, violations, pass: violations.length === 0 && g.length > 0 && l.length > 0 };
  }
  const set4 = defA.filter((r) => P.order.O4.kinds.includes(r.kind)), rho = set4.length >= 5 ? spearman(set4.map((r) => r.v), set4.map((r) => P.order.O4.median[r.kind])) : null;
  O.O4 = { text: P.order.O4.text, n: set4.length, rho, min: P.order.O4.min, pass: rho != null && rho >= P.order.O4.min };
  R.R4 = { rule: P.passRule.R4, O, pass: O.O1.pass && O.O2.pass && O.O3.pass && O.O4.pass };
  const sc = fs.existsSync(path.join(HERE, "self-check.json")) ? JSON.parse(fs.readFileSync(path.join(HERE, "self-check.json"), "utf8")) : null, I = (id) => byId[id];
  const i5 = { controlMouret: I("rr-ct-en-mouret")?.status, controlJs: I("rr-ct-cd-js")?.status, plNull: I("rr-pl-null")?.status, plFrames: I("rr-pl-frames")?.status, selfCheck: sc ? sc.pass : null };
  R.R5 = { rule: P.passRule.R5, ...i5, pass: ["controlMouret", "controlJs", "plNull"].every((k) => i5[k] && i5[k] !== "PRESENT+" && i5[k] !== "MISSING") && i5.plFrames === "PRESENT+" && i5.selfCheck === true };
  const failed = Object.entries(R).filter(([, x]) => !x.pass).map(([k]) => k);
  const verdict = nA && nPresent / nA < 0.8 ? "FAILS" : failed.length === 0 ? "REPLICATES" : "PARTIAL";
  const byKind = {}; for (const r of A) { const k = (byKind[r.kind] ||= { n: 0, presentPlus: 0, ids: [] }); k.n++; if (r.status === "PRESENT+") k.presentPlus++; k.ids.push(r.id); }
  const undefd = rows.filter((r) => ["UNDEFINED", "MISSING", "THIN", "UNBUILT"].includes(r.status)).map((r) => `${r.id}:${r.status}`);
  const prereg = fs.readFileSync(path.join(HERE, "prereg.sha256"), "utf8").split(" ")[0], frozen = sha256(fs.readFileSync(path.join(HERE, "confirm-header-frozen.mjs.txt")));
  const out = { law: P.law, verdict, failedRules: failed, preregSha256: prereg, frozenHeaderSha256: frozen, headerIntact: prereg === frozen, rules: R, byKind, undefinedOrMissing: undefd, rows };
  fs.writeFileSync(path.join(HERE, "confirm-result.json"), JSON.stringify(out, null, 1));
  const f4 = (x) => (x == null ? "  .   " : x.toFixed(4)), f1 = (x) => (x == null ? "  . " : x.toFixed(1));
  console.log("id".padEnd(26), "cls kind".padEnd(18), "pred".padEnd(12), "status".padEnd(10), "holds", "v(D)   v(C)   null(D) null(C) zD     zC     range-ok");
  for (const r of rows) console.log(r.id.padEnd(26), `${r.cls} ${r.kind}`.padEnd(18), String(r.predict).padEnd(12), String(r.status).padEnd(10), String(r.predictionHolds).padEnd(5), f4(r.vD), f4(r.vC), f4(r.nullMeanD), f4(r.nullMeanC), f1(r.zD).padStart(6), f1(r.zC).padStart(6), String(r.inRange));
  console.log(JSON.stringify({ verdict, failed, R1: { ...R.R1, rule: undefined }, R2: { ...R.R2, rule: undefined }, R3: { ...R.R3, rule: undefined }, O: Object.fromEntries(Object.entries(O).map(([k, o]) => [k, { pass: o.pass, nViolations: o.nViolations, rho: o.rho, n: o.n }])), R5: { ...R.R5, rule: undefined } }));
}

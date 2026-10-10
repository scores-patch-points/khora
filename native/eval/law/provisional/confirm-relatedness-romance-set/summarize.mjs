// confirm-relatedness-romance-set/summarize.mjs — aggregates results/cell-*.json with the OVERALL-VERDICT logic registered in the confirm.mjs header (no new thresholds). Reads files only.
//   node summarize.mjs        (no env needed; does not import the scoper's modules)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RES = path.join(HERE, "results");
const cells = {}; for (const f of fs.readdirSync(RES).filter((x) => /^cell-.*\.json$/.test(x))) { const j = JSON.parse(fs.readFileSync(path.join(RES, f), "utf8")); cells[j.cell] = j; }
const r4 = (x) => (typeof x === "number" ? Number(x.toFixed(4)) : x);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const SETS = ["A", "B", "C"], PRIM = ["cat", "fra", "ita", "por", "spa"];
const hdr = new Set(Object.values(cells).map((c) => c.headerSha256)), prereg = fs.readFileSync(path.join(RES, "PREREG.sha256"), "utf8").trim();
const row = (c, scope = "primary") => { const g = c[scope].group; return g ? { verdict: c[scope].verdict, n: g.n, nPass: g.nPass, same: g.meanSame, ctrl: g.meanCtrl, diff: g.diffBoot.mean, lo: g.diffBoot.lo, pos: g.positionControl, shuf: g.shuffledControl, sham: c[scope].ex.sham, shufDonor: c[scope].ex.shufDonor, passing: g.passing, failing: g.failing, thin: c.thin.map((t) => `${t.key}:${t.pairs}`) } : { verdict: c[scope].verdict }; };
const out = { headerSha256: [...hdr], headerMatchesPrereg: hdr.size === 1 && hdr.has(prereg), cells: {}, perTarget: {}, noTwin: {} };
for (const id of Object.keys(cells).sort()) if (!id.startsWith("E1")) { out.cells[id] = { primary: row(cells[id], "primary"), all: row(cells[id], "all") }; }
// per-target same / ctrl / diff / pass over P and D FIRST-BOTH cells
for (const form of ["P", "D", "XP", "XD"]) for (const s of SETS) {
  const c = cells[`${form}-${s}-FIRST-BOTH`]; if (!c) continue;
  for (const [k, t] of Object.entries(c.targets)) { const a = t.sets.a, e = t.sets.e; if (!a || !e) continue; const pass = a.mean >= 0.6 && a.mean > a.q95 && a.mean - e.mean >= 0.05; ((out.perTarget[k] ??= {})[form] ??= {})[s] = { pairs: t.pairs, same: a.mean, ctrl: e.mean, diff: r4(a.mean - e.mean), q95: a.q95, pass, shufTarget: a.shuf, sham: t.sham, shufDonor: t.shufDonor, own: t.own?.cv }; }
}
for (const form of ["P", "D"]) for (const s of SETS) { const c = cells[`${form}-${s}-FIRST-BOTH`]; if (!c) continue; for (const [k, t] of Object.entries(c.targets)) if (t.noTwin) ((out.noTwin[k] ??= {})[`${form}-${s}`] = { sameNoTwin: t.noTwin.a?.mean, same: t.sets.a.mean, ctrl: t.noTwin.e?.mean, diffNoTwin: r4(t.noTwin.a.mean - t.noTwin.e.mean), diffWith: r4(t.sets.a.mean - t.sets.e.mean) }); }
// OVERALL verdict (registered): P cells of FIRST-BOTH, usable = not UNDERPOWERED
const P = SETS.map((s) => cells[`P-${s}-FIRST-BOTH`]).filter(Boolean), D = SETS.map((s) => cells[`D-${s}-FIRST-BOTH`]).filter(Boolean), usable = P.filter((c) => c.primary.verdict !== "UNDERPOWERED");
const cnt = (cs, v) => cs.filter((c) => (Array.isArray(v) ? v : [v]).includes(c.primary.verdict)).length;
const nHold = cnt(usable, "HOLDS"), nFV = cnt(usable, ["FAILS", "VOID"]), nPart = cnt(usable, "PARTIALLY HOLDS"), dBad = cnt(D, ["FAILS", "VOID"]);
let verdict = "PARTIAL"; if (nHold >= 2 && nFV === 0 && dBad === 0) verdict = "CONFIRMED"; else if (nFV >= 2 || (nHold === 0 && nPart === 0)) verdict = "NOT_CONFIRMED";
// scope: languages passing in >= 2/3 of the P cells in which they are eligible (informational)
const scope = {}; for (const k of PRIM.concat(["glg", "ron"])) { const v = SETS.map((s) => out.perTarget[k]?.P?.[s]).filter(Boolean); scope[k] = { eligibleSets: v.length, passSets: v.filter((x) => x.pass).length, meanSame: v.length ? r4(mean(v.map((x) => x.same))) : null, meanDiff: v.length ? r4(mean(v.map((x) => x.diff))) : null }; }
out.overall = { verdict, usableP: usable.map((c) => `${c.cell}:${c.primary.verdict}`), D: D.map((c) => `${c.cell}:${c.primary.verdict}`), nHold, nFailsOrVoid: nFV, nPartial: nPart, dBad, perLanguageScope: scope };
// the rule's OWN criteria (passIf without the registered extra controls): reported for transparency, NOT used for the verdict
const own = (c) => { const g = c.primary.group; if (!g || g.n < 3) return "UNDERPOWERED"; return g.nPass / g.n >= 0.7 && g.diffBoot.lo > 0 && g.positionControl >= 0.45 && g.positionControl <= 0.55 && (g.shuffledControl == null || g.shuffledControl <= 0.55) ? "HOLDS(rule's own passIf)" : "not"; };
out.ruleOwnPassIf = Object.fromEntries(Object.keys(cells).filter((i) => !i.startsWith("E1") && /-FIRST-BOTH$/.test(i) && !i.startsWith("X")).map((i) => [i, own(cells[i])]));
out.E1 = Object.fromEntries(Object.keys(cells).filter((i) => i.startsWith("E1")).map((i) => [i, { means: cells[i].means, targets: Object.fromEntries(Object.entries(cells[i].targets).map(([k, r]) => [k, { r: r.r?.mean, g: r.g?.mean, o: r.o?.mean, genealogyBeyondTeam: r.genealogyBeyondTeam, team: r.team }])) }]));
fs.writeFileSync(path.join(RES, "SUMMARY.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ headerMatchesPrereg: out.headerMatchesPrereg, overall: out.overall, ruleOwnPassIf: out.ruleOwnPassIf }, null, 1));

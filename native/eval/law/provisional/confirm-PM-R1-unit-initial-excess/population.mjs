// confirm-PM-R1-unit-initial-excess/population.mjs -- POST-HOC DESCRIPTIVE "how useful is the fixed score without matching" on the FRESH data (UD train windows, IRC en fresh pool, 4 novels, 32 code files). New file.
// ═══ PRE-REGISTRATION (written after the verdict and explore.json were read; DESCRIPTIVE only, no threshold gates anything) ══════════════════════════════════════════════════════════════
// QUESTION. The registered test is a MATCHED-pair AUC (frequency/position/length matched). A user wanting a usable rule also needs the unmatched, population-level strength: among ALL forms with >= 3 mentions in the
//   stream that carry a gold label, how well does the fixed score pInitX (over all mentions, no fitting) rank names above controls, and what are precision and lift at two thresholds fixed here in advance
//   (pInitX >= 0.25 and pInitX >= 0.50)? Form class: P if every labelled mention is "P", N if every labelled mention is "N", mixed forms dropped; UD PN labels (PROPN / NOUN), IRC NK, books NAMES/COMMON, code PE.
//   Forms with >= 3 mentions only (a recurrence statistic). Reported per register; UD also by the hand-assigned SOV group of verdict.mjs/explore.mjs. Unmatched pooled AUC is CONFOUNDED by frequency (names are rarer
//   than the control class) and is reported only as a descriptive number; the matched result in verdict.json remains the test.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { PRE, rngFor, seedFor, headerSha, round, udBase, ircBase, bookBase, codeBase, UD_DEFS, IRC_DEFS, BOOK_DEFS, CODE_DEFS, featuresOf } from "./lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), man = JSON.parse(fs.readFileSync(path.join(HERE, "data", "manifest.json"), "utf8")), IRC = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc/";
const mw = (pos, neg) => { if (!pos.length || !neg.length) return null; const all = [...pos.map((x) => [x, 1]), ...neg.map((x) => [x, 0])].sort((a, b) => a[0] - b[0]); let rs = 0; for (let i = 0; i < all.length;) { let j = i; while (j < all.length && all[j][0] === all[i][0]) j++; const av = (i + 1 + j) / 2; for (let k = i; k < j; k++) if (all[k][1]) rs += av; i = j; } return (rs - (pos.length * (pos.length + 1)) / 2) / (pos.length * neg.length); };
function forms(bases, def) { // [{x: pInitX, y: 1 name | 0 control}] for every form with >= 3 mentions and a pure label
  const out = [];
  for (const b of bases) for (const [w, o] of b.P.occ) { const n = o.length / 2; if (n < 3) continue; let p = 0, q = 0; for (let j = 0; j < n; j++) { const g = def(b.gold[o[2 * j]][o[2 * j + 1]], w); if (g === "P") p++; else if (g === "N") q++; } if ((p > 0) === (q > 0)) continue; out.push({ x: featuresOf(b.P, o[0], o[1], "FULL").pInitX, y: p > 0 ? 1 : 0, w }); }
  return out;
}
function summarise(fs_) {
  const pos = fs_.filter((f) => f.y === 1), neg = fs_.filter((f) => f.y === 0), o = { nP: pos.length, nN: neg.length, baseRate: round(pos.length / (pos.length + neg.length)), pooledAuc: round(mw(pos.map((f) => f.x), neg.map((f) => f.x))) };
  for (const t of [0.25, 0.5]) { const sel = fs_.filter((f) => f.x >= t), tp = sel.filter((f) => f.y === 1).length; o[`ge${t}`] = { selected: sel.length, precision: sel.length ? round(tp / sel.length) : null, recall: pos.length ? round(tp / pos.length) : null, lift: sel.length ? round(tp / sel.length / (pos.length / (pos.length + neg.length))) : null }; }
  return o;
}
const out = { headerSha: headerSha(fileURLToPath(import.meta.url)), registers: {} };
out.registers["irc-en-fresh"] = summarise(forms([ircBase("irc", man.irc.freshEnAll.map((x) => IRC + x.id))], IRC_DEFS.NK));
for (const bk of man.books) out.registers[bk.name] = summarise(forms([bookBase(bk.name, bk.file)], BOOK_DEFS.NAMES));
for (const lg of ["js", "py"]) out.registers[`code-${lg}`] = summarise(forms(man.code[lg].map((_, i) => codeBase(`c${i}`, path.join(HERE, "data", "lex", `${lg}-${i}.json`))), CODE_DEFS.PE));
const SOV = new Set("ja ko tr hi ur fa ta ka hy kk ug eu".split(" ")), cellsUd = {}, allSOV = [], allRest = [];
for (const [tb, file] of Object.entries(man.ud.files)) { const b = udBase(`ud-${tb}`, file, { budget: man.ud.windowTokens, rnd: rngFor(seedFor(PRE, tb, "window")) }), f = forms([b], UD_DEFS.PN); cellsUd[tb] = summarise(f); (SOV.has(tb.split("_")[0]) ? allSOV : allRest).push(...f); }
out.ud = { perCell: cellsUd, pooledSOV: summarise(allSOV), pooledRest: summarise(allRest) };
const v = Object.values(cellsUd).filter((c) => c.nP >= 10 && c.nN >= 10), med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
out.ud.medianOverCells = { n: v.length, pooledAuc: round(med(v.map((c) => c.pooledAuc))), baseRate: round(med(v.map((c) => c.baseRate))), prec25: round(med(v.map((c) => c["ge0.25"].precision).filter((x) => x !== null))), lift25: round(med(v.map((c) => c["ge0.25"].lift).filter((x) => x !== null))) };
fs.writeFileSync(path.join(HERE, "results", "population.json"), JSON.stringify(out, null, 1));
const cp = (r) => `${r.nP}P/${r.nN}N base ${r.baseRate} pooledAUC ${r.pooledAuc} | >=.25: n ${r["ge0.25"].selected} prec ${r["ge0.25"].precision} rec ${r["ge0.25"].recall} lift ${r["ge0.25"].lift} | >=.5: n ${r["ge0.5"].selected} prec ${r["ge0.5"].precision} rec ${r["ge0.5"].recall} lift ${r["ge0.5"].lift}`;
for (const [k, r] of Object.entries(out.registers)) console.log(k.padEnd(18), cp(r)); console.log("ud SOV pooled".padEnd(18), cp(out.ud.pooledSOV)); console.log("ud rest pooled".padEnd(18), cp(out.ud.pooledRest)); console.log("ud median over cells", JSON.stringify(out.ud.medianOverCells));

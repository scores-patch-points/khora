// IDENT-0 summary: every table and bar of PREREG-IDENT-0.md, computed from results.json. No threshold here is chosen after seeing data.
//   node eval/ident0/summarize.mjs [results.json] > summary.json   (also writes summary.md beside it)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const inFile = process.argv[2] ?? path.join(here, 'results.json'); const R = JSON.parse(fs.readFileSync(inFile, 'utf8')); const rows = R.rows;
const wilson = (k, n) => { if (!n) return [0, 0]; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+((c - m) / d).toFixed(3), +((c + m) / d).toFixed(3)]; };
const share = (k, n) => `${k}/${n} = ${n ? (100 * k / n).toFixed(1) : '-'}% [${wilson(k, n).join('–')}]`;
const pos = rows.filter((r) => r.cls === 'pos'), neg = rows.filter((r) => r.cls === 'neg');
const count = (arr, f) => arr.reduce((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const S = { counts: { pos: pos.length, neg: neg.length, articles: R.articleStats.length, seeds: R.seeds }, configs: {}, baselines: {}, bars: {}, control: {}, strata: {}, size: {}, formula: {}, failures: {} };
const md = [];
const CFG = { A1: (r) => r.A1.verdict, A1on: (r) => r.A1on.verdict, A2: (r) => r.A2.verdict, B1: (r) => r.B1.verdict, 'B1-U': (r) => r.B1.uLevel ? 'U-' + r.B1.uLevel : r.B1.verdict };
md.push('## Verdict counts per configuration', '', '| config | class | n | same | different | unsupported | refused | unmapped |', '|---|---|---|---|---|---|---|---|');
for (const [name, f] of Object.entries(CFG).filter(([n]) => n !== 'B1-U')) for (const [cn, arr] of [['pos', pos], ['neg', neg]]) {
  const c = count(arr, f); S.configs[`${name}/${cn}`] = c;
  md.push(`| ${name} | ${cn} | ${arr.length} | ${c.same ?? 0} | ${c.different ?? 0} | ${c.unsupported ?? 0} | ${c.refused ?? 0} | ${c.unmapped ?? 0} |`);
}
for (const cn of ['pos', 'neg']) S.configs[`B1-U/${cn}`] = count(cn === 'pos' ? pos : neg, (r) => r.B1.uLevel ?? 'unmapped');
md.push('', 'B1 (bipartite, fold dmd) at the level of U, before Δ: ' + ['pos', 'neg'].map((cn) => `${cn} ` + JSON.stringify(S.configs[`B1-U/${cn}`])).join(' ; '));
// baselines (string containment; cast pass on / off)
md.push('', '## Baselines', '', '| rule | class | same | different | unseen/gap | correct |', '|---|---|---|---|---|---|');
const base = { string: (r) => r.baseString, castOn: (r) => r.baseCastOn, castOff: (r) => r.baseCastOff };
const corr = (cn, v) => (cn === 'pos' ? v === 'same' : v === 'different');
for (const [name, f] of Object.entries(base)) for (const [cn, arr] of [['pos', pos], ['neg', neg]]) {
  const c = count(arr, f); const k = arr.filter((r) => corr(cn, f(r))).length; S.baselines[`${name}/${cn}`] = { ...c, correct: k, n: arr.length };
  md.push(`| ${name} | ${cn} | ${c.same ?? 0} | ${c.different ?? 0} | ${c.unseen ?? 0} | ${share(k, arr.length)} |`);
}
const macro = (f) => (pos.filter((r) => corr('pos', f(r))).length / pos.length + neg.filter((r) => corr('neg', f(r))).length / neg.length) / 2;
S.macro = { A1: macro(CFG.A1), A1on: macro(CFG.A1on), A2: macro(CFG.A2), string: macro(base.string), castOn: macro(base.castOn), castOff: macro(base.castOff) };
md.push('', '## Macro correct (mean of the two classes; gaps count as incorrect)', '', Object.entries(S.macro).map(([k, v]) => `${k} ${(100 * v).toFixed(1)}%`).join(' · '));
// bars on A1 (primary): reads off, mapping M1, default fold stop, earned tolerance
const sameP = pos.filter((r) => r.A1.verdict === 'same').length, sameN = neg.filter((r) => r.A1.verdict === 'same').length, difP = pos.filter((r) => r.A1.verdict === 'different').length, difN = neg.filter((r) => r.A1.verdict === 'different').length;
const J = (P, N, f) => P.filter((r) => f(r) === 'same').length / (P.length || 1) - N.filter((r) => f(r) === 'same').length / (N.length || 1);
const Jreal = J(pos, neg, CFG.A1);
const shufJ = Array.from({ length: R.seeds }, (_, s) => J(pos, neg, (r) => r.shuf[s].v));
const shufU = Array.from({ length: R.seeds }, (_, s) => pos.filter((r) => r.shuf[s].u).length / pos.length - neg.filter((r) => r.shuf[s].u).length / neg.length);
const Ureal = pos.filter((r) => r.A1.U).length / pos.length - neg.filter((r) => r.A1.U).length / neg.length;
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
S.control = { Jreal, shufJ, shufJmax: Math.max(...shufJ), shufJmean: mean(shufJ), Ureal, shufU, shufUmax: Math.max(...shufU), shufUmean: mean(shufU) };
const strP = pos.filter((r) => r.baseString === 'same'), strN = neg.filter((r) => r.baseString === 'same'), notP = pos.filter((r) => r.baseString !== 'same'), notN = neg.filter((r) => r.baseString !== 'same');
const Jstr = J(strP, strN, CFG.A1); const shufJstr = Array.from({ length: R.seeds }, (_, s) => J(strP, strN, (r) => r.shuf[s].v));
S.strata = { containsTrue: { pos: strP.length, neg: strN.length, Janus: Jstr, shufJmax: Math.max(...shufJstr), janusPos: count(strP, CFG.A1), janusNeg: count(strN, CFG.A1) }, containsFalse: { pos: notP.length, neg: notN.length, janusPos: count(notP, CFG.A1), janusNeg: count(notN, CFG.A1) } };
S.bars = {
  B1_negSame_le_10pct: { value: sameN / neg.length, pass: sameN / neg.length <= 0.10 },
  B2_posDifferent_le_10pct: { value: difP / pos.length, pass: difP / pos.length <= 0.10 },
  B3_correct_ge_80pct_each_class: { pos: sameP / pos.length, neg: difN / neg.length, pass: sameP / pos.length >= 0.8 && difN / neg.length >= 0.8 },
  B4_control_breaks_it: { Jreal, shufJmax: S.control.shufJmax, shufJmean: S.control.shufJmean, pass: Jreal > S.control.shufJmax && S.control.shufJmean <= 0.10 },
  B5_beyond_string_rule: { JwithinContainsTrue: Jstr, shufJmax: Math.max(...shufJstr), pass: Jstr >= 0.5 && Jstr > Math.max(...shufJstr) },
};
S.overall = Object.values(S.bars).every((b) => b.pass) ? 'PASS' : Object.values(S.bars).some((b) => b.pass) ? 'PARTIAL' : 'NEGATIVE';
md.push('', '## Primary (A1: reads off, M1, default fold stop, earned tolerance): bars', '', '| bar | value | pass |', '|---|---|---|');
md.push(`| B1 negatives called same ≤ 10% | ${share(sameN, neg.length)} | ${S.bars.B1_negSame_le_10pct.pass} |`, `| B2 positives called different ≤ 10% | ${share(difP, pos.length)} | ${S.bars.B2_posDifferent_le_10pct.pass} |`,
  `| B3 correct ≥ 80% in each class | pos ${share(sameP, pos.length)}; neg ${share(difN, neg.length)} | ${S.bars.B3_correct_ge_80pct_each_class.pass} |`,
  `| B4 shuffle breaks it (J real ${Jreal.toFixed(3)} > max shuffled ${S.control.shufJmax.toFixed(3)}; mean shuffled ${S.control.shufJmean.toFixed(3)} ≤ 0.10) | | ${S.bars.B4_control_breaks_it.pass} |`,
  `| B5 within the containment-true stratum (pos ${strP.length}, neg ${strN.length}) J ${Jstr.toFixed(3)} ≥ 0.5 and > max shuffled ${Math.max(...shufJstr).toFixed(3)} | | ${S.bars.B5_beyond_string_rule.pass} |`, '', `**Overall: ${S.overall}**`);
md.push('', `U-only (Uclose) discrimination J_U real ${Ureal.toFixed(3)}; shuffled max ${S.control.shufUmax.toFixed(3)}, mean ${S.control.shufUmean.toFixed(3)}.`);
// formula components on A1 (mapped pairs)
md.push('', '## Formula components on A1 (mapped pairs only)', '', '| class | mapped | Uclose | distinct | aligned | all three |', '|---|---|---|---|---|---|');
for (const [cn, arr] of [['pos', pos], ['neg', neg]]) { const m = arr.filter((r) => r.A1.formula); const f = (k) => m.filter((r) => r.A1.formula[k]).length; const c = { n: m.length, U: f('Uclose'), D: f('distinct'), L: f('aligned'), all: m.filter((r) => r.A1.verdict === 'same').length }; S.formula[cn] = c;
  md.push(`| ${cn} | ${c.n} | ${share(c.U, c.n)} | ${share(c.D, c.n)} | ${share(c.L, c.n)} | ${share(c.all, c.n)} |`); }
// size strata (A1)
const bin = (n) => (n === 0 ? '0' : n < 10 ? '1-9' : n < 50 ? '10-49' : '>=50');
md.push('', '## Verdict by size of the graph around the pair (min over the two names of edges within two hops; A1)', '', '| size | class | n | same | different | unmapped | Uclose |', '|---|---|---|---|---|---|---|');
for (const b of ['0', '1-9', '10-49', '>=50']) for (const [cn, arr] of [['pos', pos], ['neg', neg]]) { const m = arr.filter((r) => bin(r.size) === b); const c = count(m, CFG.A1); const u = m.filter((r) => r.A1.U).length; S.size[`${b}/${cn}`] = { n: m.length, ...c, Uclose: u };
  md.push(`| ${b} | ${cn} | ${m.length} | ${c.same ?? 0} | ${c.different ?? 0} | ${c.unmapped ?? 0} | ${u} |`); }
// per article
md.push('', '## Per article (reads off)', '', '| article | nodes | edges | max degree | hub share | pairs | unmapped (M1) | earned tolerance | fold null |', '|---|---|---|---|---|---|---|---|---|');
for (const a of R.articleStats) md.push(`| ${a.key.replace('spent-castgold-', '')} | ${a.nodes} | ${a.edges} | ${a.maxDegree} | ${a.hubShare.toFixed(2)} | ${a.pairs} | ${a.unmappedM1} | ${a.tolA.toFixed(3)} | ${a.foldNullA.toFixed(3)} |`);
S.firstNode = { pairs: rows.filter((r) => r.firstNode).length };
// failures: every positive not called same, every negative called same (A1), with the baselines beside
const line = (r) => `| ${r.cls} | ${r.key.replace('spent-castgold-', '')} | ${r.a} | ${r.b} | ${r.A1.verdict}${r.A1.formula ? ` (U ${+r.A1.formula.Uclose}, Δ ${+r.A1.formula.distinct}, λ ${+r.A1.formula.aligned})` : ''} | ${r.A2.verdict} | ${r.B1.uLevel ?? r.B1.verdict} | ${r.baseString} | ${r.baseCastOn} | ${r.size} |`;
md.push('', '## Every failure of A1 (positive not called same; negative called same)', '', '| class | article | a | b | A1 | A2 | B1 U-level | string | cast on | size |', '|---|---|---|---|---|---|---|---|---|---|');
const fails = rows.filter((r) => (r.cls === 'pos' && r.A1.verdict !== 'same') || (r.cls === 'neg' && r.A1.verdict === 'same')); S.failures.A1 = fails.length; for (const r of fails) md.push(line(r));
md.push('', `Pairs containing the alphabetically first node (kind-average artifact): ${S.firstNode.pairs}.`);
fs.writeFileSync(path.join(path.dirname(inFile), 'summary.md'), md.join('\n') + '\n'); console.log(JSON.stringify(S, null, 1));

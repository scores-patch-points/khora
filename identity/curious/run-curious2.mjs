// run-curious2.mjs — CURIOUS2-PREREG.md (sha256 353a868f…): C0–C6, V1, calibration, sensitivity.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SOURCES, STABLE, SHIFT_AT, T_DEFAULT, LOG_DIR, PHAROS, run, csOf, ladderAt, newHist, record, surprisalOf, learn, expectedS } from './curious2.mjs';
import { createHolograph } from '../../native/kernel/bayes-surprise.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KH = process.env.KHORA_DIR ?? path.resolve(HERE, '..', '..');   // the khora checkout root (identity/curious -> ..)
const { openDoor } = await import(pathToFileURL(path.join(KH, 'cli/pharos-door.mjs')).href);
const pools = JSON.parse(fs.readFileSync(path.join(HERE, 'passages.json'), 'utf8'));

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const binomGE = (k, n) => { let p = 0; for (let i = k; i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = (c * (n - j)) / (j + 1); p += c * 0.5 ** n; } return p; };
function ranks(v) { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); let i = 0; while (i < o.length) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; }
function spearman(a, b) { if (a.length < 4) return null; const ra = ranks(a), rb = ranks(b), ma = mean(ra), mb = mean(rb); let c = 0, va = 0, vb = 0; for (let i = 0; i < a.length; i++) { c += (ra[i] - ma) * (rb[i] - mb); va += (ra[i] - ma) ** 2; vb += (rb[i] - mb) ** 2; } return va && vb ? c / Math.sqrt(va * vb) : null; }

// ---- C0: does the Zenodotus context signal work on these passages? ---------------------------------------------------
const C0 = {};
for (const g of ['literature', 'government-legal', 'encyclopedic', 'academic']) { const cs = pools[g].map((p) => csOf(p.text, g)); C0[g] = { passages: cs.length, ownGenreBest: cs.filter((x) => x < 0).length / cs.length, tied: cs.filter((x) => x === 0).length / cs.length, median_cs: median(cs) }; }
const fp = pools.firstperson.map((p) => csOf(p.text, 'government-legal'));
const C0_shift = { passages: fp.length, fitsAnotherGenreBetter: fp.filter((x) => x > 0).length / fp.length, median_cs: median(fp) };

// ---- the runs ---------------------------------------------------------------------------------------------------------
const POLICIES = [['random', 0.95], ['roundrobin', 0.95], ['novelty', 0.95], ['curious', 0.99], ['curious', 0.95], ['curious', 0.90], ['curiousV1', 0.95]];
const key = (p, g) => `${p}@${g}`;
const R = {};
for (const [p, g] of POLICIES) { R[key(p, g)] = SEEDS.map((seed) => run({ policy: p, gamma: g, seed })); }

const shareTable = {};
for (const [p, g] of POLICIES) { const k = key(p, g); shareTable[k] = Object.fromEntries(SOURCES.map((n) => [n, +median(R[k].map((r) => r.share[n])).toFixed(3)])); }
const C1 = median(R['novelty@0.95'].map((r) => r.share.noise));
const cur = R['curious@0.95'];
const C2 = { noise: median(cur.map((r) => r.share.noise)), constant: median(cur.map((r) => r.share.constant)) };
const C3 = { curious: median(cur.map((r) => Math.max(...SOURCES.map((n) => Math.abs(r.share[n] - 1 / 6))))), M1: median(R['curiousV1@0.95'].map((r) => Math.max(...SOURCES.map((n) => Math.abs(r.share[n] - 1 / 6))))) };
const heldOf = (k) => R[k].map((r) => r.held);
const winsOver = (other) => { let w = 0, n = 0; cur.forEach((r, i) => { const o = R[other][i].held; if (r.held < o) w++; if (r.held !== o) n++; }); return { wins: w, n, p: binomGE(w, n) }; };
const C4 = { final_held_mean: Object.fromEntries(POLICIES.map(([p, g]) => [key(p, g), +mean(heldOf(key(p, g))).toFixed(4)])), vs_random: winsOver('random@0.95'), vs_roundrobin: winsOver('roundrobin@0.95') };
const revisits = cur.filter((r) => r.shift.within30), surp = revisits.filter((r) => r.shift.surprise), withCs = revisits.filter((r) => r.shift.cs != null);
const C5 = { seeds: cur.length, revisitWithin30: cur.filter((r) => r.shift.within30).length / cur.length, firstIsSurprise: revisits.length ? surp.length / revisits.length : null, csPositive: withCs.length ? withCs.filter((r) => r.shift.cs > 0).length / withCs.length : null, delays: cur.map((r) => r.shift.delay) };

// V1: does history-relative surprise track context?
const pool = [];
for (const k of ['random@0.95', 'roundrobin@0.95', 'curious@0.95']) for (const r of R[k]) for (const x of r.trace) if (x.cs != null && x.level != null) pool.push(x);
const V1 = { surprise: pool.filter((x) => x.level >= 1), usual: pool.filter((x) => x.level === 0) };
const V1r = { P_csPos_given_surprise: V1.surprise.filter((x) => x.cs > 0).length / V1.surprise.length, n_surprise: V1.surprise.length, P_csPos_given_usual: V1.usual.filter((x) => x.cs > 0).length / V1.usual.length, n_usual: V1.usual.length };
// calibration of the prediction E against the outcome S, per source
const calib = {};
for (const n of SOURCES) { const rs = cur.map((r) => { const t = r.trace.filter((x) => x.name === n && x.E != null); return spearman(t.map((x) => x.E), t.map((x) => x.S)); }).filter((x) => x != null); calib[n] = rs.length ? +median(rs).toFixed(3) : null; }

// ---- C6: the log is the record -----------------------------------------------------------------------------------------
const door = await openDoor({ pointer: path.join(HERE, 'pharos.json'), log: 'curious', dir: LOG_DIR, writer: 'curious-agent' });
if (!door.on) throw new Error('door off: ' + door.why);
door.declare('curious-prediction', 'DEF·Figure', 'the curious loop\'s expectation of how surprising its next encounter with a source will be (a model\'s expected surprisal), written BEFORE the reading');
door.declare('curious-outcome', 'EVA·Figure', 'what an encounter turned out to be: the surprisal it had, its place on the ladder relative to that source\'s own history; cites its prediction and the reading it read');
const log = {
  predict: ({ name, t, E, seed }) => door.weave({ cell: 'DEF·Figure', kind: 'curious-prediction', addr: `pred:s${seed}:t${t}`, body: { seed, tick: t, source: name, expectedS: E } }),
  outcome: (pred, row) => door.weave({ cell: 'EVA·Figure', kind: 'curious-outcome', addr: `out:s${row.seed}:t${row.t}`, body: { seed: row.seed, tick: row.t, source: row.name, S: row.S, expectedS: row.E, level: row.level, s: row.s, gap: row.gap }, of: [pred.id, row.readingId] }),
};
const logged = [1, 2, 3].map((seed) => run({ policy: 'curious', gamma: 0.95, seed, log }));
const deterministic = [1, 2, 3].every((seed, i) => JSON.stringify(logged[i].trace.map((x) => [x.t, x.name, x.S])) === JSON.stringify(cur[seed - 1].trace.map((x) => [x.t, x.name, x.S])));
const reader = PHAROS.open('curious', { dir: LOG_DIR, writer: 'curious-replayer', frame: false, format: 'phb' });
const fold = PHAROS.fold(reader);
const byId = new Map(fold.entries.map((e) => [e.id, e]));
const outcomes = fold.entries.filter((e) => e.kind === 'curious-outcome');
let checked = 0, bad = [];
for (const seed of [1, 2, 3]) {
  const rows = outcomes.filter((e) => e.body.seed === seed).sort((a, b) => a.body.tick - b.body.tick);
  const holo = Object.fromEntries(SOURCES.map((n) => [n, createHolograph({ alpha: 1, gamma: 1 })])), H = newHist();
  for (const e of rows) {
    const b = e.body, rd = e.of.map((id) => byId.get(id)).find((x) => x?.kind === 'text-reading');
    const facts = rd.body.rows.flatMap((r) => [['w', String(r.form).toLowerCase()], ['x', `${r.upos}|${r.deprel}`]]);
    const S = surprisalOf(holo[b.source], facts); learn(holo[b.source], facts);
    const lad = ladderAt(H, b.source, S, b.tick, 0.95); record(H, b.source, b.tick, S, lad);
    const pred = e.of.map((id) => byId.get(id)).find((x) => x?.kind === 'curious-prediction');
    const ok = S === b.S && lad.level === b.level && lad.s === b.s && lad.gap === b.gap && pred && pred.body.tick === b.tick && pred.at <= e.at;
    checked++; if (!ok) bad.push({ seed, tick: b.tick, logged: b.S, replay: S });
  }
}
const C6 = { deterministic, outcomesInLog: outcomes.length, predictionsInLog: fold.entries.filter((e) => e.kind === 'curious-prediction').length, checked, mismatches: bad.length, first: bad.slice(0, 3), logStatus: (({ entries, corrupt }) => ({ entries, corrupt }))(PHAROS.status(reader)) };

const verdict = {
  C0: Object.fromEntries(Object.entries(C0).map(([g, x]) => [g, x.ownGenreBest >= 0.8])),
  C1: C1 > 0.5, C2: C2.noise <= 1 / 6 && C2.constant <= 1 / 6, C3: C3.curious >= 0.03,
  C4: C4.vs_random.p < 0.05 && C4.vs_roundrobin.p < 0.05,
  C5: { revisit: C5.revisitWithin30 >= 0.9, surprise: (C5.firstIsSurprise ?? 0) >= 0.9, cs: (C5.csPositive ?? 0) >= 0.9 },
  C6: deterministic && bad.length === 0 && checked === 3 * T_DEFAULT, V1_predicted_direction: V1r.P_csPos_given_surprise > V1r.P_csPos_given_usual,
};
const out = { C0, C0_shift, shares_median: shareTable, C1_novelty_noise_share: C1, C2, C3, C4, C5, V1: V1r, calibration_spearman_E_vs_S: calib, C6, verdict };
fs.writeFileSync(path.join(HERE, 'curious2-results.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));

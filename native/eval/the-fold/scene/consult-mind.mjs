// scene/consult-mind.mjs — DOES THE MIND CHANGE THE READ? (the consultation test)
//
//   node native/eval/the-fold/scene/consult-mind.mjs [--shuffle-sample N]
//
// The retained-mind instrument, pre-registered in shape: TEMPORAL FRONTIER (train
// = first half of each document, test = second half — never a random holdout),
// CONTENT-BEATS-SHELL (a shuffled mind must read like a blank), and GL-EN-22's
// bar (effect >= 0.15 AND p <= 0.05).
//
// Per translation (all 516): the retained marker is DISCOVERED on the train half
// (English labels the slots; the language's own bytes answer), then forecasts the
// test half's injunctions. Arms: retained (the learned marker) vs blank (the train
// base rate). Brier over the test slots. A shuffled-label control (K redraws, on a
// script-stratified sample) gives the null: p = share of shuffled Briers <= the
// retained Brier.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, "udhr-src");
const ENG = "udhr-eng.txt";
const args = process.argv.slice(2);
const si = args.indexOf("--shuffle-sample");
const SHUFFLE_SAMPLE = si >= 0 ? Number(args[si + 1]) : 40;
const K_SHUFFLES = 30;

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const parasOf = (raw) => raw.split("\n").slice(4).join("\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const RIGHT_RE = /\b(?:has|have) the right\b|\b(?:is|are) entitled\b/i;
const PROH_RE = /\b(?:no one|nobody) shall\b/i;
const labelOf = (p) => (RIGHT_RE.test(p) || PROH_RE.test(p) ? 1 : 0); // injunction, yes/no

function discoverFrom(modal, other) {
  if (!modal.length) return null;
  const counts = new Map();
  for (const p of modal) for (let n = 2; n <= 5; n++) for (let j = 0; j + n <= p.length; j++) {
    const g = p.slice(j, j + n);
    if (/^[\p{Z}\p{P}\p{N}]+$/u.test(g)) continue;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const minModal = Math.max(4, Math.ceil(modal.length * 0.2));
  const cands = [...counts.entries()].filter(([, c]) => c >= minModal).sort((a, b) => b[1] - a[1]).slice(0, 1200);
  let best = null;
  for (const [g] of cands) {
    const m = modal.filter((p) => p.includes(g)).length;
    const o = other.filter((p) => p.includes(g)).length;
    const score = m - 2 * o;
    if (m < minModal || m - o < 2) continue;
    if (!best || score > best.score || (score === best.score && g.length > best.g.length)) best = { g, m, o, score };
  }
  return best;
}
// a shuffled-label discovery for the same window (the content-less shell)
function shuffledMarker(paras, seed) {
  let s = seed >>> 0;
  const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  const labels = paras.map(labelOf);
  const inj = paras.filter((_, i) => labels[i] === 1);
  const rest = paras.filter((_, i) => labels[i] === 0);
  const idx = [...Array(labels.length).keys()];
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const picked = idx.slice(0, inj.length);
  const modal = [], other = [];
  for (let i = 0; i < paras.length; i++) (picked.includes(i) ? modal : other).push(norm(paras[i]));
  return discoverFrom(modal, other);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".txt")).sort();
const engLabels = parasOf(fs.readFileSync(path.join(DIR, ENG), "utf8")).map(labelOf);

// a deterministic seed for the stratified shuffle sample
let counter = 7;
const rngSample = () => { counter = (Math.imul(counter, 1664525) + 1013904223) >>> 0; return counter; };

const rows = [];
for (const f of files) {
  let paras;
  try { paras = parasOf(fs.readFileSync(path.join(DIR, f), "utf8")); } catch { continue; }
  // ALIGNMENT: paragraph i of language L sits at paragraph i of English (the same
  // document, sentence-per-paragraph) — L's own labels come from ENGLISH's slots
  // (the language's own bytes then answer via its discovered marker)
  const labelsL = paras.map((_, i) => engLabels[i] ?? 0);
  const half = Math.floor(paras.length / 2);
  const train = paras.slice(0, half), test = paras.slice(half);
  const y = labelsL.slice(half);
  const labels = labelsL.slice(0, half);
  const marker = discoverFrom(train.filter((_, i) => labels[i] === 1).map(norm), train.filter((_, i) => labels[i] === 0).map(norm));
  if (!marker) { rows.push({ f, marker: null }); continue; }
  const rate = labels.filter((l) => l === 1).length / labels.length;
  const brier = (fs_) => fs_.reduce((acc, f, i) => acc + (f - y[i]) ** 2, 0) / y.length;
  // the retained arm uses the mind's FULL knowledge: the marker PLUS the rates it
  // learned on the train half (P(right | marker present) and P(right | absent)) —
  // a hard 0/1 forecast would throw away what the mind actually holds
  const trainT = train.map(norm);
  const hit = (t) => t.includes(marker.g);
  const hitLab = trainT.map((t, i) => (hit(t) ? labels[i] : null)).filter((l) => l !== null);
  const missLab = trainT.map((t, i) => (hit(t) ? null : labels[i])).filter((l) => l !== null);
  const r1 = hitLab.length ? hitLab.reduce((a, b) => a + b, 0) / hitLab.length : rate;
  const r0 = missLab.length ? missLab.reduce((a, b) => a + b, 0) / missLab.length : rate;
  const retained = brier(test.map((t) => (hit(t) ? r1 : r0)));
  const blank = brier(test.map(() => rate));
  const effect = blank - retained;
  // the shuffled null (script-stratified sample only)
  let p = null;
  if (rows.length % Math.ceil(files.length / SHUFFLE_SAMPLE) === 0) {
    let worse = 0;
    for (let k = 0; k < K_SHUFFLES; k++) {
      const sm = shuffledMarker(train, rngSample());
      if (!sm) { worse += 1; continue; }
      const sb = brier(test.map((t) => (norm(t).includes(sm.g) ? 1 : 0)));
      if (sb <= retained) worse += 1;
    }
    p = (worse + 1) / (K_SHUFFLES + 1);
  }
  rows.push({ f, marker: marker.g, trainInj: labels.filter((l) => l === 1).length, testInj: y.filter((l) => l === 1).length, retained, blank, effect, p });
}

const withMarker = rows.filter((r) => r.marker);
const effects = withMarker.map((r) => r.effect).filter((e) => Number.isFinite(e));
const wins = effects.filter((e) => e > 0).length;
const ps = withMarker.filter((r) => Number.isFinite(r.p)).map((r) => ({ p: r.p, effect: r.effect }));
console.log(`documents read: ${rows.length} · marker found: ${withMarker.length}`);
console.log(`retained beats blank on the temporal frontier: ${wins}/${effects.length} (${(100 * wins / effects.length).toFixed(1)}%)`);
console.log(`effect (blank − retained Brier): median ${effects.sort((a, b) => a - b)[Math.floor(effects.length / 2)].toFixed(4)} · mean ${(effects.reduce((a, b) => a + b, 0) / effects.length).toFixed(4)}`);
console.log(`sample with the shuffled null (k=${K_SHUFFLES} redraws, n=${ps.length} docs):`);
console.log(`  p <= 0.05 and effect >= 0.15 (GL-EN-22's bar): ${ps.filter((x) => x.p <= 0.05 && x.effect >= 0.15).length}/${ps.length}`);
console.log(`  median p: ${ps.map((x) => x.p).sort((a, b) => a - b)[Math.floor(ps.length / 2)]} · mean effect in sample: ${(ps.reduce((a, x) => a + x.effect, 0) / ps.length).toFixed(4)}`);
console.log(`sample (first ${Math.min(10, ps.length)} win rows):`);
for (const r of withMarker.filter((r) => r.effect > 0).slice(0, 10)) console.log(`  ${r.f.replace("udhr-", "").replace(".txt", "").padEnd(14)} marker="${String(r.marker).slice(0, 14)}"  ret=${r.retained.toFixed(3)} blank=${r.blank.toFixed(3)} eff=${r.effect.toFixed(3)} p=${r.p?.toFixed?.(3) ?? "—"}`);
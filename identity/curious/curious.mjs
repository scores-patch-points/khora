// curious.mjs — CURIOUS-PREREG.md (sha256 fd53b0d7…). The loop: predict, encounter, ladder, learn, choose by learning progress.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHolograph, predict, klAdmit } from '../../native/kernel/bayes-surprise.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BATCH = 25, HELD = 300, REAL = ['japanese', 'arabic', 'russian', 'french', 'hindi', 'swedish', 'latin', 'persian'];
export const SOURCES = [...REAL, 'constant', 'noise'];
const STREAMS = JSON.parse(fs.readFileSync(path.join(HERE, 'streams.json'), 'utf8'));

export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seedOf = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---- weighted order statistics, the ladder's unit (1.4826 x MAD), and the ladder itself (pure) -------------------------
const wmedian = (vals, ws) => { const idx = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]); const tot = ws.reduce((a, b) => a + b, 0); let acc = 0; for (const i of idx) { acc += ws[i]; if (acc >= tot / 2) return vals[i]; } return vals[idx.at(-1)]; };
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
function spread(vals, ws) { const m = wmedian(vals, ws); return { med: m, unit: 1.4826 * wmedian(vals.map((v) => Math.abs(v - m)), ws) }; }
const NEED = 5;
/** One level of the ladder over a source's earlier values (times ts), floored by the median unit of the other sources'. */
function level(vals, ts, t, g, others) {
  if (vals.length < NEED) return { gap: 'not enough reading yet' };
  const w = ts.map((tk) => g ** (t - tk)); const { med: m, unit } = spread(vals, w);
  const fl = med(others.filter((o) => o.vals.length >= NEED).map((o) => spread(o.vals, o.ts.map((tk) => g ** (t - tk))).unit)) ?? 0;
  const u = Math.max(unit, fl);
  return u > 0 ? { m, u } : { gap: 'collapsed unit' };
}
/** ladderAt(H, name, S, t, g): H maps source -> {t:[], S:[], s:[], s2:[]} of EARLIER encounters. Returns the new encounter's s, s2, s3 and level. */
export function ladderAt(H, name, S, t, g) {
  const h = H[name], others = Object.keys(H).filter((k) => k !== name);
  const L1 = level(h.S, h.t, t, g, others.map((k) => ({ vals: H[k].S, ts: H[k].t })));
  if (L1.gap) return { s: null, s2: null, s3: null, level: null, gap: L1.gap };
  const s = (S - L1.m) / L1.u; if (s < 1) return { s, s2: null, s3: null, level: 0, gap: null };
  const pick = (hh, key) => { const v = [], ts = []; hh[key].forEach((x, i) => { if (x != null && x >= 1) { v.push(x); ts.push(hh.t[i]); } }); return { vals: v, ts }; };
  const L2 = level(pick(h, 's').vals, pick(h, 's').ts, t, g, others.map((k) => pick(H[k], 's')));
  if (L2.gap) return { s, s2: null, s3: null, level: 1, gap: 'startle: ' + L2.gap };
  const s2 = (s - L2.m) / L2.u; if (s2 < 1) return { s, s2, s3: null, level: 1, gap: null };
  const L3 = level(pick(h, 's2').vals, pick(h, 's2').ts, t, g, others.map((k) => pick(H[k], 's2')));
  if (L3.gap) return { s, s2, s3: null, level: 2, gap: 'shock: ' + L3.gap };
  const s3 = (s2 - L3.m) / L3.u; return { s, s2, s3, level: s3 >= 1 ? 3 : 2, gap: null };
}
export const newHist = () => Object.fromEntries(SOURCES.map((n) => [n, { t: [], S: [], s: [], s2: [] }]));
export function record(H, name, t, S, lad) { const h = H[name]; h.t.push(t); h.S.push(S); h.s.push(lad.s); h.s2.push(lad.s2); }

// ---- the model: khora's holograph, per source -------------------------------------------------------------------------
const slotOf = (holo, s) => holo.slots.get(s) ?? new Map();
function surprisalOf(holo, batch) { let b = 0; for (const [s, v] of batch) b += predict(holo, s, v).bits; return b / batch.length; }
function learn(holo, batch) { let kl = 0; for (const [s, v] of batch) { const m = slotOf(holo, s); let N = 0; for (const c of m.values()) N += c; const K = m.size + (m.has(v) ? 0 : 1) + 1; kl += klAdmit((m.get(v) ?? 0) + holo.alpha, N + holo.alpha * K); m.set(v, (m.get(v) ?? 0) + 1); holo.slots.set(s, m); } return kl / Math.LN2 / batch.length; }
/** The expected surprisal of the next batch under the current model: slot-frequency-weighted predictive entropy. */
export function expectedS(holo) {
  let total = 0; const per = [];
  for (const [s, m] of holo.slots) { let N = 0; for (const c of m.values()) N += c; per.push([s, m, N]); total += N; }
  if (!total) return null;
  let e = 0;
  for (const [s, m, N] of per) {
    const Q = N + holo.alpha * (m.size + 1); let h = 0;
    for (const [v, c] of m) { const q = (c + holo.alpha) / Q; h += q * -Math.log2(q); }
    const qn = holo.alpha / Q; h += qn * predict(holo, s, '\u0000never').bits;
    e += (N / total) * h;
  }
  return e;
}

// ---- the world --------------------------------------------------------------------------------------------------------
export function makeWorld(seed) {
  const rng = mulberry32(seed), src = {};
  const build = (name, key) => {
    const r = mulberry32(seedOf(`${seed}:${name}`)); const persons = [...STREAMS[key]];
    for (let i = persons.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [persons[i], persons[j]] = [persons[j], persons[i]]; }
    const facts = persons.flat(); return { stream: facts.slice(0, facts.length - HELD), held: facts.slice(facts.length - HELD) };
  };
  for (const n of REAL) src[n] = { kind: 'real', ...build(n, n), pos: 0, holo: createHolograph({ alpha: 1, gamma: 1 }) };
  src.constant = { kind: 'constant', pos: 0, holo: createHolograph({ alpha: 1, gamma: 1 }) };
  src.noise = { kind: 'noise', pos: 0, holo: createHolograph({ alpha: 1, gamma: 1 }), rng: mulberry32(seedOf(`${seed}:noise`)) };
  const batch = (name) => {
    const s = src[name];
    if (s.kind === 'constant') return Array.from({ length: BATCH }, () => ['c', 'x']);
    if (s.kind === 'noise') return Array.from({ length: BATCH }, () => ['n', Array.from({ length: 12 }, () => Math.floor(s.rng() * 16).toString(16)).join('')]);
    const out = []; for (let i = 0; i < BATCH; i++) { out.push(s.stream[s.pos % s.stream.length]); s.pos++; } return out;
  };
  const shift = (from, key) => { const b = build(from, key); Object.assign(src[from], { stream: b.stream, held: b.held, pos: 0 }); };
  return { src, rng, batch, shift };
}
export const heldScore = (world) => REAL.reduce((a, n) => { const s = world.src[n]; return a + s.held.reduce((x, [sl, v]) => x + predict(s.holo, sl, v).bits, 0) / s.held.length; }, 0) / REAL.length;

// ---- the loop ---------------------------------------------------------------------------------------------------------
/** run({policy, gamma, seed, T, shiftAt, log}) -> { trace, share, held, shift }. policy: random | roundrobin | novelty | curious. */
export function run({ policy, gamma = 0.95, seed = 1, T = 300, shiftAt = 150, log = null }) {
  const W = makeWorld(seed), H = newHist(), trace = [], rew = Object.fromEntries(SOURCES.map((n) => [n, []]));
  let Smax = 1e-9, shifted = false;
  for (let t = 0; t < T; t++) {
    if (t === shiftAt) { W.shift('japanese', 'tamil'); shifted = true; }
    let name;
    if (policy !== 'random' && t < SOURCES.length) name = SOURCES[t];
    else if (policy === 'random') name = SOURCES[Math.floor(W.rng() * SOURCES.length)];
    else if (policy === 'roundrobin') name = SOURCES[t % SOURCES.length];
    else {
      const Ni = {}, mu = {}; let N = 0;
      for (const n of SOURCES) {
        const ts = H[n].t, w = ts.map((tk) => gamma ** (t - tk)), tot = w.reduce((a, b) => a + b, 0);
        Ni[n] = tot; N += tot;
        mu[n] = policy === 'novelty' ? (tot ? H[n].S.reduce((a, x, i) => a + w[i] * x, 0) / tot : 0) : (tot ? rew[n].reduce((a, x, i) => a + w[i] * x, 0) / tot : 0);
      }
      let best = -Infinity; name = SOURCES[0];
      for (const n of SOURCES) { const idx = policy === 'novelty' ? mu[n] : mu[n] + Math.sqrt(2 * Math.log(Math.max(N, Math.E)) / Math.max(Ni[n], 1e-12)); const jitter = W.rng() * 1e-9; if (idx + jitter > best) { best = idx + jitter; name = n; } }
    }
    const s = W.src[name], expected = expectedS(s.holo);
    const pred = log && log.predict({ name, t, expected, gamma });
    const batch = W.batch(name);
    const S = surprisalOf(s.holo, batch), bayes = learn(s.holo, batch);
    const lad = ladderAt(H, name, S, t, gamma);
    const h = H[name], w = h.t.map((tk) => gamma ** (t - tk)), tot = w.reduce((a, b) => a + b, 0);
    const ref = tot ? h.S.reduce((a, x, i) => a + w[i] * x, 0) / tot : S;
    Smax = Math.max(Smax, S); const lp = ref - S, r = Math.max(lp, 0) / Smax;
    record(H, name, t, S, lad); rew[name].push(r);
    const row = { t, name, S, expected, lp, r, bayes, ...lad }; trace.push(row);
    if (log) log.outcome(pred, { ...row, gamma });
  }
  const after = trace.filter((x) => x.t >= 30), share = Object.fromEntries(SOURCES.map((n) => [n, after.filter((x) => x.name === n).length / after.length]));
  const post = trace.filter((x) => x.name === 'japanese' && x.t >= shiftAt), first = post[0];
  return { trace, share, held: heldScore(W), shift: { revisited: !!first, delay: first ? first.t - shiftAt : null, within60: !!first && first.t - shiftAt <= 60, s: first?.s ?? null, level: first?.level ?? null, gap: first?.gap ?? null } };
}

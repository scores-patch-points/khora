// curious2.mjs — CURIOUS2-PREREG.md (sha256 353a868f…). The curious loop on khora's readings in the pharos log,
// with context from Zenodotus genre priors. Model: khora's holograph, unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHolograph, predict, klAdmit } from '../../native/kernel/bayes-surprise.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KH = process.env.KHORA_DIR ?? path.resolve(HERE, '..', '..');   // the khora checkout root (identity/curious -> ..)
export const PHAROS = await import(pathToFileURL(process.env.PHAROS_LIB ?? path.resolve(HERE, '..', '..', '..', 'pharos', 'lib', 'pharos.mjs')).href);
const { readingAddr } = await import(pathToFileURL(path.join(KH, 'native/organs/text-reading.mjs')).href);

export const SOURCES = ['literature', 'government-legal', 'encyclopedic', 'academic', 'noise', 'constant'];
export const STABLE = ['literature', 'encyclopedic', 'academic'];
export const HELD = 5;
export const SHIFT_AT = 75, T_DEFAULT = 150;
const GENRES = ['academic', 'encyclopedic', 'government-legal', 'literature'];
export const LOG_DIR = path.join(HERE, 'log');

export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seedOf = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---- data: passages, their readings from the log, and Zenodotus's genre priors ----------------------------------------
const pools = JSON.parse(fs.readFileSync(path.join(HERE, 'passages.json'), 'utf8'));
const reader = PHAROS.open('curious', { dir: LOG_DIR, writer: 'curious-reader', frame: false, format: 'phb' });
const readings = new Map(PHAROS.fold(reader, { kind: 'text-reading' }).entries.map((e) => [e.addr, e]));
const PRIORS = Object.fromEntries(GENRES.map((g) => [g, new Set(JSON.parse(fs.readFileSync(path.join(HERE, 'priors', `${g}.json`), 'utf8')).prior_terms.map((t) => t.term))]));
const tokens = (text) => (text.match(/\p{L}+/gu) ?? []).map((t) => t.toLowerCase()).filter((t) => t.length >= 4);
const fit = (text, g) => { const ts = tokens(text); return ts.length ? ts.filter((t) => PRIORS[g].has(t)).length / ts.length : 0; };
export const fitsOf = (text) => Object.fromEntries(GENRES.map((g) => [g, fit(text, g)]));
/** cs: how much better the passage fits another genre than the source's own. null for sources with no genre. */
export const csOf = (text, source) => { if (!GENRES.includes(source)) return null; const f = fitsOf(text); return Math.max(...GENRES.filter((g) => g !== source).map((g) => f[g])) - f[source]; };

const poolOf = (name) => (name === 'noise' ? pools.noise : name === 'constant' ? pools.constant : pools[name]);
const prepared = new Map();
export const factsFor = (p) => prep(p).facts;
function prep(p) {
  let x = prepared.get(p.text);
  if (!x) {
    const e = readings.get(readingAddr(p.text)); if (!e) throw new Error('no reading in the log for a passage');
    x = { text: p.text, doc: p.doc, readingId: e.id, readingAddr: e.addr, facts: e.body.rows.flatMap((r) => [['w', String(r.form).toLowerCase()], ['x', `${r.upos}|${r.deprel}`]]) };
    prepared.set(p.text, x);
  }
  return x;
}

// ---- the ladder (as in curious.mjs v1, with the unit returned) ---------------------------------------------------------
const wmedian = (vals, ws) => { const idx = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]); const tot = ws.reduce((a, b) => a + b, 0); let acc = 0; for (const i of idx) { acc += ws[i]; if (acc >= tot / 2) return vals[i]; } return vals[idx.at(-1)]; };
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
function spread(vals, ws) { const m = wmedian(vals, ws); return { med: m, unit: 1.4826 * wmedian(vals.map((v) => Math.abs(v - m)), ws) }; }
const NEED = 5;
function level(vals, ts, t, g, others) {
  if (vals.length < NEED) return { gap: 'not enough reading yet' };
  const w = ts.map((tk) => g ** (t - tk)); const { med: m, unit } = spread(vals, w);
  const fl = med(others.filter((o) => o.vals.length >= NEED).map((o) => spread(o.vals, o.ts.map((tk) => g ** (t - tk))).unit)) ?? 0;
  const u = Math.max(unit, fl);
  return u > 0 ? { m, u } : { gap: 'collapsed unit' };
}
export function ladderAt(H, name, S, t, g) {
  const h = H[name], others = Object.keys(H).filter((k) => k !== name);
  const L1 = level(h.S, h.t, t, g, others.map((k) => ({ vals: H[k].S, ts: H[k].t })));
  if (L1.gap) return { s: null, s2: null, s3: null, level: null, u: null, gap: L1.gap };
  const s = (S - L1.m) / L1.u; if (s < 1) return { s, s2: null, s3: null, level: 0, u: L1.u, gap: null };
  const pick = (hh, key) => { const v = [], ts = []; hh[key].forEach((x, i) => { if (x != null && x >= 1) { v.push(x); ts.push(hh.t[i]); } }); return { vals: v, ts }; };
  const L2 = level(pick(h, 's').vals, pick(h, 's').ts, t, g, others.map((k) => pick(H[k], 's')));
  if (L2.gap) return { s, s2: null, s3: null, level: 1, u: L1.u, gap: 'startle: ' + L2.gap };
  const s2 = (s - L2.m) / L2.u; if (s2 < 1) return { s, s2, s3: null, level: 1, u: L1.u, gap: null };
  const L3 = level(pick(h, 's2').vals, pick(h, 's2').ts, t, g, others.map((k) => pick(H[k], 's2')));
  if (L3.gap) return { s, s2, s3: null, level: 2, u: L1.u, gap: 'shock: ' + L3.gap };
  const s3 = (s2 - L3.m) / L3.u; return { s, s2, s3, level: s3 >= 1 ? 3 : 2, u: L1.u, gap: null };
}
export const newHist = () => Object.fromEntries(SOURCES.map((n) => [n, { t: [], S: [], s: [], s2: [] }]));
export function record(H, name, t, S, lad) { const h = H[name]; h.t.push(t); h.S.push(S); h.s.push(lad.s); h.s2.push(lad.s2); }

// ---- the model: khora's holograph ------------------------------------------------------------------------------------
const slotOf = (holo, s) => holo.slots.get(s) ?? new Map();
export const surprisalOf = (holo, facts) => { let b = 0; for (const [s, v] of facts) b += predict(holo, s, v).bits; return b / facts.length; };
export function learn(holo, facts) { for (const [s, v] of facts) { const m = slotOf(holo, s); m.set(v, (m.get(v) ?? 0) + 1); holo.slots.set(s, m); } }
export function expectedS(holo) {
  let total = 0; const per = [];
  for (const [s, m] of holo.slots) { let N = 0; for (const c of m.values()) N += c; per.push([s, m, N]); total += N; }
  if (!total) return null;
  let e = 0;
  for (const [s, m, N] of per) {
    const Q = N + holo.alpha * (m.size + 1); let h = 0;
    for (const [, c] of m) { const q = (c + holo.alpha) / Q; h += q * -Math.log2(q); }
    const qn = holo.alpha / Q; h += qn * predict(holo, s, '\u0000never').bits;
    e += (N / total) * h;
  }
  return e;
}

// ---- the world -------------------------------------------------------------------------------------------------------
const shuffled = (xs, rng) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export function makeWorld(seed) {
  const src = {};
  for (const name of SOURCES) {
    const order = shuffled(poolOf(name), mulberry32(seedOf(`${seed}:${name}`)));
    const held = STABLE.includes(name) ? order.slice(order.length - HELD) : [];
    src[name] = { stream: order.slice(0, order.length - held.length), held, pos: 0, holo: createHolograph({ alpha: 1, gamma: 1 }) };
  }
  const next = (name) => { const s = src[name]; const p = s.stream[s.pos % s.stream.length]; s.pos++; return prep(p); };
  const shift = () => { Object.assign(src['government-legal'], { stream: shuffled(pools.firstperson, mulberry32(seedOf(`${seed}:shift`))), pos: 0 }); };
  return { src, next, shift, rng: mulberry32(seed) };
}
export const heldScore = (W) => STABLE.reduce((a, n) => a + W.src[n].held.reduce((x, p) => x + surprisalOf(W.src[n].holo, prep(p).facts), 0) / W.src[n].held.length, 0) / STABLE.length;

// ---- the loop --------------------------------------------------------------------------------------------------------
const clip01 = (x) => Math.max(0, Math.min(1, x));
/** run({ policy, gamma, seed, T, log }). policy: random | roundrobin | novelty | curious | curiousV1. */
export function run({ policy, gamma = 0.95, seed = 1, T = T_DEFAULT, log = null }) {
  const W = makeWorld(seed), H = newHist(), trace = [], rew = Object.fromEntries(SOURCES.map((n) => [n, []]));
  let Smax = 1e-9;
  for (let t = 0; t < T; t++) {
    if (t === SHIFT_AT) W.shift();
    let name;
    if (policy !== 'random' && t < SOURCES.length) name = SOURCES[t];
    else if (policy === 'random') name = SOURCES[Math.floor(W.rng() * SOURCES.length)];
    else if (policy === 'roundrobin') name = SOURCES[t % SOURCES.length];
    else {
      const Ni = {}, mu = {}; let N = 0;
      for (const n of SOURCES) {
        const w = H[n].t.map((tk) => gamma ** (t - tk)), tot = w.reduce((a, b) => a + b, 0); Ni[n] = tot; N += tot;
        mu[n] = policy === 'novelty' ? (tot ? H[n].S.reduce((a, x, i) => a + w[i] * x, 0) / tot : 0) : (tot ? rew[n].reduce((a, x, i) => a + w[i] * x, 0) / tot : 0);
      }
      let best = -Infinity; name = SOURCES[0];
      for (const n of SOURCES) { const idx = policy === 'novelty' ? mu[n] : mu[n] + Math.sqrt(2 * Math.log(Math.max(N, Math.E)) / Math.max(Ni[n], 1e-12)); const j = W.rng() * 1e-9; if (idx + j > best) { best = idx + j; name = n; } }
    }
    const s = W.src[name], E = expectedS(s.holo), pred = log && log.predict({ name, t, E, seed });
    const p = W.next(name);
    const S = surprisalOf(s.holo, p.facts); learn(s.holo, p.facts);
    const lad = ladderAt(H, name, S, t, gamma);
    const h = H[name], w = h.t.map((tk) => gamma ** (t - tk)), tot = w.reduce((a, b) => a + b, 0);
    const ref = tot ? h.S.reduce((a, x, i) => a + w[i] * x, 0) / tot : null;
    Smax = Math.max(Smax, S);
    const lp = ref == null ? null : ref - S;
    const r = lp == null ? 0 : policy === 'curiousV1' ? Math.max(lp, 0) / Smax : (lad.u ? clip01(lp / lad.u) : 0);
    record(H, name, t, S, lad); rew[name].push(r);
    const row = { t, name, S, E, lp, r, cs: csOf(p.text, name), readingId: p.readingId, readingAddr: p.readingAddr, doc: p.doc, ...lad }; trace.push(row);
    if (log) log.outcome(pred, { ...row, seed });
  }
  const after = trace.filter((x) => x.t >= 20), share = Object.fromEntries(SOURCES.map((n) => [n, after.filter((x) => x.name === n).length / after.length]));
  const post = trace.filter((x) => x.name === 'government-legal' && x.t >= SHIFT_AT), first = post[0];
  return { trace, share, held: heldScore(W), shift: { revisited: !!first, delay: first ? first.t - SHIFT_AT : null, within30: !!first && first.t - SHIFT_AT <= 30, level: first?.level ?? null, surprise: first ? (first.level ?? 0) >= 1 : null, cs: first?.cs ?? null } };
}

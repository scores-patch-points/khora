// attend.mjs — a universal learner with learned attention (PREREG-ROUND5-NOTE-1.md). No task code in it.
//   rows:     [{ x: number[] (evidence vector), y: 0|1, g: group id }]
//   chan:     string[] — the named channel each feature belongs to
//   trainAttend(rows, chan, { gated, only, seed }) -> model { gate, w, b, mean, std, lam, tau, history }
//   score(model, x) -> logit
// Learned learning: the L2 strength is chosen by validation log-loss on held-out training GROUPS. Learned attention (pheromone): a channel's CREDIT is the validation log-loss it saves
// (loss with the channel zeroed minus loss with it present); tau_c <- RHO * tau_c + credit_c; a channel keeps gate 1 when tau_c exceeds the round's own robust unit (1.4826 x MAD of that round's credits), else it evaporates (gate 0)
// and stays out. Constants are declared once here and never tuned: lr 0.05, 150 epochs, lambda grid {0.001, 0.01, 0.1}, RHO 0.5, 3 rounds, validation = a quarter of the groups.
export const DECLARED = Object.freeze({ lr: 0.05, epochs: 150, lams: [0.001, 0.01, 0.1], RHO: 0.5, rounds: 3, valMod: 4 });
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const sig = (z) => 1 / (1 + Math.exp(-z));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : 0; };

function standardise(rows) { const D = rows[0].x.length, n = rows.length, mean = new Float64Array(D), std = new Float64Array(D); for (const r of rows) for (let j = 0; j < D; j++) mean[j] += r.x[j]; for (let j = 0; j < D; j++) mean[j] /= n; for (const r of rows) for (let j = 0; j < D; j++) std[j] += (r.x[j] - mean[j]) ** 2; for (let j = 0; j < D; j++) std[j] = Math.sqrt(std[j] / n) || 1; return { mean, std }; }
function flat(rows, mean, std) { const D = rows[0].x.length, X = new Float64Array(rows.length * D), Y = new Float64Array(rows.length); rows.forEach((r, i) => { for (let j = 0; j < D; j++) X[i * D + j] = (r.x[j] - mean[j]) / std[j]; Y[i] = r.y; }); return { X, Y, n: rows.length, D }; }
function fit(F, active, lam, { lr, epochs }) {
  const { X, Y, n, D } = F; const w = new Float64Array(D), m = new Float64Array(D), v = new Float64Array(D); let b = 0, mb = 0, vb = 0; const idx = []; for (let j = 0; j < D; j++) if (active[j]) idx.push(j);
  const g = new Float64Array(D);
  for (let t = 1; t <= epochs; t++) {
    g.fill(0); let gb = 0;
    for (let i = 0; i < n; i++) { let z = b; const o = i * D; for (const j of idx) z += w[j] * X[o + j]; const e = sig(z) - Y[i]; gb += e; for (const j of idx) g[j] += e * X[o + j]; }
    gb /= n; const c1 = 1 - 0.9 ** t, c2 = 1 - 0.999 ** t;
    for (const j of idx) { const gj = g[j] / n + lam * w[j]; m[j] = 0.9 * m[j] + 0.1 * gj; v[j] = 0.999 * v[j] + 0.001 * gj * gj; w[j] -= lr * (m[j] / c1) / (Math.sqrt(v[j] / c2) + 1e-8); }
    mb = 0.9 * mb + 0.1 * gb; vb = 0.999 * vb + 0.001 * gb * gb; b -= lr * (mb / c1) / (Math.sqrt(vb / c2) + 1e-8);
  }
  return { w, b };
}
function logloss(F, w, b, active) { const { X, Y, n, D } = F; let s = 0; for (let i = 0; i < n; i++) { let z = b; const o = i * D; for (let j = 0; j < D; j++) if (active[j]) z += w[j] * X[o + j]; const p = Math.min(1 - 1e-9, Math.max(1e-9, sig(z))); s -= Y[i] ? Math.log(p) : Math.log(1 - p); } return s / n; }

export function trainAttend(rows, chan, { gated = true, only = null, lams = DECLARED.lams } = {}) {
  const D = chan.length; const channels = [...new Set(chan)]; const { mean, std } = standardise(rows);
  let gate = new Map(channels.map((c) => [c, only ? (only.includes(c) ? 1 : 0) : 1]));
  const act = () => Float64Array.from(chan, (c) => gate.get(c)); const history = [];
  const groups = [...new Set(rows.map((r) => r.g))]; const split = (k) => { const val = new Set(groups.filter((g) => hash(g) % DECLARED.valMod === k % DECLARED.valMod)); return [rows.filter((r) => !val.has(r.g)), rows.filter((r) => val.has(r.g))]; };
  // learned learning: lambda by validation on held-out groups
  let lam = lams[1]; { const [tr, va] = split(0); if (tr.length && va.length && va.some((r) => r.y) && groups.length >= 4) { const Ft = flat(tr, mean, std), Fv = flat(va, mean, std); let best = Infinity; for (const l of lams) { const mdl = fit(Ft, act(), l, DECLARED); const L = logloss(Fv, mdl.w, mdl.b, act()); history.push({ lam: l, valLoss: +L.toFixed(5) }); if (L < best) { best = L; lam = l; } } } }
  const tau = new Map(channels.map((c) => [c, 0]));
  if (gated && !only) for (let r = 0; r < DECLARED.rounds; r++) {
    const [tr, va] = split(r + 1); if (!tr.length || !va.length || !va.some((x) => x.y)) break; const Ft = flat(tr, mean, std), Fv = flat(va, mean, std); const a = act(); const mdl = fit(Ft, a, lam, DECLARED); const base = logloss(Fv, mdl.w, mdl.b, a);
    const credit = new Map(); for (const c of channels) { if (!gate.get(c)) continue; const a2 = Float64Array.from(a); chan.forEach((cc, j) => { if (cc === c) a2[j] = 0; }); credit.set(c, logloss(Fv, mdl.w, mdl.b, a2) - base); }
    const cv = [...credit.values()]; const med = median(cv), unit = 1.4826 * median(cv.map((x) => Math.abs(x - med)));
    for (const [c, cr] of credit) { const t = DECLARED.RHO * tau.get(c) + cr; tau.set(c, t); if (!(t > unit)) gate.set(c, 0); }
    history.push({ round: r, unit: +unit.toFixed(5), kept: [...gate].filter(([, v]) => v).map(([c]) => c) });
    if (![...gate.values()].some((v) => v)) { for (const c of channels) gate.set(c, 1); break; }   // never evaporate everything
  }
  const F = flat(rows, mean, std), a = act(); const mdl = fit(F, a, lam, DECLARED);
  return { gate: Object.fromEntries(gate), w: mdl.w, b: mdl.b, mean, std, lam, tau: Object.fromEntries(tau), history, chan, active: a };
}
export function score(model, x) { let z = model.b; for (let j = 0; j < x.length; j++) if (model.active[j]) z += model.w[j] * ((x[j] - model.mean[j]) / model.std[j]); return z; }
export function auc(scores, ys) { const idx = scores.map((s, i) => i).sort((a, b) => scores[a] - scores[b]); const r = new Float64Array(scores.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && scores[idx[j + 1]] === scores[idx[i]]) j++; for (let k = i; k <= j; k++) r[idx[k]] = (i + j) / 2 + 1; i = j + 1; } let np = 0, sp = 0; ys.forEach((y, k) => { if (y) { np++; sp += r[k]; } }); const nn = ys.length - np; return np && nn ? (sp - np * (np + 1) / 2) / (np * nn) : null; }
export const seeded = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

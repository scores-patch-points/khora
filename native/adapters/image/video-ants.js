// video-ants.js — MANY WAYS TO TELL SIGNAL FROM NOISE IN VIDEO, SWARMED. Black and white only (luminance), on purpose: motion is
// carried by luminance (in people the fast magnocellular path is nearly colour-blind, and motion defined by colour alone looks slowed).
//
// Each ANT is an instrument with its own MECHANISM. Given two frames and the camera's own motion (the affine ground, motion.js), it gives
// every 5x5 block a score for "something here is not going along with the ground":
//   match    correlation search: the block's displacement is real (beats the unrelated-frame null) and differs from the ground's by >= 1 px
//   residue  differencing: what is left of the block after the next frame is pulled back by the ground (mean absolute difference)
//   edges    contour: the share of the block's edges that do NOT land on an edge of the next frame when carried by the ground
//   blur     pursuit: the eye that tracks the ground averages the two frames along the ground's motion; whatever moves on its own BLURS
//            in that average. Score = the share of the block's gradient energy lost in the pursued average. (Why people see motion blur:
//            the eye integrates over ~100 ms; what the eye tracks stays sharp, what moves against it smears. Blur is the trace of
//            integration, and so is a signal of relative motion.)
//
// INTEGRATION OVER TIME (continuity is the pattern). An ant's score at a place is summed over the window. The NULL scatters each pair's
// scores over the grid (each pair's field shuffled across blocks, `draws` times): it keeps how much each pair scored and destroys WHERE,
// so only a place that scores pair after pair beats it. The scatter stays within blocks of like texture (deciles). Each ant flags the blocks above the null's 99th percentile.
//
// THE SWARM. Ants are believed about nothing alone (signal.js): a block is SIGNAL only when it is flagged by more ants than chance
// co-location allows — the null scatters each ant's flags independently over the grid and takes the 99th percentile of the count — AND by
// at least two ants of DIFFERENT mechanisms. Adding ants raises the bar (the null of the count grows with them), never lowers it.
// Everything else is NOISE (NUL ∅) for this perceiver.
import { decodeFrames, affineGround } from "./motion.js";
import { execFileSync } from "node:child_process";
import { continuity, agree, startle } from "../../kernel/earning.js";

const B = 5, R = 4;
const pct = (xs, q) => { const s = Float64Array.from(xs).sort(); return s.length ? s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] : 0; };
const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const sample = (F, w, h, x, y) => { x = Math.max(0, Math.min(w - 1.001, x)); y = Math.max(0, Math.min(h - 1.001, y)); const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, i = y0 * w + x0; return F[i] * (1 - fx) * (1 - fy) + F[i + 1] * fx * (1 - fy) + F[i + w] * (1 - fx) * fy + F[i + w + 1] * fx * fy; };
const sad = (A, Bf, w, h, bx, by, dx, dy) => { let s = 0, n = 0; for (let y = by; y < by + B; y++) for (let x = bx; x < bx + B; x++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; s += Math.abs(A[y * w + x] - Bf[Y * w + X]); n++; } return n ? s / n : Infinity; };
function match(A, Bf, w, h) {
  const out = [];
  for (let by = R; by + B + R <= h; by += B) for (let bx = R; bx + B + R <= w; bx += B) {
    let best = Infinity, bdx = 0, bdy = 0; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const s = sad(A, Bf, w, h, bx, by, dx, dy); if (s < best || (s === best && Math.abs(dx) + Math.abs(dy) < Math.abs(bdx) + Math.abs(bdy))) { best = s; bdx = dx; bdy = dy; } }
    out.push({ bx, by, dx: bdx, dy: bdy, err: best, still: sad(A, Bf, w, h, bx, by, 0, 0) });
  }
  return out;
}
const grad = (F, w, h) => { const G = new Float64Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = F[i - w + 1] + 2 * F[i + 1] + F[i + w + 1] - F[i - w - 1] - 2 * F[i - 1] - F[i + w - 1], gy = F[i + w - 1] + 2 * F[i + w] + F[i + w + 1] - F[i - w - 1] - 2 * F[i - w] - F[i - w + 1]; G[i] = Math.hypot(gx, gy); } return G; };
// an EDGE is a gradient stronger than the same frame's intensities arranged at random would give (99th percentile of the shuffled frame's gradients)
function edgeMap(F, w, h, rnd) { const G = grad(F, w, h), S = Float64Array.from(F); for (let i = S.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [S[i], S[j]] = [S[j], S[i]]; } const ceil = pct(grad(S, w, h), 0.99), E = new Uint8Array(w * h); for (let i = 0; i < E.length; i++) E[i] = G[i] > ceil ? 1 : 0; return { E, G, ceil }; }

export const MECHANISMS = Object.freeze({ match: "correlation search", residue: "differencing", edges: "contour", blur: "pursuit integration" });

/** antsPair(A, Bf, unrelated, w, h, rnd) → per-block scores of each ant for one frame pair, and the fitted ground */
export function antsPair(A, Bf, unrelated, w, h, rnd) {
  const blocks = match(A, Bf, w, h), nul = match(A, unrelated, w, h), ratio = (b) => (b.still > 0 ? b.err / b.still : 1), ceil = pct(nul.map(ratio), 0.01), G = affineGround(blocks);
  const gAt = (x, y) => G.at({ bx: x, by: y });
  // the next frame pulled back along the ground: W[x,y] = Bf[(x,y) + ground(x,y)]
  const Wp = new Float64Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [gx, gy] = gAt(x, y); Wp[y * w + x] = sample(Bf, w, h, x + gx, y + gy); }
  const eA = edgeMap(A, w, h, rnd), eW = edgeMap(Wp, w, h, rnd), avg = new Float64Array(w * h); for (let i = 0; i < avg.length; i++) avg[i] = (A[i] + Wp[i]) / 2;
  const gAvg = grad(avg, w, h), gW = grad(Wp, w, h);
  const near = (E, x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && E[Y * w + X]) return true; } return false; };
  const score = { match: [], residue: [], edges: [], blur: [] };
  for (const b of blocks) {
    const [gx, gy] = gAt(b.bx + 2, b.by + 2), rel = Math.hypot(b.dx - gx, b.dy - gy);
    score.match.push(b.still > 0 && ratio(b) < ceil && rel >= 1 ? rel : 0);
    let res = 0, ne = 0, broken = 0, eIn = 0, eOut = 0;
    for (let y = b.by; y < b.by + B; y++) for (let x = b.bx; x < b.bx + B; x++) { const i = y * w + x; res += Math.abs(A[i] - Wp[i]); if (eA.E[i]) { ne++; if (!near(eW.E, x, y)) broken++; } eIn += (eA.G[i] ** 2 + gW[i] ** 2) / 2; eOut += gAvg[i] ** 2; }
    score.residue.push(res / (B * B)); score.edges.push(ne ? broken / ne : 0); score.blur.push(eIn > 0 ? Math.max(0, 1 - eOut / eIn) : 0);
  }
  const texture = blocks.map((b) => { let e = 0; for (let y = b.by; y < b.by + B; y++) for (let x = b.bx; x < b.bx + B; x++) e += eA.G[y * w + x] ** 2; return e / (B * B); });
  return { blocks: blocks.map((b) => ({ bx: b.bx, by: b.by })), score, texture, ground: G.params, edgeCeil: +eA.ceil.toFixed(1) };
}

/** swarmVideo(file, { t, pairs, step, draws, seed, ants }) → each ant's integrated flags, the swarm's signal blocks and figures, with every null */
export function swarmVideo(file, { t = 0, pairs = 10, step = 0.2, draws = 200, seed = 20261105, ants = Object.keys(MECHANISMS) } = {}) {
  const { frames, w, h } = decodeFrames(file, { t, n: pairs + 1, step });
  if (frames.length < 3) return { gap: "too_few_frames", detail: `${frames.length} decoded at t=${t}` };
  const dur = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();
  const unrelated = decodeFrames(file, { t: (t + dur / 2) % Math.max(1, dur - 1), n: 1, step }).frames[0], rnd = lcg(seed);
  const per = []; for (let k = 0; k + 1 < frames.length; k++) per.push(antsPair(frames[k], frames[k + 1], unrelated, w, h, rnd));
  const blocks = per[0].blocks, nB = blocks.length, P = per.length, flags = {}, report = {};
  // STRATA: blocks of like TEXTURE (deciles of the first frame's gradient energy). Noise does not hit every place alike — it costs a smooth
  // block's sharpness more than a busy one's — so the scatter null moves a score only among blocks of the same texture decile.
  const tex = per[0].texture, cuts = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((q) => pct(tex, q)), stratum = tex.map((v) => cuts.filter((c) => v > c).length);
  const lasting = {};
  for (const a of ants) {
    const c = continuity(per.map((p) => p.score[a]), { strata: stratum, stratumName: "texture deciles", draws, q: 0.99, seed: seed + a.length });
    flags[a] = c.flags; lasting[a] = c.null.text;
    report[a] = { mechanism: MECHANISMS[a], ceiling: +Math.max(...Object.values(c.ceilings)).toFixed(3), flagged: c.flags.reduce((x, y) => x + y, 0) };
  }
  const at = new Map(blocks.map((b, i) => [`${b.bx},${b.by}`, i]));
  // STARTLES (kernel startle): per ant, what neither the past's dynamics (DMD) nor persistence predicted; a block startles at a moment when
  // >= 2 mechanisms are startled there. A moment where most of the field startles at once is a CUT (the whole world changed), not a figure.
  const st = Object.fromEntries(ants.map((a) => [a, startle(per.map((p) => p.score[a]), { strata: stratum })]));
  const startles = st[ants[0]].moments.map((m0, k) => { const by = new Map(); for (const a of ants) for (const i of st[a].moments[k].startled) { if (!by.has(i)) by.set(i, new Set()); by.get(i).add(MECHANISMS[a]); } const items = [...by].filter(([, ms]) => ms.size >= 2).map(([i]) => i); const wholeBy = ants.filter((a) => st[a].moments[k].whole).map((a) => MECHANISMS[a]); return { at: m0.at, whole: new Set(wholeBy).size >= 2, blocks: items.length, share: +(items.length / nB).toFixed(3), items }; });
  // the swarm (kernel/earning.js agree): more ants than chance co-location allows, of >= 2 mechanisms
  const ag = agree(ants.map((a) => ({ name: a, mechanism: MECHANISMS[a], flags: flags[a] })), { draws, q: 0.99, seed: seed + 1, neighbors: (i) => { const b = blocks[i], out = []; for (const [dx, dy] of [[B, 0], [-B, 0], [0, B], [0, -B]]) { const j = at.get(`${b.bx + dx},${b.by + dy}`); if (j != null) out.push(j); } return out; } }), need = ag.need, signal = ag.items;
  // CON: touching signal blocks form one figure (>= 2 blocks)
  const key = (i) => `${blocks[i].bx},${blocks[i].by}`, idx = new Map(signal.map((i) => [key(i), i])), parent = new Map(signal.map((i) => [i, i])), find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  for (const i of signal) for (const [dx, dy] of [[B, 0], [0, B], [B, B], [B, -B]]) { const j = idx.get(`${blocks[i].bx + dx},${blocks[i].by + dy}`); if (j != null) { const a = find(i), b = find(j); if (a !== b) parent.set(b, a); } }
  const groups = new Map(); for (const i of signal) { const g = find(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); }
  const figures = [...groups.values()].filter((g) => g.length >= 2).map((g) => { const xs = g.map((i) => blocks[i].bx), ys = g.map((i) => blocks[i].by); return { blocks: g.length, box: { x: Math.min(...xs) / w, y: Math.min(...ys) / h, w: (Math.max(...xs) - Math.min(...xs) + B) / w, h: (Math.max(...ys) - Math.min(...ys) + B) / h }, ids: g }; }).sort((a, b) => b.blocks - a.blocks);
  return { t, pairs: P, step, size: { w, h }, ants: report, startles: startles.map(({ items, ...r }) => r), startleItems: startles, swarm: { need, regionCeiling: ag.regionCeiling, regions: ag.regions, null: ag.null.text, continuity: lasting }, signalBlocks: signal.length, noiseBlocks: nB - signal.length, figures, blocks, flags: Object.fromEntries(ants.map((a) => [a, Array.from(flags[a])])), signal, ground: per.map((p) => p.ground) };
}

// adapters/image/motion.js — COMMON FATE: what moves together is one thing (the infant's strongest cue, Spelke). Bottom-up, no model, nulls measured.
//
// From a few frames of a clip, read at the seer's grid:
//   SIG over time   each 5x5 block's displacement to the next frame by block matching (search radius 4). A displacement is REAL when searching for
//                   it removes more of the no-motion error (as a RATIO, best/still) than the same search reaches against an UNRELATED frame of the same
//                   clip (1st pct). Two earlier nulls failed: the unrelated frame's best error (degenerate on static scenes) and absolute improvement
//                   (it scales with the error's size, so chance against an unrelated frame "improved" more than a true motion did).
//   Ground motion   the camera's own: the median displacement of ALL blocks (most of a field is ground; a moving figure must not set it). It is
//                   subtracted, so what remains is motion RELATIVE TO THE GROUND; a block MOVES when that is at least one pixel (the matcher's resolution).
//   CON (fate)      regions of the seer's proto-objects whose mean relative motion is real (beyond the NOISE FLOOR of the same pair: the 99th
//                   percentile of |relative motion| over the blocks that did NOT beat the null — by definition what noise displaces) and whose
//                   motions agree (their difference within the matcher's own resolution, one pixel, or within either's own spread) join one
//                   MOVING GROUP: a figure against its ground.
//   INS over time   a moving group EXISTS when, carried forward by its own motion, it overlaps a moving group of the next frame pair beyond its own
//                   null (its overlap after random shifts) — found again where its motion says it should be.
// Nothing here names anything.
import { execFileSync } from "node:child_process";
import { SEER } from "./seer.js";

const B = 5, R = 4;
export function decodeFrames(file, { t = 0, n = 4, step = 0.2, w = SEER.width, h = SEER.height } = {}) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-ss", String(t), "-i", file, "-vf", `fps=${1 / step},scale=${w}:${h}:flags=area`, "-frames:v", String(n), "-pix_fmt", "gray", "-f", "rawvideo", "pipe:1"], { maxBuffer: 1 << 27 });
  const out = []; for (let i = 0; i + w * h <= raw.length; i += w * h) out.push(Float64Array.from(raw.subarray(i, i + w * h)));
  return { frames: out, w, h };
}
const sad = (A, Bf, w, h, bx, by, dx, dy) => { let s = 0, n = 0; for (let y = by; y < by + B; y++) for (let x = bx; x < bx + B; x++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; s += Math.abs(A[y * w + x] - Bf[Y * w + X]); n++; } return n ? s / n : Infinity; };
function match(A, Bf, w, h) {
  const out = [];
  for (let by = R; by + B + R <= h; by += B) for (let bx = R; bx + B + R <= w; bx += B) {
    let best = Infinity, bdx = 0, bdy = 0; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const s = sad(A, Bf, w, h, bx, by, dx, dy); if (s < best || (s === best && Math.abs(dx) + Math.abs(dy) < Math.abs(bdx) + Math.abs(bdy))) { best = s; bdx = dx; bdy = dy; } }
    const still = sad(A, Bf, w, h, bx, by, 0, 0);
    out.push({ bx, by, dx: bdx, dy: bdy, err: best, still });
  }
  return out;
}
const pct = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] : 0; };
const median = (xs) => pct(xs, 0.5);

/** flowPair(A, Bf, unrelated) → blocks with REAL displacement (beating the unrelated-frame null), the ground (camera) motion, and relative motion */
export function flowPair(A, Bf, unrelated, w, h) {
  // a displacement is REAL when searching for it improves the match (still error − best error) more than the same search improves a match against an
  // UNRELATED frame by chance (99th percentile). A static block improves by nothing and is not moving; a moving block improves a great deal.
  // measured as a RATIO — the share of the no-motion error the best displacement leaves (err / still): absolute improvement scales with how large
  // the error was, so against an unrelated frame chance alone "improves" a lot. A block is real when its ratio is below the 1st percentile of the
  // ratios the same search reaches against an unrelated frame. A static block has no error to remove (still = 0) and is not moving.
  const ratio = (b) => (b.still > 0 ? b.err / b.still : 1);
  const real = match(A, Bf, w, h), nul = match(A, unrelated, w, h), ceiling = pct(nul.map(ratio), 0.01);
  const blocks = real.map((b) => ({ ...b, real: b.still > 0 && ratio(b) < ceiling }));
  // the GROUND (camera) motion: the median displacement of ALL blocks — most of a field is ground; a moving figure must not set it
  const gdx = median(blocks.map((b) => b.dx)), gdy = median(blocks.map((b) => b.dy));
  for (const b of blocks) { b.rx = b.dx - gdx; b.ry = b.dy - gdy; b.moving = b.real && Math.hypot(b.rx, b.ry) >= 1; }   // >= 1: the matcher resolves one pixel
  return { blocks, ground: { dx: gdx, dy: gdy }, null: { kind: "the share of the no-motion error the best displacement leaves, against an unrelated frame of the same clip", q: 0.01, ceiling: +ceiling.toFixed(2) }, realShare: +(blocks.filter((b) => b.real).length / blocks.length).toFixed(3), movingShare: +(blocks.filter((b) => b.moving).length / blocks.length).toFixed(3) };
}
/** fate(label, count, blocks, w, h) → MOVING GROUPS, block-level first: moving blocks that touch (in the block grid) and whose relative motions agree
 *  within the matcher's one-pixel resolution form one group; a seer region then joins a group only when MOST of its own blocks move with that group
 *  (so a figure takes its shape from the proto-objects' edges, but only where the motion fills them — a few moving blocks inside a large region no
 *  longer make the whole region a figure). Groups of a single block are kept here and left to persistence to keep or drop. */
export function fate(label, count, blocks, w, h) {
  const key = (b) => `${b.bx},${b.by}`, at = new Map(blocks.map((b) => [key(b), b])), mv = blocks.filter((b) => b.moving);
  const parent = new Map(mv.map((b) => [key(b), key(b)])), find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  for (const b of mv) for (const [dx, dy] of [[5, 0], [0, 5]]) { const o = at.get(`${b.bx + dx},${b.by + dy}`); if (o?.moving && Math.hypot(b.rx - o.rx, b.ry - o.ry) <= 1) { const a = find(key(b)), c = find(key(o)); if (a !== c) parent.set(c, a); } }
  const comp = new Map(); for (const b of mv) { const g = find(key(b)); if (!comp.has(g)) comp.set(g, []); comp.get(g).push(b); }
  // each seer region's blocks, to let a region join a group only by majority
  const regionBlocks = new Map(); for (const b of blocks) { const r = label[(b.by + 2) * w + b.bx + 2]; if (!regionBlocks.has(r)) regionBlocks.set(r, []); regionBlocks.get(r).push(b); }
  const regionCells = new Map(); for (let i = 0; i < w * h; i++) { const r = label[i]; if (!regionCells.has(r)) regionCells.set(r, []); regionCells.get(r).push(i); }
  return [...comp.values()].map((bs) => {
    const ids = new Set(bs.map(key)), cells = new Set(); for (const b of bs) for (let y = b.by; y < b.by + 5; y++) for (let x = b.bx; x < b.bx + 5; x++) cells.add(y * w + x);
    for (const [r, rb] of regionBlocks) { const inGroup = rb.filter((b) => ids.has(key(b))).length; if (inGroup * 2 > rb.length) for (const c of regionCells.get(r)) cells.add(c); }
    const mx = bs.reduce((a, b) => a + b.rx, 0) / bs.length, my = bs.reduce((a, b) => a + b.ry, 0) / bs.length, all = [...cells];
    return { cells: all, blocks: bs.length, motion: { dx: +mx.toFixed(2), dy: +my.toFixed(2) }, area: all.length / (w * h) };
  });
}

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { see } from "./seer.js";
/** seeVideo(file, { t, step, habit, duration }) → figures: proto-objects that move together against the ground and are found again in the next pair */
export function seeVideo(file, { t = 0, step = 0.2, habit = null, duration = null } = {}) {
  const { frames, w, h } = decodeFrames(file, { t, n: 3, step });
  if (frames.length < 3) return { gap: "too_few_frames", detail: `${frames.length} decoded at t=${t}` };
  const dur = duration ?? +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();
  const far = (t + dur / 2) % Math.max(1, dur - 1), unrelated = decodeFrames(file, { t: far, n: 1, step }).frames[0];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "khora-motion-")), png = (k) => { const f = path.join(tmp, `f${k}.png`); execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(t + k * step), "-i", file, "-frames:v", "1", f]); return f; };
  const s0 = see(png(0), { habit, masks: true }), s1 = see(png(1), { habit, masks: true });
  fs.rmSync(tmp, { recursive: true, force: true });
  const pairs = [flowPair(frames[0], frames[1], unrelated, w, h), flowPair(frames[1], frames[2], unrelated, w, h)];
  const count = (m) => m.reduce((a, b) => Math.max(a, b), 0) + 1;
  const g0 = fate(s0.mask, count(s0.mask), pairs[0].blocks, w, h), g1 = fate(s1.mask, count(s1.mask), pairs[1].blocks, w, h);
  const iou = (A, Bc) => { const S = new Set(A); let i = 0; for (const c of Bc) if (S.has(c)) i++; return i / (A.length + Bc.length - i); };
  const shift = (cells, dx, dy) => cells.map((c) => { const x = (c % w) + dx, y = Math.floor(c / w) + dy; return x >= 0 && y >= 0 && x < w && y < h ? y * w + x : -1; }).filter((c) => c >= 0);
  const best = (cells) => g1.reduce((m, g) => Math.max(m, iou(cells, g.cells)), 0);
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const figures = g0.map((g) => { const carried = shift(g.cells, Math.round(g.motion.dx + pairs[0].ground.dx), Math.round(g.motion.dy + pairs[0].ground.dy)), real = best(carried), own = []; for (let k = 0; k < 5; k++) own.push(best(shift(g.cells, 1 + Math.floor(rnd() * (w - 1)) - Math.floor(w / 2), 1 + Math.floor(rnd() * (h - 1)) - Math.floor(h / 2)))); const ceil = Math.max(...own); const xs = g.cells.map((c) => c % w), ys = g.cells.map((c) => Math.floor(c / w)); return { area: +g.area.toFixed(4), blocks: g.blocks, motion: g.motion, box: { x: Math.min(...xs) / w, y: Math.min(...ys) / h, w: (Math.max(...xs) - Math.min(...xs) + 1) / w, h: (Math.max(...ys) - Math.min(...ys) + 1) / h }, foundAgain: +real.toFixed(3), nullIoU: +ceil.toFixed(3), persists: real > ceil, cells: g.cells }; });
  return { t, step, ground: pairs.map((p) => p.ground), realShare: pairs.map((p) => p.realShare), movingShare: pairs.map((p) => p.movingShare), nulls: pairs.map((p) => p.null), movingGroups: [g0.length, g1.length], figures: figures.filter((f) => f.persists), all: figures, mask: s0.mask, size: { w, h } };
}

// ── INTEGRATED OVER TIME ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Motion seen across two tenths of a second is sparse and ambiguous (a uniform surface shows motion only at its edges: the aperture problem). People
// integrate over time. So, over a window of frame pairs:
//   GROUND (affine)  the camera's own motion is fitted as an AFFINE field over all blocks (pan, zoom, rotation: dx = a0 + a1·x + a2·y, dy likewise),
//                    by least squares, refitted once without the blocks whose residuals lie beyond Tukey's upper fence (Q3 + 1.5·IQR — a declared,
//                    standard rule). What remains is motion relative to that ground.
//   ACCUMULATION     a block MOVES in a pair when its displacement is real (the ratio test of flowPair) and its relative motion is at least one pixel.
//                    Over the window, a block belongs to a figure when it moved in MORE pairs than chance: the NULL scatters each pair's moving blocks
//                    at random over the grid (200 draws) and takes the 99th percentile of how often a block is hit.
//   CON (fate)       figure blocks that touch and whose mean relative motions agree (within one pixel, or pointing the same way) form one figure.
function fitAffine(pts) {   // least squares for v = c0 + c1·x + c2·y, by the normal equations (3x3)
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], T = [0, 0, 0];
  for (const { x, y, v } of pts) { const r = [1, x, y]; for (let i = 0; i < 3; i++) { T[i] += r[i] * v; for (let j = 0; j < 3; j++) S[i][j] += r[i] * r[j]; } }
  const M = S.map((row, i) => [...row, T[i]]);
  for (let c = 0; c < 3; c++) { let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-9) return [0, 0, 0]; for (let r = 0; r < 3; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]; } }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}
export function affineGround(blocks) {
  const fit = (bs) => ({ ax: fitAffine(bs.map((b) => ({ x: b.bx, y: b.by, v: b.dx }))), ay: fitAffine(bs.map((b) => ({ x: b.bx, y: b.by, v: b.dy }))) });
  const at = (g, b) => [g.ax[0] + g.ax[1] * b.bx + g.ax[2] * b.by, g.ay[0] + g.ay[1] * b.bx + g.ay[2] * b.by];
  let g = fit(blocks); const res = blocks.map((b) => { const [gx, gy] = at(g, b); return Math.hypot(b.dx - gx, b.dy - gy); });
  const q1 = pct(res, 0.25), q3 = pct(res, 0.75), fence = q3 + 1.5 * (q3 - q1), inliers = blocks.filter((_, i) => res[i] <= fence);
  if (inliers.length >= 6) g = fit(inliers);
  return { at: (b) => at(g, b), params: { ax: g.ax.map((v) => +v.toFixed(4)), ay: g.ay.map((v) => +v.toFixed(4)) }, inliers: inliers.length, fence: +fence.toFixed(2) };
}
/** seeIntegrated(file, { t, pairs, step }) → figures from motion accumulated over a window, relative to an affine ground, against a scatter null */
export function seeIntegrated(file, { t = 0, pairs = 10, step = 0.2, draws = 200, seed = 11 } = {}) {
  const { frames, w, h } = decodeFrames(file, { t, n: pairs + 1, step });
  if (frames.length < 3) return { gap: "too_few_frames", detail: `${frames.length} decoded at t=${t}` };
  const dur = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();
  const unrelated = decodeFrames(file, { t: (t + dur / 2) % Math.max(1, dur - 1), n: 1, step }).frames[0];
  const ratio = (b) => (b.still > 0 ? b.err / b.still : 1), perPair = [];
  for (let k = 0; k + 1 < frames.length; k++) {
    const real = match(frames[k], frames[k + 1], w, h), nul = match(frames[k], unrelated, w, h), ceil = pct(nul.map(ratio), 0.01), G = affineGround(real);
    perPair.push(real.map((b) => { const [gx, gy] = G.at(b), rx = b.dx - gx, ry = b.dy - gy; return { bx: b.bx, by: b.by, rx, ry, moving: b.still > 0 && ratio(b) < ceil && Math.hypot(rx, ry) >= 1 }; }));
    perPair[perPair.length - 1].ground = G.params;
  }
  const nB = perPair[0].length, P = perPair.length, hits = new Int32Array(nB), sx = new Float64Array(nB), sy = new Float64Array(nB);
  perPair.forEach((bs) => bs.forEach((b, i) => { if (b.moving) { hits[i]++; sx[i] += b.rx; sy[i] += b.ry; } }));
  // the scatter null: each pair's moving count placed at random blocks; how often is one block hit?
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296), maxHits = [];
  const counts = perPair.map((bs) => bs.filter((b) => b.moving).length);
  for (let d = 0; d < draws; d++) { const hh = new Int32Array(nB); for (const c of counts) { const picked = new Set(); while (picked.size < Math.min(c, nB)) picked.add(Math.floor(rnd() * nB)); for (const i of picked) hh[i]++; } for (let i = 0; i < nB; i++) maxHits.push(hh[i]); }
  const ceiling = pct(maxHits, 0.99), fig = []; for (let i = 0; i < nB; i++) if (hits[i] > ceiling) fig.push(i);
  // CON: touching figure blocks whose mean motions agree
  const blk = perPair[0], key = (i) => `${blk[i].bx},${blk[i].by}`, idx = new Map(fig.map((i) => [key(i), i])), parent = new Map(fig.map((i) => [i, i])), find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  const mean = (i) => [sx[i] / hits[i], sy[i] / hits[i]];
  for (const i of fig) for (const [dx, dy] of [[B, 0], [0, B]]) { const j = idx.get(`${blk[i].bx + dx},${blk[i].by + dy}`); if (j == null) continue; const [ax, ay] = mean(i), [bx2, by2] = mean(j); const same = Math.hypot(ax - bx2, ay - by2) <= 1 || (ax * bx2 + ay * by2) / (Math.hypot(ax, ay) * Math.hypot(bx2, by2) || 1) > Math.SQRT1_2; if (same) { const a = find(i), b = find(j); if (a !== b) parent.set(b, a); } }
  const groups = new Map(); for (const i of fig) { const g = find(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); }
  const figures = [...groups.values()].filter((g) => g.length >= 2).map((g) => { const xs = g.map((i) => blk[i].bx), ys = g.map((i) => blk[i].by), cells = []; for (const i of g) for (let y = blk[i].by; y < blk[i].by + B; y++) for (let x = blk[i].bx; x < blk[i].bx + B; x++) cells.push(y * w + x); const mx = g.reduce((a, i) => a + mean(i)[0], 0) / g.length, my = g.reduce((a, i) => a + mean(i)[1], 0) / g.length; return { blocks: g.length, area: +(cells.length / (w * h)).toFixed(4), box: { x: Math.min(...xs) / w, y: Math.min(...ys) / h, w: (Math.max(...xs) - Math.min(...xs) + B) / w, h: (Math.max(...ys) - Math.min(...ys) + B) / h }, motion: { dx: +mx.toFixed(2), dy: +my.toFixed(2) }, meanHits: +(g.reduce((a, i) => a + hits[i], 0) / g.length).toFixed(1), cells }; });
  return { t, pairs: P, step, size: { w, h }, ground: perPair.map((p) => p.ground), moving: counts, null: { kind: "each pair's moving blocks scattered at random over the grid", draws, q: 0.99, ceiling }, figureBlocks: fig.length, figures: figures.sort((a, b) => b.blocks - a.blocks), hits: Array.from(hits), blocks: blk.map((b) => ({ bx: b.bx, by: b.by })) };
}

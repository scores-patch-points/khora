// adapters/image/seer.js — SEEING, bottom-up, from the image itself: no model, no detector, every threshold a measured null.
//
// People do not see pixels. Seeing is layered, sampled and predictive. These are the layers this file reads, each one of the cube's operators:
//   SIG          difference first: a centre-surround contrast map over luminance and two colour-opponent channels, at two scales. Its peaks
//                that beat a NULL (the same frame with its 8x8 blocks shuffled: local statistics kept, structure destroyed) are FIXATIONS —
//                where an eye would look, in order, with inhibition of return.
//   SIG·Ground   the GIST: the whole field's layout (a 4x4 grid of mean luminance, colour and horizontal/vertical edge energy), registered,
//                never built from objects (SYN at Ground is the desert cell).
//   SEG          REGIONS: a graph cut over neighbouring pixels (Felzenszwalb–Huttenlocher). Its one setting is EARNED BY STABILITY: of a
//                declared search range, the settings whose regions agree with a re-scaled witness's (adjusted Rand) within the best one's own
//                leftover disagreement, and of those the simplest (fewest regions).
//   CON          GROUPING BY CONTOUR: adjacent regions join unless a REAL contour separates them — the edge along their shared boundary beats the
//                same number of random pixels' edge strength in the same frame (95th percentile). Earlier, colour-based grouping failed three ways
//                (a degenerate between-region null; a pooled noise that merged textured frames; colour that cannot part a brown horse from a brown track).
//   INS          PROTO-OBJECTS: a group EXISTS only if it persists — its overlap with the witness's groups beats ITS OWN NULL (its overlap after
//                five random shifts of itself). Two sightings, as notes.js stands a note on two witnesses.
// Nothing here names what anything is. Naming is a giver's nomination (DEF), tested against these layers elsewhere.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { lcg } from "../../kernel/continuation.js";

export const SEER = Object.freeze({ width: 160, height: 90, block: 8, scales: [[2, 7], [3, 13]], searchK: [60, 120, 240, 480, 960, 1920], witnessScale: 0.9, seed: 20261118, given: "the decode size, the block of the shuffle null, the two contrast scales and the search range of the cut are declared here; every THRESHOLD is measured" });

function decode(file, w, h, vf = "") {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `${vf ? vf + "," : ""}scale=${w}:${h}:flags=area`, "-pix_fmt", "rgb24", "-f", "rawvideo", "-frames:v", "1", "pipe:1"], { maxBuffer: 1 << 26 });
  const n = w * h, L = new Float64Array(n), RG = new Float64Array(n), BY = new Float64Array(n);
  for (let i = 0; i < n; i++) { const r = raw[3 * i], g = raw[3 * i + 1], b = raw[3 * i + 2]; L[i] = (r + g + b) / 3; RG[i] = r - g; BY[i] = b - (r + g) / 2; }
  return { w, h, L, RG, BY };
}
const integral = (ch, w, h) => { const I = new Float64Array((w + 1) * (h + 1)); for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += ch[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } } return I; };
const boxMean = (I, w, h, x, y, r) => { const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(w, x + r + 1), y1 = Math.min(h, y + r + 1); return (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0)); };

/** edge strength: the colour gradient (central differences, summed over the three channels) — the raw material of contours */
function edges(img) {
  const { w, h, L, RG, BY } = img, E = new Float64Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; let e = 0; for (const c of [L, RG, BY]) e += Math.hypot(c[i + 1] - c[i - 1], c[i + w] - c[i - w]); E[i] = e; }
  return E;
}
/** SIG: the contrast map (each channel and scale normalised by its own maximum, then summed) */
function contrast(img) {
  const { w, h } = img, S = new Float64Array(w * h);
  for (const ch of [img.L, img.RG, img.BY]) { const I = integral(ch, w, h); for (const [c, s] of SEER.scales) { const m = new Float64Array(w * h); let mx = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = Math.abs(boxMean(I, w, h, x, y, c) - boxMean(I, w, h, x, y, s)); m[y * w + x] = v; if (v > mx) mx = v; } if (mx > 0) for (let i = 0; i < m.length; i++) S[i] += m[i] / mx; } }
  return S;
}
function blockShuffled(img, rng) {
  const { w, h } = img, B = SEER.block, bx = Math.floor(w / B), by = Math.floor(h / B), order = [...Array(bx * by).keys()];
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const out = { w, h, L: Float64Array.from(img.L), RG: Float64Array.from(img.RG), BY: Float64Array.from(img.BY) };
  order.forEach((src, dst) => { const sx = (src % bx) * B, sy = Math.floor(src / bx) * B, dx = (dst % bx) * B, dy = Math.floor(dst / bx) * B; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) for (const k of ["L", "RG", "BY"]) out[k][(dy + y) * w + dx + x] = img[k][(sy + y) * w + sx + x]; });
  return out;
}
/** fixations: peaks of the contrast map above the null's 99th percentile, taken in order with inhibition of return (radius = the larger surround) */
function fixations(img, rng) {
  const S = contrast(img), N = contrast(blockShuffled(img, rng)), sorted = [...N].sort((a, b) => a - b), ceiling = sorted[Math.floor(0.99 * (sorted.length - 1))];
  const { w, h } = img, R = SEER.scales.at(-1)[1], taken = [], alive = Float64Array.from(S);
  for (;;) { let bi = -1, bv = ceiling; for (let i = 0; i < alive.length; i++) if (alive[i] > bv) { bv = alive[i]; bi = i; } if (bi < 0) break; const x = bi % w, y = Math.floor(bi / w); taken.push({ x: x / w, y: y / h, v: +bv.toFixed(3) }); for (let yy = Math.max(0, y - R); yy <= Math.min(h - 1, y + R); yy++) for (let xx = Math.max(0, x - R); xx <= Math.min(w - 1, x + R); xx++) alive[yy * w + xx] = -Infinity; }
  return { fixations: taken, null: { kind: "8x8 blocks of the same frame shuffled", q: 0.99, ceiling: +ceiling.toFixed(3) } };
}
/** SIG·Ground: the gist, a 4x4 grid of five measures over the whole field */
function gist(img) {
  const { w, h, L, RG, BY } = img, out = [];
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) { let n = 0, l = 0, rg = 0, by = 0, eh = 0, ev = 0; for (let y = Math.floor(gy * h / 4); y < Math.floor((gy + 1) * h / 4); y++) for (let x = Math.floor(gx * w / 4); x < Math.floor((gx + 1) * w / 4); x++) { const i = y * w + x; n++; l += L[i]; rg += RG[i]; by += BY[i]; if (x + 1 < w) eh += Math.abs(L[i + 1] - L[i]); if (y + 1 < h) ev += Math.abs(L[i + w] - L[i]); } out.push(l / n, rg / n, by / n, eh / n, ev / n); }
  return out;
}
export const gistDistance = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));

/** SEG: Felzenszwalb–Huttenlocher over 4-neighbour edges in (L, RG, BY) */
function segment(img, k) {
  const { w, h, L, RG, BY } = img, n = w * h, E = [];
  const d = (i, j) => Math.sqrt((L[i] - L[j]) ** 2 + (RG[i] - RG[j]) ** 2 + (BY[i] - BY[j]) ** 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (x + 1 < w) E.push([d(i, i + 1), i, i + 1]); if (y + 1 < h) E.push([d(i, i + w), i, i + w]); }
  E.sort((a, b) => a[0] - b[0]);
  const parent = Int32Array.from({ length: n }, (_, i) => i), size = new Int32Array(n).fill(1), inner = new Float64Array(n);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (const [wgt, a, b] of E) { const ra = find(a), rb = find(b); if (ra === rb) continue; if (wgt <= Math.min(inner[ra] + k / size[ra], inner[rb] + k / size[rb])) { parent[rb] = ra; size[ra] += size[rb]; inner[ra] = Math.max(inner[ra], inner[rb], wgt); } }
  const label = new Int32Array(n), ids = new Map(); for (let i = 0; i < n; i++) { const r = find(i); if (!ids.has(r)) ids.set(r, ids.size); label[i] = ids.get(r); }
  return { label, count: ids.size };
}
function adjustedRand(a, b) {
  const n = a.length, C = new Map(), A = new Map(), B = new Map();
  for (let i = 0; i < n; i++) { const k = a[i] * 100003 + b[i]; C.set(k, (C.get(k) ?? 0) + 1); A.set(a[i], (A.get(a[i]) ?? 0) + 1); B.set(b[i], (B.get(b[i]) ?? 0) + 1); }
  const c2 = (x) => (x * (x - 1)) / 2; let sc = 0, sa = 0, sb = 0; for (const v of C.values()) sc += c2(v); for (const v of A.values()) sa += c2(v); for (const v of B.values()) sb += c2(v);
  const exp = (sa * sb) / c2(n), max = (sa + sb) / 2; return max - exp === 0 ? 0 : (sc - exp) / (max - exp);
}
/** CON: GROUPING BY CONTOUR. Two adjacent regions stay apart only where a REAL contour separates them: the mean edge strength along their shared
 *  boundary beats the NULL for a boundary of that length — the 95th percentile of the mean edge strength of the same number of pixels drawn at random
 *  from the same frame (so a textured frame raises its own bar, and a faint but real edge in a quiet frame still counts). No contour, one group.
 *  (Colour alone could not separate a brown horse from a brown track; and colour-based nulls were degenerate twice, see the header.) */
function group(img, seg, rng) {
  const { w, h } = img, R = seg.count, E = edges(img), bound = new Map();
  const add = (i, j) => { const p = seg.label[i], q = seg.label[j]; if (p === q) return; const k = p < q ? `${p},${q}` : `${q},${p}`; const b = bound.get(k) ?? [0, 0]; b[0] += E[i] + E[j]; b[1] += 2; bound.set(k, b); };
  for (let i = 0; i < w * h; i++) { if ((i % w) + 1 < w) add(i, i + 1); if (i + w < w * h) add(i, i + w); }
  const nullCache = new Map(), bucket = (n) => 2 ** Math.min(10, Math.ceil(Math.log2(Math.max(2, n))));
  const nullFor = (n) => { const b = bucket(n); if (!nullCache.has(b)) { const means = []; for (let t = 0; t < 200; t++) { let s = 0; for (let k = 0; k < b; k++) s += E[Math.floor(rng() * E.length)]; means.push(s / b); } means.sort((x, y) => x - y); nullCache.set(b, means[Math.floor(0.95 * (means.length - 1))]); } return nullCache.get(b); };
  const parent = [...Array(R).keys()], find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }; let merges = 0, contours = 0;
  for (const [k, [sum, n]] of bound) { const [p, q] = k.split(",").map(Number); if (sum / n > nullFor(n)) { contours++; continue; } const a = find(p), b = find(q); if (a !== b) { parent[b] = a; merges++; } }
  const gid = new Map(), label = new Int32Array(w * h); for (let i = 0; i < w * h; i++) { const g = find(seg.label[i]); if (!gid.has(g)) gid.set(g, gid.size); label[i] = gid.get(g); }
  return { label, count: gid.size, merges, contours, null: { kind: "a boundary is a contour when its mean edge strength beats the 95th percentile of the same number of random pixels' edge strength in the same frame" } };
}
function groupsOf(label, count, w, h) {
  const G = Array.from({ length: count }, () => ({ n: 0, x0: w, y0: h, x1: 0, y1: 0, cells: [] }));
  for (let i = 0; i < w * h; i++) { const g = G[label[i]], x = i % w, y = Math.floor(i / w); g.n++; g.cells.push(i); if (x < g.x0) g.x0 = x; if (y < g.y0) g.y0 = y; if (x > g.x1) g.x1 = x; if (y > g.y1) g.y1 = y; }
  return G.map((g, id) => ({ id, area: g.n / (w * h), box: { x: g.x0 / w, y: g.y0 / h, w: (g.x1 - g.x0 + 1) / w, h: (g.y1 - g.y0 + 1) / h }, touchesBorder: g.x0 === 0 || g.y0 === 0 || g.x1 === w - 1 || g.y1 === h - 1, cells: g.cells }));
}
const iou = (A, B) => { const s = new Set(A); let inter = 0; for (const c of B) if (s.has(c)) inter++; return inter / (A.length + B.length - inter); };

/** see(file) → { fixations, gist, seg: { k, ari }, groups, protoObjects } — one frame, read by the seer's own layers, with its witness */
export function see(file, { seed = SEER.seed, habit = null, masks = false } = {}) {   // masks: also return the group label map (for showing what was seen)   // habit: a calibrate() result — the perceiver's learned cut, used instead of choosing per frame
  const { width: w, height: h, witnessScale } = SEER, rng = lcg(seed);
  const img = decode(file, w, h), wit = decode(file, w, h, `scale=iw*${witnessScale}:ih*${witnessScale}:flags=bicubic`);
  const fx = fixations(img, rng), gi = gist(img);
  // SEG, earned by stability: the setting whose cut agrees best with the witness's cut at the same setting
  // among cuts equally stable — within the best cut's own leftover disagreement (1 − best agreement) — the simplest (the largest setting, fewest regions)
  const tried = (habit ? [habit.k] : SEER.searchK).map((k) => { const a = segment(img, k), b = segment(wit, k); return { k, ari: adjustedRand(a.label, b.label), a, b }; });
  const top = Math.max(...tried.map((t) => t.ari)), best = tried.filter((t) => t.ari >= top - (1 - top)).sort((x, y) => y.k - x.k)[0];
  const ga = group(img, best.a, rng), gb = group(wit, best.b, rng);
  const A = groupsOf(ga.label, ga.count, w, h), B = groupsOf(gb.label, gb.count, w, h);
  // INS: persistence against a shifted-copy null
  // INS: each group against ITS OWN null — its overlap with the witness after random shifts of itself (a pooled null saturates on tiny groups)
  const best1 = (cells) => { let m = 0; for (const o of B) m = Math.max(m, iou(cells, o.cells)); return m; };
  const groups = A.map((g) => { const real = best1(g.cells), own = []; for (let t = 0; t < 5; t++) { const dx = 1 + Math.floor(rng() * (w - 1)), dy = 1 + Math.floor(rng() * (h - 1)); own.push(best1(g.cells.map((c) => ((Math.floor(c / w) + dy) % h) * w + (((c % w) + dx) % w)))); } const ceiling = Math.max(...own); const { cells, ...rest } = g; return { ...rest, witnessIoU: +real.toFixed(3), nullIoU: +ceiling.toFixed(3), persists: real > ceiling }; });
  return { ...(masks ? { mask: Array.from(ga.label) } : {}), file, size: { w, h }, fixations: fx.fixations, fixationNull: fx.null, gist: gi, seg: { k: best.k, from: habit ? `the perceiver's habit (calibrated over ${habit.frames} frames)` : "chosen for this frame alone", ari: +best.ari.toFixed(3), regions: best.a.count, searched: tried.map((t) => ({ k: t.k, ari: +t.ari.toFixed(3) })) }, grouping: { ...ga.null, merges: ga.merges, contours: ga.contours }, persistence: { kind: "each group against its own overlap after 5 random shifts of itself" }, groups, protoObjects: groups.filter((g) => g.persists) };
}

/** calibrate(files) → the perceiver's HABIT: the cut setting that is most stable ACROSS its ground (REC, Pattern grain), not per frame.
 *  For each declared setting, the mean adjusted Rand between each frame's cut and its re-scaled witness's cut; among settings within the best one's
 *  own leftover disagreement, the simplest. How finely a perceiver cuts is something it learns over many frames, the way the text ground is learned. */
export function calibrate(files) {
  const { width: w, height: h, witnessScale } = SEER, frames = files.map((f) => ({ img: decode(f, w, h), wit: decode(f, w, h, `scale=iw*${witnessScale}:ih*${witnessScale}:flags=bicubic`) }));
  const table = SEER.searchK.map((k) => { const aris = frames.map(({ img, wit }) => adjustedRand(segment(img, k).label, segment(wit, k).label)), m = aris.reduce((a, b) => a + b, 0) / aris.length, sd = Math.sqrt(aris.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, aris.length - 1)); return { k, meanAri: m, se: sd / Math.sqrt(aris.length) }; });
  // THE ONE-STANDARD-ERROR RULE: the simplest setting whose mean stability is within one standard error of the most stable one
  const bestT = table.reduce((a, b) => (b.meanAri > a.meanAri ? b : a)), chosen = table.filter((t) => t.meanAri >= bestT.meanAri - bestT.se).sort((x, y) => y.k - x.k)[0];
  return { k: chosen.k, frames: files.length, table: table.map((t) => ({ k: t.k, meanAri: +t.meanAri.toFixed(4), se: +t.se.toFixed(4) })), rule: "the simplest setting within one standard error of the most stable mean (adjusted Rand against a re-scaled witness)" };
}

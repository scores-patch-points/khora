// lib-pairs.mjs — local-count strata and matched pairs for the ablation-scope lens (NEW FILE).
// An occurrence of form w at (s,i) has LOCAL COUNT c = how many tokens of w sit in the reader's window [s-M, s] (the evaluated message included in full).
// Names and unlabelled tokens are matched PAIRWISE on: the same document, the same third-octave bin of c, the same within-message position class
// (I0 message/sentence-initial, I1 second word, I2 later), and then, nearest-first, on whole-document form frequency (log2 bin, <= 1 apart),
// character length (<= 2 apart), message length (log2 bucket, <= 1 apart) and distance in the stream.  No capital, POS prior or list is used for matching.
import { rngFor, seedFor } from "../../impact.mjs";

export const STRATA = ["c1", "c2", "c3", "c4_6", "c7_15", "c16p"];
export const strataOf = (c) => (c === 1 ? "c1" : c === 2 ? "c2" : c === 3 ? "c3" : c <= 6 ? "c4_6" : c <= 15 ? "c7_15" : "c16p");
export const mbOf = (c) => Math.floor(3 * Math.log2(c) + 1e-9);
export const pcOf = (i) => (i === 0 ? "I0" : i === 1 ? "I1" : "I2");
export const grpOf = (i) => (i === 0 ? "A" : "B");   // A = message-initial, B = not
const lenOf = (w) => [...w].length;
const lbOf = (n) => Math.min(6, Math.floor(Math.log2(Math.max(1, n))));
const lower = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; };

/** Index a document and compute every eligible occurrence's local-count record. Eligible: s >= M (full window), form length >= 3, form occurs >= 3 times. */
export function indexAndCandidates(doc, M) {
  const occ = new Map();
  doc.stream.forEach((sent, s) => sent.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([s, i]); }));
  const P = [], N = [], nMsg = doc.stream.length, nTok = doc.stream.reduce((a, s) => a + s.length, 0);
  for (const [w, o] of occ) {
    if (o.length < 3 || lenOf(w) < 3) continue;
    const isGoldForm = o.some(([s, i]) => doc.goldPos.has(`${s}:${i}`));
    if (!isGoldForm && doc.negExclude.has(w)) continue;
    const ms = o.map((x) => x[0]);
    for (let k = 0; k < o.length; k++) {
      const [s, i] = o[k];
      if (s < M) continue;
      const gold = doc.goldPos.has(`${s}:${i}`);
      if (isGoldForm && !gold) continue;                 // a gold form's non-gold occurrences (e.g. the speaker's own nick) are neither positive nor negative
      const lo = lower(ms, s - M), hiExcl = lower(ms, s + 1), c = hiExcl - lo;
      const rec = { s, i, w, c, cBefore: lower(ms, s) - lo, last16: lower(ms, s) - lower(ms, s - 16), docCount: o.length, rate: o.length / nMsg, len: lenOf(w), sl: doc.stream[s].length,
        fbin: Math.floor(Math.log2(o.length)), stratum: strataOf(c), mb: mbOf(c), pc: pcOf(i), grp: grpOf(i), lb: lbOf(doc.stream[s].length) };
      (gold ? P : N).push(rec);
    }
  }
  return { occ, P, N, nMsg, nTok };
}

/** Draw matched pairs for one (group, stratum) cell. Without replacement; at most maxPerForm occurrences of one form per cell and class. */
export function pairsForCell(cand, doc, M, { grp, stratum, n, seedTag = "", maxPerForm = 4 }) {
  const rnd = rngFor(seedFor("ablation-scope", doc.name, grp, stratum, seedTag));
  const sh = (a) => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
  const P = sh(cand.P.filter((r) => r.grp === grp && r.stratum === stratum));
  const pool = new Map();
  for (const r of cand.N) if (r.stratum === stratum && r.grp === grp) { const k = `${r.mb}|${r.pc}`; (pool.get(k) ?? pool.set(k, []).get(k)).push(r); }
  const posUse = new Map(), negUse = new Map(), taken = new Set(), pairs = [];
  let dropped = 0;
  for (const p of P) {
    if (pairs.length >= n) break;
    if ((posUse.get(p.w) ?? 0) >= maxPerForm) continue;
    const arr = pool.get(`${p.mb}|${p.pc}`) ?? [];
    let best = null, bestCost = Infinity;
    for (const q of arr) {
      if (taken.has(`${q.s}:${q.i}`) || (negUse.get(q.w) ?? 0) >= maxPerForm) continue;
      const df = Math.abs(q.fbin - p.fbin), dl = Math.abs(q.len - p.len), db = Math.abs(q.lb - p.lb);
      if (df > 1 || dl > 2 || db > 1) continue;
      const cost = 3 * df + dl + db + 2 * Math.abs(q.s - p.s) / cand.nMsg + rnd() * 0.01;
      if (cost < bestCost) { bestCost = cost; best = q; }
    }
    if (!best) { dropped += 1; continue; }
    taken.add(`${best.s}:${best.i}`); posUse.set(p.w, (posUse.get(p.w) ?? 0) + 1); negUse.set(best.w, (negUse.get(best.w) ?? 0) + 1);
    pairs.push({ pos: p, neg: best });
  }
  return { pairs, dropped, nPos: P.length, nNegPool: [...pool.values()].reduce((a, x) => a + x.length, 0) };
}

// ── MATCHING v2 (amendment 2026-10-07, after discovery round 1 found 6 pooled/cell control failures: character length 0.55-0.66, message index in War and Peace 0.32-0.43) ────────
// Tighter, never looser: hard limits |dlen| <= 1, |dfbin| <= 1, |dlen-bucket| <= 1, |ds| <= 20% of the stream; nearest-first with a SIGNED running-balance term on length, frequency
// bin, stream position, log local count and message length, so the matched negatives are not systematically shorter / later / rarer than the names.  Same pools, same strata.
export function pairsForCellV2(cand, doc, M, { grp, stratum, n, seedTag = "", maxPerForm = 4 }) {
  const rnd = rngFor(seedFor("ablation-scope", "v2", doc.name, grp, stratum, seedTag));
  const sh = (a) => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
  const P = sh(cand.P.filter((r) => r.grp === grp && r.stratum === stratum));
  const pool = new Map();
  for (const r of cand.N) if (r.stratum === stratum && r.grp === grp) { const k = `${r.mb}|${r.pc}`; (pool.get(k) ?? pool.set(k, []).get(k)).push(r); }
  const posUse = new Map(), negUse = new Map(), taken = new Set(), pairs = [], N = cand.nMsg;
  let dropped = 0, sDL = 0, sDF = 0, sDS = 0, sDC = 0, sDB = 0, sDM = 0;
  for (const p of P) {
    if (pairs.length >= n) break;
    if ((posUse.get(p.w) ?? 0) >= maxPerForm) continue;
    const arr = pool.get(`${p.mb}|${p.pc}`) ?? [], k1 = pairs.length + 1;
    let best = null, bestCost = Infinity;
    for (const q of arr) {
      if (taken.has(`${q.s}:${q.i}`) || (negUse.get(q.w) ?? 0) >= maxPerForm) continue;
      const dl = q.len - p.len, df = q.fbin - p.fbin, db = q.lb - p.lb, ds = (q.s - p.s) / N, dc = Math.log(q.c) - Math.log(p.c), dm = Math.log(q.sl) - Math.log(p.sl);
      if (Math.abs(dl) > 1 || Math.abs(df) > 1 || Math.abs(db) > 1 || Math.abs(ds) > 0.2) continue;
      const cost = 5 * Math.abs(dl) + 4 * Math.abs(df) + 2 * Math.abs(db) + 4 * Math.abs(ds) + 3 * Math.abs(dc)
        + 6 * Math.abs((sDL + dl) / k1) + 12 * Math.abs((sDF + df) / k1) + 8 * Math.abs((sDS + ds) / k1) + 4 * Math.abs((sDC + dc) / k1) + 3 * Math.abs((sDB + db) / k1) + 2 * Math.abs(dm) + 6 * Math.abs((sDM + dm) / k1) + rnd() * 0.01;
      if (cost < bestCost) { bestCost = cost; best = { q, dl, df, db, ds, dc, dm }; }
    }
    if (!best) { dropped += 1; continue; }
    const q = best.q; sDL += best.dl; sDF += best.df; sDS += best.ds; sDC += best.dc; sDB += best.db; sDM += best.dm;
    taken.add(`${q.s}:${q.i}`); posUse.set(p.w, (posUse.get(p.w) ?? 0) + 1); negUse.set(q.w, (negUse.get(q.w) ?? 0) + 1);
    pairs.push({ pos: p, neg: q });
  }
  return { pairs, dropped, nPos: P.length, nNegPool: [...pool.values()].reduce((a, x) => a + x.length, 0) };
}

// ── MATCHING v3 (amendment 2 to the design, 2026-10-07, before any confirmation read): v2 plus a hard |dlog(message length)| <= 0.5 when the negative pool has >= 1000 tokens and stronger message-length
// balance weights; motivated by a DESIGN-TIME check (no ablation read) that showed R_SL 0.39-0.46 for group B on confirmation days. v2 stays reproducible (round 2 used it).
export function pairsForCellV3(cand, doc, M, { grp, stratum, n, seedTag = "", maxPerForm = 4 }) {
  const rnd = rngFor(seedFor("ablation-scope", "v3", doc.name, grp, stratum, seedTag));
  const sh = (a) => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
  const P = sh(cand.P.filter((r) => r.grp === grp && r.stratum === stratum));
  const pool = new Map();
  for (const r of cand.N) if (r.stratum === stratum && r.grp === grp) { const k = `${r.mb}|${r.pc}`; (pool.get(k) ?? pool.set(k, []).get(k)).push(r); }
  const posUse = new Map(), negUse = new Map(), taken = new Set(), pairs = [], N = cand.nMsg;
  let dropped = 0, sDL = 0, sDF = 0, sDS = 0, sDC = 0, sDB = 0, sDM = 0;
  for (const p of P) {
    if (pairs.length >= n) break;
    if ((posUse.get(p.w) ?? 0) >= maxPerForm) continue;
    const arr = pool.get(`${p.mb}|${p.pc}`) ?? [], k1 = pairs.length + 1;
    let best = null, bestCost = Infinity;
    for (const q of arr) {
      if (taken.has(`${q.s}:${q.i}`) || (negUse.get(q.w) ?? 0) >= maxPerForm) continue;
      const dl = q.len - p.len, df = q.fbin - p.fbin, db = q.lb - p.lb, ds = (q.s - p.s) / N, dc = Math.log(q.c) - Math.log(p.c), dm = Math.log(q.sl) - Math.log(p.sl);
      if (Math.abs(dl) > 1 || Math.abs(df) > 1 || Math.abs(db) > 1 || Math.abs(ds) > 0.2) continue;
      if (arr.length >= 1000 && Math.abs(dm) > 0.5) continue;   // v3: a big negative pool can match message length tightly
      const cost = 5 * Math.abs(dl) + 4 * Math.abs(df) + 2 * Math.abs(db) + 4 * Math.abs(ds) + 3 * Math.abs(dc)
        + 6 * Math.abs((sDL + dl) / k1) + 12 * Math.abs((sDF + df) / k1) + 8 * Math.abs((sDS + ds) / k1) + 4 * Math.abs((sDC + dc) / k1) + 3 * Math.abs((sDB + db) / k1) + 4 * Math.abs(dm) + 12 * Math.abs((sDM + dm) / k1) + rnd() * 0.01;
      if (cost < bestCost) { bestCost = cost; best = { q, dl, df, db, ds, dc, dm }; }
    }
    if (!best) { dropped += 1; continue; }
    const q = best.q; sDL += best.dl; sDF += best.df; sDS += best.ds; sDC += best.dc; sDB += best.db; sDM += best.dm;
    taken.add(`${q.s}:${q.i}`); posUse.set(p.w, (posUse.get(p.w) ?? 0) + 1); negUse.set(q.w, (negUse.get(q.w) ?? 0) + 1);
    pairs.push({ pos: p, neg: q });
  }
  return { pairs, dropped, nPos: P.length, nNegPool: [...pool.values()].reduce((a, x) => a + x.length, 0) };
}

// laws/_freq_blocks.mjs — the fixed-N doc-order block statistics of the "freq" family (leading underscore: the atlas ignores this file).
// The token stream (unit order, document order within a half) is cut into disjoint blocks of NB tokens (the tail is dropped); every statistic is computed inside a block and averaged over blocks.
// A block's counts use a stamp array (no clearing); ranks come from sorting the block's own counts. Deterministic, O(T + blocks * V log V).
export const NB = 5000, NBZ = 10000, CHK = [250, 500, 1000, 2000, 4000], ZMIN = 10, ZMAX = 300, ZPTS = 30, MAXBIN = 13;
export const ZRANKS = [...new Set(Array.from({ length: ZPTS }, (_, k) => Math.round(ZMIN * Math.pow(ZMAX / ZMIN, k / (ZPTS - 1)))))];

const lsSlope = (x, y) => { const n = x.length; let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; } mx /= n; my /= n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxx > 0 ? sxy / sxx : null; };
const LNCHK = CHK.map(Math.log), LNZ = ZRANKS.map(Math.log);

/** run fn over the disjoint blocks of size nb; fn(start, b, stamp, cnt, touched) fills the touched type list of the block (counts in cnt) */
function eachBlock(P, nb, fn) {
  const stamp = new Int32Array(P.nTypes).fill(-1), cnt = new Int32Array(P.nTypes), nBlocks = Math.floor(P.T / nb);
  for (let b = 0; b < nBlocks; b++) fn(b * nb, b, stamp, cnt);
  return nBlocks;
}
export function blockStats(P) {
  const out = { zipfAlpha: null, heapsBeta: null, ttr: null, hapaxShare: null, rankBinEnt: null };
  let nOK = 0, sT = 0, sH = 0, sB = 0, sE = 0, nB = 0;
  const nb = eachBlock(P, NB, (s, b, stamp, cnt) => {
    const touched = [], vAt = new Float64Array(CHK.length); let V = 0, ci = 0;
    for (let i = 0; i < NB; i++) {
      const id = P.ids[s + i];
      if (stamp[id] !== b) { stamp[id] = b; cnt[id] = 0; touched.push(id); V++; }
      cnt[id]++;
      if (ci < CHK.length && i + 1 === CHK[ci]) vAt[ci++] = V;
    }
    let V1 = 0; const arr = new Int32Array(V);
    for (let i = 0; i < V; i++) { const c = cnt[touched[i]]; arr[i] = c; if (c === 1) V1++; }
    arr.sort();
    const mass = new Float64Array(MAXBIN + 1);
    for (let r = 1; r <= V; r++) mass[Math.min(MAXBIN, 31 - Math.clz32(r))] += arr[V - r];
    let H = 0; for (let k = 0; k <= MAXBIN; k++) if (mass[k] > 0) { const p = mass[k] / NB; H -= p * Math.log2(p); }
    const slope = lsSlope(LNCHK, Array.from(vAt, Math.log));
    sT += V / NB; sH += V1 / V; sE += H; if (slope !== null) { sB += slope; nB++; }
  });
  if (nb > 0) { out.ttr = sT / nb; out.hapaxShare = sH / nb; out.rankBinEnt = sE / nb; if (nB > 0) out.heapsBeta = sB / nB; }
  let sA = 0;
  const nz = eachBlock(P, NBZ, (s, b, stamp, cnt) => {
    const touched = []; let V = 0;
    for (let i = 0; i < NBZ; i++) { const id = P.ids[s + i]; if (stamp[id] !== b) { stamp[id] = b; cnt[id] = 0; touched.push(id); V++; } cnt[id]++; }
    if (V < ZMAX) return;
    const arr = new Int32Array(V); for (let i = 0; i < V; i++) arr[i] = cnt[touched[i]];
    arr.sort();
    const y = ZRANKS.map((r) => Math.log(arr[V - r])), sl = lsSlope(LNZ, y);
    if (sl !== null) { sA += -sl; nOK++; }
  });
  if (nz > 0 && nOK > 0) out.zipfAlpha = sA / nOK;
  return out;
}

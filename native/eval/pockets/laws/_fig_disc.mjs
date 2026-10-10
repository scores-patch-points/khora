// laws/_fig_disc.mjs — the DISCOURSE-scale statistics of the "fig" family (null: unit-order): figShare, arrival, persist, crpTheta, fano.
import { WIN, BLOCK } from "./_fig_prep.mjs";

const CRP_N = 100;   // figure tokens per block entering the CRP fit

/** digamma by upward recurrence to x >= 6 then the asymptotic series (abs error < 1e-10) */
function digamma(x) {
  let r = 0;
  while (x < 6) { r -= 1 / x; x += 1; }
  const f = 1 / (x * x);
  return r + Math.log(x) - 0.5 / x - f * (1 / 12 - f * (1 / 120 - f * (1 / 252 - f * (1 / 240 - f / 132))));
}
/** expected number of tables of a Chinese restaurant process (concentration theta) after n customers: theta * (psi(theta + n) - psi(theta)); increases from 1 (theta -> 0) to n (theta -> inf) */
const crpTables = (theta, n) => theta * (digamma(theta + n) - digamma(theta));
/** theta with crpTables(theta, n) = F by bisection on ln theta (F must lie in (1, n)) */
export function fitTheta(F, n) {
  let lo = Math.log(1e-4), hi = Math.log(1e9);
  for (let k = 0; k < 60; k++) { const mid = 0.5 * (lo + hi); if (crpTables(Math.exp(mid), n) < F) lo = mid; else hi = mid; }
  return Math.exp(0.5 * (lo + hi));
}

export function discourse(P) {
  const { N, U, T, tok, uOf, uStart, nxt, fig, birth } = P;
  const out = { figShare: null, arrival: null, persist: null, crpTheta: null, fano: null };
  if (N < 2000) return out;
  let nFig = 0;
  for (let i = 0; i < N; i++) nFig += fig[i];
  out.figShare = nFig / N;
  // births are counted only where a full 127-unit window exists on both sides inside the view (units 127 .. U-128): at the edges every first mention would look like a birth (a finite-size bias that falls with N)
  if (U >= 400) {
    const iLo = uStart[WIN], iHi = uStart[U - WIN];
    let nBirth = 0;
    for (let i = iLo; i < iHi; i++) nBirth += birth[i];
    out.arrival = nFig >= 30 ? (1000 * nBirth) / (iHi - iLo) : null;     // episode openings per 1000 tokens
    // persist: for every birth, the span (units) from its first mention to the LAST same-type mention that is still inside the window [u0, u0 + 127]; interpolated median over births
    const H = new Int32Array(WIN + 1); let nb = 0;
    for (let i = iLo; i < iHi; i++) {
      if (!birth[i]) continue;
      const u0 = uOf[i]; let j = i, lastU = u0;
      while (nxt[j] >= 0 && uOf[nxt[j]] - u0 <= WIN) { j = nxt[j]; lastU = uOf[j]; }
      H[lastU - u0]++; nb++;
    }
    if (nb >= 30) { let cum = 0, s = 0; while (s < WIN && cum + H[s] < nb / 2) { cum += H[s]; s++; } out.persist = s + (nb / 2 - cum) / Math.max(1, H[s]) - 0.5; }
  }
  // aligned blocks of 128 units. crpTheta: in each block take the first CRP_N = 100 FIGURE tokens (types with >= 2 tokens inside the block), count the distinct types F among them and fit the Chinese-restaurant
  // concentration theta with E[tables | n = 100] = F; fixed n makes theta free of the number of tokens in the window. fano: dispersion of the sliding figure share across blocks.
  const nB = Math.floor(U / BLOCK);
  if (nB >= 6) {
    const stamp = new Int32Array(T).fill(-1), seen = new Int32Array(T).fill(-1), c = new Int32Array(T), Fb = new Float64Array(nB), Nb = new Float64Array(nB);
    let sumLog = 0, nth = 0, sF = 0, sN = 0;
    for (let b = 0; b < nB; b++) {
      const i0 = uStart[b * BLOCK], i1 = uStart[(b + 1) * BLOCK]; let fb = 0;
      for (let i = i0; i < i1; i++) { fb += fig[i]; const t = tok[i]; if (stamp[t] !== b) { stamp[t] = b; c[t] = 1; } else c[t]++; }
      Fb[b] = fb; Nb[b] = i1 - i0; sF += fb; sN += i1 - i0;
      let taken = 0, F = 0;
      for (let i = i0; i < i1 && taken < CRP_N; i++) { const t = tok[i]; if (c[t] < 2) continue; taken++; if (seen[t] !== b) { seen[t] = b; F++; } }
      if (taken === CRP_N && F >= 3 && F <= CRP_N - 2) { sumLog += Math.log2(fitTheta(F, CRP_N)); nth++; }
    }
    if (nth >= 4) out.crpTheta = sumLog / nth;
    const p = sF / sN;
    if (p > 0 && p < 1) { let chi = 0; for (let b = 0; b < nB; b++) chi += (Fb[b] - p * Nb[b]) ** 2 / Nb[b]; out.fano = chi / (p * (1 - p)) / (nB - 1); }
  }
  return out;
}

// laws/_phys_void.mjs — VOID statistics of the "phys" family: voidShare and voidRescue. See laws/phys.mjs.
// In every 2,000-token window: FIGURE = type with >= 3 mentions in the window (the additive regime of the report); RECURRING BIGRAM = adjacent pair inside one unit seen >= 2 times in the window.
// A token is VOID when its type is not a figure and it belongs to no recurring bigram. voidShare = void tokens / tokens; voidRescue = (non-figure tokens in a recurring bigram) / non-figure tokens.
import { windows, mean } from "./_phys_prep.mjs";

const WIN = 2000, FIG = 3, MIN_TOKENS = 2000, MIN_NONFIG = 50;

export function voidStats(P) {
  const res = { voidShare: null, voidRescue: null };
  if (P.N < MIN_TOKENS) return res;
  const ws = windows(P, WIN); if (!ws.length) return res;
  const wc = new Int32Array(P.V), share = [], rescue = [];
  for (const w of ws) {
    const nt = w.t1 - w.t0;
    for (let i = w.t0; i < w.t1; i++) wc[P.tid[i]]++;
    // bigram key at position i = pair (i, i+1) when both are in the same unit, else -1
    const bk = new Float64Array(nt).fill(-1); let m = 0;
    for (let u = w.u0; u < w.u1; u++) { const s = P.us[u], e = P.us[u + 1]; for (let i = s; i < e - 1; i++) { bk[i - w.t0] = P.tid[i] * P.V + P.tid[i + 1]; m++; } }
    const sorted = Float64Array.from(bk.filter((x) => x >= 0)).sort(), rec = new Set();
    for (let q = 0; q < sorted.length;) { let r = q + 1; while (r < sorted.length && sorted[r] === sorted[q]) r++; if (r - q >= 2) rec.add(sorted[q]); q = r; }
    let nonfig = 0, rescued = 0, voidN = 0;
    for (let u = w.u0; u < w.u1; u++) {
      const s = P.us[u], e = P.us[u + 1];
      for (let i = s; i < e; i++) {
        if (wc[P.tid[i]] >= FIG) continue;
        nonfig++;
        const cover = (i < e - 1 && rec.has(bk[i - w.t0])) || (i > s && rec.has(bk[i - 1 - w.t0]));
        if (cover) rescued++; else voidN++;
      }
    }
    for (let i = w.t0; i < w.t1; i++) wc[P.tid[i]] = 0;
    share.push(voidN / nt); if (nonfig >= MIN_NONFIG) rescue.push(rescued / nonfig);
  }
  res.voidShare = mean(share); res.voidRescue = rescue.length ? mean(rescue) : null;
  return res;
}

// laws/_para_lcs.mjs — lcsLift of FAMILY "para" (null: unit-order). ln( mean Dice-LCS of adjacent units / mean Dice-LCS of a far partner of identical capped length ).
// Fixed sample: eligible adjacent pairs (same document, both units len >= 3) taken by index stride, at most MAXP; units cut to their first CAP tokens. The far partner of the earlier unit a
// is a unit v of the same capped length as a (so the pair (v, u) has exactly the length pair of (a, u)), with |v - u| >= 30 units, chosen by a fixed integer hash of u (no rng state).
const MAXP = 4000, CAP = 24, MIN_PAIRS = 200;
const row0 = new Int16Array(CAP + 1), row1 = new Int16Array(CAP + 1);

function dice(ids, sa, la, sb, lb) {
  let prev = row0, cur = row1; prev.fill(0, 0, lb + 1);
  for (let i = 1; i <= la; i++) {
    const x = ids[sa + i - 1]; cur[0] = 0;
    for (let j = 1; j <= lb; j++) cur[j] = x === ids[sb + j - 1] ? prev[j - 1] + 1 : (prev[j] > cur[j - 1] ? prev[j] : cur[j - 1]);
    const t = prev; prev = cur; cur = t;
  }
  return (2 * prev[lb]) / (la + lb);
}

export function lcsLift(P) {
  const { nU, docOf, start, ids } = P, cl = (u) => Math.min(start[u + 1] - start[u], CAP);
  const elig = [];
  for (let u = 1; u < nU; u++) if (docOf[u] === docOf[u - 1] && start[u + 1] - start[u] >= 3 && start[u] - start[u - 1] >= 3) elig.push(u);
  if (elig.length < MIN_PAIRS) return null;
  const byLen = new Map();
  for (let u = 0; u < nU; u++) { const l = cl(u); let b = byLen.get(l); if (!b) byLen.set(l, (b = [])); b.push(u); }
  const stride = Math.ceil(elig.length / MAXP); let sAdj = 0, sBase = 0, n = 0;
  for (let q = 0; q < elig.length; q += stride) {
    const u = elig[q], a = u - 1, bucket = byLen.get(cl(a)); let v = -1;
    const r0 = (Math.imul(u + 1, 0x9e3779b1) >>> 0) % bucket.length;
    for (let t = 0; t < 12; t++) { const w = bucket[(r0 + t * 7919) % bucket.length]; if (Math.abs(w - u) >= 30) { v = w; break; } }
    if (v < 0) continue;
    sAdj += dice(ids, start[a], cl(a), start[u], cl(u)); sBase += dice(ids, start[v], cl(v), start[u], cl(u)); n++;
  }
  return n >= MIN_PAIRS && sAdj > 0 && sBase > 0 ? Math.log(sAdj / sBase) : null;
}

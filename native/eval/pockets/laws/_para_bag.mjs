// laws/_para_bag.mjs — bag-of-units statistics of FAMILY "para" (null: within-unit): refrain, dupShare, formulaCov, tmplReuse.
import { mix, key53 } from "./_para_prep.mjs";
const MIN_UNITS = 200;

function unitDup(P) {
  const { nU, start } = P, UK = P.unitKey(), seen = new Map(); let dup = 0, nLong = 0;
  for (let u = 0; u < nU; u++) { const k = UK[u]; seen.set(k, (seen.get(k) || 0) + 1); }
  let inRep = 0;
  for (let u = 0; u < nU; u++) if (start[u + 1] - start[u] >= 3) { nLong++; if (seen.get(UK[u]) >= 2) inRep++; }
  const first = new Set();
  for (let u = 0; u < nU; u++) { if (first.has(UK[u])) dup++; else first.add(UK[u]); }
  return { refrain: nLong >= MIN_UNITS ? inRep / nLong : null, dupShare: nU >= MIN_UNITS ? dup / nU : null };
}

function formula(P) { // share of tokens (in units with len >= 4) covered by within-unit 4-grams occurring >= 3 times
  const { nU, start } = P, K = P.keys(4), count = new Map(); let denom = 0, covered = 0;
  for (let i = 0; i < K.length; i++) if (K[i] >= 0) count.set(K[i], (count.get(K[i]) || 0) + 1);
  for (let u = 0; u < nU; u++) {
    if (start[u + 1] - start[u] < 4) continue;
    denom += start[u + 1] - start[u]; let reach = start[u] - 1;
    for (let i = start[u]; i + 4 <= start[u + 1]; i++) if (count.get(K[i]) >= 3) { const e = i + 3; covered += e - Math.max(reach, i - 1); reach = e; }
  }
  return denom >= 1000 ? covered / denom : null;
}

const WIN = 5; // template window: the first WIN tokens of a unit (the whole unit when it has 4 or 5 tokens)
function template(P) { // units with len >= 4 whose rank-bin sequence over the first min(len, WIN) tokens is shared with a unit that has a different multiset of tokens
  const { nU, start, ids, H1, H2 } = P, B = P.bins(), cls = new Map(), first = [], mixed = [], size = []; let nUnits = 0;
  for (let u = 0; u < nU; u++) {
    if (start[u + 1] - start[u] < 4) continue;
    const n = start[u + 1] - start[u], w = Math.min(n, WIN); nUnits++; let h1 = w, h2 = ~h1, b1 = n, b2 = ~n; // (h1,h2): hash of the window's bin sequence; (b1,b2): order-free hash of the WHOLE unit's token multiset
    for (let i = start[u]; i < start[u + 1]; i++) { b1 = (b1 + H1[ids[i]]) | 0; b2 = (b2 + H2[ids[i]]) | 0; if (i < start[u] + w) { h1 = mix(h1, B[ids[i]] + 1, 0x9e3779b1); h2 = mix(h2, B[ids[i]] + 101, 0x85ebca77); } }
    const bag = key53(b1, b2);
    const k = key53(h1, h2); let c = cls.get(k);
    if (c === undefined) { c = first.length; cls.set(k, c); first.push(bag); mixed.push(0); size.push(1); }
    else { size[c]++; if (first[c] !== bag) mixed[c] = 1; }
  }
  let inMixed = 0; for (let c = 0; c < size.length; c++) if (mixed[c]) inMixed += size[c];
  return nUnits >= MIN_UNITS ? inMixed / nUnits : null;
}

export function bagStats(P) { return { ...unitDup(P), formulaCov: formula(P), tmplReuse: template(P) }; }

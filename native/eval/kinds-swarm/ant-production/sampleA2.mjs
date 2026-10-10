// sampleA2.mjs — amendment A2 sampler (PREREG.md): NAME vs control(s) matched on corpus-count bin, position stratum, last/punct flags AND window-prefix mention class wc,
// every unit hearable (wc >= 1). wp: two controls per name (S = prior-settled NOUN, U = unseen non-cast form with <=1% capitalised non-initial occurrences — a LABEL use).
import { mulberry32, seedOf, isNameTag, typeClass, grammarOf } from "./lib.mjs";
import { docStarts } from "./sample.mjs";
const bin = (n) => Math.floor(Math.log2(n));
export function planA2(corpus, nNames, { unseenControls = false } = {}) {
  const { sents, M } = corpus, ds = docStarts(corpus), rnd = mulberry32(seedOf("planA2", corpus.name));
  const forms = grammarOf(corpus.language).posPrior.forms;
  const occ = new Map();
  sents.forEach((st, s) => st.forEach((t, i) => { if (!occ.has(t.w)) occ.set(t.w, []); occ.get(t.w).push([s, i]); }));
  const strat = (s, i) => { const st = sents[s]; return `${i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3}|${i === st.length - 1 ? 1 : 0}|${st[i].p ? 1 : 0}`; };
  const fine = corpus.name === "irc";
  const wcOf = (w, s, i) => { const lo = Math.max(ds[s], s - M); let n = 0; for (const [a, b] of occ.get(w)) { if (a < lo) continue; if (a > s || (a === s && b >= i)) break; n += 1; } return fine ? Math.min(4, Math.floor(Math.log2(Math.max(1, n)))) + 1 : Math.min(3, n); };
  const capShare = (w) => { const o = occ.get(w).filter(([s, i]) => i > 0); return o.length >= 3 ? o.filter(([s, i]) => sents[s][i].c).length / o.length : null; };
  const nameForms = [], S = [], U = [];
  for (const [w, o] of occ) {
    if (o.length < 5) continue;
    const cls = typeClass(corpus, w, o.map(([s, i]) => sents[s][i].g));
    if (cls === "NAME") nameForms.push(w);
    else if (cls === "NOUN") S.push(w);
    else if (unseenControls && !/['’]/.test(w) && !forms[w] && cls !== "AMBIG" && (fine || (capShare(w) ?? 1) <= 0.01)) U.push(w);
  }
  const elig = (w, onlyName) => occ.get(w).map(([s, i], k) => ({ s, i, k })).filter((o) => o.k >= 3 && o.s - ds[o.s] >= M && (!onlyName || isNameTag(corpus, sents[o.s][o.i].g)) && wcOf(w, o.s, o.i) >= 1);
  const mkPool = (list) => { const pool = new Map(); for (const w of list) for (const o of elig(w, false)) { const key = `${bin(occ.get(w).length)}|${strat(o.s, o.i)}|${wcOf(w, o.s, o.i)}`; if (!pool.has(key)) pool.set(key, new Map()); const m = pool.get(key); if (!m.has(w)) m.set(w, []); m.get(w).push(o); } return pool; };
  const poolS = mkPool(S), poolU = unseenControls ? mkPool(U) : null;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const names = nameForms.filter((w) => elig(w, true).length), units = [], used = new Set(); let guard = 0, dropped = 0;
  const unit = (pair, y, ctl, o, w) => ({ pair, y, ctl, s: o.s, i: o.i, w, strat: strat(o.s, o.i), cbin: bin(occ.get(w).length), wc: wcOf(w, o.s, o.i) });
  while (units.filter((u) => u.ctl === "N").length < nNames && guard++ < nNames * 80 && names.length) {
    const w = pick(names), o = pick(elig(w, true)), key = `${bin(occ.get(w).length)}|${strat(o.s, o.i)}|${wcOf(w, o.s, o.i)}`;
    if (used.has(`${o.s}:${o.i}`)) continue;
    const tryPool = (pool) => { const m = pool?.get(key); if (!m || !m.size) return null; const cw = pick([...m.keys()]), c = pick(m.get(cw)); return used.has(`${c.s}:${c.i}`) ? null : { cw, c }; };
    const s1 = tryPool(poolS), u1 = unseenControls ? tryPool(poolU) : null;
    if (!s1 || (unseenControls && !u1)) { dropped += 1; continue; }
    const pair = units.filter((u) => u.ctl === "N").length;
    used.add(`${o.s}:${o.i}`); used.add(`${s1.c.s}:${s1.c.i}`);
    units.push(unit(pair, 1, "N", o, w), unit(pair, 0, "S", s1.c, s1.cw));
    if (u1) { used.add(`${u1.c.s}:${u1.c.i}`); units.push(unit(pair, 0, "U", u1.c, u1.cw)); }
  }
  for (const u of units) u.block = corpus.name === "irc" ? corpus.docOf(u.s) : Math.min(9, Math.floor((u.s / sents.length) * 10));
  return { corpus: corpus.name, A2: true, M, nNames: units.filter((u) => u.ctl === "N").length, dropped, nameForms: nameForms.length, S: S.length, U: U.length, units };
}

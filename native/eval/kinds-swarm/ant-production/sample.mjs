// sample.mjs — matched-pair token sampler of ant-production (see PREREG.md "Sample"). NAME occurrence vs CONTROL occurrence matched EXACTLY on
// log2 bin of the form's corpus count, position stratum (i=0 / 1 / 2-3 / >=4), last-in-message flag, glued-punctuation-after flag. LATER = 4th occurrence on,
// window inside its document. Types drawn uniformly. Gold is used for labels only.
import { mulberry32, seedOf, isNameTag, typeClass } from "./lib.mjs";
const bin = (n) => Math.floor(Math.log2(n));
export function docStarts(corpus) {
  const out = []; let prev = null, start = 0;
  corpus.sents.forEach((_, k) => { const d = corpus.docOf(k); if (d !== prev) { start = k; prev = d; } out.push(start); });
  return out;
}
export function planPairs(corpus, nPairs, tag = "") {
  const { sents, M } = corpus, ds = docStarts(corpus), rnd = mulberry32(seedOf("plan", corpus.name, tag));
  const occ = new Map();
  sents.forEach((st, s) => st.forEach((t, i) => { if (!occ.has(t.w)) occ.set(t.w, []); occ.get(t.w).push([s, i]); }));
  const strat = (s, i) => { const st = sents[s]; return `${i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3}|${i === st.length - 1 ? 1 : 0}|${st[i].p ? 1 : 0}`; };
  const nameForms = [], ctlForms = [];
  for (const [w, o] of occ) {
    if (o.length < 5) continue;
    const gold = o.map(([s, i]) => sents[s][i].g);
    const cls = typeClass(corpus, w, gold);
    if (cls === "NAME") nameForms.push(w); else if (cls === "NOUN") ctlForms.push(w);
  }
  const eligible = (w, onlyName) => occ.get(w).map(([s, i], k) => ({ s, i, k })).filter((o) => o.k >= 3 && o.s - ds[o.s] >= M && (!onlyName || isNameTag(corpus, sents[o.s][o.i].g)));
  const pool = new Map(); // `${bin}|${strat}` -> Map(form -> occurrences)
  for (const w of ctlForms) for (const o of eligible(w, false)) {
    const key = `${bin(occ.get(w).length)}|${strat(o.s, o.i)}`;
    if (!pool.has(key)) pool.set(key, new Map());
    const m = pool.get(key); if (!m.has(w)) m.set(w, []); m.get(w).push(o);
  }
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const units = [], used = new Set(); let dropped = 0, guard = 0;
  const names = nameForms.filter((w) => eligible(w, true).length);
  while (units.length < nPairs * 2 && guard++ < nPairs * 60 && names.length) {
    const w = pick(names), o = pick(eligible(w, true));
    const key = `${bin(occ.get(w).length)}|${strat(o.s, o.i)}`, m = pool.get(key);
    if (!m || !m.size) { dropped += 1; continue; }
    const cw = pick([...m.keys()]), c = pick(m.get(cw));
    const uk = `${c.s}:${c.i}`; if (used.has(uk) || used.has(`${o.s}:${o.i}`)) continue;
    used.add(uk); used.add(`${o.s}:${o.i}`);
    const pair = units.length / 2 | 0;
    units.push({ pair, y: 1, s: o.s, i: o.i, w, strat: strat(o.s, o.i), cbin: bin(occ.get(w).length) }, { pair, y: 0, s: c.s, i: c.i, w: cw, strat: strat(c.s, c.i), cbin: bin(occ.get(cw).length) });
  }
  const nB = corpus.name === "irc" ? 6 : 10;
  for (const u of units) u.block = corpus.name === "irc" ? corpus.docOf(u.s) : Math.min(nB - 1, Math.floor((u.s / sents.length) * nB));
  return { corpus: corpus.name, M, nPairs: units.length / 2, dropped, nameForms: nameForms.length, ctlForms: ctlForms.length, units };
}

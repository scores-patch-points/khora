// atom-match.js — the atom verdict with a LEARNED matcher (PREREG run 20). The rules (atom-support.js) say a claim atom is met only when one
// source atom has the same predicate over the same referents, and a claim with an unread word is never supported; on real paraphrase that
// accepts almost nothing (run 19: 0 of 48). Here each claim atom is met by its best source atom under a linear score over what the rules
// measure (does the predicate meet, how many of its words, do the arguments meet, in order or at all, polarity, standing, the kinds of the
// two predicates), or else is LEFT ASIDE at a learned score of its own (an atom of a case word only, "of(a depth, 281 metres)"); an unread
// claim word is scored too, by whether the source sentence carries it. A claim is supported when every claim atom and every unread word
// scores above zero. Contradiction stays the rules' (a source atom of the other polarity). The weights come from pair labels only (E against
// not E), by a multiple-instance perceptron: the atom that most fails an E pair is pushed up, the one that least fails a non-E pair down.
//   matchUnits(C0, S, { claimLang, sourceLang, same, keysOf, unread, sourceText }) → { units: [{ what, options: [[feature…]…] }], rule }
//   matchVerdict(C0, S, opts, model) → { verdict, table, unread, rule }
//   trainMatcher([{ units, label }]) → model (AtomMatcher@1)
import { atomSupport, canonical, meeters, words, stem, argText, DEG } from "./atom-support.js";

const kind = (p) => (p === "is_a" ? "is_a" : p === "named" ? "named" : /^has_/.test(p) ? "has" : DEG.test(p) ? "deg" : String(p).split("_").every((w) => w.length <= 4) ? "case" : "verb");
const bucket = (x) => (x <= 0 ? "0" : x < 0.5 ? "lo" : x < 1 ? "hi" : "1");
const CJK = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u;

// cosine, in bands: the vectors' nearness is a feature only by band, so a weight is learned per band
const vb = (x) => (x == null ? "none" : x < 0.2 ? "0" : x < 0.35 ? "1" : x < 0.5 ? "2" : x < 0.65 ? "3" : "4");
export function matchUnits(C0, S, { claimLang = "en", sourceLang = "en", same = null, keysOf = null, unread = [], sourceText = "", vectors = null } = {}) {
  const rule = atomSupport(C0, S, { claimLang, sourceLang, same, keysOf, unread });
  const C = canonical(C0), M = meeters(C, S, { claimLang, sourceLang, same, keysOf });
  const lp = claimLang === sourceLang ? "same" : "cross";
  const memo = new Map(), V = (l, t) => { const k = l + "\u0000" + t; if (!memo.has(k)) memo.set(k, vectors?.vec(l, t) ?? null); return memo.get(k); };
  const cos = (x, y) => { if (!x || !y) return null; let s = 0; for (let d = 0; d < x.length; d++) s += x[d] * y[d]; return s; };
  const vs = (la, a, lb, b) => cos(V(la, a), V(lb, b));
  const units = [];
  C.forEach((c, i) => {
    const cargs = c.args ?? [], kc = kind(c.pred), cw = M.predWords(c.pred), ruleMet = rule.table[i]?.state === "met";
    const skip = [`skip:${kc}`, `skip:${kc}:n${cargs.length}`, `skip:${lp}`, `skip:rule=${ruleMet ? 1 : 0}`, ...(c.rewritten ? ["skip:rewritten"] : []), ...(c.from ? [`skip:from=${c.from}`] : []), "skip:bias"];
    const options = [skip];
    for (const s of S) {
      const sargs = s.args ?? [], ks = kind(s.pred), sw = M.predWords(s.pred), sa = sargs.flatMap((a) => words(argText(a)));
      const pm = M.predMeet(c.pred, s.pred), am = sargs.length >= cargs.length && M.argsMeet(cargs, sargs);
      const content = cw.filter((x) => x.length > 4 || CJK.test(x)), cws = content.length ? content : cw;
      const pw = cws.length ? cws.filter((x) => sw.some((y) => M.wordMeet(x, y))).length / cws.length : 0;
      const pwa = cws.length ? cws.filter((x) => sw.some((y) => M.wordMeet(x, y)) || sa.some((y) => M.wordMeet(x, y))).length / cws.length : 0;
      const af = cargs.length ? cargs.filter((a) => sargs.some((b) => M.refMeet(a, b))).length / cargs.length : 0;
      const a0 = cargs.length && sargs.some((b) => M.refMeet(cargs[0], b)) ? 1 : 0;
      const pol = !!c.neg === !!s.neg ? "same" : "diff", st = M.standing(c, s) ? 1 : 0;
      const f = [`pm=${pm ? 1 : 0}`, `am=${am ? 1 : 0}`, `pm&am=${pm && am ? 1 : 0}`, `pw=${bucket(pw)}`, `pwa=${bucket(pwa)}`, `af=${bucket(af)}`, `a0=${a0}`,
        `pol=${pol}`, `st=${st}`, `k=${kc}>${ks}`, `k=${kc}:pm=${pm ? 1 : 0}:af=${bucket(af)}`, `k=${kc}:pw=${bucket(pwa)}:a0=${a0}`, `n=${cargs.length}>${sargs.length}`,
        `lp=${lp}:pm&am=${pm && am ? 1 : 0}`, `lp=${lp}:pw=${bucket(pwa)}:af=${bucket(af)}`, `rule=${ruleMet && rule.table[i]?.by === s ? 1 : 0}`, ...(s.from ? [`sfrom=${s.from}`] : []), "bias"];
      if (vectors) {
        // the predicates' nearness; each claim predicate word's best nearness to a source predicate or argument word; the arguments'
        const pv = vs(claimLang, cw.join(" "), sourceLang, sw.join(" "));
        const wv = cws.length ? cws.map((x) => Math.max(-1, ...[...sw, ...sa].map((y) => vs(claimLang, x, sourceLang, y) ?? -1))).reduce((a, b) => a + b, 0) / cws.length : null;
        const av = cargs.length ? cargs.map((a) => Math.max(-1, ...sargs.map((b) => (M.refMeet(a, b) ? 1 : vs(claimLang, argText(a), sourceLang, argText(b)) ?? -1)))).reduce((a, b) => a + b, 0) / cargs.length : null;
        f.push(`pv=${vb(pv)}`, `wv=${vb(wv)}`, `av=${vb(av)}`, `pv=${vb(pv)}:af=${bucket(af)}`, `wv=${vb(wv)}:a0=${a0}`, `k=${kc}:pv=${vb(pv)}`, `k=${kc}:wv=${vb(wv)}:av=${vb(av)}`, `lp=${lp}:wv=${vb(wv)}:av=${vb(av)}`);
      }
      options.push(f);
    }
    units.push({ what: c.text ?? `${c.pred}(${cargs.map(argText).join(", ")})`, atom: c, options, sources: [null, ...S] });
  });
  // an unread claim word: does the source sentence carry it (the same stem, or a word that meets it by synonym or key)?
  const sws = words(sourceText);
  for (const u of unread) {
    const inS = sws.some((y) => stem(y) === stem(u)), meet = !inS && sws.some((y) => M.wordMeet(u, y));
    const uv = vectors && !inS && !meet ? Math.max(-1, ...sws.map((y) => vs(claimLang, u, sourceLang, y) ?? -1)) : null;
    const f = [...(vectors ? [`u:vec=${inS || meet ? "in" : vb(uv)}`, `u:${lp}:vec=${inS || meet ? "in" : vb(uv)}`] : []), `u:in=${inS ? 1 : 0}`, `u:meet=${meet ? 1 : 0}`, `u:cap=${/^\p{Lu}/u.test(u) ? 1 : 0}`, `u:num=${/\d/.test(u) ? 1 : 0}`, `u:${lp}:in=${inS || meet ? 1 : 0}`, "u:bias"];
    units.push({ what: `unread:${u}`, options: [f] });
  }
  return { units, rule };
}
const score = (f, w) => f.reduce((a, x) => a + (w[x] ?? 0), 0);
const best = (u, w) => { let bi = 0, bv = -Infinity; u.options.forEach((f, i) => { const v = score(f, w); if (v > bv) { bv = v; bi = i; } }); return { i: bi, v: bv }; };
// the pair is supported when its weakest unit is above zero
export function decide(units, w) {
  if (!units.length) return { ok: false, weakest: null };
  let weakest = null; for (const u of units) { const b = best(u, w); if (!weakest || b.v < weakest.v) weakest = { u, ...b }; }
  return { ok: weakest.v > 0, weakest };
}
export function matchVerdict(C0, S, opts, model) {
  const { units, rule } = matchUnits(C0, S, opts);
  if (rule.verdict === "C") return { verdict: "C", table: rule.table, unread: rule.unread, rule };
  const w = model?.w ?? {}, d = decide(units, w);
  const table = units.filter((u) => u.atom).map((u) => { const b = best(u, w); return { atom: u.atom, state: b.v > 0 ? (b.i === 0 ? "aside" : "met") : "unmet", by: b.i ? u.sources[b.i] : null, score: +b.v.toFixed(3) }; });
  return { verdict: d.ok ? "E" : "N", table, unread: rule.unread, rule };
}
// examples: [{ units, label }] with label "E" or not; margin 1 on each side
export function trainMatcher(examples, { epochs = 12, seed = 7, margin = 1, negWeight = 1 } = {}) {
  const w = {}, tot = {}, ts = {}; let t = 0, r = seed;
  const rand = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const upd = (fs, d) => { for (const x of fs) { tot[x] = (tot[x] ?? 0) + (t - (ts[x] ?? 0)) * (w[x] ?? 0); ts[x] = t; w[x] = (w[x] ?? 0) + d; } };
  for (let ep = 0; ep < epochs; ep++) for (const ex of [...examples].sort(() => rand() - 0.5)) {
    if (!ex.units.length) continue;
    t++;
    const d = decide(ex.units, w), { u, i, v } = d.weakest;
    if (ex.label === "E") { if (v <= margin) upd(u.options[i], 1); } // the weakest unit of a supported claim, its best option, up
    else if (v > -margin) { for (const uu of ex.units) { const b = best(uu, w); if (b.v > -margin) { upd(uu.options[b.i], -negWeight / ex.units.length); } } } // every passing unit of an unsupported claim, a share down
  }
  const avg = {}; for (const x of Object.keys(w)) { const a = ((tot[x] ?? 0) + (t - (ts[x] ?? 0)) * w[x]) / Math.max(1, t); if (Math.abs(a) > 1e-9) avg[x] = +a.toFixed(5); }
  return { schema: "AtomMatcher@1", w: avg };
}

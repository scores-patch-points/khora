// explore-nonen.mjs — EXPLORATORY scope probe (NOT part of the registered verdict; written after results/irc.json and results/robust.json existed).
// QUESTION: does the R2 score (INIT_Tinf >= 2 at the FIRST mention of a form) separate nicknames from matched ordinary forms in NON-English IRC (de / es / it), where the registered confirm set has only 4 matched pairs?
// METHOD: same score, gold, controls, variants (M4 -> M8 -> strict) and cell criteria a-e as the registered test; the ONLY change is the matcher: negatives are POOLED across the days of the same group (channel / language)
//   and matched on (within-message index bucket, quarter-octave whole-day count, char length, message-length bucket, floor(log2 day message count)); each score is still computed inside its own day.
// DATA: all 32 non-English channel-days (de 11, es 10, it 11). They are TOUCHED: the scoper scored 26 non-EN confirm pairs (0.635) and used non-EN discovery days; 8 of them are my tiny registered days. So this is a
//   scope description, never a confirmation. EQUIVALENCE CONTROL E2: the same pooled matcher on the 26 registered EN days must give an AUC within 0.04 of the registered 0.6845, else the pooled matcher is not trusted.
// BLIND PREDICTIONS: E2 EN pooled AUC in [0.645, 0.725]; NONEN pooled AUC in [0.58, 0.72]; each of de, es, it in [0.55, 0.75]; NONEN wordshuf drop >= 0.05; NONEN beyond CNT_Tinf >= 0.58;
//   NONEN controls in band after variant fallback; day-size control AUC (log2 day messages) in [0.45, 0.55].
import fs from "node:fs";
import { createHash } from "node:crypto";
import { loadIrc, rngOf, shuffleIn, round } from "./lib.mjs";
import { buildIx, scoresAt, ibk, clb, mlb } from "./ix.mjs";
import { pAuc, ctlOf, bootPairs } from "./stats.mjs";
import { evalCell } from "./cells.mjs";
const SELF = fs.readFileSync(new URL(import.meta.url), "utf8").split("\n"), HEAD = createHash("sha256").update(SELF.slice(0, 11).join("\n")).digest("hex");
const DAYS = JSON.parse(fs.readFileSync(new URL("./days.json", import.meta.url), "utf8")), ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
const nonEn = ["ubuntu-de", "ubuntu-es", "ubuntu-it"].flatMap((c) => fs.readdirSync(`${ROOT}/${c}`).filter((f) => f.endsWith(".txt")).sort().map((f) => `${c}/${f}`));
const tagOf = (d) => ({ day: d.key, channel: d.channel, lang: d.lang, era: d.era, size: d.nMsg >= 5000 ? "big" : "small" });
function pooled(docs, Q, tag, cap = 400) {
  const rnd = rngOf("R2explore", tag, Q), P = [], pool = new Map();
  for (const d of docs) { const ix = d.ix ?? (d.ix = buildIx(d.T)), seen = new Set(), db = Math.floor(Math.log2(d.nMsg));
    d.T.forEach((m, k) => m.forEach((w, i) => { if (seen.has(w)) return; seen.add(w); const c = d.label(k, i, w); if (!c) return; const o = { d, ix, m: k, i, w, len: m.length, key: [ibk(i), Math.floor(Q * Math.log2(ix.count.get(w))), clb(w), mlb(m.length), db].join("|") }; if (c === "P") P.push(o); else (pool.get(o.key) ?? pool.set(o.key, []).get(o.key)).push(o); })); }
  for (const a of pool.values()) shuffleIn(a, rnd); const rec = (o) => ({ w: o.w, m: o.m, i: o.i, len: o.len, cl: [...o.w].length, lc: Math.log2(o.ix.count.get(o.w)), ld: Math.log2(o.d.nMsg), ...scoresAt(o.ix, o.m, o.i, o.w) });
  const per = new Map(), out = []; let dropped = 0;
  for (const p of shuffleIn(P, rnd)) { if ((per.get(p.d.key) ?? 0) >= cap) continue; const a = pool.get(p.key); if (!a?.length) { dropped++; continue; } per.set(p.d.key, (per.get(p.d.key) ?? 0) + 1); const q = a.pop(); const pr = { pos: rec(p), neg: rec(q), ...tagOf(p.d) }; pr.init = pr.pos.i === 0; out.push(pr); }
  return { pairs: out, dropped, nPos: P.length };
}
const groups = { EN: DAYS.confirmSet.EN, de: nonEn.filter((k) => k.startsWith("ubuntu-de")), es: nonEn.filter((k) => k.startsWith("ubuntu-es")), it: nonEn.filter((k) => k.startsWith("ubuntu-it")) };
const OUT = { note: "exploratory; see header", headerSha256: HEAD, groups: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])), cov: {}, cells: {} }, sets = { real: { 4: [], 8: [] }, wordshuf: { 4: [], 8: [] }, msgshuf: { 4: [], 8: [] } };
for (const mode of ["real", "wordshuf", "msgshuf"]) for (const [g, keys] of Object.entries(groups)) { const docs = keys.map((k) => loadIrc(k, mode)); for (const Q of [4, 8]) { const r = pooled(docs, Q, g + mode); sets[mode][Q].push(...r.pairs); if (mode === "real") OUT.cov[`${g}|Q${Q}`] = { pairs: r.pairs.length, dropped: r.dropped, nPos: r.nPos }; } }
const C = { EN_pooledMatcher: (p) => p.lang === "en", NONEN_ALL: (p) => p.lang !== "en", NONEN_de: (p) => p.channel === "ubuntu-de", NONEN_es: (p) => p.channel === "ubuntu-es", NONEN_it: (p) => p.channel === "ubuntu-it", NONEN_INIT: (p) => p.lang !== "en" && p.init, NONEN_NONINIT: (p) => p.lang !== "en" && !p.init, NONEN_big: (p) => p.lang !== "en" && p.size === "big", NONEN_small: (p) => p.lang !== "en" && p.size === "small" };
for (const [n, f] of Object.entries(C)) { const c = evalCell(sets, f); OUT.cells[n] = c; const pr = sets.real[4].filter(f); OUT.cells[n].ldControl = pr.length ? round(pAuc(pr, "ld")) : null; process.stderr.write(`${n}: ${c.variant} n=${c.n} auc=${c.auc} ci=${c.ci} holds=${c.holds} core=${c.core} wsh=${c.wordshuf?.auc} bey=${c.beyondCNT_Tinf?.auc}\n`); }
OUT.reportOnly = {}; for (const [n, f] of Object.entries({ NONEN_de: C.NONEN_de, NONEN_es: C.NONEN_es, NONEN_NONINIT: C.NONEN_NONINIT })) { const ps = sets.real[4].filter(f); OUT.reportOnly[n] = { n: ps.length, days: new Set(ps.map((p) => p.day)).size, ctl: ctlOf(ps), auc: round(pAuc(ps, "INIT_Tinf")), ci: bootPairs(ps, "INIT_Tinf", 1000, "ro" + n), note: "n < 60: descriptive only" }; }
OUT.equivalence = { registeredEN: 0.6845, pooledEN: OUT.cells.EN_pooledMatcher.auc, within04: Math.abs((OUT.cells.EN_pooledMatcher.auc ?? 9) - 0.6845) <= 0.04 };
fs.writeFileSync(new URL("./results/explore-nonen.json", import.meta.url), JSON.stringify(OUT, null, 1)); console.log(JSON.stringify({ equivalence: OUT.equivalence, cov: OUT.cov }));

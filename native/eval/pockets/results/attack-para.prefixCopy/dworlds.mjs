// dworlds.mjs -- planted worlds for ATTACK D on para.prefixCopy. NONE of them has unit-to-unit copying (no anaphora mechanism): units are independent given a document-level or length-level state, or follow a
// no-repeat rule.  Built with the repo's planted machinery (loaders/_planted-core.mjs: lexicon A, Zipf draws, document buffer), seeds namespace "attackD".  Each world: 100 documents of ~1000 tokens.
import { rngOf, seedOf } from "../../lib/pocket.mjs";
import { V, drawCdf, cdfOf, zipfW, makeLen, buildDocs, lexicon } from "../../loaders/_planted-core.mjs";
const D1 = makeLen("D1"), D2 = makeLen("D2"), LOGMU = Math.log(9), LOGSD = 0.55;
const zcache = new Map(), zipf = (s) => { if (!zcache.has(s)) zcache.set(s, cdfOf(zipfW(V, s))); return zcache.get(s); };
const pairsOf = (tag, M) => { const r = rngOf(seedOf("attackD", "pairs", tag)), out = []; for (let i = 0; i < M; i++) out.push([8 + Math.floor(r() * 2000), 8 + Math.floor(r() * 2000)]); return out; };
const body = (rng, L, cdf, open) => { const u = open ? open.slice() : []; while (u.length < L) u.push(drawCdf(cdf, rng())); return u.slice(0, Math.max(L, open ? open.length : 0)); };
const gauss = (rng) => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
export const WORLDS = [];
const add = (id, lexTag, docMaker, notes) => WORLDS.push({ id, lexTag, docMaker, notes });
// D0: iid Zipf worlds, exponent x length law (no structure at all)
for (const s of [0.8, 1.0, 1.3, 1.6]) for (const [ln, LEN] of [["D1", D1], ["D2", D2]]) for (const rep of [0, 1])
  add(`d-null-s${s}-${ln}-r${rep}`, rep ? "B" : "A", (rng) => () => body(rng, LEN(rng), zipf(s), null), `iid Zipf(${s}) units ${ln}, no structure`);
// D1: unit openers iid from M fixed opener pairs (low opener entropy, same everywhere): raw collision rate high, no adjacency, no document effect
for (const M of [10, 30, 300]) { const P = pairsOf(`open${M}`, M); add(`d-opener-M${M}`, "A", (rng) => () => body(rng, D1(rng), zipf(1.0), P[Math.floor(rng() * M)]), `opener pair iid uniform over ${M} pairs; no adjacency, no doc state`); }
// D2: per-document CAST of K opener pairs (out of M=300); each unit draws its opener iid from the document's cast: units independent given the document
for (const K of [3, 10, 30]) { const P = pairsOf("cast300", 300); add(`d-cast-K${K}`, "A", (rng) => { const cast = []; for (let k = 0; k < K; k++) cast.push(P[Math.floor(rng() * 300)]); return () => body(rng, D1(rng), zipf(1.0), cast[Math.floor(rng() * K)]); }, `document cast of ${K} opener pairs, units iid given the document`); }
// D3: opener pool depends on the unit's length class (short <= 8, long > 8: 8 pairs each); lengths AR(1) in log space with correlation rho inside the document; rho = 0 is the control
for (const rho of [0, 0.8, 0.95]) { const PS = pairsOf("lenS", 8), PL = pairsOf("lenL", 8);
  add(`d-lencoup-rho${rho}`, "A", (rng) => { let x = LOGMU + LOGSD * gauss(rng); return () => { x = LOGMU + rho * (x - LOGMU) + Math.sqrt(1 - rho * rho) * LOGSD * gauss(rng); const L = Math.max(2, Math.min(45, Math.round(Math.exp(x)))); const P = L <= 8 ? PS : PL; return body(rng, L, zipf(1.0), P[Math.floor(rng() * 8)]); }; }, `opener pool by length class, log-length AR(1) rho=${rho}, no copying`); }
// D4: refractory openers: K=6 pairs, the next opener is uniform over the other 5 (no immediate repeat)
{ const P = pairsOf("refr", 6); add("d-refract-K6", "A", (rng) => { let last = -1; return () => { let k; do k = Math.floor(rng() * 6); while (k === last); last = k; return body(rng, D1(rng), zipf(1.0), P[k]); }; }, "6 opener pairs, no immediate repeat"); }
export function build(w) { const { units, docOf } = buildDocs(w.id, 100, w.docMaker, lexicon(w.lexTag)); return { id: w.id, group: "xd", register: "planted", language: "zxx", script: "latn", units, docOf, meta: { notes: w.notes } }; }

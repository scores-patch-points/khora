// scene/worlds-bridge.mjs — THE BRIDGE AT REFERENTS AND WORLDS, not words.  (2026-10-14)
//
//   node eval/the-fold/scene/worlds-bridge.mjs --file <text path> [--foundation foundation-weft] [--text liberal-arts-weft]
//
// "It's not about sharing words, it's about sharing referents and worlds" (the user, 2026-10-14). Matching the Republic's
// "the State may be unjust" to a TRC witness by the word "state" or "unjust" is the failure read-with-priors.mjs measured
// (0 of 295) and kinds-bridge.mjs confirmed (its shuffled-company null reaches Jaccard 1.0 on small companies: no kind clears
// it). What carries across is not a lexeme. It is:
//
//   A WORLD   — one document: the universe in which its referents exist and its acts were done (a hearing, a dialogue). Worlds
//               are compared as wholes, by WHAT HAPPENS IN THEM — the distribution of acts (the cube's operators) and their
//               signs — not by what they are called.
//   A REFERENT — a being with an identity INSIDE its world (all of a world's mentions of "the State" are one referent there).
//               Across worlds a referent is not identified by name; it is identified by the ROLE it plays: what it does
//               (end1 of an act) and what it undergoes (end2), which act, which sign. A "ruler" and "the apartheid state" share
//               a kind when they do and undergo the same acts under the same signs in worlds that are themselves alike.
//
// The acts are typed by the received act prior (janus/priors/act-prior-en.json — VerbNet, giver named, each verb's operator and
// standing) and signed by the EVA records of the transformation store. Nothing here compares a word to a word: the connector is
// reduced to its operator, the ends to their role.
//
// THREE STEPS, each against a born null (permutation, seeded; nothing typed in):
//   1. WORLDS ALIKE — the text's world signature (centred act × sign distribution) against every foundation world's; a foundation
//      world is comparable only if its cosine exceeds the best that any of N shuffled-act re-signatures produced.
//   2. REFERENTS ALIKE — within comparable worlds, a text referent matches a foundation referent when their centred role profiles'
//      cosine exceeds the best cosine its role profile reaches after the profiles are permuted among the text's own referents.
//   3. THE RECORD — each match is quoted at both addresses: the arrangement in the text (end1 -act-> end2, sign) and the
//      foundation's, with the sentences re-expanded from the corpus bytes. A person judges; the code only licenses.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "../../../the-fold/weft-store.mjs";

const FOLD = "/Users/mlacy/Documents/3.0/the-fold";
const { contentStems } = await import(path.join(FOLD, "fold-chat-foundation.js"));
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const FILE = opt("--file", null);
const CONTROL = opt("--control-layer", null);   // positive control: take one foundation world of this layer as the "text"
const FSTORE = path.resolve(HERE, opt("--foundation", "foundation-weft"));
const TSTORE = path.resolve(HERE, opt("--text", "liberal-arts-weft"));
const SEED = 20261014, DRAWS = 100;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);

// ── acts: a connector's operator, from the received act prior ──────────────────────────────────────────────────────
const act = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/act-prior-en.json", "utf8")).forms;
const pos = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-eng.json", "utf8")).forms;
const domClass = (w) => { const c = pos[w]; if (!c) return ""; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
const lemOf = (w) => { for (const c of [w, w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"), w.replace(/ied$/, "y"), w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""), w.replace(/(.)\1ing$/, "$1"), w.replace(/(.)\1ed$/, "$1")]) if (act[c]) return c; return null; };
const OPS = ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"];
const opOf = (label) => {
  const toks = String(label ?? "").toLowerCase().match(/[a-z']+/g) ?? [];
  const verbs = toks.filter((t) => domClass(t) === "VERB");                 // content verbs only; "of", "in", "a" are not acts
  for (const v of verbs.reverse()) { const k = lemOf(v); if (k) { const f = act[k]; return f.op ?? f.candidates?.[0]?.op ?? null; } }
  return null;
};
const F_DIM = OPS.length * 2 * 2;                                          // position (agent/patient) × operator × sign
const dim = (p, op, neg) => (p * OPS.length + OPS.indexOf(op)) * 2 + (neg ? 1 : 0);

// ── worlds and referents from the transformation records ───────────────────────────────────────────────────────────
const keyOf = (s) => contentStems(String(s ?? "")).join(" ");
function worldsOf(passes) {
  const worlds = new Map();                                                // file → { refs: Map(key → { vec, n, ex }) , sig, acts }
  for (const l of passes) {
    const neg = new Set(l.eva.filter((v) => v[0] === "con").map((v) => v[1]));
    let w = worlds.get(l.a); if (!w) worlds.set(l.a, (w = { file: l.a, layer: l.l, refs: new Map(), acts: 0 }));
    l.con.forEach((c, i) => {
      const op = opOf(c[1]); if (!op) return;                              // an untyped connector is no act we can name
      const a = keyOf(c[0]), b = keyOf(c[2]); if (!a || !b || a === b) return;
      const isNeg = neg.has(i); w.acts += 1;
      const add = (k, p) => { let r = w.refs.get(k); if (!r) w.refs.set(k, (r = { vec: new Float64Array(F_DIM), n: 0, ex: [] })); r.vec[dim(p, op, isNeg)] += 1; r.n += 1; if (r.ex.length < 3) r.ex.push({ at: c[3], label: c[1], other: p === 0 ? c[2] : c[0], neg: isNeg, role: p === 0 ? "does" : "undergoes" }); };
      add(a, 0); add(b, 1);
    });
  }
  return worlds;
}
const fPasses = openStore(FSTORE).passes();
const tPasses = openStore(TSTORE).passes().filter((l) => !FILE || l.a === FILE);
let FW = worldsOf(fPasses), TW = worldsOf(tPasses);
if (CONTROL) {                                    // POSITIVE CONTROL: a foundation world of the same layer is held out and read against the rest
  const cands = [...FW.values()].filter((w) => w.layer === CONTROL && w.acts >= 30).sort((a, b) => b.acts - a.acts);
  const held = cands[Math.min(2, cands.length - 1)];
  if (!held) { console.log(`no ${CONTROL} world with enough typed acts`); process.exit(0); }
  FW = new Map([...FW].filter(([f]) => f !== held.file)); TW = new Map([[held.file, held]]);
  console.log(`CONTROL: holding out ${path.basename(held.file)} (${held.layer}, ${held.acts} typed acts)`);
}
const sigOf = (w) => { const s = new Float64Array(F_DIM); for (const r of w.refs.values()) for (let i = 0; i < F_DIM; i++) s[i] += r.vec[i]; return s; };
for (const w of [...FW.values(), ...TW.values()]) w.sig = sigOf(w);
console.log(`foundation worlds with typed acts: ${[...FW.values()].filter((w) => w.acts >= 5).length} of ${FW.size} · text worlds: ${TW.size} (typed acts ${[...TW.values()].map((w) => w.acts).join(",")})`);

// centring: subtract the foundation's overall distribution so the corpus-wide mass (everyone "says" and "connects") cancels
const total = new Float64Array(F_DIM); let tn = 0;
for (const w of FW.values()) for (let i = 0; i < F_DIM; i++) total[i] += w.sig[i];
for (const x of total) tn += x;
const mean = total.map((x) => x / (tn || 1));
const unit = (v) => { let s = 0; for (const x of v) s += x * x; const r = Math.sqrt(s) || 1; return v.map((x) => x / r); };
const centred = (v) => { let s = 0; for (const x of v) s += x; return unit(v.map((x, i) => (s ? x / s : 0) - mean[i])); };
const cos = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] * b[i]; return d; };

// ── 1. worlds alike ──────────────────────────────────────────────────────────────────────────────────────────────────
const foundationWorlds = [...FW.values()].filter((w) => w.acts >= 5);
const textWorld = [...TW.values()].reduce((best, w) => (!best || w.acts > best.acts ? w : best), null);
if (!textWorld || textWorld.acts < 5) { console.log("the text has too few typed acts to be a world the act prior can speak to"); process.exit(0); }
const tSig = centred(textWorld.sig);
const worldScore = foundationWorlds.map((w) => ({ w, s: cos(tSig, centred(w.sig)) }));
// the null: break the JOINT of position x operator x sign — the arrangement under test — while keeping each marginal. The three
// coordinates of every incidence are shuffled independently of one another, so the world keeps how often it acts, how often it
// is negated and how often each operator occurs, and loses WHO does WHICH act under WHICH sign. (A first version shuffled the
// order of whole cells, which cannot change a count; the positive controls caught it: real == bar to three decimals.)
let worldBar = -1;
const incid = [];                                                           // [position, opIndex, neg] per incidence in the text world
for (const r of textWorld.refs.values()) for (let i = 0; i < F_DIM; i++) for (let k = 0; k < r.vec[i]; k++) { const neg = i % 2, rest = Math.floor(i / 2); incid.push([Math.floor(rest / OPS.length), rest % OPS.length, neg]); }
const shuf = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
for (let d = 0; d < DRAWS; d++) {
  const P = shuf(incid.map((x) => x[0])), O = shuf(incid.map((x) => x[1])), N = shuf(incid.map((x) => x[2]));
  const v = new Float64Array(F_DIM); for (let t = 0; t < incid.length; t++) v[(P[t] * OPS.length + O[t]) * 2 + N[t]] += 1;
  const cv = centred(v); let best = -1; for (const { w } of worldScore) { const s = cos(cv, centred(w.sig)); if (s > best) best = s; }
  if (best > worldBar) worldBar = best;
}
const comparable = worldScore.filter((x) => x.s > worldBar).sort((a, b) => b.s - a.s);
console.log(`worlds alike: best real cosine ${Math.max(...worldScore.map((x) => x.s)).toFixed(3)} · bar (best any of ${DRAWS} shuffled re-signatures reached) ${worldBar.toFixed(3)} · comparable worlds ${comparable.length}`);

// ── 2. referents alike, inside comparable worlds ───────────────────────────────────────────────────────────────────
const tRefs = [...textWorld.refs.entries()].filter(([, r]) => r.n >= 2);
const pool = [];                                                           // foundation referents in comparable worlds
for (const { w } of comparable) for (const [k, r] of w.refs) if (r.n >= 2) pool.push({ w, k, r, c: centred(r.vec) });
const best = (c) => { let b = -1, bi = -1; for (let i = 0; i < pool.length; i++) { const s = cos(c, pool[i].c); if (s > b) { b = s; bi = i; } } return [b, bi]; };
const tC = tRefs.map(([, r]) => centred(r.vec));
const real = tC.map((c) => best(c));
// the null: the text's role profiles permuted among its own referents' incidences — each profile redrawn from the text's own pool of acts
const flatAll = []; for (const [, r] of tRefs) for (let i = 0; i < F_DIM; i++) for (let k = 0; k < r.vec[i]; k++) flatAll.push(i);
let refBar = -1;
if (pool.length) for (let d = 0; d < 30; d++) {
  for (const [, r] of tRefs.slice(0, 40)) { const v = new Float64Array(F_DIM); for (let k = 0; k < r.n; k++) v[flatAll[Math.floor(rnd() * flatAll.length)]] += 1; const [b] = best(centred(v)); if (b > refBar) refBar = b; }
}
const matched = tRefs.map(([k, r], i) => ({ k, r, s: real[i][0], f: pool[real[i][1]] })).filter((m) => m.f && m.s > refBar);
console.log(`referents: text ${tRefs.length} with ≥2 typed incidences · foundation referents in comparable worlds ${pool.length} · bar ${refBar.toFixed(3)} · text referents matched above it ${matched.length}`);

// ── 3. the record ──────────────────────────────────────────────────────────────────────────────────────────────────────
const sentenceAt = (file, at) => { try { const b = fs.readFileSync(file).subarray(at, at + 900).toString("utf8"); const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(b); return (m ? m[0] : b.split(/\n/)[0].slice(0, 300)).replace(/\s+/g, " ").trim(); } catch { return ""; } };
const roleLine = (r) => { const tops = [...r.vec].map((v, i) => [v, i]).filter(([v]) => v > 0).sort((a, b) => b[0] - a[0]).slice(0, 3); return tops.map(([v, i]) => { const neg = i % 2, rest = Math.floor(i / 2), op = OPS[rest % OPS.length], p = Math.floor(rest / OPS.length); return `${p === 0 ? "does" : "undergoes"} ${op}${neg ? "(NEG)" : ""}×${v}`; }).join(", "); };
const pairs = matched.sort((a, b) => b.s - a.s).slice(0, 25).map((m) => ({
  cosine: +m.s.toFixed(3),
  text: { referent: m.k, roles: roleLine(m.r), at: m.r.ex.map((e) => ({ sentence: sentenceAt(textWorld.file, e.at), act: `${e.role} "${e.label}"${e.neg ? " (NEG)" : ""}` })) },
  foundation: { referent: m.f.k, world: path.basename(m.f.w.file), layer: m.f.w.layer, roles: roleLine(m.f.r), at: m.f.r.ex.map((e) => ({ sentence: sentenceAt(m.f.w.file, e.at), act: `${e.role} "${e.label}"${e.neg ? " (NEG)" : ""}` })) },
}));
const report = {
  schema: "WorldsBridge@1", at: new Date().toISOString(), seed: SEED, file: textWorld.file,
  foundation: { passes: fPasses.length, worldsWithTypedActs: foundationWorlds.length },
  worlds: { textTypedActs: textWorld.acts, bestCosine: Math.max(...worldScore.map((x) => x.s)), bar: worldBar, comparable: comparable.length, top: comparable.slice(0, 8).map((x) => ({ world: path.basename(x.w.file), layer: x.w.layer, cosine: +x.s.toFixed(3) })) },
  referents: { textReferents: tRefs.length, poolInComparableWorlds: pool.length, bar: refBar, matched: matched.length },
  pairs, limits: "acts typed for the ~26% of connectors the act prior types; a role is position × operator × sign; worlds are documents; the bars are permutation nulls, not significance tests; similarity of role is not sameness of meaning",
};
const out = path.join(HERE, CONTROL ? `worlds-bridge-control-${CONTROL}.json` : "worlds-bridge-report.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
if (CONTROL) {
  const baseRate = foundationWorlds.filter((w) => w.layer === CONTROL).length / foundationWorlds.length;
  const top = comparable.slice(0, 20); const same = top.filter((x) => x.w.layer === CONTROL).length;
  console.log(`CONTROL result: ${comparable.length} comparable worlds; of the top ${top.length}, ${same} are the same layer (base rate ${(100 * baseRate).toFixed(0)}%)`);
}
console.log("\ncomparable foundation worlds (the text's world is most like):");
for (const x of report.worlds.top.slice(0, 5)) console.log(`  ${x.cosine}  [${x.layer}] ${x.world}`);
for (const p of pairs.slice(0, 5)) {
  console.log(`\nTEXT  "${p.text.referent}"  ${p.text.roles}\n      ${p.text.at[0]?.act}: "${(p.text.at[0]?.sentence ?? "").slice(0, 140)}"`);
  console.log(`MIND  "${p.foundation.referent}" [${p.foundation.layer}, ${p.foundation.world.slice(0, 34)}]  ${p.foundation.roles}  (cosine ${p.cosine})\n      ${p.foundation.at[0]?.act}: "${(p.foundation.at[0]?.sentence ?? "").slice(0, 140)}"`);
}
console.log(`\n→ ${out}`);

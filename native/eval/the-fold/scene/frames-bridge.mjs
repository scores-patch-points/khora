// scene/frames-bridge.mjs — WORLDS AS EMBEDDED SPEAKER FRAMES.  (2026-10-14)
//
//   node eval/the-fold/scene/frames-bridge.mjs --file <text path>                 (reads liberal-arts-weft against foundation-weft)
//   node eval/the-fold/scene/frames-bridge.mjs --control-layer <layer>            (holds one foundation world out and reads it against the rest)
//
// "Worlds" (the user, 2026-10-14) are not documents compared by their act counts — worlds-bridge.mjs did that and its positive
// controls found a like world 1 time in 4. A world is what a speaker holds: "she told me that my husband was shot", "Thrasymachus
// says that justice is the advantage of the stronger". A clause under a verb of saying or believing is a FRAME; what is asserted
// inside it is the content; and a referent that says or believes things is a different KIND of being from one that is only
// spoken about (a witness is not a police station). That is the nested-clause tree — the structure the lean store carries in its
// SEG records (parent, relation, marker, subject head, predicate lemma) and EVA records (sign).
//
// FRAME     matrix clause M (predicate typed by the received act prior: SIG = tell/say/claim/hear/explain…, EVA = believe/know/
//           fear/hope/deny…) with a complement clause C under it.
// PATTERN   (frame class, matrix sign, C's act operator, C's sign, whether C's subject is PERSON-LIKE, embedding depth).
//           Person-like = the world itself has it as the subject of a saying/believing frame, or it is a personal pronoun.
// WORLDS ALIKE  the frame-pattern distribution, centred on the foundation's own, compared by cosine; comparable only above the best
//           that coordinate-shuffled re-signatures reach (each of the six coordinates permuted independently: marginals kept, the
//           JOINT broken).
// SHARED STRUCTURE  S = sum over the text's frames of -log2 p_F(pattern) for patterns the foundation also holds: rare shared
//           arrangements count for more than ubiquitous ones. Read against the same statistic on coordinate-shuffled frames.
//
// PRE-REGISTERED, BEFORE ANY REPUBLIC RUN: the bridge is TRUSTED only if the POSITIVE CONTROLS pass — for each of the four
// foundation layers a held-out world's S exceeds the best shuffled draw, and in at least 3 of 4 its most similar worlds above the
// bar are of its own layer. A Republic result under failed controls is printed as EXPLORATORY and says why.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "../../../the-fold/weft-store.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const FILE = opt("--file", null);
const CONTROL = opt("--control-layer", null);
const FSTORE = path.resolve(HERE, opt("--foundation", "foundation-weft"));
const TSTORE = path.resolve(HERE, opt("--text", "liberal-arts-weft"));
const SEED = 20261014, DRAWS = 200;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);

const act = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/act-prior-en.json", "utf8")).forms;
const pos = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-eng.json", "utf8")).forms;
const domClass = (w) => { const c = pos[w]; return c ? Object.entries(c).sort((a, b) => b[1] - a[1])[0][0] : ""; };
const lemFor = (w) => { for (const c of [w, w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"), w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, "")]) if (act[c]) return c; return null; };
const opsOf = (lemma) => { const k = lemFor(String(lemma ?? "").toLowerCase()); if (!k) return null; const f = act[k]; return f.op ? [f.op] : (f.candidates ?? []).map((c) => c.op); };
const classOf = (lemma) => { const o = opsOf(lemma); if (!o) return null; if (o.includes("SIG")) return "SIG"; if (o.includes("EVA")) return "EVA"; return null; };   // saying, then believing
const contentOp = (lemma) => { const o = opsOf(lemma); return o ? (o.length === 1 ? o[0] : "~" + [...o].sort().join("/")) : "?"; };
const REL_COMPLEMENT = new Set([1, 2, 3]);                    // complement, open-complement, subject-clause (weft-lean.mjs REL)

// ── frames from the transformation records ───────────────────────────────────────────────────────────────────────────
function framesOfWorld(passes) {
  const frames = []; const speakers = new Set(); let segs = 0, withHeads = 0;
  for (const l of passes) {
    const byId = new Map(l.seg.map((c, i) => [c[0], { c, i }]));
    const negSeg = new Set(l.eva.filter((v) => v[0] === "seg").map((v) => v[1]));
    for (const { c, i } of byId.values()) {
      segs += 1; if (c[6]) withHeads += 1;
      if (!REL_COMPLEMENT.has(c[2]) || !c[1]) continue;
      const m = byId.get(c[1]); if (!m) continue;
      const cls = classOf(m.c[6]); if (!cls) continue;
      let depth = 0, p = m; while (p && p.c[1] && depth < 6) { const q = byId.get(p.c[1]); if (!q) break; if (REL_COMPLEMENT.has(p.c[2])) depth += 1; p = q; }
      if (m.c[5]) speakers.add(m.c[5]);
      frames.push({ cls, mNeg: negSeg.has(m.i), cOp: contentOp(c[6]), cNeg: negSeg.has(i), cSubj: c[5] || "", mSubj: m.c[5] || "", verb: m.c[6], depth: Math.min(depth, 2), at: c[4], file: l.a });
    }
  }
  for (const f of frames) f.person = !!f.cSubj && (speakers.has(f.cSubj) || domClass(f.cSubj) === "PRON");
  return { frames, speakers, segs, withHeads };
}
const patternOf = (f) => `${f.cls}|${f.mNeg ? "-" : "+"}|${f.cOp}|${f.cNeg ? "-" : "+"}|${f.person ? "P" : "T"}|${f.depth}`;

const byWorld = (passes) => { const m = new Map(); for (const l of passes) (m.get(l.a) ?? m.set(l.a, []).get(l.a)).push(l); return m; };
let fWorlds = new Map([...byWorld(openStore(FSTORE).passes())].map(([f, ps]) => [f, { file: f, layer: ps[0].l, ...framesOfWorld(ps) }]));
let tWorlds = new Map([...byWorld(openStore(TSTORE).passes().filter((l) => !FILE || l.a === FILE))].map(([f, ps]) => [f, { file: f, layer: ps[0].l, ...framesOfWorld(ps) }]));
const totalSeg = [...fWorlds.values()].reduce((n, w) => n + w.segs, 0), totalHeads = [...fWorlds.values()].reduce((n, w) => n + w.withHeads, 0);
console.log(`foundation: ${fWorlds.size} worlds · ${totalSeg} clause cuts, ${totalHeads} with heads (${(100 * totalHeads / (totalSeg || 1)).toFixed(0)}%) · frames ${[...fWorlds.values()].reduce((n, w) => n + w.frames.length, 0)}`);

let held = null;
if (CONTROL) {
  const cands = [...fWorlds.values()].filter((w) => w.layer === CONTROL && w.frames.length >= 20).sort((a, b) => b.frames.length - a.frames.length);
  held = cands[Math.min(2, cands.length - 1)];
  if (!held) { console.log(`CONTROL ${CONTROL}: no world with ≥20 frames`); process.exit(0); }
  fWorlds = new Map([...fWorlds].filter(([f]) => f !== held.file)); tWorlds = new Map([[held.file, held]]);
  console.log(`CONTROL: holding out ${path.basename(held.file)} (${held.layer}, ${held.frames.length} frames)`);
}
const text = [...tWorlds.values()].reduce((b, w) => (!b || w.frames.length > b.frames.length ? w : b), null);
if (!text || text.frames.length < 5) { console.log(`the text holds ${text?.frames.length ?? 0} frames — too few to be a world the act prior can read (needs ≥5)`); process.exit(0); }
const pool = [...fWorlds.values()].filter((w) => w.frames.length >= 5);
console.log(`text: ${text.frames.length} frames (${text.speakers.size} speakers) · foundation worlds with ≥5 frames: ${pool.length}`);

// ── signatures ─────────────────────────────────────────────────────────────────────────────────────────────────────
const index = new Map(); const idx = (p) => { let i = index.get(p); if (i === undefined) { i = index.size; index.set(p, i); } return i; };
const countOf = (frames) => { const m = new Map(); for (const f of frames) { const i = idx(patternOf(f)); m.set(i, (m.get(i) ?? 0) + 1); } return m; };
for (const w of pool) w.cnt = countOf(w.frames);
const textCnt = countOf(text.frames);
const D = () => index.size;
const total = new Map(); let tt = 0; for (const w of pool) for (const [i, c] of w.cnt) { total.set(i, (total.get(i) ?? 0) + c); tt += c; }
const meanP = (i) => (total.get(i) ?? 0) / (tt || 1);
const centred = (cnt) => { let s = 0; for (const c of cnt.values()) s += c; const v = new Map(); let ss = 0; const keys = new Set([...cnt.keys(), ...total.keys()]); for (const i of keys) { const x = (cnt.get(i) ?? 0) / (s || 1) - meanP(i); v.set(i, x); ss += x * x; } const r = Math.sqrt(ss) || 1; for (const [i, x] of v) v.set(i, x / r); return v; };
const cosM = (a, b) => { let d = 0; const [s, l] = a.size < b.size ? [a, b] : [b, a]; for (const [i, x] of s) { const y = l.get(i); if (y) d += x * y; } return d; };
for (const w of pool) w.c = centred(w.cnt);
const tC = centred(textCnt);
const scored = pool.map((w) => ({ w, s: cosM(tC, w.c) }));

const COORDS = ["cls", "mNeg", "cOp", "cNeg", "person", "depth"];
const shuffledFrames = () => { const cols = {}; for (const k of COORDS) { const a = text.frames.map((f) => f[k]); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } cols[k] = a; } return text.frames.map((f, i) => { const g = { ...f }; for (const k of COORDS) g[k] = cols[k][i]; return g; }); };

// 1. worlds alike
let worldBar = -1; const shuffles = [];
for (let d = 0; d < DRAWS; d++) { const fr = shuffledFrames(); shuffles.push(fr); const cv = centred(countOf(fr)); let best = -1; for (const w of pool) { const s = cosM(cv, w.c); if (s > best) best = s; } if (best > worldBar) worldBar = best; }
const comparable = scored.filter((x) => x.s > worldBar).sort((a, b) => b.s - a.s);
const bestReal = Math.max(...scored.map((x) => x.s));

// 2. shared structure, against the whole foundation (the controls decide whether it can be trusted)
const pF = (i) => (total.get(i) ?? 0) / (tt || 1);
const shared = (frames) => { let S = 0, n = 0; for (const f of frames) { const p = pF(idx(patternOf(f))); if (p > 0) { S += -Math.log2(p); n += 1; } } return { S, n }; };
const real = shared(text.frames);
let nullBest = 0, nullSum = 0; for (const fr of shuffles) { const s = shared(fr).S; nullSum += s; if (s > nullBest) nullBest = s; }
const aboveNull = real.S > nullBest;

// ── report ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const sameLayer = comparable.slice(0, 10).filter((x) => x.w.layer === text.layer).length;
console.log(`\nworlds alike: best real cosine ${bestReal.toFixed(3)} · bar ${worldBar.toFixed(3)} · comparable worlds ${comparable.length}${comparable.length ? ` · of the top ${Math.min(10, comparable.length)}, ${sameLayer} are layer "${text.layer}"` : ""}`);
console.log(`shared structure: S = ${real.S.toFixed(1)} over ${real.n} of ${text.frames.length} frames whose pattern the foundation holds · shuffled mean ${(nullSum / DRAWS).toFixed(1)}, best of ${DRAWS} ${nullBest.toFixed(1)} → ${aboveNull ? "ABOVE the null" : "not above the null"}`);

const sentenceAt = (file, at) => { try { const b = fs.readFileSync(file).subarray(at, at + 900).toString("utf8"); const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(b); return (m ? m[0] : b.split(/\n/)[0].slice(0, 300)).replace(/\s+/g, " ").trim(); } catch { return ""; } };
const patFr = new Map();                                  // pattern → foundation frames (a few)
for (const w of pool) for (const f of w.frames) { const k = patternOf(f); const a = patFr.get(k) ?? patFr.set(k, []).get(k); if (a.length < 40) a.push({ f, w }); }
const quoted = text.frames.map((f) => ({ f, k: patternOf(f), p: pF(idx(patternOf(f))) })).filter((x) => x.p > 0).sort((a, b) => a.p - b.p).slice(0, 8);
const report = {
  schema: "FramesBridge@1", at: new Date().toISOString(), seed: SEED, control: CONTROL ? { layer: CONTROL, held: path.basename(held.file) } : null,
  text: { file: text.file, frames: text.frames.length, speakers: text.speakers.size },
  foundation: { worlds: pool.length, headCoverage: totalHeads / (totalSeg || 1) },
  worlds: { bestCosine: bestReal, bar: worldBar, comparable: comparable.length, sameLayerInTop10: sameLayer, top: comparable.slice(0, 6).map((x) => ({ world: path.basename(x.w.file), layer: x.w.layer, cosine: +x.s.toFixed(3) })) },
  sharedStructure: { S: real.S, framesHeld: real.n, nullMean: nullSum / DRAWS, nullBest, aboveNull },
  pairings: quoted.map(({ f, k, p }) => ({ pattern: k, foundationFrequency: +p.toFixed(5), text: { speaker: f.mSubj, verb: f.verb, content: `${f.cSubj} ${f.cOp}${f.cNeg ? " (NEG)" : ""}`, sentence: sentenceAt(f.file, f.at), address: `${f.file}#${f.at}` },
    foundation: (patFr.get(k) ?? []).slice(0, 2).map(({ f: g, w }) => ({ speaker: g.mSubj, verb: g.verb, content: `${g.cSubj} ${g.cOp}${g.cNeg ? " (NEG)" : ""}`, sentence: sentenceAt(g.file, g.at), world: path.basename(w.file), layer: w.layer, address: `${g.file}#${g.at}` })) })),
  limits: "a frame is a clause under a verb the act prior types SIG or EVA; heads recovered for ~71% of v1 records; speakerhood is person-likeness by role; S is shared joint structure beyond marginals, not shared meaning",
};
const out = path.join(HERE, CONTROL ? `frames-bridge-control-${CONTROL}.json` : "frames-bridge-report.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
if (!CONTROL) {
  for (const p of report.pairings.slice(0, 4)) {
    console.log(`\nPATTERN ${p.pattern}  (the foundation holds it at ${p.foundationFrequency})\n  TEXT  ${p.text.speaker} —${p.text.verb}→ [${p.text.content}]\n        "${p.text.sentence.slice(0, 170)}"`);
    for (const g of p.foundation) console.log(`  MIND  [${g.layer}] ${g.speaker} —${g.verb}→ [${g.content}]\n        "${g.sentence.slice(0, 170)}"`);
  }
}
console.log(`\n→ ${out}`);

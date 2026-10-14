// scene/kinds-bridge.mjs — THE PATTERN-GRAIN BRIDGE: abstraction to testimony, by kind and by sign.  (2026-10-14)
//
//   node eval/the-fold/scene/kinds-bridge.mjs [--foundation foundation-weft] [--text liberal-arts-weft] [--file <text path>]
//
// read-with-priors.mjs measured the Figure-grain priors and found them empty: 0 of 295 of the Republic's two-end connections are
// licensed by shared WORDS (166 "too common to be evidence"), because Plato's ends are abstractions and the foundation says
// "unjust system … state apparatus". moves.js names the failure: a vocabulary gap degrades, a GRAIN mismatch floors. What recurs
// between "the State may be unjust" and a TRC witness is an ARRANGEMENT — an authority doing something to those it governs, or
// failing to — not a lexeme. So the bridge is built at Pattern grain, in four steps each held to a born null (no threshold typed in):
//
//   1. COMPANY. For every connection the foundation recorded, each end's company is the heads of what it was connected to
//      ("the unjust state apparatus" -> head "apparatus"). Company is co-presence only, never content (kind-induction.js's own rule).
//   2. KINDS, INDUCED. Two ends share a kind when their company overlaps (Jaccard) MORE than chance overlaps it: the bar is the
//      largest overlap any of N shuffled-company re-inductions produced (the neighbour column of every connection permuted,
//      marginals preserved). Components of the pairs above the bar are the kinds. A kind that the null also produces is not one.
//   3. PLACEMENT. Each end of the later text is placed into a foundation kind by (R0) the same head being a foundation end, or
//      (R1) its company, drawn from ITS OWN text, overlapping a foundation end's company above the same bar. Else unplaced — said.
//   4. ARRANGEMENT. A connection of the later text, both ends placed, recurs when the foundation recorded a connection between the
//      same two KINDS. SIGN is compared: the foundation's EVA record against the text's. Read against a null that permutes the
//      kinds among the text's own placed ends; the real count must exceed the BEST null draw to be claimed.
//
// What this does not claim: that two connections of one arrangement mean the same. It claims they are the same shape between the
// same kinds of thing to a degree a permutation does not reach — and quotes both, at their addresses, for a person to judge.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "../../../the-fold/weft-store.mjs";

const FOLD = "/Users/mlacy/Documents/3.0/the-fold";
const { contentStems } = await import(path.join(FOLD, "fold-chat-foundation.js"));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const FSTORE = path.resolve(HERE, opt("--foundation", "foundation-weft"));
const TSTORE = path.resolve(HERE, opt("--text", "liberal-arts-weft"));
const FILE = opt("--file", null);
const SEED = 20261014;
const DRAWS = 200;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);

/** An end's HEAD: the last content stem of its phrase ("the unjust state apparatus" -> "apparatus"). */
const headOf = (s) => { const st = contentStems(String(s ?? "")); return st.length ? st[st.length - 1] : null; };

// ── connections, from the transformation records ──────────────────────────────────────────────────────────────
function connectionsOf(passes) {
  const out = [];
  for (const l of passes) {
    const neg = new Set(l.eva.filter((v) => v[0] === "con").map((v) => v[1]));
    l.con.forEach((c, i) => {
      const a = headOf(c[0]), b = headOf(c[2]); if (!a || !b || a === b) return;
      out.push({ a, b, label: c[1], neg: neg.has(i), file: l.a, at: c[3], layer: l.l });
    });
  }
  return out;
}
const foundationPasses = openStore(FSTORE).passes();
const textPasses = openStore(TSTORE).passes().filter((l) => !FILE || l.a === FILE);
const F = connectionsOf(foundationPasses), T = connectionsOf(textPasses);
console.log(`foundation: ${foundationPasses.length} passes, ${F.length} connections · text: ${textPasses.length} passes, ${T.length} connections`);

// ── 1. company ────────────────────────────────────────────────────────────────────────────────────────────────
function companyOf(conns) {
  const m = new Map();
  const add = (x, y) => { let s = m.get(x); if (!s) m.set(x, (s = new Set())); s.add(y); };
  for (const c of conns) { add(c.a, c.b); add(c.b, c.a); }
  return m;
}
const jac = (A, B) => { if (!A.size || !B.size) return 0; let sh = 0; const [s, l] = A.size < B.size ? [A, B] : [B, A]; for (const x of s) if (l.has(x)) sh++; return sh / (A.size + B.size - sh); };

const fCompany = companyOf(F);
// an end needs at least two distinct neighbours to have a company at all (the referent floor: a second mention)
const ends = [...fCompany.keys()].filter((e) => fCompany.get(e).size >= 2);
console.log(`foundation ends with a company: ${ends.length} of ${fCompany.size}`);

// candidate pairs come from an inverted index over neighbours; a neighbour shared by too many ends generates no candidates (a cost cap,
// not a meaning: it still enters every Jaccard) — the measured wall of kind-induction.js's own affinity field.
const POSTING_CAP = 400;
function pairsAbove(company, endList, bar, collect = null) {
  const inv = new Map();
  for (const e of endList) for (const n of company.get(e)) { let p = inv.get(n); if (!p) inv.set(n, (p = [])); p.push(e); }
  const seen = new Set(); let best = 0; const hits = [];
  for (const p of inv.values()) {
    if (p.length > POSTING_CAP || p.length < 2) continue;
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      const k = p[i] < p[j] ? `${p[i]}\u0000${p[j]}` : `${p[j]}\u0000${p[i]}`;
      if (seen.has(k)) continue; seen.add(k);
      const J = jac(company.get(p[i]), company.get(p[j]));
      if (J > best) best = J;
      if (collect && J > bar) hits.push([p[i], p[j], J]);
    }
  }
  return { best, hits, pairs: seen.size };
}

// ── 2. the born bar: what a shuffled-company re-induction reaches ─────────────────────────────────────────────────
function shuffledCompany(conns, seed) {
  const r = mulberry32(seed);
  const col = conns.map((c) => c.b);
  for (let i = col.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [col[i], col[j]] = [col[j], col[i]]; }
  return companyOf(conns.map((c, i) => ({ a: c.a, b: col[i] })).filter((c) => c.a !== c.b));
}
let bar = 0; const nullBars = [];
for (let d = 0; d < 5; d++) {
  const sc = shuffledCompany(F, SEED + d);
  const e2 = [...sc.keys()].filter((e) => sc.get(e).size >= 2);
  const r = pairsAbove(sc, e2, 1);
  nullBars.push(r.best); bar = Math.max(bar, r.best);
}
console.log(`the bar (best Jaccard any of 5 shuffled-company re-inductions reached): ${bar.toFixed(3)}  [${nullBars.map((x) => x.toFixed(2)).join(", ")}]`);

// ── kinds: components of the pairs above the bar ──────────────────────────────────────────────────────────────────
const real = pairsAbove(fCompany, ends, bar, true);
const parent = new Map(); const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
for (const e of ends) parent.set(e, e);
for (const [x, y] of real.hits) { const rx = find(x), ry = find(y); if (rx !== ry) parent.set(rx, ry); }
const kindOf = new Map(); const members = new Map();
for (const e of ends) { const r = find(e); (members.get(r) ?? members.set(r, []).get(r)).push(e); }
let kid = 0; const kinds = [];
for (const [, ms] of members) if (ms.length >= 2) { const id = `k${kid++}`; kinds.push({ id, members: ms }); for (const m of ms) kindOf.set(m, id); }
console.log(`kinds induced above the bar: ${kinds.length} (members ${kinds.reduce((n, k) => n + k.members.length, 0)} of ${ends.length} ends; largest ${Math.max(0, ...kinds.map((k) => k.members.length))}); pairs compared ${real.pairs}, above bar ${real.hits.length}`);

// ── 3. placement of the later text's ends ──────────────────────────────────────────────────────────────────────────
const tCompany = companyOf(T);
const placed = new Map(); const route = { identity: 0, company: 0 };
const fInv = new Map(); for (const e of ends) for (const n of fCompany.get(e)) { let p = fInv.get(n); if (!p) fInv.set(n, (p = [])); p.push(e); }
for (const [h, comp] of tCompany) {
  if (kindOf.has(h)) { placed.set(h, kindOf.get(h)); route.identity++; continue; }          // R0: the same head is a foundation end
  let bestJ = 0, bestEnd = null; const cand = new Set();
  for (const n of comp) for (const e of fInv.get(n) ?? []) if ((fInv.get(n)?.length ?? 0) <= POSTING_CAP) cand.add(e);
  for (const e of cand) { const J = jac(comp, fCompany.get(e)); if (J > bestJ) { bestJ = J; bestEnd = e; } }
  if (bestEnd && bestJ > bar && kindOf.has(bestEnd)) { placed.set(h, kindOf.get(bestEnd)); route.company++; }   // R1: company overlaps above the bar
}
console.log(`the text's ends: ${tCompany.size} · placed in a foundation kind: ${placed.size} (by identity ${route.identity}, by company ${route.company}) · unplaced ${tCompany.size - placed.size}`);

// ── 4. arrangements ──────────────────────────────────────────────────────────────────────────────────────────────────
const arr = new Map();                                    // unordered kind pair -> foundation connections
for (const c of F) { const ka = kindOf.get(c.a), kb = kindOf.get(c.b); if (!ka || !kb) continue; const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`; (arr.get(k) ?? arr.set(k, []).get(k)).push(c); }
const matchOf = (kmap) => {
  const out = [];
  for (const c of T) { const ka = kmap.get(c.a), kb = kmap.get(c.b); if (!ka || !kb) continue; const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`; const h = arr.get(k); if (h) out.push({ c, k, held: h }); }
  return out;
};
const matches = matchOf(placed);
// null: permute the kinds among the text's own placed ends (same number placed, same kind marginals)
const placedHeads = [...placed.keys()], placedKinds = [...placed.values()];
let nullMax = 0, nullSum = 0;
for (let d = 0; d < DRAWS; d++) {
  const ks = placedKinds.slice(); for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
  const m = new Map(placedHeads.map((h, i) => [h, ks[i]]));
  const n = matchOf(m).length; nullSum += n; if (n > nullMax) nullMax = n;
}
const withBoth = T.filter((c) => placed.has(c.a) && placed.has(c.b)).length;
const agree = matches.filter((m) => { const pos = m.held.filter((h) => h.neg === m.c.neg).length; return pos > m.held.length / 2; }).length;
const contradict = matches.length - agree;
console.log(`\nconnections of the text with BOTH ends placed: ${withBoth} of ${T.length}`);
console.log(`  whose arrangement the foundation also recorded: ${matches.length} · null mean ${(nullSum / DRAWS).toFixed(1)}, best of ${DRAWS} ${nullMax} → ${matches.length > nullMax ? "ABOVE the null" : "NOT above the null"}`);
console.log(`  sign: ${agree} agree with the foundation's majority sign, ${contradict} are the opposite sign`);

// ── the pairings, quoted ─────────────────────────────────────────────────────────────────────────────────────────────
const sentenceAt = (file, at) => { try { const b = fs.readFileSync(file).subarray(at, at + 900).toString("utf8"); const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(b); return (m ? m[0] : b.split(/\n/)[0].slice(0, 300)).replace(/\s+/g, " ").trim(); } catch { return ""; } };
const kindName = (id) => { const k = kinds.find((x) => x.id === id); return k ? `{${k.members.slice(0, 5).join(", ")}${k.members.length > 5 ? ", …" : ""}}` : id; };
const rows = matches.map((m) => ({
  text: { connection: `${m.c.a} —${m.c.label}${m.c.neg ? " (NEG)" : ""}→ ${m.c.b}`, sentence: sentenceAt(m.c.file, m.c.at), address: `${m.c.file}#${m.c.at}` },
  kinds: m.k.split("|").map(kindName),
  foundation: m.held.slice().sort((x, y) => (x.neg === m.c.neg ? 0 : 1) - (y.neg === m.c.neg ? 0 : 1)).slice(0, 3).map((h) => ({ connection: `${h.a} —${h.label}${h.neg ? " (NEG)" : ""}→ ${h.b}`, sentence: sentenceAt(h.file, h.at), address: `${h.file}#${h.at}`, layer: h.layer })),
  heldCount: m.held.length, heldNeg: m.held.filter((h) => h.neg).length,
}));
const report = {
  schema: "KindsBridge@1", at: new Date().toISOString(), seed: SEED,
  foundation: { passes: foundationPasses.length, connections: F.length, endsWithCompany: ends.length }, text: { passes: textPasses.length, connections: T.length, ends: tCompany.size },
  bar: { value: bar, nullBars }, kinds: { count: kinds.length, membersTotal: kinds.reduce((n, k) => n + k.members.length, 0), largest: Math.max(0, ...kinds.map((k) => k.members.length)) },
  placement: { placed: placed.size, byIdentity: route.identity, byCompany: route.company, unplaced: tCompany.size - placed.size },
  arrangement: { connectionsBothPlaced: withBoth, recurring: matches.length, nullMean: nullSum / DRAWS, nullBest: nullMax, aboveNull: matches.length > nullMax, signAgree: agree, signOpposite: contradict },
  pairings: rows.slice(0, 30),
  limits: "heads of end phrases, not their meaning; company is co-presence of connected ends; kinds are components above a shuffled-company bar; a recurring arrangement is the same shape between the same kinds, not the same claim",
};
const out = path.join(HERE, "kinds-bridge-report.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
for (const r of rows.filter((x) => x.heldNeg !== undefined).sort((a, b) => b.heldCount - a.heldCount).slice(0, 6)) {
  console.log(`\nTEXT  ${r.text.connection}\n      "${r.text.sentence.slice(0, 150)}"\n      kinds ${r.kinds.join(" × ")}   (foundation holds ${r.heldCount}, ${r.heldNeg} negated)`);
  for (const f of r.foundation.slice(0, 2)) console.log(`  MIND [${f.layer}] ${f.connection}\n        "${f.sentence.slice(0, 160)}"`);
}
console.log(`\n→ ${out}`);

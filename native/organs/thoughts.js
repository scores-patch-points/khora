// thoughts.js — THOUGHTS ABOUT THE SYSTEM'S OWN RECORDS, and COMPETENCE as the surprise they remove.
//
// A THOUGHT is an entry the system writes about its own earlier records (a wormhole, a synapse, an expressway, or a rule that generates links), citing the
// places it is about. Thoughts may cite thoughts (a META-THOUGHT cites the thoughts it was learned from). COMPETENCE of a thought is the surprise it removes:
//   HINDSIGHT  had it been known from the start, the first two thirds of the stream it was proposed from are less surprising, net of its own cost;
//   FORESIGHT  the last third, which it was never fitted to, is less surprising.
// Hindsight is the proposal; foresight is the test. A thought that does not pay later is RETRACTED by a later entry (nothing is deleted).
//
// Pure: no file, no pharos import. The stream is built from a text, the one reader's weft and the clause attachment (adapters/text/clause-attach.js);
// the pharos is an injected `door` ({ declare, weave, fold }, cli/pharos-door.mjs). Evidence and every declared constant: identity/novels PREREG-ROUND8.md,
// PREREG-ROUND9.md, NOVELS-RESULTS-ROUND8.md, NOVELS-RESULTS-ROUND9.md. Status: EXPERIMENTAL.
//
// THE READER. A book is a stream of EVENTS in reading order: named cast mentions (symbol = the referent), third-person singular pronouns (symbol "p:he", or the
// bound referent when the pronoun RULE is a thought), descriptions (a clause argument starting the/this/that/these/those that overlaps no mention; symbol
// "d:head", or the referent when a WORMHOLE links the head). Surprise of an event = -log2 P(symbol | reader state) BEFORE it is seen (prequential code length).
// State: presence per referent (decayed, window 4; a long one, window 32), symbol counts. P(known symbol s) = (1 - pi) * [1/2 presence share + 1/2 count share];
// a first occurrence has P = pi = (births + 1) / (events + 2). Declared, not tuned.
//
// CAVEAT, STATED: a pronoun bound to the most-present referent is cheap to code by construction (the reader predicts with presence); the pronoun rule's saving
// is therefore partly circular, and the base reader has no pronoun model. Report competence with and without the rule.
import { gammaFor } from "../kernel/activation.js";
import { trainAttend, score, seeded } from "../kernel/attend.js";

export const THOUGHT_CONSTANTS = Object.freeze({
  windowShort: 4, windowLong: 32, mixture: 0.5, split: 2 / 3, descriptionPresence: Object.freeze({ window: 4, boost: 2, floor: 2, margin: 0.3 }),
  pronounRuleCostBits: Math.log2(8 * 3 * 2 * 6 * 6), // the declared grid of eval/referents/PREREG-PRESENCE.md: 1728 settings = 10.75 bits, once
  pairWindow: 2, minPairCount: 3, maxPairs: 60, nullDraws: 20,
});
const G4 = gammaFor(4), G32 = gammaFor(32), GD = gammaFor(THOUGHT_CONSTANTS.descriptionPresence.window);
const L2 = Math.log2;
export const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : 0; };
export const unitOf = (a) => { const m = median(a); return 1.4826 * median(a.map((x) => Math.abs(x - m))); }; // 1.4826 x MAD: a reference's own robust spread
const DET = /^(the|this|that|these|those)\s+/i;
const PRON = /\b(he|him|his|himself|she|her|hers|herself)\b/gi;

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// the stream
/** streamOf({ text, weft, tracked }) -> B. `tracked` is clause-attach.js's output ({ args, bindings }). */
export function streamOf({ text, weft, tracked }) {
  const T = String(text), W = weft, TR = tracked; const S = W.sentences, N = S.length, off = S.map((s) => s.offset);
  const sentOf = (p) => { let a = 0, b = N - 1; while (a < b) { const k = (a + b + 1) >> 1; if (off[k] <= p) a = k; else b = k - 1; } return a; };
  const mentions = []; for (const c of W.cast ?? []) for (const sp of c.mentionSpans ?? []) mentions.push({ ref: c.ref, start: sp[0], end: sp[1] });
  mentions.sort((a, b) => a.start - b.start);
  const overlaps = (a, b) => mentions.some((x) => x.start < b && a < x.end);
  // descriptions
  const occ = [];
  (W.clauses ?? []).forEach((c) => {
    for (const a of [c.subject, c.object]) {
      if (!a) continue; const t = T.slice(a.start, a.end); const dm = t.match(DET); if (!dm || overlaps(a.start, a.end)) continue;
      const rest = t.slice(dm[0].length).replace(/\s+/g, " ").trim().split(/\s+of\s+/i)[0]; const ws = rest.match(/[\p{L}'-]+/gu); if (!ws) continue;
      const head = ws[ws.length - 1].toLowerCase(); if (head.length < 3) continue;
      occ.push({ pos: a.start, sent: c.sentence ?? sentOf(a.start), head, bound: null, cands: [] });
    }
  });
  // causal presence binding of the descriptions (declared dials, THOUGHT_CONSTANTS.descriptionPresence)
  const D = THOUGHT_CONSTANTS.descriptionPresence; const evs = new Map(); const push = (s, e) => { if (!evs.has(s)) evs.set(s, []); evs.get(s).push(e); };
  for (const mm of mentions) push(sentOf(mm.start), { k: "m", pos: mm.start, ref: mm.ref });
  for (const b of TR.bindings) push(sentOf(b.offset), { k: "m2", pos: b.offset, ref: b.ref });
  for (const o of occ) push(o.sent, { k: "d", pos: o.pos, o });
  const st = new Map(); const pres = (r, t) => { const c = st.get(r); return c ? c.v * GD ** (t - c.t) : 0; }; const fire = (r, t, w) => st.set(r, { v: pres(r, t) + w, t });
  for (let t = 0; t < N; t++) {
    const ev = (evs.get(t) ?? []).sort((a, b) => a.pos - b.pos); let first = true;
    for (const e of ev) {
      if (e.k === "m") { fire(e.ref, t, first ? D.boost : 1); first = false; }
      else if (e.k === "m2") fire(e.ref, t, 1);
      else {
        const cs = []; for (const [r] of st) { const p = pres(r, t); if (p > 0) cs.push([r, p]); } cs.sort((a, b) => b[1] - a[1]); e.o.cands = cs.map((x) => x[0]); if (!cs.length) continue;
        const top = cs[0][1], second = cs[1]?.[1] ?? 0; if (top >= D.floor && (top - second) / top >= D.margin) e.o.bound = cs[0][0];
      }
    }
  }
  // the events
  const bAt = new Map(TR.bindings.map((b) => [b.offset, b.ref])); const events = [];
  for (const mm of mentions) events.push({ pos: mm.start, end: mm.end, kind: "N", ref: mm.ref });
  const seenP = new Set();
  for (let i = 0; i < N; i++) { PRON.lastIndex = 0; for (let m; (m = PRON.exec(S[i].text));) { const p = S[i].offset + m.index; seenP.add(p); events.push({ pos: p, end: p + m[0].length, kind: "P", pron: m[0].toLowerCase(), bound: bAt.get(p) ?? null }); } }
  for (const [p, r] of bAt) if (!seenP.has(p)) events.push({ pos: p, end: p + 3, kind: "P", pron: "?", bound: r });
  for (const o of occ) events.push({ pos: o.pos, end: o.pos + o.head.length, kind: "D", head: o.head, bound: o.bound, cands: o.cands });
  events.sort((a, b) => a.pos - b.pos); events.forEach((e) => { e.t = sentOf(e.pos); });
  return { text: T, weft: W, S, N, events, occ, sentOf };
}
export const byteAt = (T, i) => Buffer.byteLength(T.slice(0, i), "utf8");

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// the reader: prequential surprise (bits) of each event under a set of thoughts th = { rule, worm: Map(head -> ref), pairs: [{ i, j, w, win }] }
export function runReader(events, th) {
  const worm = th.worm ?? new Map(), pairs = th.pairs ?? [], rule = !!th.rule; const n = new Map(); let Ntot = 0, births = 0;
  const p4 = new Map(), p32 = new Map(); const bits = new Float64Array(events.length);
  const pres = (mp, g, x, t) => { const c = mp.get(x); return c ? c.v * g ** (t - c.t) : 0; }; const fire = (mp, g, x, t) => mp.set(x, { v: pres(mp, g, x, t) + 1, t });
  const bySrc = new Map(); for (const p of pairs) { if (!bySrc.has(p.i)) bySrc.set(p.i, []); bySrc.get(p.i).push(p); }
  for (let k = 0; k < events.length; k++) {
    const e = events[k], t = e.t; let s;
    if (e.kind === "N") s = e.ref; else if (e.kind === "P") s = rule && e.bound ? e.bound : "p:" + e.pron; else s = worm.has(e.head) ? worm.get(e.head) : "d:" + e.head;
    // expectation: presence (window 4) plus the activation each thought transfers
    const extra = new Map();
    for (const [i, ps] of bySrc) for (const p of ps) { const pi = p.win === 32 ? pres(p32, G32, i, t) : pres(p4, G4, i, t); if (pi > 1e-6) extra.set(p.j, (extra.get(p.j) ?? 0) + p.w * pi); }
    let Zp = 0;
    for (const [x, c] of p4) { const v = c.v * G4 ** (t - c.t); if (v > 1e-3) Zp += v; else if (v < 1e-6) p4.delete(x); }
    for (const [, v] of extra) Zp += v;
    const piNew = (births + 1) / (Ntot + 2); const seen = (n.get(s) ?? 0) > 0; let P;
    if (!seen) P = piNew;
    else {
      const freq = n.get(s) / Ntot; const pr = pres(p4, G4, s, t); const pe = pr > 1e-3 ? pr : 0;
      const presPart = s.startsWith("ref:") ? (pe + (extra.get(s) ?? 0)) / (Zp || 1) : 0;
      P = (1 - piNew) * (Zp > 0 ? THOUGHT_CONSTANTS.mixture * presPart + (1 - THOUGHT_CONSTANTS.mixture) * freq : freq);
    }
    bits[k] = -L2(Math.max(P, 1e-12)); if (!seen) births++; n.set(s, (n.get(s) ?? 0) + 1); Ntot++;
    if (s.startsWith("ref:")) { fire(p4, G4, s, t); fire(p32, G32, s, t); }
  }
  return bits;
}
export const sumRange = (bits, events, lo, hi) => { let a = 0; for (let k = 0; k < events.length; k++) if (events[k].t > lo && events[k].t <= hi) a += bits[k]; return a; };

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// proposals, from the first two thirds only (sentence <= t0)
export function proposeThoughts(B, t0) {
  const { events, occ } = B; const nRef = new Set(events.filter((e) => e.kind === "N").map((e) => e.ref)).size; const heads = new Set(occ.map((o) => o.head)); const R = seeded(2026);
  // wormholes: the identity test of identity/novels round 6 on description occurrences up to t0
  const byHead = new Map(); for (const o of occ.filter((o) => o.sent <= t0)) { if (!byHead.has(o.head)) byHead.set(o.head, []); byHead.get(o.head).push(o); }
  const tested = [...byHead].filter(([, os]) => os.filter((o) => o.bound).length >= 3); const thr = Math.sqrt(2 * Math.log(Math.max(2, tested.length))); const links = [];
  for (const [h, os] of tested) {
    const bd = os.filter((o) => o.bound); const cnt = new Map(); for (const o of bd) cnt.set(o.bound, (cnt.get(o.bound) ?? 0) + 1);
    const [rs, top] = [...cnt].sort((a, b) => b[1] - a[1])[0]; const s = top / bd.length; const nulls = [];
    for (let d = 0; d < 200; d++) { const c2 = new Map(); for (const o of bd) { const r = o.cands[Math.floor(R() * o.cands.length)]; c2.set(r, (c2.get(r) ?? 0) + 1); } nulls.push(Math.max(...c2.values()) / bd.length); }
    const mu = nulls.reduce((a, b) => a + b, 0) / nulls.length, sd = Math.max(Math.sqrt(nulls.reduce((a, b) => a + (b - mu) ** 2, 0) / nulls.length), 1 / bd.length);
    if ((s - mu) / sd >= thr) links.push({ kind: "wormhole", head: h, ref: rs, cost: L2(Math.max(2, heads.size)) + L2(Math.max(2, nRef)) });
  }
  // synapse / expressway candidates: co-presence credit in the training part
  const win = THOUGHT_CONSTANTS.pairWindow; const inWin = []; for (let t = 0; t <= t0; t++) inWin.push(new Set());
  for (const e of events) if (e.kind === "N" && e.t <= t0) for (let d = 0; d <= win; d++) if (e.t + d <= t0) inWin[e.t + d].add(e.ref);
  const ni = new Map(), nij = new Map();
  for (const s of inWin) { const a = [...s]; for (const x of a) ni.set(x, (ni.get(x) ?? 0) + 1); for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const k = a[i] < a[j] ? a[i] + "|" + a[j] : a[j] + "|" + a[i]; nij.set(k, (nij.get(k) ?? 0) + 1); } }
  const cand = []; for (const [k, c] of nij) { if (c < THOUGHT_CONSTANTS.minPairCount) continue; const [x, y] = k.split("|"); cand.push({ x, y, c, credit: c - ni.get(x) * ni.get(y) / (t0 + 1) }); }
  let pairsC = []; if (cand.length >= 3) { const cr = cand.map((p) => p.credit); const thrC = median(cr) + unitOf(cr); pairsC = cand.filter((p) => p.credit > thrC).sort((a, b) => b.credit - a.credit).slice(0, THOUGHT_CONSTANTS.maxPairs); }
  const dir = []; for (const p of pairsC) { dir.push({ i: p.x, j: p.y, w: Math.min(1, p.c / ni.get(p.x)) }); dir.push({ i: p.y, j: p.x, w: Math.min(1, p.c / ni.get(p.y)) }); }
  return { links, dir, pairCost: 2 * L2(Math.max(2, nRef)), tested: tested.length };
}

/** Turn a list of thoughts into the reader's input. */
export const thoughtSet = (list) => ({
  rule: list.some((x) => x.kind === "rule"),
  worm: new Map(list.filter((x) => x.kind === "wormhole").map((x) => [x.head, x.ref])),
  pairs: list.filter((x) => x.kind === "synapse" || x.kind === "expressway").map((x) => ({ i: x.i, j: x.j, w: x.w, win: x.win })),
});

/** assessThoughts(B) -> every candidate thought with hindsight / cost / net / foresight, the round-8 admission flag, the joint set's savings and the null. */
export function assessThoughts(B) {
  const { events, N } = B; const t0 = Math.floor(N * THOUGHT_CONSTANTS.split) - 1; const base = runReader(events, {});
  const hs = (b) => sumRange(b, events, -1, t0), fs = (b) => sumRange(b, events, t0, N); const baseH = hs(base), baseF = fs(base);
  const P = proposeThoughts(B, t0); const evalTh = (th) => { const b = runReader(events, th); return { h: baseH - hs(b), f: baseF - fs(b) }; };
  const out = { N, events: events.length, t0, baseHindBits: baseH, baseForeBits: baseF, thoughts: [], gaps: [] };
  // the rule (level 2: it generates many links)
  { const r = evalTh({ rule: true }); const cost = THOUGHT_CONSTANTS.pronounRuleCostBits; const net = r.h - cost; out.thoughts.push({ kind: "rule", name: "pronoun-presence", hind: r.h, cost, net, fore: r.f, admitted: net > 0 }); }
  // wormholes
  const W = P.links.map((l) => { const r = evalTh({ worm: new Map([[l.head, l.ref]]) }); return { ...l, hind: r.h, net: r.h - l.cost, fore: r.f }; });
  if (W.length) {
    const nets = W.map((x) => x.net); const thr = W.length >= 3 ? median(nets) + unitOf(nets) : 0; if (W.length < 3) out.gaps.push({ kind: "wormhole", reason: "fewer_than_3_candidates", n: W.length });
    for (const x of W) out.thoughts.push({ kind: "wormhole", head: x.head, ref: x.ref, hind: x.hind, cost: x.cost, net: x.net, fore: x.fore, admitted: x.net > thr });
  }
  // synapses / expressways: the long window decides which
  const Dr = P.dir.map((p) => { const a = evalTh({ pairs: [{ ...p, win: THOUGHT_CONSTANTS.windowShort }] }), b = evalTh({ pairs: [{ ...p, win: THOUGHT_CONSTANTS.windowLong }] }); return { ...p, h4: a.h, f4: a.f, h32: b.h, f32: b.f }; });
  if (Dr.length >= 3) {
    const diff = Dr.map((x) => x.h32 - x.h4); const tE = median(diff) + unitOf(diff);
    const typed = Dr.map((x) => { const exp = (x.h32 - x.h4) > tE; return { ...x, ptype: exp ? "expressway" : "synapse", win: exp ? THOUGHT_CONSTANTS.windowLong : THOUGHT_CONSTANTS.windowShort, hind: exp ? x.h32 : x.h4, fore: exp ? x.f32 : x.f4 }; });
    for (const ptype of ["synapse", "expressway"]) {
      const grp = typed.filter((x) => x.ptype === ptype); if (!grp.length) continue; const nets = grp.map((x) => x.hind - P.pairCost); const thr = grp.length >= 3 ? median(nets) + unitOf(nets) : 0;
      if (grp.length < 3) out.gaps.push({ kind: ptype, reason: "fewer_than_3_candidates", n: grp.length });
      grp.forEach((x, k) => out.thoughts.push({ kind: ptype, i: x.i, j: x.j, w: x.w, win: x.win, hind: x.hind, cost: P.pairCost, net: nets[k], fore: x.fore, admitted: nets[k] > thr }));
    }
  } else out.gaps.push({ kind: "pair", reason: "fewer_than_3_candidates", n: Dr.length });
  // the joint set and the null (random referents, same number and kind; the rule has no null)
  const adm = out.thoughts.filter((x) => x.admitted); const jb = runReader(events, thoughtSet(adm));
  out.jointHind = baseH - hs(jb); out.jointFore = baseF - fs(jb); out.competence = out.jointFore / baseF; out.admittedN = adm.length;
  const refs = [...new Set(events.filter((e) => e.kind === "N").map((e) => e.ref))], heads = [...new Set(B.occ.map((o) => o.head))]; const R = seeded(8); const nul = [];
  const admW = adm.filter((x) => x.kind === "wormhole"), admP = adm.filter((x) => x.kind === "synapse" || x.kind === "expressway");
  const real = runReader(events, { worm: thoughtSet(adm).worm, pairs: thoughtSet(adm).pairs }); out.realNoRuleFore = baseF - fs(real);
  for (let d = 0; d < THOUGHT_CONSTANTS.nullDraws; d++) {
    const worm = new Map(); for (let q = 0; q < admW.length; q++) if (heads.length && refs.length) worm.set(heads[Math.floor(R() * heads.length)], refs[Math.floor(R() * refs.length)]);
    const pairs = admP.map((x) => ({ i: refs[Math.floor(R() * refs.length)], j: refs[Math.floor(R() * refs.length)], w: x.w, win: x.win }));
    nul.push(baseF - fs(runReader(events, { worm, pairs })));
  }
  out.nullFore = nul.reduce((a, b) => a + b, 0) / (nul.length || 1);
  return out;
}

/** Savings of an arbitrary set of thoughts on the book: { gross foresight, net of cost, n, precision, hind }. */
export function evaluateSet(B, res, list) {
  const hs = (b) => sumRange(b, B.events, -1, res.t0), fs = (b) => sumRange(b, B.events, res.t0, B.N);
  if (!list.length) return { gross: 0, net: 0, n: 0, prec: null, hind: 0, relGross: 0 };
  const b = runReader(B.events, thoughtSet(list)); const hind = res.baseHindBits - hs(b), fore = res.baseForeBits - fs(b);
  return { gross: fore, net: hind + fore - list.reduce((a, t) => a + t.cost, 0), n: list.length, prec: list.filter((t) => t.fore > 0).length / list.length, hind, relGross: fore / res.baseForeBits };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// META-THOUGHTS: a learned policy over the system's own candidate thoughts (identity/novels round 9)
export const KINDS = ["rule", "wormhole", "synapse", "expressway"];
export const META_FEATURES = ["k_rule", "k_worm", "k_syn", "k_exp", "log_hind", "hind_rel", "net_rel", "net_pct", "cost", "w", "win"];
/** Add the features known at proposal time to every candidate of a book (res from assessThoughts). */
export function thoughtRows(res) {
  const ths = res.thoughts.map((t, k) => ({ ...t, idx: k }));
  for (const kd of KINDS) { const g = ths.filter((t) => t.kind === kd).sort((a, b) => a.net - b.net); g.forEach((t, r) => { t.pct = g.length > 1 ? r / (g.length - 1) : 0.5; }); }
  const b = res.baseHindBits || 1;
  for (const t of ths) t.x = [+(t.kind === "rule"), +(t.kind === "wormhole"), +(t.kind === "synapse"), +(t.kind === "expressway"), Math.log1p(Math.max(0, t.hind)), 100 * t.hind / b, 100 * t.net / b, t.pct, t.cost, t.w ?? 0, (t.win ?? 0) / 32];
  return ths;
}
/** Learn M2 from the candidates of OTHER books: [{ ths, id }] -> a model predicting whether a thought's foresight saving is above 0. */
export function learnMeta(books) {
  const rows = books.flatMap((b) => b.ths.map((t) => ({ x: t.x, y: +(t.fore > 0), g: b.id })));
  return trainAttend(rows, META_FEATURES.map(() => "thought"), { gated: false });
}
/** M2's admission: net hindsight above 0 and predicted probability of a positive foresight above 1/2. */
export const metaAdmits = (model, ths) => ths.filter((t) => t.net > 0 && 1 / (1 + Math.exp(-score(model, t.x))) > 0.5);

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// the pharos ledger. `door` = cli/pharos-door.mjs openDoor() result. A refused write throws (the door otherwise fails silently).
export const THOUGHT_CELL = "REC·Pattern"; // the pharos knows Ground / Figure / Pattern grains; REC·Paradigm is refused
export const THOUGHT_KINDS = ["thought-wormhole", "thought-rule", "thought-synapse", "thought-expressway", "thought-retract", "thought-meta"];
function weaveStrict(door, input) { const e = door.weave(input); if (!e) throw new Error("pharos refused a write: " + (door.counts?.lastReason ?? "unknown")); return e; }
export function declareThoughtKinds(door) {
  for (const k of THOUGHT_KINDS.slice(0, 4)) door.declare(k, THOUGHT_CELL, "a thought the system wrote about its own earlier records, citing the places it is about");
  door.declare("thought-retract", THOUGHT_CELL, "a later entry saying a thought did not pay on later events; the thought stays in the log");
  door.declare("thought-meta", THOUGHT_CELL, "a thought about the system's own thoughts: how many of a kind paid, or a learned policy for which to admit, citing what it was learned from");
}
/** Write the admitted thoughts (with byte-address citations into `source`), retract those with negative foresight, and one meta-thought per kind. Returns the entry ids. */
export function recordThoughts({ door, B, res, source, bookId }) {
  declareThoughtKinds(door); const ids = new Map(); const adm = res.thoughts.filter((x) => x.admitted);
  const cite = (x) => {
    const places = x.kind === "wormhole" ? B.occ.filter((o) => o.head === x.head).slice(0, 8).map((o) => [o.pos, o.pos + o.head.length])
      : x.kind === "rule" ? B.events.filter((e) => e.kind === "P" && e.bound).slice(0, 8).map((e) => [e.pos, e.end])
      : B.events.filter((e) => e.kind === "N" && (e.ref === x.i || e.ref === x.j)).slice(0, 8).map((e) => [e.pos, e.end]);
    return places.map(([a, b]) => ({ source, at: [byteAt(B.text, a), byteAt(B.text, b)] }));
  };
  adm.forEach((x, k) => { const body = { ...x, cites: cite(x) }; delete body.admitted; const e = weaveStrict(door, { cell: THOUGHT_CELL, kind: "thought-" + x.kind, addr: `thought:${bookId}:${k}`, body }); ids.set(k, e.id); x._id = e.id; });
  adm.forEach((x, k) => { if (x.fore < 0) weaveStrict(door, { cell: THOUGHT_CELL, kind: "thought-retract", addr: `retract:${bookId}:${k}`, body: { reason: "foresight saving below 0 on the last third", fore: x.fore }, of: [ids.get(k)] }); });
  for (const kind of KINDS) {
    const g = adm.filter((x) => x.kind === kind); if (!g.length) continue; const paid = g.filter((x) => x.fore > 0).length;
    weaveStrict(door, { cell: THOUGHT_CELL, kind: "thought-meta", addr: `meta:${bookId}:${kind}`, body: { kind, n: g.length, paid, precision: paid / g.length, meanFore: g.reduce((a, x) => a + x.fore, 0) / g.length }, of: g.map((x) => x._id) });
  }
  return ids;
}
/** Rebuild the thought set from the log alone and recompute the last-third bits: { replayMatch, foreReplay, retractions }. */
export function replayThoughts({ door, B, res }) {
  const get = (k) => door.fold({ kind: k }) ?? []; const ent = [...get("thought-wormhole"), ...get("thought-rule"), ...get("thought-synapse"), ...get("thought-expressway")];
  const bits = runReader(B.events, thoughtSet(ent.map((e) => e.body))); const foreReplay = res.baseForeBits - sumRange(bits, B.events, res.t0, B.N);
  return { replayMatch: Math.abs(foreReplay - res.jointFore) < 1e-9, foreReplay, retractions: get("thought-retract").length };
}
/** Write a learned meta policy (weights and the addresses of the books it was learned from) as a thought-meta entry. */
export function recordMeta({ door, model, learnedFrom, addr }) {
  declareThoughtKinds(door);
  return weaveStrict(door, { cell: THOUGHT_CELL, kind: "thought-meta", addr, body: { policy: "M2", features: META_FEATURES, learnedFrom: learnedFrom.length, cites: learnedFrom.map((i) => `book:${i}`), lam: model.lam, w: [...model.w], b: model.b, mean: [...model.mean], std: [...model.std], active: [...model.active] } });
}
/** Rebuild a meta model from its logged entry. */
export function replayMeta({ door, addr }) {
  const e = (door.fold({ kind: "thought-meta" }) ?? []).find((x) => x.addr === addr); if (!e) return null; const b = e.body;
  return { w: Float64Array.from(b.w), b: b.b, mean: Float64Array.from(b.mean), std: Float64Array.from(b.std), active: Float64Array.from(b.active) };
}

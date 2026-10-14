// read-across.js — the cross-source reading loop: what several sources, read together, establish that none says alone.
// Handle: Peirce/Ostrom — a reading that earns its ground (ethos) before it licenses a statement (logos).
//
// WHY THIS EXISTS. A client that holds several sources (a resolution with its attachment, an ordinance, a debate, a
// contract) could only ever show what each says and which passages read alike. It could not say what the sources
// ESTABLISH TOGETHER: that one source approves a text whose contents it never names, that a thing is spoken of and no
// source holds it. A cue-word list in the client can fake that on one corpus (it did, and was refused: English words,
// compiled into a surface). This module is the engine's own reading across sources, model-free, with the same law the
// rest of the fold keeps: no word list of any language, no hand-set constant, a null for every bar, and a LOW gate (is
// the candidate worth holding at all) kept apart from a HIGH gate (does it clear a null, so that it may be acted on).
//
// THE LOOP, per source pair. Each layer is a typed product with its own gates (spiral-contract.js shape):
//
//   READ    each source into sentences with byte-exact offsets, its VARIANCE words (admission.js::measureVariance: the
//           words spread through it as widely as a shuffle would spread them, i.e. its connective tissue) and its
//           CLAIM FORMS (every other word form). The ground a source EARNS is the claim forms it carries (ethos: the
//           authority a source has over what it says, never a rulebook over what may be said).
//   NAMES   source A names source B when ONE of A's sentences carries MORE THAN HALF of B's title forms (the
//           ground-carries.js definition of "carries the subject") and more than any equal-sized bag of the
//           workspace's own forms carries (DRAWS seeded draws, the paragraph-cut convention). No cue word is read:
//           "attached hereto", "see Exhibit A" and a bare repetition of the title are the same act here.
//           LOW: some sentence carries a title form. HIGH: more than half AND beats the null's deepest draw.
//   LEFT-OUT given A names B: the claim forms B carries and A never writes. HIGH only when the form is also carried
//           by at least TWO other sources (corroborated); one other source is testimony and is kept, labelled, below
//           the line. The forms are ranked by how rarely B itself says them (a thing the exhibit says once and others
//           keep returning to), and every one carries byte-exact marks in B and in each attending source.
//   ABSENT  a surface the reader sets down as an unresolved participant: a noun phrase in source C whose every
//           content form is nowhere together in any other source. Held at LOW only (a candidate): the engine's
//           descriptor lane does not yet resolve a modified, once-mentioned definite, so no finding is licensed from
//           it. It is returned as `candidates` so a client can show "spoken of, held by no source" without asserting.
//
// WHAT THIS DOES NOT DO (disclosed, never implied, P2): it does not decide that an omission is wrong, only that it
// is one; it does not read negation (the certification's "No" is not read here); stems and the function-word class
// are the engine's ENGLISH prior (eot-draft.js::draftStem, pos-prior.js) where the script has one, and for any other
// script a form is its surface and only the variance null guards it (the same ceiling admission.js::nameGate names).
//
// Pure, deterministic (seeded), no network, no model. A test calls it without a server.

import { measureVariance, wordTokens } from "./admission.js";
import { draftStem } from "./eot-draft.js";
import { isFunctionWord } from "./pos-prior.js";

export const READ_ACROSS_SCHEMA = "EOReadAcross@1";
export const DRAWS = 60; // the null's draws: the cut convention of holodeck-paragraphs.js, a cost not a judgment

// ── a source into sentences and forms, every offset a UTF-16 index into the string given ──────────────────────────
const isAscii = (t) => /^[a-z0-9']+$/.test(t);
const formOf = (tok) => (isAscii(tok) ? draftStem(tok) : tok);

function segmenter(locale, granularity) {
  try { return new Intl.Segmenter(locale || undefined, { granularity }); } catch { return null; }
}

/** Sentences with offsets: [{s, e, text}], trimmed, by the script's own boundary rules (Intl.Segmenter). */
export function sentencesAt(text, locale) {
  const t = String(text ?? "");
  const seg = segmenter(locale, "sentence");
  const out = [];
  const push = (index, segment) => {
    const lead = segment.length - segment.trimStart().length;
    const body = segment.trim();
    if (body) out.push({ s: index + lead, e: index + lead + body.length, text: body });
  };
  if (!seg) { let at = 0; for (const part of t.split(/(?<=[.!?。！？؟।])\s+/)) { const i = t.indexOf(part, at); push(i, part); at = i + part.length; } }
  else for (const { index, segment } of seg.segment(t)) push(index, segment);
  return out;
}

/** Word tokens with offsets: [{form, s, e}] (lowercased surface -> form). */
function tokensAt(text, locale) {
  const t = String(text ?? "");
  const seg = segmenter(locale, "word");
  const out = [];
  if (!seg) { for (const m of t.matchAll(/[\p{L}\p{N}][\p{L}\p{N}']*/gu)) out.push({ form: formOf(m[0].toLowerCase()), s: m.index, e: m.index + m[0].length }); return out; }
  for (const { index, segment, isWordLike } of seg.segment(t)) {
    if (isWordLike) out.push({ form: formOf(segment.toLowerCase()), s: index, e: index + segment.length });
  }
  return out;
}

const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hashOf = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };

/** READ one source. */
export function readSource({ id, title = "", text = "" }, { locale } = {}) {
  const sents = sentencesAt(text, locale);
  const toks = tokensAt(text, locale);
  const varianceWords = measureVariance(text, locale);
  const varianceForms = new Set([...varianceWords].map(formOf));
  const occ = new Map(); // form -> [[s,e]...]
  for (const t of toks) { if (!occ.has(t.form)) occ.set(t.form, []); occ.get(t.form).push([t.s, t.e]); }
  const content = (f) => f.length > 1 && !(isAscii(f) && isFunctionWord(f));
  const claim = new Set();
  for (const f of occ.keys()) if (content(f) && !varianceForms.has(f)) claim.add(f);
  // each sentence's forms (every form it carries: a variance word still counts as carried)
  let k = 0;
  const sentForms = sents.map((st) => {
    const set = new Set();
    while (k < toks.length && toks[k].s < st.s) k++;
    for (let j = k; j < toks.length && toks[j].s < st.e; j++) set.add(toks[j].form);
    return set;
  });
  const titleForms = [...new Set(tokensAt(title, locale).map((t) => t.form).filter(content))];
  return { id: String(id), title: String(title), text: String(text), sents, sentForms, occ, claim, varianceForms, titleForms, order: toks };
}

// ── NAMES ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function namesLayer(A, B, pool, rnd) {
  const T = B.titleForms;
  if (T.length < 2) return { low: false, basis: `${B.id}'s title carries fewer than two forms; nothing to be named by` };
  const Tset = new Set(T);
  const carry = (set) => { let n = 0; for (const f of Tset) if (set.has(f)) n++; return n; };
  let best = 0; const at = [];
  A.sentForms.forEach((set, i) => { const n = carry(set); if (n > best) { best = n; at.length = 0; } if (n === best && n > 0) at.push(i); });
  if (best < 1) return { low: false, basis: `no sentence of ${A.id} carries a form of ${B.id}'s title` };
  // the null: equal-sized bags of the workspace's own forms (not B's title), the deepest any sentence of A carries
  let nullMax = 0;
  for (let d = 0; d < DRAWS; d++) {
    const bag = new Set();
    for (let tries = 0; bag.size < T.length && tries < 20 * T.length; tries++) { const f = pool[Math.floor(rnd() * pool.length)]; if (!Tset.has(f)) bag.add(f); }
    for (const set of A.sentForms) { let n = 0; for (const f of bag) if (set.has(f)) n++; if (n > nullMax) nullMax = n; }
  }
  const more = best * 2 > T.length;
  return { low: true, high: more && best > nullMax, best, of: T.length, nullMax, at, basis: `${best} of ${T.length} title forms in one sentence of ${A.id}; null deepest ${nullMax}` };
}

// ── LEFT-OUT ────────────────────────────────────────────────────────────────────────────────────────────────────────
function leftOutLayer(A, B, others) {
  const out = [];
  for (const f of B.claim) {
    if (A.occ.has(f)) continue;                              // A writes it: not omitted
    const attending = others.filter((C) => C.occ.has(f));
    if (!attending.length) continue;                         // nobody brought it up: an omission no one has noticed
    out.push({
      form: f,
      inB: B.occ.get(f).length,
      attendedBy: attending.map((C) => C.id),
      // how much the other sources return to it: their own mentions, summed. A form said once in passing and a form a
      // source keeps coming back to are different kinds of attention, and the second leads.
      attention: attending.reduce((n, C) => n + C.occ.get(f).length, 0),
      tier: attending.length >= 2 ? "corroborated" : "testimony",
    });
  }
  // ranked: corroborated first, then by how much more the others return to a form than B itself does (a thing the
  // exhibit says once and other sources keep coming back to), then by sheer attention
  const rank = { corroborated: 0, testimony: 1 };
  const ratio = (o) => o.attention / o.inB;
  out.sort((x, y) => rank[x.tier] - rank[y.tier] || ratio(y) - ratio(x) || y.attention - x.attention || (x.form < y.form ? -1 : 1));
  return out;
}

// Does the set of forms two or more other sources share with B-but-not-A beat what independent sources would share?
// Each other source is replaced by a random subset of the omitted forms of the same size; the deepest co-membership
// over DRAWS draws is the bar. Without it, any two long sources would "corroborate" each other's strays.
function corroborationNull(omitted, population, others, rnd) {
  const n = population;   // EVERY omitted form of B, attended or not: the pool a source's attention is drawn from
  const sizes = others.map((C) => omitted.filter((o) => o.attendedBy.includes(C.id)).length);
  if (!n || others.length < 2) return 0;
  let deepest = 0;
  for (let d = 0; d < DRAWS; d++) {
    const seen = new Map();
    for (const k of sizes) {
      const picked = new Set();
      const take = Math.min(k, n);
      while (picked.size < take) picked.add(Math.floor(rnd() * n));
      for (const i of picked) seen.set(i, (seen.get(i) || 0) + 1);
    }
    let both = 0; for (const c of seen.values()) if (c >= 2) both++;
    if (both > deepest) deepest = both;
  }
  return deepest;
}

// ── ABSENT (candidates, LOW only) ───────────────────────────────────────────────────────────────────────────────────
// A thing spoken of in several differentiated ways, where no other source says any of those ways, though it does say
// the thing. "the existing contract", "the new contract", "the latest contract" over a workspace whose other sources say
// "contract" and never any of those. The mechanism reads no cue word: a phrase is two ADJACENT claim forms (modifier,
// head) of one source; the head must be carried by at least one other source (the thing is held), and the PHRASE by
// none (this instance of it is not). Heads are ranked by how many differently-modified instances the source speaks of.
// Held at LOW: the engine's descriptor lane does not resolve a modified, once-mentioned definite, and a count of
// modifiers has no null that licenses "missing", so it is a candidate to look for, never a statement that it is gone.
function absentCandidates(C, others) {
  const adj = new Map(); // "m h" -> [[s,e]...] spans in C
  const tk = C.order;
  for (let i = 1; i < tk.length; i++) {
    const a = tk[i - 1], b = tk[i];
    if (b.s - a.e > 2) continue;
    if (!C.claim.has(a.form) || !C.claim.has(b.form) || a.form === b.form) continue;
    const key = a.form + " " + b.form;
    if (!adj.has(key)) adj.set(key, []);
    adj.get(key).push([a.s, b.e]);
  }
  for (const O of others) {
    if (O._adj) continue;
    O._adj = new Set();
    const t = O.order;
    for (let i = 1; i < t.length; i++) if (t[i].s - t[i - 1].e <= 2) O._adj.add(t[i - 1].form + " " + t[i].form);
  }
  const carriedElsewhere = (key) => others.some((O) => O._adj.has(key));
  const heads = new Map();
  for (const [key, spans] of adj) {
    const [m, h] = key.split(" ");
    if (!others.some((O) => O.occ.has(h))) continue;                       // the head is not held anywhere: not this mechanism
    if (carriedElsewhere(key)) continue;                                   // some source says this instance
    if (!heads.has(h)) heads.set(h, []);
    heads.get(h).push({ phrase: key, modifier: m, spans });
  }
  const out = [];
  for (const [h, ph] of heads) {
    if (ph.length < 2) continue;                                           // one way of saying it is not a differentiation
    ph.sort((x, y) => y.spans.length - x.spans.length || (x.phrase < y.phrase ? -1 : 1));
    out.push({ head: h, instances: ph.length, heldBy: others.filter((O) => O.occ.has(h)).map((O) => O.id), phrases: ph.slice(0, 5) });
  }
  out.sort((x, y) => y.instances - x.instances || y.phrases[0].spans.length - x.phrases[0].spans.length || (x.head < y.head ? -1 : 1));
  return out.slice(0, 3);
}

const around = (src, s, e, pad = 90) => {
  const sent = src.sents.find((x) => x.s <= s && s < x.e);
  return sent ? { s: sent.s, e: sent.e, text: sent.text } : { s: Math.max(0, s - pad), e: Math.min(src.text.length, e + pad), text: src.text.slice(Math.max(0, s - pad), Math.min(src.text.length, e + pad)) };
};

/**
 * readAcross({ documents: [{id, title, text}], locale? }) -> EOReadAcross@1
 *   findings   [{ kind: "names" | "left-out", from, to, tier, basis, marks: [{doc, s, e, text, role}] }]
 *   candidates [{ kind, tier: "possible", basis, ... }]      LOW only: held, never asserted
 *   basis, gaps                                               disclosed, never implied
 * Every `marks[].s/e` is a UTF-16 index into that document's text exactly as given; `text` is text.slice(s, e).
 */
export function readAcross({ documents = [], locale = undefined, maxPerPair = 12 } = {}) {
  const docs = (documents ?? []).filter((d) => d && String(d.text ?? "").trim());
  const src = docs.map((d) => readSource(d, { locale }));
  const gaps = [];
  if (src.length < 2) return { schema: READ_ACROSS_SCHEMA, findings: [], candidates: [], basis: "fewer than two sources: nothing to read across", gaps: ["need_two_sources"], sources: src.map((s) => s.id) };
  // the workspace's own form distribution, the null's pool: every claim form, once per occurrence
  const pool = [];
  for (const s of src) for (const f of s.claim) for (let i = 0; i < Math.min(8, s.occ.get(f).length); i++) pool.push(f);
  const findings = [], candidates = [];
  for (const A of src) {
    for (const B of src) {
      if (A === B) continue;
      const rnd = mulberry(hashOf(A.id + ">" + B.id));
      const nm = namesLayer(A, B, pool, rnd);
      if (!nm.low) continue;
      const stmt = nm.at.map((i) => A.sents[i]).slice(0, 3);
      const nameMarks = [];
      for (const st of stmt) {
        for (const f of B.titleForms) {
          for (const [s0, e0] of A.occ.get(f) ?? []) if (s0 >= st.s && e0 <= st.e) nameMarks.push({ doc: A.id, s: s0, e: e0, text: A.text.slice(s0, e0), role: "names" });
        }
      }
      const namesFinding = { kind: "names", from: A.id, to: B.id, tier: nm.high ? "licensed" : "possible", basis: nm.basis, statements: stmt.map((x) => ({ doc: A.id, s: x.s, e: x.e, text: x.text })), marks: nameMarks };
      if (!nm.high) { candidates.push(namesFinding); continue; }
      findings.push(namesFinding);
      const others = src.filter((C) => C !== A && C !== B);
      const omitted = leftOutLayer(A, B, others);
      const corAll = omitted.filter((o) => o.tier === "corroborated");
      // HIGH for the set: more forms corroborated than independent sources would share by chance
      const barRnd = mulberry(hashOf("corroboration:" + A.id + ">" + B.id));
      const population = [...B.claim].filter((f) => !A.occ.has(f)).length;
      const bar = corroborationNull(omitted, population, others, barRnd);
      const licensed = corAll.length > bar;
      const cor = licensed ? corAll : [];
      const tes = licensed ? omitted.filter((o) => o.tier === "testimony") : omitted;
      const byId = new Map(src.map((s) => [s.id, s]));
      const setBasis = `${corAll.length} omitted form${corAll.length === 1 ? "" : "s"} carried by two or more other sources; independent sources would share ${bar} at most (${DRAWS} draws)`;
      const emit = (o, tier) => {
        const marks = [];
        for (const [s0, e0] of (B.occ.get(o.form) ?? []).slice(0, 4)) marks.push({ doc: B.id, s: s0, e: e0, text: B.text.slice(s0, e0), role: "in-source" });
        const raised = [];
        for (const id of o.attendedBy) {
          const C = byId.get(id);
          const [s0, e0] = C.occ.get(o.form)[0];
          const st = around(C, s0, e0);
          marks.push({ doc: id, s: s0, e: e0, text: C.text.slice(s0, e0), role: "raised" });
          raised.push({ doc: id, s: st.s, e: st.e, text: st.text });
        }
        const inB = around(B, B.occ.get(o.form)[0][0], B.occ.get(o.form)[0][1]);
        return { kind: "left-out", from: A.id, to: B.id, form: o.form, tier, inB: o.inB, attendedBy: o.attendedBy, attention: o.attention, namesMargin: nm.best - nm.nullMax, setMargin: corAll.length - bar, raised, where: { doc: B.id, s: inB.s, e: inB.e, text: inB.text }, marks,
          set: setBasis,
          basis: `${A.id} names ${B.id} and never writes “${o.form}”; ${B.id} writes it ${o.inB}×; carried by ${o.attendedBy.length} other source${o.attendedBy.length === 1 ? "" : "s"}` };
      };
      for (const o of cor.slice(0, maxPerPair)) findings.push(emit(o, "corroborated"));
      // below the line: held, never asserted — testimony, and every omitted form when the set does not beat chance
      const held = licensed ? tes : omitted;
      for (const o of held.slice(0, maxPerPair)) candidates.push(emit(o, licensed ? "testimony" : "possible"));
      if (cor.length > maxPerPair) gaps.push(`${A.id}>${B.id}: ${cor.length - maxPerPair} further corroborated left-out forms not listed`);
    }
  }
  for (const C of src) {
    for (const a of absentCandidates(C, src.filter((x) => x !== C))) {
      const marks = [];
      for (const p of a.phrases) for (const [s0, e0] of p.spans.slice(0, 3)) marks.push({ doc: C.id, s: s0, e: e0, text: C.text.slice(s0, e0), role: "spoken-of" });
      const sent = (p) => { const st = around(C, p.spans[0][0], p.spans[0][1]); return { doc: C.id, s: st.s, e: st.e, text: st.text }; };
      candidates.push({ kind: "absent", from: C.id, to: null, form: a.head, tier: "possible", heldBy: a.heldBy, instances: a.instances,
        phrases: a.phrases.map((p) => ({ phrase: p.phrase, times: p.spans.length, at: sent(p) })), marks,
        basis: `${C.id} speaks of “${a.head}” in ${a.instances} differently-modified ways (${a.phrases.map((p) => p.phrase).join(", ")}); no other source says any of them, ${a.heldBy.length} say “${a.head}”` });
    }
  }
  return {
    schema: READ_ACROSS_SCHEMA, findings, candidates, gaps, sources: src.map((s) => s.id),
    basis: `${src.length} sources read across; names by title-form carry vs ${DRAWS} seeded draws; left-out corroborated by at least two other sources; absence held at LOW only`,
    stagesNotRun: ["negation", "absence-licensing"],
  };
}

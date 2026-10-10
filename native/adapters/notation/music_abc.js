// adapters/notation/music_abc.js — the MUSIC adapter: ABC 2.1, MusicXML 4.x and LilyPond text read into beings and relations.
//
//   notation text → [ear: lexemes with a class] → [read: ONE forward pass] → beings (notes, rests, measures, lines) + relations
//
// THE KERNEL STAYS MEDIUM-BLIND. A medium grammar lives here. This adapter knows what a bar line is; the kernel never does. It
// returns the kernel's own shapes: beings {id, kind, span} and relations {end1, label, end2}, plus typed gaps.
//
// WHAT IS READ (Lovelace's law: the text ORDERS; this reader recovers what is ordered, it never guesses an intent). A note is a
// pitch (letter, accidental, octave, key signature, the bar's earlier accidentals) at a position (the sum of what preceded it in
// its measure) lasting a length (unit note length x multiplier x tuplet x broken rhythm). Nothing else about the music is claimed.
//
// PRIORS (priors/notation-music_abc-standard.json and -lexicon.json) REFUSE or NOMINATE, never admit:
//   standard  tables from named standards (ABC 2.1, W3C MusicXML 4.1 XSD, LilyPond Notation Reference): which letters are pitches,
//             which accidentals, the key table, the default unit note length, the tuplet defaults, the element vocabulary and the
//             content model of a MusicXML <note>, the signature features R0 weighs. The reader consults them for every decision, so a
//             deranged table changes the reading (that is what the instrument's controls rely on).
//   lexicon   TRAIN-derived signature weights and acceptance thresholds for the system identifier.
//   A prior that is missing is a typed gap: with no standard prior nothing is read and the gap says so.
//
// CAUSAL. read(prefix) is one pass over the prefix. A unit is emitted when its last character has been read; a trailing unit cut by
// the prefix (a tag without its `>`, an element without its end tag) is not emitted. No statistic of the whole text is used.
//
// TYPED GAPS (reason → count), never a silent drop: abc_grace_skipped, abc_user_symbol_unread, abc_unknown_symbol,
// abc_unterminated_annotation, abc_no_reference_number, abc_body_before_key, abc_key_unparsed, abc_meter_unparsed,
// abc_transpose_ignored, abc_multimeasure_rest_without_meter, abc_empty_chord, accidental_propagation_ambiguous,
// mx_grace_skipped, mx_unpitched_skipped, mx_microtone_rounded, mx_timewise_unread, mx_element_not_in_standard,
// mx_note_without_pitch_or_rest, ly_events_unread (LilyPond is heard, not read), system_unidentified.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FAMILY = "music_abc";
export const SYSTEMS = Object.freeze(["abc", "musicxml", "lilypond"]);
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PRIOR_DIR = path.resolve(HERE, "../../priors");
export const PRIOR_FILES = Object.freeze({ standard: "notation-music_abc-standard.json", lexicon: "notation-music_abc-lexicon.json" });

// ── exact rationals (quarter-note units) ───────────────────────────────────────────────────────────────────────────
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };
export const Q = Object.freeze({
  make(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; },
  add: (a, b) => Q.make(a.n * b.d + b.n * a.d, a.d * b.d),
  sub: (a, b) => Q.make(a.n * b.d - b.n * a.d, a.d * b.d),
  mul: (a, b) => Q.make(a.n * b.n, a.d * b.d),
  div: (a, b) => Q.make(a.n * b.d, a.d * b.n),
  eq: (a, b) => a.n === b.n && a.d === b.d,
  cmp: (a, b) => a.n * b.d - b.n * a.d,
  str: (a) => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`),
  ZERO: Object.freeze({ n: 0, d: 1 }),
});
const ZERO = Q.ZERO, ONE = Q.make(1);

// ── priors ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Read the two prior files. A missing standard is returned as {standard:null}: the readers then refuse with a typed gap. */
export function loadPriors({ dir = PRIOR_DIR } = {}) {
  const rd = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { return null; } };
  return preparePriors({ standard: rd(PRIOR_FILES.standard), lexicon: rd(PRIOR_FILES.lexicon) });
}
let _default = null;
export const defaultPriors = () => (_default ??= loadPriors());

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Compile the raw prior JSON into the lookups the readers use. Pure; the instrument calls it on deranged copies for its controls. */
export function preparePriors({ standard, lexicon = null }) {
  if (!standard) return { standard: null, lexicon, missing: ["standard"] };
  const A = standard.abc, X = standard.musicxml, L = standard.lilypond;
  const letters = Object.keys(A.pitch_class);
  const accSyms = Object.keys(A.accidentals).sort((a, b) => b.length - a.length);
  const abc = {
    pc: new Map(Object.entries(A.pitch_class)),
    letters,
    acc: new Map(Object.entries(A.accidentals)),
    noteRe: new RegExp(`(${accSyms.map(reEsc).join("|")})?([${letters.join("")}${letters.map((l) => l.toLowerCase()).join("")}])([${reEsc(A.octave.up)}${reEsc(A.octave.down)}]*)`, "y"),
    restChars: Object.keys(A.rests).join(""),
    rests: A.rests,
    infoFields: A.info_fields,
    keyMajor: A.key.fifths_major, keyModes: A.key.modes, sharps: A.key.sharps_order, flats: A.key.flats_order,
    meter: A.meter, tuplet: A.tuplet, up: A.octave.up, down: A.octave.down, upperOct: A.octave.upper_letter_octave, lowerOct: A.octave.lower_letter_octave,
    propagate: A.propagate_accidentals_default,
    decoShort: A.decoration_shortcuts,
  };
  const roles = X.roles;
  const mx = {
    roles,
    stepPc: new Map(Object.entries(X.step_pc)),
    vocabulary: new Set(X.element_vocabulary),
    classOf: new Map(Object.entries(X.element_class)),
    noteSub: X.note_subclass,
  };
  const ly = { noteBase: new Set(L.note_names), suffixes: L.accidental_suffixes, commands: new Set(L.commands), restNames: new Set(L.rest_names), blocks: L.nonmusic_blocks };
  const sig = standard.signatures.map((f) => ({ ...f, rx: new RegExp(f.re, f.flags ?? "") }));
  const refusals = (standard.refusals ?? []).map((f) => ({ ...f, rx: new RegExp(f.re, f.flags ?? "") }));
  return { standard, lexicon, abc, mx, ly, sig, refusals, missing: [] };
}

// ── gaps ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const mkGaps = () => { const m = new Map(); const gap = (r, n = 1) => m.set(r, (m.get(r) ?? 0) + n); return { m, gap }; };
const gapList = (m) => [...m.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || (a.reason < b.reason ? -1 : 1));

// ── R0: identify the system, causally ──────────────────────────────────────────────────────────────────────────────
/**
 * identify(prefix, {priors, mode}) → { system|null, scores, hits, refused, gap? }
 *   Each signature feature of the STANDARD (a regex over the prefix, named by what the standard says opens or fills such a document)
 *   is present or absent. A system's score is the sum of the weights of its present features (TRAIN log-odds; or 1 each in
 *   mode "unit"). A verdict needs: score >= tau_s, at least `min_features` distinct features (one witness is not identification), the
 *   system's ANCHOR groups satisfied (standard.identify.anchors: ABC needs a tune header AND a tune body), no refusing feature
 *   present, and a clear winner. Otherwise a typed gap (insufficient_evidence, anchor_missing:<system>, refused:<dialect>, ambiguous).
 *   The prefix is the whole input: nothing is read past it.
 */
export function identify(prefix, { priors = defaultPriors(), mode = "train" } = {}) {
  const P = priors;
  if (!P.standard) return { system: null, scores: {}, hits: [], refused: [], gap: "no_standard_prior" };
  const text = String(prefix);
  const hits = []; const scores = Object.fromEntries(SYSTEMS.map((s) => [s, 0])); const nfeat = Object.fromEntries(SYSTEMS.map((s) => [s, 0]));
  const lex = mode === "train" ? P.lexicon : null;
  for (const f of P.sig) {
    if (!f.rx.test(text)) continue;
    hits.push(f.id);
    const w = lex?.signature_weights?.[f.id] ?? 1;
    if (w <= 0) continue;
    scores[f.system] += w; nfeat[f.system]++;
  }
  const refused = P.refusals.filter((r) => r.rx.test(text)).map((r) => ({ id: r.id, refuses: r.refuses, dialect: r.dialect }));
  const minF = P.standard.identify?.min_features ?? 2;
  const tau = (s) => (lex?.thresholds?.[s] ?? P.standard.identify?.unit_threshold ?? 3);
  const nominated = SYSTEMS.filter((s) => scores[s] >= tau(s) && nfeat[s] >= minF).sort((a, b) => scores[b] - scores[a]);
  // ANCHORS (declared in the standard prior, identify.anchors): a nomination of a system with an anchor entry is REFUSED unless every anchor group has at least
  // one of its features present (a tune header AND a tune body for ABC). Body-like regexes alone never identify ABC. Systems without an entry are unchanged.
  const anchors = P.standard.identify?.anchors ?? {};
  const hitSet = new Set(hits);
  const anchorMissing = [];
  const cand = nominated.filter((s) => {
    const groups = anchors[s]; if (!groups) return true;
    const miss = groups.findIndex((g) => !g.some((id) => hitSet.has(id)));
    if (miss >= 0) { anchorMissing.push({ system: s, group: miss, wants: groups[miss] }); return false; }
    return true;
  });
  const out = { system: null, scores, hits, refused };
  if (anchorMissing.length) out.anchor_missing = anchorMissing;
  if (!cand.length) { out.gap = refused.length ? `refused:${refused[0].dialect}` : anchorMissing.length ? `anchor_missing:${anchorMissing[0].system}` : hits.length ? "insufficient_evidence" : "no_signature"; return out; }
  const top = cand[0];
  const ref = refused.find((r) => r.refuses === top);
  if (ref) { out.gap = `refused:${ref.dialect}`; return out; }
  if (cand.length > 1 && scores[top] - scores[cand[1]] < 1) { out.gap = "ambiguous"; return out; }
  out.system = top;
  return out;
}

/** A causal identifier: feed(chunk) accumulates the prefix and returns the verdict of the prefix so far. */
export function createIdentifier({ priors = defaultPriors(), mode = "train" } = {}) {
  let buf = "";
  return {
    feed(chunk) { buf += chunk; return identify(buf, { priors, mode }); },
    get prefix() { return buf; },
  };
}

// ── ear / read dispatch ────────────────────────────────────────────────────────────────────────────────────────────
/**
 * ear(text, {system, priors}) → tokens [{s,e,text,class,system,...}] (an array with .gaps and .system attached).
 * The system is identified from the first 4096 characters when not given; an unidentified text is not heard (typed gap).
 */
export function ear(text, { system = null, priors = defaultPriors(), ablate = [] } = {}) {
  text = String(text);
  const sys = system ?? identify(text.slice(0, 4096), { priors }).system;
  const out = [];
  Object.defineProperty(out, "system", { value: sys, enumerable: false });
  if (!priors.standard) { Object.defineProperty(out, "gaps", { value: [{ reason: "no_standard_prior", count: 1 }], enumerable: false }); return out; }
  if (!sys) { Object.defineProperty(out, "gaps", { value: [{ reason: "system_unidentified", count: 1 }], enumerable: false }); return out; }
  let r;
  if (sys === "abc") r = scanAbc(text, priors, { ablate });
  else if (sys === "musicxml") r = scanMusicXml(text, priors, { ablate });
  else r = scanLilyPond(text, priors);
  for (const tk of r.tokens) out.push(tk);   // not push(...tokens): a large score has more tokens than a call can take
  Object.defineProperty(out, "gaps", { value: gapList(r.gaps), enumerable: false });
  return out;
}

/**
 * read(text, {system, priors, ablate}) → { system, beings, relations, gaps, lines, causal:true }
 *   beings    [{id, kind: line|measure|note|rest, span:[s,e], line, measure, onset, ...}]
 *   relations [{end1, label, end2}] labels: in_line, in_measure (structure), pitch, dur, tie, meter, key (claims)
 * `ablate` (instrument controls only): "duration", "accidentals", "key", "tuplets".
 */
export function read(text, { system = null, priors = defaultPriors(), ablate = [] } = {}) {
  text = String(text);
  const base = { system: null, beings: [], relations: [], gaps: [], lines: [], causal: true };
  if (!priors.standard) return { ...base, gaps: [{ reason: "no_standard_prior", count: 1 }] };
  const sys = system ?? identify(text.slice(0, 4096), { priors }).system;
  if (!sys) return { ...base, gaps: [{ reason: "system_unidentified", count: 1 }] };
  if (sys === "lilypond") return { ...base, system: sys, gaps: [{ reason: "ly_events_unread", count: 1 }] };
  const r = sys === "abc" ? scanAbc(text, priors, { ablate, tokens: false }) : scanMusicXml(text, priors, { ablate, tokens: false });
  return { system: sys, ...assemble(r.lines), gaps: gapList(r.gaps), lines: r.lines.map(summariseLine), causal: true };
}

const summariseLine = (l) => ({ key: l.key, ordinal: l.ordinal, name: l.name ?? null, measures: l.nMeasures, events: l.events.length });

// ── beings and relations from the event table ────────────────────────────────────────────────────────────────────────
function assemble(lines) {
  const beings = [], relations = [];
  lines.forEach((ln, li) => {
    ln.ordinal = li;
    const lid = `L${li}`;
    beings.push({ id: lid, kind: "line", span: ln.span ?? [0, 0], line: li });
    const seen = new Map();
    const measures = new Map();
    for (const ev of ln.events) {
      const slot = `${li}|${ev.measure}|${Q.str(ev.on)}|${ev.kind}`;
      const k = seen.get(slot) ?? 0; seen.set(slot, k + 1);
      const id = `L${li}.M${ev.measure}.${Q.str(ev.on)}.${ev.kind}.${k}`;
      const mid = `L${li}.M${ev.measure}`;
      ev.id = id;
      beings.push({ id, kind: ev.kind, span: ev.span, line: li, measure: ev.measure, onset: Q.str(ev.on), midi: ev.midi ?? null, dur: Q.str(ev.dur) });
      relations.push({ end1: id, label: "in_measure", end2: mid });
      if (ev.kind === "note") relations.push({ end1: id, label: "pitch", end2: `midi:${ev.midi}` });
      relations.push({ end1: id, label: "dur", end2: `q:${Q.str(ev.dur)}` });
      if (ev.tie) relations.push({ end1: id, label: "tie", end2: "start" });
      const m = measures.get(ev.measure) ?? { first: ev.span[0], last: ev.span[1] };
      m.first = Math.min(m.first, ev.span[0]); m.last = Math.max(m.last, ev.span[1]); measures.set(ev.measure, m);
    }
    ln.nMeasures = 0; for (const k of ln.measureMeta.keys()) if (k + 1 > ln.nMeasures) ln.nMeasures = k + 1;
    for (const [mi, meta] of [...ln.measureMeta.entries()].sort((a, b) => a[0] - b[0])) {
      const mid = `L${li}.M${mi}`;
      const sp = measures.get(mi);
      beings.push({ id: mid, kind: "measure", span: sp ? [sp.first, sp.last] : [0, 0], line: li, measure: mi });
      relations.push({ end1: mid, label: "in_line", end2: lid });
      if (meta.meter != null) relations.push({ end1: mid, label: "meter", end2: meta.meter });
      if (meta.fifths != null) relations.push({ end1: mid, label: "key", end2: `fifths:${meta.fifths}` });
    }
  });
  return { beings, relations };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ABC 2.1
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const keyAltOf = (A, fifths) => {
  const d = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
  const f = Math.max(-7, Math.min(7, fifths));
  if (f > 0) for (let i = 0; i < f; i++) d[A.sharps[i]] = 1;
  else if (f < 0) for (let i = 0; i < -f; i++) d[A.flats[i]] = -1;
  return d;
};

function parseMeter(A, s) {
  s = s.trim();
  if (s === "") return { value: null, text: null };
  if (A.meter.shorthand[s]) { const [n, d] = A.meter.shorthand[s]; return { n, d, text: `${n}/${d}` }; }
  if (/^none$/i.test(s)) return { value: null, text: null, free: true };
  const m = /^\(?\s*([\d+\s]+?)\s*\)?\s*\/\s*(\d+)$/.exec(s);
  if (!m) return null;
  const parts = m[1].split("+").map((x) => parseInt(x, 10));
  if (parts.some(Number.isNaN)) return null;
  const n = parts.reduce((a, b) => a + b, 0), d = parseInt(m[2], 10);
  return { n, d, text: parts.length > 1 ? "composite" : `${n}/${d}` };
}

function parseKey(A, s, gap) {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (!parts.length || /^none$/i.test(parts[0])) return { fifths: 0, alt: null };
  if (/^H[pP]$/.test(parts[0])) { gap("abc_key_unparsed"); return { fifths: 2, alt: null }; }
  const m = /^([A-G])([#b]?)(.*)$/.exec(parts[0]);
  if (!m) { gap("abc_key_unparsed"); return null; }
  let rest = m[3];
  let mode = "maj";
  let restParts = parts.slice(1);
  if (rest) mode = rest;
  else if (restParts.length && /^[A-Za-z]{1,}$/.test(restParts[0]) && !/^(exp|clef|transpose|octave|middle|stafflines|staffscale)/i.test(restParts[0]) && !restParts[0].includes("=")) { mode = restParts[0]; restParts = restParts.slice(1); }
  const key = (m[1] + m[2]);
  let base = A.keyMajor[key];
  if (base == null) { gap("abc_key_unparsed"); return null; }
  const mkey = mode.slice(0, 3).toLowerCase();
  const modeKey = (/^m$/i.test(mode) ? "m" : mkey);
  const off = A.keyModes[modeKey] ?? A.keyModes[mode.toLowerCase()];
  if (off == null) { gap("abc_key_unparsed"); return null; }
  const fifths = base + off;
  const alt = {};
  for (const p of restParts) {
    if (/^(\^\^|__|\^|_|=)[a-gA-G]$/.test(p)) { const sym = /^(\^\^|__|\^|_|=)/.exec(p)[1]; alt[p.slice(-1).toUpperCase()] = A.acc.get(sym); }
    else if (/^transpose=/.test(p) || /^octave=/.test(p)) gap("abc_transpose_ignored");
  }
  return { fifths, alt: Object.keys(alt).length ? alt : null };
}

function parseLen(text, i, end) {
  const m = /(\d*)(\/*)(\d*)/y; m.lastIndex = i;
  const r = m.exec(text);
  if (!r || r.index + r[0].length > end) return { mult: ONE, next: i };
  const num = r[1] ? parseInt(r[1], 10) : 1;
  const k = r[2].length;
  let den = 1;
  if (k === 1 && r[3]) den = parseInt(r[3], 10);
  else if (k >= 1) den = 2 ** k;
  else if (r[3]) return { mult: ONE, next: i }; // stray digits belong to nothing
  if (!den) return { mult: ONE, next: i + r[0].length };
  return { mult: Q.make(num, den), next: i + r[0].length };
}

function scanAbc(text, P, opt = {}) {
  const A = P.abc;
  const { m: gm, gap } = mkGaps();
  const tokens = [];
  const ablate = new Set(opt.ablate ?? []);
  const wantTokens = opt.tokens !== false;
  const tok = (s, e, cls, extra) => { if (wantTokens) tokens.push({ s, e, text: text.slice(s, e), class: cls, system: "abc", ...extra }); };
  const lines = [];
  let tune = null, tuneIdx = -1;
  const defaultUnit = () => {
    if (tune.unit) return tune.unit;
    const mt = tune.meter;
    if (!mt || !mt.n) return { n: A.meter.default_unit.free[0], d: A.meter.default_unit.free[1] };
    const v = mt.n / mt.d;
    return v < A.meter.default_unit.threshold ? { n: A.meter.default_unit.below[0], d: A.meter.default_unit.below[1] } : { n: A.meter.default_unit.at_or_above[0], d: A.meter.default_unit.at_or_above[1] };
  };
  const startTune = () => { tuneIdx++; tune = { idx: tuneIdx, inBody: false, meter: null, meterText: null, unit: null, fifths: 0, keyAlt: keyAltOf(A, 0), voices: new Map(), cur: null }; };
  const getVoice = (id) => {
    let v = tune.voices.get(id);
    if (!v) {
      v = { id, key: `t${tune.idx}.v${id}`, ordinal: lines.length, events: [], measureMeta: new Map(), measure: 0, pos: ZERO, has: false, init: false, name: null,
            acc: { oct: new Map(), pit: new Map() }, meter: null, meterText: null, unit: null, fifths: 0, keyAlt: null, tup: null, broken: null, span: [0, 0] };
      tune.voices.set(id, v); lines.push(v);
    }
    return v;
  };
  const initVoice = (v) => {
    if (v.init) return; v.init = true;
    v.meter = tune.meter; v.meterText = tune.meterText; v.unit = tune.unit ?? defaultUnit(); v.fifths = tune.fifths; v.keyAlt = tune.keyAlt;
  };
  const curVoice = () => { if (!tune.cur) tune.cur = getVoice("1"); initVoice(tune.cur); return tune.cur; };
  const applyKey = (v, content) => {
    const k = parseKey(A, content, gap);
    if (!k) return;
    v.fifths = k.fifths; v.keyAlt = keyAltOf(A, k.fifths);
    if (k.alt) for (const [step, a] of Object.entries(k.alt)) v.keyAlt[step] = a;
  };
  const applyMeter = (v, content) => {
    const m = parseMeter(A, content);
    if (m === null) { gap("abc_meter_unparsed"); return; }
    v.meter = m.n ? { n: m.n, d: m.d } : null; v.meterText = m.text;
  };
  const applyUnit = (v, content) => {
    const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(content);
    if (m) v.unit = { n: parseInt(m[1], 10), d: parseInt(m[2], 10) };
  };

  // ── field lines
  const fieldLine = (ls, le) => {
    const letter = text[ls], content = text.slice(ls + 2, le);
    const info = A.infoFields[letter];
    const cls = letter === "w" || letter === "W" ? "lyric" : "field";
    tok(ls, le, cls, { field: letter, name: info?.name ?? null });
    if (!info) { gap("abc_user_symbol_unread"); }
    if (letter === "X") { startTune(); return; }
    if (!tune) { startTune(); gap("abc_no_reference_number"); }
    if (letter === "U") gap("abc_user_symbol_unread");
    if (!tune.inBody) {
      if (letter === "M") { const m = parseMeter(A, content); if (m === null) gap("abc_meter_unparsed"); else { tune.meter = m.n ? { n: m.n, d: m.d } : null; tune.meterText = m.text; } }
      else if (letter === "L") { const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(content); if (m) tune.unit = { n: parseInt(m[1], 10), d: parseInt(m[2], 10) }; }
      else if (letter === "K") {
        const k = parseKey(A, content, gap);
        if (k) { tune.fifths = k.fifths; tune.keyAlt = keyAltOf(A, k.fifths); if (k.alt) for (const [s, a] of Object.entries(k.alt)) tune.keyAlt[s] = a; }
        tune.inBody = true;
        if (!tune.unit) tune.unit = defaultUnit();
      } else if (letter === "V") {
        const id = /^\s*([^\s=]+)/.exec(content)?.[1];
        if (id) { const v = getVoice(id); const nm = /name="([^"]*)"/.exec(content) ?? /nm="([^"]*)"/.exec(content); if (nm) v.name = nm[1]; }
      }
      return;
    }
    // in the body a field changes the CURRENT voice only (V: switches it)
    if (letter === "V") {
      const id = /^\s*([^\s=]+)/.exec(content)?.[1];
      if (id) { tune.cur = getVoice(id); }
      return;
    }
    if (letter === "M" || letter === "L" || letter === "K") {
      const v = curVoice();
      if (letter === "M") applyMeter(v, content); else if (letter === "L") applyUnit(v, content); else applyKey(v, content);
    }
  };

  // ── events
  const unitQ = (v) => Q.make(4 * v.unit.n, v.unit.d);
  const markContent = (v) => {
    if (!v.has) { v.has = true; v.measureMeta.set(v.measure, { meter: v.meterText, fifths: ablate.has("key") ? null : v.fifths }); }
  };
  const compound = (v) => !!v.meter && A.tuplet.compound_meters.includes(`${v.meter.n}/${v.meter.d}`);
  const shape = (v, mult) => {
    let dur = ablate.has("duration") ? unitQ(v) : Q.mul(unitQ(v), mult);
    if (v.tup && v.tup.left > 0 && !ablate.has("tuplets")) { dur = Q.mul(dur, Q.make(v.tup.q, v.tup.p)); v.tup.left--; }
    else if (v.tup && v.tup.left > 0) v.tup.left--;
    if (v.broken) { dur = Q.mul(dur, v.broken); v.broken = null; }
    return dur;
  };
  const pitchOf = (v, accSym, letter, marks) => {
    const upper = letter === letter.toUpperCase();
    const step = letter.toUpperCase();
    let octave = upper ? A.upperOct : A.lowerOct;
    for (const c of marks) octave += c === A.up ? 1 : -1;
    let alter;
    if (ablate.has("accidentals")) alter = 0;
    else if (accSym) {
      alter = A.acc.get(accSym);
      v.acc.oct.set(step + octave, alter); v.acc.pit.set(step, alter);
    } else {
      const ko = ablate.has("key") ? 0 : (v.keyAlt?.[step] ?? 0);
      const octA = v.acc.oct.get(step + octave), pitA = v.acc.pit.get(step);
      const effOct = octA ?? ko, effPit = pitA ?? ko;
      if (effOct !== effPit) gap("accidental_propagation_ambiguous");
      alter = A.propagate === "octave" ? effOct : A.propagate === "not" ? ko : effPit;
    }
    return 12 * (octave + 1) + A.pc.get(step) + alter;
  };
  const pushEv = (v, kind, midi, dur, s, e, tie, onsetOverride) => {
    markContent(v);
    v.events.push({ kind, midi, on: onsetOverride ?? v.pos, dur, measure: v.measure, tie: !!tie, span: [s, e] });
  };
  const barLen = (v) => (v.meter ? Q.make(4 * v.meter.n, v.meter.d) : null);

  let i = 0;
  const N = text.length;
  while (i < N) {
    let le = text.indexOf("\n", i); if (le < 0) le = N;
    let ls = i; i = le + 1;
    let endTrim = le; if (endTrim > ls && text[endTrim - 1] === "\r") endTrim--;
    if (endTrim === ls) continue;
    const c0 = text[ls];
    if (c0 === "%") { tok(ls, endTrim, text[ls + 1] === "%" ? "directive" : "comment"); continue; }
    if (/[A-Za-z]/.test(c0) && text[ls + 1] === ":" ) {
      // a field line (X:, K:, w:, ...) — but the body of a tune can also contain a note line that starts like `A:` never: notes are followed by lengths/bars, and `A:` is not a note.
      fieldLine(ls, endTrim); continue;
    }
    if (c0 === "+" && text[ls + 1] === ":") { tok(ls, endTrim, "field", { field: "+" }); continue; }
    if (!tune || !tune.inBody) {
      // free text between tunes, or a body line before K:
      if (tune && /[A-Ga-gz|]/.test(text.slice(ls, endTrim))) gap("abc_body_before_key");
      tok(ls, endTrim, "text"); continue;
    }
    // ── a music line
    let v = curVoice();
    let p = ls;
    const end = endTrim;
    while (p < end) {
      const c = text[p];
      if (c === " " || c === "\t") { p++; continue; }
      if (c === "%") { tok(p, end, "comment"); p = end; break; }
      if (c === "\\" && p === end - 1) { tok(p, p + 1, "continuation"); p++; continue; }
      if (c === '"') {
        const j = text.indexOf('"', p + 1);
        const e = j >= 0 && j < end ? j + 1 : end;
        if (!(j >= 0 && j < end)) gap("abc_unterminated_annotation");
        tok(p, e, /^"[A-G][#b]?[^"]*"$/.test(text.slice(p, e)) ? "chord_symbol" : "annotation"); p = e; continue;
      }
      if (c === "!") { const j = text.indexOf("!", p + 1); const e = j >= 0 && j < end ? j + 1 : p + 1; tok(p, e, "decoration"); p = e; continue; }
      if (c === "+") { const r = /\+[^+\s]+\+/y; r.lastIndex = p; const m = r.exec(text); if (m && p + m[0].length <= end) { tok(p, p + m[0].length, "decoration"); p += m[0].length; continue; } tok(p, p + 1, "unknown"); gap("abc_unknown_symbol"); p++; continue; }
      if (c === "{") { const j = text.indexOf("}", p + 1); const e = j >= 0 && j < end ? j + 1 : end; tok(p, e, "grace"); gap("abc_grace_skipped"); p = e; continue; }
      if (c === "(") {
        const r = /\((\d+)(?::(\d*))?(?::(\d*))?/y; r.lastIndex = p; const m = r.exec(text);
        if (m && p + m[0].length <= end) {
          const pp = parseInt(m[1], 10);
          let q = m[2] ? parseInt(m[2], 10) : null;
          if (q == null) { const dq = A.tuplet.default_q[String(pp)]; q = dq === "n" ? (compound(v) ? A.tuplet.n_compound : A.tuplet.n_simple) : dq; }
          const rr = m[3] ? parseInt(m[3], 10) : pp;
          if (q != null) v.tup = { p: pp, q, left: rr };
          tok(p, p + m[0].length, "tuplet", { p: pp, q, r: rr }); p += m[0].length; continue;
        }
        tok(p, p + 1, "slur"); p++; continue;
      }
      if (c === ")") { tok(p, p + 1, "slur"); p++; continue; }
      if (c === "&") { tok(p, p + 1, "overlay"); v.pos = ZERO; p++; continue; }
      if (c === "[") {
        const nx = text[p + 1];
        if (nx === "|") { const r = /\[\|\]?/y; r.lastIndex = p; const m = r.exec(text); tok(p, p + m[0].length, "bar"); barline(v); p += m[0].length; continue; }
        if (/[A-Za-z]/.test(nx ?? "") && text[p + 2] === ":") {
          const j = text.indexOf("]", p + 1); const e = j >= 0 && j < end ? j + 1 : end;
          tok(p, e, "inline_field", { field: nx });
          const content = text.slice(p + 3, e - (text[e - 1] === "]" ? 1 : 0));
          if (nx === "V") { const id = /^\s*([^\s=]+)/.exec(content)?.[1]; if (id) { tune.cur = getVoice(id); v = curVoice(); } }
          else if (nx === "M" || nx === "L" || nx === "K") { if (nx === "M") applyMeter(v, content); else if (nx === "L") applyUnit(v, content); else applyKey(v, content); }
          p = e; continue;
        }
        if (/\d/.test(nx ?? "")) { const r = /\[[1-9](?:[,\-][1-9])*/y; r.lastIndex = p; const m = r.exec(text); tok(p, p + m[0].length, "volta"); p += m[0].length; continue; }
        // chord
        const j = text.indexOf("]", p + 1);
        if (j < 0 || j >= end) { tok(p, p + 1, "unknown"); gap("abc_unterminated_annotation"); p++; continue; }
        const members = [];
        let q2 = p + 1;
        while (q2 < j) {
          const cc = text[q2];
          if (cc === " " || cc === "\t") { q2++; continue; }
          if (cc === '"') { const k = text.indexOf('"', q2 + 1); q2 = k >= 0 && k < j ? k + 1 : j; continue; }
          if (cc === "!") { const k = text.indexOf("!", q2 + 1); q2 = k >= 0 && k < j ? k + 1 : q2 + 1; continue; }
          P.abc.noteRe.lastIndex = q2;
          const mm = P.abc.noteRe.exec(text);
          if (mm && q2 + mm[0].length <= j) {
            const lr = parseLen(text, q2 + mm[0].length, j);
            let ne = lr.next; let tie = false;
            if (text[ne] === "-" && ne < j) { tie = true; ne++; }
            members.push({ acc: mm[1] ?? null, letter: mm[2], marks: mm[3], mult: lr.mult, tie, s: q2, e: ne });
            q2 = ne; continue;
          }
          q2++;
        }
        let ce = j + 1;
        const lr = parseLen(text, ce, end); ce = lr.next;
        let tieAll = false, brk = null;
        for (;;) {
          if (text[ce] === "-" && ce < end) { tieAll = true; ce++; continue; }
          if ((text[ce] === ">" || text[ce] === "<") && ce < end) { const ch = text[ce]; let k = 0; while (text[ce] === ch && ce < end) { k++; ce++; } brk = { ch, k }; continue; }
          break;
        }
        tok(p, ce, "chord");
        if (!members.length) { gap("abc_empty_chord"); p = ce; continue; }
        const inner = members[0].mult;
        let dur = shape(v, Q.mul(lr.mult, inner));
        if (brk) dur = Q.mul(dur, brokenFactors(brk).first);
        const on = v.pos;
        for (const mb of members) pushEv(v, "note", pitchOf(v, mb.acc, mb.letter, mb.marks), dur, mb.s, mb.e, mb.tie || tieAll, on);
        v.pos = Q.add(on, dur);
        if (brk) v.broken = brokenFactors(brk).second;
        p = ce; continue;
      }
      if (c === "|" || c === ":") {
        const r = /(?:(?::*\|+:*\]?)|::)(?:[1-9](?:[,\-][1-9])*)?/y; r.lastIndex = p; const m = r.exec(text);
        if (m && m[0].length && p + m[0].length <= end) { tok(p, p + m[0].length, "bar"); barline(v); p += m[0].length; continue; }
        tok(p, p + 1, "unknown"); gap("abc_unknown_symbol"); p++; continue;
      }
      // a note?
      P.abc.noteRe.lastIndex = p;
      const nm = P.abc.noteRe.exec(text);
      if (nm && nm.index === p && p + nm[0].length <= end) {
        const lr = parseLen(text, p + nm[0].length, end);
        let ce = lr.next, tie = false, brk = null;
        for (;;) {
          if (text[ce] === "-" && ce < end) { tie = true; ce++; continue; }
          if ((text[ce] === ">" || text[ce] === "<") && ce < end) { const ch = text[ce]; let k = 0; while (text[ce] === ch && ce < end) { k++; ce++; } brk = { ch, k }; continue; }
          break;
        }
        let dur = shape(v, lr.mult);
        if (brk) dur = Q.mul(dur, brokenFactors(brk).first);
        const midi = pitchOf(v, nm[1] ?? null, nm[2], nm[3]);
        tok(p, ce, "note");
        const on = v.pos;
        pushEv(v, "note", midi, dur, p, ce, tie);
        v.pos = Q.add(on, dur);
        if (brk) v.broken = brokenFactors(brk).second;
        p = ce; continue;
      }
      if (A.restChars.includes(c)) {
        const lr = parseLen(text, p + 1, end);
        let ce = lr.next;
        let brk = null;
        while ((text[ce] === ">" || text[ce] === "<") && ce < end) { const ch = text[ce]; let k = 0; while (text[ce] === ch && ce < end) { k++; ce++; } brk = { ch, k }; }
        const role = A.rests[c];
        if (role === "spacer") { tok(p, ce, "spacer"); p = ce; continue; }
        if (role === "rest") {
          let dur = shape(v, lr.mult);
          if (brk) dur = Q.mul(dur, brokenFactors(brk).first);
          tok(p, ce, "rest"); const on = v.pos; pushEv(v, "rest", null, dur, p, ce, false); v.pos = Q.add(on, dur);
          if (brk) v.broken = brokenFactors(brk).second;
        } else if (role === "invisible_rest") {
          let dur = shape(v, lr.mult);
          if (brk) dur = Q.mul(dur, brokenFactors(brk).first);
          tok(p, ce, "spacer"); markContent(v); v.pos = Q.add(v.pos, dur);
          if (brk) v.broken = brokenFactors(brk).second;
        } else { // multimeasure rests: Z (visible) / X (invisible), a number of whole bars
          const bl = barLen(v);
          if (!bl) { gap("abc_multimeasure_rest_without_meter"); tok(p, ce, role === "multimeasure_rest" ? "rest" : "spacer"); p = ce; continue; }
          const dur = Q.mul(bl, lr.mult);
          if (role === "multimeasure_rest") { tok(p, ce, "rest"); const on = v.pos; pushEv(v, "rest", null, dur, p, ce, false); v.pos = Q.add(on, dur); }
          else { tok(p, ce, "spacer"); markContent(v); v.pos = Q.add(v.pos, dur); }
        }
        p = ce; continue;
      }
      if (A.decoShort.includes(c)) { tok(p, p + 1, "decoration"); p++; continue; }
      if (c === "-") { tok(p, p + 1, "tie"); p++; continue; }
      if (c === ">" || c === "<") { let e = p; while (text[e] === c) e++; tok(p, e, "broken_rhythm"); p = e; continue; }
      if (c === "*" || c === "$" || c === "`" || c === "#") { tok(p, p + 1, "other"); p++; continue; }
      tok(p, p + 1, "unknown"); gap("abc_unknown_symbol"); p++;
    }
  }
  /** `A>B`: the first note gets (2 - 2^-k) of its length and the next 2^-k; `<` is the reverse. The marker is part of the
   *  first note's own token, so its duration is known when it is emitted (no later correction, no lookahead). */
  function brokenFactors({ ch, k }) {
    const longF = Q.make(2 ** (k + 1) - 1, 2 ** k), shortF = Q.make(1, 2 ** k);
    return ch === ">" ? { first: longF, second: shortF } : { first: shortF, second: longF };
  }
  function barline(v) {
    if (v.has) { v.measure++; v.has = false; }
    v.pos = ZERO; v.acc = { oct: new Map(), pit: new Map() };
  }
  for (const v of lines) { v.span = v.events.length ? [v.events[0].span[0], v.events[v.events.length - 1].span[1]] : [0, 0]; }
  return { tokens, gaps: gm, lines: lines.map((v) => ({ key: v.key, ordinal: v.ordinal, name: v.name, events: v.events, measureMeta: v.measureMeta, span: v.span })) };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// MusicXML
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** One forward pass over the XML events. Yields {t, s, e, name?, attrs?, self?}; a trailing incomplete construct is not yielded. */
function* xmlEvents(text) {
  const n = text.length; let i = 0;
  while (i < n) {
    const lt = text.indexOf("<", i);
    if (lt < 0) { if (i < n) yield { t: "text", s: i, e: n }; return; }
    if (lt > i) yield { t: "text", s: i, e: lt };
    if (text.startsWith("<!--", lt)) { const e = text.indexOf("-->", lt + 4); if (e < 0) return; yield { t: "comment", s: lt, e: e + 3 }; i = e + 3; continue; }
    if (text.startsWith("<![CDATA[", lt)) { const e = text.indexOf("]]>", lt + 9); if (e < 0) return; yield { t: "cdata", s: lt + 9, e, end: e + 3 }; i = e + 3; continue; }
    if (text.startsWith("<?", lt)) { const e = text.indexOf("?>", lt + 2); if (e < 0) return; yield { t: "pi", s: lt, e: e + 2 }; i = e + 2; continue; }
    if (text.startsWith("<!", lt)) {
      let j = lt + 2, depth = 0;
      for (; j < n; j++) { const c = text[j]; if (c === "[") depth++; else if (c === "]") depth--; else if (c === ">" && depth <= 0) break; else if (c === '"' || c === "'") { const k = text.indexOf(c, j + 1); if (k < 0) return; j = k; } }
      if (j >= n) return;
      yield { t: "doctype", s: lt, e: j + 1 }; i = j + 1; continue;
    }
    let j = lt + 1;
    for (; j < n; j++) { const c = text[j]; if (c === '"' || c === "'") { const k = text.indexOf(c, j + 1); if (k < 0) return; j = k; } else if (c === ">") break; }
    if (j >= n) return;
    const raw = text.slice(lt, j + 1);
    if (raw[1] === "/") { const m = /^<\/\s*([^\s>]+)/.exec(raw); yield { t: "close", s: lt, e: j + 1, name: m ? m[1] : "" }; }
    else {
      const m = /^<([^\s/>]+)/.exec(raw); const name = m ? m[1] : "";
      const self = raw.endsWith("/>");
      yield { t: "open", s: lt, e: j + 1, name, attrs: raw.slice(1 + name.length, self ? -2 : -1), self };
    }
    i = j + 1;
  }
}
const xmlDecode = (s) => s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, g) => (g[0] === "#" ? String.fromCodePoint(g[1] === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10)) : { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[g]));
const attrOf = (attrs, name) => { const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(attrs ?? ""); return m ? (m[2] ?? m[3]) : null; };

function scanMusicXml(text, P, opt = {}) {
  const X = P.mx, R = X.roles;
  const { m: gm, gap } = mkGaps();
  const tokens = [];
  const ablate = new Set(opt.ablate ?? []);
  const wantTokens = opt.tokens !== false;
  const stack = [];
  const parts = []; let part = null;
  let meas = -1, cursor = ZERO, lastOn = ZERO, divisions = 1;
  let note = null;
  let st = { fifths: null, meter: null };
  let saw = false;
  const lineOf = (staff) => {
    let l = part.lines.get(staff);
    if (!l) { l = { part: part.index, staff, events: [], measureMeta: new Map(), span: [0, 0], name: part.name }; part.lines.set(staff, l); }
    return l;
  };
  const noteClass = (n) => (n.grace ? "grace" : n.cue ? "cue" : n.rest ? "rest" : n.unpitched ? "unpitched" : n.pitch ? (n.chord ? "pitched_chord" : "pitched") : "note_other");
  const pushTok = (s, e, cls, extra) => { if (wantTokens) tokens.push({ s, e, text: text.slice(s, e), class: cls, system: "musicxml", ...extra }); };

  function closeFrame(endPos) {
    const f = stack.pop();
    if (!f) return;
    const name = f.name, parent = stack[stack.length - 1]?.name;
    const val = f.text.trim();
    let noteCls = null;
    if (note) {
      if (name === R.step && parent === R.pitch) note.step = val;
      else if (name === R.alter && parent === R.pitch) { const a = parseFloat(val); if (!Number.isNaN(a)) { if (!Number.isInteger(a)) gap("mx_microtone_rounded"); note.alter = a; } }
      else if (name === R.octave && parent === R.pitch) note.octave = parseInt(val, 10);
      else if (name === R.duration && parent === R.note) note.dur = parseInt(val, 10);
      else if (name === R.staff && parent === R.note) note.staff = parseInt(val, 10) || 1;
    }
    if (parent === R.attributes) {
      if (name === R.divisions) { const d = parseInt(val, 10); if (d > 0) divisions = d; }
      else if (name === R.staves && part) part.staves = Math.max(part.staves, parseInt(val, 10) || 1);
    }
    if (name === R.fifths && parent === R.key) { const f2 = parseInt(val, 10); if (!Number.isNaN(f2)) st.fifths = f2; }
    if (parent === R.time && stack.length) {
      if (name === R.beats) stack[stack.length - 1].beats = val;
      else if (name === R.beatType) stack[stack.length - 1].beatType = val;
    }
    if (name === R.time && parent === R.attributes) {
      if (f.beats != null && f.beatType != null) st.meter = /^\d+$/.test(f.beats) && /^\d+$/.test(f.beatType) ? `${parseInt(f.beats, 10)}/${parseInt(f.beatType, 10)}` : "composite";
    }
    if (name === R.duration && (parent === R.backup || parent === R.forward) && part) {
      const d = parseInt(val, 10);
      if (d >= 0) { const q = Q.make(d, divisions); cursor = parent === R.backup ? Q.sub(cursor, q) : Q.add(cursor, q); }
    }
    if (name === R.note && note) {
      const n = note; note = null;
      noteCls = noteClass(n);
      if (!part) { /* a note outside any part: heard, not read */ }
      else if (n.grace) gap("mx_grace_skipped");
      else if (n.unpitched) { gap("mx_unpitched_skipped"); if (n.dur != null && !n.chord) { lastOn = cursor; cursor = Q.add(cursor, Q.make(n.dur, divisions)); } }
      else if (n.dur == null || !(n.rest || n.pitch)) gap("mx_note_without_pitch_or_rest");
      else {
        const dur = ablate.has("duration") ? ONE : Q.make(n.dur, divisions);
        const on = n.chord ? lastOn : cursor;
        let midi = null, ok = true;
        if (!n.rest) {
          const pc = X.stepPc.get(n.step);
          if (pc == null || n.octave == null || Number.isNaN(n.octave)) { gap("mx_note_without_pitch_or_rest"); ok = false; }
          else midi = 12 * (n.octave + 1) + pc + (ablate.has("accidentals") ? 0 : Math.round(n.alter));
        }
        if (ok) lineOf(n.staff).events.push({ kind: n.rest ? "rest" : "note", midi, on, dur, measure: meas, tie: n.tie, span: [n.s, endPos] });
        if (!n.chord) { lastOn = cursor; cursor = Q.add(cursor, dur); }
      }
    }
    if (name === R.measure && part && meas >= 0) part.meta[meas] = { meter: st.meter, fifths: ablate.has("key") ? null : st.fifths };
    if (wantTokens) {
      let cls = X.classOf.get(name);
      if (name === R.note) cls = noteCls ?? "note_other";
      if (cls) pushTok(f.s, endPos, cls, { name });
    }
  }

  for (const ev of xmlEvents(text)) {
    if (ev.t === "text") { if (stack.length) stack[stack.length - 1].text += xmlDecode(text.slice(ev.s, ev.e)); continue; }
    if (ev.t === "cdata") { if (stack.length) stack[stack.length - 1].text += text.slice(ev.s, ev.e); continue; }
    if (ev.t === "close") { closeFrame(ev.e); continue; }
    if (ev.t !== "open") continue;
    const name = ev.name;
    saw = true;
    if (!X.vocabulary.has(name)) gap("mx_element_not_in_standard");
    const parent = stack[stack.length - 1]?.name;
    if (name === "score-timewise") gap("mx_timewise_unread");
    if (name === R.part) {
      part = { index: parts.length, id: attrOf(ev.attrs, "id"), lines: new Map(), staves: 1, name: null, meta: [] }; parts.push(part);
      meas = -1; divisions = 1; st = { fifths: null, meter: null }; note = null;
    } else if (name === R.measure && part) { meas++; cursor = ZERO; lastOn = ZERO; }
    else if (name === R.note) note = { s: ev.s, chord: false, grace: false, cue: false, rest: false, unpitched: false, pitch: false, step: null, alter: 0, octave: null, dur: null, tie: false, staff: 1 };
    else if (note && parent === R.note) {
      if (name === R.chord) note.chord = true; else if (name === R.grace) note.grace = true; else if (name === R.cue) note.cue = true;
      else if (name === R.rest) note.rest = true; else if (name === R.unpitched) note.unpitched = true; else if (name === R.pitch) note.pitch = true;
      else if (name === R.tie && /(?:^|\s)type\s*=\s*["']start["']/.test(ev.attrs ?? "")) note.tie = true;
    }
    stack.push({ name, s: ev.s, attrs: ev.attrs, text: "" });
    if (ev.self) closeFrame(ev.e);
  }
  if (!saw) gap("mx_element_not_in_standard");
  // lines in (part, staff) order
  const lines = [];
  for (const pt of parts) {
    const maxStaff = Math.max(pt.staves, ...pt.lines.keys(), 1);
    for (let s = 1; s <= maxStaff; s++) {
      const l = pt.lines.get(s) ?? { part: pt.index, staff: s, events: [], measureMeta: new Map(), span: [0, 0], name: pt.name };
      for (let mi = 0; mi < pt.meta.length; mi++) if (pt.meta[mi]) l.measureMeta.set(mi, pt.meta[mi]);
      l.key = `p${pt.index}.s${s}`; l.ordinal = lines.length;
      l.span = l.events.length ? [l.events[0].span[0], l.events[l.events.length - 1].span[1]] : [0, 0];
      lines.push(l);
    }
  }
  return { tokens, gaps: gm, lines };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// LilyPond (heard, not read)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function scanLilyPond(text, P) {
  const L = P.ly;
  const { m: gm, gap } = mkGaps();
  const tokens = [];
  const push = (s, e, cls) => tokens.push({ s, e, text: text.slice(s, e), class: cls, system: "lilypond" });
  const n = text.length;
  const ctx = ["music"]; let pending = null;
  const top = () => ctx[ctx.length - 1];
  // note names are nederlands unless the file switches language (\language "deutsch", \include "deutsch.ly"): those names are heard as
  // `name`, not read as pitches, and the gap says so
  if (/\\language\s+"|\\include\s+"(?:catalan|deutsch|english|espanol|italiano|norsk|portugues|suomi|svenska|vlaams|francais)\.ly"/.test(text)) gap("ly_language_note_names_unread");
  let i = 0, prevSig = "";           // prevSig: the last significant (non-space) character class, to tell a duration from a fingering
  const noteRe = /([a-g])((?:is|es|s|ss|ih|eh)*)(?![A-Za-z])/y;
  const word = /[A-Za-z\u00C0-\uFFFF][A-Za-z0-9\u00C0-\uFFFF_-]*/y;
  const scheme = (s) => {   // a scheme datum or a balanced ( ... ); quoted strings inside are heard as strings
    let j = s + 1, start = s;
    const flush = (e) => { if (e > start) push(start, e, "scheme"); };
    if (text[j] === "(") {
      let d = 0;
      for (; j < n; j++) {
        const c = text[j];
        if (c === "(") d++;
        else if (c === ")") { d--; if (d === 0) { j++; break; } }
        else if (c === '"') { flush(j); let k = j + 1; while (k < n && text[k] !== '"') { if (text[k] === "\\") k++; k++; } const e = Math.min(n, k + 1); push(j, e, "string"); j = e - 1; start = e; }
      }
    } else if (text[j] === '"') { flush(j); let k = j + 1; while (k < n && text[k] !== '"') { if (text[k] === "\\") k++; k++; } const e = Math.min(n, k + 1); push(j, e, "string"); return e; }
    else { while (j < n && !/[\s{}<>]/.test(text[j])) j++; }
    flush(j);
    return j;
  };
  while (i < n) {
    const c = text[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "%") {
      if (text[i + 1] === "{") { const e = text.indexOf("%}", i + 2); const end = e < 0 ? n : e + 2; push(i, end, "comment"); i = end; continue; }
      let e = text.indexOf("\n", i); if (e < 0) e = n; push(i, e, "comment"); i = e; continue;
    }
    if (c === '"') { let j = i + 1; while (j < n && text[j] !== '"') { if (text[j] === "\\") j++; j++; } const e = Math.min(n, j + 1); push(i, e, "string"); i = e; prevSig = "s"; continue; }
    if (c === "\\") {
      if (text[i + 1] === "\\") { push(i, i + 2, "separator"); i += 2; continue; }
      const m = /\\([A-Za-z][A-Za-z0-9-]*|[<>!()\[\]~'"\\.^_-]|\d)/y; m.lastIndex = i; const r = m.exec(text);
      if (r) {
        push(i, i + r[0].length, "command");
        const w = r[1];
        if (L.blocks.includes(w)) pending = "nonmusic";
        else if (w === "lyricmode" || w === "lyrics" || w === "addlyrics" || w === "lyricsto") pending = "lyrics";
        else if (w === "markup" || w === "markuplist") pending = "markup";
        i += r[0].length; prevSig = "c"; continue;
      }
      push(i, i + 1, "unknown"); gap("ly_unknown_symbol"); i++; continue;
    }
    if (c === "#") { push(i, i + 1, "scheme"); i = scheme(i); prevSig = "h"; continue; }
    if (c === "{" || c === "<") {
      const dbl = text[i + 1] === c && c === "<" ? 2 : 1;
      push(i, i + dbl, "bracket");
      if (c === "{" || dbl === 2) { ctx.push(pending ?? top()); pending = null; }
      i += dbl; prevSig = "b"; continue;
    }
    if (c === "}" || c === ">") {
      const dbl = c === ">" && text[i + 1] === ">" ? 2 : 1;
      push(i, i + dbl, "bracket");
      if (c === "}" || dbl === 2) { if (ctx.length > 1) ctx.pop(); }
      i += dbl; prevSig = "b"; continue;
    }
    const t = top();
    if (c === "|") { push(i, i + 1, "bar"); i++; prevSig = "|"; continue; }
    if (t === "music") {
      if (c === "[" || c === "]" || c === "(" || c === ")") { push(i, i + 1, "bracket"); i++; prevSig = "b"; continue; }
      if (c === "-" || c === "^" || c === "_") { i++; prevSig = "d"; continue; }
      if (c === "=" || c === "~" || c === "!" || c === "?" || c === ".") { i++; if (c !== "." ) prevSig = c; continue; }
      if (c === "*") { i++; prevSig = "*"; continue; }
      if (/\d/.test(c)) {
        const m = /\d+/y; m.lastIndex = i; const r = m.exec(text);
        let e = i + r[0].length;
        const asDur = !(prevSig === "d" || prevSig === "*" || prevSig === "h");
        if (text[e] === "/" && /\d/.test(text[e + 1] ?? "")) { const m2 = /\/\d+/y; m2.lastIndex = e; e += m2.exec(text)[0].length; push(i, e, "number"); }
        else push(i, e, asDur ? "duration" : "number");
        i = e; prevSig = "n"; continue;
      }
      if (c === "'" || c === ",") { let j = i; while (text[j] === "'" || text[j] === ",") j++; push(i, j, "octave"); i = j; prevSig = "o"; continue; }
      noteRe.lastIndex = i;
      const r = noteRe.exec(text);
      if (r && L.noteBase.has(r[1])) { push(i, i + r[0].length, "pitch"); i += r[0].length; prevSig = "p"; continue; }
      const rr = /[A-Za-z\u00C0-\uFFFF]+/y; rr.lastIndex = i; const wr = rr.exec(text);
      if (wr) {
        const w = wr[0];
        if (L.restNames.has(w)) { push(i, i + w.length, "rest"); i += w.length; prevSig = "r"; continue; }
        push(i, i + w.length, "name"); i += w.length; prevSig = "w"; continue;
      }
      i++; continue;
    }
    if (t === "nonmusic") {
      if (c === "=" ) { i++; continue; }
      word.lastIndex = i; const wr = word.exec(text);
      if (wr) { push(i, i + wr[0].length, "name"); i += wr[0].length; continue; }
      const w2 = /[^\s{}<>"\\%#=|]+/y; w2.lastIndex = i; const r2 = w2.exec(text);
      if (r2) { push(i, i + r2[0].length, "name"); i += r2[0].length; continue; }
      i++; continue;
    }
    // lyrics / markup: words (a lyric hyphen or extender is not a word)
    if (t === "lyrics" && (text.startsWith("--", i) || text.startsWith("__", i))) { push(i, i + 2, "lyric_punct"); i += 2; continue; }
    const w3 = /[^\s{}<>"\\%#|]+/y; w3.lastIndex = i; const r3 = w3.exec(text);
    if (r3) {
      let e = i + r3[0].length;
      if (t === "lyrics") { const k = r3[0].search(/--|__/); if (k > 0) e = i + k; }
      if (t === "lyrics" && text[i] === "=") { i++; continue; }
      push(i, e, "word"); i = e; continue;
    }
    i++;
  }
  return { tokens, gaps: gm, lines: [] };
}

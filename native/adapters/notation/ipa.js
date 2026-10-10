// adapters/notation/ipa.js — the INTERNATIONAL PHONETIC ALPHABET as a MEDIUM ADAPTER (text channel).
//
// WHAT THIS IS. The SYSTEM UNDER TEST of eval/notation-competence/ipa.mjs. It is NOT the gold: the gold is the WikiPron
// segmentation (cldf `segments` library) and PHOIBLE (SegmentClass, inventories); see the instrument header. The kernel
// stays medium-blind (READING-SPEC S6/S16): everything that knows what a tie bar, a length mark or a tone letter is lives here.
//
// ZERO MODEL. No LLM, no network, no learned weights at run time. Every number the reader uses is a RECEIVED prior with a
// named giver (priors/notation-ipa-*.json) or a count made on the prefix already read. Nothing is tuned here.
//
// LOVELACE'S LAW applied: the reader recovers what the text ORDERS (a base letter orders a segment, a modifier orders a
// binding to its host, a tie bar orders a join with the next base), never what a sound "is".
//
// WHAT THE PRIORS DO (priors REFUSE or NOMINATE, never admit):
//   notation-ipa-chart.json     giver: the IPA chart (IPA, CC BY-SA 4.0) as encoded in ipapy ipa.dat (MIT) + the Unicode
//        Character Database 16.0.0 (general categories, Scripts). A STANDARDS table: no split-derived count. NOMINATES a role
//        and consonant/vowel class per symbol; REFUSES (as 'foreign') letters of scripts the chart does not use.
//   notation-ipa-binding.json   giver: WikiPron TRAIN-language gold segmentation. head/continuation counts per code point.
//        OVERRIDES a chart-nominated dependency only where TRAIN has >= BINDING_MIN_N observations that say otherwise.
//        Stress marks and syllable breaks never occur in WikiPron segments: their binding is NOT TRAIN-attested (typed gap).
//   notation-ipa-segments.json  giver: WikiPron TRAIN segment types + PHOIBLE TRAIN segment classes. NOMINATES the class of an
//        exact segment string attested in TRAIN; an unattested string gets the chart head class or a typed gap.
//   notation-ipa-identify.json  giver: TRAIN lines (IPA pronunciations vs the orthography of the same words): per-character-class
//        log-likelihood ratios over 17 classes. R0 only. v2 (see the instrument's run log): only classes the CHART nominates may carry positive
//        evidence (others are capped at <= 0: they can REFUSE, never nominate); a chart symbol TRAIN IPA text never contains (stress marks, '.') is the
//        zero-evidence class chart_unattested. It is a ONE-VS-REST test (IPA vs not); arbitration among all systems belongs to the orchestrator.
//
// CAUSAL. `read` / `ear` / `identify` are single left-to-right passes. A token is CLOSED when the NEXT code point has been read
// (a modifier may still follow); the `at` of a being is the number of UTF-16 code units consumed when it was closed. With
// final=false the last open token is flagged `open` and carries no `at`. The instrument checks prefix-stability: every being
// with at <= |prefix| in read(prefix, {final:false}) equals the same being in read(full).
//
// CASING is not used (IPA has no case; capital letters are 'foreign' to the chart unless the chart lists them).
//
// TYPED GAPS (never silent): prior_missing:<name>, class_unknown, binding_unseen_in_train, stress_binding_not_train_attested,
// syllable_break_unmodelled, foreign_symbol, not_ipa, claims_not_applicable (IPA text states no propositions).
//
// EXPORTS
//   loadPriors({dir}) -> {chart, binding, segments, identify, gaps, idx, ok}     compilePriors(raw) -> same from objects
//   identify(text, {priors, complete, trace}) -> {system, verdict, llr, tau, at, gap, ...}   (R0)
//   ear(text, {priors, final}) -> [{text, span, kind, cls, ...}]                  (R1/R2)
//   read(text, {priors, final}) -> {system, tokens, beings:[{id,kind,span,...}], relations:[{end1,label,end2}], gaps}
//   classify(segmentString, {priors}) -> {cls, how}                               (R2)
//   canon(text, {priors}) -> string                                                (R5: base heads only)
//   baseSetOf(res) -> Set of base letters declared as beings                       (R3)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KEY_ALPHA } from "../text/keyness.js";

export const FAMILY = "ipa";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PRIORS_DIR = path.resolve(HERE, "../../priors");
export const PRIOR_FILES = Object.freeze({
  chart: "notation-ipa-chart.json",
  binding: "notation-ipa-binding.json",
  segments: "notation-ipa-segments.json",
  identify: "notation-ipa-identify.json",
});
/** A TRAIN override of a chart-nominated dependency needs this many TRAIN observations (declared, P4: the same floor as a recurrence of 20 tokens). */
export const BINDING_MIN_N = 20;

// ── priors ───────────────────────────────────────────────────────────────────────────────
/** loadPriors({dir}) -> {chart, binding, segments, identify, gaps, idx, ok}. A missing file is a typed gap, never a throw. */
export function loadPriors({ dir = PRIORS_DIR } = {}) {
  const raw = {}; const gaps = [];
  for (const [k, f] of Object.entries(PRIOR_FILES)) {
    try { raw[k] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); }
    catch { raw[k] = null; gaps.push({ reason: `prior_missing:${k}`, file: f }); }
  }
  const P = compilePriors(raw);
  P.gaps = gaps; P.dir = dir; P.ok = gaps.length === 0;
  return P;
}

/** Compile raw prior objects into lookup tables. The instrument calls this with ABLATED / DERANGED copies for its controls. */
export function compilePriors(raw) {
  const { chart = null, binding = null, segments = null, identify: ident = null } = raw ?? {};
  const idx = { table: new Map(), seq: new Map(), bind: new Map(), phoible: new Map(), wikipron: new Map(), scriptLo: [], scriptHi: [], scriptIx: [], scriptNames: [] };
  if (chart) {
    for (const [h, r] of Object.entries(chart.codepoints ?? {})) idx.table.set(parseInt(h, 16), r);
    for (const [s, r] of Object.entries(chart.sequences ?? {})) idx.seq.set(s, r);
    for (const [lo, hi, ix] of chart.scriptRanges ?? []) { idx.scriptLo.push(lo); idx.scriptHi.push(hi); idx.scriptIx.push(ix); }
    idx.scriptNames = chart.scriptNames ?? [];
  }
  if (binding) for (const [h, r] of Object.entries(binding.codepoints ?? {})) idx.bind.set(parseInt(h, 16), r);
  if (segments) {
    for (const [s, counts] of Object.entries(segments.phoible ?? {})) {
      let best = null, bn = -1, tot = 0;
      for (const [c, n] of Object.entries(counts)) { tot += n; if (n > bn || (n === bn && c < best)) { best = c; bn = n; } }
      idx.phoible.set(s, { cls: best, n: tot });
    }
    for (const [s, v] of Object.entries(segments.wikipron ?? {})) idx.wikipron.set(s, v);
  }
  return { chart, binding, segments, identify: ident, idx, gaps: [], ok: !!(chart && binding && segments && ident) };
}

let _P = null;
const PR = (p) => p ?? (_P ??= loadPriors());

function scriptOf(cp, I) {
  const lo = I.scriptLo; let a = 0, b = lo.length - 1, ans = -1;
  while (a <= b) { const m = (a + b) >> 1; if (lo[m] <= cp) { ans = m; a = m + 1; } else b = m - 1; }
  if (ans < 0 || cp > I.scriptHi[ans]) return null;
  return I.scriptNames[I.scriptIx[ans]] ?? null;
}

// ── one code point ───────────────────────────────────────────────────────────────────────
const SPACE_RE = /\s/u;
const isTone = (cp) => (cp >= 0x02e5 && cp <= 0x02e9);
/**
 * charInfo(cp, P) -> {cp, ch, gc, script, role, attach, cls?, inChart, ...}
 *   role    chart role (base|diacritic|tie|length|stress|boundary|tone-letter|tone-mark|suprasegmental) or one nominated by the
 *           UCD general category (modifier|combining|digit|punct|symbol|space) or 'foreign' | 'other'
 *   attach  how the reader treats it: head | prev | next | tie | tone | solo | space
 */
export function charInfo(cp, P) {
  const I = P.idx;
  const ch = String.fromCodePoint(cp);
  const r = I.table.get(cp);
  const script = scriptOf(cp, I);
  const inChart = !!(r && r.role);
  let gc = r?.gc ?? null;
  let role = r?.role ?? null;
  if (SPACE_RE.test(ch)) return { cp, ch, gc: gc ?? "Zs", script, role: "space", attach: "space", inChart: false };
  if (!role) {
    if (gc === null) {
      role = script === "Latin" ? "base" : script === "Inherited" ? "combining" : script === "Common" ? "other" : "foreign";
    } else if (gc === "Lm") role = "modifier";
    else if (gc[0] === "M") role = "combining";
    else if (gc === "Ll" || gc === "Lu" || gc === "Lt" || gc === "Lo") role = script === "Latin" ? "base" : "foreign";
    else if (gc[0] === "N") role = "digit";
    else if (gc[0] === "P") role = "punct";
    else if (gc[0] === "S") role = "symbol";
    else role = "other";
  } else if (role === "tone-mark" || role === "suprasegmental") {
    // a chart tone/suprasegmental symbol that is a combining mark or modifier letter rides on its host; otherwise it is a free-standing sign
    role = (gc && (gc[0] === "M" || gc === "Lm")) ? (role === "tone-mark" ? "tone-mark" : "diacritic") : "symbol";
  }
  let attach;
  switch (role) {
    case "base": attach = "head"; break;
    case "diacritic": case "combining": case "modifier": case "length": case "tone-mark": attach = "prev"; break;
    case "tie": attach = "tie"; break;
    case "stress": attach = "next"; break;
    case "tone-letter": attach = "tone"; break;
    default: attach = "solo";
  }
  // TRAIN override: a chart-nominated dependent that TRAIN says is (nearly always) independent. Only with enough observations.
  const b = I.bind.get(cp);
  let bindingSeen = !!b;
  if (attach === "prev" && b && (b.h + b.c) >= BINDING_MIN_N && b.c / (b.h + b.c) < 0.5) attach = "solo";
  return { cp, ch, gc, script, role, attach, inChart, bindingSeen, cls: r?.cls ?? null };
}

// ── ear: one left-to-right pass ──────────────────────────────────────────────────────────
/**
 * earTokens(text, {priors, final}) -> {tokens, gaps}
 * token: {text, span:[s,e], kind:'segment'|'tone'|'digit'|'punct'|'foreign'|'other', head, bases:[ch], mods:[{ch,span,role,dir}], at, open?}
 * A token is closed when the next code point is read. Whitespace separates words and is not a token.
 */
export function earTokens(text, { priors, final = true } = {}) {
  const P = PR(priors);
  if (!P.chart) return { tokens: [], gaps: [{ reason: "prior_missing:chart" }] };
  const tokens = []; const gapCount = new Map();
  const gap = (reason) => gapCount.set(reason, (gapCount.get(reason) ?? 0) + 1);
  let cur = null; let prefix = [];
  const closeAt = (at) => { if (cur) { cur.at = at; cur.text = text.slice(cur.span[0], cur.span[1]); tokens.push(cur); cur = null; } };
  // a forward prefix with nothing left to bind (the word ended) is a stray modifier: its own token, typed
  const flushPrefix = () => { for (const m of prefix) { tokens.push({ kind: "other", span: m.span.slice(), text: m.ch, head: m.ch, bases: [], mods: [], at: m.span[1], stray: true }); gap("modifier_without_host"); } prefix = []; };
  const newTok = (kind, i, w) => {
    const t = { kind, span: [prefix.length ? prefix[0].span[0] : i, i + w], head: null, bases: [], mods: prefix.map((m) => ({ ...m, dir: "next" })), at: null, tiePending: false };
    prefix = []; return t;
  };
  for (let i = 0; i < text.length;) {
    const cp = text.codePointAt(i); const w = cp > 0xffff ? 2 : 1;
    const inf = charInfo(cp, P);
    const here = i + w;
    switch (inf.attach) {
      case "space": closeAt(here); flushPrefix(); break;
      case "head": {
        if (cur && cur.tiePending && cur.kind === "segment") { cur.span[1] = here; cur.bases.push(inf.ch); cur.tiePending = false; cur.joined = true; break; }
        closeAt(here);
        cur = newTok("segment", i, w); cur.head = inf.ch; cur.bases.push(inf.ch);
        if (!inf.inChart && inf.role === "base") cur.nonChart = true;
        break;
      }
      case "tone": {
        if (cur && cur.kind === "tone") { cur.span[1] = here; cur.bases.push(inf.ch); break; }
        closeAt(here);
        cur = newTok("tone", i, w); cur.head = inf.ch; cur.bases.push(inf.ch);
        break;
      }
      case "prev": case "tie": {
        if (cur) {
          cur.span[1] = here; cur.mods.push({ ch: inf.ch, span: [i, here], role: inf.role, dir: "prev", seen: !!inf.bindingSeen });
          if (inf.attach === "tie") cur.tiePending = true;
        } else {
          // no host in this word: it binds FORWARD to the next token (a modifier at word start)
          prefix.push({ ch: inf.ch, span: [i, here], role: inf.role, seen: !!inf.bindingSeen });
        }
        break;
      }
      case "next": {
        closeAt(here);
        prefix.push({ ch: inf.ch, span: [i, here], role: inf.role, seen: false });
        gap("stress_binding_not_train_attested");
        break;
      }
      default: { // solo: digit, punct, symbol, foreign, other, boundary
        closeAt(here);
        const kind = inf.role === "digit" ? "digit" : inf.role === "foreign" ? "foreign" : (inf.role === "boundary" || inf.role === "punct" || inf.role === "symbol") ? "punct" : "other";
        cur = newTok(kind, i, w); cur.head = inf.ch; cur.role = inf.role; cur.gc = inf.gc;
        if (inf.role === "foreign") gap("foreign_symbol");
        if (inf.ch === ".") gap("syllable_break_unmodelled");
      }
    }
    i = here;
  }
  if (cur) { if (final) closeAt(text.length); else { cur.open = true; cur.text = text.slice(cur.span[0], cur.span[1]); tokens.push(cur); cur = null; } }
  if (final) flushPrefix();
  for (const t of tokens) if (t.tiePending) delete t.tiePending;
  return { tokens, gaps: [...gapCount].map(([reason, count]) => ({ reason, count })) };
}

/** What class is this segment string? {cls: 'consonant'|'vowel'|'tone'|'unknown', how}. TRAIN-attested exact strings first, then the chart head. */
export function classify(seg, { priors } = {}) {
  const P = PR(priors);
  if (!P.chart) return { cls: "unknown", how: "prior_missing:chart" };
  const s = seg.normalize("NFC");
  const memo = (P._cls ??= new Map());
  const hit = memo.get(s);
  if (hit) return hit;
  const r = classifyUncached(s, P);
  memo.set(s, r);
  return r;
}
function classifyUncached(s, P) {
  const att = P.idx.phoible.get(s);
  if (att) return { cls: att.cls, how: "phoible_train", n: att.n };
  const { tokens } = earTokens(s, { priors: P });
  const first = tokens.find((t) => t.kind === "segment" || t.kind === "tone" || t.kind === "digit");
  if (!first) return { cls: "unknown", how: "no_being" };
  if (first.kind === "tone") return { cls: "tone", how: "chart_tone_letter" };
  if (first.kind === "digit") return { cls: first.gc === "No" ? "tone" : "unknown", how: "digit" };
  return headClass(first, P);
}

function headClass(tok, P) {
  const I = P.idx;
  const full = tok.text.normalize("NFC");
  const sq = I.seq.get(full);
  // a chart-listed multi-codepoint symbol (e.g. 'e̞' mid front) names its class directly
  if (sq && (sq.cls === "consonant" || sq.cls === "vowel")) return { cls: sq.cls, how: "chart_sequence" };
  for (const ch of tok.bases) {
    for (const d of ch.normalize("NFD")) { // precomposed letters (ã) decompose to their base letter
      const r = I.table.get(d.codePointAt(0));
      if (r && (r.cls === "consonant" || r.cls === "vowel")) return { cls: r.cls, how: "chart_head" };
      if (r && r.role === "base") break; // a base letter the chart gives no class: do not fall through to a later letter
    }
    break; // class of the FIRST base only (a tie-bar affricate is read by its first component)
  }
  return { cls: "unknown", how: "head_not_in_chart" };
}

/** ear(text, {priors, final}) -> [{text, span, kind, cls, ...}]  (tokens with their class). */
export function ear(text, { priors, final = true } = {}) {
  const P = PR(priors);
  const { tokens } = earTokens(text, { priors: P, final });
  return tokens.map((t) => {
    let cls = null;
    if (t.kind === "segment") cls = classify(t.text, { priors: P }).cls;
    else if (t.kind === "tone") cls = "tone";
    else if (t.kind === "digit") cls = t.gc === "No" ? "tone" : "other";
    else cls = t.kind;
    return { text: t.text, span: t.span.slice(), start: t.span[0], end: t.span[1], kind: t.kind, cls, bases: t.bases.slice(), mods: t.mods.map((m) => m.ch), at: t.at, ...(t.open ? { open: true } : {}) };
  });
}

/**
 * read(text, {priors, final}) -> {system, tokens, beings, relations, gaps}
 * beings     one per segment/tone/digit token: {id:'p<k>', kind:'segment'|'tone', type, cls, span, at, bases, mods}
 *            `type` is the identity fold (the NFC string): the same segment recurring is the same being; `id` is the mention.
 * relations  {end1:'m:<s>-<e>' (a modifier's span), label:'binds'|'ties', end2: being id, mod, role, dir}
 *            {end1: being id, label:'isa', end2:'consonant'|'vowel'|'tone'}   (class)
 */
export function read(text, { priors, final = true } = {}) {
  const P = PR(priors);
  const { tokens, gaps: g0 } = earTokens(text, { priors: P, final });
  if (!P.chart) return { system: null, tokens: [], beings: [], relations: [], gaps: g0 };
  const beings = [], relations = [], gapCount = new Map(g0.map((g) => [g.reason, g.count]));
  const gap = (r) => gapCount.set(r, (gapCount.get(r) ?? 0) + 1);
  let k = 0;
  for (const t of tokens) {
    if (t.kind !== "segment" && t.kind !== "tone" && t.kind !== "digit") continue;
    const id = `p${k++}`;
    let cls, how = null;
    if (t.kind === "segment") { const c = classify(t.text, { priors: P }); cls = c.cls; how = c.how; if (cls === "unknown") gap("class_unknown"); }
    else if (t.kind === "tone") cls = "tone";
    else cls = t.gc === "No" ? "tone" : "unknown";
    const b = { id, kind: t.kind === "segment" ? "segment" : "tone", type: t.text.normalize("NFC"), cls, span: t.span.slice(), at: t.at, bases: t.bases.slice(), mods: t.mods.map((m) => m.ch) };
    if (how) b.how = how;
    if (t.open) b.open = true;
    beings.push(b);
    for (const m of t.mods) {
      relations.push({ end1: `m:${m.span[0]}-${m.span[1]}`, label: m.role === "tie" ? "ties" : "binds", end2: id, mod: m.ch, role: m.role, dir: m.dir, span: m.span.slice() });
      if (!m.seen) gap("binding_unseen_in_train");
    }
    if (cls !== "unknown") relations.push({ end1: id, label: "isa", end2: cls });
  }
  return { system: beings.length ? "ipa" : null, tokens, beings, relations, gaps: [...gapCount].map(([reason, count]) => ({ reason, count })).concat([{ reason: "claims_not_applicable", count: 1 }]) };
}

/** The base letters (first NFD code point of each base the reader declared; ASCII g folded to the IPA script g U+0261): the reader's OWN heads, unfiltered. */
export function baseSetOf(res) {
  const out = new Set();
  for (const b of res.beings) if (b.kind === "segment") for (const ch of b.bases) for (const d of ch.normalize("NFD")) { if (/\p{L}/u.test(d) && !/\p{Lm}/u.test(d)) { out.add(d === "g" ? "ɡ" : d); break; } }
  return out;
}

/** R5: the base-letter skeleton of a transcription (modifiers, tie bars, length, tone removed): what the beings are, not how they are decorated. */
export function canon(text, { priors } = {}) {
  const P = PR(priors);
  const { tokens } = earTokens(text, { priors: P });
  let out = "";
  for (const t of tokens) if (t.kind === "segment") for (const ch of t.bases) for (const d of ch.normalize("NFD")) { if (/\p{L}/u.test(d) && !/\p{Lm}/u.test(d)) { out += d === "g" ? "ɡ" : d; break; } }
  return out;
}

// ── R0: identify ─────────────────────────────────────────────────────────────────────────
/** The code-point classes R0's naive-Bayes runs over (a fixed grammar of the notation; the LLR per class is TRAIN-derived). v2 (registered in the instrument's run log): 17 classes. */
export const KLASSES = Object.freeze(["ascii_letter_chart", "ascii_letter_nonchart", "latin_other_letter", "chart_latin_letter", "ipa_extension_letter", "modifier_letter", "combining_mark", "tone_letter", "super_digit", "ascii_digit", "space", "ipa_punct", "other_punct", "greek_letter", "foreign_letter", "chart_unattested", "other"]);
const K = Object.freeze(Object.fromEntries(KLASSES.map((n, i) => [n, i])));
/** The Unicode blocks the Standard dedicates to phonetic notation (the block NAME comes from the chart prior's table, not from code): letters there are IPA-exclusive evidence. */
const EXCLUSIVE_BLOCKS = new Set(["IPA Extensions", "Phonetic Extensions", "Phonetic Extensions Supplement", "Latin Extended-G"]);
const IPA_EXT = (cp, P) => EXCLUSIVE_BLOCKS.has(P.idx.table.get(cp)?.b);
/**
 * classOfChar(cp, P) -> index into KLASSES.
 * A chart symbol that TRAIN IPA text never contains (a code point absent from the TRAIN binding table: '.', stress marks, rare letters) is the NEUTRAL class
 * chart_unattested: priors NOMINATE only what TRAIN attests. ASCII A-Z are chart-refused (IPA has no capitals); casing is ONE witness here, its LLR is TRAIN-derived.
 */
export function classOfChar(cp, P) {
  const I = P.idx;
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return I.table.get(cp)?.role ? K.ascii_letter_chart : K.ascii_letter_nonchart;
  if (cp >= 0x30 && cp <= 0x39) return K.ascii_digit;
  const inf = charInfo(cp, P);
  if (inf.role === "space") return K.space;
  if (inf.inChart && !I.bind.has(cp)) return K.chart_unattested;
  switch (inf.role) {
    case "base": return IPA_EXT(cp, P) ? K.ipa_extension_letter : inf.inChart ? K.chart_latin_letter : K.latin_other_letter;
    case "modifier": case "length": case "stress": case "diacritic": return inf.gc === "Lm" ? K.modifier_letter : K.combining_mark;
    case "combining": case "tone-mark": case "tie": case "suprasegmental": return inf.gc && inf.gc[0] === "M" ? K.combining_mark : K.modifier_letter;
    case "tone-letter": return K.tone_letter;
    case "digit": return K.super_digit;
    case "punct": case "boundary": return inf.inChart ? K.ipa_punct : K.other_punct;
    case "foreign": return inf.script === "Greek" ? K.greek_letter : K.foreign_letter;
    case "symbol": return (inf.gc === "Sk" || inf.gc === "Lm") ? K.modifier_letter : K.other_punct;
    default: return K.other;
  }
}

/**
 * R0: is this text IPA? A causal accumulation of per-class log-likelihood ratios (TRAIN-derived, notation-ipa-identify.json).
 * verdict: 'ipa' if the running LLR >= +tau, 'not_ipa' if <= -tau, else 'undecided' (the default answer to 'is it IPA?' is no).
 * tau = ln((1-a)/a), a = KEY_ALPHA (derived). `at` = the first code-unit offset at which |LLR| reached tau (null if never).
 * {trace:true} adds `trace`: the running LLR after each UTF-16 code unit (a code point's LLR lands on its last unit).
 */
export function identify(text, { priors, complete = true, trace = false } = {}) {
  const P = PR(priors);
  const ID = P.identify;
  if (!text || !text.length) return { system: null, verdict: "undecided", gap: "empty", llr: 0 };
  if (!ID || !P.chart) return { system: null, verdict: "undecided", gap: "prior_missing:identify", llr: 0 };
  if (JSON.stringify(ID.classes) !== JSON.stringify(KLASSES)) return { system: null, verdict: "undecided", gap: "prior_klasses_mismatch", llr: 0 };
  const tau = Math.log((1 - KEY_ALPHA) / KEY_ALPHA);
  let s = 0, at = null, exclusive = 0; const counts = new Array(KLASSES.length).fill(0); const tr = trace ? new Array(text.length) : null;
  for (let i = 0; i < text.length;) {
    const cp = text.codePointAt(i); const w = cp > 0xffff ? 2 : 1;
    const k = classOfChar(cp, P);
    counts[k]++;
    if (k === K.ipa_extension_letter) exclusive++;
    s += ID.llr[k];
    if (at === null && Math.abs(s) >= tau) at = i + w;
    if (tr) for (let j = 0; j < w; j++) tr[i + j] = s;
    i += w;
  }
  const verdict = s >= tau ? "ipa" : s <= -tau ? "not_ipa" : "undecided";
  const out = { system: verdict === "ipa" ? "ipa" : null, verdict, llr: s, tau, at, gap: verdict === "ipa" ? null : verdict === "not_ipa" ? "not_ipa" : "undecided", classes: Object.fromEntries(KLASSES.map((n, i) => [n, counts[i]])), witnessed: exclusive > 0 };
  if (tr) out.trace = tr;
  return out;
}

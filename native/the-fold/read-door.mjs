// read-door.mjs — the body of the proxy's POST /v1/read, as a function a test can call without a server.
//
// A read is not a draw: khora perceives, model-free, and the mouth is never consulted. This is the same reader the
// proxy always ran (corpus-session.js: createSession → admitChunked → sessionReferents/sessionRelations). What changed
// (2026-10-05) is what the door SAYS and which language it reads in:
//
//   • LANGUAGE. The proxy used to pass `language: "en"` for every document, which switched off the reader's own
//     language leg (corpus-session.js readDocument: "a declared language, else the one the text's own words attest —
//     measured, never a silent default"). The door now takes a DECLARED language from the caller, and otherwise lets
//     the reader hear it. Measured on an 11-language gold set (48 entities): recall 11/48 forced-English → 14/48 detected;
//     Spanish 2/5 → 5/5, Hindi 0/4 → 1/4, Arabic 1/4 → 0/4 (a regression), Russian / Chinese / Japanese 0 either way.
//     So the hardcode was NOT the main cause of the non-Latin zeros: those are the reader's recurrence floor
//     (`minMentions: 2`) and its immature non-Latin grammars, and this door does not pretend otherwise.
//   • DISCLOSURE. `priorsInjected`, `basis` and `language` are now what the reader reported for THIS document, not
//     strings written in advance (the old basis claimed "bin/priors/lang/en.json absent" for every read).
//   • EAR BY SIGNAL (2026-10-07, additive; default OFF). When the language LABEL is the weak link — the polyfill measured
//     English → `lat` on a Tesla text — the ear can be chosen by what it HEARS instead: run the read under each candidate
//     ear and keep the one whose reading carries the most SIGNAL (relations between content tokens, not function words or
//     punctuation). Pass `earSelection: "signal"` (optional `earCandidates`, `earProbeChars`). The choice and its scores
//     are disclosed in `earSelection` and `basis`; `languageSource` becomes `"by-ear"`.
//   • CODE-SWITCHING (a session is ONE grammar per document, so a single ear cannot hear a switch). When the material is
//     script-heterogeneous the door SEGMENTS it (script runs) and chooses an ear PER SEGMENT by the same signal rule,
//     reads each segment under its own ear, and merges. `languageSource` becomes `"by-ear-mixed"` and `earSelection.spans`
//     lists each segment's script, ear and signal. RESIDUAL, typed: switching WITHIN one script in one sentence (Hinglish,
//     Arabizi) cannot be segmented by script and is flagged `same_script_switch_unresolved` — that needs per-token ears in
//     corpus-session's reader, which this door does not own.
//   The signal mode is OFF by default so it does not override the separate language-detection work; flip the default when
//   that lands.
//
// Stages 5b-8 are still not run by this host; they are named, never implied (P2).

import { createSession, admitChunked, sessionReferents, sessionRelations } from "./corpus-session.js";
import { availableStems, DETECT_STEMS } from "./language-grammar.js";
import { sentenceLanguages } from "./langid.mjs";
import { createActivation } from "../kernel/activation.js";

// ── PHEROMONE TRAILS (stigmergy; kernel/activation.js is the organ — the leafcutter handle: deposits evaporate unless
// reinforced). The ear/space traversal leaves a decaying trace keyed by the SEGMENT SHAPE and the ear it chose, weighted by
// how much SIGNAL that ear extracted. A later segment of the same shape starts from the strongest trail instead of probing
// every ear again — "synergistically traverse spaces, do not recompute everything everywhere". Trails decay, so a wrong
// choice does not ossify; exploration is the fallback when no trail is strong. One trail table per process (a projection).
const TRAILS = createActivation({ window: 64 });
const SCORE_CACHE = new Map();
const EXPLOIT_BAR = 3;                       // a trail strong enough to skip exploration of the rest of the ear space (content relations)
const shapeOf = (text) => { const toks = (String(text ?? "").toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []); const h = [0, 0, 0, 0]; for (const t of toks) h[Math.min(3, t.length)] += 1; return `n${Math.round(toks.length / 16)}:l${h.map((x) => Math.min(x, 9)).join("")}`; };
const trailKey = (shape, language) => `ear|${shape}|${language}`;
// LANGUAGE-space trails, same organ: keyed by a stable hash of the document, reinforced per read, reused while strong.
const LANG_TRAILS = createActivation({ window: 64 });
const LANG_MEMO = new Map();
const LANG_EXPLOIT_BAR = 2;               // reads needed before a document's trail is trusted (declared, ants' reinforce rule)
const materialHash = (text) => { let h = 2166136261; for (const ch of String(text ?? "")) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
export const pheromoneOf = (text, language) => TRAILS.activationOf(trailKey(shapeOf(text), language));
const depositPheromone = (text, language, amount) => { const n = Math.max(0, Math.round(amount)); for (let i = 0; i < n; i += 1) TRAILS.observe([trailKey(shapeOf(text), language)]); };

const DECLARED = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
export const STAGES_NOT_RUN = Object.freeze(["5b", "6", "7", "8"]);

// The candidate ears a signal read may choose among (intersected with the languages that have a grammar). Cased-Latin by
// default, since that is where a label misdetection (English→Latn) does its damage; a caller may pass its own list.
export const EAR_CANDIDATES = Object.freeze(["eng", "spa", "fra", "deu", "ita", "por", "nld", "cat", "ron", "lat"]);
// Per-script candidate ears (intersected with availableStems), so a non-Latin segment is not probed with Latin ears.
export const SCRIPT_STEMS = Object.freeze({
  Latn: EAR_CANDIDATES,
  Cyrl: ["rus", "ukr", "bul"],
  Grek: ["ell"],
  Arab: ["arb", "fas", "urd"],
  Hebr: ["heb"],
  Hani: ["cmn", "cmn-hans", "jpn", "lzh"],
  Hira: ["jpn"], Kana: ["jpn"], Hang: ["kor"], Deva: ["hin", "mar"],
});
const CLOSED = new Set(["a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by", "from", "as", "is", "was", "were", "be", "been", "are", "he", "she", "it", "they", "his", "her", "its", "that", "this", "which", "who", "had", "has", "have", "not", "de", "la", "el", "los", "las", "y", "que", "il", "lo", "le", "les", "et", "der", "die", "das", "und", "o", "os", "as", "uma", "um", "e"]);
const PUNCT = /^[\p{P}\p{S}]+$/u;
export const isContent = (s) => { const t = String(s ?? "").trim(); return t.length > 0 && !CLOSED.has(t.toLowerCase()) && !PUNCT.test(t); };
/** The SIGNAL of a read: relations whose participant surfaces are ALL content tokens. Noise = propped on the/and/,/of.
 *  RAW signal is a size magnet (a big prior finds more relations by volume), so the ear selector below scores LIFT:
 *  signal divided by what the SAME ear predicts on a collocation-free control. */
export const contentSignal = (relations = []) => relations.filter((rel) => { const parts = (rel.participants ?? []).map((p) => p.surface).filter((s) => s != null); return parts.length >= 2 && parts.every(isContent); }).length;
/** A DETERMINISTIC noise control: the same text with every token's letters re-shuffled, so token count, length and
 *  script are preserved but no collocation or lexica is. An ear's signal on THIS is what its prior predicts by chance. */
export function noiseOf(text) {
  return (String(text ?? "").match(/[\p{L}\p{M}]+|\p{P}+|\p{S}+|\s+/gu) ?? []).map((tok) => {
    if (!/^\p{L}/u.test(tok) || tok.length < 4) return tok;
    const seeded = (ch, i) => { let h = 5381; for (const c of tok) h = Math.imul(h, 33) ^ c.codePointAt(0); h = Math.imul(h, 33) ^ ch.codePointAt(0) ^ (i * 31); return h >>> 0; };
    return [...tok].map((ch, i) => [seeded(ch, i), ch]).sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])).map((x) => x[1]).join("");
  }).join("");
}

// Unicode script of a character, for segmentation only (common/inherited marks ride the current run).
const SCRIPT_RES = [
  ["Latn", /[\p{Script=Latin}]/u], ["Cyrl", /[\p{Script=Cyrillic}]/u], ["Grek", /[\p{Script=Greek}]/u],
  ["Arab", /[\p{Script=Arabic}]/u], ["Hebr", /[\p{Script=Hebrew}]/u], ["Hani", /[\p{Script=Han}]/u],
  ["Hira", /[\p{Script=Hiragana}]/u], ["Kana", /[\p{Script=Katakana}]/u], ["Hang", /[\p{Script=Hangul}]/u],
  ["Deva", /[\p{Script=Devanagari}]/u], ["Thai", /[\p{Script=Thai}]/u], ["Geor", /[\p{Script=Georgian}]/u],
  ["Armn", /[\p{Script=Armenian}]/u], ["Taml", /[\p{Script=Tamil}]/u], ["Beng", /[\p{Script=Bengali}]/u],
];
export function scriptOf(ch) { for (const [name, re] of SCRIPT_RES) if (re.test(ch)) return name; return "Zyyy"; }

/** Segment text into maximal runs of one script (a script change is a language-switch candidate). Short runs (< minRun) ride
 *  the previous segment. This catches CROSS-script switching (EN/ZH); it cannot see a same-script switch. */
export function scriptSegments(text, { minRun = 6 } = {}) {
  const s = String(text ?? "");
  const out = [];
  for (const ch of s) {
    const sc = scriptOf(ch);
    if (sc === "Zyyy" || !out.length || out[out.length - 1].script === "Zyyy") {
      if (!out.length) out.push({ script: sc, text: ch });
      else { out[out.length - 1].text += ch; if (out[out.length - 1].script === "Zyyy" && sc !== "Zyyy") out[out.length - 1].script = sc; }
    } else if (out[out.length - 1].script === sc) out[out.length - 1].text += ch;
    else out.push({ script: sc, text: ch });
  }
  // coalesce runs shorter than minRun into their longer neighbour (a stray quote is not a language)
  const merged = [];
  for (const run of out) { const prev = merged[merged.length - 1]; if (prev && (run.text.length < minRun || prev.script === "Zyyy")) { prev.text += run.text; if (prev.script === "Zyyy") prev.script = run.script; } else merged.push({ ...run }); }
  return merged.filter((r) => r.text.trim().length);
}

/** A declared language, or null; throws RangeError for something that is not a language code. */
export function declaredLanguage(language) {
  if (language == null || language === "") return null;
  if (typeof language !== "string" || !DECLARED.test(language)) throw new RangeError("language must be a code like \"en\", \"es\" or \"zh-Hans\"; omit it to let the reader hear it");
  return language;
}

/** The core read, one language (declared, else the reader's own detection). Returns the EORead@1 body. */
async function readWith({ text, name = "", language = null, maxCharacters = 60000, now = () => Date.now(), memo = true } = {}) {
  const declared = declaredLanguage(language);
  const material = String(text ?? "").slice(0, maxCharacters);
  const truncated = material.length < String(text ?? "").length;
  const t0 = now();
  const sourceId = `doc:${(String(name).trim() || "unnamed").replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
  // PHEROMONE TRAILS in language space (same organ as the ear trails below: createActivation, observe/activationOf —
  // deposits evaporate unless the same document reinforces them). The detector's verdicts are deterministic, so a
  // recent trail is REUSED instead of recomputed; a wrong choice decays and never ossifies.
  const isLangTrail = !declared;
  const ltKey = isLangTrail ? `lang|${materialHash(material)}` : null;
  const ltFresh = ltKey ? LANG_TRAILS.activationOf(ltKey) >= LANG_EXPLOIT_BAR && LANG_MEMO.has(ltKey) : false;
  const langRows = ltFresh ? LANG_MEMO.get(ltKey) : sentenceLanguages(material, { stems: DETECT_STEMS }).map((s) => ({ sentence: s.text.slice(0, 120), language: s.language, confident: s.confident, inherited: s.inherited, margin: +s.margin.toFixed(1), script: s.script }));
  if (ltKey) { LANG_MEMO.set(ltKey, langRows); if (langRows.length) LANG_TRAILS.observe([ltKey]); }
  const session = createSession();
  admitChunked(session, { text: material, sourceId, ...(declared ? { language: declared } : {}) });
  const cast = await sessionReferents(session, { sourceId, priors: [], limit: 200 });
  const relations = await sessionRelations(session, { sourceId });
  const grammar = session.documents?.get?.(sourceId)?.grammar ?? null;
  const lang = grammar?.language ?? null;
  const source = declared ? "declared" : lang ? "detected" : "undetected";
  const referents = (cast.referents ?? []).map((r) => ({
    ref: r.id ?? null,                                  // the referent id relations carry; the join key for the sidecar projection
    surfaces: [r.display].filter(Boolean),
    allSurfaces: [...(r.surfaces ?? [])],
    routes: (r.fromPrior === true ? ["prior"] : ["witnessed"]).concat(r.individuation ? [`grain:${r.individuation}`] : []),
    grain: r.individuation ?? null,
  }));
  const gaps = [
    ...(truncated ? [`input_truncated: read ${material.length} of ${String(text).length} characters; a prefix is different material (S2)`] : []),
    ...(source === "undetected" ? [`language_undetected: ${grammar?.gap ?? "the text's words attest no language the reader has a grammar for"}; read with capitalisation alone`] : []),
    ...(cast.gaps ?? []).map((g) => (typeof g === "string" ? g : `${g.reason}`)),
  ].slice(0, 8);
  return {
    schema: "EORead@1", ms: now() - t0,
    source: sourceId, truncated, sourceCharacters: String(text ?? "").length, readCharacters: material.length, maxCharacters,
    assembly: "constitutional-host",
    language: lang, languageSource: source, languageDetected: grammar?.detected ?? null,
    priorsInjected: lang ? [`language:${lang}`] : [],
    languageTrail: { spans: langRows, memoized: ltFresh },
    stagesNotRun: [...STAGES_NOT_RUN],
    basis: `constitutional reader: createSession → admitChunked → sessionReferents; model-free; language ${lang ?? "none"} (${source}); stages 1-5a run, 5b-8 not run (this host does not wire them); a referent needs a second mention past the material's own floor`,
    sentences: [], relations: relations?.relations ?? relations ?? [],
    referents, descriptorBeings: [],
    gaps,
    disclosure: { giver: "heimdall", standing: "disclosed", rule: "a read is not a draw — the mouth is never consulted; the ground is a hypothesis (standing: hypothesis, half-life'd), never asserted (S1/P2/P3, khora)" },
  };
}

const haveStems = () => { try { return new Set(availableStems()); } catch { return new Set(); } };
/** Choose the ear by SIGNAL over ONE span: read a prefix under each candidate ear, keep the most content relations. */
export async function selectEarBySignal({ text, candidates = EAR_CANDIDATES, probeChars = 2000, name = "ear-probe", maxCharacters = 60000, now = () => Date.now() } = {}) {
  const have = haveStems();
  const cands = (candidates ?? []).map((c) => (c === "en" ? "eng" : c)).filter((c) => have.has(c));
  const probe = String(text ?? "").slice(0, Math.min(probeChars, maxCharacters));
  const shape = shapeOf(probe);
  // STIGMERGY: walk the ear space starting from the strongest trail; on a fresh shape, no trail exists and every candidate is
  // probed (exploration); once a trail is laid, the strongest ear is read first and, if it carries enough signal, the rest of
  // the space is skipped (exploitation — do not recompute everywhere). Reads are memoised by (ear, probe).
  const ordered = [...cands].sort((a, b) => pheromoneOf(probe, b) - pheromoneOf(probe, a) || a.localeCompare(b));
  const score = async (c) => {
    const ck = `${c}|${probe.length}|${shape}|lift`;
    if (SCORE_CACHE.has(ck)) return SCORE_CACHE.get(ck);
    // the text's signal under this ear AND the SAME ear's signal on its chance control (the noise probe). LIFT = signal /
    // (1 + noise): a per-unit-prior score — a big prior still predicts relations on any control, and is down-weighted.
    const body = await readWith({ text: probe, name, language: c, maxCharacters, now });
    const noiseBody = await readWith({ text: noiseOf(probe), name: name + "-noise", language: c, maxCharacters, now });
    const signal = contentSignal(body.relations ?? []);
    const noise = contentSignal(noiseBody.relations ?? []);
    const s = { language: c, signal, noise, lift: +(signal / (1 + noise)).toFixed(3), relations: (body.relations ?? []).length, cast: body.referents.length };
    SCORE_CACHE.set(ck, s);
    return s;
  };
  const scores = [];
  for (const c of ordered) {
    const s = await score(c);
    scores.push(s);
    if (s.lift >= EXPLOIT_BAR && pheromoneOf(probe, c) > 0) break;   // follow the trail; stop probing the rest
  }
  scores.sort((a, b) => b.lift - a.lift || b.signal - a.signal || b.noise - a.noise || a.language.localeCompare(b.language));
  const winner = scores[0]?.language ?? null;
  if (winner) depositPheromone(probe, winner, Math.max(1, Math.round(scores[0].lift)));
  return { winner, scores, explored: scores.length, candidates: cands.length, shape };
}
/** Per-span ear selection for CODE-SWITCHED material: one winner per script segment. */
export async function selectSegmentEars({ text, segments, probeChars = 2000, name = "ear-probe", now = () => Date.now() } = {}) {
  const have = haveStems();
  const spans = [];
  for (const seg of segments) {
    const cands = (SCRIPT_STEMS[seg.script] ?? EAR_CANDIDATES).filter((c) => have.has(c));
    const sel = await selectEarBySignal({ text: seg.text, candidates: cands, probeChars, name, now });
    spans.push({ script: seg.script, sample: seg.text.trim().slice(0, 40), language: sel.winner, signal: sel.scores[0]?.signal ?? 0, explored: sel.explored, candidates: sel.candidates, scores: sel.scores });
  }
  return spans;
}

/** Merge per-segment reads into one body: referents by surface, relations by (relation|surfaces). */
function mergeBodies(bodies, langs) {
  const referents = new Map();
  for (const b of bodies) for (const r of b.referents) { const k = (r.surfaces ?? []).join("|"); if (k && !referents.has(k)) referents.set(k, r); }
  const seen = new Set(); const relations = [];
  for (const b of bodies) for (const rel of b.relations) { const k = `${rel.relation}|${(rel.participants ?? []).map((p) => p?.surface ?? "").join("|")}`; if (!seen.has(k)) { seen.add(k); relations.push(rel); } }
  const base = bodies[0];
  return {
    ...base,
    ms: bodies.reduce((a, b) => a + b.ms, 0),
    language: langs.length === 1 ? langs[0] : langs.join("+"),
    languageSource: "by-ear-mixed",
    priorsInjected: langs.map((l) => `language:${l}`),
    referents: [...referents.values()], relations,
  };
}

/** Read `text` and describe what the reader did. Returns the EORead@1 body. `earSelection: "signal"` chooses the ear by
 *  measured signal instead of the language label, and segments script-heterogeneous material (code-switching). */
export async function readDoor({ text, name = "", language = null, maxCharacters = 60000, now = () => Date.now(), earSelection = "detector", earCandidates = null, earProbeChars = 2000 } = {}) {
  if (earSelection === "signal" && !declaredLanguage(language)) {
    const material = String(text ?? "").slice(0, maxCharacters);
    const segments = scriptSegments(material);
    if (segments.length > 1) {
      const spans = await selectSegmentEars({ text: material, segments, probeChars: earProbeChars, name, now });
      const bodies = [];
      for (let i = 0; i < segments.length; i += 1) bodies.push(await readWith({ text: segments[i].text, name: `${name | 0}-${i}`, language: spans[i].language, now }));
      const langs = [...new Set(spans.map((s) => s.language).filter(Boolean))];
      const body = mergeBodies(bodies, langs);
      body.sourceCharacters = String(text ?? "").length; body.readCharacters = material.length;
      body.earSelection = { method: "signal-segmented", spans };
      body.gaps = [...(body.gaps ?? []), ...(langs.length > 1 ? [] : ["same_script_switch_unresolved: segments share one script; switching within a script in one sentence cannot be segmented by script and needs per-token ears in corpus-session (not this door)"])].slice(0, 8);
      body.basis = `constitutional reader, segmented by script for CODE-SWITCHING: ${segments.length} segment(s), ear per segment by SIGNAL; languages ${langs.join(", ") || "none"}; stages 1-5a run per segment, 5b-8 not run`;
      return body;
    }
    const sel = await selectEarBySignal({ text: material, candidates: earCandidates ?? EAR_CANDIDATES, probeChars: earProbeChars, name, now });
    const body = await readWith({ text, name, language: sel.winner, maxCharacters, now });
    if (sel.winner) { body.languageSource = "by-ear"; body.priorsInjected = [`language:${sel.winner}`]; }
    body.earSelection = { method: "signal", winner: sel.winner, scores: sel.scores, explored: sel.explored, candidates: sel.candidates, shape: sel.shape };
    body.basis = `${body.basis}; ear chosen by SIGNAL (content relations over ${sel.scores.length} candidate ears): ${sel.winner} [${sel.scores.map((s) => `${s.language}:${s.signal}`).join(", ")}]`;
    return body;
  }
  return readWith({ text, name, language, maxCharacters, now });
}

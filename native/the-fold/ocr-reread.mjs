// the-fold/ocr-reread.mjs: READING UNRELIABLE OCR WITHOUT LOSING THE INITIAL READING (the owner, 2026-11-28).
// An OCR text layer is a first reading of pixels by another instrument, and some of it is wrong ("Clenranc..: Agree-ment"). The house rule (CLAUDE.md, the design): reading is causal; when clearer evidence arrives we
// REVISE, record the delta and KEEP the earlier mistake. So this organ never edits the text. It writes a REREADING beside it: for each token the codec does not know, the forms it could have been, with the evidence;
// a proposal where one form clearly wins; `contested` where two do; `unknown` where none does. The initial token and its offsets stay in every row, and the initial text is rebuilt exactly from the rereading (tested).
//
// LEVEL: this is the SIGNAL level, below the reader: characters of one token against the codec's attested forms (the POS prior's `forms`, with its giver) through a channel of character confusions. It is not matching,
// ranking or reasoning on language: no sentence, name or relation is read here. What it proposes is then read by the one door like any text. A language with no form prior is the typed gap `no_form_prior`, never English.
// THE CHANNEL is measured, not written by hand: counts of character rewrites seen between an OCR engine's output and a known text (eval/ocr-reread). With no channel every single-character edit costs the same and the
// rereading says `channel: "uniform (unmeasured)"`. THE DIALS (`floor`, `margin`) are fitted on development pages and recorded with the run that fitted them; the defaults here are that run's.
// Pure: no I/O, no regex. `weaveRereading` (below) is the only part that touches the pharos.
import { priorJson } from "./prior-source.mjs";
import { sha16, canon, pharosLib, writeReading, TEXT_KIND } from "./pharos-reading.mjs";
import { pathToFileURL } from "node:url";

export const REREADING_KIND = "text-rereading", REREADING_CELL = "INS·Figure", SCHEMA = "OcrRereading@1";
export const DEFAULT_DIALS = Object.freeze({ floor: -14, margin: 2, docKnown: 2, maxEdits: 2 });   // replaced by the fitted values of eval/ocr-reread (see FREEZE there)
const isLetter = (c) => c.toLowerCase() !== c.toUpperCase(), isDigit = (c) => c >= "0" && c <= "9", isWord = (c) => isLetter(c) || isDigit(c);
const SPACE = new Set([" ", "\n", "\t", "\r", "\f", " "]), APOS = new Map([["’", "'"], ["‘", "'"], ["`", "'"]]);
const norm = (s) => [...s].map((c) => APOS.get(c) ?? c).join("").toLowerCase();

/** tokensOf(text) -> [{ at:[a,b], token, core, pre, post }]: whitespace tokens with offsets; `core` is the token without its edge punctuation (kept in pre/post) */
export function tokensOf(text) {
  const out = []; let i = 0; const n = text.length;
  while (i < n) { while (i < n && SPACE.has(text[i])) i++; if (i >= n) break; let j = i; while (j < n && !SPACE.has(text[j])) j++;
    const token = text.slice(i, j); let a = 0, b = token.length; while (a < b && !isWord(token[a])) a++; while (b > a && !isWord(token[b - 1])) b--;
    out.push({ at: [i, j], token, pre: token.slice(0, a), core: token.slice(a, b), post: token.slice(b) }); i = j; }
  return out;
}
/** formsOf(language) -> { forms: Map(lower form -> count), giver } | { gap } : the codec's attested forms, from the POS prior through the prior door */
export function formsOf(language = "eng") {
  const p = priorJson(`pos-${language}.json`); if (!p?.forms) return { gap: "no_form_prior", why: `no pos-${language}.json with forms in the priors home: the codec has no attested forms to reread against` };
  const forms = new Map(); for (const [f, tags] of Object.entries(p.forms)) { const k = norm(f), c = Object.values(tags).reduce((a, b) => a + b, 0); forms.set(k, (forms.get(k) ?? 0) + c); }
  return { forms, giver: `pos-${language}.json forms (${p.provenance?.giver ?? "giver not stated"})` };
}
// candidates: every form reachable from the token by at most `maxEdits` channel operations. An operation rewrites a 0-2 character piece of what the OCR wrote into the 0-2 characters the page had.
function oneStep(s, ops, alphabet) {
  const out = new Map(), put = (t, w) => { if (t !== s && (out.get(t) ?? -Infinity) < w) out.set(t, w); };
  if (ops) { for (let i = 0; i <= s.length; i++) for (let L = 0; L <= 2 && i + L <= s.length; L++) { const m = ops.get(s.slice(i, i + L)); if (m) for (const [to, w] of m) put(s.slice(0, i) + to + s.slice(i + L), w); } }
  else { const w = Math.log(1 / (alphabet.length * 3)); for (let i = 0; i <= s.length; i++) { if (i < s.length) { put(s.slice(0, i) + s.slice(i + 1), w); for (const c of alphabet) put(s.slice(0, i) + c + s.slice(i + 1), w); } for (const c of alphabet) put(s.slice(0, i) + c + s.slice(i), w); } }
  return out;
}
/** channelOf(json) -> Map(ocr piece -> [[page piece, log weight]]) from a measured channel { ops: { "ocr>page": count }, errors } ; null in, null out (uniform) */
export function channelOf(json) {
  if (!json?.ops) return null; const total = Object.values(json.ops).reduce((a, b) => a + b, 0), m = new Map();
  for (const [k, c] of Object.entries(json.ops)) { const cut = k.indexOf(">"), from = k.slice(0, cut), to = k.slice(cut + 1); if (!m.has(from)) m.set(from, []); m.get(from).push([to, Math.log(c / total)]); }
  return m;
}
const ALPHABET = [..."abcdefghijklmnopqrstuvwxyz'"];
const recase = (cand, core) => { const L = [...core].filter(isLetter); if (L.length > 1 && L.every((c) => c === c.toUpperCase())) return cand.toUpperCase(); if (L.length && core[0] === core[0].toUpperCase() && isLetter(core[0])) return cand[0].toUpperCase() + cand.slice(1); return cand; };

/** rereadOcr(text, { language, channel, dials, forms }) -> { schema, language, initial: { sha16, length }, tokens: [...], counts, channel, dials, vocabulary } | { gap }
 *  tokens lists ONLY the tokens the codec did not know: { at, initial, status: "proposed"|"contested"|"unknown", proposed?, cands: [[form, score]] }. Every other token is `kept` and is counted, not listed. */
export function rereadOcr(text, { language = "eng", channel = null, dials = DEFAULT_DIALS, forms = null } = {}) {
  const V = forms ? { forms, giver: "given" } : formsOf(language); if (V.gap) return V;
  const d = { ...DEFAULT_DIALS, ...dials }, toks = tokensOf(String(text)), seen = new Map(); for (const t of toks) { const k = norm(t.core); if (k) seen.set(k, (seen.get(k) ?? 0) + 1); }
  // KNOWN: a form the codec attests, a token with no letter (a number, a mark), or (dial docKnown) a form this text itself uses at least that many times: the text's own recurring evidence stands (a name the giver never heard)
  const known = (k) => V.forms.has(k) || ![...k].some(isLetter) || (d.docKnown > 0 && (seen.get(k) ?? 0) >= d.docKnown), freq = (k) => Math.log((V.forms.get(k) ?? 0) + (seen.get(k) ?? 0) + 1);
  const rows = [], counts = { tokens: toks.length, kept: 0, proposed: 0, contested: 0, unknown: 0 }, memo = new Map();
  for (const t of toks) {
    const k = norm(t.core); if (!k || known(k)) { counts.kept++; continue; }
    let cands = memo.get(k);
    if (!cands) { const best = new Map(), s1 = oneStep(k, channel, ALPHABET); const take = (form, w) => { if (form !== k && (V.forms.has(form) || (d.docKnown > 0 && (seen.get(form) ?? 0) >= d.docKnown && form !== k))) { const sc = w + freq(form); if ((best.get(form) ?? -Infinity) < sc) best.set(form, sc); } };
      for (const [f, w] of s1) take(f, w);
      if (d.maxEdits >= 2 && k.length >= 4) for (const [f, w] of s1) for (const [f2, w2] of oneStep(f, channel, ALPHABET)) take(f2, w + w2);
      cands = [...best].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3).map(([f, sc]) => [f, Math.round(sc * 100) / 100]); memo.set(k, cands); }
    const row = { at: t.at, initial: t.token, cands: cands.map(([f, sc]) => [t.pre + recase(f, t.core) + t.post, sc]) };
    if (!cands.length) { row.status = "unknown"; counts.unknown++; }
    else if (cands[0][1] >= d.floor && (cands.length === 1 || cands[0][1] - cands[1][1] >= d.margin)) { row.status = "proposed"; row.proposed = row.cands[0][0]; counts.proposed++; }
    else { row.status = "contested"; counts.contested++; }
    rows.push(row);
  }
  return { schema: SCHEMA, language, initial: { sha16: sha16(text), length: text.length }, tokens: rows, counts, channel: channel ? "measured" : "uniform (unmeasured)", dials: d, vocabulary: V.giver };
}
/** revisedText(text, rereading) -> the text with every PROPOSED token replaced (contested and unknown stay as first read). The initial text is `text` itself: nothing is lost. */
export function revisedText(text, rr) { let out = "", at = 0; for (const r of rr.tokens) { if (r.status !== "proposed") continue; out += text.slice(at, r.at[0]) + r.proposed; at = r.at[1]; } return out + text.slice(at); }
/** initialText(revised, rereading) -> the first reading back from the revised text and the rereading alone (the proof that nothing is lost) */
export function initialText(revised, rr) { let out = "", at = 0, shift = 0; for (const r of rr.tokens) { if (r.status !== "proposed") continue; const a = r.at[0] + shift; out += revised.slice(at, a) + r.initial; at = a + r.proposed.length; shift += r.proposed.length - r.initial.length; } return out + revised.slice(at); }

/** weaveRereading(text, opts) -> { written, skipped, initial, revised, rereading } | { gap }
 *  The initial text and its reading are written FIRST and are never rewritten (the pharos is append-only). Then the rereading (text-rereading, INS·Figure, reread:<sha16 of the initial text>, of the initial text and
 *  the revised text), and the revised text with its own reading at its own address. Two readings stand side by side; which is RIGHT is not khora's to say. */
export async function weaveRereading(text, { language = "eng", channel = null, dials, log = process.env.PHAROS_LOG ?? "fold", dir = process.env.PHAROS ?? null, writer = "khora" } = {}) {
  const lib = pharosLib(); if (!lib) return { gap: "no_pharos", why: "pharos was not found (set PHAROS_HOME)" };
  const rr = rereadOcr(text, { language, channel, dials }); if (rr.gap) return rr;
  const a = await writeReading(text, { language, log, dir, writer }); if (a.gap) return a;
  const revised = revisedText(text, rr), out = { written: [...a.written], skipped: [...a.skipped], initial: a.addr, revised: null, rereading: `reread:${sha16(text)}` };
  let b = null; if (revised !== text) { b = await writeReading(revised, { language, log, dir, writer }); if (b.gap) return b; out.written.push(...b.written); out.skipped.push(...b.skipped); out.revised = b.addr; }
  const P = await import(pathToFileURL(lib).href), h = P.open(log, { writer, ...(dir ? { dir } : {}) });
  if (!(P.fold(h, { kind: "kind" }).entries ?? []).some((e) => e.body?.name === REREADING_KIND)) P.weave(h, { cell: "DEF·Figure", kind: "kind", addr: `kind:${REREADING_KIND}`, body: { name: REREADING_KIND, cell: REREADING_CELL, why: "a second reading of an unreliable text layer: per unknown token, the forms it could have been and the one proposed; the initial text and its reading stand unchanged beside it" } });
  const body = { ...rr, revised: b ? { text: b.addr.text, reading: b.addr.reading } : null, initialReading: a.addr.reading }, same = (P.fold(h, { kind: REREADING_KIND, addr: out.rereading }).entries ?? []).find((e) => canon(e.body) === canon(body));
  if (same) out.skipped.push(REREADING_KIND); else { P.weave(h, { cell: REREADING_CELL, kind: REREADING_KIND, addr: out.rereading, body, of: [a.text, ...(b ? [b.text] : [])], basis: { by: "khora", note: "an observation of what the first reader may have misread; a proposal, never a correction of the record" } }); out.written.push(REREADING_KIND); }
  return out;
}
export { TEXT_KIND };

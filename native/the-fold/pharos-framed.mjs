// the-fold/pharos-framed.mjs — THE WHOLE READING, WRITTEN INTO THE PHAROS (owner, 2026-11-26: "the reading pipeline should be fully stored in Khora, and khora should write all of its work to a pharos").
// pharos-reading.mjs already writes the text, its cuts and its dependency rows. This writes the REST of what the pipeline decided, so that no layer's result lives only in a returned object:
//
//   kind          cell          addr                          body
//   text-codec    SIG·Pattern   codec:<sha16>                 { chosen, distribution (top 5), entropy, pOwn, gap, quotes: { source, differs, table } }    which codec explains the text, by surprise, and the convention it brought
//   text-layers   SIG·Ground    layers:<sha16>                { layers: [{ layer, ran: true|false|"ablated", why }], ablate }                              what ran, what was skipped and why: nothing silent
//   text-quotes   SEG·Figure    quotes:<sha16>                { table, source, spans: [{ open, close, depth, continues, continued }] }                      the OBSERVATION "there is a quotation here" (marks), under the codec's own table
//   text-frames   CON·Figure    frames:<sha16>                { frames, speech, gaps, ablate, crossCheck }                                                  each verb with who holds its words; reported is null when a layer is ablated, never false
//   text-gap      NUL·Figure    gap:<sha16>:<gap>             { gap, ...the typed gap's own fields }                                                        a typed gap about one thing (docs/PROPOSAL-WRITER-PHASEPOSTS.md: "a refusal or a typed gap")
//
// THE SPLIT OF WORK (pharos docs/PROPOSAL-WRITER-PHASEPOSTS.md, owner's rulings 2026-11-19). Observing is not defining: khora READS and so writes Existence and Structure (these cells) and leaves EVIDENCE; Janus researches
// (it reads `text`, `text-codec`, `text-reading` and `text-referents` BY KIND and writes the links and the geometry: CON·Figure bonds, SYN·Pattern worlds, the EOT of a text) and Penelope DEFINES, JUDGES and REVISES (DEF, EVA, REC:
// whether a `text-quotes` span IS a quotation, whether a `text-frames` frame IS reported speech, which codec the text IS in). Khora never writes at DEF, EVA or REC, never calls Janus or Penelope, and never imports them (nexus rule 1):
// the log is the only seam. A frame's `reported` and `framed` are NOMINATIONS by the quotation-mark layer and the speech-verb layer; the basis of every entry says so.
//
// Idempotent: an entry already at the address with the same body is not written again. Retract by weaving, never by erasing. A language the canonical reader does not hold is a typed gap and NO frames are written (the framed door refuses).
import { readFramed } from "./read-framed.mjs";
import { foldCodec } from "./codec-fold.mjs";
import { quoteSpans } from "../adapters/text/quote-frames.js";
import { writeReading, sha16, canon, pharosLib } from "./pharos-reading.mjs";
import { pathToFileURL } from "node:url";

export const CODEC_KIND = "text-codec", LAYERS_KIND = "text-layers", QUOTES_KIND = "text-quotes", FRAMES_KIND = "text-frames", GAP_KIND = "text-gap";
export const KINDS = Object.freeze([
  { kind: CODEC_KIND, cell: "SIG·Pattern", why: "which codec explains a text, as a distribution found by surprise, with the quote convention the codec brought: a nomination, never a definition of the text's language" },
  { kind: LAYERS_KIND, cell: "SIG·Ground", why: "the layer ledger of a read: every layer ran, was skipped with a reason, or was ablated; a skipped layer is never silent" },
  { kind: QUOTES_KIND, cell: "SEG·Figure", why: "the quotation spans the marks make under the codec's table: the observation 'there is a quotation here'; that it IS a quotation is Penelope's definition" },
  { kind: FRAMES_KIND, cell: "CON·Figure", why: "each verb with who holds its words (the quotation-mark layer and the speech-verb layer): nominations; reported is null where a layer is ablated, never false" },
  { kind: GAP_KIND, cell: "NUL·Figure", why: "a typed gap about one text: a refusal or a missing prior, with how to fill it" },
]);
const NOMINATED = "khora's quotation-mark and speech-verb layers (adapters/text/quote-frames.js, speech-frames.js): nominations, not definitions";

/**
 * weaveFramedReading(text, { language, ablate, log, dir, writer, actPrior, referents, readWeft })
 *   -> { written: [kinds], skipped: [kinds], ids: { text, codec, layers, quotes, frames }, gaps: [codes], entry }  or { gap, why }
 * Runs the framed read (the canonical door plus the frames layer), folds the codec for the text, and weaves what each decided. `entry` is the in-memory read, returned for the caller; the log is the record.
 */
export async function weaveFramedReading(text, { language, ablate = [], log = process.env.PHAROS_LOG ?? "fold", dir = process.env.PHAROS ?? null, writer = "khora", actPrior, referents = false, readWeft = null } = {}) {
  const lib = pharosLib(); if (!lib) return { gap: "no_pharos", why: "pharos was not found (set PHAROS_HOME); khora writes readings only into the pharos" };
  const T = String(text ?? "");
  const entry = await readFramed(T, { language, ablate, ...(actPrior !== undefined ? { actPrior } : {}) });
  const fold = await foldCodec(T);
  // the plain reading (text, cuts, rows [, referents]) first: every later entry is `of` the text entry. A language with no parser prior is a typed gap there, and we still record why.
  const base = language ? await writeReading(T, { language: entry.language?.stem ?? language, log, dir, writer, referents, readWeft }) : { gap: "language_not_declared" };
  const P = await import(pathToFileURL(lib).href), h = P.open(log, { writer, ...(dir ? { dir } : {}) });
  const declare = ({ kind, cell, why }) => { if (!(P.fold(h, { kind: "kind" }).entries ?? []).some((e) => e.body?.name === kind)) P.weave(h, { cell: "DEF·Figure", kind: "kind", addr: `kind:${kind}`, body: { name: kind, cell, why } }); };
  for (const k of KINDS) declare(k);
  const out = { written: [...(base.written ?? [])], skipped: [...(base.skipped ?? [])], ids: { text: base.text ?? null }, gaps: [], entry };
  const sha = sha16(T), textId = base.text ?? (P.fold(h, { kind: "text", addr: `text:${sha}` }).entries ?? [])[0]?.id ?? null, of = textId ? [textId] : [];
  const put = (kind, cell, addr, body, basis) => { const have = (P.fold(h, { kind, addr }).entries ?? []).find((e) => canon(e.body) === canon(body)); if (have) { out.skipped.push(kind); return have; } const e = P.weave(h, { cell, kind, addr, body, of, ...(basis ? { basis } : {}) }); out.written.push(kind); return e; };
  const gap = (g) => { const code = g?.gap ?? String(g); if (!out.gaps.includes(code)) { out.gaps.push(code); put(GAP_KIND, "NUL·Figure", `gap:${sha}:${code}`, typeof g === "object" ? g : { gap: code }, { by: "khora" }); } };
  if (base.gap) gap({ gap: base.gap, why: base.why ?? null });

  // the codec: found by surprise over the held codecs; the answer is a distribution, so it is written as one (top 5), with the convention it brought
  put(CODEC_KIND, "SIG·Pattern", `codec:${sha}`, {
    chosen: fold.chosen ?? null, distribution: (fold.distribution ?? []).slice(0, 5).map((d) => ({ code: d.code, p: +d.p.toFixed(4), coverage: +d.coverage.toFixed(4), bitsPerToken: +d.bitsPerToken.toFixed(2) })),
    entropy: +(fold.entropy ?? 0).toFixed(4), pOwn: fold.pOwn == null ? null : +fold.pOwn.toFixed(4), gap: fold.gap?.gap ?? null, declared: language ?? null,
    // the convention of the codec the read ran UNDER (the declared language), which is what framed the quotations; the codec the surprise fold found may differ, and `foundQuotes` keeps its convention beside it
    quotes: entry.frames?.quotes ? { source: entry.frames.quotes.source, differs: entry.frames.quotes.differs, table: entry.frames.quotes.table, codec: entry.language?.stem ?? language ?? null } : null,
    foundQuotes: fold.quotes ? { codec: fold.chosen ?? null, source: fold.quotes.source, table: fold.quotes.table, gap: fold.quotes.gap?.gap ?? null } : null, agrees: fold.chosen ? fold.chosen === (entry.language?.stem ?? language) : null,
  }, { found_by: "surprise reduction over the held codecs (the-fold/codec-fold.mjs)", note: "a nomination: which codec explains the text best, not a definition of its language" });
  if (fold.gap) gap(fold.gap);

  // the layer ledger: every layer of the read, run or skipped with its reason
  put(LAYERS_KIND, "SIG·Ground", `layers:${sha}`, { layers: entry.layers ?? [], ablate }, { by: "khora", note: "derived from the entry's own fields and gaps" });

  // the quotations the marks make, under the table the codec brought (the edition's own convention where the text shows it)
  const fq = entry.frames?.quotes ?? null, table = fq?.table ?? null;
  if (table && !ablate.includes("quotes")) { const r = quoteSpans(T, table); put(QUOTES_KIND, "SEG·Figure", `quotes:${sha}`, { table, source: fq.source, differs: fq.differs, spans: r.spans.map((q) => ({ open: q.open, close: q.close, depth: q.depth, ...(q.continues ? { continues: true } : {}), ...(q.continued ? { continued: true } : {}) })), gaps: r.gaps.map((g) => g.gap) }, { by: NOMINATED }); }

  // the frames: who holds each verb's words. Never written for a language the framed door refuses (that is a typed gap above).
  if (entry.frames && !(entry.frames.frames.length === 0 && (entry.frames.gaps ?? []).some((g) => ["language_not_declared", "language_not_held", "no_parse_rows"].includes(g.gap)))) {
    put(FRAMES_KIND, "CON·Figure", `frames:${sha}`, { frames: entry.frames.frames, speech: entry.frames.speech, gaps: entry.frames.gaps ?? [], ablate, crossCheck: entry.frames.crossCheck ?? null }, { by: NOMINATED });
  }
  for (const g of entry.frames?.gaps ?? []) gap(g);

  out.ids = { ...out.ids, codec: (P.fold(h, { kind: CODEC_KIND, addr: `codec:${sha}` }).entries ?? []).at(-1)?.id ?? null, layers: (P.fold(h, { kind: LAYERS_KIND, addr: `layers:${sha}` }).entries ?? []).at(-1)?.id ?? null };
  return out;
}

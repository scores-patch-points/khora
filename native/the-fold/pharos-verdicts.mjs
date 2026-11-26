// the-fold/pharos-verdicts.mjs — KHORA READS BACK what the others decided about its reading (owner, 2026-11-26: the reading takes Janus's geometry and Penelope's judgement; the repos never call each other, so the pharos is the seam).
// Khora wrote NOMINATIONS (pharos-framed.mjs: text-quotes at SEG·Figure, text-frames at CON·Figure). Whether a span IS a quotation and a frame IS reported speech is a DEFINITION, and defining, judging and revising are
// Penelope's (DEF, EVA, REC: pharos docs/PROPOSAL-WRITER-PHASEPOSTS.md). This reads her verdicts by CELL and KIND, never by author (`by` is provenance, never dispatch), and applies them without touching the nomination:
//
//   kind           cell (the kind's declared cell; must be DEF, EVA or REC)  addr                      body                         of
//   frame-verdict  e.g. EVA·Figure              frames:<sha16>#<index>    { index, reported: true|false|null }   [the text-frames entry]
//   quote-verdict  e.g. DEF·Figure              quotes:<sha16>#<index>    { index, quotation: true|false }       [the text-quotes entry]
//
// These two kinds are PROPOSALS (no other repo declares them yet): whoever writes them declares them, and khora reads whichever exist. The latest entry at an address wins (a revision is a newer entry of the same kind at the same address;
// pharos fixes a kind's cell, so a revision does not change cell); a RETRACTED verdict stops counting (the pharos skips it); a verdict at a cell outside Interpretation, or `of` an entry that is no longer the current nomination, is NOT applied and is a typed gap.
// The nomination is never edited: each frame keeps its own `framed`/`reported`, and gains `effective` ({ reported, source: "verdict" | "nomination" }) and `judged` (the verdict's id and cell, or null).
import { pathToFileURL } from "node:url";
import { pharosLib, sha16 } from "./pharos-reading.mjs";
export const FRAME_VERDICT = "frame-verdict", QUOTE_VERDICT = "quote-verdict";
const INTERPRETATION = /^(DEF|EVA|REC)·/;   // regex-ok: a cell id (an operator name and a grain), not language

/** readVerdicts(text, { log, dir }) -> { frames: [{ ...frame, effective, judged }], quotes: [{ ...span, quotation, judged }], gaps: [{ gap, id, ... }] } or { gap, why } */
export async function readVerdicts(text, { log = process.env.PHAROS_LOG ?? "fold", dir = process.env.PHAROS ?? null } = {}) {
  const lib = pharosLib(); if (!lib) return { gap: "no_pharos", why: "pharos was not found (set PHAROS_HOME)" };
  const P = await import(pathToFileURL(lib).href), h = P.open(log, { writer: "khora", ...(dir ? { dir } : {}), frame: false }), sha = sha16(String(text ?? "")), gaps = [];
  const nom = (kind, addr) => (P.fold(h, { kind, addr }).entries ?? []).at(-1) ?? null, fr = nom("text-frames", `frames:${sha}`), qu = nom("text-quotes", `quotes:${sha}`);
  const verdicts = (kind, target, addrBase) => {
    const by = new Map(); if (!target) return by;
    for (const e of P.current(h, { kind }) ?? []) {
      if (!String(e.addr ?? "").startsWith(`${addrBase}#`)) continue;
      if (!INTERPRETATION.test(e.cell)) { gaps.push({ gap: "verdict_not_interpretation", id: e.id, cell: e.cell, how: "a verdict is a definition, judgement or revision: DEF, EVA or REC" }); continue; }
      if (!(e.of ?? []).includes(target.id)) { gaps.push({ gap: "verdict_of_other_entry", id: e.id, how: "the verdict is about a nomination that is no longer the current one" }); continue; }
      const i = Number(e.body?.index); if (!Number.isInteger(i)) { gaps.push({ gap: "verdict_no_index", id: e.id }); continue; }
      by.set(i, e);
    }
    return by;
  };
  const fv = verdicts(FRAME_VERDICT, fr, `frames:${sha}`), qv = verdicts(QUOTE_VERDICT, qu, `quotes:${sha}`);
  const frames = (fr?.body?.frames ?? []).map((f, i) => { const v = fv.get(i), r = v && [true, false, null].includes(v.body.reported) ? v.body.reported : undefined; if (v && r === undefined) gaps.push({ gap: "verdict_bad_body", id: v.id });
    return { ...f, effective: { reported: r !== undefined ? r : f.reported ?? null, source: r !== undefined ? "verdict" : "nomination" }, judged: r !== undefined ? { id: v.id, cell: v.cell } : null }; });
  const quotes = (qu?.body?.spans ?? []).map((s, i) => { const v = qv.get(i), q = v && typeof v.body.quotation === "boolean" ? v.body.quotation : undefined; if (v && q === undefined) gaps.push({ gap: "verdict_bad_body", id: v.id });
    return { ...s, quotation: q !== undefined ? q : null, judged: q !== undefined ? { id: v.id, cell: v.cell } : null }; });
  return { frames, quotes, gaps, nominations: { frames: fr?.id ?? null, quotes: qu?.id ?? null } };
}

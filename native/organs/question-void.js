// organs/question-void.js — a question, read by its language's grammar, declared as a VOID. Medium-blind: it never sees a word of any
// language, only the reading an adapter (adapters/text/question-grammar.<lang>.js) produced. NL → grammar → EOT.
//
// The declaration is the-fold/void-shape.js declareVoid (EOVoidDeclaration@1, nine operators, cellOf injected), never a second schema
// (agreed with the Wald session, 2026-10-14). This organ fills ONLY what the question's own grammar states — the slot (NUL), the anchor
// (SIG: the record's figures the question names), what it admits as asked (INS), the relation (CON) — and leaves every other field a
// typed gap. It never admits fillers and never reads admits from the material's kind edges: that is the void-in-the-universe work, owned
// elsewhere and pending.
import { declareVoid } from "../the-fold/void-shape.js";
import { cellOf } from "../kernel/cube.js";
import { referentsIn } from "./callimachus.js";

const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };

/** questionVoid(reading, record) → EOVoidDeclaration@1 & { id, form, modality, focus, reading } */
export function questionVoid(reading, record) {
  // The anchor: the record's own figures that this question names, matched by the record's own surface rule (callimachus.js).
  const focus = referentsIn(reading.question, record.entities ?? []);
  const names = Object.fromEntries((record.entities ?? []).map((e) => [e.id, e.name]));
  const decl = declareVoid({
    // NUL — what space this is: the hole's TYPE (time | person | place | thing | quantity | …), the same value the-fold's
    // fold-chat-void-declare.js (L1) puts here; the question's own text rides on `reading`, never in a typed field.
    slot: reading.admits ?? null,
    anchor: focus.length ? focus.map((id) => names[id]).filter(Boolean) : null,
    admits: reading.admits ?? null,
    relation: reading.relation?.lemma ?? null,
  }, { cellOf });
  return Object.freeze({ ...decl, id: `void:${fnv(`${reading.lang}|${reading.question}`)}`, form: reading.form, modality: reading.modality, focus, lang: reading.lang, reading });
}

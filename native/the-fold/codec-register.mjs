// the-fold/codec-register.mjs — THE REGISTER OF A TEXT, FROM MEASURED SOURCES, beside its root codecs (owner, 2026-11-28: the codec is generated on demand for the text's region, era and register).
// codec-regions.mjs says WHICH LANGUAGE ROOTS a text mixes. A register is not a language: "kindly revert by EOD" is English, and no English form table holds its vocabulary, so a language root cannot
// explain it (it was cut into English plus Indonesian). A register needs its OWN source of evidence. The first sources held are Zenodotus's GenrePrior@1 (derived-priors/genre-priors: for a genre,
// the terms over-represented in its documents against the other genres, measured, with a named giver). This reads a text against such sources and answers with a distribution, or a typed gap.
//
// HOW (no model, no hand-set threshold): the source's own unit is kept (a term = a run of letters, 4 or more, lower case: GenrePrior@1's declared params). Under "no register" every term costs one
// price, 1/N. Under a register g a share L of the terms is drawn from g's marked terms (each 1/T, T = how many it has) and the rest at the general price. L is FITTED to the text (its maximum-
// likelihood value has a closed form). A register is named only if it shortens the description of the text by more than the cost of naming it among the G sources plus the cost of the one fitted
// number (half of log2 n bits): the size of the choice, nothing typed. Otherwise the answer is the typed gap `no_register_source_explains_it`, with the nearest.
// STATUS: MEASURED NEGATIVE, NOT WIRED (eval/codec-register/RESULT.md, 2026-11-28). On passages from held-out documents this read was right on 45 of 124 and abstained on 64; the plain COUNT of hits was right on 86.
// The pricing is the fault: a marked term costs 1/T, so a source with many terms (a literature source rebuilt from 37 books has 35,207, more than the nominal vocabulary N) can never be named, and a
// source with few is over-trusted. Kept as the record of what was tried; do not wire it. What it needs instead: each source's MEASURED hit rate inside and outside its genre (which GenrePrior@1 does not carry).
// NOT DONE (stated): registers per REGION (this is the whole text); composing a reader from a register; any register no source measures (business, chat, legal drafting beyond the four genres held);
// era. A source is only as good as its corpus: a GenrePrior carries the proper nouns of its documents ("nasa"), which is the corpus speaking, not the register.
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { fileURLToPath } from "node:url";
import { tokensWithOffsets } from "./codec-regions.mjs"; import { NOMINAL_VOCAB } from "./codec-fold.mjs";
export const REGISTER_SCHEMA = "CodecRegister@1";
const HERE = path.dirname(fileURLToPath(import.meta.url));
/** where register sources live: $GENRE_PRIORS, else Zenodotus beside the workspace, else ~/Documents/Zenodotus; none -> null (the caller files the typed gap) */
export const registerSourcesDir = () => [process.env.GENRE_PRIORS, path.resolve(HERE, "..", "..", "..", "Zenodotus", "derived-priors", "genre-priors"), path.join(os.homedir(), "Documents", "Zenodotus", "derived-priors", "genre-priors")].filter(Boolean).find((d) => fs.existsSync(d)) ?? null;
/** loadRegisterSources(dir) -> [{ id, register, terms: Set, giver, docs, standing }] from GenrePrior@1 files; a file of another schema is skipped and named */
export function loadRegisterSources(dir = registerSourcesDir()) {
  if (!dir) return { sources: [], gap: { gap: "no_register_sources", why: "no genre-priors directory found (set GENRE_PRIORS to Zenodotus derived-priors/genre-priors)" } };
  const sources = [], skipped = []; for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) { let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { skipped.push(f); continue; }
    if (j.schema !== "GenrePrior@1" || !Array.isArray(j.prior_terms)) { skipped.push(f); continue; } sources.push({ id: `genre-prior:${j.genre}`, register: j.genre, terms: new Set(j.prior_terms.map((t) => t.term)), giver: j.giver ?? null, docs: j.docs ?? null, standing: "measured" }); }
  return { sources, skipped };
}
/** the source's own unit: letter runs of 4 or more, lower case (GenrePrior@1 declared_params.minLen) */
export const termsOf = (text) => tokensWithOffsets(text).flatMap((t) => { const out = []; let cur = ""; for (const ch of t.form) { if (ch === "'" || ch === "’" || ch === "-") { if (cur) out.push(cur); cur = ""; } else cur += ch; } if (cur) out.push(cur); return out; }).filter((w) => [...w].length >= 4).map((w) => w.toLowerCase());

/** registerOf(text, { sources }) -> CodecRegister@1 { register | null, distribution: [{ register, share, bits, hits, terms }], n, bar, gap?, derivation } */
export function registerOf(text, { sources = null } = {}) {
  let gap0 = null; if (!sources) { const l = loadRegisterSources(); sources = l.sources; gap0 = l.gap ?? null; }
  if (!sources.length) return { schema: REGISTER_SCHEMA, register: null, distribution: [], gap: gap0 ?? { gap: "no_register_sources" } };
  const toks = termsOf(text), n = toks.length; if (!n) return { schema: REGISTER_SCHEMA, register: null, distribution: [], n: 0, gap: { gap: "no_terms", why: "the text holds no term of 4 letters or more" } };
  const rows = sources.map((s) => { let k = 0; for (const w of toks) if (s.terms.has(w)) k++; const T = s.terms.size, a = NOMINAL_VOCAB / T, share = a > 1 ? Math.min(1 - 1e-9, Math.max(0, (k * a - n) / (n * (a - 1)))) : 0;
    const bits = share > 0 ? k * Math.log2(1 - share + share * a) + (n - k) * Math.log2(1 - share) : 0; return { register: s.register, id: s.id, share: +share.toFixed(3), bits: +bits.toFixed(1), hits: k, terms: T }; }).sort((x, y) => y.bits - x.bits);
  const bar = Math.log2(sources.length) + 0.5 * Math.log2(n), top = rows[0], named = top.bits > bar;
  const derivation = { schema: "CodecDerivation@1", material: "text", context: { register: named ? top.register : null }, sources: named ? [{ id: top.id, standing: "measured", weight: top.share }] : [], composed: "register against measured genre sources (the-fold/codec-register.mjs)", gaps: named ? [] : ["no_register_source_explains_it"] };
  return { schema: REGISTER_SCHEMA, register: named ? top.register : null, distribution: rows, n, bar: +bar.toFixed(1), ...(named ? {} : { gap: { gap: "no_register_source_explains_it", nearest: top.register, bits: top.bits, bar: +bar.toFixed(1), why: "no held register source shortens the description of this text by more than it costs to name it" } }), derivation };
}

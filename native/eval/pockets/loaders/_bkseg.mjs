// loaders/_bkseg.mjs — sentence splitting, drama-label removal, document blocks, the 300k cap, and Pocket assembly for the "bk" group.
import { sha256, MAX_TOKENS, tokenCount, validate } from "../lib/pocket.mjs";
import { tokenise, abbrevSet } from "./_bkcore.mjs";

/** Speaker labels and stage directions of plays (the label is removed, never fed to any statistic). kind: "allcaps" | "capline" | "folio" | "fr" | "marlowe". */
export function stripDrama(s, kind, stageParen = false) {
  s = s.replace(/\[_?[^\]]{0,400}\]/g, " ");                      // bracketed stage directions / editorial notes
  if (stageParen) s = s.replace(/(^|\n)[ \t]*\((?:[^()]|\n){0,400}?\)[ \t]*(?=\n)/g, "$1");  // whole-line parenthesised directions
  const lines = s.split("\n").map((l) => {
    if (kind === "allcaps" && /^[ \t]*\p{Lu}[\p{Lu} .'’\-]{1,40}(?: \([^)\n]{0,60}\))?\.[ \t]*$/u.test(l)) return "";        // "PRINCE."  or "FAUST (allein)."  alone on a line
    if (kind === "capline" && /^[ \t]*\p{Lu}[\p{L}'’.\-]*(?: \p{L}[\p{L}'’.\-]*){0,3}\.[ \t]*$/u.test(l) && l.trim().length <= 40) return "";   // "Prinz Heinrich." alone
    if (kind === "folio") return l.replace(/^ {2,4}\p{Lu}\p{L}{1,9}\.(?=\s)/u, " ");                         // "   Falst. What, ..."
    if (kind === "marlowe") return l.replace(/^[ \t]{3,8}\p{Lu}[\p{Lu} .'’\-]{1,30}\.(?=\s)/u, " ");   // "     FAUSTUS. My ..."
    if (kind === "fr") return l.replace(/^[ \t]*\p{Lu}[\p{Lu} .'’\-]{1,40}\.--/u, " ");                  // "LE ROI.--..."
    return l;
  });
  return lines.join("\n");
}

/** Split running text into sentence strings on . ! ? … and CJK equivalents; blank lines also end a unit when paraBreak. Full stops after data-detected abbreviations do not split. */
export function splitSentences(text, { paraBreak = true } = {}) {
  const abb = abbrevSet(text), out = [];
  const blocks = paraBreak ? text.split(/\n[ \t]*\n+/) : [text];
  const TERM = /[.!?…]+["'”’»)\]]*(?=\s|$)|[。！？]+[」』”’）)]*/gu;
  for (const b of blocks) {
    const s = b.replace(/\s+/g, " ").trim();
    if (!s) continue;
    let last = 0;
    for (const m of s.matchAll(TERM)) {
      if (m[0][0] === "." && /^\.["'”’»)\]]*$/.test(m[0])) {
        const w = s.slice(Math.max(0, m.index - 12), m.index).match(/([\p{L}\p{M}]+)$/u);   // bounded window: O(1) per terminator
        if (w && abb.has(w[1].toLowerCase())) continue;
      }
      out.push(s.slice(last, m.index + m[0].length)); last = m.index + m[0].length;
    }
    if (last < s.length) out.push(s.slice(last));
  }
  return out;
}

/** sentences -> token units (empty units dropped). */
export function toUnits(sentences) {
  const units = [];
  for (const s of sentences) { const t = tokenise(s); if (t.length) units.push(t); }
  return units;
}

/** Document blocks of ~100 consecutive units; when that gives < 30 documents the block shrinks (>= 20 units) so that small works still reach >= 30. */
export function blockSize(nUnits) {
  if (Math.floor(nUnits / 100) >= 30) return 100;
  return Math.max(20, Math.min(100, Math.ceil(nUnits / 30)));
}
export function makeDocs(units, B = blockSize(units.length)) {
  const docOf = []; let d = 0, k = 0;
  for (let i = 0; i < units.length; i++) { docOf.push(d); if (++k >= B) { d++; k = 0; } }
  if (k > 0 && k < B / 2 && d > 0) for (let i = docOf.length - k; i < docOf.length; i++) docOf[i] = d - 1;   // short tail joins the previous block
  return { docOf, B };
}

/** Cap at MAX_TOKENS by whole documents in the order of sha256(id:docIndex); keep document order; renumber documents contiguously. */
export function capDocs(id, units, docOf) {
  const docs = new Map();
  units.forEach((u, i) => { const d = docOf[i]; if (!docs.has(d)) docs.set(d, { d, from: i, to: i + 1, n: 0 }); const o = docs.get(d); o.to = i + 1; o.n += u.length; });
  const all = [...docs.values()], total = all.reduce((a, o) => a + o.n, 0);
  if (total <= MAX_TOKENS) return { units, docOf, dropped: 0, keptDocs: all.length, totalDocs: all.length, totalTokens: total };
  const order = all.map((o) => ({ o, h: sha256(`${id}:${o.d}`) })).sort((a, b) => (a.h < b.h ? -1 : a.h > b.h ? 1 : 0));
  const keep = new Set(); let n = 0;
  for (const { o } of order) if (n + o.n <= MAX_TOKENS) { keep.add(o.d); n += o.n; }
  const U = [], D = []; const renum = new Map();
  for (const o of all) if (keep.has(o.d)) { renum.set(o.d, renum.size); for (let i = o.from; i < o.to; i++) { U.push(units[i]); D.push(renum.get(o.d)); } }
  return { units: U, docOf: D, dropped: all.length - keep.size, keptDocs: keep.size, totalDocs: all.length, totalTokens: total };
}

/** Assemble, cap and validate a Pocket from one or more per-source unit lists (concatenated in the order given). */
export function assemble(spec, unitLists, extraMeta = {}) {
  const units = unitLists.flat(), { docOf, B } = makeDocs(units);
  const capped = capDocs(spec.id, units, docOf);
  const pocket = { id: spec.id, group: "bk", register: spec.register, language: spec.language, script: spec.script || "latn", units: capped.units, docOf: capped.docOf,
    meta: { tokenisation: spec.tokenisation || "unicode words: letters, marks, numbers, apostrophes inside words; lowercase NFC; punctuation and pure-number tokens dropped; hyphenated words split",
      docDef: `consecutive blocks of ${B} sentences/units (${capped.totalDocs} blocks)` + (capped.dropped ? `; the 300k-token cap keeps ${capped.keptDocs} whole blocks, taken in sha256(id:block) order and skipping any block that no longer fits; document order preserved` : "; no cap needed (<= 300,000 tokens)"),
      unitDef: spec.unitDef || `sentences: text split after . ! ? … (and CJK equivalents) when followed by whitespace; full stops after data-detected short abbreviations (types almost always followed by a stop, e.g. mr, st, initials) do not split${spec.paraBreak === false ? "; blank lines (stanza/speech breaks) do NOT end a unit" : "; blank lines end a unit"}${spec.drama ? "; speaker labels and bracketed stage directions removed" : ""}`,
      source: spec.files.join(" + "), notes: spec.notes || "", title: spec.title, author: spec.author || null, ...extraMeta, tokensBeforeCap: capped.totalTokens, blockUnits: B } };
  const v = validate(pocket);
  return { pocket, v };
}

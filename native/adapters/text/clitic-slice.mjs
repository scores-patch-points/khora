// organs/clitic-slice.mjs — the clitic-slice PROPONENT: a mechanical nomination of WHERE to cut, never a verdict.
// The recursion (the owner, 2026-11-20): a coarse read glues a clitic to its host ("isn't", "Oscar's"); the smell cannot NAME the glued form, but it names the host once split. A cut is PROPOSED exactly where the smell clears up.
// Inputs, all injected (this file does no I/O): `smell(form) -> { cls, margin } | null` (null = unnameable, as organs/pos-sniff.mjs refuses a settled word and the emergent smell refuses an unseen type); `markers` = the suffix forms a giver has named (a Set of strings from organs/data/giver-ud-english-clitics.json, supplied by the caller).
// A token is a candidate iff its surface ENDS with a named marker (a form-level check on the giver's own names — data, not a language regex) AND the whole form is unnameable AND the host (surface minus the marker) is nameable.
// Pure, no model, no regex, no word list read of the text: the only strings examined are the token's own form and the giver's declared markers.
export const SCHEMA = "CliticSlice@1";
export class CliticSliceGap extends Error { constructor(code, why) { super(`${code}: ${why}`); this.code = code; this.why = why; } }
/** proposeCut({ form, smell, markers }) -> { host, marker, hostSmell, wholeSmell } | null */
export function proposeCut({ form, smell, markers }) {
  if (typeof smell !== "function") throw new CliticSliceGap("no_smell", "the proponent needs the per-token smell (smell(form) -> { cls, margin } | null); none was given");
  if (!markers || !(markers instanceof Set) || !markers.size) throw new CliticSliceGap("no_markers", "the proponent needs a giver-named marker set; an empty set names no boundary to propose");
  if (typeof form !== "string" || !form) return null;
  let best = null;
  for (const m of markers) {
    if (typeof m !== "string" || !m || form.length <= m.length) continue;
    if (!form.endsWith(m)) continue;
    const host = form.slice(0, form.length - m.length);
    const wholeSmell = smell(form);
    if (wholeSmell && wholeSmell.cls) continue;                 // the glued whole already has a name: no reason to cut
    const hostSmell = smell(host);
    if (!hostSmell || !hostSmell.cls) continue;                // the host is unnameable too: nothing to recover
    if (!best || m.length > best.marker.length) best = { host, marker: m, hostSmell, wholeSmell };
  }
  return best;
}
/** sliceTokens({ tokens, smell, markers }) -> [{ index, host, marker, hostSmell, wholeSmell }] for every token where a cut is proposed */
export function sliceTokens({ tokens, smell, markers }) {
  const out = [];
  for (const t of tokens ?? []) {
    const p = proposeCut({ form: t.form, smell, markers });
    if (p) out.push({ index: t.index, ...p });
  }
  return out;
}

/** toEvidence(proposal, card) -> the ledger evidence entry for a proposed cut: the layer FIRES when the host is nameable and the glued whole is not (the card is derived from a planted-truth run, supplied by the caller). Mirrors organs/pos-sniff.mjs::toEvidence. */
export const toEvidence = (proposal, card) => ({ layer: `clitic-slice-${proposal.marker}`, group: "emergent-smell+ud", outcome: proposal.hostSmell?.cls ? "good" : "not_good", card });
/** nominate(proposal) -> a tokenizer-rule nomination in the DEF·Pattern shape (form-level, effect split): the proponent's job is to OBSERVE the cut, the judge (organs/tokenizer-rule-def.mjs) decides standing. */
export const nominate = (proposal) => ({ cell: "tokenizer-rule", effect: "split", position: "suffix", form: proposal.marker, hostNameable: !!proposal.hostSmell?.cls, wholeNameable: !!proposal.wholeSmell?.cls });

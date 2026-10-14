// organs/seam-ledger.js — the fold's four measurable properties, read off typing the telling already carries. No model, no clock,
// no constant: every number here is a share of bytes or a count of sets, and the one boundary that would need a threshold (how far
// is "far") is returned as the number, never as a verdict.
//
// WHERE THIS COMES FROM. The user's essay "The Prompt Is a Crease" (2026-10-14): a question is an instruction to fold the pinned
// universe U, bounded by the differences that make a difference to a declared reader W. A fold returns a sequence in which every
// element is either an ADDRESSED SPAN (bytes of U or of W) or a SEAM (a place where addressed spans meet and no addressed span joins
// them). There is no third kind. This file measures that contract on what Callimachus already produces:
//
//   addressed span  = a "source" segment carrying an address (prose-laws.js seg.source)
//   seam            = a maximal run of the other kinds between addressed spans — "frame" (declared grammar), "value" (computed from
//                     the record, grounded by the sentence's grounds), "model" (the mouth's additions, typed self:model)
//   the mouth       = the "model" bytes only. It is permitted nowhere but a seam, so its share is a number: mouthShare.
//
// WHAT IS HERE
//   seamReport(sentences)        → bytes by kind, addressedShare, seamDensity, mouthShare, each seam with the spans it joins, and the
//                                  contract verdict (an unaddressed source segment, or a kind that is neither, is a violation).
//   creaseEntry({...})           → one append-only record of a fold: whom, question, nulls, seams, distance. The sheet remembers.
//   untouchedBy(holdings, touched) → the whom's holdings no fold ever touched (W is observable, hence forgeable).
//
// The holdings themselves (declareHoldings, distanceOf, partitionByHoldings) live in organs/holdings.js.
//
// WHAT IS NOT HERE (named, not implied). This file builds the entry, not the store: no ledger is kept, so nothing yet measures a whom
// against earlier creases (CALLIMACHUS-SHAPE.md H4: recurring seams locate U's gaps).

const enc = new TextEncoder();
const bytesOf = (t) => enc.encode(String(t ?? "")).length;

/** The kinds a segment may be. A fold that emits any other is outside the contract. */
export const SEGMENT_KINDS = Object.freeze(["source", "frame", "value", "model"]);

/**
 * Measure the fold contract over a list of sentences ({ segs: [{kind, t, address?}] }, as prose-laws.js `sentence` builds them).
 * Seams never cross a sentence boundary: a sentence is the unit whose grounds say what a value is grounded by.
 */
export function seamReport(sentences = []) {
  const bytes = { source: 0, frame: 0, value: 0, model: 0 };
  const seams = [];
  const violations = [];
  let total = 0;

  sentences.forEach((s, si) => {
    const segs = Array.isArray(s?.segs) ? s.segs : [];
    let run = null; // the seam being accumulated
    let left = null; // address of the last addressed span in this sentence
    let at = 0; // byte offset within the sentence

    const close = (right) => {
      if (!run) return;
      seams.push({ sentence: si, at: run.at, bytes: run.bytes, kinds: [...run.kinds], mouth: run.kinds.has("model"), text: run.text, joins: { left: run.left, right } });
      run = null;
    };

    segs.forEach((g, gi) => {
      const b = bytesOf(g.t);
      total += b;
      if (!SEGMENT_KINDS.includes(g.kind)) { violations.push({ sentence: si, seg: gi, why: `kind ${JSON.stringify(g.kind)} is neither an addressed span nor a flagged seam` }); at += b; return; }
      if (g.kind === "source") {
        if (!g.address) { violations.push({ sentence: si, seg: gi, why: "a source segment with no address is an unaddressed claim" }); bytes.frame += b; at += b; return; }
        bytes.source += b;
        close(g.address);
        left = g.address;
      } else {
        bytes[g.kind] += b;
        if (!run) run = { at, bytes: 0, kinds: new Set(), text: "", left };
        run.bytes += b;
        run.kinds.add(g.kind);
        run.text += g.t;
      }
      at += b;
    });
    close(null);
  });

  const share = (n) => (total ? n / total : null);
  const mouthSeams = seams.filter((x) => x.mouth).length;
  return {
    bytes: { ...bytes, total },
    addressedShare: share(bytes.source),
    seamDensity: share(total - bytes.source),
    mouthShare: share(bytes.model),
    seams,
    seamCount: seams.length,
    mouthSeams,
    contract: { ok: violations.length === 0, violations },
  };
}

// ---- the sheet remembers ------------------------------------------------------------------------------------------------------------

/**
 * One crease: a fold, as it was held. Append-only by construction (frozen, no id minted from a clock). The whom is recorded by what
 * it held — counts and giver, never the corpus — so the ledger can be shared where the whom's own thread cannot.
 */
export function creaseEntry({ holdings: h, question, nulls = {}, report, distance = null, output = null } = {}) {
  if (!h || !h.told) throw new Error("creaseEntry: declared holdings are required");
  if (!report || !report.contract) throw new Error("creaseEntry: a seamReport is required");
  return Object.freeze({
    whom: { giver: h.giver, kind: h.kind, holdings: h.holdings, empty: h.empty },
    question: question ?? null,
    nulls: Object.freeze({ ...nulls }),
    seams: { count: report.seamCount, mouthSeams: report.mouthSeams, seamDensity: report.seamDensity, addressedShare: report.addressedShare, mouthShare: report.mouthShare },
    contract: report.contract.ok,
    distance,
    output,
  });
}

/**
 * Spans of W that no prior fold ever touched. W is observable, so it is forgeable: a reader can salt their own thread to steer the
 * fold. A span in W that the ledger has never seen a fold touch is suspicious in exactly the way an untouched span in U is. Returns
 * the keys; it does not decide what to do about them.
 */
export function untouchedBy(holdings, touchedKeys = new Set()) {
  if (!holdings || !holdings.told) throw new Error("untouchedBy: declared holdings are required");
  const touched = touchedKeys instanceof Set ? touchedKeys : new Set(touchedKeys);
  return [...holdings.told.keys()].filter((k) => !touched.has(k));
}

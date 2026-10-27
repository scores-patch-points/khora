// adapters/text/conventions.js — THE NOMOS OF THE CAPITAL TIER: the ledger of the conventions the cast reads a capital by (2026-10-27).
//
// A capital is a CONVENTION, not a rule. Writers of a cased script keep it more or less: a name is capitalised in the middle of a
// sentence 97 times in 100, a word that is not a name 3 times in 100, and a heading or a byline may end with no mark at all, so the
// next sentence's capital stands where the cut cannot see that it opens one. The reader used to hold these as constants inside
// surfaces.js (CAP_TOKEN, `let i = 1`, CAP_SIG_ALPHA) with no row that said who gave them or how closely a text keeps them. This is
// that row, in the shape of janus's nomos (janus native/organs/nomos.js, "the ledger of the rules of reading"): one NomosRule@1 per
// convention, carrying its standing, its giver or its builder, its witnesses and its basis, and the address where the reader stands on
// it, so a convention re-expands into the code that reads by it (the holograph property).
//
// THE LAW is the nomos's own: a convention is GIVEN (a named giver bound to a received ground) or EXTRACTED (measured by a builder from
// observed material, a nomination with its witnesses) and NEVER REVEALED. `conventionsLedger()` refuses a row that names neither, and
// the test holds it to that. A row also says WHERE it holds (`scope`) and where it departs (`departs`), because a convention is not
// a law of nature: German capitalises every noun, a caseless script has no capital at all, and an all-lower-case text keeps none.
//
// The figures in `witnesses` are measured by eval/referents/convention-witness.mjs on UD_English-GUM's training file (sha256 pinned).
// They DESCRIBE how closely English keeps each convention; the cast never reads them (it reads the text's own counts and the received
// treebank's use of the form, a different corpus), so the figures cannot leak the ground the cast is scored on into the cast.
//
//   conventionsLedger() → { schema: "Nomos@1", rows, stats }   the rows, frozen; stats count them by standing

const GUM_SHA = "88c410ca6a51ccc79f9536d75feb1633421691165cd191f8137f8b37569a0329";
const GUM = `UD_English-GUM train, sha256 ${GUM_SHA}`;
const BUILDER = "eval/referents/convention-witness.mjs";

const row = (r) => Object.freeze({ schema: "NomosRule@1", kind: "convention", language: "eng", ...r, witnesses: Object.freeze(r.witnesses), departs: Object.freeze(r.departs) });

export const CONVENTIONS = Object.freeze([
  row({
    rule: "Convention@1:eng:capital-marks-a-name",
    stem: "capital-marks-a-name",
    says: "In a cased script a capital in the middle of a sentence marks a name.",
    scope: "cased scripts (Latin, Cyrillic, Greek) written in standard orthography",
    address: "native/adapters/text/surfaces.js::accumulateSurfaceEvidence (CAP_TOKEN, capCounts)",
    standing: "candidate", giver: null, builder: BUILDER,
    witnesses: [GUM, "a name is capital mid-sentence 0.9714 of the time (10,227 of 10,528 PROPN); a word that is not a name 0.0310 (4,614 of 148,660); so a mid-sentence capital is a name 0.6891 of the time (10,227 of 14,841)", "the-fold/language-context.js header: standard prose, SMS, Singlish and IRC capitalise 2-13% of non-initial tokens, and capitals mostly mark names"],
    basis: "extracted — measured from the received ground's own PROPN tags; a nomination with its witnesses, not a licence",
    departs: ["German capitalises every noun", "a caseless script has no capital", "an all-lower-case text (SMS, OCR) keeps none: the case-free floor of surfaces.js stands in"],
  }),
  row({
    rule: "Convention@1:eng:capital-opens-a-sentence",
    stem: "capital-opens-a-sentence",
    says: "The first word of a sentence is capitalised by position, so a sentence-initial capital is no evidence of a name.",
    scope: "cased scripts; holds where the sentence cut finds the sentence",
    address: "native/adapters/text/surfaces.js::accumulateSurfaceEvidence (the run scan starts at token 1)",
    standing: "candidate", giver: null, builder: BUILDER,
    witnesses: [GUM, "a sentence-initial capital is a name 0.0797 of the time (860 of 10,788)"],
    basis: "extracted — measured from the received ground's own PROPN tags; a nomination with its witnesses, not a licence",
    departs: ["a name that only ever opens a sentence is invisible to the capital tier: organs/hypergraph.js 'the referent bar' confirms it by a real pronoun binding"],
  }),
  row({
    rule: "Convention@1:eng:sentence-end-is-marked",
    stem: "sentence-end-is-marked",
    says: "A sentence ends with a terminal mark, so the capital after one opens a sentence.",
    scope: "running prose; the sentence cut (adapters/text/spans.js) reads by it",
    address: "native/adapters/text/spans.js::splitSentences",
    standing: "candidate", giver: null, builder: BUILDER,
    witnesses: [GUM, "0.0906 of the gold sentences end with no terminal mark (1,025 of 11,314): headings, bylines, captions, list items"],
    basis: "extracted — measured from the received ground's own sentence segmentation; a nomination with its witnesses, not a licence",
    departs: ["a heading, byline or list item run into the next sentence by a space puts that sentence's capital in the middle of a cut: the lone capital of 'Grab', 'Well', 'Okay' after one, which the giver's rate (the next row) answers"],
  }),
  row({
    rule: "Convention@1:eng:treebank-attests-a-forms-use",
    stem: "treebank-attests-a-forms-use",
    says: "How a form is used, tag by tag, is attested by a human-annotated treebank; a capital the text cannot test is weighed against that use.",
    scope: "English; a single-word candidate the text never writes lower-case",
    address: "native/adapters/text/form-usage.js::formUsageOf, read by native/adapters/text/surfaces.js::surfacesFromEvidence (formUsage)",
    standing: "given", giver: "Universal Dependencies UD_English-EWT (train split), human-annotated gold treebank, CC BY-SA 4.0, as pos-eng.json (POSPrior@1: a form keeps every UPOS tag with its count)", builder: null,
    witnesses: ["janus priors/pos-eng.json: 12,544 sentences, 204,578 tokens, 16,654 distinct forms", "wordclass.js::classifyWord is the repo's lens over it; nothing is re-read", "the ground the cast is scored on (UD_English-GUM) is a different corpus"],
    basis: "received — the rule's giver is a named ground (UD_English-EWT); silent for a form the treebank has not seen, which then stays a being",
    departs: ["the prior is keyed on the case-folded form: a name whose lower-case twin is a function word (\"May\", \"Will\") is judged by the twin's use, and passes only where the text's own capitals nearly balance it", "no pos prior, or a language other than English: the giver is silent and the capital tier is what it was"],
  }),
]);

const countBy = (rows, k) => Object.freeze(rows.reduce((o, r) => ({ ...o, [r[k]]: (o[r[k]] ?? 0) + 1 }), {}));

export function conventionsLedger() {
  const rows = CONVENTIONS;
  return Object.freeze({ schema: "Nomos@1", version: "Nomos@1", rows, stats: Object.freeze({ schema: "NomosStats@1", conventions: rows.length, byStanding: countBy(rows, "standing") }) });
}

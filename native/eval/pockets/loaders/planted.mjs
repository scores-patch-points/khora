// eval/pockets/loaders/planted.mjs — GROUP "pl": the INSTRUMENT CHECK. Eight synthetic pockets whose laws are exactly known (see results/planted-truth.json).
// export async function load(onlyIds = null) -> Pocket[]; lazy: only the requested ids are generated.
import { validate } from "../lib/pocket.mjs";
import { NDOCS, buildDocs, lexicon, DOC_TOKENS } from "./_planted-core.mjs";
import { NULL, NULL2, BURST_WORLD, MARKOV } from "./_planted-worlds1.mjs";
import { FRAMES_WORLD, PARALLEL, LENGTH, MIX, MIX_DOCS } from "./_planted-worlds2.mjs";

const TOK = "synthetic word tokens: generated lowercase a-z strings, one token per generated type occurrence; the grain is the word, there is no punctuation, no digit, no capitalisation and no natural language";
const DOCDEF = `a document closes at the first unit boundary at or after ${DOC_TOKENS} tokens (units are never cut); one document = one independent generator run (own seeded rng, own history)`;
export const SPECS = [
  { id: "pl-null", world: NULL, ndocs: NDOCS, notes: "iid Zipf(1.0) over 5000 types; unit lengths iid lognormal D1; NO structure of any kind; string lengths iid per type, independent of rank" },
  { id: "pl-burst", world: BURST_WORLD, ndocs: NDOCS, notes: "self-exciting repetition: each token copies a token of the document history with prob 0.35 by exponential lag kernel tau=10 (lags 1..60), else fresh Zipf(1.0); unit lengths D1" },
  { id: "pl-markov", world: MARKOV, ndocs: NDOCS, notes: "first-order Markov on 8 rank bins, strong one-way flow (8-cycle), stationary law = Zipf mass of each bin so the unigram law is exactly Zipf(1.0); chain restarts at each unit; unit lengths D1" },
  { id: "pl-frames", world: FRAMES_WORLD, ndocs: NDOCS, notes: "7 rigid frames over 8 function words and two open classes (Zipf within class) plus a unit-initial vocative slot (prob 0.35) filled from a per-document cast of 4 of 24 recurring names" },
  { id: "pl-parallel", world: PARALLEL, ndocs: NDOCS, notes: "iid Zipf(1.0) units D1 except with prob 0.35 a unit copies a prefix (1/2) or suffix (1/2) of the previous unit, 30-70% of its length" },
  { id: "pl-length", world: LENGTH, ndocs: NDOCS, notes: "Zipf(1.0) with iid-given-unit-length tokens; string length = round(2 + 2.4*log10(rank) + noise 0.7) (Zipf abbreviation); long units tilted to short strings (Menzerath, beta 0.1); no order structure" },
  { id: "pl-mix", world: MIX, ndocs: MIX_DOCS, notes: "120 documents: 48 burst + 36 markov + 36 frames, each document wholly one process; shared lexicon A (union of worlds 2, 3 and 4 at proportions 0.4/0.3/0.3 of documents)" },
  { id: "pl-null2", world: NULL2, ndocs: NDOCS, notes: "second iid world: Zipf(1.3) over 5000 types; unit lengths iid shifted-exponential D2 (mode 2, mean ~16); NO structure; other lexicon seed" },
];
export const IDS = SPECS.map((s) => s.id);
export function buildPocket(spec) {
  const { units, docOf } = buildDocs(spec.id, spec.ndocs, spec.world.docMaker, lexicon(spec.world.lexTag));
  return { id: spec.id, group: "pl", register: "planted", language: "zxx", script: "latn", units, docOf,
    meta: { tokenisation: TOK, docDef: DOCDEF, source: "eval/pockets/loaders/planted.mjs (seeded generator, seed namespace planted-v1; truth in results/planted-truth.json)", notes: spec.notes, planted: true, lexicon: spec.world.lexTag, capApplied: false } };
}
export async function load(onlyIds = null) {
  const out = [];
  for (const spec of SPECS) { if (onlyIds && !onlyIds.includes(spec.id)) continue; const p = buildPocket(spec); validate(p); out.push(p); }
  return out;
}

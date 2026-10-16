// standing-cube.js — EVERY WAY A THING CAN OR CANNOT HAVE STANDING, generated from the cube and
// checked against the null census. Never hand-tallied: the 27 cells come from native/kernel/cube.js
// (injected, the cast.js pattern, so they cannot drift from the algebra); the positives and nulls are
// the declared census below; a test pins that the census covers exactly the cube's 27 and names no
// cell the cube does not have.
//
// WHY 27, AND WHY IT IS A CUBE. Jain syādvāda (the seven-fold predication: is · is-not · inexpressible
// and their non-empty joins, every one hedged syāt — "from a standpoint") generalizes here, not to a
// scalar truth, but to a POSITION: a thing stands FROM a cell, and every cell is (act × grain). The
// fold's own statement of the census (native/docs/THE-NULL-STATES.md): "a positive finding is one
// shape; a null is twenty-seven", because every organ perceives by difference from a nothing it
// rebuilds. And THE-27-CELLS.md is explicit that there is NO third free axis — 27 = 9 operators × 3
// grains, not 9×9×9. Cells classify MOVES, never content.
//
// THE PAIRING RULE (THE-NULL-STATES, the law this file exists to enforce): every positive an organ can
// land has a null in the SAME cell, and the organ that lands the finding owes the null — an organ that
// binds owes `unbound`; one that composes owes `withheld` and `vetoed` apart. A capacity registered
// without its null is a capacity that will read silence as support.
//
// Pure: no DOM, no IO, no model, no clock. Truth is NOT assigned here — coherence never establishes
// correspondence; what a thing has is standing, and standing is a position with its owed nulls.

// The seed, kept beside the widening so the two are read together. The seven are the non-empty subsets
// of {is, is-not, inexpressible}; the fold reads the same three again as the three NEGATIVES below.
export const JAIN_SEED = Object.freeze([
  "asti", "nasti", "avaktavya",
  "asti+nasti", "asti+avaktavya", "nasti+avaktavya", "asti+nasti+avaktavya",
]);

// The three negatives — one per domain, each × 3 grains — and the cells they land on:
//   a CUT (SEG) separates a subject from an extent; disputable, a veto, never a premise.
//   a VOID (DEF) bounds an extent empty; cancelled by one arrival.
//   a CONTEST (CON) is the relation between a link and a cut.
// Reading all three as "contradicted" is why the reader once had one word for three acts.
export const THE_THREE_NEGATIVES = Object.freeze([
  Object.freeze({ kind: "cut", cell: "SEG·Figure" }),
  Object.freeze({ kind: "void", cell: "DEF·Ground" }),
  Object.freeze({ kind: "contest", cell: "CON·Figure" }),
]);

// The nulls of the self carry NO cell — the walls that keep the hub empty (THE-WAYS-OF-KNOWING: the
// sākṣin is never itself an object of knowledge; here, the instrument's own nulls, not the material's).
export const HUB_NULLS = Object.freeze([
  Object.freeze({ gap: "self_referential", why: "an act that reads the trail's own trail is the watcher's regress — refused at the gate" }),
  Object.freeze({ gap: "read_nothing", why: "a hold that read nothing asserted rather than read" }),
  Object.freeze({ gap: "self_witness", why: "an outer note, never a witness" }),
  Object.freeze({ gap: "model_unreachable", why: "the one live call failed — a typed gap, never a raw exception" }),
]);

// THE CENSUS — for each of the 27 cells, the positive act and the nulls it owes. Keys are "OP·Grain".
// Positives and null names are THE-27-CELLS.md's and THE-NULL-STATES.md's own; a cell that names a
// null it does not owe, or omits one it does, is a document amendment, not a code change.
const CENSUS = Object.freeze({
  // Existence — NUL · SIG · INS
  "NUL·Ground": { positive: "measure — a declared statistic against a licensed, deliberately broken null",
    nulls: ["no_ground", "degenerate_ground", "incommensurate_extent", "trending_material"] },
  "NUL·Figure": { positive: "clear — does this figure clear its ground (establishment over a presence set)",
    nulls: ["exceeds_witness"] },
  "NUL·Pattern": { positive: "kindnull — declared kind membership against the random-subset null",
    nulls: ["made_no_difference", "slack_ground"] },
  "SIG·Ground": { positive: "settle — name what is absent as the questions that would settle it",
    nulls: ["unread_extent", "empty_material"] },
  "SIG·Figure": { positive: "cast — referent identity: names resolve to WHO, not byte strings",
    nulls: ["unheard", "beyond-reach"] },
  "SIG·Pattern": { positive: "kinds — recurring kind candidates signed provisionally",
    nulls: ["no_candidate", "control_survived"] },
  "INS·Ground": { positive: "preflight — generate the ground a materialless turn needs",
    nulls: ["no_material", "empty_material"] },
  "INS·Figure": { positive: "build — birth: individuate the signed figure, attach its result",
    nulls: ["INCOMPLETE", "UNADDRESSED", "NOT_A_VERB"] },
  "INS·Pattern": { positive: "skill — a known procedure instantiated onto new material",
    nulls: ["missing_kind_prior", "refused-as-underpowered", "ambiguous_surface"] },

  // Structure — SEG · CON · SYN
  "SEG·Ground": { positive: "extent — the extent a space must cover, AND its units, made operative",
    nulls: ["extent_excludes", "no_slot", "no_anchor", "no_closing_condition", "gap_between_parts", "overlapping_parts", "byte_mismatch"] },
  "SEG·Figure": { positive: "the cut — a named subject separated from a named extent (the negative CLAIM; a veto, never a premise)",
    nulls: ["beyond-reach"] },
  "SEG·Pattern": { positive: "unravel — cut a pattern apart at its own seams (parameter-free)",
    nulls: ["no_seam"] },
  "CON·Ground": { positive: "field — maintain the connective ground (append the fold line, never decide)",
    nulls: ["no_population", "skippedNoCopresence"] },
  "CON·Figure": { positive: "relations — the material's own subject–verb–object edges (bound/contradicted/unbound/beyond-reach/unheard)",
    nulls: ["unbound", "object_unspecific", "undetermined"] },
  "CON·Pattern": { positive: "network — a recurring ARRANGEMENT found and bound",
    nulls: ["pronoun_no_candidate", "pronoun_no_margin", "no_incoming_face"] },
  "SYN·Ground": { positive: "compile — sedimented readings merged into one carried experiential ground",
    nulls: ["empty_field"] },
  "SYN·Figure": { positive: "hear — a re-sighting folds into the SAME note, witnesses and spans unioned",
    nulls: ["withheld", "vetoed", "UNLICENSED_PERTURBATION"] },
  "SYN·Pattern": { positive: "graph — relations linked to document-order neighbours and referent siblings",
    nulls: ["not_yet_executable", "undeclared_organ", "undeclared_cell", "organ_unreachable"] },

  // Interpretation — DEF · EVA · REC
  "DEF·Ground": { positive: "the void — declared emptiness over an extent WITH ITS SCOPE",
    nulls: ["no_frame", "undeclared", "constitution_unresolved"] },
  "DEF·Figure": { positive: "priors — one claim checked against the live_priors corpus (the loop's cut)",
    nulls: ["wish", "fixture_absent", "control_absent"] },
  "DEF·Pattern": { positive: "declare — candidate functional/transitive declarations acquired from material",
    nulls: ["unmeasured", "no_pronoun_prior_for_language"] },
  "EVA·Ground": { positive: "atmosphere — the reader's own accumulated ground, metered",
    nulls: ["unexamined"] },
  "EVA·Figure": { positive: "web + witness — judging a figure through a lens; every patch's witness",
    nulls: ["unreachable_guard", "insufficient", "unstable", "inconclusive"] },
  "EVA·Pattern": { positive: "standing — a claim's standing across witnesses (a property of the SET)",
    nulls: ["control_survived", "NOT_COMPARABLE", "unlicensed"] },
  "REC·Ground": { positive: "regime — the ambient reading regime's tolerance-triggered re-zero",
    nulls: ["no_rezero_trigger", "not_earned"] },
  "REC·Figure": { positive: "rezero — a judged projection's ground conceded and the next born",
    nulls: ["record_gap", "record_conflict", "source_absent", "posture_spent"] },
  "REC·Pattern": { positive: "reshape — a finding contradicting the DECLARED SPACE re-zeros the space",
    nulls: ["paradigm_unraveled", "empty_paradigm", "kept_ground", "anchor_ground"] },
});

// The true-value PROPER: EVA·Pattern is literally named `standing` in the registry — a property of the
// set of witnesses that no member carries (merge-standing.js / mergeTestimony). Its five values, and
// the two laws that keep a self-witness from laundering itself into corroboration.
export const STANDING_VALUES = Object.freeze(["AGREE", "SINGLE", "DISAGREE", "CONTRADICTED", "UNDETERMINED"]);
export const STANDING_LAWS = Object.freeze([
  "a self:model never co-signs corroboration alone",
  "a self-witness opposed by a real refusal is still a real disagreement, on the record",
]);

// The two flags `groundCheck` can raise, and the cell each stands at — so a visible provenance
// notice can name WHERE a claim failed to stand, not merely that it did.
export const FLAG_CELLS = Object.freeze({
  unknown_path: "SIG·Figure", // the answer names a path that resolves to no referent — cast: beyond-reach
  unverified_pass: "EVA·Figure", // a check nothing can trigger — the unreachable guard / insufficient
});
export const cellForFlag = (kind) => FLAG_CELLS[kind] ?? null;

export function makeStandingCube({ operators }) {
  const { GRAINS, OPERATOR_CHAIN, TERRAIN_BY_DOMAIN, cellOf } = operators;

  /** everyCell() — the 27, from the cube, each merged with its declared positive and owed nulls. */
  function everyCell() {
    const specs = OPERATOR_CHAIN.map((op) => cellOf(op, "Ground"));
    return OPERATOR_CHAIN.flatMap((op, i) => {
      const { mode, domain } = specs[i];
      return GRAINS.map((grain) => {
        const key = `${op}·${grain}`;
        const census = CENSUS[key] ?? { positive: null, nulls: [] };
        return {
          cell: key, op, grain, mode, domain,
          terrain: TERRAIN_BY_DOMAIN[domain][grain],
          positive: census.positive,
          nulls: census.nulls,
        };
      });
    });
  }

  /** The census keys the cube does not have — drift, named (a census of a cell that isn't there). */
  function drift() {
    const real = new Set(everyCell().map((c) => c.cell));
    return Object.keys(CENSUS).filter((k) => !real.has(k));
  }

  /** pairing() — THE PAIRING RULE. Every positive owes a null. `unpaired` is the failure it exists to catch. */
  function pairing() {
    const cells = everyCell();
    return {
      paired: cells.filter((c) => c.positive && c.nulls.length),
      positiveWithoutNull: cells.filter((c) => c.positive && !c.nulls.length).map((c) => c.cell),
      nullWithoutPositive: cells.filter((c) => !c.positive && c.nulls.length).map((c) => c.cell),
      empty: cells.filter((c) => !c.positive && !c.nulls.length).map((c) => c.cell),
    };
  }

  /** The three negatives, resolved to their cells and their owed nulls. */
  function negatives() {
    const by = new Map(everyCell().map((c) => [c.cell, c]));
    return THE_THREE_NEGATIVES.map((n) => ({ ...n, cell: by.get(n.cell) ?? null }));
  }

  /**
   * interrogate(op, grain) — ask the cube where a thing stands and what it owes. A bad op or grain is
   * the cube's own typed gap (unknown_spec), never a silent no-op; a valid cell that the census has not
   * filled is reported EMPTY with the cell named (a lead, never a verdict — the docs' own rule).
   */
  function interrogate(op, grain) {
    const cell = cellOf(op, grain);
    if (cell?.gap) return cell;
    const key = `${op}·${grain}`;
    const census = CENSUS[key];
    if (!census?.positive) return { cell: key, empty: true, gap: "uncensused_cell", why: "no positive or null declared at this cell" };
    return { ...cell, cell: key, positive: census.positive, nulls: census.nulls };
  }

  /** The true-value set at its own cell. */
  function standing() {
    return { cell: "EVA·Pattern", values: STANDING_VALUES, laws: STANDING_LAWS, nulls: CENSUS["EVA·Pattern"].nulls };
  }

  return { everyCell, drift, pairing, negatives, interrogate, standing, hubNulls: () => HUB_NULLS };
}

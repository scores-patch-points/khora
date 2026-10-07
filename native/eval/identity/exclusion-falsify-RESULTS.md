# functional-determination chain — falsification (result)

Instrument: `eval/identity/exclusion-falsify.mjs` (new dir/file, 2026-10-07; pre-registration header in the file). It drives the
**real** organs — `kernel/kind-functional-induction.js::induceKindsAndFunctions` and `kernel/identity-exclusion.js::makeIdentityExclusion`
— on a **planted, authored** world whose truth is known: 60 people (born/died functional, held many-valued), 60 cities
(founded/country functional, hosted many-valued), 30 decoys with their own relations. No model, no prior, no natural gold.

## Verdict: SURVIVED — every claim held, every control passed

| claim | result |
|---|---|
| **C0** kind induced from profiles (not names) | HOLDS — 3 kinds found; people basin purity 1.0, city purity 1.0 |
| **C1** truly-functional ⇒ `fixed`; truly-many-valued ⇒ `many-valued`; never-twice ⇒ `unexposed` | HOLDS — born=fixed, died=fixed, held=many-valued |
| **C2** induced conflict only RAISES (unbound + candidate), given conflict CONTRADICTS | HOLDS — induced → `unbound` with `born`,`died` raised; given → `contradicted` |
| **C3** grain theorem: one simultaneous disagreement refutes; agreement never un-refutes | HOLDS — born → many-valued after one extra value; held stays many-valued |
| **C4** standing needs exposure ≥ floor | HOLDS — a single exposer leaves `born` unexposed |
| **K1** sham (referent vs itself) | ok — unbound, nothing raised |
| **K2** determinism | ok — byte-identical register on re-run |
| **K3** derangement collapses `fixed` | ok — deranged born = many-valued |
| **K4** a many-valued relation never enters the register | ok — held absent, born present |

So: the chain "kind induction → one-valuedness read off the values → a raised conflict distinguishes two referents, a given one
convicts" **does what it claims** on a world whose answer we know, with controls that can fail and do move.

## What the falsifier caught (two real lessons)

1. **My first world was wrong, not the organ.** I planted a relation with two disagreeing values and *no time*, and expected
   `many-valued`. The organ said `time-unknown`: a disagreement only refutes one-valuedness when the two values are witnessed
   **simultaneous** (overlapping intervals). Untimed disagreement is not a refutation. That is the grain theorem being
   conservative on purpose — you can only refute a universal with a *placed* counterexample. The falsifier caught my assumption.
2. **The kind inducer finds a core subset, not the whole kind.** Coverage is only **0.233** (14 of 60 people); purity is 1.0.
   On this planted world the affinity-basin inducer binds a tight core and stops. Consequence for the machinery: two people
   *outside* the basin share no induced kind, so `identity-exclusion` returns `beyond-reach` for them — the heuristic rule is
   narrow. This is the one place the test says the chain is weaker than advertised, and it is in the induction step, not the
   functional or exclusion logic.

## Scope (what this does and does not establish)

- **Does establish:** on planted data with known truth, the functional-determination chain is sound and self-consistent —
  soundness, the induced/given distinction, the grain theorem's direction, the exposure floor, and the register's negativity
  (many-valued relations never enter it).
- **Does not establish:** that it works on natural text, or that the induced kinds will cover real populations. Coverage 0.233 is
  the open risk. The next test is a natural slice (e.g., `docs/data/tesla.json`) where a real one-valued relation (a person's
  birth date) appears — to see whether induction reaches coverage > ~0.5 before the machinery is worth wiring.

Reproduce: `node eval/identity/exclusion-falsify.mjs` (add `--json` for the full record).

# Same for whom, in which respect

`reading.js::sameFor(first, second, { cells, questions, licence })` — are two texts the same, **for a perspective**? Code: `organs/same-for.js`
(medium-blind), `adapters/text/same-for-text.js` (text), `kernel/commitments.js` (the commitments it stands on). Tests:
`native/tests/same-for.test.js` (no priors), `npm run test:same` (the real reader).

## The model

Same and Other are always **in some respect**. The respects are the cube's transformations, so a judgment has three coordinates:

| coordinate | what it says | values |
|---|---|---|
| **op** | the transformation the two are compared under | NUL SIG INS SEG CON SYN DEF EVA REC |
| **grain** | within one level: the field the unit stands in, the unit itself, the unit as a kind | Ground, Figure, Pattern |
| **level** | which holon: part inside whole | token < end < act < claim < text < ground |

Each cell has an **outcome**:

- **same**
- **other**
- **gap**: this reader produced no evidence at the cell
- **n/a**: the cell cannot be a respect, e.g. SYN·Ground, the desert cell

Each cell also has a **warrant**: where the evidence came from. A warrant is never a grain.

**Two nestings, kept explicit:**

- **Within a level**, Same at Figure entails Same at Pattern: one instance is one kind. Other at Pattern entails Other at Figure. The reverse never follows.
- **Across levels**, a cell is computed from bonds at the level below. Ties (act) bind only when their beings (end) bind. A level's Pattern seeds the next level's Ground.

**A perspective is the set of cells it cares about.** The pair's verdict for it is **derived, never stored**:

- **Other** if any cared-for cell is Other;
- otherwise **Gap** if any cared-for cell is Gap;
- otherwise **Same**.

A difference in a cell the perspective does not care about is noise for it: **NUL ∅**. A difference that matters is signal: **SIG ○**.

## Named perspectives (text)

| name | cells | asks |
|---|---|---|
| `meaning` (default) | INS·Figure@end, CON·Pattern@act, DEF·Figure@claim, EVA·Figure@claim | the same beings, ties of the same kind, the same commitment, true together |
| `surface` | SEG·Figure@token, SIG·Figure@token | the same cut and order, the same tokens attended |
| `ground` | INS·Ground@text | about the same field |

**With `questions`**, the perspective is the asking itself. Every correspondence is put forward as a `same-as` by a named giver, and every unplaced part as `noise`. Each is tested against the questions with a named null, or by ablation for noise, and refusals are conceded. The cell verdict is reported beside it.

## Profiles it gives (constructed pairs, the real reader)

| pair | meaning | surface | profile |
|---|---|---|---|
| passive paraphrase | same | other | SEG other; INS, CON, DEF, EVA same |
| denial | other | other | INS and CON same; DEF and EVA other (a contradiction: same subject, opposite commitment) |
| role swap | other | other | INS same; CON other |
| scored / netted, no giver | other | — | CON·Pattern other: two relations are one kind only through a named giver (`licence`) |

## Known limits of this reader (not repaired here)

- **A fronted phrase is not read.** "In 1894, Tower Bridge opened" loses its date, so it is not Same for meaning against "Tower Bridge opened in 1894". It should be.
- The lemmatizer gives `nett` for "netted".
- REC and NUL cells are **gap**: this reader keeps no ground forward and does not compare absences yet.
- Whether every one of the 27 cells is a real respect is **untested**. Which cells actually separate pairs is to be measured, not assumed.

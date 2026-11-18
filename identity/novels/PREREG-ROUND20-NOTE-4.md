# PREREG-ROUND20 NOTE 4 — surprise in the reading, through the priors (registered before the calibration is measured and before any score of the new arm)

Observed first (2026-11-18, not a result): on the toy texts "he" binds Mary, Anna, Helen. The cause is inside the rung: its clause-local gender evidence rule takes the one named being in a clause as the referent of a gendered pronoun in that clause ("then he called Mary" -> "Mary is male"), and text evidence overrides any prior. The real referent (the sentence-initial-only name) was never admitted. A prior that a single clause can overturn is no prior.
The user's direction: surprise must live in the reading, via priors: for Mary to be a man would be very surprising, so it needs a lot of evidence.

## The rule (Bayesian surprise; every number measured, none typed)
- Each being has gender log-odds LO = log P(m)/P(f). PRIOR from a giver: LO0 = +/- R where R = log(r / (1 - r)) and r is the MEASURED reliability of the giver (the Wikidata given-name snapshot) against the gender the text actually uses, on gold entities of the training slices.
- EVIDENCE: each clause of the rung's own clause-local evidence adds +/- E to LO, with E = log(q / (1 - q)) and q the MEASURED precision of one clause of that evidence against the gold entity gender, on the same slices. (The evidence is correlated within a document; the independent unit is the document, so the evidence a being accrues in ONE document is counted by its documents, not its clauses: at most one E per document. Declared because the clauses of one document are not independent witnesses.)
- A clean he / she weights each candidate's activation by P(gender matches) = sigmoid(+/- LO). A candidate whose match probability is small falls under the floor and the pronoun abstains (no_real_referent); nothing is vetoed by a typed rule.
- SURPRISE of a binding = -log2 P(gender matches) of the chosen being, in bits, recorded on the binding; a binding whose surprise exceeds the surprise of a coin (1 bit) is reported as contested (the line), not hidden.
## Measurements (all on the training slices E, C, D, F; never U)
- r: of the cast beings whose gold entity has a pronoun gender and whose name words the giver attests as male or female given names, the share where they agree; and the giver's coverage.
- q: of the beings with clause-local gender evidence from the rung, the share whose evidence gender equals the gold gender; and the share of beings with any evidence.
## Arms (U, 66 documents, 552 pronouns; table built without U; soft mode on)
S6s = 321/30 (shipped table, soft). S13 = S6s + the surprise-weighted gender (R from r, E from q, the giver's snapshot).
- N1: S13 does not bind a being the giver and the training calibration make very unlikely to match (on the toy texts: he does not bind Mary, Anna, Helen; the pronoun abstains).
- N2: S13 precision >= S6s and right count not below S6s - 2 on U; coverage reported. (Expectation, stated now: GUM wrong-gender errors are 1.5% of errors, so a small effect on GUM; the toy texts are the case it is for.) Failures reported.

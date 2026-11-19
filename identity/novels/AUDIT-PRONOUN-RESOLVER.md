# Audit: what the English pronoun resolver really does (2026-11-19)

Asked: are we really using activation, prediction processing, the arrow of time and dependency order, and the holograph? Development data only (LitBank train, 80 documents, 5,152 answerable pronouns by the narrow round 23 definition; 5,756 with LitBank dev), exploratory, no claim and nothing tuned; scripts: `identity/pronouns-multilingual/eng/build-ranker-rows.mjs` with the env flags PRIOR_GENDER, ORACLE_ROLES, COARG, BOOST (the round 25 builder).

## 1. Activation: present, but it is recency
`presence = v * gamma^(t - t_last)` per sentence (`pronouns.js:1034`); with the chosen guess dials (window 12, boost 1, feed 0) a being's activation is a decayed count of its name mentions. Choosing the top candidate by it: 0.522 (LitBank train + dev, 5,756); the most recently mentioned candidate alone 0.503; the most mentioned 0.488; a random candidate 0.187. Activation adds about 2 points over "most recent". The right referent is among the candidates 84.9% of the time, so the choosing step, not the candidate list, is the gap (0.52 against 0.85).

## 2. Prediction processing: none
The rung keeps counts and decays them; it never forms an expectation of who comes next and never scores a surprise. `predict` and `expect` occur 0 times in `pronouns.js`; the read's own surprise cut (`surpriseCut(tokenEvents)`, `read-core.mjs:542`) is computed for the entry and is not an input to the rung. The surprise-weighted gender model (`genderModel`) exists and is off.

## 3. Arrow of time: causal binding, but lookahead in the cast and no revision
The binding loop is causal (a pronoun sees only text before it; gender evidence from a sentence informs later sentences only). Two breaks: the cast (which beings exist and which spellings merge) is built from the whole document first (a capitalisation test over all of it), so being identity looks ahead; and nothing revises: a later "she said" never re-binds an earlier pronoun and no delta is recorded (`revis` occurs 0 times in the rung).

## 4. Dependency: not used, and adding it naively does not help
- Roles are an optional input and off. Given the GOLD UD roles of the treebank (so a perfect diagrammer), the rung's two uses of them do not help on fiction: at boost 2, 0.484 without roles, 0.479 with gold subject weighting, 0.477 with disjoint reference added; at boost 4, 0.478, 0.483, 0.481. Under the chosen dials (boost 1) roles cannot matter by construction. So the failure is not the parser: role as a multiplier on a count is the wrong way to use dependency.
- Gender, a dependency every pronoun carries: 29.8% of the English guesses (417 of 1,399 with a known given-name gender) bind to a being whose Wikidata given-name gender contradicts the pronoun ("she -> Mr Jervis Pendleton", "his -> Aunt Judy"); 25.6% (139 of 544) among the "confident" ones. The canonical read does not pass the gender prior. Adding it as a veto changes nothing on development data (0.506 -> 0.503): the wrong choices are replaced by other wrong ones, and the prior is noisy on 19th-century fiction (titles, surnames, nicknames).

## 5. The holograph: not consulted
The rung's inputs are `{sentences, mentions (name spans), nonPersonal, nameRuling, roles}` (`read-core.mjs:507`). It does not read the entry's edges, acts, clauses or the referent ledger (`reading-referents.js`, off), so topic continuity, who just acted, who is speaking and what a relation says never reach a binding.

## Reading
The resolver is a recency counter over a name-only cast. The pieces the user named (prediction, time with revision, dependency order, the holograph) are mostly absent, and the obvious way to bolt dependency on (roles as weights, a gender veto) does not move the number even with perfect inputs. Not yet tested: a centering-style forward-looking centre (ranked by role, persistence, with the prediction scored as surprise), dialogue-turn structure for fiction (who speaks next), and revision with a recorded delta. Those are the experiments that follow from this audit, each to be preregistered.

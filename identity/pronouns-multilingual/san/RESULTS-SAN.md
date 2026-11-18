# Sanskrit pronoun binding: results (2026-11-17)

Plain statements, failures first. No LLM anywhere. Preregistration: PREREG-SAN.md, addendum A and B (sha256 and UTC time beside each). Texts are not committed (GRETIL is CC BY-NC-SA 4.0; the treebanks are CC BY-SA 4.0 and were read from a scratch directory).

## What failed or is still blocked
1. **The cast is mostly not characters.** Latin-script lower-case Sanskrit has no capital to name a being, so beings are heard nominals (a recurring word the grammar reads as a nominal). In the top 10 of a chunk most are not characters (nāma "named", tataś "then", kiñcit, 'haṃ, sukhaṃ). By eye, about 27% of the 132 pronouns bound in v1 went to a character-like being (thief, jackal, mouse, donkey, friend ...); v2 about 37% of 102. The gold-free falsifier cannot see this error: a pronoun bound to "happiness" contradicts nothing.
2. **Coverage is low at the default dials: 20% of found pronouns bound (English: about 50%).** Of 525 pronoun tokens found in the Panchatantra sample, 389 stay unbound because the being's presence is below the floor of 2 (74%), 22 for margin, 8 with no being present, 1 gender veto. Half-verse sentences and few recurring beings: presence decays before the pronoun comes. Dials untouched.
3. **Pro-drop leaves little to bind.** In the Panchatantra treebank (UFAL), only 12.1% of finite third-person verbs have an overt third-person pronoun subject; 53% have a noun subject and 23% have no subject at all. Vedic (test split): 10.7% overt, 55.7% dropped. At best a pronoun binder touches about one subject in eight.
4. **The reader does not hear Devanagari as Sanskrit and has no Devanagari prior.** Undeclared, Devanagari text defaults to English (`language_default`); declared san, it splits on the danda (195 sentences in a 12,000-character slice) and then reads nothing: no POS or frame prior is Devanagari (pos-san.json is IAST), so 0 heard beings and 0 bindings. The finder alone does find 198 register forms in that slice (the Devanagari register has only the 89 UFAL tokens' forms; तं with the anusvara is not in it, 92 occurrences). Not fixed: needs a Devanagari to IAST codec at the reader's door or Devanagari priors.
5. **The Daśakumāracarita is unusable as read.** GRETIL writes its stops as "/" and "//" with long unspaced compounds: 68 sentences in 65,000 characters; presence over such units is meaningless (coverage 0.86 on 10 referents; contradiction 0.327 vs null 0.347, interval includes 0). Dropped from every claim. Śukasaptati was dropped before reading for the same reason.
6. **No coreference gold is known to me for Sanskrit** (no UD coreference layer for either treebank; nothing found on GRETIL or Wikisource). Correctness (precision) is NOT measured. Everything below the finder score is a lower bound on error or a coverage rate.
7. **Sandhi that fuses words is invisible to a letter-boundary finder** (15.7% of the UFAL gold pronouns sit inside a fused multiword token, e.g. tasyaiva). Not repaired; needs a segmentation (the treebanks' MWT layer could train one).
8. **`bhavat` (honorific bhavān, "you, sir") is in the register by the treebank's own rule** (UFAL tags it PronType=Prs, Person=3): 5 of 7 free-standing misses in H3 are bhavān. Removing it changes the contradiction bound by 0.1 point (H10), so it is left in; it is a second person in use and should come out.
9. A missing file on main: `native/scripts/build-frame-prior.mjs` imports `./lib/frame-build.mjs`, which is not in the repo; `frame-san.json` was built by identity/pronouns-multilingual/san/build-frame.mjs (same algorithm from its header) and is NOT in janus/priors. The read needs it (copy it into janus/priors, or the cast is empty).

## What was built (branch lang/san)
- `native/adapters/text/pronoun-registers/san.json`: PronounPrior@1, 125 forms (75 treebank forms + 50 final-sound variants), IAST and Devanagari side by side, with provenance, treebank counts, the third-person lemma rule (tad, etad, idam, adas, ena, bhavat; as UFAL tags them), `beings: "heard-nominals"` and 314 nominal case endings (from the Vedic treebank, closed under the same variants). Build script and report: build-register.mjs, register-build-report.json (kept and dropped forms with the reason).
- The treebank register as measured: sa/saḥ/eṣa/eṣaḥ/ayam/asau/tam/enam/imam/... masculine; sā/iyam/tām/eṣā/enām/... feminine; tasya/asya/tena-type forms split masculine/neuter (soft). Excluded by rule: neuter-majority forms (tat, idam, etat, tena) and plural/dual forms (te, tān, tāḥ), 95 forms in all.
- Reader changes, Sanskrit only (the other 20+ stems are untouched; the npm test run has the same 13 failures on a clean main and on this branch; cast-identity R1 fails on both): the ASCII pipe is a sentence stop in san (`priors.js::ASCII_DANDA_STEMS`, `spans.js` option `extraTerminators`); the final-sound closure (`sanskrit-sandhi.js`) on the POS prior and the register; heard nominals folded by case ending before the two-mention floor (`language-context.js`) and used as the presence rung's beings when the register says so (`read-core.mjs`); the presence rung now returns why each found pronoun is left unbound (`pronouns.js`, additive).
- Tests: `pronoun-registers-san.test.mjs`, `sanskrit-sandhi.test.mjs`, `read-san.test.mjs`; added to the npm test list.

## Preregistered predictions (v1, commit a479929)
| | prediction | result |
|---|---|---|
| H1 | base reader + register binds 0 on the Panchatantra | HELD: 284 sentences in 36,000 characters (pipe unsplit), cast 0, bound 0 |
| H2 | finder recall >= 0.90, precision >= 0.80 on held-out Vedic test | HELD: recall 0.970 (839/865), precision 0.947 (839/886) |
| H3a | >= 0.10 of gold pronouns fused | HELD: 0.157 (8/51) |
| H3b | >= 0.15 free-standing but not in the Vedic register | FAILED: 0.137 (7/51); five are bhavān |
| H4 | overt pronoun subject <= 0.35 of finite 3rd-person verbs | HELD: 0.121 (UFAL), 0.107 (Vedic test) |
| H5 | >= 100 bound in a 20,000-word sample | HELD, against my own addendum (which expected failure): 105 bound in 16,166 words |
| H5' | coverage between 0.02 and 0.25 | HELD: 0.20 |
| H6 | observed contradiction bound below null, pooled and on >= 2 of 3 texts | HELD on the Panchatantra (10.1% vs null 16.5%; null minus observed 95% interval [0.080, 0.212]); FAILED as stated: the second text was unreadable (item 5) |
| H7 | bound > 0 and >= 17.3% (English chosen dials) | half: > 0 held; >= 17.3% FAILED (10.1% on 89 counted bindings, 52 referents) |
| H8 | counting neuter as a third class raises the bound | HELD: 25.8% (null 31.4%) with neuter forms vs 10.1% without; the neuter variant still sits below its null |
| H9 | bound/found <= 0.50 | HELD: 0.20 |
| H10 | dropping bhavat moves the bound <= 2 points | HELD: 10.2% vs 10.1% |
| H11 | cast is not clean (> a quarter of the top 10 not characters) | the prediction came true: most of the top 10 are not characters (item 1) |

English for reference (round 10, not re-run): lower bound 17.3% vs null 23.9%; coverage about 50%; precision 0.69 on unseen GUM. Sanskrit's 10.1% is NOT a better score: fewer bindings are counted (single-gender forms only), and the beings are often not people, so contradictions have fewer chances to occur.

## v2: a post-evaluation fix, on fresh unread slices (Addendum B)
v1 sent pronouns to tataś, nāma, 'pi, 'haṃ because the closure left their spellings unseen (the treebank has tatas with -s; an elided a is written '). v2 closes final -s and the avagraha. Paired on 12 fresh Panchatantra slices (GRID_SHIFT 0.25), same dials, same register:
| | bound | coverage | lower bound (m/f) vs null | null minus observed 95% | bound to 'pi, 'py, tataś, 'haṃ |
|---|---|---|---|---|---|
| v1 | 132 | 0.20 | 11.9% vs 18.2% (109 counted) | [0.052, 0.184] | 45 |
| v2 | 102 | 0.154 | 12.2% vs 18.3% (82 counted) | [0.078, 0.175] | 0 |
B1 held (45 to 0), B2 held (both below null), B3 held (-23%), B4 held (character-like share by eye 27% to 37%). v2 is shipped. Its remaining top beings are bandhanād "from bondage", sukham, pramāṇam, mandaṃ: nominals, not characters.

## Replication note
Slices: 10 chunks of 12,000 characters at evenly spaced offsets (GRID_SHIFT 0.5), then 12 at 0.25; code frozen and listed in FREEZE-SAN.txt and FREEZE-SAN-B.txt before each run. Hitopadeśa was the development text (12,000 characters) and is not in any number. One discarded measurement (a gold-free fused-pronoun counter that matched sa+rva) is named in Addendum A.

## What I would do next
1. A being test that asks "is this word a character": from the treebank, the share of a form's occurrences that are subject or vocative of a verb (the Vedic parser prior exists: ud-parser-san-sanskrit-vedic.json.gz), instead of the nominal share. This addresses item 1, the largest error.
2. A Devanagari to IAST codec at the reader's door (so the IAST priors, the register and the frame prior serve both scripts), then re-run on the Wikisource Panchatantra.
3. Sentence units for verse and prose in GRETIL ("/" and "//"), and a segmentation for fused words from the UFAL MWT layer.
4. Find or make coreference gold for Sanskrit (the Panchatantra is the obvious text) before saying anything about precision.
5. Put frame-san.json in janus/priors; restore `lib/frame-build.mjs`.

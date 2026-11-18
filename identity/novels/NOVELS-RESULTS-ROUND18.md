# Round 18: pronoun basins from use, by period (34 English originals, years declared by us)

Preregistered (PREREG-ROUND18.md, 2026-11-18T02:50:32Z); the script was hashed and stamped (BASINS-BY-PERIOD.py.sha256 / .frozen, 02:51:01Z) before its single run. Raw numbers: basins-round18.json. Slices are four equal-count groups of the dated texts (derived): 1597-1811, 1813-1861, 1865-1894, 1895-1922 (8, 9, 9, 8 texts; 0.74 to 1.3 million words each). Dates are declared-by-us, not read from a manifest.

| slice | years | words | thou-forms per 10k | you-forms per 10k | thou-forms eligible (>= 20) |
|---|---|---|---|---|---|
| 1 | 1597-1811 | 752,987 | 11.18 | 40.41 | thee, thou, thy |
| 2 | 1813-1861 | 1,310,941 | 10.65 | 117.98 | thee, thine, thou, thy, thyself |
| 3 | 1865-1894 | 950,840 | 3.28 | 150.18 | thee, thou, thy |
| 4 | 1895-1922 | 739,278 | 2.03 | 98.88 | thee, thou, thy |

- B1 HOLDS in every slice: the nearest neighbour of each eligible thou-form (by the cosine of its +-2 word PPMI context vector, other pronouns not counted as context) is another thou-form, p = 0.002, 0.000, 0.002, 0.003 against a label permutation.
- B2 HOLDS: the thou rate falls from 11.18 to 10.65 to 3.28 to 2.03 per 10,000 words, and the you rate rises from 40 to 150 before dipping.
- B3 NOT EVALUABLE: in every slice every thou-form's nearest neighbour is a thou-form, so there is no non-thou neighbour to test. Not a pass.
- B4 FAILS: the basin does not disappear in the latest slice (1895-1922). The thou-forms there are rare (2.03 per 10,000) but still each other's nearest neighbours (p = 0.003). The expectation that it would loosen was wrong in this measure.
- The sanity controls FAILED: the he-group (he, him, his, himself) holds in no slice (0.25, 0.0, 0.0, 0.25; p 0.31, 1.0, 1.0, 0.29), the they-group and the first-person group likewise; the she-group holds in slice 1 only (p = 0.001). The measure sorts the modern pronouns by case and role (his with her and their, not with he), not by paradigm.
Reading, not preregistered: the thou-forms cluster across case (subject thou, object thee, possessive thy) where modern pronouns do not, so the cluster looks like a register: a basin of archaic, address-and-prayer use that survives at low frequency, and not a paradigm in the sense that he/him/his is one here. Because the controls failed, B1 is evidence that the thou-forms share contexts, not that the measure sees paradigms. Singular they was not measured: the dated slices carry no coreference gold.
Open: a basin measure that sees paradigms (frames, not word windows, via the complementary-distribution kernel); texts split by register (scripture, verse, dialogue) to test the register reading; the pharos entries that record each slice's `basis` (the text list's sha256 is in the JSON) are not written yet.

Note on the record: after the run, the script was edited in one line (a deprecated UTC time call replaced); the analysis is unchanged, and BASINS-BY-PERIOD.py.sha256 is the hash of the version that ran.

# Round 13 result: the chase did not beat the default on GUM test (frozen run, one pass)

Test: 30 documents, 219 answerable he/she pronouns, 15 documents with any. Frozen at 2026-11-17T21:23:33Z (FREEZE-ROUND13.md), run once.

| stage | right | wrong | precision | coverage |
|---|---|---|---|---|
| S0 default presence rung (control) | 130 | 15 | 0.897 | 66.2% |
| S1 personhood veto | 130 | 15 | 0.897 | 66.2% |
| S2 close | 118 | 26 | 0.819 | 65.8% |
| S3 late | 137 | 29 | 0.825 | 75.8% |
| S4 repair | 137 | 26 | 0.840 | 74.4% |
| S5 chase (candidate) | 136 | 25 | 0.845 | 73.5% |

S5 - S0: precision [-0.185, +0.067], coverage [-0.069, +0.214] (document bootstrap). Zero lies inside both. The candidate is NOT shown better than the default.

Failures, kept:
- The train-slice gain (0.769 vs 0.689) did not carry to test. Test control precision is 0.897, far above its 0.689 on train: the test slice is easier, and the rung is already good there.
- S1 personhood veto changed nothing on test (3 non-person exclusions). S2 close lost precision (-0.08).
- Late binding (S3) was good on its own: 19 right, 3 wrong (0.864) at +9.6 points coverage. The one stage with a visible gain, but untested as a lone preregistered claim.
- "Line predicts errors": near contested 0.200 wrong vs far 0.143. Weak, same direction, tiny n; on train it reversed.
- Refined (contested then settled by continuity): 23 right, 10 wrong (0.697), below the main chase.

Decision: do not wire the chase into the canonical read. The reading baseline is untouched. S3 late-binding is the only candidate worth a new preregistered round, on fresh data (train slices not yet used, or GUM documents from further genres).

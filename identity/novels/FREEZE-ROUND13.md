# FREEZE-ROUND13 stamped 2026-11-17T21:23:33Z, before the GUM test file (sha256 40854b00...) was read through any stage

| file | sha256 |
|---|---|
| native/adapters/text/pronoun-chase.js | 4ef3928635cb5fb97c1bbdfd13c0f293856712fde961672b4272765d51d7dbc8 |
| native/adapters/text/pronoun-close.js | 3aaeda6606348cff84ad7f49e8930a5efaa0f560c450cc60bf7f8bd178ac59ee |
| native/adapters/text/person-prior.js | 6b526b21f1f9419857080625398c879dbdd6e6a764b1726868b6fdc7257af852 |
| native/adapters/text/person-prior/eng.json | d8a954c3e3791d49388c762db4609c39a28a47d9e4ade360ab8751828fc33158 |
| gum-stages.mjs | b6c2b12a7a98df459f6531147f70729085dab84275ef5c91da1803a9c9da4d3e |

Development before the freeze (GUM dev, 30 documents, 199 answerable he/she pronouns; and the 125 train-slice documents, 1,070 answerable, where the personhood prior has seen the documents, so the chase got NO personhood there):
- Decisions made on development: the personhood evidence counts only STRONG arguments (|LLR| above 1.4826 x MAD of the prior's own LLRs) and a mention is a subject/object only if it covers the clause argument's head; the first version, which vetoed with weak evidence, lowered precision 0.78 to 0.53 and was replaced.
- Train slices, leak-free: S0 (default) 443 right / 200 wrong (0.689); S2n sentence-close 0.646; S3 + late 0.619 (late-bound 31 right / 47 wrong); S4 + repair 0.642; S5 chase 452 right / 136 wrong (0.769, coverage 55.0%). S1 (the veto) is inert on the reader's sparse parse.
- The dev finding that the contested set predicts errors (0.375 vs 0.149) did NOT replicate on the 125 documents (0.188 vs 0.238).
The candidate for the test is S5 (the chase); S0 is the control; S1-S4 are reported as preregistered. One run on GUM test.

# FREEZE-ROUND5 stamped 2026-11-17T18:37:00Z, before any final-test question was filtered, read or opened

| file | sha256 |
|---|---|
| attend.mjs | 9ba6bb5cd149c9e28603c011c1cfcefc3dd1c9d7fdb331dc92ef3d9409fa8b35 |
| featurize.mjs | dc9b12c154190488e5711ec46d221bfd46b1ae522d7a1fa8b514099be3c3dc2f |
| run-qa.mjs | ee7b39bf53ea1ba32127dd4870db4e38b95ac8a42941493713425dd6777de6fc |
| run-curve.mjs | d63f8640ac1ebcd92e4ab86c5af59b4a9016a159b1a88a2c8541968748d9d063 |
| run-identity.mjs | 4e2dc0f42d0d8b85055cbcd09d4f8333658ec3ae10cd5ac8b4fb90116f9c50d2 |
| run-final.mjs | a7d28033160e1ede290a5b3b6d0206a420a57d6a5834b86637e21e4b1a267426 |
| tracker.mjs | 3587ed2b9a2853a268e4d4d0fc364ac3874630ad04cc682b42e690e299e4e54d |
| answer.mjs | 02f80bb8a6dc9d442f52cb24c07e934c5dae6615326007370977d5897478c34b |
| answer5.mjs | b7e14b3b92df68c9f806151c6915ca7e6d51122f1105cd885fd5e4fcb6898719 |
| select-questions.py | 1f65eefe48cd97ef3d99c1e5cafca10fde1aff5c3803d8130feb77a7728987eb |
| read-questions.mjs | 3ae44d074c4efbc9d8377da43b39a38df4e1722acdf0e91848f76154b6ff0aa8 |

Dev result at freeze (LOBO over 25 books, 282 questions): ungated F1 0.085, gated 0.078, B1 0.059; gating kept only the frequency channel in 24/25 folds. Identity (LOSO, 10 subjects): ungated AUC 0.9943, gated 0.9902 keeping title_tok and author.

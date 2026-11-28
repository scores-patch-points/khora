# FREEZE (ocr-reread run 1)

Frozen 2026-11-28T14:48:29Z, before the held-out pages were OCRed or read. sha256:
- `native/the-fold/ocr-reread.mjs` 6cfc44739cf41f06703f7e22ad27e85ae7a452b83b8478a2eb67341e192903e4
- `eval/ocr-reread/measure.mjs` 4afab531d296cd8034e0eb96bed0a186fad28905f98fc26f9d21f6e62f7e7749
- `eval/ocr-reread/build-pairs.mjs` b056f5ba90f43a97b0cc88ed65061b6f16c056c5ae5fc595294dd15560465792
- `eval/ocr-reread/channel-tesseract-dev.json` 7695778b00b0cf690d2acbfec28a37828e6820508a3a3be59f01c12a53873701
- `eval/ocr-reread/fitted-dials.json` 0793c6e8b5e78e29f9b9603e4244bc029a2e7ddbcfdf4bab257b60241566b6e3
- `eval/ocr-reread/PREREG.md` 017fc023aff68a20011b333813c83b96f80fa7145aaa6c5980f95fe53e60529f

Development fit (IN SAMPLE, not a result): 33,664 aligned tokens on 86 page readings of 10 documents, 2,555 wrong before; fixed 519, broken 234, net 285. Dials floor -6, margin 2, docKnown 2, maxEdits 2 (beam 300). The floor sits at the edge of the grid (-22..-6), so a stricter floor was not tried.

Deviations before the run: (1) the first fit was stopped unfinished twice (too slow); the candidate search was then bounded (second step expands the 300 best first-step strings) and cached, and the text's own recurring forms are reached by a path search. This changed the organ after the stamp and before any held-out page was read. (2) The organ was rebuilt on kernel/undecided.js after the stamp; its decisions are the same rule.

# FREEZE-ROUND27 — frozen 2026-11-19T01:03:56Z, before the held-out (odd) split is scored
- native/adapters/text/place-grain.js 953b1b5a2fea64899bb8cb11226e3087b21001e753adfc6d80c1b3453b489b8b
- identity/place-grain/eval-place-grain.mjs 4d60f038b8cfaeaec48d1675cabf9c5268b7c70435469f8b001da7e5a5594fb7
- identity/place-grain/fetch-places.py ff5fd7c1c0662d8c3eca52aac1c42e2b91276e6b94189830f03231832cf91422
- identity/place-grain/data/wikidata-places.json eac21406bfacd1e2464fcc47afd23035c6065a3f4ccb213e2ce6f5d38b38acec
- native/adapters/text/english-parser.js 205a8f408e38c3d6bf77666a9cc4f6a9dc76b88f8cedc66235b6161df6de4d84
- parser-eng-ewt.json d4a089fc19d1b27ca06e0992598814d193dc8c12bcf8d6a0a59f2dea84441fbc
Note: the development split (even hash) was run before this freeze to debug the harness; it showed two question phrasings the parser misses and cities whose name equals their state's (Lima, Lima); the judge was not changed for either; the harness gained a reporting-only flag for string-ambiguous items.

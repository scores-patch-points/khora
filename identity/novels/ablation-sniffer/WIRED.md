# WIRED — what was put where, and how to undo it

Done 2026-11-24 on the owner's word ("Yes, wire them", then "y" after the operator-name correction).

## Placed in the priors home (`/Users/mlacy/Downloads/workspace/janus/priors`, where `prior-source.mjs` reads)
- `unit-cells-qwen3-embedding_4b-op.json` (9 operator centroids, 2,560 dimensions, 126 KB)
- `unit-cells-qwen3-embedding_4b-cell.json` (27 operator × grain cells, 374 KB)
Each is the staged file in `stage/` with its metadata extended by `wire-unit-priors.mjs`: status, `useAs: "proposer"`, the caveats, the evidence pointer, the licence note, and `classNames`, the study's operator names mapped to the current cube **derived** from the study's metadata and `native/kernel/cube.js` (ALT is DEF, DES is SIG, SUP is EVA; see `CORRECTIONS.md`). The staged originals are untouched. The script never overwrites: a file that already existed would have been left alone.

## Added (all untracked, uncommitted)
- `native/adapters/text/unit-sniffer.mjs` (the module; `loadUnitCanon(model, head)` reads the prior through the priors door), `unit-sniffer.test.mjs` (6 tests, passing; not on the `npm test` file list, which is the owner's to extend), `native/scripts/sniff-unit.mjs` (a command-line tool: text in, ranked cells out).
- The experiment folder `identity/novels/ablation-sniffer/` (preregistrations, freezes, results, the two embedding caches of about 45 MB each).

## What reads it
Nothing in the reader. No reader path, door, organ or test other than `unit-sniffer.test.mjs` calls the module or opens the prior. `availableStems()` only lists `pos-<stem>.json` files, so these files add no language to the reader.

## Use it
Run from the `khora-clone` folder, or give the path from wherever you are:
```
cd /Users/mlacy/Downloads/workspace/khora-clone
node native/scripts/sniff-unit.mjs --head=op "to give" "tappaa" "殺す"
node native/scripts/sniff-unit.mjs --head=cell --top=5 "to destroy"

# or from the workspace folder one level up:
node khora-clone/native/scripts/sniff-unit.mjs --head=op "to give"
```
Needs the local embedder (`ollama` with `qwen3-embedding:4b`). **A proposer, not a decider**: plain accuracy 0.275 is below always answering INS (0.434), the margin is a weak, class-dependent confidence (demo margins run 0.000 to 0.020), the claims by null bound are empty for 91% of words. Read the ranked list.

## Undo
```
rm /Users/mlacy/Downloads/workspace/janus/priors/unit-cells-qwen3-embedding_4b-op.json /Users/mlacy/Downloads/workspace/janus/priors/unit-cells-qwen3-embedding_4b-cell.json
```
Nothing else depends on them. Replacing the `janus` stand-in folder with a real janus checkout (its own STAND-IN.md says to) also removes them; re-run `node wire-unit-priors.mjs` from here to put them back.

## Open
The licence of the verb lists the canon was built from (VerbNet, WordNet, FrameNet and native-language lexicons through eo-lexical-analysis) was not audited; the files hold centroids, not words. The centroids sit close together (every cosine is near 0.8): subtracting the common direction before taking cosines is an untested idea that would need its own preregistered test.

## Amended 2026-11-24 (the owner's word: "Yes, add it")
After the attack on the wired sniffer (`RESULTS-FALSIFY-UNIT-SNIFFER.md`, SURVIVES), `amend-wired-caveats.mjs` added to both priors' metadata the junk-input caveat (character-scrambled non-words are pulled toward ALT, DEF in the current cube, 32% against about 18% for real words; the margin separates real words from non-words only weakly, area 0.585; the 27-cell head was not tested on non-words, and its caveat says so), an `attack` summary, and a `history` entry holding each file's previous sha256. Centroids, bounds and class names are untouched; the script is idempotent (a second run changes nothing). `caveats.mjs` holds the text, so `wire-unit-priors.mjs` re-wires with it.
- `unit-cells-qwen3-embedding_4b-op.json`: e94dfa38… to 0767c2f1…
- `unit-cells-qwen3-embedding_4b-cell.json`: 6692653b… to 3b730e45…
The command-line tool now prints the junk-input caveat after every run. Undo is unchanged (two `rm`; the amendment leaves no other trace).

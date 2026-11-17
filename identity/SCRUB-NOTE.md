# Scrub note (2026-11-17): absolute paths removed before this record reached khora main

Six scripts contained absolute paths of the machine they ran on, including the OS username. khora is a public repository, so they were
replaced with paths resolved from the script's own location (or an environment variable). The logic is unchanged; the files are no
longer byte-identical to the versions that ran, so their recorded hashes no longer match. This table is the chain.

| script | substitution | sha256 at first commit (2f4edbd) | sha256 after the scrub |
|---|---|---|---|
| `curious/curious2.mjs` | khora checkout `$KHORA_DIR` (default: two levels up from `HERE`); pharos library `$PHAROS_LIB` (default: a sibling `pharos/` checkout) | `fe63139607bc602c…` | `b20a7704f08d93e9…` |
| `curious/run-curious2.mjs` | khora checkout `$KHORA_DIR` (default: two levels up from `HERE`) | `cd4cffcbfd59c6c1…` | `cf456ca20837b2ae…` |
| `curious/ingest.mjs` | khora checkout `$KHORA_DIR` (default: two levels up from `HERE`); pharos library `$PHAROS_LIB` (default: a sibling `pharos/` checkout) | `cde72b3c11c6ff81…` | `88b296280563588b…` |
| `curious/check-log.mjs` | pharos library: `$PHAROS_LIB`, default a sibling `pharos/` checkout | `67767420c8ca1720…` | `5b8dc36dc4a4d47e…` |
| `curious/fetch-zen.py` | the Zenodotus tree file path: `$ZEN_TREE`, default `zen-tree.txt` (the command that makes it is in the script) | `2c93e4aefbb957c7…` | `1df43a7d236249d3…` |
| `omni/omni-run.sh` | khora checkout: `$KHORA_DIR`, default two directories up from the script | `ab5a992b787e690e…` | `dfe0b328c003ad86…` |

## Hashes the record cites, and what to do with them
- `curious/CURIOUS2-RESULTS.md` cites `curious2.mjs cab3196b…` (the version that ran) and `run-curious2.mjs cd4cffcb…` (unchanged by the scrub except
  the path line). `curious2.mjs` was already different from `cab3196b…` before the scrub: a one-line export (`factsFor`) was added for the post-hoc
  diagnostic, disclosed in that file. The chain is `cab3196b…` (ran) -> `fe631396…` (+ factsFor, first commit) -> the scrubbed hash above.
- `omni/OMNI-ERRATUM-1.md` lists the sha256 of `omni-run.sh` as it was when the erratum was filed; the scrubbed file differs only in its first assignment (`KH=`).
- The stamped preregistrations and `.sha256`/`.time` files are untouched.

## Check that the scrub changed no behaviour
`curious2.mjs` (scrubbed, in a temporary tree with the original layout and data) and the original, unscrubbed file were run on five (policy, seed) pairs
(random 1, roundrobin 2, novelty 3, curious 1, curious 4). A hash over each run's full trace (tick, source, surprisal, expected surprisal, ladder level,
s, context score, reading id) was identical for all five, as were the held-out scores and the shift levels. The other five scripts were syntax-checked
(node --check, py_compile, bash -n) but not re-run: their data is not in this commit.

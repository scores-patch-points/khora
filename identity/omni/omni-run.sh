#!/bin/bash
# One run per (language, mutant) of the unchanged RULES-PREREG script, against khora main @ 148037f (the worktree).
KH=${KHORA_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}   # the khora checkout root
mkdir -p runs
for f in ent/*.json; do
  L=$(basename $f .json)
  for M in none norules flip; do
    [ -s runs/$L-$M.json ] && continue
    node real-rules.mjs "$KH" "$PWD/$f" "$PWD/property-constraints.json" $M > runs/$L-$M.json 2>&1 &
    while [ $(jobs -r | wc -l) -ge 6 ]; do sleep 1; done
  done
done
wait

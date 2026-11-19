#!/bin/sh
# run-ud.sh — PREREG-ROUND26: both conditions, three sets, one run each, official scorer. Output: out/<set>-<mode>.{conllu,txt}
set -e; HERE=$(cd "$(dirname "$0")" && pwd); KH="$HERE/../../.."; D="$KH/identity/pronouns-multilingual/data"; G="$D/fra/corefud/CorefUD-1.3-public/data/CorefUD_English-GUM/en_gum-corefud-dev.conllu"; mkdir -p "$HERE/out"
for set in ewt-test ewt-dev gum-dev; do case $set in ewt-test) gold="$D/eng-ewt/en_ewt-ud-test.conllu";; ewt-dev) gold="$D/eng-ewt/en_ewt-ud-dev.conllu";; gum-dev) gold="$G";; esac
  for mode in diagram raw; do node "$HERE/predict-ud.mjs" "$gold" "$HERE/out/$set-$mode.conllu" $mode >/dev/null; python3 "$KH/identity/givers/ud-eval/conll18_ud_eval.py" -v "$gold" "$HERE/out/$set-$mode.conllu" > "$HERE/out/$set-$mode.txt" 2>&1 || echo "SCORER FAILED $set $mode" >> "$HERE/out/failures.txt"; done; done

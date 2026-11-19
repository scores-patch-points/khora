#!/bin/bash
# run-giver.sh — the fixed external measure: write the system file from the canonical read, then score it with the official CorefUD scorer (head match; singletons ignored, and with singletons). Usage: run-giver.sh <Dataset> <split> <lang> [N]
cd "$(dirname "$0")/../../.." || exit 1
export KHORA_PRIORS_DIR=${KHORA_PRIORS_DIR:-$HOME/Documents/janus/priors}
PY=${COREFUD_PY:-/tmp/corefud-venv/bin/python}; S=identity/givers/corefud-scorer/corefud-scorer.py
node identity/pronouns-multilingual/score/predict-corefud.mjs "$1" "$2" "$3" ${4:+$4} || exit 1
O=identity/pronouns-multilingual/score/out/$1-$2
echo "== $1 $2 $3: head match, singletons ignored"; $PY $S $O/key.conllu $O/sys.conllu -m muc bcub ceafe 2>&1 | grep -E "^(muc|bcub|ceafe|Recall|CoNLL)" 
echo "== $1 $2 $3: head match, singletons INCLUDED"; $PY $S $O/key.conllu $O/sys.conllu -s -m muc bcub ceafe 2>&1 | grep -E "^(muc|bcub|ceafe|Recall|CoNLL)"
# THE REFERENT RULE (language-competency.js): the score never travels without what the giver counts, by kind of mention
echo "== $1 $2: the mentions the giver counts (chains of 2+), by kind; the read makes referents only of names"; node identity/pronouns-multilingual/score/mention-mix.mjs $O/key.conllu

#!/bin/bash
# converge.sh -- repeat (top-up selection, fetch, rebuild) until no (language, split) cell is below the declared diversity target
# (train >= 4 / dev >= 3 / test >= 3 fetched repos with >= 8 files; >= 60 files) or MAX rounds pass.
cd "$(dirname "$0")"
MAX=${1:-4}
for i in $(seq 1 $MAX); do
  python3 topup.py > /private/tmp/claude-501/code-corpus/logs/topup.$i.log 2>&1
  if grep -q "deficit cells: 0" /private/tmp/claude-501/code-corpus/logs/topup.$i.log; then echo "converged (round $i: no deficit)"; break; fi
  tail -1 /private/tmp/claude-501/code-corpus/logs/topup.$i.log
  if [ -s /private/tmp/claude-501/code-corpus/pool/refetch.txt ]; then
    python3 fetch.py $(tr '\n' ' ' < /private/tmp/claude-501/code-corpus/pool/refetch.txt) 2>&1 | tail -2
  fi
  python3 build_manifest.py > /private/tmp/claude-501/code-corpus/logs/build.$i.log 2>&1
  grep "repos in manifest" /private/tmp/claude-501/code-corpus/logs/build.$i.log
done

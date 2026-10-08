#!/bin/sh
# run-weft.sh — supervise the REAL corpus read across N SHARDS. The reader is engineRelationsFor (the reading
# the app uses), PRIMED from native/priors, one WHOLE document at a time, in order. Each shard is resumable
# (append-only, keyed by address; every file yields one line). Watch: http://localhost:8890 (watch.mjs).
#
#   WEFT_SHARDS=4 sh run-weft.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE" || exit 1
N="${WEFT_SHARDS:-4}"
progress_of() { node -e 'try{const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(p.remaining)}catch{console.log("?")}' "$1"; }
shard() {
  i="$1"; OUT="$HERE/weft.$i.jsonl"; LOG="$HERE/build-$i.log"; : > "$LOG"
  while true; do
    echo "[shard $i] $(date '+%T') attempt (remaining $(progress_of "$OUT.progress.json"))" >> "$HERE/supervisor.log"
    node build-weft.mjs --shard "$i/$N" --out "$OUT" >>"$LOG" 2>&1
    rem="$(progress_of "$OUT.progress.json")"
    echo "[shard $i] $(date '+%T') exited, remaining $rem" >> "$HERE/supervisor.log"
    [ "$rem" = "0" ] && { echo "[shard $i] COMPLETE" >> "$HERE/supervisor.log"; break; }
    sleep 8
  done
}
rm -f "$HERE/supervisor.log"
echo "[supervisor] $(date '+%F %T') REAL reader, $N shards" > "$HERE/supervisor.log"
i=0; while [ "$i" -lt "$N" ]; do shard "$i" & i=$((i + 1)); done
wait
echo "[supervisor] $(date '+%F %T') ALL SHARDS COMPLETE" >> "$HERE/supervisor.log"

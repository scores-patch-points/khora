#!/usr/bin/env bash
# measure-model-calls.sh — the REAL counter.
#
# The mockup's "214 events" strap is hard-coded theater. The counter that
# actually works lives in OpenCode's own database. Each `assistant` message in
# `session_message` is one model invocation, and the `session_v2` row carries
# the token/cost totals. This script reads that, so "reduce model calls" has a
# number we can watch move.
#
# Usage:
#   ./measure-model-calls.sh            # current session (most recently updated)
#   ./measure-model-calls.sh SES_ID     # a specific session
#   ./measure-model-calls.sh --all N    # last N sessions, newest first
#
set -euo pipefail

DB="$HOME/.local/share/opencode/opencode-local.db"
DB_FOLD="$HOME/.local/share/opencode/opencode.db"
DB_DIR="$HOME/.local/share/opencode/opencode-fold.db"

# Prefer the actively-written local db; fall back to the others.
for candidate in "$DB" "$DB_FOLD" "$DB_DIR"; do
  if [[ -f "$candidate" && -r "$candidate" ]]; then
    DB="$candidate"; break
  fi
done

# A session is counted by its assistant messages (model calls) and its token totals.
session_row() {
  local id="$1"
  sqlite3 -header -column "$DB" "
    SELECT id,
           substr(coalesce(title,'(null)'),1,38) AS title,
           model_calls,
           user_msgs,
           tin, tout, treason,
           round(cost,4) AS cost_usd
    FROM (
      SELECT s.id,
             s.title,
             (SELECT COUNT(*) FROM session_message m WHERE m.session_id=s.id AND m.type='assistant') AS model_calls,
             (SELECT COUNT(*) FROM session_message m WHERE m.session_id=s.id AND m.type='user')      AS user_msgs,
             s.tokens_input      AS tin,
             s.tokens_output     AS tout,
             s.tokens_reasoning  AS treason,
             s.cost
      FROM session_v2 s
      WHERE s.id = '$id'
    );"
}

arg="${1:-}"

if [[ "$arg" == "--all" ]]; then
  n="${2:-10}"
  sqlite3 -header -column "$DB" "
    SELECT s.id,
           substr(coalesce(s.title,'(null)'),1,34) AS title,
           datetime(s.time_updated/1000,'unixepoch') AS updated,
           (SELECT COUNT(*) FROM session_message m WHERE m.session_id=s.id AND m.type='assistant') AS calls,
           s.tokens_input  AS tin,
           s.tokens_output AS tout,
           s.tokens_reasoning AS treason
    FROM session_v2 s
    ORDER BY s.time_updated DESC
    LIMIT $n;"
  exit 0
fi

if [[ -n "$arg" && "$arg" != "--all" ]]; then
  session_row "$arg"
  exit 0
fi

# Default: the current session is the most recently updated row.
current_id="$(sqlite3 "$DB" "SELECT id FROM session_v2 ORDER BY time_updated DESC LIMIT 1;")"
echo "current session: $current_id"
echo
session_row "$current_id"

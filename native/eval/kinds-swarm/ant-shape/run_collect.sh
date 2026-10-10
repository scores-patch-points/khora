#!/bin/bash
# one background job: checks, UD real, IRC real, UD shuffled, IRC shuffled (records only; no analysis)
cd "$(dirname "$0")"
node collect.mjs checks > data_checks.log 2>&1
node collect.mjs ud > collect_ud.log 2>&1
node collect.mjs irc > collect_irc.log 2>&1
node collect.mjs ud --shuffle > collect_ud_shuffle.log 2>&1
node collect.mjs irc --shuffle > collect_irc_shuffle.log 2>&1
echo done > collect.done

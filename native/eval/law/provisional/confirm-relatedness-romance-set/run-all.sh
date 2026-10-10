#!/bin/sh
# runs every registered cell except the three primary P-*-FIRST-BOTH cells already run; 4 at a time
cd "$(dirname "$0")"
export NAME_COMPANY_PAIRBLOCK=1
printf '%s\n' D-A-FIRST-BOTH D-B-FIRST-BOTH D-C-FIRST-BOTH P-A-LATER-BOTH P-B-LATER-BOTH P-C-LATER-BOTH P-A-FIRST-LEFT P-B-FIRST-LEFT P-C-FIRST-LEFT XP-A-FIRST-BOTH XP-B-FIRST-BOTH XP-C-FIRST-BOTH XD-A-FIRST-BOTH XD-B-FIRST-BOTH XD-C-FIRST-BOTH E1-A E1-B E1-C | xargs -P 4 -I{} sh -c 'node confirm.mjs {} > logs/{}.out 2> logs/{}.err'
echo done > logs/run-all.done

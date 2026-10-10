#!/bin/bash
# usage: run_l1_part.sh <logname> <stems>
cd "$(dirname "$0")"
node analyse.mjs l1 --stems "$2" > "results/$1.out" 2> "results/$1.log"
echo done > "results/$1.done"

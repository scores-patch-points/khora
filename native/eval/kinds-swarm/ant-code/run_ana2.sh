#!/bin/bash
cd "$(dirname "$0")"
printf "%s\n" "js raw PA" "py raw PA" "js shuf PA" "py shuf PA" "ud np PE" "ud shuf PE" "js la16 FIRST" "py la16 FIRST" "js shuf PE" "py shuf PE" "js shuf PO" "py shuf PO" "js raw PE" "py raw PE" | xargs -P 3 -L 1 sh -c 'node analyse.mjs $0 $1 $2 >> logs/ana_other.log 2>&1'
echo DONE2 >> logs/ana_other.log

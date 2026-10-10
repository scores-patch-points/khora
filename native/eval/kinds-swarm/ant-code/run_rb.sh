#!/bin/bash
cd "$(dirname "$0")"
for V in np shuf la16; do PAR=3 ./run_all.sh rb $V > logs/collect_rb_$V.log 2>&1; done
for D in PA PE PO FIRST; do node analyse.mjs rb np $D >> logs/ana_rb.log 2>&1; done
node analyse.mjs rb shuf PA >> logs/ana_rb.log 2>&1; node analyse.mjs rb la16 FIRST >> logs/ana_rb.log 2>&1
echo RBDONE >> logs/ana_rb.log

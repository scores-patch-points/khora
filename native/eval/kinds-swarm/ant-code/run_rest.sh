#!/bin/bash
cd "$(dirname "$0")"
for V in shuf raw la16 sham; do
  for L in js py; do PAR=3 ./run_all.sh $L $V > logs/collect_${L}_${V}.log 2>&1; done
  [ "$V" = shuf ] && PAR=1 ./run_all.sh ud shuf > logs/collect_ud_shuf.log 2>&1
done
echo ALLDONE > logs/run_rest.done

#!/bin/sh
cd "$(dirname "$0")"
for s in atlas slot frame markov iid; do node attackD.mjs $s > logs/D_$s.out 2> logs/D_$s.err; done
echo done > logs/D_done

#!/bin/sh
cd "$(dirname "$0")"
for s in frame slotlam; do node attackD.mjs $s > logs/D_$s.out 2> logs/D_$s.err; done
echo done > logs/D2_done

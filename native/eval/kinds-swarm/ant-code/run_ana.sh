#!/bin/bash
cd "$(dirname "$0")"
for L in js py; do for D in PA PE PO FIRST; do node analyse.mjs $L np $D >> logs/ana_np.log 2>&1; done; done
echo NPDONE >> logs/ana_np.log

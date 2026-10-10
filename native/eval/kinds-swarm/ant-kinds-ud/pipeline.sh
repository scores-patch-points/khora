#!/bin/zsh
# pipeline.sh STEM... — extension languages: induce -> rec & joint (parallel) -> report. Same parameters as the first batch (PREREG + amendment D3/D4).
cd /Users/mlacy/Documents/3.0/khora/native/eval/kinds-swarm/ant-kinds-ud
for s in "$@"; do
  node induce.mjs run --stems $s > logs/x_induce_$s.out 2> logs/x_induce_$s.err
  node sig.mjs rec --stems $s --Q 40 --PN 120 > logs/x_rec_$s.out 2> logs/x_rec_$s.err &
  node sig.mjs joint --stems $s > logs/x_joint_$s.out 2> logs/x_joint_$s.err &
  wait
  node report.mjs lang --stems $s --perm 500 --p3b 50 --sim 100 > logs/x_rep_$s.out 2> logs/x_rep_$s.err
done

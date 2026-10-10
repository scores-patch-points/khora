#!/bin/bash
# the rest of the pre-registered pipeline, waiting on the collectors (order: L1 remainder, L2b, L2 2-family, L3, L2 3-cluster, L2z, L4, summary)
cd "$(dirname "$0")"
until [ -s collect_irc.log ]; do sleep 20; done      # IRC collection starts only after all UD real stems are written
node analyse.mjs l1 --stems pol,ukr,hin,vie,ind,swe,urd,tur,ell,fin > results/l1rest.out 2> results/l1rest.log
until [ -f results/l1a.done ] && [ -f results/l1b.done ] && [ -f results/l1c.done ]; do sleep 20; done
node analyse.mjs l1 > results/l1final.out 2> results/l1final.log     # fills anything the parts skipped (cached units are not recomputed)
node analyse.mjs l2b > results/l2b.out 2> results/l2b.log
node analyse.mjs l2 --scheme 2 > results/l2s2.out 2> results/l2s2.log
until [ -f data/irc.json ]; do sleep 20; done
node analyse.mjs l3 > results/l3.out 2> results/l3.log
node analyse.mjs l2 --scheme 3 > results/l2s3.out 2> results/l2s3.log
until [ -f collect.done ]; do sleep 30; done
node analyse.mjs l4 > results/l4.out 2> results/l4.log
node analyse.mjs l2 --scheme 2 --z > results/l2s2z.out 2> results/l2s2z.log
node summary.mjs > results/summary.out 2> results/summary.err
echo done > analyse.done

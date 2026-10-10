#!/bin/bash
# pipeline v2 (collection is parallel and the machine is overloaded): per-stem L1 as soon as a stem's records exist, then L2b, L2, L3, L4, summary
cd "$(dirname "$0")"
for s in pol ukr hin vie ind swe urd tur ell fin; do
  until [ -s data/ud/$s.json ] && [ "$(tail -c 1 data/ud/$s.json)" = "}" ]; do sleep 15; done
  node analyse.mjs l1 --stems $s >> results/l1rest.out 2>> results/l1rest.log
done
until [ -f results/l1a.done ] && [ -f results/l1b.done ] && [ -f results/l1c.done ]; do sleep 15; done
node analyse.mjs l2b > results/l2b.out 2> results/l2b.log
node analyse.mjs l2 --scheme 2 > results/l2s2.out 2> results/l2s2.log
until [ -s data/irc.part01.json ] && [ -s data/irc.part23.json ] && [ -s data/irc.part45.json ]; do sleep 15; done
node collect.mjs mergeirc >> collect_irc.log 2>&1
node analyse.mjs l3 > results/l3.out 2> results/l3.log
node analyse.mjs l2 --scheme 3 > results/l2s3.out 2> results/l2s3.log
echo done > analyse1.done

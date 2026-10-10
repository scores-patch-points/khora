#!/bin/bash
cd /Users/mlacy/Documents/3.0/khora/native/eval/kinds-swarm/ant-production
{
node ana.mjs wp; ARMS=real,deranged,null node ana.mjs irc; node ana.mjs fas; node ana.mjs fasA
node ana.mjs wpA S; node ana.mjs wpA U; ARMS=real,deranged,null node ana.mjs ircA S; ARMS=real,deranged,null node ana.mjs ircA U
node ana2.mjs wp; ARMS=real,deranged,null node ana2.mjs irc; node ana2.mjs wpA S; node ana2.mjs wpA U; ARMS=real,deranged,null node ana2.mjs ircA S; ARMS=real,deranged,null node ana2.mjs ircA U
} > results/analysis-all.txt 2>&1
echo FINISHED >> results/analysis-all.txt

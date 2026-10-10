#!/bin/sh
cd "$(dirname "$0")"
node attackC2.mjs "$(cat present31.txt)" > logs/C2.out 2> logs/C2.err
node attackC2.mjs "$(cat absent_ctl.txt)" ctl > logs/C2_ctl.out 2> logs/C2_ctl.err
echo done > logs/C2_done

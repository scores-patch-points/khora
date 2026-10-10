#!/bin/sh
cd "$(dirname "$0")"
node attackA2.mjs "$(cat present31.txt)" > logs/A2.out 2> logs/A2.err
node attackA2.mjs "$(cat absent_ctl.txt)" ctl > logs/A2_ctl.out 2> logs/A2_ctl.err
echo done > logs/A2_done

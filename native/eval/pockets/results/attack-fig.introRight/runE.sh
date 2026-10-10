#!/bin/sh
cd "$(dirname "$0")"
node attackE.mjs "$(cat present31.txt)" > logs/E.out 2> logs/E.err
node attackE.mjs "$(cat absent_ctl.txt)" ctl > logs/E_ctl.out 2> logs/E_ctl.err
echo done > logs/E_done

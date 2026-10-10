#!/bin/sh
cd "$(dirname "$0")"
P31=$(cat present31.txt); ABS=$(cat absent_ctl.txt)
node attackA.mjs tok "$P31" > logs/A_tok.out 2> logs/A_tok.err
node attackA.mjs tok "$ABS" ctl > logs/A_tok_ctl.out 2> logs/A_tok_ctl.err
node attackA.mjs size "$P31" > logs/A_size.out 2> logs/A_size.err
node attackA.mjs size "$ABS" ctl > logs/A_size_ctl.out 2> logs/A_size_ctl.err
node attackA.mjs match "$P31" > logs/A_match.out 2> logs/A_match.err
node attackA.mjs match "$ABS" ctl > logs/A_match_ctl.out 2> logs/A_match_ctl.err
echo done > logs/A_done

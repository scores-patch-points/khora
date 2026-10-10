#!/bin/bash
# run_all.sh LANG VARIANT: collect every file of a language for one variant, 4 at a time
cd "$(dirname "$0")"; L=$1; V=$2; case $L in js|py) N=12;; rb) N=8;; *) N=1;; esac
seq 0 $((N-1)) | xargs -P ${PAR:-4} -I{} node collect.mjs $L {} $V

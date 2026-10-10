#!/usr/bin/env bash
# AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
source ./lib.sh
. ./other.sh

LIMIT=10

area() {
  local r="$1"
  echo "area=$((r * r))"
}

function describe {
  area "$1" | tr a-z A-Z
}

describe 3
if [ "$LIMIT" -gt 5 ]; then echo "big"; fi

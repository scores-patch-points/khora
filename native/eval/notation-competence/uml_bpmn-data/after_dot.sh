#!/bin/bash
cd /private/tmp/claude-501/notation/uml_bpmn
until [ -f raw/dot-search.json ]; do sleep 3; done
echo "search done $(date)"
/private/tmp/claude-501/venv/bin/python scripts/dot_fetch.py > logs/dot_fetch.log 2>&1
echo "fetch done $(date)"; tail -2 logs/dot_fetch.log
/private/tmp/claude-501/venv/bin/python /Users/mlacy/Documents/3.0/khora/native/eval/notation-competence/uml_bpmn-data.py build > logs/build_last.log 2>&1
echo "build done $(date)"; grep -E "dot" logs/build_last.log | head -20

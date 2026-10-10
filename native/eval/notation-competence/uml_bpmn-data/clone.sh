#!/bin/bash
# Partial, tree-only shallow clones (no blobs): we then ask git for exactly the blobs we select.
set -u
cd /private/tmp/claude-501/notation/uml_bpmn/raw/git
while read -r name url; do
  [ -d "$name/.git" ] && { echo "have $name"; continue; }
  echo "clone $name $url"
  git clone --quiet --depth 1 --filter=blob:none --no-checkout "$url" "$name" 2>&1 | tail -2
  (cd "$name" && echo "$name $(git rev-parse HEAD) $(git log -1 --format=%cI)" >> ../HEADS.txt)
done <<'LIST'
flowable-engine https://github.com/flowable/flowable-engine.git
Activiti https://github.com/Activiti/Activiti.git
camunda-bpm-platform https://github.com/camunda/camunda-bpm-platform.git
camunda-modeler https://github.com/camunda/camunda-modeler.git
bpmn-moddle https://github.com/bpmn-io/bpmn-moddle.git
kogito-runtimes https://github.com/apache/incubator-kie-kogito-runtimes.git
kogito-examples https://github.com/apache/incubator-kie-kogito-examples.git
bpmn-miwg-test-suite https://github.com/bpmn-miwg/bpmn-miwg-test-suite.git
libsbgn https://github.com/sbgn/libsbgn.git
pydot https://github.com/pydot/pydot.git
mermaid https://github.com/mermaid-js/mermaid.git
LIST
echo DONE

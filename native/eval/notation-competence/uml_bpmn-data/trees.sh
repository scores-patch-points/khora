#!/bin/bash
cd /private/tmp/claude-501/notation/uml_bpmn/raw
while read -r name repo sha; do
  [ -s trees/$name.json ] && continue
  gh api "repos/$repo/git/trees/$sha?recursive=1" > trees/$name.json 2>/dev/null || echo "FAIL $name"
done <<'LIST'
flowable-engine flowable/flowable-engine d1496022c9c3624b714ac5df22bd618525d4620d
Activiti Activiti/Activiti f8b6c5c368cd6c6c874c2dcbe565ae4d7e13cfed
camunda-bpm-platform camunda/camunda-bpm-platform ee4826e5e76c2348a1510ef46a2f4ccd3b080e48
camunda-modeler camunda/camunda-modeler 76e31d4c860ef3d67eccce584bc3b628392f0907
bpmn-moddle bpmn-io/bpmn-moddle f35959afc443444b706a4f39542530134233db07
kogito-runtimes apache/incubator-kie-kogito-runtimes ae95683415df13664861f7077a55914c8b42a62b
kogito-examples apache/incubator-kie-kogito-examples 740ddbe35d79f05a684abb10b58475f77e2d932c
bpmn-miwg-test-suite bpmn-miwg/bpmn-miwg-test-suite 8416c1118ff98e9161e9e342220460be545ebf7c
libsbgn sbgn/libsbgn 2aae05bb5c28b6d61757f8f3123bea505d57a20b
pydot pydot/pydot b77416fba16016ecc1eceaa999dce636a3def4bb
mermaid mermaid-js/mermaid 97b345154f2cd71f23a2aadb14af6dad46f63173
LIST

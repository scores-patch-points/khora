#!/usr/bin/env python3
"""writes PROVENANCE.md from the manifest, HEADS.txt and the DOT corpus record"""
import json, collections, os
B = "/private/tmp/claude-501/notation/uml_bpmn"
m = json.load(open(f"{B}/corpus/manifest.json"))
heads = {l.split()[0]: l.split()[1:] for l in open(f"{B}/raw/git/HEADS.txt") if l.strip()}
dot = json.load(open(f"{B}/raw/dot-corpus.json")) if os.path.exists(f"{B}/raw/dot-corpus.json") else None
cnt = collections.Counter((d["split"], d["source"]) for d in m["docs"] if d["kind"] == "pos" and d["dialect"] == "bpmn_xml")
neg = collections.Counter((d["split"], d["neg_kind"].split(":")[0]) for d in m["docs"] if d["kind"] == "neg")
LIC = {
 "flowable-engine": ("https://github.com/flowable/flowable-engine", "Apache-2.0 (root LICENSE, text read)"),
 "Activiti": ("https://github.com/Activiti/Activiti", "Apache-2.0 (root LICENSE.txt, text read)"),
 "camunda-bpm-platform": ("https://github.com/camunda/camunda-bpm-platform", "Apache-2.0 (root LICENSE, text read; the repository is archived)"),
 "camunda-modeler": ("https://github.com/camunda/camunda-modeler", "MIT (root LICENSE, text read)"),
 "bpmn-moddle": ("https://github.com/bpmn-io/bpmn-moddle", "MIT (GitHub-reported; also the giver of the metamodel table and the XSDs)"),
 "kogito-runtimes": ("https://github.com/apache/incubator-kie-kogito-runtimes", "Apache-2.0 (root LICENSE, text read)"),
 "kogito-examples": ("https://github.com/apache/incubator-kie-kogito-examples", "Apache-2.0: the repository has NO root LICENSE file; the licence is read from pom.xml <licenses> (Apache Software License, Version 2.0) and the ASF licence header sheet licensesheader.txt"),
 "bpmn-miwg-test-suite": ("https://github.com/bpmn-miwg/bpmn-miwg-test-suite", "CC BY 3.0 (root LICENSE.txt, text read). Attribution: the BPMN Model Interchange Working Group (BPMN MIWG) and the vendors whose tool exports are included (one directory per tool)"),
}
out = []
w = out.append
w("# PROVENANCE — uml_bpmn family (BPMN 2.0 XML, Graphviz DOT), khora notation ladder\n")
w("Fetch date: 2026-10-06 (UTC). Only public, read-only data was fetched. The `gh` CLI that was already logged in on this machine was used for the GitHub APIs (code search needs an authenticated caller; repository metadata, licence files and blobs are public); the git clones needed no credentials. "
  "Nothing bypasses access control, nothing is paywalled, nothing fetched was executed (data files only; pydot and lxml are pip packages installed in the venv). "
  "Public GitHub repositories were read through `git clone --depth 1 --filter=blob:none --no-checkout` + exact-path `git sparse-checkout` (blobs only for the selected paths; scripts `scripts/clone.sh`, `scripts/trees.sh`, `scripts/select_fetch.py`, copies in `eval/notation-competence/uml_bpmn-data/`) "
  "and, for DOT, the GitHub code-search and blobs APIs through the `gh` CLI, rate-limited (<= 8 requests/minute for search; `scripts/dot_search.py`, `scripts/dot_fetch.py`). Repository-level SPDX was taken from GitHub only when it is one of MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, CC0-1.0, Unlicense, CC-BY-4.0, CC-BY-SA-4.0, 0BSD, "
  "and forks were dropped; NOASSERTION/NONE repositories were dropped (a licence is never guessed). Size on disk: corpus text (`corpus/`) about 51 MB (cap 60 MB per family), derived gold 22 MB, raw staging copies of the selected files (`raw/`, git metadata removed after recording the commits in `raw/git/HEADS.txt`, tree listings removed: regenerate with `scripts/trees.sh`) about 70 MB.\n")
w("## BPMN corpora (positives)\n")
w("| source (lineage) | URL | commit | licence | split | BPMN docs kept |\n|---|---|---|---|---|---|")
LINE = {"flowable-engine": ("activiti", "train"), "Activiti": ("activiti", "train"), "camunda-bpm-platform": ("camunda", "dev"), "camunda-modeler": ("camunda", "dev"), "bpmn-moddle": ("camunda", "dev"), "kogito-runtimes": ("jbpm", "test"), "kogito-examples": ("jbpm", "test"), "bpmn-miwg-test-suite": ("miwg tools", "dev (process groups A.*) / test (B.*, C.*)")}
for k, (url, lic) in LIC.items():
    h = heads.get(k, ["?", "?"])
    n = " + ".join(f"{sp}:{cnt[(sp, k)]}" for sp in ("train", "dev", "test") if cnt[(sp, k)])
    w(f"| {k} ({LINE[k][0]}) | {url} | {h[0][:12]} | {lic} | {LINE[k][1]} | {n} |")
w("\nSelection per repository (deterministic, sorted by sha1(path), per-class caps in `select_fetch.py` and `CAPS` in `uml_bpmn-data.py`): `*.bpmn`, `*.bpmn20.xml`, `*.bpmn2`; "
  "sibling OMG XML `*.dmn`, `*.cmmn` and other XML (`*.xml`, `*.xsd`, samples) as STRANGERS. MIWG: the `Reference/` models and each tool's `*-export.bpmn` (the `-roundtrip` files are not used). "
  "Structural de-duplication (element-name sequence without ids/labels/diagram data) removes a document from the LATER split when it occurs earlier (train > dev > test) and from the same split except for MIWG (same reference processes exported by many tools: kept on purpose, A1). "
  "Counts of every drop and de-duplication are in `corpus/manifest.json` `stats`.\n")
w("## Strangers (R0 negatives, never in any prior except TRAIN background estimation)\n")
w("| group | train | dev | test | source / licence |\n|---|---|---|---|---|")
SRC = {"xml_other": "non-BPMN XML/XSD from the same repositories (licences above)", "xml_dmn": "OMG DMN files from the same repositories (licences above)", "xml_cmmn": "OMG CMMN files from the same repositories", "mermaid": "mermaid-js/mermaid e2e/diagrams *.mmd, MIT (commit " + heads.get("mermaid", ["?"])[0][:12] + "); split by diagram directory, never in a prior",
       "sbgn_ml": "sbgn/libsbgn *.sbgn (test-files, example-files; the validation error files are not used), dual LGPL-2.1+ / Apache-2.0, the Apache-2.0 option taken (commit " + heads.get("libsbgn", ["?"])[0][:12] + "); never in a prior",
       "prose": "UD treebank text (eng spa deu fra rus; ita REMOVED, see below): train from /private/tmp/claude-501/tb/<stem>/train.conllu, dev/test from /private/tmp/claude-501/ud-eval/<stem>/{dev,test}.conllu; exact SPDX per treebank in the table below",
       "code": "programming-language files from /private/tmp/claude-501/code-corpus (permissively licensed repositories, split BY REPOSITORY by another workflow; 13 languages x 6 files per split)",
       "markup": "html/vue/svelte/latex/markdown files, same code corpus", "data": "json/yaml/toml/css files, same code corpus"}
for g in ["xml_other", "xml_dmn", "xml_cmmn", "mermaid", "sbgn_ml", "prose", "code", "markup", "data"]:
    w(f"| {g} | {neg[('train', g)]} | {neg[('dev', g)]} | {neg[('test', g)]} | {SRC[g]} |")
w("")
w("### Prose treebanks: exact licence per treebank (read from each treebank's LICENSE.txt and README `License:` line, 2026-10-06)\n")
w("| stem | treebank | SPDX | status |\n|---|---|---|---|")
for stem, x in (m.get("licence_audit", {}).get("prose_treebanks", {})).items():
    w(f"| {stem} | {x['treebank']} | {x['spdx']} | used (strangers only; text is never redistributed in a prior) |")
for stem, x in (m.get("licence_audit", {}).get("prose_excluded", {})).items():
    w(f"| {stem} | {x['treebank']} | NOT PERMISSIVE | EXCLUDED 2026-10-06 (dated amendment A6 of uml_bpmn.mjs): {x['why']}. The 88 windows (40 train, 24 dev, 24 test) were moved to `excluded-licence/ud-{stem}/` outside `corpus/`; Italian prose is a typed gap (`prose_language_excluded_licence:{stem}`), unmeasured. The TRAIN background of the identity prior was rebuilt without it. |")
w("\nNote on the German, French and Russian GSD treebanks: their READMEs record that Google dropped the NC restriction for the UD annotations and that Google claims no ownership of the underlying text; the treebanks' stated licence is CC BY-SA 4.0, which is on the permitted list, and the text is used here only as stranger text for measurement.\n")
la = m.get("licence_audit")
if la:
    w("### Licence audit of the whole manifest (rule 11 as a standing check)\n")
    w("The data build stops if any document's SPDX is outside the allowed list, and the instrument re-audits the manifest at every `measure()` (a violation voids every verdict). SPDX counts over all " + str(len(m["docs"])) + " documents: " + ", ".join(f"{k} {v}" for k, v in la["spdx_counts"].items()) + f". Documents outside the allowed list: {sum(la['documents_with_spdx_not_allowed'].values()) if la['documents_with_spdx_not_allowed'] else 0}. "
      "The code, markup and data strangers carry their REPOSITORY's SPDX from the code-corpus manifest (the first record said only `permissive per ...`). 64 text files that an earlier build left in `corpus/` without a manifest entry were moved to `orphans-not-in-manifest/` (they are not used anywhere).\n")
w("## DOT corpus (positives)\n")
if dot:
    kept = collections.Counter((d["split"]) for d in m["docs"] if d["dialect"] == "dot")
    repos = collections.defaultdict(set)
    for d in m["docs"]:
        if d["dialect"] == "dot": repos[d["split"]].add(d["source"])
    w(f"DOT files were found with GitHub code search (`digraph|graph extension:dot|gv`, size bands 100..12000 bytes, up to 300 hits per query), kept only from repositories whose GitHub-reported SPDX is permissive (see above) and that are not forks, "
      f"fetched by exact blob sha (each blob's git sha1 verified), at most {dot['per_repo']} files per repository, 100 B..60 KB, and parsed by pydot (files pydot cannot parse are dropped and counted). "
      f"pydot's own test graphs (`pydot/pydot` test/graphs, test/my_tests, test/from-past-to-future; MIT per the repository's REUSE.toml annotation `test/graphs/**` etc.) are one TRAIN source. Split rule: `{dot['split_rule']}`.\n")
    lic = collections.Counter(d["license"] for d in m["docs"] if d["dialect"] == "dot")
    w(f"Documents kept after pydot parsing and de-duplication: train {kept['train']} ({len(repos['train'])} repositories), dev {kept['dev']} ({len(repos['dev'])}), test {kept['test']} ({len(repos['test'])}). Per-file URL, blob sha and licence are in `raw/dot-corpus.json` and `corpus/manifest.json`. Licences of the kept DOT documents: " + ", ".join(f"{k} {v}" for k, v in lic.most_common()) + ". CC-BY and CC-BY-SA documents are used only as held-out or training TEXT for measurement, never redistributed in a prior; attribution = the per-file `url` in the manifest (author = the repository's owner).\n")
else:
    w("The DOT corpus was NOT available when this file was written.\n")
w("## Standards read as GIVERS (consulted, not redistributed)\n")
w("* OMG BPMN 2.0.2 (formal/2013-12-09) as generated into bpmn-io/bpmn-moddle `resources/bpmn/json/{bpmn,bpmndi,dc,di}.json` (MIT, commit f35959afc443) = the PRIOR table; the OMG CMOF in `resources/bpmn/cmof` is the generator input (consulted). "
  "The OMG XSDs `Semantic.xsd`, `BPMNDI.xsd`, `DI.xsd`, `DC.xsd` carried in the same repository (`resources/bpmn/xsd`) = the GOLD authority for what a name means (OMG copyright notice kept in the files; only classifications are derived, no text is redistributed).\n"
  "* The DOT language grammar, https://graphviz.org/doc/info/lang.html (facts only: keywords, operators, ID forms, comment forms, compass points).\n"
  "* Not fetched, with reasons: SBGN PD L1 V2.0 (the libsbgn files are used only as strangers: one open source, no independent train/test pair); UML/XMI and PlantUML (no independent parser without executing a downloaded JVM jar; no permissively licensed XMI corpus found); Mermaid as a notation to READ (no independent parser in the toolchain). "
  "BPMN 2.0.2 from omg.org was not fetched (the permissively licensed redistribution above was used instead). Paywalled standards were not touched.\n")
w("## Gold authorities\n")
w("* lxml 6.1.3 (libxml2) and Python 3.14's pyexpat (expat) parse every BPMN document; the i-th expat start tag must be the i-th lxml element or the document is dropped. Neither is vendored, imported by the adapter, or part of a score.\n"
  "* pydot 4.0.1 (MIT) parses every DOT document (installed in `/private/tmp/claude-501/venv`); pydot's own writer (`to_string`) produces the DOT re-serialisations (verified invariant by re-parsing).\n"
  "* lxml/libxml2 also produces the BPMN re-serialisations (pretty, c14n, default-namespace or prefixed-namespace, ASCII character references with single-quoted attributes); a rendering is kept only when the gold side re-derives identical beings and relations from it.\n"
  "* The BPMN->DOT cross-notation text is AUTHORED by `uml_bpmn-data.py` from the BPMN gold (flow nodes and sequence/message flows) and labelled derived.\n")
w("## Derived data (all produced by `eval/notation-competence/uml_bpmn-data.py`, never by the adapter)\n")
w("`corpus/<split>/<id>.txt` (UTF-8, BOM stripped), `corpus/manifest.json` (per-document source, licence, sha256, split, dialect, group/tool; split by source; disjointness_check), `gold/<split>/gold.jsonl.gz` "
  "(units, attributes, element classes, roles, beings, relations; DOT beings/relations/strings), `gold/<split>/{reps,dotx,dotreps}.jsonl.gz` (derived renderings), `gold/xsd-classes.json` (the XSD-derived class table used only for the prior-vs-XSD cross-check).\n")
open(f"{B}/PROVENANCE.md", "w").write("\n".join(out))
print("wrote PROVENANCE.md", len("\n".join(out)))

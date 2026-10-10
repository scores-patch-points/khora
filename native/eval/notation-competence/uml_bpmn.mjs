// eval/notation-competence/uml_bpmn.mjs — competence ladder R0..R5 for STRUCTURED DIAGRAM TEXT: BPMN 2.0 XML and Graphviz DOT.
//
//   node eval/notation-competence/uml_bpmn.mjs [--split dev|test] [--limit N]    (prints the card; also written to
//                                                                                /private/tmp/claude-501/notation/uml_bpmn/results/)
//   import { FAMILY, measure } from "./uml_bpmn.mjs"      measure({split="dev", limit=null}) -> { family, rungs: { r0..r5 } }
//
// SYSTEM UNDER TEST: adapters/notation/uml_bpmn.js (ear: tokens with class; read: beings + relations; an identifier for R0), reading with RECEIVED
// priors only: priors/notation-uml_bpmn-{bpmn-lexicon,dot-grammar,identity}.json. The kernel is not touched. The adapter is never the gold.
// GOLD AUTHORITIES (all external to the adapter, built by uml_bpmn-data.py, which never runs the adapter):
//   BPMN 2.0 XML   lxml/libxml2 (tree, namespaces, ids, attribute values) + Python's expat (the same document tokenised by a second parser: markup-unit
//                  offsets and ordered raw attributes; the i-th expat start tag must be the i-th lxml element or the document is dropped as a typed gap)
//                  + the OMG Semantic.xsd/BPMNDI.xsd (as redistributed in bpmn-io/bpmn-moddle, MIT) for what a name MEANS. The adapter's PRIOR comes from a
//                  DIFFERENT artifact of the same standard (moddle's generated JSON); the two tables are cross-checked below and may disagree.
//   Graphviz DOT   pydot 4.0.1 (MIT, a pyparsing grammar of the DOT language), see the DOT block of the data script.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5: written before the first run of this file; no threshold below is tuned after a result; a failure ═══
// ═══ is reported as a failure; amendments are appended as dated blocks and the registration digest moves)                                      ═══
//
// DISCLOSURE (what was seen before this header was written). Data-level facts only, and the adapter's first smoke run on DEV (A0 below):
//   * corpus: BPMN test models of three product LINEAGES (a fork shares its parent's lineage): train = activiti (flowable-engine + Activiti, Apache-2.0),
//     dev = camunda (camunda-bpm-platform Apache-2.0, camunda-modeler MIT, bpmn-moddle MIT) + the BPMN MIWG interoperability suite (CC BY 3.0) process groups
//     A.*, test = jbpm/Kogito (incubator-kie-kogito-runtimes + examples, Apache-2.0) + MIWG process groups B.* and C.*. After structural de-duplication
//     (element-name sequence without ids, labels or diagram data; removed from the LATER split when it occurs earlier: train > dev > test): 934 train, 531 dev and
//     597 test BPMN documents; every one of them has its root in the BPMN MODEL or DI namespace (the namespace is how nearly all of them declare themselves,
//     so R0's head arm is easy by construction and the body and mid arms carry the question).
//   * strangers (negatives): other XML (pom, spring, xsd, ...) and the sibling OMG standards DMN and CMMN by lineage, UD treebank prose (6 languages, the
//     treebank's own partition), code and data files by repository (split by repository), mermaid sources (by diagram directory) and SBGN-ML (libsbgn).
//   * the lexicon prior was built from the moddle JSON before any run; 238 names (137 types plus child properties); its rules were checked against the table.
//   * the adapter was written after this plan was drafted and smoke-compared to the DEV BPMN gold on all 531 dev documents with an ad-hoc script (units,
//     beings, relations): see A0. The gold itself was debugged once on that smoke (a self-closing tag followed by its parent's end tag was mistaken for a
//     start tag; an edge element without endpoints was counted as a relation): that is development on DEV, said here, and it means the dev R1/R3/R4 numbers
//     cannot be a surprise; the held-out evidence is TEST, run once by the orchestrator.
//
// CLAIM. A zero-model reader that holds only RECEIVED priors (the BPMN 2.0 metamodel table as the standard's giver, the DOT grammar, an identity profile
// estimated from TRAIN) and reads causally can, on HELD-OUT documents from a different lineage/source than its priors came from,
//   (R0) name the system (bpmn_xml, dot) from content alone, from a cold start as well as from the declaration header,
//   (R1) hear the lexemes (markup units and attributes for XML; identifier lexemes for DOT),
//   (R2) classify them (element class, attribute role, can-this-token-name-a-being; DOT: node id / attribute name / attribute value / graph name),
//   (R3) find the beings the text declares (BPMN: flow nodes, swimlanes, processes, data items, artifacts, each with its id; DOT: nodes),
//   (R4) find the relations (BPMN: sequence_flow, message_flow, association, data_association, attached_to; DOT: directed/undirected edges) and say
//        whether a reference resolves,
//   (R5) agree with itself across representations of the same content (re-serialisations, a namespace-prefix change, cross-notation BPMN -> DOT, and the
//        MIWG cross-tool exports of one reference process), each better than a control built to fail.
// BPMN and DOT are formal notations, so the bar is near-perfect agreement with the independent authority; the interesting results are the controls, the
// cold-start identification and the gaps, not the headline.
//
// DEFINITIONS (the family's "being" and "relation"; both gold and prior use them, which is a shared DESIGN decision, declared, not a shared table).
//   BPMN being = a start tag in the BPMN MODEL namespace with an `id` whose class is flow_node (any XSD type derived from tFlowNode), swimlane (participant,
//   lane), process (process, collaboration, choreography), data (dataObject, dataObjectReference, dataStore, dataStoreReference, dataInput, dataOutput, property)
//   or artifact (textAnnotation, group); kind = the element's local name. Elements in any other namespace are not beings even with an id (vendor extensions).
//   BPMN relation = (end1, label, end2) read as written: sequenceFlow/messageFlow/association (sourceRef -> targetRef), dataInput/OutputAssociation
//   (child sourceRef -> targetRef, one per pair), boundaryEvent (its id attached_to attachedToRef). An edge element naming no endpoint orders nothing.
//   `resolved` = both endpoints are ids declared in the document (an end-of-input annotation, the one non-causal field).
//   DOT being = a node name (explicit statement or an edge endpoint, ports stripped); relation = an edge (src, directed|undirected, dst) with chains expanded;
//   an edge end that is a subgraph is a TYPED GAP (compound_endpoint), not guessed, on both sides.
//
// DATA AND SPLITS (see /private/tmp/claude-501/notation/uml_bpmn/PROVENANCE.md and corpus/manifest.json). Split BY SOURCE, never by file within one source;
// near-duplicates across splits are removed from the later split and counted. `limit` keeps the first N documents per (dialect, kind) in manifest order
// (never a sample). measure({split:"test"}) appends to a run ledger so a second TEST run is visible.
//
// UNITS, GOLD AND MATCHERS.
//  R0 item = a STREAM of L = 1000 characters (declared: ~100-150 lexemes, a screen of text). Arms per positive document: head (first L characters),
//     body (L characters from just after the root start tag / the first `{`: the header and its namespace declarations are gone), mid (two seeded random
//     LINE STARTS with >= L characters left: a cold start). Strangers get head, mid and (XML strangers) body. The identifier is fed the complete lexemes of
//     the stream in order; the verdict after the last one is scored: correct iff `system` == the document's dialect (a stranger is named if `system` != null).
//  R1 BPMN item = a markup unit [s,e) with kind in tag_start tag_empty tag_end text comment cdata decl pi (UTF-16 offsets; whitespace-only text is not a
//     unit; text units are trimmed to the non-blank run); matcher: exact span AND kind; micro F1 pooled over documents (and per document for the sign test).
//     Documents with a DOCTYPE are excluded from R1 (expat does not report the doctype extent): counted as a typed gap. Attribute items = (document, start tag,
//     position, name, normalised-and-decoded value) over the start tags the reader heard exactly. DOT item = a unique decoded identifier string occurring as a
//     node name, attribute name, attribute value or graph/subgraph name (pydot's view); the reader's = the decoded id/str/num/html lexemes of those roles
//     (ports excluded); micro F1 over unique strings per document.
//  R2 BPMN item = a gold start tag (element class, 10 classes), a gold attribute (decl ref label other ext nsdecl), a gold non-blank text unit (text|ref_text);
//     correct iff the reader heard the SAME unit (R1 errors are charged here) and gave the same class. can_name_a_being = binary F1 on elements (gold: class in
//     flow_node swimlane process data artifact). DOT item = a gold string with exactly one role in the document (node_id attr_name attr_value graph_name) matched
//     to the reader's lexemes of that string; strings with several roles are excluded (counted).
//  R3 item = (document, id, kind). Headline micro F1; per-class F1, label accuracy (name attribute) and span exactness are reported, not in the rule.
//  R4 item = (document, end1, label, end2). Headline micro F1; resolved-claim accuracy over the matched relations; the reader may not emit a relation whose
//     endpoint attribute is absent.
//  R5 item = (document, representation). Agreement = the reader's (beings, relations) sets on the representation are EQUAL to its own on the original (and to the
//     gold). Representations: pretty, c14n, default_ns|prefixed_ns, ascii_single_quote (all produced by lxml/libxml2 from natural documents, kept only when the
//     gold side re-derives identical beings and relations from them; AUTHORED, labelled derived, never natural); cross-notation: the flow structure of a BPMN
//     document written as DOT by the data script (AUTHORED) read by the DOT reader vs the BPMN reader on the original; natural cross-tool pairs: MIWG exports of
//     the same reference process (label-keyed relations `kind:name -> kind:name`): reader Jaccard vs gold Jaccard per pair; DOT: pydot re-serialisation.
//
// ARMS AND CONTROLS BUILT TO FAIL (every control is implemented in this file, independently of the adapter):
//  R0  real arms head/body/mid. Controls: charshuf (every whitespace word of a head/mid window has its characters deranged: lengths and spaces kept, notation
//      destroyed); strangers by kind (other XML, DMN, CMMN, mermaid, SBGN-ML, prose x6 languages, code and data files); the OTHER dialect's documents (a BPMN
//      stream named dot and the reverse). Diagnostics, not in the rule: unigram (no transition evidence), no_decay.
//  R1  real = collapse(ear). Controls: ws_split (whitespace chunks as units), naive_regex (</?[^>]*> and the text between), shifted (real spans + 1), misaligned
//      (document i's units against document i+1's gold). DOT controls: ws_split, naive_regex (\w+ and "..." chunks), misaligned.
//  R2  real = the ear's classes. Controls: majority (always the commonest gold class), label_shuffled (reader's classes deranged among matched items, seeded
//      Sattolo). Reference only (not a control): ns_blind (class by local name ignoring the namespace, the lexicon alone).
//  R3  real = read().beings. Controls: any_id (every element with an id attribute is a being, kind = its local name), misaligned, kind_shuffled (ids right, kinds
//      deranged). Reference only: no_ns (the lexicon by local name in any namespace). DOT: any_id (every identifier lexeme is a node), misaligned.
//  R4  real = read().relations. Controls: adjacent_flow (consecutive beings in document order linked as sequence_flow), swapped (every real relation reversed),
//      misaligned. DOT: adjacent, swapped, misaligned.
//  R5  real = reader agreement. Controls: misaligned pairing (rendering of document i against the original of document i+1), literal_prefix (a reader that only
//      knows the prefix `bpmn:`: it must collapse on default_ns/prefixed_ns), misaligned cross-notation and misaligned cross-tool pairs.
//
// PASS RULES (PASS iff ALL listed checks hold; not softened after a run; bare numbers are PROVISIONAL declarations, P4; ALPHA = keyness.js KEY_ALPHA = 0.05;
// a dialect counts as MEASURED at a rung when its held-out split has >= 30 documents for that rung, else it is a typed gap and does not make the rung pass):
//  R0  per measured dialect D: TPR(head) >= 0.95, TPR(body) >= 0.90, TPR(mid) >= 0.80 (bpmn_xml) / 0.60 (dot); every stranger kind with >= 100 streams named
//      <= 0.05 (a kind with fewer is a typed gap); cross-dialect confusion <= 0.02; charshuf named-as-D <= 0.05; licence L0a: mean real TPR - charshuf >= 0.50;
//      C0 causal: 0 violations over 100 streams x cuts at 25/50/75% (if the first-named position at or before the cut differs between the prefix and the full stream).
//  R1  BPMN: unit F1 >= 0.995 AND attribute F1 >= 0.995; real beats ws_split AND naive_regex per document by the exact one-sided sign test at ALPHA (ties dropped);
//      shifted <= 0.20 and misaligned <= 0.20; C1 causal (100 documents x 3 cuts: the complete tokens of ear(prefix) are the first tokens of ear(full), same span and
//      class). DOT: F1 >= 0.98, beats ws_split and naive_regex by sign test, misaligned <= 0.20.
//  R2  BPMN: element-class accuracy >= 0.98, attribute-role accuracy >= 0.97, text-role accuracy >= 0.98, can_name_a_being F1 >= 0.98; real - majority >= 0.20 and
//      real - label_shuffled >= 0.40 on element and attribute accuracy. DOT: role accuracy >= 0.95, same two margins.
//  R3  BPMN F1 >= 0.98 (and each of flow_node, swimlane, process, data, artifact F1 >= 0.95 when it has >= 30 gold items, else typed gap); real - max(any_id,
//      misaligned, kind_shuffled) >= 0.10 AND the per-document sign test beats each at ALPHA; licence: misaligned <= real - 0.30 and kind_shuffled <= real - 0.30.
//      DOT: F1 >= 0.97, margin over any_id and misaligned >= 0.10 with sign tests.
//  R4  BPMN: relation F1 >= 0.98; resolved-claim accuracy >= 0.98; real - max(adjacent_flow, misaligned) >= 0.50; licence: swapped <= 0.10 (a direction control must
//      collapse) and misaligned <= real - 0.30; C34 causal (100 documents x 3 cuts: items with at <= cut agree between read(prefix) and read(full)). DOT: F1 >= 0.95,
//      margin over adjacent and misaligned >= 0.50, swapped <= 0.10.
//  R5  BPMN renderings: macro agreement >= 0.99 AND minimum over renderings >= 0.98; misaligned <= 0.05; literal_prefix mean on default_ns+prefixed_ns <= real - 0.20;
//      cross-notation agreement >= 0.98 with misaligned <= 0.05; natural cross-tool: mean |reader J - gold J| <= 0.02 and misaligned-pair reader J <= 0.20 (typed gap
//      when the split has < 30 pairs); DOT re-serialisation agreement >= 0.98.
//  score = the rung's headline (R0 mean TPR over measured dialects, R1 unit F1, R2 element-class accuracy, R3 F1, R4 relation F1, R5 macro agreement);
//  control = the strongest control IN THE RULE on the same metric (R0: max of stranger named-rate and charshuf TPR; R2 max(majority, label_shuffled); R5 the
//  highest control agreement); margin = score - control (R0: score - control); pass = null with a typed gap when a needed arm cannot be run (never "pass by absence").
//
// PREDICTIONS (written blind; the ORDERS are the claims, the numbers are guesses):
//  P0  head TPR ~1.00 for both (the namespace and the `digraph` keyword declare themselves); body bpmn_xml >= 0.95; mid bpmn_xml 0.85-0.97, mid dot 0.40-0.80
//      (C `a->b;` and mermaid `A --> B` look like DOT edges). Strangers: DMN and CMMN named-rate in the MID arm 0.02-0.25 (their local names `task`, `sourceRef`
//      overlap BPMN's when no namespace is bound) so R0 FAILS on at least one XML-sibling kind; code and prose < 0.02; mermaid named as dot 0.02-0.20; charshuf 0.
//  P1  R1 passes at >= 0.999 on BPMN (a formal lexical grammar; saturated); ws_split 0.05-0.30, naive_regex 0.80-0.95 (it splits comments and CDATA wrongly and
//      cannot see attribute text); shifted and misaligned < 0.05. DOT 0.97-1.00.
//  P2  R2 element-class accuracy >= 0.99 on dev, 0.97-0.995 on test (vendor extension names are `ext` by namespace so they do not cost); attribute roles 0.96-0.99
//      (calledElement, structureRef, itemSubjectRef: the XSD calls them QName references, moddle does not); majority 0.30-0.50; label_shuffled < 0.30.
//  P3  R3 F1 >= 0.995 on dev (saturated), >= 0.98 on test; any_id 0.55-0.80 (diagram shapes carry ids); misaligned < 0.25; kind_shuffled < 0.30.
//  P4  R4 F1 >= 0.995; resolved accuracy >= 0.99; swapped ~0 (< 0.05); adjacent_flow 0.2-0.6.
//  P5  renderings: pretty, ascii_single_quote, default_ns/prefixed_ns, c14n agree 1.00; literal_prefix collapses on the namespace renderings (< 0.1);
//      cross-notation >= 0.99; MIWG |reader J - gold J| < 0.01; DOT re-serialisation 0.95-1.00.
//  Headline guess: R1-R5 pass on BPMN dev and test; R0 fails somewhere (a stranger kind in the mid arm, or dot mid); DOT is the weaker half because pydot is a
//  quirky gold and the DOT corpus is small and uneven (rungs fall back to typed gaps when a split has < 30 documents).
//
// TYPED GAPS DECLARED IN ADVANCE (denominators, never silent): SBGN-ML (no open permissively licensed source with an independent split: libsbgn only, so it is a
// stranger, never a prior), PlantUML (no independent parser without executing a downloaded JVM jar), Mermaid (no independent parser in the toolchain; a near-miss
// stranger), UML XMI (no open permissively licensed XMI corpus found) and the rest of "structured diagram text" (Visio, draw.io, GraphML, DMN/CMMN beings): R1..R5
// UNMEASURED for all of them; BPMN diagram interchange geometry (BPMNDI shapes are classed `diagram`, their coordinates are not read); choreography, conversation,
// compensation and event-definition SEMANTICS are not read (only the elements' classes and ids); XML with a non-UTF-8 declared encoding (dropped: 26 BPMN, 93 CMMN),
// internal entity declarations (dropped), BPMN files that are not in the standard's namespace (excluded); DOT: HTML-like labels beyond lexing, `+` string
// concatenation and compound-endpoint edges are typed, not read; cold-start streams that begin inside an attribute value or a comment are not constructed.
// LIMITS: BPMN models in these corpora are mostly engine TEST FIXTURES (small, repetitive, engine-flavoured), not models drawn in the wild; structural de-duplication
// removes the trivial ones but not the style; the MIWG suite is the natural cross-tool diversity; the lineages share an XML dialect, so held-out here means a different
// vendor extension vocabulary and tooling, not a different language; the R2/R3/R4 gold classes and the "being" definition are the family's declared design, shared by
// gold and prior (the tables themselves are different artifacts of the standard, cross-checked in the R2 details); R5 renderings are authored by lxml and a
// script; pydot is both gold and a parser with known quirks (compound endpoints, HTML labels) which are typed, not scored; R0's code and prose pools are small
// (documents per repository/treebank, windows within a document are correlated).
//
// A0 DISCLOSURE (still before the first run of THIS file; no rule, arm, threshold or prediction above was changed by it): (1) the adapter's XML ear and reader were
//  smoke-compared to the 531 DEV BPMN gold records on units, beings and relations: 0 mismatches after the two gold fixes named in the DISCLOSURE; (2) the lexicon
//  prior was changed once before that smoke: child-element properties of the standard (inputDataItem, outputDataItem, conditionExpression, ...) were added as KNOWN
//  names, a contained property taking the class of its declared type (inputDataItem: DataInput -> data) and a reference property (incoming) staying model_other:
//  the first smoke had two missing beings of exactly that kind; (3) no identity model existed at that point and no R0 arm had run.
// ═══ END PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ AMENDMENTS (appended after seeing DEV results; the registration above is left as it was and its digest does not move; where an amendment disagrees ═══
// ═══ with it, THE AMENDMENT GOVERNS from its re-run on; the first-run numbers are kept here so a failure stays a failure)                           ═══
//
// FIRST DEV RUNS (registration digest df2aef5b32857a1a). The DOT corpus took longer to fetch than the BPMN half, so the first runs were BPMN only.
//   RUN 1 (531 BPMN documents, before any amendment): R1 PASS (unit F1 1.0, attribute F1 1.0; ws_split .1737, naive_regex .9983, shifted 0, misaligned .0065);
//     R2 PASS (element class 1.0, attribute role .9904, text 1.0, can_name F1 1.0; majority .4172, label_shuffled .2668); R3 PASS (F1 1.0; any_id .4711, misaligned
//     .0375, kind_shuffled .1035); R4 FAIL (F1 1.0, resolved 1.0, but margin over adjacent_flow .4823 < .50: adjacent_flow scored .5177, swapped .0044, misaligned
//     .0015); R5 renderings 1.0, cross-notation .9852, cross-tool arm below its minimum (0 pairs).
//   RUN 2 (R0 with the BPMN identity model only): BPMN head .9503, body .9695, mid .9793; C0 causal 168 violations in 600 (see A3).
//   RUN 3 (first run with DOT, 543 BPMN + 83 DOT documents): R0 FAIL (score .9888; DOT charshuf (word-wise, as registered) named .685; code .1893, mermaid .1941,
//     markup .061 named; C0 violations); R1 FAIL (dot C1 causal 1/249); R2 PASS (DOT role accuracy 1.0); R3 PASS (DOT F1 .987: three documents with compound-endpoint
//     subgraphs where the gold missed nodes); R4 FAIL (the BPMN margin again; dot C34 causal 5/252); R5 FAIL (DOT re-serialisation agreement .9639: the same three documents).
// A1 DATA (post hoc, each prompted by a run above; none touches a threshold):
//   (a) the MIWG suite was structurally de-duplicated like every other source, which removed most of its Reference models, so the cross-tool arm had no pairs; MIWG is now
//       exempt from SAME-split de-duplication (never from cross-split): BPMN 934 train / 543 dev / 632 test (the registered 531 / 597 are superseded);
//   (b) gold: the DI reference attributes were a hand list of three (`labelStyle` was missed: 1061 false attribute errors in Run 1); they are now derived from
//       BPMNDI/DI/DC.xsd (QName/IDREF). The remaining attribute-role errors are the prior-vs-XSD disagreements (structureRef, calledElement: moddle types them String);
//   (c) gold (DOT): nodes declared inside a subgraph used as an edge end are real beings (pydot keeps them in the endpoint's object dictionary, now walked), the plain end
//       of a compound edge is a node, a QUOTED "node"/"edge" is an ordinary ID (only the unquoted keyword is an attribute statement), `"a":p` ends the name at the closing
//       quote, and two documents where pydot folds `"a":"p"` into a name with stray quotes are dropped (typed); a byte-order mark is stripped;
//   (d) strangers: the code/markup/data pools come from the sibling code corpus (13 programming languages, html/vue/svelte/latex/markdown, json/yaml/toml/css; 6 files per
//       language per split, by repository) because the ethos checkout holds 3-4 files per repository (decided before any R0 run); the DOT corpus is the GitHub code-search
//       sample described in PROVENANCE.md: DOT train 465 documents (290 repositories incl. pydot's own test graphs), dev 84 (69), test 107 (89), 128 same-split and 38
//       cross-split structural duplicates removed, 80 files that are not graphs and 2 that pydot cannot parse dropped.
// A2 INSTRUMENT (post hoc, said so): (a) the cross-notation arm compared the BPMN reader's message flows between PARTICIPANTS with a DOT text that only holds flow nodes
//   (7 of 472 documents): the BPMN side is now restricted to flow-node endpoints, as the data script's rendering is; (b) DOT also carries the causal checks C1 and C34 (the
//   registration was silent on DOT; stricter, decided before the first DOT run) and, for DOT only, an item whose last identifier ends exactly at the cut is undecidable from the
//   prefix (it could extend) and is not compared: the first DOT run counted it and reported 5 false violations; (c) R0 charshuf: the word-wise derangement leaves numeral
//   edge lists such as `1 -- 2` well-formed (9 of 128 DOT windows kept 3+ edges), so the RULE now uses a GLOBAL derangement of all non-blank characters of the window and
//   the registered word-wise control is reported as charshuf_word with its survivors count; (d) measure() accepts dryRun (loads and counts, reads nothing, writes no
//   ledger line); (e) R0 reports how many mid windows are truly cold (no declaration left in them) and the TPR on those.
// A3 MECHANISM (adapter and identity prior, prompted by Runs 2-3; the pass rule is not relaxed): (a) the identifier timestamped evidence at the END OF THE LEXEME, but an
//   element's class is fixed only when its tag closes (an xmlns attribute may follow the name) and a DOT identifier's role looks one token ahead: evidence is now timestamped
//   at AVAILABILITY (tag end; the next token), consumed in that order, and a namespace declaration is available at once (a root tag longer than the window used to give no
//   evidence at all: 27 MIWG heads); C0 then shows 0 violations; (b) DOT evidence is the STATEMENT the grammar recognises (edge, node with known attributes, header, default
//   attributes, graph attribute, subgraph, close) or `bad`, not raw punctuation: a character shuffle keeps a DOT window's bracket and equals density and a token-level model
//   named it; an attribute name counts only when it is in the TRAIN-attested vocabulary of the grammar prior (the prior NOMINATES; 56 names, >= 5 TRAIN documents), and a bare
//   identifier is a word (prose, shell, node list) and carries no evidence; (c) reader: `#` mid-line is read as a comment (pydot does; the grammar names it at line start) and
//   counted as the typed gap hash_comment_mid_line; `"a" + "b"` is one ID. After these: the identity prior was rebuilt from TRAIN (deterministic: identical file on a rebuild).
// A4 DISCLOSURE: one ad-hoc diff of the DOT reader against the gold (nodes and edges, no scores) was accidentally run on the TEST DOT documents as well as dev and train:
//   0 differences were reported and nothing was changed because of it; the BPMN TEST documents were only COUNTED (namespaces); measure({split:"test"}) has NOT been run
//   (only its dryRun, which reads nothing). The mechanism, controls and thresholds are frozen as of the DEV card below.
// DEV CARD AFTER A1-A3 (543 BPMN + 84 DOT documents; pass by the registered rules unless a rule is named above): R0 PASS (score .9849: BPMN head/body/mid .9908/.9829/.9816
//   (cold mid .9789), DOT .9881/1.0/.9659 (cold mid .9643); strangers named: code .0194, markup .0366, mermaid .0353, DMN .0355, CMMN .0417 (n=24), data 0, prose 0, SBGN 0,
//   other XML .0046; charshuf BPMN 0 / DOT .0234; C0 0/600); R1 PASS (BPMN 1.0/1.0, DOT .9978; naive_regex BPMN .9983, DOT .8665; ws_split .1735 / .3311); R2 PASS (element 1.0,
//   attribute .9991, text 1.0, DOT 1.0; majority .4215/.3467, DOT .4766); R3 PASS (BPMN 1.0, DOT 1.0; any_id .468 / .5497); R4 FAIL (BPMN margin .4823 < .50 against
//   adjacent_flow .5177; the real arm is F1 1.0 and the sign test beats the control 355-0, every other check holds, DOT F1 1.0): reported as a failure, the control is
//   stronger than the margin I declared; R5 PASS (renderings 1.0, cross-notation 1.0, MIWG cross-tool |reader J - gold J| 0 over 41 pairs of 2 reference processes (gold J .2552),
//   DOT re-serialisation 1.0). PREDICTION SCORECARD (blind guesses vs DEV): right: head TPR ~1, DMN/CMMN named in the MID arm .08, code/prose < .02, mermaid-as-dot .035, ws_split
//   .1735, shifted/misaligned ~0, element accuracy >= .99, majority .30-.50, label_shuffled < .30, kind_shuffled < .30, swapped ~0, adjacent_flow in .2-.6, renderings 1.00,
//   literal_prefix collapse, cross-notation >= .99; WRONG: DOT mid .40-.80 (observed .966: the statement features are strong), "R0 fails on an XML-sibling kind" (pooled .0355,
//   .0417), naive_regex .80-.95 (.9983: BPMN lexemes are easy), attribute accuracy .96-.99 (.9991), any_id .55-.80 (.468), DOT charshuf 0 (.0234), BPMN mid .85-.97 (.9816).
//   The dev numbers are saturated by construction (a formal notation, development on dev): the held-out evidence is TEST, run once by the orchestrator.
//
// ═══ ADVERSARIAL-REVIEW AMENDMENTS A5-A8 (dated 2026-10-06; written BEFORE the re-run of DEV that follows them; each only makes the instrument STRICTER or ═══
// ═══ more DISCLOSING: no threshold of the registration moves, no check is dropped; the registration digest above is unchanged)                         ═══
// A5 CAUSAL-CHECK COVERAGE (review finding 1: C0 never exercised DOT; the C1/C34/R3 documents were `slice(0,100)` = 100 documents of ONE source; an adversary that scaled the DOT
//   identifier's evidence by whole-stream length was NOT caught, mutant M5). Changes: (a) C0 draws, PER DIALECT, N_CAUSAL = 100 positive documents with `stratifiedSample` (seeded,
//   round-robin over SOURCES, uml_bpmn-lib.mjs) and tests their head, body and first mid windows at cuts 25/50/75% (BPMN dev: 4 sources, test: 3; DOT dev: 69 repositories, test: 89);
//   violations are counted per dialect and the rule needs 0 in each (check names C0.causal and C0.causal.<dialect>); (b) the C1 and C34 documents are drawn by the same sampler
//   per dialect (the 100 is kept; the choice of documents changes); the sample must cover min(100, sources in the split) sources (checks `*.coverage`); (c) STANDING MUTATION
//   LICENCE (II.23/II.4: a causal check is licensed only if it can fail): every causal check is also run on the same sample against a DELIBERATELY NON-CAUSAL system, defined in this
//   file and exported (mutantIdentify: the SPRT threshold of one dialect is scaled by len/500 of the WHOLE stream it is given; mutantLex: the class of every attribute value or DOT
//   identifier depends on the median value length over the whole text; mutantRead: a being is kept only if a, possibly later, relation references it), and the check is licensed
//   only if the mutant produces >= 1 violation for each dialect (check names `*.licence(mutant_caught)`); a blind check FAILS the rung. The mutants' rates are reported.
//   PREDICTION (before the re-run): the real system keeps 0 violations on every dialect and every source (the A3a mechanism); each mutant is caught (identifier and lexer mutants on
//   a majority of stream-cuts, the reader mutant on a minority); if the real DOT identifier shows a violation on the stratified sample, that is a defect FOUND, reported as a FAIL,
//   and repaired in the adapter, never in the check.
// A6 LICENCE RECORD (review findings 2 and 4; rule 11). The UD Italian treebank (UD_Italian-ISDT) is distributed under CC BY-NC-SA 3.0 (its LICENSE.txt and README), which the rule
//   does not allow; the manifest said "UD treebank licence (see treebank LICENSE.txt)" for every prose document. Changes: ud-ita is REMOVED from the prose strangers (40 train, 24 dev,
//   24 test windows; the text files are moved to excluded-licence/ud-ita/, outside corpus/) and Italian prose is a typed gap `prose_language_excluded_licence:ita` (unmeasured, not
//   "good"); the manifest records the EXACT SPDX per document (the five remaining treebanks: EWT, German-GSD, French-GSD, Russian-GSD CC-BY-SA-4.0, Spanish-AnCora CC-BY-4.0; the
//   code strangers carry their repository's SPDX from the code-corpus manifest instead of a generic string); the data build FAILS on an SPDX outside ALLOWED_SPDX and writes a
//   licence_audit block; this instrument RE-AUDITS the manifest at measure() time (uml_bpmn-lib.mjs licenceAuditOf) and, if any document is outside the list, every rung's verdict
//   becomes null with a gap `licence_audit_failed`. The identity prior was rebuilt from TRAIN without Italian (a rebuild on the unchanged corpus reproduced the old file byte for
//   byte first, so the rebuild is deterministic); the corpus, the gold (byte-identical, verified) and every other document are unchanged; the 64 text files that an earlier build left
//   in corpus/ without a manifest entry were moved to orphans-not-in-manifest/. PREDICTION: prose strangers stay named at ~0; R0 stays PASS; no other rung moves.
// A7 R4 MARGIN CEILING (review finding 3). The registered margin (real - max(adjacent_flow, misaligned) >= 0.50) is UNREACHABLE for a perfect reader when adjacent_flow > 0.50 (dev:
//   0.5177, so the ceiling is 0.4823); the control was also built from the READER's beings, so a degraded reader weakened its own control (an emptied lexicon dropped it to 0.18).
//   The 0.50 IS NOT RETUNED and the registered verdict stays visible: `pass` is false when the margin check fails (FAIL-by-rule). Changes: (a) adjacent_flow is now the stronger
//   (higher micro F1) of the version built from the GOLD flow-node beings in document order (DOT: the gold nodes) and the registered version built from the reader's beings, both
//   reported; (b) details.*.margin_ceiling = {control, ceiling = 1 - control, rule, reachable}; a failed margin with reachable = false is labelled in the note "FAIL-by-rule: the
//   registered margin is unreachable for a perfect reader, it says nothing about the reader"; (c) details.*.discriminating_evidence = the sign tests against adjacent_flow and against
//   misaligned, the swapped and misaligned licence checks, C34 and its mutant licence, with a boolean `held`; the two sign tests are ADDED to the BPMN rule (checks
//   bpmn.sign(adjacent), bpmn.sign(misaligned)); (d) on TEST quote the registered verdict WITH margin_reachable and discriminating_evidence.held beside it.
//   PREDICTION: dev R4 F1 1.0; the gold-built and the reader-built adjacent_flow agree (0.5177: the reader equals the gold on dev); margin 0.4823; reachable = false; registered
//   verdict FAIL-by-rule; discriminating evidence held = true; every other R4 check holds.
// A8 R0 EXPECTED STRANGER KINDS (review finding 5). The stranger loop visited only the kinds PRESENT in the split, so CMMN (60 train, 6 dev, 0 test documents; the build dropped 93
//   CMMN files with a declared non-UTF-8 encoding and capped 43) would be silently absent from the TEST card although it is the hardest near-miss sibling of BPMN. r0 now declares the
//   expected kinds (xml_other, xml_dmn, xml_cmmn, mermaid, sbgn_ml, code, markup, data, prose) and emits the typed gap `stranger_kind_absent_in_split:<kind>` (count 0, with the
//   manifest counts per split and the build's drop/cap statistics) for each one with no stream in the split, and lists it in the rung's notes. A gap never passes by absence: the
//   registered `pass` is untouched. PREDICTION: dev has no absent kind (CMMN has 6 documents: `below_min_streams`, as before) and carries prose_language_excluded_licence:ita; TEST carries
//   stranger_kind_absent_in_split:xml_cmmn, so DMN is the only XML sibling there.
// DEV RE-RUN AFTER A5-A8 (registration digest df2aef5b32857a1a unchanged; 543 BPMN + 84 DOT documents; strangers: prose 120 = 5 languages): R0 PASS (score .9849, identical to the card
//   above: BPMN head/body/mid .9908/.9829/.9816, DOT .9881/1.0/.9659; strangers named: code .0194, markup .0366, mermaid .0353, DMN .0355, CMMN .0417 (n=24, below_min gap as before),
//   data 0, prose 0 (n=120), SBGN 0, other XML .0046; charshuf BPMN 0 / DOT .0234); R1 PASS, R2 PASS, R3 PASS, R5 PASS (all identical to the card above); R4 FAIL-by-rule on the single check
//   bpmn.margin>=0.50 (F1 1.0; gold-built and reader-built adjacent_flow both .5177; margin .4823 = the ceiling; reachable = false; the sign tests 355-0 against adjacent_flow and
//   513-0 against misaligned, swapped .0042, misaligned .0014, C34 0 violations: discriminating evidence held = true; DOT F1 1.0, adjacent_flow .1811 (gold-built; reader-built .1793),
//   ceiling .8189, reachable and held). CAUSAL CHECKS (all real-system violations 0): C0 2850 checks over 475 streams (BPMN: 100 documents, 271 head/body/mid streams, 4 of 4 sources;
//   DOT: 84 documents, 204 streams, 69 of 69 repositories); C1 300 / 252 checks (BPMN / DOT); C34 300 / 252. MUTANT CATCH RATES (violations per stream-cut or document-cut): identifier
//   .6531 BPMN / .6258 DOT; lexer .8033 / .2579; reader .20 / .6071; every one licensed (>= 1 per dialect). Gaps: prose_language_excluded_licence:ita, stranger_kind_below_min_streams
//   (data 72, markup 82, CMMN 24), dialect_unmeasured (sbgn_ml, plantuml, mermaid, uml_xmi). TEST was NOT run (a dry run, which reads nothing with the adapter and writes no card or ledger
//   line, shows the TEST split has no CMMN: stranger_kind_absent_in_split:xml_cmmn will be in its card; the stratified C0 sample covers 3 of 3 BPMN sources and 89 of 89 DOT repositories there).
//   CROSS-CHECKS WITH THE REVIEW'S MUTATIONS (scratch copies of the adapter, outside the repository): M5 (whole-stream scaling of the DOT evidence only): R0 FAIL, C0.causal.dot 387
//   violations (before A5: C0 0/600, R0 PASS); M3 (the same scaling on both dialects): FAIL on both; an emptied BPMN lexicon: R3 F1 .5 FAIL, and R4's control stays .5177 (the reader-built
//   control fell to 0, the gold-built one did not move), so the margin check cannot be passed by degrading the reader. PREDICTION SCORECARD (A5-A8, blind vs DEV): right: real system 0
//   violations on every dialect and source; identifier mutant on a majority of stream-cuts (.65, .63); BPMN lexer mutant majority (.80); BPMN reader mutant minority (.20); prose named ~0;
//   R0 PASS; no other rung moves; every A7 and A8 prediction. WRONG: DOT lexer mutant a majority (observed .26: DOT identifiers repeat, so a prefix median often equals the full median);
//   DOT reader mutant a minority (observed .61: DOT node statements precede their edges).

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as A from "../../adapters/notation/uml_bpmn.js";
import { KEY_ALPHA } from "../competence/lib.mjs";
import * as L from "./uml_bpmn-lib.mjs";

export const FAMILY = "uml_bpmn";
const SELF = fileURLToPath(import.meta.url);
const ALPHA = KEY_ALPHA;
const MIN_DOCS = 30, MIN_STREAMS = 100, MIN_GOLD = 30, N_CAUSAL = 100;
const BEING_CLASSES = new Set(["flow_node", "swimlane", "process", "data", "artifact"]);
const DIALECTS = ["bpmn_xml", "dot"];
const SEED = "uml_bpmn-instrument-1";
/** A8: the stranger kinds the R0 card expects in every split; a kind with no stream is a typed gap, not a silent absence */
export const EXPECTED_STRANGERS = Object.freeze(["xml_other", "xml_dmn", "xml_cmmn", "mermaid", "sbgn_ml", "code", "markup", "data", "prose"]);
const SPLITS = L.SPLITS;

/** digest of the registration block as it stands in this file (it moves when the header is amended) */
export function registrationDigest() {
  const t = fs.readFileSync(SELF, "utf8");
  const a = t.indexOf("// ═══ PRE-REGISTRATION"), b = t.indexOf("// ═══ END PRE-REGISTRATION");
  return createHash("sha256").update(t.slice(a, b)).digest("hex").slice(0, 16);
}

const mkRung = (id, split, o = {}) => ({ id: `${FAMILY}.${id}`, rung: id, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {}, ...o });
const gap = (reason, count = 1, extra = {}) => ({ reason, count, ...extra });
const unmeasured = (id, split, reason, extra = {}) => mkRung(id, split, { gaps: [gap(reason, 1, extra)], notes: [`unmeasured: ${reason}`] });
const f4 = L.round;

// ═══ pure scorers (exported: tests drive them with toy data) ═══════════════════════════════════════════════════════════════════════════════
/** markup units and per-tag attributes from ear tokens: [{s,e,kind,name,attrs:[{name,value,nameTok}],tokens}] (whitespace-only text never appears) */
export function collapse(tokens) {
  const units = [];
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.cls === "tag_open" || t.cls === "tag_close_open") {
      let m = k + 1;
      const nameTok = tokens[m] && (tokens[m].cls === "elem_name" || tokens[m].cls === "end_name") ? tokens[m] : null;
      const attrs = [];
      while (m < tokens.length && tokens[m].cls !== "tag_end") {
        if (tokens[m].cls === "attr_name") { const v = tokens[m + 1]?.cls === "attr_eq" && tokens[m + 2]?.cls === "attr_value" ? tokens[m + 2] : null; attrs.push({ name: tokens[m].q, value: v ? v.v : null, nameTok: tokens[m] }); }
        m++;
      }
      if (tokens[m] && !tokens[m].partial) units.push({ s: t.s, e: tokens[m].e, kind: t.cls === "tag_close_open" ? "tag_end" : tokens[m].selfClosing ? "tag_empty" : "tag_start", name: nameTok, attrs });
      k = m; continue;
    }
    if (t.partial) continue;
    if (["decl", "pi", "comment", "doctype", "cdata"].includes(t.cls)) units.push({ s: t.s, e: t.e, kind: t.cls });
    else if (t.cls === "text") units.push({ s: t.s, e: t.e, kind: "text", tok: t });
  }
  return units;
}
const ukey = (u) => `${u.s}:${u.e}:${u.kind}`;
const unitKeys = (units) => units.map(ukey);
const goldUnits = (g) => g.units.map((u) => ({ s: u[0], e: u[1], kind: u[2], name: u[3] }));

/** per-document F1 with the convention that two empty sets agree (1) */
const docF1 = (pred, gold) => { if (!pred.length && !gold.length) return 1; return L.setF1(pred, gold).f1 ?? 0; };
/** pooled micro F1 over [{pred:[], gold:[]}] */
function microF1(pairs) { let tp = 0, np = 0, ng = 0; for (const { pred, gold } of pairs) { const r = L.setF1(pred, gold); tp += r.tp; np += r.np; ng += r.ng; } return { tp, np, ng, f1: np + ng ? (2 * tp) / (np + ng) : null, precision: np ? tp / np : null, recall: ng ? tp / ng : null }; }
export const scoreSets = { setF1: L.setF1, docF1, microF1 };

/** character derangement inside every whitespace word that has >= 2 distinct characters (the R0 charshuf control and its tests) */
export function charDerange(text, rng) {
  return text.split(/(\s+)/).map((w) => {
    if (/^\s*$/.test(w) || new Set(w).size < 2) return w;
    const cs = [...w];
    for (let tries = 0; tries < 8; tries++) { const p = L.derangement(cs.length, rng); const out = p.map((i) => cs[i]).join(""); if (out !== w) return out; }
    return w;
  }).join("");
}
/** A1 control: every non-whitespace character of the window is moved to another non-whitespace position (one seeded derangement over the whole window; layout and
 *  character counts kept, every token boundary and every well-formed statement destroyed). The word-wise charDerange above leaves `1 -- 2` or `12 -> 7;`
 *  graphs well-formed, so it is kept only as a reported diagnostic with a survivors count. */
export function charDerangeGlobal(text, rng) {
  const idx = []; for (let i = 0; i < text.length; i++) if (!/\s/.test(text[i])) idx.push(i);
  const cs = idx.map((i) => text[i]);
  const p = L.derangement(cs.length, rng);
  if (!p) return text;
  const out = text.split(""); idx.forEach((pos, k) => { out[pos] = cs[p[k]]; });
  return out.join("");
}
/** a seeded derangement of an array (no element stays at its index); a 1-element array stays */
export function derange(arr, rng) { const p = L.derangement(arr.length, rng); return p ? p.map((i) => arr[i]) : arr.slice(); }
/** the shared sign-test report of A over B per document */
const signVs = (a, b) => { const r = L.pairedSign(a, b); return { wins: r.wins, losses: r.losses, n: r.n, p: f4(r.p, 6) }; };

// ═══ data access ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const negGroup = (d) => { const k = (d.neg_kind ?? "other").split(":")[0]; return k; };
function selectDocs(m, split, limit) {
  const lim = (a) => (limit == null ? a : a.slice(0, limit));
  const of = (pred) => lim(m.docs.filter((d) => d.split === split && pred(d)));
  const neg = {};
  for (const g of [...new Set(m.docs.filter((d) => d.split === split && d.kind === "neg").map(negGroup))].sort()) neg[g] = of((d) => d.kind === "neg" && negGroup(d) === g);
  return { bpmn: of((d) => d.dialect === "bpmn_xml"), dot: of((d) => d.dialect === "dot"), neg };
}
function jsonl(file) { if (!fs.existsSync(file)) return []; return L.loadJsonlGz ? L.loadJsonlGz(file) : zlibLines(file); }
import zlib from "node:zlib";
function zlibLines(file) { return zlib.gunzipSync(fs.readFileSync(file)).toString("utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)); }
const arr = (x) => (Array.isArray(x) ? x : []);

class Ctx {
  constructor({ split, limit, dir }) {
    this.split = split; this.limit = limit; this.dir = dir;
    this.m = L.loadManifest({ dir });
    this.priors = A.loadPriors();
    this.gold = L.loadGold(split, { dir });
    this.sel = this.m ? selectDocs(this.m, split, limit) : null;
    this.cache = new Map();
    this.memo = new Map();
  }
  text(d) { return L.textOf(d, { dir: this.dir }); }
  /** lexed + read view of a document under its own dialect */
  view(d) {
    if (this.cache.has(d.id)) return this.cache.get(d.id);
    const text = this.text(d);
    const lx = A.lex(text, { priors: this.priors, dialect: d.dialect });
    const rd = d.dialect === "bpmn_xml" ? A.readXmlTokens(lx.tokens, this.priors) : A.readDotTokens(lx.tokens);
    const v = { text, lx, units: d.dialect === "bpmn_xml" ? collapse(lx.tokens) : null, rd, gold: this.gold.get(d.id) ?? null };
    this.cache.set(d.id, v);
    return v;
  }
}
const readSets = (rd) => ({ beings: rd.beings.map((b) => `${b.id}|${b.kind}`), rels: rd.relations.map((r) => `${r.end1}|${r.label}|${r.end2}`) });
const goldSets = (g) => ({ beings: g.beings.map((b) => `${b.id}|${b.kind}`), rels: g.relations.map((r) => `${r.e1}|${r.label}|${r.e2}`) });
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ═══ R0 ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function r0(ctx) {
  const { split, priors, sel } = ctx;
  const idm = priors.identity?.models ?? {};
  if (!priors.identity || !Object.keys(idm).length) return unmeasured("r0", split, "prior_missing:identity");
  const Lw = L.L_WINDOW;
  const streams = [];
  const addDoc = (d, role, group) => {
    const text = ctx.text(d), g = ctx.gold.get(d.id) ?? null;
    const w = L.armWindows(d, text, g, { L: Lw, nMid: 2, rng: L.rngFor(SEED + "-r0", d.id) });
    streams.push({ doc: d.id, dialect: d.dialect, role, group, arm: "head", text: w.head });
    if (w.body) streams.push({ doc: d.id, dialect: d.dialect, role, group, arm: "body", text: w.body });
    w.mid.forEach((x, i) => streams.push({ doc: d.id, dialect: d.dialect, role, group, arm: "mid", text: x, i }));
  };
  for (const d of sel.bpmn) addDoc(d, "pos", "bpmn_xml");
  for (const d of sel.dot) addDoc(d, "pos", "dot");
  for (const [g, ds] of Object.entries(sel.neg)) for (const d of ds) addDoc(d, "neg", g);
  const verdict = (t) => A.identify(t, { priors });
  for (const s of streams) s.v = verdict(s.text);
  const named = (v) => v.system;
  const out = { by_dialect: {}, strangers: {}, cross: {}, charshuf: {} };
  const gaps = [];
  const measured = [];
  for (const D of DIALECTS) {
    const pos = streams.filter((s) => s.role === "pos" && s.dialect === D);
    const nDocs = new Set(pos.map((s) => s.doc)).size;
    const arms = {};
    for (const arm of ["head", "body", "mid"]) {
      const xs = pos.filter((s) => s.arm === arm);
      arms[arm] = { n: xs.length, tpr: xs.length ? f4(xs.filter((s) => named(s.v) === D).length / xs.length) : null, named_other_dialect: xs.length ? f4(xs.filter((s) => named(s.v) && named(s.v) !== D).length / xs.length) : null,
        median_first_named_chars: L.median(xs.map((s) => s.v.first_named_at?.[D]).filter((x) => x != null)) };
    }
    // diagnostic (not in the rule): how many mid windows are truly COLD (no declaration left in them), and the TPR on those alone
    const declared = (t) => (D === "bpmn_xml" ? /xmlns/.test(t) : /\b(?:di)?graph\b/i.test(t));
    const mids = pos.filter((s) => s.arm === "mid"), cold = mids.filter((s) => !declared(s.text));
    const cold_mid = { n: cold.length, share_of_mid: mids.length ? f4(cold.length / mids.length) : null, tpr: cold.length ? f4(cold.filter((s) => named(s.v) === D).length / cold.length) : null };
    out.by_dialect[D] = { docs: nDocs, arms, cold_mid };
    if (nDocs >= MIN_DOCS) measured.push(D); else gaps.push(gap(`dialect_below_min_docs:${D}`, nDocs, { min: MIN_DOCS }));
  }
  // A8: EXPECTED stranger kinds. A kind with no stream in this split is a typed gap with its denominators, never a silent absence (CMMN: 60 train / 6 dev / 0 test).
  const absentGaps = absentStrangerGaps(sel.neg, ctx.m);
  gaps.push(...absentGaps);
  const absent = absentGaps.map((g) => g.reason.split(":")[1]);
  // A6: a prose language removed for its licence is a typed gap (unmeasured), never a silent pass
  for (const [stem, x] of Object.entries(ctx.m?.licence_audit?.prose_excluded ?? {})) gaps.push(gap(`prose_language_excluded_licence:${stem}`, 0, { treebank: x.treebank, why: x.why }));
  // strangers, pooled per kind and per arm
  for (const g of Object.keys(sel.neg)) {
    const xs = streams.filter((s) => s.role === "neg" && s.group === g);
    const per = {};
    for (const arm of ["head", "body", "mid"]) { const ys = xs.filter((s) => s.arm === arm); if (ys.length) per[arm] = { n: ys.length, named: f4(ys.filter((s) => named(s.v)).length / ys.length) }; }
    out.strangers[g] = { n: xs.length, docs: new Set(xs.map((s) => s.doc)).size, named_rate: f4(xs.filter((s) => named(s.v)).length / xs.length), named_as: Object.fromEntries(DIALECTS.map((D) => [D, f4(xs.filter((s) => named(s.v) === D).length / xs.length)])), by_arm: per };
  }
  // cross-dialect confusion
  for (const D of DIALECTS) { const xs = streams.filter((s) => s.role === "pos" && s.dialect === D); const other = DIALECTS.find((x) => x !== D); out.cross[`${D}_named_${other}`] = xs.length ? f4(xs.filter((s) => named(s.v) === other).length / xs.length) : null; }
  // charshuf control (head and the first mid window of every positive document). A1: the RULE uses the GLOBAL derangement; the registered word-wise
  // derangement is reported beside it (charshuf_word) with the share of its windows in which the notation visibly survived
  out.charshuf_word = {};
  for (const D of DIALECTS) {
    const xs = streams.filter((s) => s.role === "pos" && s.dialect === D && (s.arm === "head" || (s.arm === "mid" && s.i === 0)));
    const sh = xs.map((s) => charDerangeGlobal(s.text, L.rngFor(SEED + "-csg", `${s.doc}-${s.arm}`)));
    const vs = sh.map(verdict);
    out.charshuf[D] = { n: xs.length, named_as_D: xs.length ? f4(vs.filter((v) => v.system === D).length / xs.length) : null, named_any: xs.length ? f4(vs.filter((v) => v.system).length / xs.length) : null };
    const sw = xs.map((s) => charDerange(s.text, L.rngFor(SEED + "-cs", `${s.doc}-${s.arm}`)));
    const vw = sw.map(verdict);
    const survives = (t) => (D === "dot" ? (t.match(/\b[\w.]+\s*(?:->|--)\s*[\w.]+/g) ?? []).length >= 3 : (t.match(/<[\w]*:?(?:task|sequenceFlow|startEvent|endEvent|userTask)\b/g) ?? []).length >= 3);
    const surv = sw.map(survives);
    const named = vw.map((v) => v.system === D);
    out.charshuf_word[D] = { n: xs.length, named_as_D: xs.length ? f4(named.filter(Boolean).length / xs.length) : null, windows_where_notation_survived: surv.filter(Boolean).length, named_among_survivors: surv.filter(Boolean).length ? f4(named.filter((x, i) => x && surv[i]).length / surv.filter(Boolean).length) : null, named_among_destroyed: surv.filter((x) => !x).length ? f4(named.filter((x, i) => x && !surv[i]).length / surv.filter((x) => !x).length) : null };
  }
  // diagnostics: unigram (no transition evidence), no_decay
  out.diagnostics = {};
  for (const [name, opt] of [["unigram", { bigram: false }], ["no_decay", { decay: false }]]) {
    out.diagnostics[name] = {};
    for (const D of DIALECTS) {
      const pos = streams.filter((s) => s.role === "pos" && s.dialect === D && s.arm !== "head"), neg = streams.filter((s) => s.role === "neg");
      out.diagnostics[name][D] = { tpr_body_mid: pos.length ? f4(pos.filter((s) => A.identify(s.text, { priors, ...opt }).system === D).length / pos.length) : null, stranger_named: neg.length ? f4(neg.filter((s) => A.identify(s.text, { priors, ...opt }).system).length / neg.length) : null };
    }
  }
  // C0 causal (A5): per dialect, N_CAUSAL positive documents drawn stratified by SOURCE; their head, body and first mid windows; cuts at 25/50/75% of each stream. The first-named
  // position of each dialect at or before a cut must agree between the prefix and the full stream. Standing mutation licence: a deliberately non-causal identifier (the threshold of the
  // dialect scaled by the whole stream's length) is run on the SAME streams and must be caught.
  out.causal = { checks: 0, violations: 0, streams: 0, by_dialect: {}, mutant: {} };
  for (const D of DIALECTS) {
    const docsD = D === "bpmn_xml" ? sel.bpmn : sel.dot;
    if (!docsD.length) continue;
    const samp = causalSample(docsD, `c0-${D}`), ids = new Set(samp.docs.map((d) => d.id));
    const ss = streams.filter((s_) => s_.role === "pos" && s_.dialect === D && ids.has(s_.doc) && (s_.arm !== "mid" || s_.i === 0));
    const real = c0Check(ss, verdict, { fulls: ss.map((s_) => s_.v) });
    const mut = c0Check(ss, mutantIdentify(priors, D));
    const rb = real.by_dialect[D] ?? { own_checks: 0, own_violations: 0 }, mb = mut.by_dialect[D] ?? { own_checks: 0, own_violations: 0 };
    const arms = {}; for (const s_ of ss) arms[s_.arm] = (arms[s_.arm] ?? 0) + 1;
    out.causal.by_dialect[D] = { ...sampleInfo(samp), streams: ss.length, arms, checks: real.checks, violations: real.violations, own_checks: rb.own_checks, own_violations: rb.own_violations };
    out.causal.mutant[D] = { checks: mb.own_checks, violations: mb.own_violations, rate: rate(mb.own_violations, mb.own_checks), mutant: `identifier threshold of ${D} scaled by len/500 of the whole stream` };
    out.causal.checks += real.checks; out.causal.violations += real.violations; out.causal.streams += ss.length;
  }
  // pass rule
  const checks = {};
  let score = null, ctrl = null;
  if (measured.length) {
    const tprs = [];
    for (const D of measured) {
      const a = out.by_dialect[D].arms, midMin = D === "bpmn_xml" ? 0.80 : 0.60;
      checks[`${D}.head>=0.95`] = a.head.tpr != null && a.head.tpr >= 0.95;
      checks[`${D}.body>=0.90`] = a.body.n ? a.body.tpr >= 0.90 : null;
      checks[`${D}.mid>=${midMin}`] = a.mid.tpr != null && a.mid.tpr >= midMin;
      checks[`${D}.charshuf<=0.05`] = out.charshuf[D].named_as_D != null && out.charshuf[D].named_as_D <= 0.05;
      const other = DIALECTS.find((x) => x !== D);
      checks[`${D}.confusion<=0.02`] = out.cross[`${D}_named_${other}`] == null || out.cross[`${D}_named_${other}`] <= 0.02;
      const mt = L.mean([a.head.tpr, a.body.tpr, a.mid.tpr].filter((x) => x != null));
      tprs.push(mt);
      checks[`${D}.L0a(real-charshuf>=0.5)`] = mt - (out.charshuf[D].named_as_D ?? 0) >= 0.5;
    }
    score = L.mean(tprs);
    let worst = 0;
    for (const [g, v] of Object.entries(out.strangers)) {
      if (v.n >= MIN_STREAMS) { checks[`stranger.${g}<=0.05`] = v.named_rate <= 0.05; worst = Math.max(worst, v.named_rate); }
      else gaps.push(gap(`stranger_kind_below_min_streams:${g}`, v.n, { min: MIN_STREAMS }));
    }
    ctrl = Math.max(worst, ...measured.map((D) => out.charshuf[D].named_as_D ?? 0));
    checks["C0.causal"] = out.causal.violations === 0;
    for (const D of measured) {
      const cd = out.causal.by_dialect[D];
      checks[`C0.causal.${D}`] = cd ? cd.violations === 0 : null;
      checks[`C0.coverage.${D}`] = cd ? cd.coverage_ok : null;
      checks[`C0.licence(mutant_caught).${D}`] = out.causal.mutant[D] ? out.causal.mutant[D].violations > 0 : null;
    }
  }
  const failed = Object.entries(checks).filter(([, v]) => v === false).map(([k]) => k);
  const nulls = Object.entries(checks).filter(([, v]) => v === null).map(([k]) => k);
  return mkRung("r0", split, {
    n: streams.length, score: f4(score), control: f4(ctrl), margin: score == null ? null : f4(score - ctrl),
    pass: measured.length ? (failed.length ? false : nulls.length ? null : true) : null,
    controls: { charshuf_named_as_D: Object.fromEntries(DIALECTS.map((D) => [D, out.charshuf[D].named_as_D])), stranger_named_rate: Object.fromEntries(Object.entries(out.strangers).map(([g, v]) => [g, v.named_rate])), cross_dialect: out.cross },
    gaps: [...gaps, ...Object.keys(A.UNREAD_DIALECTS).map((d) => gap(`dialect_unmeasured:${d}`, 1, { why: A.UNREAD_DIALECTS[d] }))],
    notes: [`window L=${Lw} chars; measured dialects: ${measured.join(",") || "none"}`, failed.length ? `FAILED CHECKS: ${failed.join("; ")}` : "all checks held", ...(nulls.length ? [`null checks: ${nulls.join("; ")}`] : []),
      ...(absent.length ? [`STRANGER KINDS NOT TESTED IN THIS SPLIT (typed gaps, A8): ${absent.join(", ")}`] : []),
      ...gaps.filter((g) => g.reason.startsWith("stranger_kind_below_min_streams")).map((g) => `stranger kind below ${MIN_STREAMS} streams (typed gap): ${g.reason.split(":")[1]} n=${g.count}`),
      ...gaps.filter((g) => g.reason.startsWith("prose_language_excluded_licence")).map((g) => `prose language excluded for its licence (typed gap, A6): ${g.reason.split(":")[1]}`)],
    details: { ...out, checks, failed, measured, expected_strangers: EXPECTED_STRANGERS, absent_stranger_kinds: absent },
  });
}

// ═══ R1 ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const wsUnits = (text) => { const out = []; const re = /\S+/g; let m; while ((m = re.exec(text))) { const w = m[0]; const kind = w.startsWith("</") ? "tag_end" : w.startsWith("<!--") ? "comment" : w.startsWith("<?xml") ? "decl" : w.startsWith("<?") ? "pi" : w.startsWith("<") ? (w.endsWith("/>") ? "tag_empty" : "tag_start") : "text"; out.push({ s: m.index, e: m.index + w.length, kind }); } return out; };
function regexUnits(text) {
  const out = []; let last = 0; const re = /<[^>]*>/g; let m;
  const text_ = (a, b) => { let s = a, e = b; while (s < e && /\s/.test(text[s])) s++; while (e > s && /\s/.test(text[e - 1])) e--; if (e > s) out.push({ s, e, kind: "text" }); };
  while ((m = re.exec(text))) {
    text_(last, m.index);
    const w = m[0], kind = w.startsWith("</") ? "tag_end" : w.startsWith("<!--") ? "comment" : w.startsWith("<?xml") ? "decl" : w.startsWith("<?") ? "pi" : w.endsWith("/>") ? "tag_empty" : "tag_start";
    out.push({ s: m.index, e: m.index + w.length, kind }); last = m.index + w.length;
  }
  text_(last, text.length);
  return out;
}
const shiftUnits = (us, k) => us.map((u) => ({ ...u, s: u.s + k, e: u.e + k }));
// ═══ causal checks (A5): the sampler, C0 per dialect and the standing NON-CAUSAL MUTANTS that license every causal check ═══════════════════════════
const CUTS = [0.25, 0.5, 0.75];
/** the documents one causal check prefix-tests: seeded and stratified by SOURCE (A5; `slice(0,100)` drew 100 documents of a single source) */
function causalSample(docs, label) {
  const pick = L.stratifiedSample(docs, N_CAUSAL, `${SEED}-causal-${label}`);
  const sources = {}; for (const d of pick) sources[d.source] = (sources[d.source] ?? 0) + 1;
  const inSplit = new Set(docs.map((d) => d.source)).size;
  return { docs: pick, sources, sources_in_split: inSplit, sources_sampled: Object.keys(sources).length, coverage_ok: Object.keys(sources).length >= Math.min(N_CAUSAL, inSplit) };
}
const sampleInfo = (s_) => ({ docs: s_.docs.length, sources: s_.sources, sources_in_split: s_.sources_in_split, sources_sampled: s_.sources_sampled, coverage_ok: s_.coverage_ok });
const rate = (v, n) => (n ? f4(v / n) : null);

/**
 * c0Check(streams, identifyFn, {cuts, fulls}) — streams = [{text, dialect}]; identifyFn(text) -> a verdict with first_named_at. For every cut (25/50/75% of the stream) the first-named
 * position of each dialect at or before the cut must agree between the verdict on the prefix and on the full stream; otherwise the verdict at an earlier position used something
 * that came later. Counted in total and per STREAM dialect (`own_*` = the stream's own dialect's first_named_at on its own streams). Exported: the unit tests drive it with a mutant.
 */
export function c0Check(streams, identifyFn, { cuts = CUTS, fulls = null } = {}) {
  const by = {}; let checks = 0, violations = 0;
  streams.forEach((s_, k) => {
    const full = fulls ? fulls[k] : identifyFn(s_.text);
    const b = (by[s_.dialect] ??= { streams: 0, checks: 0, violations: 0, own_checks: 0, own_violations: 0 });
    b.streams++;
    for (const f of cuts) {
      const t = Math.floor(s_.text.length * f), cut = identifyFn(s_.text.slice(0, t));
      for (const D of DIALECTS) {
        const pf = full.first_named_at?.[D], pc = cut.first_named_at?.[D];
        const bad = (pf != null && pf < t && pc !== pf) || (pc != null && pf !== pc);
        checks++; b.checks++; if (D === s_.dialect) b.own_checks++;
        if (bad) { violations++; b.violations++; if (D === s_.dialect) b.own_violations++; }
      }
    }
  });
  return { checks, violations, by_dialect: by };
}
/**
 * MUTANT identifier (A5, the review's M3/M5): the SPRT threshold of `mutate` is scaled by scale(len) of the WHOLE stream it is given (a whole-stream statistic used to judge earlier
 * units = lookahead). Everything else is A.identify's own path, so scale = () => 1 reproduces A.identify exactly (the unit tests check that).
 */
export function mutantIdentify(priors, mutate, { scale = (len) => len / 500 } = {}) {
  return (text) => {
    const idm = priors.identity.models;
    const mp = { identity: { ...priors.identity, models: { ...idm, [mutate]: { ...idm[mutate], sprt: { ...idm[mutate].sprt, A: idm[mutate].sprt.A * scale(text.length) } } } } };
    const idf = A.createIdentifier({ priors: mp });
    let st = idf.state();
    for (const d of DIALECTS) for (const it of A.symbolsOf(text, d, { priors, final: false })) st = idf.push(d, it);
    return st;
  };
}
/** MUTANT lexer (A5): the class of every attribute value (BPMN) or identifier/string (DOT) depends on the median value length over the WHOLE text (lookahead normalisation). */
export function mutantLex(priors, dialect) {
  const valueCls = dialect === "bpmn_xml" ? ["attr_value"] : ["id", "str"];
  return (text, final) => {
    const toks = A.lex(text, { priors, dialect, final }).tokens;
    const lens = toks.filter((t) => valueCls.includes(t.cls) && !t.partial).map((t) => t.e - t.s).sort((x, y) => x - y);
    const med = lens.length ? lens[lens.length >> 1] : 0;
    return toks.map((t) => (valueCls.includes(t.cls) && t.e - t.s > med ? { ...t, cls: `${t.cls}_long` } : t));
  };
}
/** MUTANT reader (A5, the review's M2): a being is kept only if a, possibly LATER, relation references it. */
export function mutantRead(priors, dialect) {
  return (text, final) => {
    const rd = A.read(text, { priors, dialect, final });
    const ref = new Set(rd.relations.flatMap((r) => [r.end1, r.end2]));
    return { ...rd, beings: rd.beings.filter((b) => ref.has(b.id)) };
  };
}
/**
 * lexPrefixViolations(text, lexFn, {cuts, full}) — C1 on ONE text: lexFn(text, final) -> tokens. The complete tokens of ear(prefix) must be the first tokens of ear(full), same span and
 * class, at every cut. `full` may be passed when the caller already holds ear(full). Exported (the unit tests drive it with the real ear and with mutantLex).
 */
export function lexPrefixViolations(text, lexFn, { cuts = CUTS, full = null } = {}) {
  const fullTokens = full ?? lexFn(text, true);
  let checks = 0, violations = 0;
  for (const f of cuts) {
    const cut = Math.floor(text.length * f);
    const pre = lexFn(text.slice(0, cut), false).filter((t) => !t.partial);
    checks++;
    let ok = pre.length <= fullTokens.length;
    for (let i = 0; ok && i < pre.length; i++) { const a = pre[i], b = fullTokens[i]; if (a.s !== b.s || a.e !== b.e || a.cls !== b.cls) ok = false; }
    if (!ok) violations++;
  }
  return { checks, violations };
}
/**
 * readPrefixViolations(text, readFn, dialect, {cuts, full}) — C34 on ONE text: readFn(text, final) -> {beings, relations} with `at`. Every being/relation with `at` <= the cut (DOT: < the cut)
 * must be the same in read(prefix) as in read(full). Exported (the unit tests drive it with the real reader and with mutantRead).
 */
export function readPrefixViolations(text, readFn, dialect, { cuts = CUTS, full = null } = {}) {
  const fullRd = full ?? readFn(text, true);
  let checks = 0, violations = 0;
  for (const f of cuts) {
    const cut = Math.floor(text.length * f);
    const pre = readFn(text.slice(0, cut), false);
    // an XML item ends at a '>' (closed: it cannot grow); a DOT item can end at an identifier that the next character could extend, so an item ending exactly
    // at the cut is undecidable from the prefix and is not compared (A2: the first DOT run counted it and reported 5 false violations)
    const inCut = (xs) => xs.filter((x) => (dialect === "dot" ? x.at < cut : x.at <= cut));
    const a = readSets({ beings: inCut(fullRd.beings), relations: inCut(fullRd.relations) }), b = readSets(pre);
    checks++;
    if (!sameSet(a.beings, b.beings) || !sameSet(a.rels, b.rels)) violations++;
  }
  return { checks, violations };
}
/** C1 over a stratified sample of documents. `mutant` = a (text, final) -> tokens function replacing the adapter. */
function causalLex(ctx, docs, dialect, { mutant = null } = {}) {
  const key = `c1|${dialect}|${mutant ? "m" : "r"}`;
  if (ctx.memo.has(key)) return ctx.memo.get(key);
  const samp = causalSample(docs, `c1-${dialect}`);
  const real = (t, final) => A.lex(t, { priors: ctx.priors, dialect, final }).tokens;
  let n = 0, viol = 0;
  for (const d of samp.docs) {
    const v = ctx.view(d);
    const r = mutant ? lexPrefixViolations(v.text, mutant) : lexPrefixViolations(v.text, real, { full: v.lx.tokens });
    n += r.checks; viol += r.violations;
  }
  const out = { checks: n, violations: viol, rate: rate(viol, n), ...sampleInfo(samp) };
  ctx.memo.set(key, out);
  return out;
}
const dotLexemes = (tokens) => { const set = new Set(); for (const t of tokens) if ((t.cls === "id" || t.cls === "str" || t.cls === "num" || t.cls === "html") && ["node_id", "attr_name", "attr_value", "graph_name"].includes(t.role) && !t.partial) set.add(t.v); return [...set]; };
const dotWs = (text) => [...new Set((text.match(/\S+/g) ?? []).map((w) => (w.startsWith('"') && w.endsWith('"') && w.length > 1 ? w.slice(1, -1) : w)))];
const dotRegex = (text) => [...new Set((text.match(/"(?:[^"\\]|\\.)*"|[A-Za-z0-9_.\u0080-￿]+/g) ?? []).map((w) => (w.startsWith('"') ? w.slice(1, -1).replace(/\\"/g, '"') : w)))];

function r1(ctx) {
  const { split, sel } = ctx;
  const out = { bpmn_xml: null, dot: null };
  const gaps = [], checks = {}, controls = {};
  let score = null, ctrl = null, n = 0;
  // BPMN
  const bd = sel.bpmn.filter((d) => ctx.gold.get(d.id));
  const bUse = bd.filter((d) => !ctx.gold.get(d.id).has_doctype);
  if (bd.length - bUse.length) gaps.push(gap("doctype_documents_excluded_from_r1", bd.length - bUse.length));
  if (bUse.length >= MIN_DOCS) {
    const real = [], ws = [], rx = [], sh = [], mis = [];
    const perReal = [], perWs = [], perRx = [];
    const attrPairs = [];
    const keysG = [];
    bUse.forEach((d, i) => {
      const v = ctx.view(d), g = v.gold, gu = goldUnits(g);
      const gk = unitKeys(gu);
      keysG.push(gk);
      const rk = unitKeys(v.units);
      real.push({ pred: rk, gold: gk });
      const wk = unitKeys(wsUnits(v.text)), xk = unitKeys(regexUnits(v.text)), sk = unitKeys(shiftUnits(v.units, 1));
      ws.push({ pred: wk, gold: gk }); rx.push({ pred: xk, gold: gk }); sh.push({ pred: sk, gold: gk });
      perReal.push(docF1(rk, gk)); perWs.push(docF1(wk, gk)); perRx.push(docF1(xk, gk));
      // attributes over the start tags the reader heard exactly
      const heard = new Map(v.units.filter((u) => u.kind === "tag_start" || u.kind === "tag_empty").map((u) => [`${u.s}:${u.e}:${u.kind}`, u]));
      const pa = [], ga = [];
      g.units.forEach((u, k) => {
        if (u[2] !== "tag_start" && u[2] !== "tag_empty") return;
        const r = heard.get(`${u[0]}:${u[1]}:${u[2]}`); if (!r) return;
        (g.attrs[String(k)] ?? []).forEach(([name, value], j) => ga.push(`${d.id}|${u[0]}|${j}|${name}|${value}`));
        r.attrs.forEach((a, j) => pa.push(`${d.id}|${u[0]}|${j}|${a.name}|${a.value}`));
      });
      attrPairs.push({ pred: pa, gold: ga });
    });
    bUse.forEach((d, i) => { const j = (i + 1) % bUse.length; mis.push({ pred: unitKeys(ctx.view(d).units), gold: keysG[j] }); });
    const R = microF1(real), W = microF1(ws), X = microF1(rx), S = microF1(sh), M = microF1(mis), AT = microF1(attrPairs);
    const signWs = signVs(perReal, perWs), signRx = signVs(perReal, perRx);
    const c1 = causalLex(ctx, bUse, "bpmn_xml"), c1m = causalLex(ctx, bUse, "bpmn_xml", { mutant: mutantLex(ctx.priors, "bpmn_xml") });
    out.bpmn_xml = { docs: bUse.length, units: { gold: R.ng, pred: R.np, f1: f4(R.f1), precision: f4(R.precision), recall: f4(R.recall) }, attributes: { f1: f4(AT.f1), gold: AT.ng, pred: AT.np }, controls: { ws_split: f4(W.f1), naive_regex: f4(X.f1), shifted: f4(S.f1), misaligned: f4(M.f1) }, sign: { vs_ws_split: signWs, vs_naive_regex: signRx }, causal: { ...c1, mutant: { checks: c1m.checks, violations: c1m.violations, rate: c1m.rate } }, docs_with_unit_errors: perReal.filter((x) => x < 1).length };
    checks["bpmn.unit_f1>=0.995"] = R.f1 >= 0.995; checks["bpmn.attr_f1>=0.995"] = AT.f1 >= 0.995;
    checks["bpmn.beats_ws(sign)"] = signWs.p <= ALPHA; checks["bpmn.beats_regex(sign)"] = signRx.p <= ALPHA;
    checks["bpmn.shifted<=0.20"] = S.f1 <= 0.20; checks["bpmn.misaligned<=0.20"] = M.f1 <= 0.20; checks["bpmn.C1.causal"] = c1.violations === 0;
    checks["bpmn.C1.coverage"] = c1.coverage_ok; checks["bpmn.C1.licence(mutant_caught)"] = c1m.violations > 0;
    controls.bpmn_xml = out.bpmn_xml.controls;
    score = R.f1; ctrl = Math.max(W.f1, X.f1, S.f1, M.f1); n += bUse.length;
  } else gaps.push(gap("dialect_below_min_docs:bpmn_xml", bUse.length, { min: MIN_DOCS }));
  // DOT
  const dd = sel.dot.filter((d) => ctx.gold.get(d.id));
  if (dd.length >= MIN_DOCS) {
    const real = [], ws = [], rx = [], mis = [], pr = [], pw = [], px = [], gs = [];
    dd.forEach((d) => {
      const v = ctx.view(d), g = v.gold;
      const gset = Object.keys(g.strings);
      gs.push(gset);
      const rk = dotLexemes(v.lx.tokens), wk = dotWs(v.text), xk = dotRegex(v.text);
      real.push({ pred: rk, gold: gset }); ws.push({ pred: wk, gold: gset }); rx.push({ pred: xk, gold: gset });
      pr.push(docF1(rk, gset)); pw.push(docF1(wk, gset)); px.push(docF1(xk, gset));
    });
    dd.forEach((d, i) => mis.push({ pred: dotLexemes(ctx.view(d).lx.tokens), gold: gs[(i + 1) % dd.length] }));
    const R = microF1(real), W = microF1(ws), X = microF1(rx), M = microF1(mis);
    const sW = signVs(pr, pw), sX = signVs(pr, px);
    const c1 = causalLex(ctx, dd, "dot"), c1m = causalLex(ctx, dd, "dot", { mutant: mutantLex(ctx.priors, "dot") });
    out.dot = { docs: dd.length, f1: f4(R.f1), precision: f4(R.precision), recall: f4(R.recall), controls: { ws_split: f4(W.f1), naive_regex: f4(X.f1), misaligned: f4(M.f1) }, sign: { vs_ws_split: sW, vs_naive_regex: sX }, causal: { ...c1, mutant: { checks: c1m.checks, violations: c1m.violations, rate: c1m.rate } } };
    checks["dot.f1>=0.98"] = R.f1 >= 0.98; checks["dot.beats_ws(sign)"] = sW.p <= ALPHA; checks["dot.beats_regex(sign)"] = sX.p <= ALPHA; checks["dot.misaligned<=0.20"] = M.f1 <= 0.20; checks["dot.C1.causal"] = c1.violations === 0;
    checks["dot.C1.coverage"] = c1.coverage_ok; checks["dot.C1.licence(mutant_caught)"] = c1m.violations > 0;
    controls.dot = out.dot.controls;
    score = score == null ? R.f1 : L.mean([score, R.f1]); ctrl = Math.max(ctrl ?? 0, W.f1, X.f1, M.f1); n += dd.length;
  } else gaps.push(gap("dialect_below_min_docs:dot", dd.length, { min: MIN_DOCS }));
  const failed = Object.entries(checks).filter(([, v]) => v === false).map(([k]) => k);
  const any = Object.keys(checks).length > 0;
  return mkRung("r1", split, { n, score: f4(score), control: f4(ctrl), margin: score == null ? null : f4(score - ctrl), pass: any ? failed.length === 0 : null, controls, gaps, notes: [failed.length ? `FAILED CHECKS: ${failed.join("; ")}` : any ? "all checks held" : "unmeasured"], details: { ...out, checks, failed } });
}

// ═══ R2 ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function tagIndex(v) { const m = new Map(); for (const u of v.units) if (u.kind === "tag_start" || u.kind === "tag_empty") m.set(`${u.s}:${u.e}`, u); return m; }
function r2(ctx) {
  const { split, sel, priors } = ctx;
  const gaps = [], checks = {}, details = {}, controls = {};
  let score = null, ctrl = null, n = 0;
  const bd = sel.bpmn.filter((d) => ctx.gold.get(d.id));
  if (bd.length >= MIN_DOCS) {
    const el = [], at = [], tx = [], beingPairs = [];
    const lex = priors.bpmn;
    for (const d of bd) {
      const v = ctx.view(d), g = v.gold, tagAt = tagIndex(v);
      const textAt = new Map(v.units.filter((u) => u.kind === "text").map((u) => [`${u.s}:${u.e}`, u]));
      for (const [k, ns, local, cls] of g.elems) {
        const gu = g.units[k], r = tagAt.get(`${gu[0]}:${gu[1]}`);
        const pred = r && r.name && (gu[2] === "tag_start" || gu[2] === "tag_empty") && r.kind === gu[2] ? r.name.role : null;
        const blind = ns && ns !== lex.namespaces.model && !lex.namespaces.di.includes(ns) ? "ext" : (lex.elements[local]?.cls ?? (lex.di_elements[local] ? "diagram" : "ext"));
        el.push({ gold: cls, pred, blind, matched: pred != null });
      }
      for (const [k, roles] of g.aroles) {
        const gu = g.units[k], r = tagAt.get(`${gu[0]}:${gu[1]}`), ga = g.attrs[String(k)] ?? [];
        roles.forEach((role, j) => { const ra = r?.attrs[j]; at.push({ gold: role, pred: ra && ra.name === ga[j]?.[0] ? ra.nameTok.role : null }); });
      }
      for (const [k, role] of g.troles) { const gu = g.units[k], r = textAt.get(`${gu[0]}:${gu[1]}`); tx.push({ gold: role, pred: r ? r.tok.role : null }); }
    }
    const acc = (xs) => (xs.length ? xs.filter((x) => x.pred === x.gold).length / xs.length : null);
    const majority = (xs) => { const c = {}; for (const x of xs) c[x.gold] = (c[x.gold] ?? 0) + 1; const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return { cls: top?.[0], acc: top ? top[1] / xs.length : null }; };
    const shuffledAcc = (xs, label) => { const m = xs.filter((x) => x.pred != null); const preds = derange(m.map((x) => x.pred), L.rngFor(SEED + "-r2", label)); return m.length ? m.filter((x, i) => preds[i] === x.gold).length / xs.length : null; };
    const elAcc = acc(el), atAcc = acc(at), txAcc = acc(tx);
    const elMaj = majority(el), atMaj = majority(at);
    const elSh = shuffledAcc(el, "el"), atSh = shuffledAcc(at, "at");
    // can_name_a_being
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const x of el) { const gp = BEING_CLASSES.has(x.gold), pp = BEING_CLASSES.has(x.pred); if (gp && pp) tp++; else if (pp) fp++; else if (gp) fn++; else tn++; }
    const beingF1 = tp ? (2 * tp) / (2 * tp + fp + fn) : 0;
    // per-class table and the prior-vs-XSD table agreement
    const perClass = {}; for (const x of el) { const c = perClass[x.gold] ??= { n: 0, ok: 0 }; c.n++; if (x.pred === x.gold) c.ok++; }
    const xsd = fs.existsSync(path.join(ctx.dir, "gold", "xsd-classes.json")) ? JSON.parse(fs.readFileSync(path.join(ctx.dir, "gold", "xsd-classes.json"), "utf8")) : null;
    let tableAgree = null;
    if (xsd) {
      const names = Object.keys(xsd.elements).filter((n) => n in lex.elements);
      const same = names.filter((n) => xsd.elements[n] === lex.elements[n].cls);
      let aN = 0, aSame = 0; const aDiff = {};
      for (const n of names) for (const [a, role] of Object.entries(xsd.attr_roles[n] ?? {})) { aN++; const pr = lex.elements[n].attrs[a] ?? (a === "id" ? "decl" : a === "name" ? "label" : "other"); if (pr === role) aSame++; else { const k = `${a}:${role}->${pr}`; aDiff[k] = (aDiff[k] ?? 0) + 1; } }
      tableAgree = { element_names_compared: names.length, element_class_agree: same.length, element_class_disagree: names.filter((x) => !same.includes(x)).slice(0, 12), attr_roles_compared: aN, attr_roles_agree: aSame, attr_role_disagreements_top: Object.entries(aDiff).sort((a, b) => b[1] - a[1]).slice(0, 10) };
    }
    const errTop = {}; for (const x of at) if (x.pred !== x.gold) { const k = `${x.gold}->${x.pred}`; errTop[k] = (errTop[k] ?? 0) + 1; }
    const elErr = {}; for (const x of el) if (x.pred !== x.gold) { const k = `${x.gold}->${x.pred}`; elErr[k] = (elErr[k] ?? 0) + 1; }
    details.bpmn_xml = { docs: bd.length, element: { n: el.length, accuracy: f4(elAcc), majority: { cls: elMaj.cls, acc: f4(elMaj.acc) }, label_shuffled: f4(elSh), ns_blind_reference: f4(el.filter((x) => x.blind === x.gold).length / el.length), per_class: perClass, errors_top: Object.entries(elErr).sort((a, b) => b[1] - a[1]).slice(0, 8) },
      attribute: { n: at.length, accuracy: f4(atAcc), majority: { cls: atMaj.cls, acc: f4(atMaj.acc) }, label_shuffled: f4(atSh), errors_top: Object.entries(errTop).sort((a, b) => b[1] - a[1]).slice(0, 8) },
      text: { n: tx.length, accuracy: f4(txAcc) }, can_name_a_being: { f1: f4(beingF1), tp, fp, fn, tn }, table_agreement_prior_vs_xsd: tableAgree };
    checks["bpmn.element_acc>=0.98"] = elAcc >= 0.98; checks["bpmn.attr_acc>=0.97"] = atAcc >= 0.97; checks["bpmn.text_acc>=0.98"] = tx.length ? txAcc >= 0.98 : null; checks["bpmn.can_name_f1>=0.98"] = beingF1 >= 0.98;
    checks["bpmn.element-majority>=0.20"] = elAcc - elMaj.acc >= 0.20; checks["bpmn.element-shuffled>=0.40"] = elAcc - elSh >= 0.40;
    checks["bpmn.attr-majority>=0.20"] = atAcc - atMaj.acc >= 0.20; checks["bpmn.attr-shuffled>=0.40"] = atAcc - atSh >= 0.40;
    controls.bpmn_xml = { majority_element: f4(elMaj.acc), label_shuffled_element: f4(elSh), majority_attr: f4(atMaj.acc), label_shuffled_attr: f4(atSh) };
    score = elAcc; ctrl = Math.max(elMaj.acc, elSh); n += el.length + at.length + tx.length;
  } else gaps.push(gap("dialect_below_min_docs:bpmn_xml", bd.length, { min: MIN_DOCS }));
  const dd = sel.dot.filter((d) => ctx.gold.get(d.id));
  if (dd.length >= MIN_DOCS) {
    const items = []; let ambiguous = 0;
    for (const d of dd) {
      const v = ctx.view(d), g = v.gold;
      const byStr = new Map();
      for (const t of v.lx.tokens) if ((t.cls === "id" || t.cls === "str" || t.cls === "num" || t.cls === "html") && !t.partial && t.role) { const s_ = byStr.get(t.v) ?? new Set(); s_.add(t.role); byStr.set(t.v, s_); }
      for (const [str, roles] of Object.entries(g.strings)) {
        if (roles.length !== 1) { ambiguous++; continue; }
        const rs = byStr.get(str); const pred = rs && rs.size === 1 ? [...rs][0] : null;
        items.push({ gold: roles[0], pred });
      }
    }
    const acc = items.filter((x) => x.pred === x.gold).length / items.length;
    const c = {}; for (const x of items) c[x.gold] = (c[x.gold] ?? 0) + 1;
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    const maj = top[1] / items.length;
    const m = items.filter((x) => x.pred != null); const preds = derange(m.map((x) => x.pred), L.rngFor(SEED + "-r2", "dot"));
    const shAcc = m.filter((x, i) => preds[i] === x.gold).length / items.length;
    details.dot = { docs: dd.length, n: items.length, accuracy: f4(acc), majority: { cls: top[0], acc: f4(maj) }, label_shuffled: f4(shAcc), excluded_multi_role_strings: ambiguous, unheard: items.filter((x) => x.pred == null).length };
    checks["dot.acc>=0.95"] = acc >= 0.95; checks["dot.majority>=0.20"] = acc - maj >= 0.20; checks["dot.shuffled>=0.40"] = acc - shAcc >= 0.40;
    controls.dot = { majority: f4(maj), label_shuffled: f4(shAcc) };
    score = score == null ? acc : L.mean([score, acc]); ctrl = Math.max(ctrl ?? 0, maj, shAcc); n += items.length;
  } else gaps.push(gap("dialect_below_min_docs:dot", dd.length, { min: MIN_DOCS }));
  const failed = Object.entries(checks).filter(([, v]) => v === false).map(([k]) => k);
  const nulls = Object.entries(checks).filter(([, v]) => v === null).map(([k]) => k);
  return mkRung("r2", split, { n, score: f4(score), control: f4(ctrl), margin: score == null ? null : f4(score - ctrl), pass: Object.keys(checks).length ? (failed.length ? false : nulls.length ? null : true) : null, controls, gaps,
    notes: [failed.length ? `FAILED CHECKS: ${failed.join("; ")}` : Object.keys(checks).length ? "all checks held" : "unmeasured", "the class tables of the prior (moddle) and of the gold (XSD) are two artifacts of one standard; their disagreements are charged to the reader (see table_agreement_prior_vs_xsd)"], details: { ...details, checks, failed } });
}

// ═══ R3 / R4 ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** the any_id control: every start tag with an id attribute is a being (kind = local name), from the ear's tokens only */
function anyIdBeings(v) { const out = []; for (const u of v.units) if ((u.kind === "tag_start" || u.kind === "tag_empty") && u.name) { const id = u.attrs.find((a) => a.name === "id" && a.value != null); if (id) out.push(`${id.value}|${u.name.local}`); } return out; }
const lexiconBeingNoNs = (v, lex) => { const out = []; for (const u of v.units) if ((u.kind === "tag_start" || u.kind === "tag_empty") && u.name) { const c = lex.elements[u.name.local]?.cls; const id = u.attrs.find((a) => a.name === "id" && a.value != null); if (c && BEING_CLASSES.has(c) && id) out.push(`${id.value}|${u.name.local}`); } return out; };
const dotAnyId = (v) => [...new Set(v.lx.tokens.filter((t) => (t.cls === "id" || t.cls === "str" || t.cls === "num" || t.cls === "html") && !t.partial).map((t) => t.v))];
/** C34 over a stratified sample of documents. `mutant` = a (text, final) -> reading function replacing the adapter. */
function causalRead(ctx, docs, dialect, { mutant = null } = {}) {
  const key = `c34|${dialect}|${mutant ? "m" : "r"}`;
  if (ctx.memo.has(key)) return ctx.memo.get(key);
  const samp = causalSample(docs, `c34-${dialect}`);
  const real = (t, final) => A.read(t, { priors: ctx.priors, dialect, final });
  let n = 0, viol = 0;
  for (const d of samp.docs) {
    const v = ctx.view(d);
    const r = mutant ? readPrefixViolations(v.text, mutant, dialect) : readPrefixViolations(v.text, real, dialect, { full: v.rd });
    n += r.checks; viol += r.violations;
  }
  const out = { checks: n, violations: viol, rate: rate(viol, n), ...sampleInfo(samp) };
  ctx.memo.set(key, out);
  return out;
}
function r3(ctx) {
  const { split, sel, priors } = ctx;
  const gaps = [], checks = {}, details = {}, controls = {};
  let score = null, ctrl = null, n = 0;
  const bd = sel.bpmn.filter((d) => ctx.gold.get(d.id));
  if (bd.length >= MIN_DOCS) {
    const real = [], anyid = [], mis = [], kind = [], noNs = [];
    const gl = bd.map((d) => ctx.gold.get(d.id).beings.map((b) => `${b.id}|${b.kind}`));
    const rl = bd.map((d) => ctx.view(d).rd.beings.map((b) => `${b.id}|${b.kind}`));
    const allKinds = rl.flat().map((k) => k.split("|").slice(1).join("|"));
    const dk = derange(allKinds, L.rngFor(SEED + "-r3", "kind")); let p = 0;
    bd.forEach((d, i) => {
      const v = ctx.view(d);
      real.push({ pred: rl[i], gold: gl[i] });
      anyid.push({ pred: anyIdBeings(v), gold: gl[i] });
      mis.push({ pred: rl[i], gold: gl[(i + 1) % bd.length] });
      kind.push({ pred: rl[i].map((k) => `${k.split("|")[0]}|${dk[p++]}`), gold: gl[i] });
      noNs.push({ pred: lexiconBeingNoNs(v, priors.bpmn), gold: gl[i] });
    });
    const R = microF1(real), AN = microF1(anyid), MI = microF1(mis), KI = microF1(kind), NN = microF1(noNs);
    const pr = real.map((x) => docF1(x.pred, x.gold)), sA = signVs(pr, anyid.map((x) => docF1(x.pred, x.gold))), sM = signVs(pr, mis.map((x) => docF1(x.pred, x.gold))), sK = signVs(pr, kind.map((x) => docF1(x.pred, x.gold)));
    // per-class F1, label accuracy, span exactness
    const cls = {}; const spanOk = { n: 0, ok: 0 }, lab = { n: 0, ok: 0 };
    bd.forEach((d, i) => {
      const g = ctx.gold.get(d.id), rd = ctx.view(d).rd;
      const gset = new Map(g.beings.map((b) => [`${b.id}|${b.kind}`, b])); const rset = new Map(rd.beings.map((b) => [`${b.id}|${b.kind}`, b]));
      for (const [k, b] of gset) { const c = cls[b.cls] ??= { gold: 0, tp: 0, pred: 0 }; c.gold++; if (rset.has(k)) { c.tp++; const rb = rset.get(k); spanOk.n++; const gu = g.units[b.unit]; if (rb.span[0] === gu[0] && rb.span[1] === gu[1]) spanOk.ok++; lab.n++; if ((rb.label ?? null) === (b.name ?? null)) lab.ok++; } }
      for (const [k, b] of rset) { const c = cls[b.cls] ??= { gold: 0, tp: 0, pred: 0 }; c.pred++; }
    });
    const perClass = {}; for (const [c, x] of Object.entries(cls)) perClass[c] = { gold: x.gold, pred: x.pred, tp: x.tp, f1: x.gold + x.pred ? f4((2 * x.tp) / (x.gold + x.pred)) : null };
    const causal = causalRead(ctx, bd, "bpmn_xml");
    const unres = {}; for (const d of bd) for (const g of ctx.view(d).rd.gaps) unres[g.reason] = (unres[g.reason] ?? 0) + g.count;
    details.bpmn_xml = { docs: bd.length, gold_beings: R.ng, pred_beings: R.np, f1: f4(R.f1), precision: f4(R.precision), recall: f4(R.recall), per_class: perClass, label_accuracy: f4(lab.ok / lab.n), span_exact: f4(spanOk.ok / spanOk.n), controls: { any_id: f4(AN.f1), misaligned: f4(MI.f1), kind_shuffled: f4(KI.f1), no_ns_reference: f4(NN.f1) }, sign: { vs_any_id: sA, vs_misaligned: sM, vs_kind_shuffled: sK }, causal, reader_gaps: unres, docs_with_errors: pr.filter((x) => x < 1).length };
    checks["bpmn.f1>=0.98"] = R.f1 >= 0.98;
    for (const [c, x] of Object.entries(perClass)) if (cls[c].gold >= MIN_GOLD) checks[`bpmn.class.${c}>=0.95`] = x.f1 >= 0.95; else gaps.push(gap(`class_below_min_gold:${c}`, cls[c].gold, { min: MIN_GOLD }));
    const strongest = Math.max(AN.f1, MI.f1, KI.f1);
    checks["bpmn.margin>=0.10"] = R.f1 - strongest >= 0.10; checks["bpmn.sign(any_id)"] = sA.p <= ALPHA; checks["bpmn.sign(misaligned)"] = sM.p <= ALPHA; checks["bpmn.sign(kind_shuffled)"] = sK.p <= ALPHA;
    checks["bpmn.licence.misaligned"] = MI.f1 <= R.f1 - 0.30; checks["bpmn.licence.kind_shuffled"] = KI.f1 <= R.f1 - 0.30;
    controls.bpmn_xml = details.bpmn_xml.controls;
    score = R.f1; ctrl = strongest; n += R.ng;
  } else gaps.push(gap("dialect_below_min_docs:bpmn_xml", bd.length, { min: MIN_DOCS }));
  const dd = sel.dot.filter((d) => ctx.gold.get(d.id));
  if (dd.length >= MIN_DOCS) {
    const real = [], anyid = [], mis = [];
    const gl = dd.map((d) => ctx.gold.get(d.id).beings.map((b) => b.id)), rl = dd.map((d) => ctx.view(d).rd.beings.map((b) => b.id));
    dd.forEach((d, i) => { real.push({ pred: rl[i], gold: gl[i] }); anyid.push({ pred: dotAnyId(ctx.view(d)), gold: gl[i] }); mis.push({ pred: rl[i], gold: gl[(i + 1) % dd.length] }); });
    const R = microF1(real), AN = microF1(anyid), MI = microF1(mis);
    const pr = real.map((x) => docF1(x.pred, x.gold)), sA = signVs(pr, anyid.map((x) => docF1(x.pred, x.gold))), sM = signVs(pr, mis.map((x) => docF1(x.pred, x.gold)));
    const causal = causalRead(ctx, dd, "dot");
    details.dot = { docs: dd.length, gold_nodes: R.ng, pred_nodes: R.np, f1: f4(R.f1), precision: f4(R.precision), recall: f4(R.recall), controls: { any_id: f4(AN.f1), misaligned: f4(MI.f1) }, sign: { vs_any_id: sA, vs_misaligned: sM }, causal, docs_with_errors: pr.filter((x) => x < 1).length };
    checks["dot.f1>=0.97"] = R.f1 >= 0.97; checks["dot.margin>=0.10"] = R.f1 - Math.max(AN.f1, MI.f1) >= 0.10; checks["dot.sign(any_id)"] = sA.p <= ALPHA; checks["dot.sign(misaligned)"] = sM.p <= ALPHA;
    controls.dot = details.dot.controls;
    score = score == null ? R.f1 : L.mean([score, R.f1]); ctrl = Math.max(ctrl ?? 0, AN.f1, MI.f1); n += R.ng;
  } else gaps.push(gap("dialect_below_min_docs:dot", dd.length, { min: MIN_DOCS }));
  const failed = Object.entries(checks).filter(([, v]) => v === false).map(([k]) => k);
  return mkRung("r3", split, { n, score: f4(score), control: f4(ctrl), margin: score == null ? null : f4(score - ctrl), pass: Object.keys(checks).length ? failed.length === 0 : null, controls, gaps, notes: [failed.length ? `FAILED CHECKS: ${failed.join("; ")}` : Object.keys(checks).length ? "all checks held" : "unmeasured"], details: { ...details, checks, failed } });
}

/**
 * absentStrangerGaps(negBySplitKind, manifest) -> typed gaps for every EXPECTED stranger kind that has no document in the split (A8). `neg` = {kind: [docs]} of the split;
 * the manifest supplies the per-split denominators and the build's drop/cap statistics (why a kind is thin).
 */
export function absentStrangerGaps(neg, m, expected = EXPECTED_STRANGERS) {
  const mc = m?.counts ?? {}, mstats = m?.stats ?? {};
  const kindStats = { xml_cmmn: ["cmmn"], xml_dmn: ["dmn"], xml_other: ["xml", "xsd"] };
  const out = [];
  for (const g of expected) {
    if ((neg?.[g] ?? []).length) continue;
    const perSplit = Object.fromEntries(SPLITS.map((sp) => [sp, Object.entries(mc).filter(([k]) => k.startsWith(`${sp}|`) && k.endsWith(`|${g}`)).reduce((a_, [, v]) => a_ + v, 0)]));
    const why = {}; for (const suf of kindStats[g] ?? []) for (const [k, v] of Object.entries(mstats)) if (k.endsWith(`:${suf}`)) why[k] = v;
    out.push(gap(`stranger_kind_absent_in_split:${g}`, 0, { documents_per_split_in_manifest: perSplit, build_statistics: why }));
  }
  return out;
}

/** A7: the adjacent_flow control from an ordered list of ids (consecutive ids linked as `label`) */
export const adjacentFlow = (ids, label = "sequence_flow") => { const a = []; for (let k = 0; k + 1 < ids.length; k++) a.push(`${ids[k]}|${label}|${ids[k + 1]}`); return a; };
/** A7: the margin arithmetic with its CEILING: what a PERFECT reader (score 1) could reach against this control; `reachable` = ceiling >= the registered margin */
export function marginCeiling(real, control, rule = 0.5) {
  const ceiling = 1 - control;
  return { real: f4(real), control: f4(control), margin: f4(real - control), ceiling: f4(ceiling), rule, reachable: ceiling >= rule, held: real - control >= rule };
}
/** A7: how to read a failed margin check */
export const marginVerdict = (m) => (m.held ? "margin held" : m.reachable ? "FAIL-by-rule: the margin is reachable and the reader falls short of it" : `FAIL-by-rule: the registered margin ${m.rule} is UNREACHABLE for a perfect reader (ceiling ${m.ceiling} = 1 - control ${m.control}); the failure says nothing about the reader`);

function r4(ctx) {
  const { split, sel } = ctx;
  const gaps = [], checks = {}, details = {}, controls = {};
  let score = null, ctrl = null, n = 0;
  const bd = sel.bpmn.filter((d) => ctx.gold.get(d.id));
  if (bd.length >= MIN_DOCS) {
    const gl = bd.map((d) => ctx.gold.get(d.id).relations.map((r) => `${r.e1}|${r.label}|${r.e2}`));
    const rl = bd.map((d) => ctx.view(d).rd.relations.map((r) => `${r.end1}|${r.label}|${r.end2}`));
    const real = [], adjG = [], adjR = [], sw = [], mis = [];
    bd.forEach((d, i) => {
      const rd = ctx.view(d).rd, g = ctx.gold.get(d.id);
      real.push({ pred: rl[i], gold: gl[i] });
      // A7: adjacent_flow from the GOLD flow-node beings in document order (a degraded reader cannot weaken it) AND, as registered, from the reader's beings; the stronger is the control
      adjG.push({ pred: adjacentFlow(g.beings.filter((b) => b.cls === "flow_node").map((b) => b.id)), gold: gl[i] });
      adjR.push({ pred: adjacentFlow(rd.beings.filter((b) => b.cls === "flow_node").map((b) => b.id)), gold: gl[i] });
      sw.push({ pred: rd.relations.map((r) => `${r.end2}|${r.label}|${r.end1}`), gold: gl[i] });
      mis.push({ pred: rl[i], gold: gl[(i + 1) % bd.length] });
    });
    const ADG = microF1(adjG), ADR = microF1(adjR), adj = ADG.f1 >= ADR.f1 ? adjG : adjR, AD = ADG.f1 >= ADR.f1 ? ADG : ADR;
    const R = microF1(real), SW = microF1(sw), MI = microF1(mis);
    const pr = real.map((x) => docF1(x.pred, x.gold));
    const sA = signVs(pr, adj.map((x) => docF1(x.pred, x.gold))), sM = signVs(pr, mis.map((x) => docF1(x.pred, x.gold)));
    // resolved claim over matched relations
    let rn = 0, rok = 0; const unresolvedGold = { n: 0, caught: 0 };
    bd.forEach((d) => { const g = ctx.gold.get(d.id), rd = ctx.view(d).rd; const gm = new Map(g.relations.map((r) => [`${r.e1}|${r.label}|${r.e2}`, r.resolved])); for (const r of rd.relations) { const k = `${r.end1}|${r.label}|${r.end2}`; if (gm.has(k)) { rn++; if (gm.get(k) === r.resolved) rok++; if (!gm.get(k)) { unresolvedGold.n++; if (!r.resolved) unresolvedGold.caught++; } } } });
    const byLabel = {}; bd.forEach((d) => { for (const r of ctx.gold.get(d.id).relations) { const c = byLabel[r.label] ??= { gold: 0, tp: 0 }; c.gold++; } });
    bd.forEach((d) => { const rs = new Set(ctx.view(d).rd.relations.map((r) => `${r.end1}|${r.label}|${r.end2}`)); for (const r of ctx.gold.get(d.id).relations) if (rs.has(`${r.e1}|${r.label}|${r.e2}`)) byLabel[r.label].tp++; });
    const causal = causalRead(ctx, bd, "bpmn_xml"), causalM = causalRead(ctx, bd, "bpmn_xml", { mutant: mutantRead(ctx.priors, "bpmn_xml") });
    const ceil = marginCeiling(R.f1, Math.max(AD.f1, MI.f1), 0.5);
    details.bpmn_xml = { docs: bd.length, gold_relations: R.ng, pred_relations: R.np, f1: f4(R.f1), precision: f4(R.precision), recall: f4(R.recall), resolved_accuracy: f4(rok / rn), resolved_n: rn, unresolved_in_gold: unresolvedGold, per_label_recall: Object.fromEntries(Object.entries(byLabel).map(([k, v]) => [k, { gold: v.gold, recall: f4(v.tp / v.gold) }])),
      controls: { adjacent_flow: f4(AD.f1), swapped: f4(SW.f1), misaligned: f4(MI.f1) }, adjacent_flow_variants: { gold_built: f4(ADG.f1), reader_built_as_registered: f4(ADR.f1), used: ADG.f1 >= ADR.f1 ? "gold_built" : "reader_built" },
      sign: { vs_adjacent: sA, vs_misaligned: sM }, causal: { ...causal, mutant: { checks: causalM.checks, violations: causalM.violations, rate: causalM.rate } }, docs_with_errors: pr.filter((x) => x < 1).length,
      margin_ceiling: ceil, registered_verdict_note: marginVerdict(ceil) };
    checks["bpmn.f1>=0.98"] = R.f1 >= 0.98; checks["bpmn.resolved>=0.98"] = rok / rn >= 0.98; checks["bpmn.margin>=0.50"] = ceil.held;
    checks["bpmn.sign(adjacent)"] = sA.p <= ALPHA; checks["bpmn.sign(misaligned)"] = sM.p <= ALPHA;
    checks["bpmn.licence.swapped<=0.10"] = SW.f1 <= 0.10; checks["bpmn.licence.misaligned"] = MI.f1 <= R.f1 - 0.30; checks["bpmn.C34.causal"] = causal.violations === 0;
    checks["bpmn.C34.coverage"] = causal.coverage_ok; checks["bpmn.C34.licence(mutant_caught)"] = causalM.violations > 0;
    // A7: the evidence that DISCRIMINATES the reader from the controls, kept apart from the (possibly unreachable) registered margin
    details.bpmn_xml.discriminating_evidence = { sign_vs_adjacent: sA, sign_vs_misaligned: sM, swapped: f4(SW.f1), misaligned: f4(MI.f1), c34_violations: causal.violations,
      held: sA.p <= ALPHA && sM.p <= ALPHA && SW.f1 <= 0.10 && MI.f1 <= R.f1 - 0.30 && causal.violations === 0 && causalM.violations > 0 };
    controls.bpmn_xml = details.bpmn_xml.controls;
    score = R.f1; ctrl = Math.max(AD.f1, MI.f1); n += R.ng;
  } else gaps.push(gap("dialect_below_min_docs:bpmn_xml", bd.length, { min: MIN_DOCS }));
  const dd = sel.dot.filter((d) => ctx.gold.get(d.id));
  if (dd.length >= MIN_DOCS) {
    const gl = dd.map((d) => ctx.gold.get(d.id).relations.map((r) => `${r.e1}|${r.label}|${r.e2}`)), rl = dd.map((d) => ctx.view(d).rd.relations.map((r) => `${r.end1}|${r.label}|${r.end2}`));
    const real = [], adjG = [], adjR = [], sw = [], mis = []; let gGaps = 0, rGaps = 0;
    dd.forEach((d, i) => {
      const rd = ctx.view(d).rd, g = ctx.gold.get(d.id);
      real.push({ pred: rl[i], gold: gl[i] });
      // A7: as for BPMN, the control is the stronger of the gold-built (the gold's node list, pydot's order) and the reader-built (first appearance) consecutive-node chain
      adjG.push({ pred: adjacentFlow(g.beings.map((b) => b.id), g.directed === false ? "undirected" : "directed"), gold: gl[i] });
      adjR.push({ pred: adjacentFlow(rd.beings.map((b) => b.id), rd.directed === false ? "undirected" : "directed"), gold: gl[i] });
      sw.push({ pred: rd.relations.map((r) => `${r.end2}|${r.label}|${r.end1}`), gold: gl[i] });
      mis.push({ pred: rl[i], gold: gl[(i + 1) % dd.length] });
      gGaps += g.gaps?.compound_endpoint ?? 0; rGaps += rd.gaps.find((x) => x.reason === "compound_endpoint")?.count ?? 0;
    });
    const ADG = microF1(adjG), ADR = microF1(adjR), adj = ADG.f1 >= ADR.f1 ? adjG : adjR, AD = ADG.f1 >= ADR.f1 ? ADG : ADR;
    const R = microF1(real), SW = microF1(sw), MI = microF1(mis);
    const pr = real.map((x) => docF1(x.pred, x.gold)), sA = signVs(pr, adj.map((x) => docF1(x.pred, x.gold))), sM = signVs(pr, mis.map((x) => docF1(x.pred, x.gold)));
    const causal = causalRead(ctx, dd, "dot"), causalM = causalRead(ctx, dd, "dot", { mutant: mutantRead(ctx.priors, "dot") });
    const ceil = marginCeiling(R.f1, Math.max(AD.f1, MI.f1), 0.5);
    details.dot = { docs: dd.length, gold_edges: R.ng, pred_edges: R.np, f1: f4(R.f1), precision: f4(R.precision), recall: f4(R.recall), controls: { adjacent: f4(AD.f1), swapped: f4(SW.f1), misaligned: f4(MI.f1) }, adjacent_variants: { gold_built: f4(ADG.f1), reader_built_as_registered: f4(ADR.f1), used: ADG.f1 >= ADR.f1 ? "gold_built" : "reader_built" },
      sign: { vs_adjacent: sA, vs_misaligned: sM }, compound_endpoint_gaps: { gold: gGaps, reader: rGaps }, causal: { ...causal, mutant: { checks: causalM.checks, violations: causalM.violations, rate: causalM.rate } }, docs_with_errors: pr.filter((x) => x < 1).length,
      margin_ceiling: ceil, registered_verdict_note: marginVerdict(ceil) };
    checks["dot.f1>=0.95"] = R.f1 >= 0.95; checks["dot.margin>=0.50"] = ceil.held; checks["dot.swapped<=0.10"] = SW.f1 <= 0.10; checks["dot.C34.causal"] = causal.violations === 0;
    checks["dot.C34.coverage"] = causal.coverage_ok; checks["dot.C34.licence(mutant_caught)"] = causalM.violations > 0;
    controls.dot = details.dot.controls;
    score = score == null ? R.f1 : L.mean([score, R.f1]); ctrl = Math.max(ctrl ?? 0, AD.f1, MI.f1); n += R.ng;
  } else gaps.push(gap("dialect_below_min_docs:dot", dd.length, { min: MIN_DOCS }));
  const failed = Object.entries(checks).filter(([, v]) => v === false).map(([k]) => k);
  const marginNotes = Object.entries(details).filter(([, v]) => v?.margin_ceiling).map(([k, v]) => `${k}: ${v.registered_verdict_note}${v.discriminating_evidence ? `; discriminating evidence (sign tests, swapped, misaligned, C34 and its mutant licence) held = ${v.discriminating_evidence.held}` : ""}`);
  return mkRung("r4", split, { n, score: f4(score), control: f4(ctrl), margin: score == null ? null : f4(score - ctrl), pass: Object.keys(checks).length ? failed.length === 0 : null, controls, gaps, notes: [failed.length ? `FAILED CHECKS: ${failed.join("; ")}` : Object.keys(checks).length ? "all checks held" : "unmeasured", ...marginNotes], details: { ...details, checks, failed } });
}

// ═══ R5 ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** the literal_prefix control reader: it only knows elements written `bpmn:name`; regex over the raw text, no namespace resolution */
function literalPrefixRead(text, lex) {
  const beings = [], rels = [];
  const re = /<bpmn:([A-Za-z]+)\b([^>]*?)\/?>/g; let m;
  const attr = (s, n) => { const x = new RegExp(`\\b${n}="([^"]*)"`).exec(s); return x ? x[1] : null; };
  while ((m = re.exec(text))) {
    const name = m[1], id = attr(m[2], "id"), cls = lex.elements[name]?.cls;
    if (id && BEING_CLASSES.has(cls)) beings.push(`${id}|${name}`);
    const rule = lex.relation_rules[name];
    if (rule?.from) { const a = attr(m[2], rule.from), b = attr(m[2], rule.to); if (a && b) rels.push(`${a}|${rule.label}|${b}`); }
    else if (rule?.fromId && id) { const b = attr(m[2], rule.to); if (b) rels.push(`${id}|${rule.label}|${b}`); }
  }
  return { beings, rels };
}
function r5(ctx) {
  const { split, sel, priors, dir } = ctx;
  const gaps = [], checks = {}, details = {}, controls = {};
  const pathOf = (f) => path.join(dir, "gold", split, f);
  let scores = [], ctrls = [], n = 0;
  const bd = sel.bpmn.filter((d) => ctx.gold.get(d.id));
  const bIdx = new Map(bd.map((d, i) => [d.id, i]));
  // (i) re-serialisations
  const reps = arr(fs.existsSync(pathOf("reps.jsonl.gz")) ? zlibLines(pathOf("reps.jsonl.gz")) : []).filter((r) => bIdx.has(r.id));
  if (bd.length >= MIN_DOCS && reps.length >= MIN_DOCS) {
    const by = {};
    const orig = bd.map((d) => readSets(ctx.view(d).rd));
    const lit = {}; // literal-prefix reader agreement per rendering
    for (const r of reps) {
      const i = bIdx.get(r.id), g = goldSets(ctx.gold.get(r.id));
      const rd = readSets(A.read(r.text, { priors: ctx.priors, dialect: "bpmn_xml" }));
      const selfAgree = sameSet(rd.beings, orig[i].beings) && sameSet(rd.rels, orig[i].rels);
      const origOk = sameSet(orig[i].beings, g.beings) && sameSet(orig[i].rels, g.rels);
      const j = (i + 1) % bd.length;
      const misAgree = sameSet(rd.beings, orig[j].beings) && sameSet(rd.rels, orig[j].rels) && orig[j].beings.length > 0;
      const lp = literalPrefixRead(r.text, priors.bpmn);
      const lpOk = sameSet(lp.beings, g.beings) && sameSet(lp.rels, g.rels);
      const b = by[r.rep] ??= { n: 0, agree: 0, self: 0, mis: 0, lit: 0, jac: [] };
      b.n++; if (selfAgree && origOk) b.agree++; if (selfAgree) b.self++; if (misAgree) b.mis++; if (lpOk) b.lit++;
      b.jac.push(L.jaccardMulti([...rd.beings, ...rd.rels], [...g.beings, ...g.rels]));
    }
    const per = Object.fromEntries(Object.entries(by).map(([k, b]) => [k, { n: b.n, agreement: f4(b.agree / b.n), self_agreement: f4(b.self / b.n), mean_jaccard_with_gold: f4(L.mean(b.jac)), misaligned: f4(b.mis / b.n), literal_prefix_reader: f4(b.lit / b.n) }]));
    const ok = Object.entries(per).filter(([, v]) => v.n >= MIN_GOLD);
    for (const [k, v] of Object.entries(per)) if (v.n < MIN_GOLD) gaps.push(gap(`rendering_below_min_items:${k}`, v.n, { min: MIN_GOLD }));
    if (ok.length) {
      const macro = L.mean(ok.map(([, v]) => v.agreement)), min = Math.min(...ok.map(([, v]) => v.agreement)), mis = Math.max(...ok.map(([, v]) => v.misaligned));
      const nsReps = ok.filter(([k]) => k === "default_ns" || k === "prefixed_ns"), litNs = nsReps.length ? L.mean(nsReps.map(([, v]) => v.literal_prefix_reader)) : null, realNs = nsReps.length ? L.mean(nsReps.map(([, v]) => v.agreement)) : null;
      details.renderings = { per_rendering: per, macro: f4(macro), min: f4(min), misaligned_max: f4(mis), literal_prefix_on_namespace_renderings: f4(litNs), real_on_namespace_renderings: f4(realNs), note: "agreement = the reader's sets on the rendering equal its own on the original AND the original equals the gold (an original read wrongly is a disagreement)" };
      checks["render.macro>=0.99"] = macro >= 0.99; checks["render.min>=0.98"] = min >= 0.98; checks["render.misaligned<=0.05"] = mis <= 0.05;
      checks["render.literal_prefix<=real-0.20"] = nsReps.length ? litNs <= realNs - 0.20 : null;
      scores.push(macro); ctrls.push(mis, litNs ?? 0); n += ok.reduce((a, [, v]) => a + v.n, 0);
      controls.renderings = { misaligned: f4(mis), literal_prefix_ns: f4(litNs) };
    }
  } else gaps.push(gap("renderings_unavailable", reps.length, { min: MIN_DOCS }));
  // (ii) cross-notation BPMN -> DOT (authored)
  const dx = (fs.existsSync(pathOf("dotx.jsonl.gz")) ? zlibLines(pathOf("dotx.jsonl.gz")) : []).filter((r) => bIdx.has(r.id));
  if (dx.length >= MIN_DOCS) {
    let ok = 0, mis = 0;
    const bp = dx.map((r) => { const rd = ctx.view(bd[bIdx.get(r.id)]).rd; const fn = new Set(rd.beings.filter((b) => b.cls === "flow_node").map((b) => b.id)); return { nodes: [...fn], edges: rd.relations.filter((x) => (x.label === "sequence_flow" || x.label === "message_flow") && fn.has(x.end1) && fn.has(x.end2)).map((x) => `${x.end1}>${x.end2}`) }; });
    const dt = dx.map((r) => { const rd = A.read(r.text, { priors, dialect: "dot" }); return { nodes: rd.beings.map((b) => b.id), edges: rd.relations.map((x) => `${x.end1}>${x.end2}`) }; });
    dx.forEach((r, i) => { if (sameSet(bp[i].nodes, dt[i].nodes) && sameSet(bp[i].edges, dt[i].edges) && bp[i].nodes.length) ok++; const j = (i + 1) % dx.length; if (sameSet(bp[j].nodes, dt[i].nodes) && sameSet(bp[j].edges, dt[i].edges)) mis++; });
    details.cross_notation = { n: dx.length, agreement: f4(ok / dx.length), misaligned: f4(mis / dx.length), note: "the DOT text is AUTHORED by the data script from the BPMN gold (flow nodes and sequence/message flows), never natural" };
    checks["cross.agreement>=0.98"] = ok / dx.length >= 0.98; checks["cross.misaligned<=0.05"] = mis / dx.length <= 0.05;
    scores.push(ok / dx.length); ctrls.push(mis / dx.length); n += dx.length; controls.cross_notation = { misaligned: f4(mis / dx.length) };
  } else gaps.push(gap("cross_notation_unavailable", dx.length, { min: MIN_DOCS }));
  // (iii) natural cross-tool pairs (MIWG exports of one reference process): label-keyed relation sets
  const groups = {};
  for (const d of bd) if (d.group) (groups[d.group] ??= []).push(d);
  const pairs = [];
  for (const [grp, ds] of Object.entries(groups)) { const ref = ds.find((d) => d.tool === "Reference"); if (!ref) continue; for (const e of ds) if (e !== ref) pairs.push({ grp, ref, e }); }
  if (pairs.length >= MIN_DOCS) {
    const keyed = (names, rels) => rels.map((r) => `${r.label}:${names.get(r.end1) ?? "?"}->${names.get(r.end2) ?? "?"}`);
    const readerKeys = (d) => { const rd = ctx.view(d).rd; const nm = new Map(rd.beings.map((b) => [b.id, `${b.kind}:${b.label ?? ""}`])); return keyed(nm, rd.relations.map((r) => ({ label: r.label, end1: r.end1, end2: r.end2 }))); };
    const goldKeys = (d) => { const g = ctx.gold.get(d.id); const nm = new Map(g.beings.map((b) => [b.id, `${b.kind}:${b.name ?? ""}`])); return keyed(nm, g.relations.map((r) => ({ label: r.label, end1: r.e1, end2: r.e2 }))); };
    const rk = new Map(), gk = new Map();
    const R = (d) => rk.get(d.id) ?? (rk.set(d.id, readerKeys(d)), rk.get(d.id)), G = (d) => gk.get(d.id) ?? (gk.set(d.id, goldKeys(d)), gk.get(d.id));
    const diffs = pairs.map((p) => Math.abs(L.jaccardMulti(R(p.ref), R(p.e)) - L.jaccardMulti(G(p.ref), G(p.e))));
    const goldJ = pairs.map((p) => L.jaccardMulti(G(p.ref), G(p.e)));
    const grpNames = Object.keys(groups).filter((g) => groups[g].some((d) => d.tool === "Reference"));
    const misJ = pairs.map((p, i) => { const other = grpNames.find((g) => g !== p.grp); if (!other) return null; const ref2 = groups[other].find((d) => d.tool === "Reference"); return L.jaccardMulti(R(ref2), R(p.e)); }).filter((x) => x != null);
    details.cross_tool = { pairs: pairs.length, groups: grpNames.length, mean_abs_diff_reader_vs_gold_jaccard: f4(L.mean(diffs)), mean_gold_jaccard: f4(L.mean(goldJ)), mean_reader_jaccard: f4(L.mean(pairs.map((p) => L.jaccardMulti(R(p.ref), R(p.e))))), misaligned_reader_jaccard: f4(L.mean(misJ)), note: "NATURAL pairs: the same MIWG reference process exported by different tools; the gold Jaccard is how much the tools themselves agree" };
    checks["tools.mean_abs_diff<=0.02"] = L.mean(diffs) <= 0.02; checks["tools.misaligned<=0.20"] = misJ.length ? L.mean(misJ) <= 0.20 : null;
    scores.push(1 - L.mean(diffs)); ctrls.push(L.mean(misJ) ?? 0); n += pairs.length; controls.cross_tool = { misaligned_reader_jaccard: f4(L.mean(misJ)) };
  } else gaps.push(gap("cross_tool_pairs_below_min", pairs.length, { min: MIN_DOCS }));
  // (iv) DOT re-serialisation
  const dd = sel.dot.filter((d) => ctx.gold.get(d.id)); const dIdx = new Map(dd.map((d, i) => [d.id, i]));
  const dr = (fs.existsSync(pathOf("dotreps.jsonl.gz")) ? zlibLines(pathOf("dotreps.jsonl.gz")) : []).filter((r) => dIdx.has(r.id));
  if (dr.length >= MIN_DOCS) {
    const by = {}; const orig = dd.map((d) => readSets(ctx.view(d).rd));
    for (const r of dr) {
      const i = dIdx.get(r.id), g = ctx.gold.get(r.id), gs = { beings: g.beings.map((b) => b.id), rels: g.relations.map((x) => `${x.e1}|${x.label}|${x.e2}`) };
      const rd = A.read(r.text, { priors, dialect: "dot" }), rs = { beings: rd.beings.map((b) => b.id), rels: rd.relations.map((x) => `${x.end1}|${x.label}|${x.end2}`) };
      const os = { beings: dd[i] ? ctx.view(dd[i]).rd.beings.map((b) => b.id) : [], rels: ctx.view(dd[i]).rd.relations.map((x) => `${x.end1}|${x.label}|${x.end2}`) };
      const ok = sameSet(rs.beings, os.beings) && sameSet(rs.rels, os.rels) && sameSet(os.beings, gs.beings) && sameSet(os.rels, gs.rels);
      const j = (i + 1) % dd.length, o2 = ctx.view(dd[j]).rd; const mis = sameSet(rs.rels, o2.relations.map((x) => `${x.end1}|${x.label}|${x.end2}`)) && rs.rels.length > 0;
      const b = by[r.rep] ??= { n: 0, ok: 0, mis: 0 }; b.n++; if (ok) b.ok++; if (mis) b.mis++;
    }
    const per = Object.fromEntries(Object.entries(by).map(([k, b]) => [k, { n: b.n, agreement: f4(b.ok / b.n), misaligned: f4(b.mis / b.n) }]));
    const macro = L.mean(Object.values(per).map((v) => v.agreement)), mis = Math.max(...Object.values(per).map((v) => v.misaligned));
    details.dot_renderings = { per_rendering: per, macro: f4(macro), misaligned_max: f4(mis) };
    checks["dot.render>=0.98"] = macro >= 0.98; checks["dot.render.misaligned<=0.05"] = mis <= 0.05;
    scores.push(macro); ctrls.push(mis); n += dr.length; controls.dot_renderings = { misaligned: f4(mis) };
  } else gaps.push(gap("dot_renderings_unavailable", dr.length, { min: MIN_DOCS }));
  const failed = Object.entries(checks).filter(([, v]) => v === false).map(([k]) => k);
  const nulls = Object.entries(checks).filter(([, v]) => v === null).map(([k]) => k);
  const score = scores.length ? L.mean(scores) : null, control = ctrls.length ? Math.max(...ctrls) : null;
  return mkRung("r5", split, { n, score: f4(score), control: f4(control), margin: score == null ? null : f4(score - control), pass: Object.keys(checks).length ? (failed.length ? false : nulls.length ? null : true) : null, controls, gaps,
    notes: [failed.length ? `FAILED CHECKS: ${failed.join("; ")}` : Object.keys(checks).length ? "all checks held" : "unmeasured", "renderings and the BPMN->DOT text are AUTHORED by script from natural documents (labelled derived); only the MIWG cross-tool pairs are natural"], details: { ...details, checks, failed } });
}

// ═══ driver ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const RUNGS = { r0, r1, r2, r3, r4, r5 };
/** measure({split="dev", limit=null, dir}) -> { family, split, rungs:{r0..r5}, ... }. Never throws for missing data: a rung that cannot be measured says so. */
export async function measure({ split = "dev", limit = null, dir = L.DATA, dryRun = false } = {}) {
  const t0 = Date.now();
  const rungs = {};
  let ctx = null;
  try { ctx = new Ctx({ split, limit, dir }); } catch (e) { ctx = null; }
  if (!ctx || !ctx.m) { for (const k of Object.keys(RUNGS)) rungs[k] = unmeasured(k, split, "corpus_absent", { dir }); return { family: FAMILY, split, limit, rungs, registration: registrationDigest() }; }
  if (dryRun) {
    // loads the split's documents, gold and texts and counts them; reads nothing with the adapter, writes no card and no ledger line
    const miss = { text: 0, gold: 0 };
    for (const d of [...ctx.sel.bpmn, ...ctx.sel.dot, ...Object.values(ctx.sel.neg).flat()]) { try { ctx.text(d); } catch { miss.text++; } if ((d.dialect === "bpmn_xml" || d.dialect === "dot") && !ctx.gold.get(d.id)) miss.gold++; }
    return { family: FAMILY, split, dryRun: true, counts: { bpmn: ctx.sel.bpmn.length, dot: ctx.sel.dot.length, negatives: Object.fromEntries(Object.entries(ctx.sel.neg).map(([g, ds]) => [g, ds.length])) }, missing: miss, priors: { ok: ctx.priors.ok, gaps: ctx.priors.gaps }, licence: L.licenceAuditOf(ctx.m), absent_stranger_kinds: absentStrangerGaps(ctx.sel.neg, ctx.m).map((g) => g.reason.split(":")[1]), registration: registrationDigest() };
  }
  const missing = ctx.priors.gaps.map((g) => g.reason);
  for (const [k, fn] of Object.entries(RUNGS)) {
    if (k !== "r0" && (!ctx.priors.bpmn || !ctx.priors.dot)) { rungs[k] = unmeasured(k, split, missing.find((x) => x.startsWith("prior_missing")) ?? "prior_missing"); continue; }
    try { rungs[k] = fn(ctx); } catch (e) { rungs[k] = mkRung(k, split, { gaps: [gap("instrument_error", 1, { message: String(e?.message ?? e).slice(0, 300) })], notes: ["the rung's arm threw; reported as unmeasured, never as pass"] }); }
  }
  // A6: rule 11 as a standing check: the licence of every document of the corpus is re-audited here; a document outside ALLOWED_SPDX voids every verdict (null + typed gap)
  const licence = L.licenceAuditOf(ctx.m);
  licence.audit_block_in_manifest = !!ctx.m.licence_audit;
  licence.prose_excluded = ctx.m.licence_audit?.prose_excluded ?? {};
  licence.ok = Object.keys(licence.not_allowed).length === 0 && licence.audit_block_in_manifest;
  if (!licence.ok) for (const [k, r] of Object.entries(rungs)) { r.gaps.push(gap("licence_audit_failed", 1, { not_allowed: licence.not_allowed, audit_block_in_manifest: licence.audit_block_in_manifest })); r.notes.push(`LICENCE AUDIT FAILED (rule 11): the verdict of ${k} is void (pass set to null)`); r.pass = null; }
  const counts = { train_docs: ctx.m.docs.filter((d) => d.split === "train").length, split_docs: ctx.m.docs.filter((d) => d.split === split).length, bpmn: ctx.sel.bpmn.length, dot: ctx.sel.dot.length, negatives: Object.fromEntries(Object.entries(ctx.sel.neg).map(([g, ds]) => [g, ds.length])) };
  const card = { family: FAMILY, split, limit, rungs, counts, licence, registration: registrationDigest(), seconds: (Date.now() - t0) / 1000,
    rungsUnmeasured: Object.entries(A.UNREAD_DIALECTS).map(([d, why]) => ({ rung: "r1..r5", dialect: d, reason: why })) };
  try {
    const outDir = path.join(dir, "results"); fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, `${split}${limit ? `-limit${limit}` : ""}.json`), JSON.stringify(card, null, 1));
    if (split === "test") fs.appendFileSync(path.join(outDir, "ledger.jsonl"), JSON.stringify({ at: new Date().toISOString(), split, limit, registration: card.registration, pass: Object.fromEntries(Object.entries(rungs).map(([k, r]) => [k, r.pass])) }) + "\n");
  } catch { /* the card is returned either way */ }
  return card;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2);
  const split = a.includes("--split") ? a[a.indexOf("--split") + 1] : "dev";
  const limit = a.includes("--limit") ? Number(a[a.indexOf("--limit") + 1]) : null;
  const card = await measure({ split, limit });
  const brief = Object.fromEntries(Object.entries(card.rungs).map(([k, r]) => [k, { n: r.n, score: r.score, control: r.control, margin: r.margin, pass: r.pass, notes: r.notes.slice(0, 2), gaps: r.gaps.length }]));
  console.log(JSON.stringify({ family: card.family, split: card.split, registration: card.registration, counts: card.counts, licence: card.licence && { ok: card.licence.ok, not_allowed: card.licence.not_allowed }, rungs: brief }, null, 1));
}

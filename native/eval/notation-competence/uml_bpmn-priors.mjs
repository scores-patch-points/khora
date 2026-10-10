// eval/notation-competence/uml_bpmn-priors.mjs — builds priors/notation-uml_bpmn-{bpmn-lexicon,dot-grammar,identity}.json.
//
//   node eval/notation-competence/uml_bpmn-priors.mjs --stage tables     lexicon + grammar (standards + TRAIN counts); identity left as a typed stub
//   node eval/notation-competence/uml_bpmn-priors.mjs --stage train      identity models (TRAIN windows only), needs the tables first
//
// GIVERS. bpmn-lexicon: the OMG BPMN 2.0.2 metamodel as generated into bpmn-io/bpmn-moddle resources/bpmn/json/{bpmn,bpmndi,dc,di}.json (MIT; the
//   generator input is the OMG CMOF, resources/bpmn/cmof). dot-grammar: the DOT language grammar (graphviz.org/doc/info/lang.html), facts only.
//   identity: TRAIN windows + kernel/activation.js dmdWindow + a Wald bound calibrated on held-back TRAIN background.
// HELD-OUT DISCIPLINE. Everything counted from documents is counted from the TRAIN split only (marked in each file under `train`); the gold-side
// XSD table (Semantic.xsd) is NOT read here, so the prior and the gold are two different artifacts of the standard.
// This builder never reads dev or test documents.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as A from "../../adapters/notation/uml_bpmn.js";
import { dmdWindow, gammaFor } from "../../kernel/activation.js";
import { DATA, L_WINDOW, loadManifest, docsOf, textOf, loadGold, armWindows, rngFor, round } from "./uml_bpmn-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "../../priors");
const MODDLE = `${DATA}/raw/git/bpmn-moddle`;
const TODAY = "2026-10-06";
const write = (name, obj) => fs.writeFileSync(path.join(PRIORS, name), JSON.stringify(obj, null, 1) + "\n");
const lowerFirst = (s) => s[0].toLowerCase() + s.slice(1);

// ── the BPMN lexicon: from the standard (moddle descriptors), TRAIN counts from the TRAIN gold ─────────────────────────────────────────
function lexicon() {
  const rd = (f) => JSON.parse(fs.readFileSync(`${MODDLE}/resources/bpmn/json/${f}.json`, "utf8"));
  const bpmn = rd("bpmn"), di = rd("bpmndi"), dc = rd("dc"), dii = rd("di");
  const T = new Map(bpmn.types.map((t) => [t.name, t]));
  const ancestors = (name) => { const seen = new Set(), q = [name]; while (q.length) { const x = q.pop(); if (seen.has(x)) continue; seen.add(x); for (const s of T.get(x)?.superClass ?? []) q.push(s); } return seen; };
  const has = (anc, names) => names.some((n) => anc.has(n));
  const klass = (typeName) => {
    if (typeName === "Definitions") return "definitions";
    const a = ancestors(typeName);
    if (a.has("FlowNode")) return "flow_node";
    if (has(a, ["SequenceFlow", "MessageFlow", "Association", "DataAssociation"])) return "edge";
    if (has(a, ["Participant", "Lane"])) return "swimlane";
    if (has(a, ["Process", "Collaboration", "Choreography"])) return "process";
    if (has(a, ["DataObject", "DataObjectReference", "DataStoreReference", "DataStore", "DataInput", "DataOutput", "Property"])) return "data";
    if (a.has("Artifact")) return "artifact";
    return "model_other";
  };
  const elements = {}, refText = new Set();
  for (const t of bpmn.types) {
    const a = ancestors(t.name);
    const attrs = {};
    for (const an of a) for (const p of T.get(an)?.properties ?? []) {
      if (p.isAttr) { const role = p.isReference ? "ref" : p.name === "id" ? "decl" : p.name === "name" ? "label" : null; if (role) attrs[p.name] = role; }
      else if (p.isReference) refText.add(p.name);
    }
    elements[lowerFirst(t.name)] = { cls: klass(t.name), attrs };
  }
  // child-element properties (incoming, conditionExpression, script, ...) are names the standard lists as properties, not as types: they are
  // KNOWN names of class model_other (a being is never one of them), so reading them is not a gap
  // A contained (non-reference) child property takes the class of its declared TYPE (inputDataItem: DataInput -> data); a reference (incoming) never does.
  const attrsOf = (typeName) => { const attrs = {}; for (const an of ancestors(typeName)) for (const p of T.get(an)?.properties ?? []) if (p.isAttr) { const role = p.isReference ? "ref" : p.name === "id" ? "decl" : p.name === "name" ? "label" : null; if (role) attrs[p.name] = role; } return attrs; };
  for (const t of bpmn.types) for (const p of t.properties ?? []) if (!p.isAttr && !(p.name in elements)) {
    elements[p.name] = p.isReference || !T.has(p.type) ? { cls: "model_other", attrs: {}, from: "property" } : { cls: klass(p.type), attrs: attrsOf(p.type), from: `property:${p.type}` };
  }
  // DI: the BPMNDI/DC/DI element names as written in XML; only `id` and the reference attributes matter
  const diEl = {};
  for (const d of [di, dc, dii]) for (const t of d.types) {
    const attrs = {};
    for (const p of t.properties ?? []) if (p.isAttr) { if (p.isReference) attrs[p.name] = "ref"; else if (p.name === "id") attrs[p.name] = "decl"; }
    diEl[t.name] = { attrs };
  }
  diEl.waypoint = { attrs: {} };
  const rules = {
    sequenceFlow: { label: "sequence_flow", from: "sourceRef", to: "targetRef" },
    messageFlow: { label: "message_flow", from: "sourceRef", to: "targetRef" },
    association: { label: "association", from: "sourceRef", to: "targetRef" },
    dataInputAssociation: { label: "data_association", fromChild: "sourceRef", toChild: "targetRef" },
    dataOutputAssociation: { label: "data_association", fromChild: "sourceRef", toChild: "targetRef" },
    boundaryEvent: { label: "attached_to", fromId: true, to: "attachedToRef" },
  };
  // the rules are a reading of the standard; check each against the table that was received
  const ruleCheck = {};
  for (const [name, r] of Object.entries(rules)) {
    const t = T.get(name[0].toUpperCase() + name.slice(1)), anc = [...ancestors(t.name)];
    const props = anc.flatMap((a) => T.get(a).properties ?? []);
    const need = [r.from, r.to, r.fromChild, r.toChild].filter((x) => x && x !== true);
    ruleCheck[name] = need.every((n) => props.some((p) => p.name === n && p.isReference));
  }
  // TRAIN counts from the TRAIN gold (independent of the adapter): element occurrences in the standard's namespace, unknown names, vendor namespaces
  const m = loadManifest(), gold = loadGold("train");
  const trainBpmn = docsOf(m, "train", (d) => d.dialect === "bpmn_xml");
  const counts = {}, docFreq = {}, unknownInStd = {}, vendor = {};
  let nEl = 0;
  for (const d of trainBpmn) {
    const g = gold.get(d.id); if (!g) continue;
    const seenHere = new Set();
    for (const [, ns, local] of g.elems) {
      nEl++;
      if (ns === bpmn.uri) { counts[local] = (counts[local] ?? 0) + 1; seenHere.add(local); if (!(local in elements)) unknownInStd[local] = (unknownInStd[local] ?? 0) + 1; }
      else if (!ns || (ns !== di.uri && ns !== dc.uri && ns !== dii.uri)) { const v = vendor[ns ?? "(none)"] ??= { elements: 0, docs: new Set() }; v.elements++; v.docs.add(d.id); }
    }
    for (const l of seenHere) docFreq[l] = (docFreq[l] ?? 0) + 1;
  }
  const vendorOut = Object.fromEntries(Object.entries(vendor).sort((a, b) => b[1].elements - a[1].elements).slice(0, 40).map(([k, v]) => [k, { elements: v.elements, docs: v.docs.size }]));
  const unattested = Object.keys(elements).filter((n) => !(n in counts)).length;
  return {
    schema: "NotationLexiconPrior@1", family: "uml_bpmn", kind: "bpmn-lexicon", built: TODAY, built_by: "eval/notation-competence/uml_bpmn-priors.mjs",
    givers: [
      { name: "OMG Business Process Model and Notation 2.0.2 (formal/2013-12-09), as generated into bpmn-io/bpmn-moddle", url: "https://github.com/bpmn-io/bpmn-moddle", license: "MIT",
        files: ["resources/bpmn/json/bpmn.json", "resources/bpmn/json/bpmndi.json", "resources/bpmn/json/dc.json", "resources/bpmn/json/di.json"], commit: "f35959afc443444b706a4f39542530134233db07",
        note: "element classes and reference attributes are derived from the superClass graph and the isReference flags of this table; the OMG CMOF it is generated from is resources/bpmn/cmof (consulted, not copied)" },
      { name: "relation_rules: the BPMN 2.0.2 specification's reading of sequenceFlow/messageFlow/association (sourceRef -> targetRef), dataInput/OutputAssociation (child sourceRef/targetRef) and boundaryEvent (attachedToRef); hand-declared, checked against the table", rule_check_against_table: ruleCheck },
    ],
    semantics: "NOMINATES the class of a BPMN element name and the role of its attributes; REFUSES beings to every element outside the standard's namespaces and to every name the table does not list. Casing is not a signal: names are matched exactly as written.",
    namespaces: { model: bpmn.uri, di: [di.uri, dc.uri, dii.uri] },
    classes: ["flow_node", "edge", "swimlane", "process", "data", "artifact", "definitions", "model_other", "diagram", "ext"],
    being_classes: ["flow_node", "swimlane", "process", "data", "artifact"],
    elements, di_elements: diEl, ref_text_elements: [...refText].sort(), relation_rules: rules,
    train: {
      marker: "COUNTS FROM TRAIN ONLY (flowable-engine + Activiti test models, lineage 'activiti'), from the TRAIN gold written by uml_bpmn-data.py",
      docs: trainBpmn.length, elements_counted: nEl, model_element_counts: Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1])),
      model_element_doc_freq: docFreq, names_in_standard_ns_not_in_table: unknownInStd, table_names_never_seen_in_train: unattested, vendor_namespaces_attested: vendorOut,
    },
  };
}

// ── the DOT grammar: facts of the language; TRAIN counts of attribute names ────────────────────────────────────────────────────────────────────
function dotGrammar() {
  const m = loadManifest();
  const docs = m ? docsOf(m, "train", (d) => d.dialect === "dot") : [];
  const attrNames = {}, attrDocs = {};
  let directed = 0, undirected = 0, nodes = 0, edges = 0;
  const gold = loadGold("train");
  for (const d of docs) {
    const t = textOf(d); const lx = A.lexDot(t, { priors: null });
    const seen = new Set();
    for (const k of lx.tokens) if (k.role === "attr_name" && (k.cls === "id" || k.cls === "str")) { attrNames[k.v] = (attrNames[k.v] ?? 0) + 1; seen.add(k.v); }
    for (const a of seen) attrDocs[a] = (attrDocs[a] ?? 0) + 1;
    const g = gold.get(d.id); if (g) { if (g.directed) directed++; else undirected++; nodes += g.beings.length; edges += g.relations.length; }
  }
  return {
    schema: "NotationGrammarPrior@1", family: "uml_bpmn", kind: "dot-grammar", built: TODAY, built_by: "eval/notation-competence/uml_bpmn-priors.mjs",
    givers: [{ name: "The DOT Language (Graphviz documentation, abstract grammar)", url: "https://graphviz.org/doc/info/lang.html", note: "facts only (keywords, operators, ID forms, comment forms, compass points); no text is reproduced" }],
    semantics: "NOMINATES token classes and the role of an ID by its place in the grammar; the graph keyword (graph vs digraph) fixes the meaning of an edge operator.",
    keywords: ["graph", "digraph", "subgraph", "node", "edge", "strict"], keyword_case: "insensitive",
    edge_ops: { digraph: "->", graph: "--" }, compass_points: ["n", "ne", "e", "se", "s", "sw", "w", "nw", "c", "_"],
    id_forms: ["alphanumeric string [a-zA-Z\\200-\\377_][a-zA-Z\\200-\\377_0-9]*", "numeral [-]?(.[0-9]+ | [0-9]+(.[0-9]*)?)", "double-quoted string with \\\" as the only escape the grammar names, plus + concatenation", "HTML string <...> with balanced angle brackets"],
    comment_forms: ["/* ... */", "// to end of line", "# at line start (preprocessor output)"],
    train: { marker: "COUNTS FROM TRAIN ONLY", docs: docs.length, directed, undirected, nodes, edges,
      attribute_vocab: Object.entries(attrDocs).filter(([, c]) => c >= 5).map(([a]) => a.toLowerCase()).sort(), attribute_vocab_rule: "attribute names (lower-cased) that occur in >= 5 TRAIN DOT documents (declared minimum document frequency)", attribute_name_counts: Object.fromEntries(Object.entries(attrNames).sort((a, b) => b[1] - a[1]).slice(0, 200)), attribute_name_doc_freq_top: Object.fromEntries(Object.entries(attrDocs).sort((a, b) => b[1] - a[1]).slice(0, 60)) },
  };
}

// ── identity: class-transition models per dialect, from TRAIN windows ──────────────────────────────────────────────────────────────────────────
const KIND = (d) => (d.dialect === "bpmn_xml" || d.dialect === "dot" ? d.dialect : "neg");
function trainWindows(priors) {
  const m = loadManifest();
  const docs = docsOf(m, "train");
  const gold = loadGold("train");
  const out = [];
  docs.forEach((d, idx) => {
    const text = textOf(d);
    const w = armWindows(d, text, gold.get(d.id), { L: L_WINDOW, nMid: 2, rng: rngFor("uml_bpmn-train-windows", d.id) });
    const arms = [["head", w.head], ...(w.body ? [["body", w.body]] : []), ...w.mid.map((x) => ["mid", x])];
    for (const [arm, wt] of arms) out.push({ id: d.id, dialect: d.dialect, kind: KIND(d), neg_kind: d.neg_kind, arm, text: wt, half: 0 });
  });
  // cross-fit by DOC parity within each kind: even docs estimate the LLR, odd docs calibrate A and measure the window
  const order = {};
  for (const w of out) { const k = `${w.kind}`; order[k] ??= new Map(); if (!order[k].has(w.id)) order[k].set(w.id, order[k].size); w.half = order[k].get(w.id) % 2; }
  return out;
}

function countModel(seqs) {
  const c = {}, tot = {}, uni = {}; let n = 0;
  for (const s of seqs) { let prev = "^"; for (const { sym } of s) { c[`${prev}>${sym}`] = (c[`${prev}>${sym}`] ?? 0) + 1; tot[prev] = (tot[prev] ?? 0) + 1; uni[sym] = (uni[sym] ?? 0) + 1; n++; prev = sym; } }
  return { c, tot, uni, n };
}

function identityStage(priors) {
  const wins = trainWindows(priors);
  const alpha = 0.01, beta = 0.01, A_wald = Math.log((1 - beta) / alpha);
  const candidates = [4, 6, 8, 12, 16, 24, 32, 48, 64];
  const models = {}, report = {};
  for (const D of A.DIALECTS) {
    const seqOf = (w) => A.symbolsOf(w.text, D, { priors, final: false });
    const pos = wins.filter((w) => w.dialect === D), neg = wins.filter((w) => w.dialect !== D);
    const posEst = pos.filter((w) => w.half === 0), posCal = pos.filter((w) => w.half === 1);
    const negEst = neg.filter((w) => w.half === 0), negCal = neg.filter((w) => w.half === 1);
    const P = posEst.map(seqOf), B = negEst.map(seqOf);
    const c1 = countModel(P), c0 = countModel(B);
    const alphabet = [...new Set([...Object.keys(c1.uni), ...Object.keys(c0.uni)])].sort();
    const V = alphabet.length + 1, lam = V;
    const uni = (c, s) => ((c.uni[s] ?? 0) + 1) / (c.n + V);
    const smooth = (c, prev, cur) => ((c.c[`${prev}>${cur}`] ?? 0) + lam * uni(c, cur)) / ((c.tot[prev] ?? 0) + lam);
    const unigram_llr = {}, bigram_llr = {};
    for (const s of alphabet) unigram_llr[s] = Math.log(uni(c1, s) / uni(c0, s));
    const prevs = new Set([...Object.keys(c1.tot), ...Object.keys(c0.tot)].filter((p) => p !== "^"));
    for (const p of prevs) for (const s of alphabet) { const k = `${p}>${s}`; if ((c1.c[k] ?? 0) + (c0.c[k] ?? 0) > 0) bigram_llr[k] = Math.log(smooth(c1, p, s) / smooth(c0, p, s)); }
    const core = { bigram_llr, unigram_llr, unseen_llr: 0, alphabet };
    const nullSeq = negCal.map(seqOf), posSeq = posCal.map(seqOf);
    const mk = (gamma, A_) => ({ ...core, window: { gamma }, sprt: { A: A_ } });
    const maxima = (gamma) => nullSeq.map((s) => { const idf = A.createIdentifier({ priors: { identity: { models: { [D]: mk(gamma, Infinity) } } }, dialects: [D] }); let mx = 0; for (const it of s) mx = Math.max(mx, idf.push(D, it).evidence[D]); return mx; }).sort((a, b) => a - b);
    const windowFor = (A_) => {
      const tp = { identity: { models: { [D]: mk(1, A_) } } };
      const agree = Object.fromEntries(candidates.map((d) => [d, 0])); let measured = 0, undef = 0;
      for (const s of posSeq) {
        const res = dmdWindow(s, (obs) => { const idf = A.createIdentifier({ priors: tp, decay: false, dialects: [D] }); let st; for (const it of obs) st = idf.push(D, it); return st ? st.named_dialects.includes(D) : false; }, { candidates });
        measured++; if (res.window == null) { undef++; continue; }
        for (const d of candidates) if (d >= res.window) agree[d]++;
      }
      const share = Object.fromEntries(candidates.map((d) => [d, measured ? agree[d] / measured : 0]));
      return { w: candidates.find((d) => share[d] >= 1 - alpha) ?? null, share, measured, undef };
    };
    let Acur = A_wald, win = windowFor(Acur); const rounds = [];
    for (let r = 0; r < 3; r++) {
      const g = win.w ? gammaFor(win.w) : gammaFor(candidates.at(-1));
      const ms = maxima(g);
      const A_null = ms.length ? ms[Math.max(0, ms.length - Math.floor(alpha * ms.length) - 1)] + 1e-9 : A_wald;
      const A2 = Math.max(A_wald, A_null);
      rounds.push({ round: r + 1, window: win.w, gamma: g, A_null, A: A2, null_windows: ms.length, share_null_reaching_wald: ms.filter((x) => x >= A_wald).length / Math.max(1, ms.length) });
      const w2 = windowFor(A2);
      const stable = w2.w === win.w && Math.abs(A2 - Acur) < 1e-9;
      Acur = A2; win = w2;
      if (stable) break;
    }
    const windowRec = win.w
      ? { window: win.w, gamma: gammaFor(win.w), candidates, agree_share: win.share, streams_measured: win.measured, streams_no_agreeing_depth: win.undef, basis: "kernel/activation.js dmdWindow on held-back TRAIN positive windows: the smallest candidate depth (in evidence symbols) at which dropping everything older changes no verdict for >= 1-alpha of windows", fixed_point_rounds: rounds }
      : { window: candidates.at(-1), gamma: gammaFor(candidates.at(-1)), candidates, agree_share: win.share, streams_measured: win.measured, gap: "reach_exceeds_candidates", basis: "no candidate reached 1-alpha agreement; the widest candidate is used and the gap is typed", fixed_point_rounds: rounds };
    models[D] = { ...core, sprt: { alpha, beta, A_wald, A: Acur, calibration: "smallest A that at most alpha of held-back TRAIN background windows reach (max evidence over the window), never below A_wald" }, window: windowRec,
      train: { positive_windows_estimation: posEst.length, positive_windows_calibration: posCal.length, background_windows_estimation: negEst.length, background_windows_calibration: negCal.length, symbols_positive: c1.n, symbols_background: c0.n, alphabet_size: alphabet.length } };
    report[D] = { A: Acur, A_wald, window: windowRec.window, gamma: windowRec.gamma, pos_est: posEst.length, pos_cal: posCal.length, neg_est: negEst.length, neg_cal: negCal.length, rounds };
  }
  const bgKinds = {}; for (const w of wins) if (w.kind === "neg") { const k = (w.neg_kind ?? "").split(":")[0]; bgKinds[k] = (bgKinds[k] ?? 0) + 1; }
  // A6 (licence, rule 11): which prose languages the TRAIN background holds, and which were removed for their licence (derived from the manifest, never typed here)
  const proseLangs = [...new Set(wins.filter((w) => (w.neg_kind ?? "").startsWith("prose:")).map((w) => w.neg_kind.split(":")[1]))].sort();
  const licenceAudit = loadManifest()?.licence_audit ?? null;
  return {
    identity: {
      schema: "NotationIdentityPrior@1", family: "uml_bpmn", kind: "identity", built: TODAY, built_by: "eval/notation-competence/uml_bpmn-priors.mjs",
      givers: [{ name: "kernel/activation.js dmdWindow (Bateson: difference that makes a difference)", note: "the decay window is measured, not set" }, { name: "Wald SPRT bound from declared alpha=beta=0.01, calibrated against held-back TRAIN background" }, { name: "TRAIN corpora: flowable-engine + Activiti BPMN (Apache-2.0), pydot test graphs and GitHub DOT files (per-repo permissive licences), TRAIN strangers (see PROVENANCE.md)" }],
      semantics: "NOMINATES bpmn_xml / dot from a stream of lexemes; the verdict latches (identity does not decay), presence decays with the measured window. A stranger the models never saw is not named.",
      window_chars: L_WINDOW, models,
      train: { marker: "ALL COUNTS FROM TRAIN ONLY; cross-fitted by DOC parity within each kind: even docs estimate the LLR, odd docs calibrate A and measure the window", background_windows_by_kind: bgKinds, windows_total: wins.length,
        prose_languages_in_background: proseLangs, prose_languages_excluded_for_licence: Object.fromEntries(Object.entries(licenceAudit?.prose_excluded ?? {}).map(([k, v]) => [k, v.why])),
        licence_note: "this prior keeps ONLY aggregate class-transition log-ratios and numbers derived from them; no document text is retained" },
    },
    report,
  };
}

const stage = process.argv.includes("--stage") ? process.argv[process.argv.indexOf("--stage") + 1] : "tables";
if (stage === "tables") {
  write("notation-uml_bpmn-bpmn-lexicon.json", lexicon());
  write("notation-uml_bpmn-dot-grammar.json", dotGrammar());
  const exists = fs.existsSync(path.join(PRIORS, "notation-uml_bpmn-identity.json"));
  if (!exists) write("notation-uml_bpmn-identity.json", { schema: "NotationIdentityPrior@1", family: "uml_bpmn", kind: "identity", built: TODAY, stub: true, models: {}, note: "stub: run --stage train" });
  console.log("tables written");
} else if (stage === "train") {
  const priors = A.loadPriors();
  if (!priors.bpmn || !priors.dot) { console.error("tables first"); process.exit(2); }
  const { identity, report } = identityStage({ bpmn: priors.bpmn, dot: priors.dot, identity: null, gaps: [] });
  write("notation-uml_bpmn-identity.json", identity);
  console.log(JSON.stringify(report, null, 1));
} else { console.error("unknown stage", stage); process.exit(2); }

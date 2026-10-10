// adapters/notation/uml_bpmn.js — the STRUCTURED DIAGRAM TEXT notation family (BPMN 2.0 XML, Graphviz DOT) as a MEDIUM ADAPTER.
//
// WHAT THIS IS. The system under test for eval/notation-competence/uml_bpmn.mjs. It is NOT the gold: the gold is lxml/libxml2 + Python's expat +
// the OMG Semantic.xsd for BPMN, and pydot for DOT (see the instrument header and eval/notation-competence/uml_bpmn-data.py). The kernel stays
// medium-blind: everything that knows what a tag, a sequenceFlow or an edge operator is lives here.
//
// ZERO MODEL. No LLM, no network, no learned weights at run time. Every number the reader uses comes from a RECEIVED prior file with a
// named giver (priors/notation-uml_bpmn-*.json) or from a count the reader makes on the PREFIX it has already read. Nothing is tuned here.
//
// LOVELACE'S LAW applied: the reader recovers what the text ORDERS (a start tag orders a being with an id; a sequenceFlow orders a pair of
// references; an edge statement orders a pair of node ids), never what a diagram "means". A name not in the received table is REFUSED a being
// (typed gap), never guessed.
//
// WHAT THE PRIORS DO (priors REFUSE or NOMINATE, never admit):
//   notation-uml_bpmn-bpmn-lexicon.json   giver: the OMG BPMN 2.0.2 metamodel as generated into bpmn-io/bpmn-moddle resources/bpmn/json (MIT),
//        plus the namespaces of the standard. NOMINATES the class of a BPMN element name (flow_node, edge, swimlane, ...), the role of its
//        attributes (decl, ref, label) and the relation each edge element orders; REFUSES a being to every element outside the standard's
//        namespaces (vendor extensions with an id are not beings) and to every unknown name inside them. TRAIN counts say which names were attested.
//   notation-uml_bpmn-dot-grammar.json    giver: the DOT language grammar (graphviz.org/doc/info/lang.html), facts only.
//   notation-uml_bpmn-identity.json       TRAIN-estimated class-transition models (bpmn_xml vs background, dot vs background), the decay window
//        MEASURED by kernel/activation.js dmdWindow, and a threshold calibrated on held-back TRAIN background.
//
// CAUSAL. `ear`, `read` and the identifier are single left-to-right passes: what is said at character p is a function of characters <= p. A
// being or relation carries `at`, the number of characters the reader had consumed when it emitted it; the instrument checks prefix stability
// (read(prefix K) agrees with read(full) for every item with at <= K, and ear(prefix) tokens are a prefix of ear(full)'s).
// ONE DECLARED EXCEPTION: `resolved` on a relation says whether both endpoints are declared anywhere in the document; a forward reference can
// only be settled at end of input, so it is an end-of-input annotation, never part of the causal check.
//
// CASING is not a witness here at all: element names are matched exactly as the standard writes them (BPMN is case sensitive), and DOT keywords
// are matched case-insensitively as the DOT grammar states. A module/namespace is read off xmlns syntax, never off the look of a name.
//
// TYPED GAPS (never silent): prior_missing:<kind>, not_a_diagram_text, unterminated_tag/comment/cdata/string, unresolved_entity,
// attr_without_value, bpmn_name_unknown_in_standard_ns, element_without_namespace_binding, compound_endpoint (an edge end that is a subgraph),
// edge_op_does_not_match_graph_type, dot_parse_recovered, dialect_not_read:<sbgn_ml|plantuml|mermaid|xmi> (identified or declared, no prior, no gold).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FAMILY = "uml_bpmn";
export const DIALECTS = Object.freeze(["bpmn_xml", "dot"]);
/** dialects named by the family but NOT readable here: no received prior, no independent gold, typed gap (see the instrument header) */
export const UNREAD_DIALECTS = Object.freeze({
  sbgn_ml: "no open permissively licensed source with an independent split (libsbgn only, Apache-2.0 option); used as a stranger",
  plantuml: "no independent parser without executing a downloaded JVM jar; not fetched",
  mermaid: "no independent parser in the toolchain (mermaid's own is a JS/DOM bundle); used as a near-miss stranger",
  uml_xmi: "no open permissively licensed XMI corpus found",
});
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PRIORS_DIR = path.resolve(HERE, "../../priors");
export const PRIOR_FILES = Object.freeze({
  bpmn: "notation-uml_bpmn-bpmn-lexicon.json",
  dot: "notation-uml_bpmn-dot-grammar.json",
  identity: "notation-uml_bpmn-identity.json",
});

// ── priors ──────────────────────────────────────────────────────────────────────────────────
/** loadPriors({dir}) -> { bpmn, dot, identity, gaps, ok }. A missing file is a typed gap, never a throw. */
export function loadPriors({ dir = PRIORS_DIR } = {}) {
  const out = { bpmn: null, dot: null, identity: null, gaps: [], dir };
  for (const [k, f] of Object.entries(PRIOR_FILES)) {
    try { out[k] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); }
    catch { out.gaps.push({ reason: `prior_missing:${k}`, file: f }); }
  }
  out.ok = out.gaps.length === 0;
  return out;
}

const COMPILED = new WeakMap();
/** compilePriors(priors) -> the lookup tables the lexers use (cached per priors object). */
export function compilePriors(priors) {
  if (!priors) return { bpmn: null, dot: null };
  if (COMPILED.has(priors)) return COMPILED.get(priors);
  const out = { bpmn: null, dot: null };
  const b = priors.bpmn;
  if (b) {
    out.bpmn = {
      modelNs: b.namespaces.model,
      diNs: new Set(b.namespaces.di),
      elements: new Map(Object.entries(b.elements)),     // local -> {cls, attrs:{name:role}}
      diElements: new Map(Object.entries(b.di_elements)),
      refText: new Set(b.ref_text_elements),
      rules: b.relation_rules,                             // local -> {label, from, to} | {label, fromChild, toChild} | {label, fromId, to}
      beingClasses: new Set(b.being_classes),
    };
  }
  const d = priors.dot;
  if (d) {
    out.dot = { keywords: new Set(d.keywords), edgeOps: d.edge_ops, compass: new Set(d.compass_points), attrVocab: new Set(d.train?.attribute_vocab ?? []) };
  }
  COMPILED.set(priors, out);
  return out;
}

class Gaps {
  constructor() { this.m = new Map(); }
  add(reason, n = 1) { this.m.set(reason, (this.m.get(reason) ?? 0) + n); }
  list() { return [...this.m].map(([reason, count]) => ({ reason, count })); }
}

// ── character classes ───────────────────────────────────────────────────────────────────────
const isWs = (c) => c === 32 || c === 9 || c === 10 || c === 13;
const isNameStartXml = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 58 || c > 127;

const ENT = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
/** decodeEntities(raw, gaps) — the five predefined entities and numeric character references; anything else stays as written and is a typed gap. */
export function decodeEntities(raw, gaps = null) {
  if (raw.indexOf("&") < 0) return raw;
  return raw.replace(/&(#x[0-9A-Fa-f]+|#[0-9]+|[A-Za-z_][\w.-]*);/g, (m, g) => {
    if (g[0] === "#") {
      const cp = g[1] === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    if (g in ENT) return ENT[g];
    gaps?.add("unresolved_entity");
    return m;
  });
}
/** XML attribute-value normalisation (XML 1.0 3.3.3): literal tab/CR/LF become one space each (CRLF one), then entities. */
const normAttr = (raw, gaps) => decodeEntities(raw.replace(/\r\n|[\t\r\n]/g, " "), gaps);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// XML ear
// ═══════════════════════════════════════════════════════════════════════════════════════════
/**
 * lexXml(text, {priors, final}) -> { tokens, gaps }
 * Tokens {s, e, cls, ...} with cls in: decl pi comment cdata doctype tag_open tag_close_open elem_name end_name attr_name attr_eq attr_value
 * tag_end text. A start tag is the tokens from its tag_open to its tag_end; whitespace between lexemes is not a token.
 *  elem_name {q, prefix, local, ns, bound, role, provisional}   role in flow_node edge swimlane process data artifact definitions model_other diagram ext
 *  attr_name {q, local, role}                                    role in decl ref label other ext nsdecl
 *  attr_value {v (normalised, decoded), name, role}
 *  text {v (trimmed, decoded), role}                             role text | ref_text
 * final=false: the last token that the input could still extend is emitted with partial:true (and nothing after it).
 */
export function lexXml(text, { priors = null, final = true } = {}) {
  const C = compilePriors(priors).bpmn;
  const toks = [], gaps = new Gaps();
  if (!C) gaps.add("prior_missing:bpmn");
  const n = text.length;
  const nsStack = [new Map()];            // prefix -> uri, innermost last (copy-on-open)
  const open = [];                        // {q, local, ns, role, provisional, nsDepth}
  let i = 0;
  const lookup = (prefix) => { const m = nsStack[nsStack.length - 1]; return m.has(prefix) ? m.get(prefix) : null; };
  const partial = (t) => { t.partial = true; toks.push(t); };

  function roleOfElem(ns, local, bound) {
    if (!C) return { role: null, provisional: false };
    if (ns === C.modelNs) {
      const el = C.elements.get(local);
      if (!el) { gaps.add("bpmn_name_unknown_in_standard_ns"); return { role: local === "definitions" ? "definitions" : "model_other", provisional: false }; }
      return { role: el.cls, provisional: false };
    }
    if (ns != null && C.diNs.has(ns)) return { role: "diagram", provisional: false };
    if (ns != null) return { role: "ext", provisional: false };
    // no namespace is bound to this name here (a window cut mid-document, or a document with no declaration): NOMINATE by local name, provisionally
    gaps.add("element_without_namespace_binding");
    const el = C.elements.get(local);
    if (el) return { role: el.cls, provisional: true };
    if (C.diElements.has(local)) return { role: "diagram", provisional: true };
    return { role: "ext", provisional: true };
  }
  function roleOfAttr(elem, aq) {
    if (aq === "xmlns" || aq.startsWith("xmlns:")) return "nsdecl";
    if (!C || elem.role == null) return null;
    if (aq.includes(":")) return "ext";
    const inModel = elem.ns === C.modelNs || (elem.provisional && elem.role !== "ext" && elem.role !== "diagram");
    const inDi = (elem.ns != null && C.diNs.has(elem.ns)) || (elem.provisional && elem.role === "diagram");
    if (inModel) { const el = C.elements.get(elem.local); return el?.attrs?.[aq] ?? (aq === "id" ? "decl" : aq === "name" ? "label" : "other"); }
    if (inDi) { const el = C.diElements.get(elem.local); return el?.attrs?.[aq] ?? (aq === "id" ? "decl" : "other"); }
    return "ext";
  }

  function emitText(a, b) {
    // trim to the non-blank run; a text run that is only whitespace is not a token
    let s = a, e = b;
    while (s < e && isWs(text.charCodeAt(s))) s++;
    while (e > s && isWs(text.charCodeAt(e - 1))) e--;
    if (s >= e) return;
    const par = open[open.length - 1];
    const refText = !!(C && par && (par.ns === C.modelNs || par.provisional) && C.refText.has(par.local));
    const t = { s, e, cls: "text", v: decodeEntities(text.slice(s, e), gaps), role: refText ? "ref_text" : "text" };
    if (!final && b >= n) { partial(t); return; }
    toks.push(t);
  }
  const markupStart = (p) => { const c = text.charCodeAt(p + 1); return c === 33 || c === 63 || c === 47 || isNameStartXml(c); };

  while (i < n) {
    if (text.charCodeAt(i) !== 60 || (i + 1 < n && !markupStart(i))) {
      // text run: to the next '<' that really opens markup
      let j = i + 1;
      while (j < n) { const k = text.indexOf("<", j); if (k < 0) { j = n; break; } if (k + 1 >= n || markupStart(k)) { j = k; break; } j = k + 1; }
      if (i + 1 >= n && text.charCodeAt(i) === 60) { if (!final) { partial({ s: i, e: n, cls: "text", v: "<", role: "text" }); } else emitText(i, n); i = n; break; }
      emitText(i, j); i = j; continue;
    }
    // at '<' that opens markup
    if (text.startsWith("<!--", i)) {
      const k = text.indexOf("-->", i + 4);
      if (k < 0) { if (!final) { partial({ s: i, e: n, cls: "comment" }); break; } gaps.add("unterminated_comment"); toks.push({ s: i, e: n, cls: "comment" }); break; }
      toks.push({ s: i, e: k + 3, cls: "comment" }); i = k + 3; continue;
    }
    if (text.startsWith("<![CDATA[", i)) {
      const k = text.indexOf("]]>", i + 9);
      if (k < 0) { if (!final) { partial({ s: i, e: n, cls: "cdata" }); break; } gaps.add("unterminated_cdata"); toks.push({ s: i, e: n, cls: "cdata" }); break; }
      toks.push({ s: i, e: k + 3, cls: "cdata", v: text.slice(i + 9, k) }); i = k + 3; continue;
    }
    if (text.startsWith("<?", i)) {
      const k = text.indexOf("?>", i + 2);
      if (k < 0) { if (!final) { partial({ s: i, e: n, cls: "pi" }); break; } gaps.add("unterminated_pi"); toks.push({ s: i, e: n, cls: "pi" }); break; }
      toks.push({ s: i, e: k + 2, cls: /^<\?xml[\s?]/.test(text.slice(i, i + 7)) ? "decl" : "pi" }); i = k + 2; continue;
    }
    if (text.startsWith("<!", i)) {
      // DOCTYPE (or another declaration): to the matching '>' outside quotes and outside an internal subset [...]
      let j = i + 2, depth = 0, q = 0;
      for (; j < n; j++) {
        const c = text.charCodeAt(j);
        if (q) { if (c === q) q = 0; continue; }
        if (c === 34 || c === 39) q = c; else if (c === 91) depth++; else if (c === 93) depth--; else if (c === 62 && depth <= 0) break;
      }
      if (j >= n) { if (!final) { partial({ s: i, e: n, cls: "doctype" }); break; } gaps.add("unterminated_doctype"); toks.push({ s: i, e: n, cls: "doctype" }); break; }
      toks.push({ s: i, e: j + 1, cls: "doctype" }); i = j + 1; continue;
    }
    if (text.startsWith("</", i)) {
      toks.push({ s: i, e: i + 2, cls: "tag_close_open" });
      let j = i + 2;
      const ns0 = j; while (j < n && !isWs(text.charCodeAt(j)) && text.charCodeAt(j) !== 62) j++;
      if (j >= n && !final) { toks.pop(); partial({ s: i, e: n, cls: "tag_close_open" }); break; }
      const q = text.slice(ns0, j);
      const top = open[open.length - 1];
      toks.push({ s: ns0, e: j, cls: "end_name", q, local: q.includes(":") ? q.split(":").pop() : q, ns: top?.ns ?? null, role: top?.role ?? null });
      while (j < n && isWs(text.charCodeAt(j))) j++;
      if (j < n && text.charCodeAt(j) === 62) { toks.push({ s: j, e: j + 1, cls: "tag_end", selfClosing: false }); j++; }
      else if (j >= n && !final) { /* input ends inside the end tag: nothing more */ }
      else gaps.add("unterminated_tag");
      for (let q2 = toks.length - 1; q2 >= 0 && toks[q2].s >= i; q2--) toks[q2].avail = j < n && toks[toks.length - 1].cls === "tag_end" ? toks[toks.length - 1].e : n;
      if (open.length) { open.pop(); nsStack.pop(); }
      i = j; continue;
    }
    // start tag
    const tagStart = i;
    let j = i + 1;
    const ns0 = j; while (j < n) { const c = text.charCodeAt(j); if (isWs(c) || c === 62 || c === 47 || c === 61) break; j++; }
    if (j >= n && !final) { partial({ s: tagStart, e: n, cls: "tag_open" }); break; }
    const q = text.slice(ns0, j);
    const colon = q.indexOf(":");
    const prefix = colon > 0 ? q.slice(0, colon) : "", local = colon > 0 ? q.slice(colon + 1) : q;
    const tagToks = [{ s: tagStart, e: tagStart + 1, cls: "tag_open" }];
    const nameTok = { s: ns0, e: j, cls: "elem_name", q, prefix, local, ns: null, bound: false, role: null, provisional: false };
    tagToks.push(nameTok);
    // attributes
    const attrs = [];
    let selfClosing = false, closed = false, cut = false;
    const newScope = new Map(nsStack[nsStack.length - 1]);
    while (true) {
      while (j < n && isWs(text.charCodeAt(j))) j++;
      if (j >= n) { cut = true; break; }
      const c = text.charCodeAt(j);
      if (c === 62) { tagToks.push({ s: j, e: j + 1, cls: "tag_end", selfClosing: false }); j++; closed = true; break; }
      if (c === 47 && text.charCodeAt(j + 1) === 62) { tagToks.push({ s: j, e: j + 2, cls: "tag_end", selfClosing: true }); j += 2; selfClosing = true; closed = true; break; }
      if (c === 47 && j + 1 >= n) { cut = true; break; }
      // attribute name
      const as = j; while (j < n) { const d = text.charCodeAt(j); if (isWs(d) || d === 61 || d === 62 || (d === 47 && text.charCodeAt(j + 1) === 62)) break; j++; }
      if (j >= n) { cut = true; break; }
      if (j === as) { j++; gaps.add("stray_character_in_tag"); continue; }
      const an = text.slice(as, j);
      const isNsDecl = an === "xmlns" || an.startsWith("xmlns:");
      const aTok = { s: as, e: j, cls: "attr_name", q: an, local: an.includes(":") ? an.split(":").pop() : an, role: isNsDecl ? "nsdecl" : null };
      if (isNsDecl) aTok.avail = j;   // a namespace declaration is classifiable at once: neither its role nor its value's class depends on the element
      let k = j; while (k < n && isWs(text.charCodeAt(k))) k++;
      if (k >= n) { cut = true; tagToks.push(aTok); break; }
      if (text.charCodeAt(k) !== 61) { tagToks.push(aTok); aTok.noValue = true; gaps.add("attr_without_value"); attrs.push({ q: an, v: null, tok: aTok }); j = k; continue; }
      tagToks.push(aTok);
      tagToks.push({ s: k, e: k + 1, cls: "attr_eq" });
      k++; while (k < n && isWs(text.charCodeAt(k))) k++;
      if (k >= n) { cut = true; break; }
      const qc = text.charCodeAt(k);
      if (qc !== 34 && qc !== 39) {
        // unquoted value (HTML-ish): to whitespace or '>'
        let m = k; while (m < n && !isWs(text.charCodeAt(m)) && text.charCodeAt(m) !== 62) m++;
        gaps.add("unquoted_attribute_value");
        const raw = text.slice(k, m);
        const vTok = { s: k, e: m, cls: "attr_value", v: normAttr(raw, gaps), name: an, role: null };
        tagToks.push(vTok); attrs.push({ q: an, v: vTok.v, tok: aTok, vTok }); j = m; continue;
      }
      const m = text.indexOf(String.fromCharCode(qc), k + 1);
      if (m < 0) { cut = true; break; }
      const vTok = { s: k, e: m + 1, cls: "attr_value", v: normAttr(text.slice(k + 1, m), gaps), name: an, role: isNsDecl ? "nsdecl" : null };
      if (isNsDecl) { vTok.avail = m + 1; vTok.nsClass = C ? (vTok.v === C.modelNs ? "ns_model" : C.diNs.has(vTok.v) ? "ns_di" : "ns_other") : null; }
      tagToks.push(vTok); attrs.push({ q: an, v: vTok.v, tok: aTok, vTok });
      if (an === "xmlns") newScope.set("", vTok.v);
      else if (an.startsWith("xmlns:")) newScope.set(an.slice(6), vTok.v);
      j = m + 1;
    }
    if (cut) {
      if (!final) {
        // emit the complete lexemes of the cut tag, the last one possibly extendable. Every one of them is `pending`: an element's namespace is fixed by
        // xmlns attributes later in the SAME tag, so its class (and its attributes' roles) cannot be said before the tag closes; a causal consumer
        // (the identifier) waits for the tag_end
        // (every lexeme pushed here is complete: a name, '=' or value that the cut interrupted was never pushed)
        for (const t of tagToks) { if (t.avail == null) t.pending = true; toks.push(t); }
        i = n; break;
      }
      gaps.add("unterminated_tag");
      for (const t of tagToks) toks.push(t);
      i = n; break;
    }
    // resolve the element against the scope declared by ITS OWN xmlns attributes and its ancestors
    const uri = prefix ? (newScope.has(prefix) ? newScope.get(prefix) : null) : (newScope.has("") ? newScope.get("") || null : null);
    nameTok.ns = uri; nameTok.bound = uri != null;
    const r = roleOfElem(uri, local, uri != null);
    nameTok.role = r.role; nameTok.provisional = r.provisional;
    const elem = { q, local, ns: uri, role: r.role, provisional: r.provisional };
    for (const a of attrs) {
      a.tok.role = roleOfAttr(elem, a.q);
      if (a.vTok) {
        a.vTok.role = a.tok.role;
        if (a.tok.role === "nsdecl") a.vTok.nsClass = C ? (a.v === C.modelNs ? "ns_model" : C.diNs.has(a.v) ? "ns_di" : "ns_other") : null;
      }
    }
    // AVAILABILITY: every lexeme of a start tag is fully classified only when the tag closes (an xmlns attribute may follow the element name), so `avail`
    // is the tag's end: the identifier timestamps its evidence with it
    for (const t of tagToks) { if (t.avail == null) t.avail = j; toks.push(t); }
    if (!selfClosing) { open.push({ ...elem }); nsStack.push(newScope); }
    i = j;
  }
  return { tokens: toks, gaps: gaps.list() };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// XML reader
// ═══════════════════════════════════════════════════════════════════════════════════════════
/**
 * readXmlTokens(tokens, priors) -> { beings, relations, gaps }
 * beings [{id, kind, cls, span:[s,e], label, at}], relations [{end1, label, end2, at, resolved, span}]. A being is a start tag in the
 * standard's namespace whose class the lexicon NOMINATES as being-bearing and which carries an id; a vendor element with an id is not one.
 */
export function readXmlTokens(tokens, priors) {
  const C = compilePriors(priors).bpmn;
  const gaps = new Gaps();
  const beings = [], relations = [];
  if (!C) return { beings, relations, gaps: [{ reason: "prior_missing:bpmn", count: 1 }] };
  const ids = new Set();
  const stack = [];   // open elements {local, ns, role, provisional, childRefs?}
  let k = 0;
  const N = tokens.length;
  while (k < N) {
    const t = tokens[k];
    if (t.cls === "tag_open") {
      const nameTok = tokens[k + 1];
      if (!nameTok || nameTok.cls !== "elem_name") { k++; continue; }
      const attrs = new Map();
      let m = k + 2, end = null;
      while (m < N && tokens[m].cls !== "tag_end") {
        const a = tokens[m];
        if (a.cls === "attr_name") {
          const v = tokens[m + 2]?.cls === "attr_value" && tokens[m + 1]?.cls === "attr_eq" ? tokens[m + 2] : null;
          if (!attrs.has(a.q)) attrs.set(a.q, { v: v ? v.v : null, role: a.role });
        }
        m++;
      }
      end = tokens[m]?.cls === "tag_end" ? tokens[m] : null;
      if (!end || tokens[m].partial) { k = m + 1; continue; }     // an unfinished tag orders nothing yet
      const el = { local: nameTok.local, ns: nameTok.ns, role: nameTok.role, provisional: nameTok.provisional, span: [t.s, end.e] };
      const modelish = nameTok.ns === C.modelNs || nameTok.provisional;
      const idAttr = attrs.get("id");
      if (modelish && !nameTok.provisional && C.beingClasses.has(el.role) && idAttr?.v != null && idAttr.role === "decl") {
        const nm = attrs.get("name");
        beings.push({ id: idAttr.v, kind: el.local, cls: el.role, span: el.span, label: nm && nm.role === "label" ? nm.v : null, at: end.e });
      }
      if (idAttr?.v != null && nameTok.ns === C.modelNs) ids.add(idAttr.v);
      if (nameTok.ns === C.modelNs) {
        const rule = C.rules[el.local];
        if (rule && rule.from && rule.to) {
          const a = attrs.get(rule.from), b = attrs.get(rule.to);
          if (a?.v != null && b?.v != null) relations.push({ end1: a.v, label: rule.label, end2: b.v, at: end.e, span: el.span });
          else gaps.add("edge_without_endpoints");
        } else if (rule && rule.fromId && rule.to) {
          const id = idAttr?.v, b = attrs.get(rule.to);
          if (id != null && b?.v != null) relations.push({ end1: id, label: rule.label, end2: b.v, at: end.e, span: el.span });
        }
      }
      if (!end.selfClosing) stack.push({ ...el, sources: [], targets: [], depth: stack.length });
      else if (nameTok.ns === C.modelNs && C.rules[el.local]?.fromChild) { /* an empty data association orders nothing */ }
      k = m + 1; continue;
    }
    if (t.cls === "tag_close_open") {
      const e2 = tokens[k + 1], e3 = tokens[k + 2];
      const top = stack.pop();
      if (top && top.ns === C.modelNs) {
        const rule = C.rules[top.local];
        if (rule && rule.fromChild && e3?.cls === "tag_end") {
          for (const s_ of top.sources) for (const t_ of top.targets) relations.push({ end1: s_, label: rule.label, end2: t_, at: e3.e, span: top.span });
        }
      }
      k += e2 && e2.cls === "end_name" ? (e3 && e3.cls === "tag_end" ? 3 : 2) : 1; continue;
    }
    if (t.cls === "text" && t.role === "ref_text" && !t.partial) {
      const par = stack[stack.length - 1], gp = stack[stack.length - 2];
      if (par && gp && gp.ns === C.modelNs) {
        const rule = C.rules[gp.local];
        if (rule?.fromChild && par.local === rule.fromChild) gp.sources.push(t.v);
        else if (rule?.toChild && par.local === rule.toChild) gp.targets.push(t.v);
      }
    }
    k++;
  }
  for (const r of relations) r.resolved = ids.has(r.end1) && ids.has(r.end2);
  return { beings, relations, gaps: gaps.list() };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// DOT ear and reader
// ═══════════════════════════════════════════════════════════════════════════════════════════
const isIdStart = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c >= 128;
const isIdChar = (c) => isIdStart(c) || (c >= 48 && c <= 57);
const isDigit = (c) => c >= 48 && c <= 57;

/**
 * lexDot(text, {priors, final}) -> { tokens, gaps }
 * cls: kw (graph digraph subgraph node edge strict; v lower-cased), id, num, str (v unescaped), html (v raw with <>), op (-> --), lbrace rbrace
 * lbracket rbracket eq semi comma colon plus, comment, other.  After lexing, a ROLE pass (one token of lookahead) assigns to id/str/num/html
 * tokens: node_id | attr_name | attr_value | graph_name | port.
 */
export function lexDot(text, { priors = null, final = true } = {}) {
  const D = compilePriors(priors).dot;
  const gaps = new Gaps();
  if (!D) gaps.add("prior_missing:dot");
  const KW = D?.keywords ?? new Set(["graph", "digraph", "subgraph", "node", "edge", "strict"]);
  const toks = [];
  const n = text.length;
  let i = 0, lineStart = true;
  const partial = (t) => { t.partial = true; toks.push(t); };
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 10) { lineStart = true; i++; continue; }
    if (isWs(c)) { i++; continue; }
    const wasLineStart = lineStart; lineStart = false;
    if (c === 47 && text.charCodeAt(i + 1) === 47) { let j = text.indexOf("\n", i); if (j < 0) j = n; if (j >= n && !final) { partial({ s: i, e: n, cls: "comment" }); break; } toks.push({ s: i, e: j, cls: "comment" }); i = j; continue; }
    if (c === 47 && text.charCodeAt(i + 1) === 42) { const j = text.indexOf("*/", i + 2); if (j < 0) { if (!final) { partial({ s: i, e: n, cls: "comment" }); break; } gaps.add("unterminated_comment"); toks.push({ s: i, e: n, cls: "comment" }); break; } toks.push({ s: i, e: j + 2, cls: "comment" }); i = j + 2; continue; }
    // `#` to end of line: the grammar names it at the start of a line (preprocessor output); real files, and pydot, also write it mid-line as a comment,
    // so it is read as a comment there too and counted (typed), never silently
    if (c === 35) { let j = text.indexOf("\n", i); if (j < 0) { if (!final) { partial({ s: i, e: n, cls: "comment" }); break; } j = n; } if (!wasLineStart) gaps.add("hash_comment_mid_line"); toks.push({ s: i, e: j, cls: "comment" }); i = j; continue; }
    if (c === 34) {
      let j = i + 1;
      while (j < n) { const d = text.charCodeAt(j); if (d === 92) { j += 2; continue; } if (d === 34) break; j++; }
      if (j >= n) { if (!final) { partial({ s: i, e: n, cls: "str" }); break; } gaps.add("unterminated_string"); toks.push({ s: i, e: n, cls: "str", v: text.slice(i + 1) }); break; }
      toks.push({ s: i, e: j + 1, cls: "str", v: text.slice(i + 1, j).replace(/\\\r?\n/g, "").replace(/\\"/g, '"') }); i = j + 1; continue;
    }
    if (c === 60) {
      let j = i + 1, depth = 1;
      while (j < n && depth > 0) { const d = text.charCodeAt(j); if (d === 60) depth++; else if (d === 62) depth--; j++; }
      if (depth > 0) { if (!final) { partial({ s: i, e: n, cls: "html" }); break; } gaps.add("unterminated_html_string"); toks.push({ s: i, e: n, cls: "html", v: text.slice(i) }); break; }
      toks.push({ s: i, e: j, cls: "html", v: text.slice(i, j) }); i = j; continue;
    }
    if (c === 45 && (text.charCodeAt(i + 1) === 62 || text.charCodeAt(i + 1) === 45)) { toks.push({ s: i, e: i + 2, cls: "op", v: text.charCodeAt(i + 1) === 62 ? "->" : "--" }); i += 2; continue; }
    if (c === 45 && i + 1 >= n && !final) { partial({ s: i, e: n, cls: "other" }); break; }
    if (isDigit(c) || c === 46 || c === 45) {
      let j = i + (c === 45 ? 1 : 0);
      const a = j; while (j < n && isDigit(text.charCodeAt(j))) j++;
      if (j < n && text.charCodeAt(j) === 46) { j++; while (j < n && isDigit(text.charCodeAt(j))) j++; }
      if (j > a && !(j === a + 1 && text.charCodeAt(a) === 46)) {
        if (j >= n && !final) { partial({ s: i, e: n, cls: "num", v: text.slice(i, n) }); break; }
        toks.push({ s: i, e: j, cls: "num", v: text.slice(i, j) }); i = j; continue;
      }
      toks.push({ s: i, e: i + 1, cls: "other" }); gaps.add("stray_character"); i++; continue;
    }
    if (isIdStart(c)) {
      let j = i + 1; while (j < n && isIdChar(text.charCodeAt(j))) j++;
      if (j >= n && !final) { partial({ s: i, e: n, cls: "id", v: text.slice(i, n) }); break; }
      const w = text.slice(i, j), lw = w.toLowerCase();
      toks.push(KW.has(lw) ? { s: i, e: j, cls: "kw", v: lw } : { s: i, e: j, cls: "id", v: w }); i = j; continue;
    }
    const P = { 123: "lbrace", 125: "rbrace", 91: "lbracket", 93: "rbracket", 61: "eq", 59: "semi", 44: "comma", 58: "colon", 43: "plus" }[c];
    if (P) { toks.push({ s: i, e: i + 1, cls: P }); i++; continue; }
    toks.push({ s: i, e: i + 1, cls: "other" }); gaps.add("stray_character"); i++;
  }
  assignDotRoles(toks);
  return { tokens: toks, gaps: gaps.list() };
}

const isVal = (t) => t && (t.cls === "id" || t.cls === "str" || t.cls === "num" || t.cls === "html");
/** role pass: one token of lookahead. Contexts: after graph/digraph -> graph_name; after subgraph -> graph_name; inside [..]: name '=' value; at statement level: ID '=' ID is an attribute statement, else node_id; after ':' -> port. */
function assignDotRoles(toks) {
  let bracket = 0, expectName = null;
  let afterEq = false, afterColon = false;
  const sig = toks.filter((t) => t.cls !== "comment");
  for (let k = 0; k < sig.length; k++) {
    const t = sig[k], prev = sig[k - 1], next = sig[k + 1];
    if (t.cls === "lbracket") { bracket++; afterEq = false; continue; }
    if (t.cls === "rbracket") { bracket = Math.max(0, bracket - 1); afterEq = false; continue; }
    if (t.cls === "kw") { expectName = t.v === "graph" || t.v === "digraph" || t.v === "subgraph" ? "graph_name" : null; if (t.v === "graph" && bracket === 0 && next && next.cls === "lbracket") expectName = null; continue; }
    if (t.cls === "eq") { afterEq = true; continue; }
    if (t.cls === "colon") { afterColon = true; continue; }
    if (t.cls === "semi" || t.cls === "comma" || t.cls === "lbrace" || t.cls === "rbrace") { afterEq = false; afterColon = false; if (t.cls === "lbrace" || t.cls === "rbrace") expectName = null; continue; }
    if (!isVal(t)) { afterColon = false; continue; }
    if (expectName) { t.role = expectName; expectName = null; continue; }
    if (afterColon) { t.role = "port"; afterColon = false; continue; }
    if (afterEq) { t.role = "attr_value"; afterEq = false; continue; }
    if (bracket > 0) { t.role = next && next.cls === "eq" ? "attr_name" : "attr_name"; continue; }
    // statement level
    t.role = next && next.cls === "eq" ? "attr_name" : "node_id";
  }
}

/**
 * readDotTokens(tokens) -> { beings, relations, subgraphs, gaps, directed, strict }
 * Recursive descent over the DOT grammar. beings: [{id, kind:"node", span, at}] in first-mention order (explicit node statement or edge endpoint);
 * relations: [{end1, label: directed|undirected, end2, at}]; an edge end that is a subgraph is a typed gap (compound_endpoint), not guessed.
 */
export function readDotTokens(tokens) {
  const gaps = new Gaps();
  const T = tokens.filter((t) => t.cls !== "comment" && !t.partial);
  let p = 0;
  const beings = [], relations = [], subgraphs = [];
  const seen = new Set();
  const out = { beings, relations, subgraphs, directed: null, strict: false, gaps: [] };
  const peek = () => T[p];
  const idv = (t) => (t.cls === "html" ? t.v : t.v);
  const addNode = (t) => { const id = idv(t); if (!seen.has(id)) { seen.add(id); beings.push({ id, kind: "node", span: [t.s, t.e], at: t.e }); } return id; };
  let directed = null;
  function skipPort() { let used = false; while (peek() && peek().cls === "colon") { p++; if (isVal(peek())) { p++; } used = true; } return used; }
  function attrList() { while (peek() && peek().cls === "lbracket") { p++; while (peek() && peek().cls !== "rbracket") p++; if (peek()) p++; } }
  function stmtList() {
    while (p < T.length && peek().cls !== "rbrace") {
      const t = peek();
      if (t.cls === "semi" || t.cls === "comma") { p++; continue; }
      const start = p;
      stmt();
      if (p === start) { p++; gaps.add("dot_parse_recovered"); }
    }
    if (peek() && peek().cls === "rbrace") p++;
  }
  // endpoint: node id [port] | subgraph. returns {kind:"node", id, tok} or {kind:"sub"}
  function endpoint() {
    let t = peek();
    if (!t) return null;
    if (isVal(t)) {
      p++;
      // string concatenation: "a" + "b" is one ID (the grammar's only operator on IDs)
      if (t.cls === "str") while (peek() && peek().cls === "plus" && T[p + 1] && T[p + 1].cls === "str") { t = { ...t, e: T[p + 1].e, v: t.v + T[p + 1].v }; p += 2; }
      skipPort(); return { kind: "node", tok: t };
    }
    if (t.cls === "kw" && t.v === "subgraph") { subgraph(); return { kind: "sub" }; }
    if (t.cls === "lbrace") { subgraph(); return { kind: "sub" }; }
    return null;
  }
  function subgraph() {
    if (peek() && peek().cls === "kw" && peek().v === "subgraph") { p++; if (peek() && isVal(peek())) { subgraphs.push(peek().v); p++; } }
    if (peek() && peek().cls === "lbrace") { p++; stmtList(); }
  }
  function stmt() {
    const t = peek();
    if (t.cls === "kw" && (t.v === "node" || t.v === "edge" || t.v === "graph") && T[p + 1] && T[p + 1].cls === "lbracket") { p++; attrList(); return; }
    if (t.cls === "kw" && t.v === "subgraph" || t.cls === "lbrace") {
      const first = endpoint();
      edgeRest(first);
      return;
    }
    if (isVal(t)) {
      if (T[p + 1] && T[p + 1].cls === "eq") { p += 2; if (peek() && isVal(peek())) p++; while (peek() && peek().cls === "plus") { p++; if (peek() && isVal(peek())) p++; } return; }
      const first = endpoint();
      edgeRest(first);
      return;
    }
    p++; gaps.add("dot_parse_recovered");
  }
  function edgeRest(first) {
    const chain = [first];
    while (peek() && peek().cls === "op") {
      const op = peek(); p++;
      if (directed != null && ((op.v === "->") !== directed)) gaps.add("edge_op_does_not_match_graph_type");
      const nx = endpoint();
      chain.push(nx);
    }
    if (chain.length === 1) {
      if (first && first.kind === "node") addNode(first.tok);
    } else {
      for (const e of chain) if (e && e.kind === "node") addNode(e.tok);
      for (let a = 0; a + 1 < chain.length; a++) {
        const x = chain[a], y = chain[a + 1];
        if (!x || !y) { gaps.add("dot_parse_recovered"); continue; }
        if (x.kind !== "node" || y.kind !== "node") { gaps.add("compound_endpoint"); continue; }
        relations.push({ end1: idv(x.tok), label: directed === false ? "undirected" : "directed", end2: idv(y.tok), at: y.tok.e });
      }
    }
    attrList();
  }
  // graph: [strict] (graph|digraph) [ID] '{' stmt_list '}'
  if (peek() && peek().cls === "kw" && peek().v === "strict") { out.strict = true; p++; }
  if (peek() && peek().cls === "kw" && (peek().v === "graph" || peek().v === "digraph")) {
    directed = peek().v === "digraph"; out.directed = directed; p++;
    if (peek() && isVal(peek())) p++;
    if (peek() && peek().cls === "lbrace") { p++; stmtList(); } else gaps.add("dot_parse_recovered");
  } else gaps.add("not_a_diagram_text");
  out.gaps = gaps.list();
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// public ear / read
// ═══════════════════════════════════════════════════════════════════════════════════════════
/** sniff(text) -> "xml" | "dot" | null: a structural look at the first lexeme, no prior involved. */
export function sniff(text) {
  const s = text.replace(/^﻿/, "");
  const m = /^\s*(<|(?:(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/|#[^\n]*\n)\s*)*(?:strict\s+)?(?:di)?graph\b)/i.exec(s);
  if (!m) return null;
  return m[1] === "<" ? "xml" : "dot";
}
const DIALECT_KIND = { bpmn_xml: "xml", dot: "dot" };

/** ear(text, {priors, dialect, final}) -> tokens (array, each {s,e,cls,...}); dialect defaults to sniff(text); a stranger yields []. */
export function ear(text, opts = {}) { return lex(text, opts).tokens; }
/** lex(text, opts) -> { dialect, tokens, gaps } */
export function lex(text, { priors = null, dialect = null, final = true } = {}) {
  const kind = dialect ? DIALECT_KIND[dialect] ?? null : sniff(text);
  if (kind === "xml") return { dialect: "bpmn_xml", ...lexXml(text, { priors, final }) };
  if (kind === "dot") return { dialect: "dot", ...lexDot(text, { priors, final }) };
  return { dialect: null, tokens: [], gaps: [{ reason: dialect && !DIALECT_KIND[dialect] ? `dialect_not_read:${dialect}` : "not_a_diagram_text", count: 1 }] };
}

/** read(text, {priors, dialect, final}) -> { dialect, beings:[{id,kind,span,at,...}], relations:[{end1,label,end2,at,...}], gaps }
 *  final=false: the input may still grow, so a lexeme the cut leaves extendable orders nothing yet (the causal check reads prefixes this way). */
export function read(text, { priors = null, dialect = null, final = true } = {}) {
  const lx = lex(text, { priors, dialect, final });
  if (lx.dialect === "bpmn_xml") {
    const r = readXmlTokens(lx.tokens, priors);
    return { dialect: lx.dialect, beings: r.beings, relations: r.relations, gaps: [...lx.gaps, ...r.gaps] };
  }
  if (lx.dialect === "dot") {
    const r = readDotTokens(lx.tokens);
    return { dialect: lx.dialect, beings: r.beings, relations: r.relations, subgraphs: r.subgraphs, directed: r.directed, gaps: [...lx.gaps, ...r.gaps] };
  }
  return { dialect: null, beings: [], relations: [], gaps: lx.gaps };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// R0: the identifier (causal, one token at a time)
// ═══════════════════════════════════════════════════════════════════════════════════════════
/**
 * dotEvents(tokens, {vocab, final}) -> [{sym, end}]: the identifier's evidence for DOT is the STATEMENTS the grammar recognises, not raw punctuation.
 * A statement is well-formed or it is `S:bad`: `a->b;` is an edge, but `p->next = q;` (the same tokens in C) ends in `=` and is bad; `A-->B` (mermaid) has no
 * endpoint after `--`; scrambled words form no statement. Symbols: S:header_graph S:header_digraph S:header_strict S:edge S:edge_attrs S:node S:node_attrs
 * S:default_attrs S:graph_attr S:subgraph S:close S:attr_known S:attr_unknown S:bad. `known` = the attribute name is in the TRAIN-attested vocabulary of the
 * grammar prior. A statement is timestamped at the end of the token AFTER it (a node statement is only a node once `->` has not followed).
 */
export function dotEvents(tokens, { vocab = null, final = false } = {}) {
  const T = tokens.filter((t) => t.cls !== "comment" && !t.partial);
  const out = [];
  let p = 0;
  const emit = (sym, last) => { const nx = T[last + 1]; if (nx) out.push({ sym, end: nx.e }); else if (final) out.push({ sym, end: T[last].e }); };
  // VOCABULARY GATE (A3): a name=value pair is evidence only when the name is attested in the TRAIN vocabulary of the grammar prior (the prior NOMINATES; an unknown
  // name could be anything, and random bracket-and-equals soup, which a character shuffle makes, is full of them)
  const isKnown = (name) => !!(vocab && vocab.has(String(name).toLowerCase()));
  // attribute list starting at T[p] === '[': emits S:attr_known per well-formed pair with a known name; returns {last, knownPairs}
  function attrList() {
    let q = p + 1; let knownPairs = 0;
    while (q < T.length && T[q].cls !== "rbracket") {
      if (isVal(T[q]) && T[q + 1] && T[q + 1].cls === "eq" && T[q + 2] && isVal(T[q + 2])) {
        let r = q + 2;
        while (T[r + 1] && T[r + 1].cls === "plus" && T[r + 2] && isVal(T[r + 2])) r += 2;
        if (isKnown(T[q].v)) { emit("S:attr_known", r); knownPairs++; }
        q = r + 1;
      } else if (T[q].cls === "comma" || T[q].cls === "semi") q++;
      else { emit("S:bad", q); q++; }
    }
    return { last: q < T.length ? q : T.length - 1, knownPairs };
  }
  const isEnd = (q) => q >= T.length;
  while (p < T.length) {
    const t = T[p];
    if (t.cls === "semi" || t.cls === "comma") { p++; continue; }
    if (t.cls === "rbrace") { emit("S:close", p); p++; continue; }
    if (t.cls === "kw" && (t.v === "strict" || t.v === "graph" || t.v === "digraph") && !(t.v === "graph" && T[p + 1] && T[p + 1].cls === "lbracket")) {
      let q = p; let strict = false;
      if (T[q].v === "strict") { strict = true; q++; }
      if (T[q] && T[q].cls === "kw" && (T[q].v === "graph" || T[q].v === "digraph")) {
        const which = T[q].v; q++;
        if (T[q] && isVal(T[q])) q++;
        if (T[q] && T[q].cls === "lbrace") { emit(`S:header_${which}`, q); p = q + 1; continue; }
        if (isEnd(q) ) { p = q; continue; }
      }
      emit("S:bad", p); p++; continue;
    }
    if (t.cls === "kw" && (t.v === "node" || t.v === "edge" || t.v === "graph") && T[p + 1] && T[p + 1].cls === "lbracket") { p++; const { last } = attrList(); emit("S:default_attrs", last); p = last + 1; continue; }
    if ((t.cls === "kw" && t.v === "subgraph") || t.cls === "lbrace") {
      let q = p; if (T[q].cls === "kw") { q++; if (T[q] && isVal(T[q])) q++; }
      if (T[q] && T[q].cls === "lbrace") { emit("S:subgraph", q); p = q + 1; continue; }
      emit("S:bad", p); p++; continue;
    }
    if (isVal(t)) {
      if (T[p + 1] && T[p + 1].cls === "eq") {
        if (T[p + 2] && isVal(T[p + 2])) { let r = p + 2; while (T[r + 1] && T[r + 1].cls === "plus" && T[r + 2] && isVal(T[r + 2])) r += 2; if (isKnown(t.v)) emit("S:graph_attr", r); p = r + 1; }
        else { emit("S:bad", p + 1); p += 2; }
        continue;
      }
      // endpoint chain
      let q = p, ops = 0, ok = true;
      const endpoint = () => {
        if (T[q] && isVal(T[q])) {
          q++;
          while (T[q] && T[q].cls === "plus" && T[q + 1] && isVal(T[q + 1])) q += 2;
          while (T[q] && T[q].cls === "colon" && T[q + 1] && isVal(T[q + 1])) q += 2;
          return true;
        }
        if (T[q] && ((T[q].cls === "kw" && T[q].v === "subgraph") || T[q].cls === "lbrace")) { // compound endpoint: skip the balanced braces
          let depth = 0; let r = q; while (r < T.length && T[r].cls !== "lbrace") r++;
          for (; r < T.length; r++) { if (T[r].cls === "lbrace") depth++; else if (T[r].cls === "rbrace") { depth--; if (depth === 0) break; } }
          q = Math.min(r + 1, T.length); return true;
        }
        return false;
      };
      endpoint();
      while (T[q] && T[q].cls === "op") { q++; ops++; if (!endpoint()) { ok = false; break; } }
      let last = q - 1;
      let attrs = false;
      while (ok && T[q] && T[q].cls === "lbracket") { p = q; const l = attrList(); if (l.knownPairs > 0) attrs = true; last = l.last; q = l.last + 1; }
      if (ok && T[q] && T[q].cls === "eq") ok = false;             // `p->next = q`: not a DOT statement
      if (ok && T[q] && T[q].cls === "other") ok = false;          // `f(x)`, `a.b`, `A-->B`: stray punctuation follows
      if (!ok) { emit("S:bad", Math.max(last, p)); p = Math.max(q, p + 1); continue; }
      // a bare identifier (a node statement with no operator and no known attribute) is a WORD: it is the same in prose, shell and a node list, so it carries no evidence (A3b)
      if (ops || attrs) emit(ops ? (attrs ? "S:edge_attrs" : "S:edge") : "S:node_attrs", last);
      p = q;
      continue;
    }
    emit("S:bad", p); p++;
  }
  return out;
}

/** the evidence symbol of one token for the dialect's model, or null when the token carries none. */
export function symbolOf(tok, dialect) {
  if (dialect === "bpmn_xml") {
    switch (tok.cls) {
      case "elem_name": return `E:${tok.role ?? "none"}${tok.provisional ? "~" : ""}`;
      case "end_name": return `Z:${tok.role ?? "none"}`;
      case "attr_name": return tok.role === "nsdecl" ? "A:nsdecl" : `A:${tok.role === "ext" || tok.role == null ? "x" : "m"}:${tok.role ?? "none"}`;
      case "attr_value": return tok.nsClass ? `V:${tok.nsClass}` : null;
      case "decl": case "pi": case "comment": case "doctype": case "cdata": return `X:${tok.cls}`;
      case "text": return tok.role === "ref_text" ? "T:ref" : "T";
      default: return null;
    }
  }
  if (dialect === "dot") {
    switch (tok.cls) {
      case "kw": return `K:${tok.v}`;
      case "op": return tok.v === "->" ? "O:arrow" : "O:dash";
      case "id": case "str": case "num": case "html": return `${tok.cls === "html" ? "H" : tok.cls === "str" ? "Q" : tok.cls === "num" ? "N" : "I"}:${tok.role ?? "none"}`;
      case "lbrace": case "rbrace": case "lbracket": case "rbracket": case "eq": case "semi": case "comma": case "colon": case "plus": return `P:${tok.cls}`;
      case "comment": return "C";
      default: return null;
    }
  }
  return null;
}
/** symbolsOf(text, dialect, {priors, final}) -> [{sym, end}] over the COMPLETE tokens of the text (partial tokens carry no evidence). */
export function symbolsOf(text, dialect, { priors = null, final = false } = {}) {
  const lx = lex(text, { priors, dialect, final });
  if (dialect === "dot") return dotEvents(lx.tokens, { vocab: compilePriors(priors).dot?.attrVocab ?? null, final }).sort((a, b) => a.end - b.end);
  const out = [];
  // causality: a token of an unfinished XML tag is `pending` (its class depends on the rest of the tag); in DOT the role of an identifier depends on
  // the NEXT token (`a = b` vs `a -> b`), so when the stream may still grow the last complete token waits one step
  const toks = lx.tokens;
  let last = toks.length - 1;
  while (last >= 0 && toks[last].partial) last--;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.partial || t.pending) continue;
    if (!final && dialect === "dot" && i === last) continue;
    const s = symbolOf(t, dialect);
    // a symbol is timestamped when it became KNOWABLE: the end of its tag (XML) or of the next significant token (DOT, whose roles look one token ahead)
    let end = t.avail ?? t.e;
    if (dialect === "dot") { let k = i + 1; while (k < toks.length && toks[k].cls === "comment") k++; if (toks[k] && !toks[k].partial) end = toks[k].e; else if (final) end = t.e; }
    if (s != null) out.push({ sym: s, end });
  }
  // consume in the order the evidence became KNOWABLE (stable): a namespace declaration inside a long root tag is available before the element's own class
  out.sort((a, b) => a.end - b.end);
  return out;
}

/**
 * createIdentifier({priors, decay, bigram, dialects}) — feed [{sym,end}] per dialect via push(dialect, item), read the verdict after each.
 *  S_t = max(0, gamma * S_{t-1} + llr_t) per dialect; llr = TRAIN-estimated class-transition log-likelihood ratio (dialect vs background, the
 *  transition smoothed toward each model's own unigram). named latches when S >= A (A calibrated on held-back TRAIN background, never below the
 *  Wald bound). Identity does not decay, presence does: `present` is S >= A now; `system` stays named once named. gamma is the prior's dmdWindow measurement.
 */
export function createIdentifier({ priors = null, decay = true, bigram = true, dialects = DIALECTS } = {}) {
  const idp = priors?.identity;
  if (!idp) {
    const gaps = [{ reason: "prior_missing:identity", count: 1 }];
    const dead = { system: null, present: false, evidence: {}, gaps, first_named_at: null };
    return { push() { return dead; }, state() { return dead; }, gaps };
  }
  const st = {};
  for (const d of dialects) {
    const m = idp.models?.[d];
    if (!m) continue;
    st[d] = { S: 0, prev: "^", named: false, firstAt: null, m, gamma: decay ? m.window.gamma : 1, A: m.sprt.A, n: 0 };
  }
  const state = () => {
    const named = Object.entries(st).filter(([, s]) => s.named).sort((a, b) => b[1].S - a[1].S);
    return {
      system: named.length ? named[0][0] : null,
      named_dialects: named.map(([d]) => d),
      present: Object.fromEntries(Object.entries(st).map(([d, s]) => [d, s.S >= s.A])),
      evidence: Object.fromEntries(Object.entries(st).map(([d, s]) => [d, s.S])),
      first_named_at: Object.fromEntries(Object.entries(st).map(([d, s]) => [d, s.firstAt])),
      gaps: [],
    };
  };
  return {
    push(dialect, item) {
      const s = st[dialect]; if (!s) return state();
      const cur = item.sym;
      const llr = bigram ? (s.prev === "^" ? 0 : s.m.bigram_llr[`${s.prev}>${cur}`] ?? s.m.unigram_llr[cur] ?? s.m.unseen_llr ?? 0) : (s.m.unigram_llr[cur] ?? s.m.unseen_llr ?? 0);
      s.S = Math.max(0, s.gamma * s.S + llr);
      s.prev = cur; s.n++;
      if (!s.named && s.S >= s.A) { s.named = true; s.firstAt = item.end; }
      return state();
    },
    state,
  };
}

/**
 * identify(text, {priors, decay, bigram, final}) -> final state of a fresh identifier fed every complete token of the text, per dialect.
 * Streams are cut by CHARACTER (the instrument's windows): tokens the cut leaves incomplete carry no evidence.
 */
export function identify(text, { priors = null, decay = true, bigram = true, final = false, dialects = DIALECTS } = {}) {
  const idf = createIdentifier({ priors, decay, bigram, dialects });
  let st = idf.state();
  for (const d of dialects) for (const it of symbolsOf(text, d, { priors, final })) st = idf.push(d, it);
  // dialect streams are independent; the state after all of them is the verdict
  return st;
}

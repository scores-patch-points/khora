// adapters/notation/chem_smiles.js — CHEMICAL LINEAR NOTATION (SMILES, InChI, IUPAC names; SELFIES/formula/English only NAMED).
//
// The kernel stays medium-blind (READING-SPEC S6/S16): everything that knows what a "[nH]" or a "/c1-2" is lives HERE.
// This module is the SYSTEM UNDER TEST of eval/notation-competence/chem_smiles.mjs; it is never the gold.
//
// WHAT THIS READS, AND UNDER WHICH GIVER (READING-POLICY 3: priors REFUSE or NOMINATE, never admit)
//   priors/notation-chem_smiles-elements.json   element table (PubChem periodic table export of the IUPAC/NIST data; public domain)
//                                               + the SMILES organic-subset valence facts (Daylight theory manual / OpenSMILES v1.0)
//                                               + TRAIN tallies (ChEBI+ChEMBL). REFUSES a bracket whose symbol is no element.
//   priors/notation-chem_smiles-grammar.json    SMILES lexical classes (Daylight / OpenSMILES), InChI layer prefixes (InChI Technical
//                                               Manual, IUPAC-InChI/InChI, MIT), SELFIES alphabet (selfies 2.2.0, MIT). Facts only.
//   priors/notation-chem_smiles-system.json     R0: character-LM + discretised-feature naive-Bayes fitted on TRAIN only. NOMINATES.
//   priors/notation-chem_smiles-nameparts.json  name n-gram -> element evidence tallied on TRAIN (ChEBI IUPAC names x ChEBI structures).
// A system with no received prior is a TYPED GAP (WLN: no open corpus, no open writer; see UNREAD).
//
// CAUSAL (READING-SPEC S3): every reader here walks the text left to right and emits each being / relation at the token that
// completes it ("at" = token index). Nothing about the whole string judges an earlier unit. Two things are decided only when
// the text ENDS and are flagged as such: the resolution of an implicit aromatic-or-single bond (needs ring context that may still
// be coming) and the implicit-H count (needs every bond of the atom). The eval checks monotonicity of atoms/bonds/rings on prefixes.
//
// EXPORTS
//   loadPriors({dir}) -> {elements, grammar, system, nameparts}   (any may be null; every function degrades to a typed gap)
//   identify(text, {priors, complete}) -> {system, posterior, features, gap}      (R0)
//   ear(text, {system, priors})   -> [{text,start,end,cls,sub,...}]               (R1/R2)
//   read(text, {system, priors, final}) -> {system, tokens, beings:[{id,kind,span,...}], relations:[{end1,label,end2,...}], gaps}
//   featuresOf, graphOf, UNREAD, SYSTEMS
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FAMILY = "chem_smiles";
export const SYSTEMS = ["smiles", "inchi", "selfies", "formula", "iupac_name", "english"];
/** Systems of this family that have NO received prior / open corpus: a typed gap, never a silent pass. */
export const UNREAD = {
  wln: { gap: "no_received_prior", missing: "an open (CC0/MIT/BSD/CC-BY) Wiswesser Line Notation corpus and an open WLN WRITER to derive gold; Open Babel (GPL) documents WLN as read-only and its Python wheel carries no WLN format" },
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PRIOR_DIR = path.join(HERE, "..", "..", "priors");

export function loadPriors({ dir = PRIOR_DIR } = {}) {
  const rd = (k) => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, `notation-chem_smiles-${k}.json`), "utf8")); } catch { return null; }
  };
  return { elements: rd("elements"), grammar: rd("grammar"), system: rd("system"), nameparts: rd("nameparts") };
}
let _P = null;
const PR = (p) => p ?? (_P ??= loadPriors());

// ───────────────────────────── helpers ─────────────────────────────
const isDigit = (c) => c >= "0" && c <= "9";
const isUpper = (c) => c >= "A" && c <= "Z";
const isLower = (c) => c >= "a" && c <= "z";
const elementSet = (P) => (P.elements ? new Set(Object.keys(P.elements.symbols)) : null);

const BOND_NAME = (G, ch) => G.smiles.bond_chars[ch] ?? null;

// ───────────────────────────── SMILES: ear ─────────────────────────────
// bracket content: isotope? symbol chirality? hcount? charge? class?
const BRACKET = /^(\d+)?(\*|[A-Z][a-z]?|[a-z][a-z]?)((?:@@?|@(?:TH|AL|SP|TB|OH)\d+))?(?:H(\d*))?(\+\+|--|[+-]\d*)?(?::(\d+))?$/;

function parseBracket(content, P, E) {
  const m = BRACKET.exec(content);
  if (!m) return { ok: false, reason: "bracket_grammar" };
  let [, iso, sym, chir, hc, chg, cls] = m;
  let element = sym, aromatic = false;
  if (sym === "*") { element = "*"; }
  else if (isLower(sym[0])) {
    if (!P.grammar.smiles.aromatic_bracket.includes(sym)) return { ok: false, reason: "aromatic_symbol_unknown" };
    aromatic = true; element = sym[0].toUpperCase() + sym.slice(1);
  } else if (!E.has(sym)) {
    // "[Cn]" style two-letter symbols that are no element: REFUSE (prior refuses, never admits)
    return { ok: false, reason: "symbol_not_element" };
  }
  let charge = 0;
  if (chg) {
    if (chg === "++") charge = 2; else if (chg === "--") charge = -2;
    else { const s = chg[0] === "+" ? 1 : -1; const n = chg.length > 1 ? parseInt(chg.slice(1), 10) : 1; charge = s * n; }
  }
  return { ok: true, element, aromatic, isotope: iso ? parseInt(iso, 10) : 0, chirality: chir || null, h: hc === undefined ? 0 : hc === "" ? 1 : parseInt(hc, 10), charge, atomClass: cls ? parseInt(cls, 10) : null };
}

/** SMILES ear: left-to-right maximal munch; returns tokens (never throws). */
function earSmiles(text, P) {
  const G = P.grammar, E = elementSet(P);
  if (!G || !E) return { tokens: [], gap: "prior_missing:" + (!G ? "grammar" : "elements") };
  const S = G.smiles;
  const org2 = S.organic_subset.filter((s) => s.length === 2), org1 = new Set(S.organic_subset.filter((s) => s.length === 1));
  const aro = new Set(S.aromatic_organic);
  const toks = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (c === "[") {
      const j = text.indexOf("]", i + 1);
      if (j < 0) { toks.push({ text: text.slice(i), start: i, end: n, cls: "incomplete", sub: "bracket_open" }); break; }
      const content = text.slice(i + 1, j);
      const b = content.includes("[") ? { ok: false, reason: "nested_bracket" } : parseBracket(content, P, E);
      if (b.ok) toks.push({ text: text.slice(i, j + 1), start: i, end: j + 1, cls: "atom", sub: "bracket", element: b.element, aromatic: b.aromatic, charge: b.charge, isotope: b.isotope, h: b.h, chirality: b.chirality, atomClass: b.atomClass });
      else toks.push({ text: text.slice(i, j + 1), start: i, end: j + 1, cls: "unknown", sub: "bracket_refused", reason: b.reason });
      i = j + 1; continue;
    }
    if (isUpper(c) && i + 1 < n && org2.includes(c + text[i + 1])) {
      toks.push({ text: c + text[i + 1], start: i, end: i + 2, cls: "atom", sub: "organic", element: c + text[i + 1], aromatic: false, charge: 0, isotope: 0, h: null, chirality: null });
      i += 2; continue;
    }
    if (org1.has(c)) { toks.push({ text: c, start: i, end: i + 1, cls: "atom", sub: "organic", element: c, aromatic: false, charge: 0, isotope: 0, h: null, chirality: null }); i++; continue; }
    if (aro.has(c)) { toks.push({ text: c, start: i, end: i + 1, cls: "atom", sub: "aromatic", element: c.toUpperCase(), aromatic: true, charge: 0, isotope: 0, h: null, chirality: null }); i++; continue; }
    if (c === S.wildcard) { toks.push({ text: c, start: i, end: i + 1, cls: "atom", sub: "wildcard", element: "*", aromatic: false, charge: 0, isotope: 0, h: null, chirality: null }); i++; continue; }
    if (c === "(") { toks.push({ text: c, start: i, end: i + 1, cls: "branch_open" }); i++; continue; }
    if (c === ")") { toks.push({ text: c, start: i, end: i + 1, cls: "branch_close" }); i++; continue; }
    if (c === ".") { toks.push({ text: c, start: i, end: i + 1, cls: "dot" }); i++; continue; }
    const bn = BOND_NAME(G, c);
    if (bn) { toks.push({ text: c, start: i, end: i + 1, cls: "bond", sub: bn, dir: c === "/" ? "up" : c === "\\" ? "down" : null }); i++; continue; }
    if (isDigit(c)) { toks.push({ text: c, start: i, end: i + 1, cls: "ring_closure", key: c }); i++; continue; }
    if (c === "%") {
      if (text[i + 1] === "(") {
        const j = text.indexOf(")", i + 2);
        const body = j > 0 ? text.slice(i + 2, j) : "";
        if (j > 0 && /^[0-9]{3}$/.test(body)) { toks.push({ text: text.slice(i, j + 1), start: i, end: j + 1, cls: "ring_closure", key: "%" + body }); i = j + 1; continue; }
      } else if (isDigit(text[i + 1] ?? "") && isDigit(text[i + 2] ?? "")) {
        toks.push({ text: text.slice(i, i + 3), start: i, end: i + 3, cls: "ring_closure", key: "%" + text.slice(i + 1, i + 3) }); i += 3; continue;
      }
      if (i + 1 >= n || (i + 2 >= n && isDigit(text[i + 1] ?? ""))) { toks.push({ text: text.slice(i), start: i, end: n, cls: "incomplete", sub: "percent_open" }); break; }
    }
    toks.push({ text: c, start: i, end: i + 1, cls: "unknown", sub: "char_not_in_grammar", reason: "char_not_in_grammar" });
    i++;
  }
  return { tokens: toks, gap: null };
}

// ───────────────────────────── graph machinery shared by SMILES and InChI ─────────────────────────────
function shortestPath(adj, u, v, nAtoms) {
  // BFS u->v in the graph SO FAR (the new closure edge is not in adj yet). Returns atoms u..v or null.
  if (u === v) return [u];
  const prev = new Int32Array(nAtoms).fill(-2);
  prev[u] = -1;
  const q = [u];
  for (let h = 0; h < q.length; h++) {
    const x = q[h];
    for (const y of adj[x]) {
      if (prev[y] !== -2) continue;
      prev[y] = x;
      if (y === v) { const out = [v]; let z = v; while (prev[z] >= 0) { z = prev[z]; out.push(z); } return out.reverse(); }
      q.push(y);
    }
  }
  return null;
}

function inCycle(adj, u, v, allowed) {
  // is edge u-v on a cycle whose atoms all satisfy allowed()? (reachability from u to v without the edge)
  const seen = new Set([u]);
  const q = [u];
  for (let h = 0; h < q.length; h++) {
    const x = q[h];
    for (const y of adj[x]) {
      if (x === u && y === v) continue;
      if (x === v && y === u) continue;
      if (!allowed(y) || seen.has(y)) continue;
      if (y === v) return true;
      seen.add(y); q.push(y);
    }
  }
  return false;
}

const ORDER = { single: 1, double: 2, triple: 3, quadruple: 4, aromatic: 1.5 };

function implicitH(atom, incident, valences) {
  // incident: [{label, other}] ; returns total H count or null when unknowable
  if (atom.bracket) return atom.h ?? 0;
  const vals = valences[atom.element];
  if (!vals) return null;
  let sigma = incident.length, extra = 0, exoDouble = false;
  for (const b of incident) {
    if (b.label === "double") { extra += 1; if (!b.inRing) exoDouble = true; }
    else if (b.label === "triple") extra += 2;
    else if (b.label === "quadruple") extra += 3;
  }
  let used = sigma + extra;
  if (atom.aromatic) {
    const lonePair = atom.element === "O" || atom.element === "S" || (atom.element === "N" && incident.length >= 3);
    if (!lonePair && !incident.some((b) => b.label === "double" || b.label === "triple")) used += 1;
  }
  for (const v of vals) if (v >= used) return v - used;
  return 0;
}

/** Build beings/relations from SMILES tokens, causally. */
function readSmilesTokens(text, tokens, P, final) {
  const valences = P.grammar.smiles.valences;
  const atoms = [], rels = [], beings = [], gaps = [], rings = [];
  const adj = [];
  const incident = [];
  let prev = -1, pend = null, branchStart = false, dotPending = false;
  const stack = [];
  const open = new Map();
  let comp = null;
  const comps = [];
  const closeComp = () => { if (comp) { comps.push(comp); comp = null; } };
  const addGap = (reason, extra) => gaps.push({ reason, ...extra });

  const addBond = (a, b, label, explicit, via, ti, span, dir) => {
    rels.push({ end1: `a${a}`, label, end2: `a${b}`, via, explicit, at: ti, span, dir: dir ?? null, _a: a, _b: b });
    adj[a].push(b); adj[b].push(a);
    incident[a].push({ label, other: b, rel: rels.length - 1 });
    incident[b].push({ label, other: a, rel: rels.length - 1 });
  };
  const defaultLabel = (a, b) => (atoms[a].aromatic && atoms[b].aromatic ? "aromatic" : "single");

  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti];
    switch (t.cls) {
      case "atom": {
        const id = atoms.length;
        atoms.push({ element: t.element, aromatic: t.aromatic, charge: t.charge, isotope: t.isotope, h: t.h, bracket: t.sub === "bracket", chirality: t.chirality ?? null, wildcard: t.sub === "wildcard" });
        adj.push([]); incident.push([]);
        beings.push({ id: `a${id}`, kind: "atom", span: [t.start, t.end], at: ti, element: t.element, aromatic: t.aromatic, charge: t.charge, isotope: t.isotope, h: t.h, bracket: t.sub === "bracket", chirality: t.chirality ?? null });
        if (!comp) comp = { start: t.start, members: [] };
        comp.members.push(id); comp.end = t.end;
        if (prev >= 0 && !dotPending) {
          const label = pend ? pend.label : defaultLabel(prev, id);
          addBond(prev, id, label, !!pend, branchStart ? "branch" : "chain", ti, [t.start, t.end], pend?.dir);
        } else if (pend) addGap("bond_symbol_without_left_atom", { at: ti });
        prev = id; pend = null; branchStart = false; dotPending = false;
        break;
      }
      case "bond":
        if (pend) addGap("two_bond_symbols_in_a_row", { at: ti });
        pend = { label: t.sub, dir: t.dir, tok: t };
        break;
      case "ring_closure": {
        if (prev < 0) { addGap("ring_closure_without_atom", { at: ti }); break; }
        const o = open.get(t.key);
        if (!o) { open.set(t.key, { atom: prev, pend, start: t.start }); pend = null; break; }
        open.delete(t.key);
        if (o.atom === prev) { addGap("ring_closure_on_same_atom", { at: ti }); pend = null; break; }
        let lab = pend?.label ?? o.pend?.label ?? null;
        if (pend && o.pend && pend.label !== o.pend.label) addGap("ring_closure_bond_symbols_disagree", { at: ti });
        const explicit = lab !== null;
        if (!lab) lab = defaultLabel(o.atom, prev);
        const path_ = shortestPath(adj, o.atom, prev, atoms.length);
        addBond(o.atom, prev, lab, explicit, "ring_closure", ti, [t.start, t.end], pend?.dir ?? o.pend?.dir);
        if (path_) {
          const rid = `r${rings.length}`;
          rings.push({ id: rid, kind: "ring", members: path_.slice().sort((x, y) => x - y), span: [o.start, t.end], at: ti, via: "ring_closure" });
          beings.push(rings[rings.length - 1]);
        } else addGap("ring_closure_across_components", { at: ti });
        pend = null;
        break;
      }
      case "branch_open": stack.push(prev); branchStart = true; break;
      case "branch_close":
        if (!stack.length) { addGap("branch_close_without_open", { at: ti }); break; }
        prev = stack.pop(); branchStart = false; pend = null;
        break;
      case "dot": closeComp(); prev = -1; dotPending = true; pend = null; break;
      case "unknown": addGap(t.reason ?? "unknown_token", { at: ti, text: t.text }); break;
      case "incomplete": addGap("incomplete_token_at_end", { at: ti, text: t.text }); break;
      default: break;
    }
  }
  closeComp();
  if (final) {
    if (open.size) addGap("ring_closure_never_closed", { count: open.size });
    if (stack.length) addGap("branch_never_closed", { count: stack.length });
  }
  comps.forEach((c, k) => beings.push({ id: `c${k}`, kind: "component", members: c.members.slice(), span: [c.start, c.end], open: !final && k === comps.length - 1 }));
  // ── end-of-text decisions (flagged; never used to judge earlier units causally) ──
  if (final) {
    const aromAtom = (x) => atoms[x].aromatic;
    for (const r of rels) {
      if (r.label === "aromatic" && !r.explicit) {
        r.label_resolved = inCycle(adj, r._a, r._b, aromAtom) ? "aromatic" : "single";
      } else r.label_resolved = r.label;
    }
    for (let a = 0; a < atoms.length; a++) {
      const inc = incident[a].map((b) => ({ label: rels[b.rel].label_resolved === "aromatic" ? "aromatic" : rels[b.rel].label, other: b.other, inRing: inCycle(adj, a, b.other, () => true) }));
      atoms[a].h_total = implicitH(atoms[a], inc, valences);
    }
    for (const b of beings) if (b.kind === "atom") b.h_total = atoms[+b.id.slice(1)].h_total;
  }
  const rl = rels.map(({ _a, _b, ...r }) => r);
  return { beings, relations: rl, gaps, graph: { atoms, edges: rels.map((r) => [r._a, r._b]) } };
}

// ───────────────────────────── InChI ─────────────────────────────
const INCHI_HEAD = /^InChI=(1S?)\//;

function splitInchi(text, P) {
  // header, then '/'-separated layers; returns {version, layers:[{prefix, body, start, end}], bodyOnly}
  const m = INCHI_HEAD.exec(text);
  let off = 0, version = null;
  if (m) { version = m[1]; off = m[0].length; }
  const layers = [];
  let i = off;
  while (i <= text.length) {
    let j = text.indexOf("/", i);
    if (j < 0) j = text.length;
    layers.push({ body: text.slice(i, j), start: i, end: j });
    i = j + 1;
    if (j >= text.length) break;
  }
  return { version, header: m ? m[0] : null, layers };
}

function parseFormula(f) {
  // components '.'-separated; each optional multiplier then element counts. Returns [{mult, atoms:[{element,count}], start,end}] or null
  const comps = [];
  let pos = 0;
  for (const part of f.split(".")) {
    const m = /^(\d+)?((?:[A-Z][a-z]?\d*)+)$/.exec(part);
    if (!m) return null;
    const els = [];
    const re = /([A-Z][a-z]?)(\d*)/g;
    let x;
    while ((x = re.exec(m[2]))) els.push({ element: x[1], count: x[2] ? parseInt(x[2], 10) : 1, start: pos + (m[1] ? m[1].length : 0) + x.index, end: pos + (m[1] ? m[1].length : 0) + x.index + x[0].length });
    comps.push({ mult: m[1] ? parseInt(m[1], 10) : 1, atoms: els });
    pos += part.length + 1;
  }
  return comps;
}

function earInchi(text, P) {
  const G = P.grammar, E = elementSet(P);
  if (!G || !E) return { tokens: [], gap: "prior_missing:" + (!G ? "grammar" : "elements") };
  const toks = [];
  const sp = splitInchi(text, P);
  let k = 0;
  if (sp.header) toks.push({ text: sp.header, start: 0, end: sp.header.length, cls: "header", sub: sp.version });
  sp.layers.forEach((L, li) => {
    if (li > 0) toks.push({ text: "/", start: L.start - 1, end: L.start, cls: "layer_sep" });
    const body = L.body;
    if (li === 0) {
      // formula layer
      let pos = L.start;
      for (const part of body.split(".")) {
        const m = /^(\d+)?(.*)$/.exec(part);
        if (m[1]) { toks.push({ text: m[1], start: pos, end: pos + m[1].length, cls: "multiplier" }); }
        const body2 = m[2], base = pos + (m[1] ? m[1].length : 0);
        const re = /([A-Z][a-z]?)(\d*)|(.)/g;
        let x;
        while ((x = re.exec(body2))) {
          if (x[1]) {
            toks.push({ text: x[1], start: base + x.index, end: base + x.index + x[1].length, cls: "element", element: x[1], known: E.has(x[1]) });
            if (x[2]) toks.push({ text: x[2], start: base + x.index + x[1].length, end: base + x.index + x[0].length, cls: "count" });
          } else toks.push({ text: x[3], start: base + x.index, end: base + x.index + 1, cls: "unknown", sub: "formula_char" });
        }
        pos += part.length;
        if (pos < L.end) { toks.push({ text: ".", start: pos, end: pos + 1, cls: "component_sep" }); pos += 1; }
      }
      return;
    }
    const pre = body[0];
    if (!pre || !(pre in G.inchi.layers)) { toks.push({ text: body, start: L.start, end: L.end, cls: "unknown", sub: "layer_prefix" }); return; }
    toks.push({ text: pre, start: L.start, end: L.start + 1, cls: "layer_prefix", sub: G.inchi.layers[pre] });
    const rest = body.slice(1), base = L.start + 1;
    if (pre === "c") {
      const re = /(\d+)(\*)|(\d+)|([-(),;*])/g; // '2*' repeat prefix | atom ref | punctuation
      let x;
      while ((x = re.exec(rest))) {
        const s = base + x.index;
        if (x[2]) { toks.push({ text: x[1], start: s, end: s + x[1].length, cls: "repeat" }); toks.push({ text: "*", start: s + x[1].length, end: s + x[0].length, cls: "repeat_mark" }); }
        else if (x[3]) toks.push({ text: x[3], start: s, end: s + x[3].length, cls: "atom_ref", ref: parseInt(x[3], 10) });
        else { const p = x[4]; toks.push({ text: p, start: s, end: s + 1, cls: p === "-" ? "bond" : p === ";" ? "component_sep" : p === "*" ? "repeat_mark" : p === "(" ? "branch_open" : p === ")" ? "branch_close" : "branch_sep" }); }
      }
    } else {
      toks.push({ text: rest, start: base, end: L.end, cls: "layer_body", sub: G.inchi.layers[pre] });
    }
  });
  return { tokens: toks, gap: null, split: sp };
}

function readInchiText(text, P, final) {
  const G = P.grammar, E = elementSet(P);
  const gaps = [{ reason: "bond_order_not_in_notation", note: "InChI states connectivity, not bond orders" }];
  if (!G || !E) return { beings: [], relations: [], gaps: [{ reason: "prior_missing" }], tokens: [] };
  const ear = earInchi(text, P);
  const sp = ear.split;
  const beings = [], rels = [], rings = [];
  const layerNames = {};
  if (!sp.layers.length) return { beings, relations: rels, gaps, tokens: ear.tokens };
  // formula layer -> atoms (H is never numbered; InChI numbers C first then alphabetical, as the formula is Hill-sorted)
  const f = parseFormula(sp.layers[0].body);
  if (!f) { gaps.push({ reason: "formula_layer_unparsed" }); return { beings, relations: rels, gaps, tokens: ear.tokens }; }
  const atoms = []; // {element, comp}
  const compSizes = [];
  const compRanges = [];
  let compIdx = 0;
  const fl0 = sp.layers[0].start;
  for (const c of f) {
    const sizeOne = c.atoms.filter((a) => a.element !== "H").reduce((s, a) => s + a.count, 0);
    for (let rep = 0; rep < c.mult; rep++) {
      const start = atoms.length;
      for (const a of c.atoms) {
        if (a.element === "H") continue;
        for (let k = 0; k < a.count; k++) atoms.push({ element: a.element, comp: compIdx, span: [fl0 + a.start, fl0 + a.end] });
      }
      compSizes.push(sizeOne);
      compRanges.push([start, atoms.length]);
      compIdx++;
    }
  }
  // all-hydrogen species (H2): numbering would include H; mark as gap
  if (!atoms.length) gaps.push({ reason: "no_numbered_atoms" });
  const unknownEl = atoms.filter((a) => !E.has(a.element));
  if (unknownEl.length) gaps.push({ reason: "formula_element_not_in_table", count: unknownEl.length });
  atoms.forEach((a, i) => beings.push({ id: `a${i}`, kind: "atom", span: a.span, at: 0, element: a.element, declared: "formula_layer" }));
  const adj = atoms.map(() => []);
  const seen = new Set(); // atom refs mentioned so far (for first-mention spans)
  // connection layer
  const cIdx = sp.layers.findIndex((L, li) => li > 0 && L.body[0] === "c");
  if (cIdx > 0) {
    const L = sp.layers[cIdx], body = L.body.slice(1), base = L.start + 1;
    // split into component segments by ';' tracking offsets; each segment may carry 'k*' repeat prefix
    let segStart = 0, comp = 0, ti = 0;
    const segs = [];
    for (let i = 0; i <= body.length; i++) if (i === body.length || body[i] === ";") { segs.push([segStart, i]); segStart = i + 1; }
    let atomOffset = 0, compCursor = 0;
    const edge = (a, b, ofs, s, e, via) => {
      if (a < 0 || b < 0 || a >= atoms.length || b >= atoms.length) { gaps.push({ reason: "atom_ref_out_of_range" }); return; }
      if (a === b) return;
      const pth = adj[a].includes(b) ? null : shortestPath(adj, a, b, atoms.length);
      rels.push({ end1: `a${a}`, label: "bond", end2: `a${b}`, via, explicit: false, at: ofs, span: [s, e] });
      adj[a].push(b); adj[b].push(a);
      return pth;
    };
    for (const [s0, e0] of segs) {
      let seg = body.slice(s0, e0), segBase = base + s0;
      let reps = 1;
      const rm = /^(\d+)\*/.exec(seg);
      if (rm) { reps = parseInt(rm[1], 10); segBase += rm[0].length; seg = seg.slice(rm[0].length); }
      const size = compSizes[compCursor] ?? 0;
      for (let rep = 0; rep < reps; rep++) {
        const off = atomOffset;
        // recursive-descent over the chain grammar with explicit stack (ring closure = mention of an already-seen atom)
        let cur = -1, parents = [], needBond = false, branchOpen = false;
        const re = /(\d+)|([-(),])/g;
        let x;
        const seenHere = new Set();
        while ((x = re.exec(seg))) {
          const s = segBase + x.index, e = s + x[0].length;
          if (x[2]) {
            const p = x[2];
            if (p === "-") needBond = true;
            else if (p === "(") { parents.push(cur); branchOpen = true; }
            else if (p === ",") { cur = parents[parents.length - 1]; branchOpen = true; }
            else if (p === ")") { cur = parents.pop(); needBond = true; }
            ti++;
            continue;
          }
          const ref = parseInt(x[1], 10) - 1 + off;
          if (cur >= 0 && (needBond || branchOpen)) {
            const closing = seenHere.has(ref);
            const pth = edge(cur, ref, ti, s, e, closing ? "ring_closure" : branchOpen ? "branch" : "chain");
            if (closing && pth) { const rid = `r${rings.length}`; const r = { id: rid, kind: "ring", members: pth.slice().sort((p, q) => p - q), span: [s, e], at: ti, via: "ring_closure" }; rings.push(r); beings.push(r); }
          } else if (cur >= 0 && !needBond && !branchOpen) gaps.push({ reason: "atom_ref_without_bond_symbol", at: ti });
          if (!seenHere.has(ref)) { seenHere.add(ref); seen.add(ref); const bi = beings[ref]; if (bi && bi.kind === "atom" && bi.first_mention === undefined) bi.first_mention = [s, e]; }
          cur = ref; needBond = false; branchOpen = false; ti++;
        }
        atomOffset += size;
      }
      compCursor += 1;
      if (reps === 1) { /* atomOffset already advanced by size once */ }
    }
  } else if (atoms.length > 1) gaps.push({ reason: "no_connection_layer", note: "multi-atom structure with no /c layer (single-atom or disconnected species have none)" });
  compRanges.forEach((r, k) => { const mem = []; for (let a = r[0]; a < r[1]; a++) mem.push(a); if (mem.length) beings.push({ id: `c${k}`, kind: "component", members: mem, span: [fl0, fl0 + sp.layers[0].body.length], open: false }); });
  // other layers: recorded as attributes, not beings (typed)
  for (const L of sp.layers.slice(1)) { const p = L.body[0]; if (p && G.inchi.layers[p]) layerNames[p] = G.inchi.layers[p]; }
  const unread = Object.keys(layerNames).filter((k) => !["c", "h"].includes(k));
  if (unread.length) gaps.push({ reason: "layers_recorded_not_resolved", layers: unread.map((k) => layerNames[k]) });
  if (layerNames.r) gaps.push({ reason: "reconnected_layer_not_read", note: "non-standard InChI '/r': the metal-reconnected structure lives in the second /c; only the disconnected main layer is read" });
  return { beings, relations: rels, gaps, tokens: ear.tokens, graph: { atoms: atoms.map((a) => ({ element: a.element })), edges: rels.map((r) => [+r.end1.slice(1), +r.end2.slice(1)]) }, layers: layerNames };
}

// ───────────────────────────── IUPAC names (what a TRAIN-tallied prior can honestly nominate) ─────────────────────────────
function earName(text, P) {
  const toks = [];
  const re = /([A-Za-z]+)|([0-9]+(?:[,'][0-9]+)*)|([()\[\]{}])|([-,;:.\s+])|(.)/gu;
  let x;
  while ((x = re.exec(text))) {
    const s = x.index, e = s + x[0].length;
    if (x[1]) toks.push({ text: x[0], start: s, end: e, cls: "alpha_run" });
    else if (x[2]) toks.push({ text: x[0], start: s, end: e, cls: "locant" });
    else if (x[3]) toks.push({ text: x[0], start: s, end: e, cls: "enclosing" });
    else if (x[4]) toks.push({ text: x[0], start: s, end: e, cls: "separator" });
    else toks.push({ text: x[0], start: s, end: e, cls: "other" });
  }
  return toks;
}

/** Element evidence of a name: every TRAIN-attested n-gram whose element precision cleared the prior's declared floor. */
export function nameElements(text, priors) {
  const P = PR(priors);
  const NP = P.nameparts;
  if (!NP) return { elements: new Set(), hits: [], gap: "prior_missing:nameparts" };
  const low = text.toLowerCase().replace(/[^a-z]+/g, "|");
  const hits = [];
  const els = new Set();
  for (const g of NP.grams) {
    let k = low.indexOf(g.g);
    while (k >= 0) {
      hits.push({ gram: g.g, element: g.e, start: k, end: k + g.g.length });
      els.add(g.e);
      k = low.indexOf(g.g, k + 1);
    }
  }
  return { elements: els, hits, gap: null };
}

function readName(text, P) {
  const tokens = earName(text, P);
  const ev = nameElements(text, P);
  const beings = ev.hits.length ? [] : [];
  const seen = new Set();
  for (const h of ev.hits) {
    const key = h.element + ":" + h.gram;
    if (seen.has(key)) continue;
    seen.add(key);
    beings.push({ id: `g${beings.length}`, kind: "group_evidence", element: h.element, gram: h.gram, span: [h.start, h.end] });
  }
  return {
    beings, relations: [], tokens,
    claims: { elements: [...ev.elements].sort() },
    gaps: [
      { reason: "name_structure_not_parsed", note: "no morpheme grammar: only TRAIN-tallied element evidence is nominated" },
      { reason: "name_relations_not_read" },
    ],
  };
}

// ───────────────────────────── formula, SELFIES (named only) ─────────────────────────────
function formulaOk(text, E) {
  if (!E) return false;
  const body = text.replace(/[+-]\d*$/, "");
  const m = /^(?:\d+)?(\((?:[A-Z][a-z]?\d*)+\)n?|(?:[A-Z][a-z]?\d*)+)(?:\.(?:\d+)?(?:(?:[A-Z][a-z]?\d*)+))*$/.exec(body);
  if (!m) return false;
  const re = /([A-Z][a-z]?)/g;
  let x;
  while ((x = re.exec(body))) if (!E.has(x[1])) return false;
  return true;
}

function selfiesProfile(text, G) {
  const toks = [];
  const re = /\[([^\[\]]*)\]/g;
  let x, covered = 0;
  while ((x = re.exec(text))) { toks.push(x[1]); covered += x[0].length; }
  if (!toks.length) return { all: false, frac: 0, n: 0 };
  const alpha = new Set(G.selfies.alphabet);
  const struct = new RegExp(G.selfies.structural_pattern);
  const inAlpha = toks.filter((t) => alpha.has(t) || struct.test(t)).length;
  return { all: covered === text.length, frac: inAlpha / toks.length, n: toks.length };
}

// ───────────────────────────── R0 features, LM, naive Bayes ─────────────────────────────
function lmLogProb(low, lm) {
  // char-bigram log-prob per char over a lowercase-letter-only string with '^' and '$' boundary symbols
  const A = lm.alphabet, idx = lm.index;
  let s = 0, n = 0, prev = idx["^"];
  for (const ch of low) { const j = idx[ch]; if (j === undefined) continue; s += lm.logp[prev][j]; prev = j; n++; }
  if (n === 0) return 0;
  return s / n;
}
function nameLLR(text, P) {
  const SY = P.system;
  if (!SY?.lm) return null;
  const low = text.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (low.length < 2) return 0;
  return lmLogProb(low, SY.lm.names) - lmLogProb(low, SY.lm.english);
}

const bin = (v, cuts) => { let k = 0; while (k < cuts.length && v >= cuts[k]) k++; return k; };

/** Discrete features of a string. `complete` false = a prefix: closure checks are 'na' (not evidence either way). */
export function featuresOf(text, { priors, complete = true } = {}) {
  const P = PR(priors);
  const G = P.grammar, E = elementSet(P);
  const n = text.length;
  const F = {};
  // InChI
  const head = "InChI=1S/";
  if (text.startsWith("InChI=")) F.inchi_header = "full";
  else if (n > 0 && n < head.length && head.startsWith(text)) F.inchi_header = "partial";
  else F.inchi_header = "none";
  F.inchi_body = /^(?:\d+)?[A-Z][A-Za-z0-9.]*\/[a-z]/.test(text) || (/^[A-Z][A-Za-z0-9.]*\/?$/.test(text) && text.includes("/")) ? "yes" : "no";
  // SMILES
  if (G && E) {
    const { tokens } = earSmiles(text, P);
    let consumed = 0, unknown = 0, atoms = 0;
    for (const t of tokens) { if (t.cls === "unknown") unknown++; else if (t.cls !== "incomplete") consumed += t.end - t.start; if (t.cls === "atom") atoms++; }
    let viol = unknown > 0;
    // structural violations decided on the prefix alone
    let depth = 0; const open = new Set(); let seenAtom = false, prevAtomOrClose = false;
    for (const t of tokens) {
      if (t.cls === "branch_open") depth++;
      else if (t.cls === "branch_close") { depth--; if (depth < 0) viol = true; }
      else if (t.cls === "ring_closure") { if (!seenAtom) viol = true; if (open.has(t.key)) open.delete(t.key); else open.add(t.key); }
      else if (t.cls === "atom") seenAtom = true;
      else if (t.cls === "bond" && !seenAtom) viol = true;
    }
    F.smiles_viol = viol ? "yes" : "no";
    F.smiles_consumed = bin(n ? consumed / n : 0, [0.5, 0.8, 0.95, 1.0]);
    F.smiles_atoms = bin(atoms, [2, 4]);
    F.smiles_closed = complete ? (depth === 0 && open.size === 0 ? "yes" : "no") : "na";
    const sf = selfiesProfile(text, G);
    F.selfies_all = sf.all && sf.n >= 1 ? "yes" : "no";
    F.selfies_frac = bin(sf.frac, [0.5, 0.9, 1.0]);
    F.formula_ok = formulaOk(text, E) ? "yes" : "no";
  }
  // name vs english
  const llr = nameLLR(text, P);
  F.name_llr = llr === null ? "na" : bin(llr, [-0.3, -0.05, 0.05, 0.3]);
  F.has_space = /\s/.test(text) ? "yes" : "no";
  const digits = (text.match(/[0-9]/g) || []).length;
  F.digit_frac = bin(n ? digits / n : 0, [0.02, 0.1, 0.25]);
  const lower = (text.match(/[a-z]/g) || []).length;
  F.lower_frac = bin(n ? lower / n : 0, [0.25, 0.5, 0.75]);
  return F;
}

export const FEATURE_NAMES = ["inchi_header", "inchi_body", "smiles_viol", "smiles_consumed", "smiles_atoms", "smiles_closed", "selfies_all", "selfies_frac", "formula_ok", "name_llr", "has_space", "digit_frac", "lower_frac"];

/**
 * R0: which system is this? Naive Bayes over the discretised features, parameters tallied on TRAIN only (the system prior).
 * Returns the argmax when its posterior clears the prior's declared abstention floor; otherwise {system:null, gap:'ambiguous'}.
 */
export function identify(text, { priors, complete = true } = {}) {
  const P = PR(priors);
  const SY = P.system;
  if (!text || !text.length) return { system: null, gap: "empty", posterior: null, features: {} };
  if (!SY?.nb) return { system: null, gap: "prior_missing:system", posterior: null, features: {} };
  const F = featuresOf(text, { priors: P, complete });
  const logp = {};
  for (const c of SY.classes) {
    let s = Math.log(SY.nb.class_prior[c]);
    for (const f of FEATURE_NAMES) {
      const v = F[f];
      if (v === undefined || v === "na") continue;
      const tab = SY.nb.tables[f]?.[c];
      if (!tab) continue;
      const p = tab[String(v)];
      s += Math.log(p ?? SY.nb.floor);
    }
    logp[c] = s;
  }
  const mx = Math.max(...Object.values(logp));
  let Z = 0;
  const post = {};
  for (const c of SY.classes) { post[c] = Math.exp(logp[c] - mx); Z += post[c]; }
  let best = null, bp = -1;
  for (const c of SY.classes) { post[c] /= Z; if (post[c] > bp) { bp = post[c]; best = c; } }
  if (bp < SY.nb.abstain_below) return { system: null, gap: "ambiguous", nominated: best, posterior: post, features: F };
  return { system: best, gap: null, posterior: post, features: F };
}

// ───────────────────────────── public: ear / read ─────────────────────────────
/** Tokens with class. `system` defaults to what identify() names (null => typed gap, no tokens). */
export function ear(text, { system, priors } = {}) {
  const P = PR(priors);
  let sys = system;
  if (!sys) { const v = identify(text, { priors: P }); sys = v.system; if (!sys) return []; }
  if (sys === "smiles") return earSmiles(text, P).tokens;
  if (sys === "inchi") return earInchi(text, P).tokens;
  if (sys === "iupac_name") return earName(text, P);
  return [];
}

export function read(text, { system, priors, final = true } = {}) {
  const P = PR(priors);
  let sys = system;
  if (!sys) { const v = identify(text, { priors: P }); sys = v.system; if (!sys) return { system: null, tokens: [], beings: [], relations: [], gaps: [{ reason: v.gap ?? "system_unidentified" }] }; }
  if (sys === "smiles") {
    const e = earSmiles(text, P);
    if (e.gap) return { system: sys, tokens: [], beings: [], relations: [], gaps: [{ reason: e.gap }] };
    const r = readSmilesTokens(text, e.tokens, P, final);
    return { system: sys, tokens: e.tokens, beings: r.beings, relations: r.relations, gaps: r.gaps, graph: r.graph };
  }
  if (sys === "inchi") { const r = readInchiText(text, P, final); return { system: sys, ...r }; }
  if (sys === "iupac_name") return { system: sys, ...readName(text, P) };
  if (sys === "wln") return { system: sys, tokens: [], beings: [], relations: [], gaps: [{ reason: UNREAD.wln.gap, missing: UNREAD.wln.missing }] };
  return { system: sys, tokens: [], beings: [], relations: [], gaps: [{ reason: "system_named_not_read", note: `${sys} is identified (R0) but has no being/relation reader` }] };
}

/** The element-labelled heavy-atom graph a read produced (explicit hydrogens dropped): {labels:[el], edges:[[i,j]]}. */
export function graphOf(res) {
  const g = res?.graph;
  if (!g) return null;
  const keep = []; const map = new Map();
  g.atoms.forEach((a, i) => { if (a.element !== "H") { map.set(i, keep.length); keep.push(a.element); } });
  const edges = [];
  for (const [a, b] of g.edges) if (map.has(a) && map.has(b)) edges.push([map.get(a), map.get(b)]);
  return { labels: keep, edges };
}

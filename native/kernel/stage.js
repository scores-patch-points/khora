// stage.js — Stage@1: a reading's atoms as a stage HL can judge, and a claim read against it (SPEC: the reader emits a stage, HL reasons over it).
//
// The slice built here (build order M1 to M3): arrangements from atoms, claim ends BOUND to source anchors before any verdict (INS), two licenses
// with named givers (a figure's measure is functional; a superlative has one holder per kind), and HL's own read() for the verdict. No model, no
// score, no threshold. A missing license degrades to "unbound", never to "bound".
//
//   stageFromAtoms(atoms, { doc }) → Stage@1 { schema, doc, anchors, arrangements, licenses, gaps, hl }
//   judgeClaim(stage, claimAtoms, { licenses }) → { verdict: "E"|"C"|"N", hl, proofs: [{ atom, binds, lic, verdict, cites }], gaps }
//
// "E" here is never produced by this module alone: the atoms arm (atom-support.js) decides supported; this module adds what a license licenses.
import { createStage, addAnchor, addEdge, declareFunctional, read, BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH } from "../interpretation/hl.js";
import { meeters, canonical, argText, low } from "./atom-support.js";

export const STAGE_SCHEMA = "Stage@1";
export const LICENSES = Object.freeze([
  { id: "measure", kind: "functional", on: "has_*", giver: "the figure's measure: one value of a measure per being (time-keyed when the text gives a time)" },
  { id: "holder", kind: "functional", on: "most:*", giver: "the language's Degree feature: a superlative over a kind has one holder" },
]);
const FIG = (a) => (a && typeof a === "object" && a.measure && a.base != null ? a : null);
const isHas = (p) => /^has_/.test(p);
const isMost = (p) => /^most:/.test(p);
const nameOf = (a) => (a.entity != null ? `@${a.entity}` : `#${a.value}`);

// the kind a referent belongs to in this reading: is_a(x, kind)
const kindOf = (atoms, x, M) => atoms.find((k) => k.pred === "is_a" && !k.neg && k.args?.[0] && M.refMeet(k.args[0], x))?.args?.[1] ?? null;

export function stageFromAtoms(atoms, { doc = "doc" } = {}) {
  const C = canonical(atoms), M = meeters(C, C, {});
  const hl = createStage(), anchors = new Map(), arrangements = [], gaps = [];
  const anchor = (a, kind) => { const id = a.entity != null ? `${doc}:${a.entity}` : `${doc}:v:${low(a.value)}`; if (!anchors.has(id)) { anchors.set(id, { id, kind, label: argText(a), figure: FIG(a), arg: a }); addAnchor(hl, id, kind); } return id; };
  for (const [i, a] of C.entries()) {
    const as = a.args ?? [];
    if (as.length === 2 && !isHas(a.pred) && !a.pred.startsWith("most:") && a.pred !== "is_a" && a.pred !== "named") {
      const s = anchor(as[0], "referent"), o = anchor(as[1], as[1].entity != null ? "referent" : "value");
      arrangements.push({ id: `a${i}`, rel: a.pred, s, o, polarity: a.neg ? "-" : "+", layer: a.hedged ? "reported" : "asserted", span: [a.start, a.end] });
    } else if (isHas(a.pred) && as.length === 2 && FIG(as[1])) {
      const s = anchor(as[0], "referent"), o = anchor(as[1], "quantity");
      arrangements.push({ id: `a${i}`, rel: a.pred, s, o, polarity: a.neg ? "-" : "+", layer: a.hedged ? "reported" : "asserted", span: [a.start, a.end], measure: as[1].measure });
    } else if (isMost(a.pred) && as.length === 1) {
      const K = kindOf(C, as[0], M);
      if (!K) { gaps.push({ kind: "no_kind", atom: a.text }); continue; }       // a superlative without its kind cannot be read
      const k = anchor(K, "kind"), h = anchor(as[0], "referent");
      arrangements.push({ id: `a${i}`, rel: a.pred, s: k, o: h, polarity: a.neg ? "-" : "+", layer: a.hedged ? "reported" : "asserted", span: [a.start, a.end] });
    }
  }
  for (const r of arrangements) if (r.layer === "asserted") addEdge(hl, { rel: r.rel, s: r.s, o: r.o, polarity: r.polarity, source: [`${doc}:${r.span[0]}-${r.span[1]}`] });
  const rels = [...new Set(arrangements.map((r) => r.rel))];
  const licenses = [];
  for (const rel of rels) for (const L of LICENSES) if (L.on === "has_*" ? isHas(rel) : isMost(rel)) { declareFunctional(hl, rel, { giver: L.giver }); licenses.push({ id: L.id, rel, giver: L.giver, standing: "given" }); }
  return { schema: STAGE_SCHEMA, doc, anchors: [...anchors.values()], arrangements, licenses, gaps, hl, _anchors: anchors, _M: M, _C: C };
}

// INS: bind one claim end to a source anchor of the stage, or say it binds to nothing
function bindEnd(stage, end, kind) {
  const M = stage._M;
  for (const a of stage._anchors.values()) {
    if (kind === "quantity") { if (a.kind === "quantity" && FIG(end) && a.figure?.measure === end.measure) { const f = M.figMeet(end, a.figure); if (f) return { id: a.id, how: `meets ${a.label} (${end.measure})` }; } continue; }
    if (a.kind !== "referent" && a.kind !== "kind") continue;
    if (M.refMeet(end, a.arg)) return { id: a.id, how: `is ${a.label}` };
  }
  return null;
}

export function judgeClaim(stage, claimAtoms, { licenses = LICENSES.map((l) => l.id) } = {}) {
  const C = canonical(claimAtoms), CM = meeters(C, C, {}), proofs = [], gaps = [];
  const on = new Set(licenses);
  // a stage restricted to the licenses switched on (ablation): declarations are rebuilt, edges are shared
  const hl = createStage(); hl.anchors = new Set(stage.hl.anchors); hl.types = new Map(stage.hl.types); hl.edges = new Map(stage.hl.edges);
  for (const L of stage.licenses) if (on.has(L.id)) declareFunctional(hl, L.rel, { giver: L.giver });
  let verdict = UNBOUND;
  for (const [i, a] of C.entries()) {
    const as = a.args ?? [];
    let rel = a.pred, s, o, binds = [];
    if (isHas(rel) && as.length === 2 && FIG(as[1]) && !a.neg && !a.hedged) {
      const bs = bindEnd(stage, as[0], "referent"); if (!bs) continue;
      binds.push(`${argText(as[0])} ${bs.how}`);
      const bq = bindEnd(stage, as[1], "quantity");
      let qid; if (bq) { qid = bq.id; binds.push(`${argText(as[1])} ${bq.how}`); }
      else { qid = `claim:q:${i}`; addAnchor(hl, qid, "quantity"); binds.push(`${argText(as[1])} meets no source ${as[1].measure}, enters as a fresh value`); }
      s = bs.id; o = qid;
    } else if (isMost(rel) && as.length === 1 && !a.neg && !a.hedged) {
      const K = kindOf(C, as[0], CM); if (!K) continue;
      const bk = bindEnd(stage, K, "kind"); if (!bk) continue;
      binds.push(`kind ${argText(K)} ${bk.how}`);
      const bh = bindEnd(stage, as[0], "referent");
      let hid; if (bh) { hid = bh.id; binds.push(`${argText(as[0])} ${bh.how}`); }
      else { hid = `claim:h:${i}`; addAnchor(hl, hid, "referent"); binds.push(`${argText(as[0])} is not in the source; it enters fresh because the slot it fills (${rel} of ${argText(K)}) is functional`); }
      s = bk.id; o = hid;
    } else continue;
    if (!hl.functional.has(rel)) continue;                                   // no license, nothing to read
    const v = read(hl, ["atom", rel, s, o]);
    const cites = [...hl.edges.values()].filter((e) => e.rel === rel && e.s === s && e.o !== o).map((e) => e.source).flat();
    proofs.push({ atom: a.text, binds, lic: [...hl.functional.entries()].filter(([r]) => r === rel).map(([r, d]) => `functional(${r}) giver "${d.giver}"`), verdict: v, cites });
    if (v === CONTRADICTED) verdict = CONTRADICTED; else if (v === BOUND && verdict !== CONTRADICTED) verdict = BOUND;
  }
  return { verdict: verdict === CONTRADICTED ? "C" : "N", hl: verdict, proofs, gaps };
}

// canonical text of a stage, for the determinism check (same bytes, same stage)
export function stageBytes(stage) { return JSON.stringify({ schema: stage.schema, doc: stage.doc, anchors: stage.anchors.map(({ arg, ...a }) => a), arrangements: stage.arrangements, licenses: stage.licenses, gaps: stage.gaps }); }

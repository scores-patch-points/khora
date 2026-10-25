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
import { dmdWindow } from "./activation.js";
import { createHyperlexicon, giveHyperlexiconAffordance, compositionAffordance, licenseStanding } from "./hyperlexicon.js";
import { meeters, canonical, argText, low } from "./atom-support.js";

export const STAGE_SCHEMA = "Stage@1";
export const LICENSES = Object.freeze([
  { id: "measure", kind: "functional", on: "has_*", giver: "the figure's measure: one value of a measure per being (time-keyed when the text gives a time)" },
  { id: "holder", kind: "functional", on: "most:*", giver: "the language's Degree feature: a superlative over a kind has one holder" },
]);
// The license rows are Hyperlexicon rows (kernel/hyperlexicon.js), not a list this file owns: a row is read by compositionAffordance and admitted
// by licenseStanding. A candidate row nominates and licenses nothing; a given row with no chemistry stamp and no charter binding licenses nothing.
export function defaultHyperlexicon() {
  let hl = createHyperlexicon();
  for (const L of LICENSES) hl = giveHyperlexiconAffordance(hl, { left: "functional", right: L.on, giver: L.giver, meta: { chemistry: true, yields: "exclusion", basis: "a functional relation admits one value per key (hl.js R2)" } });
  return hl;
}
const FIG = (a) => (a && typeof a === "object" && a.measure && a.base != null ? a : null);
const isHas = (p) => /^has_/.test(p);
const isMost = (p) => /^most:/.test(p);
const nameOf = (a) => (a.entity != null ? `@${a.entity}` : `#${a.value}`);

// the kind a referent belongs to in this reading: is_a(x, kind)
const kindOf = (atoms, x, M) => atoms.find((k) => k.pred === "is_a" && !k.neg && k.args?.[0] && M.refMeet(k.args[0], x))?.args?.[1] ?? null;

export function stageFromAtoms(atoms, { doc = "doc", hyperlexicon = defaultHyperlexicon() } = {}) {
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
  // READINGS: a functional arrangement (a measure, a superlative) has one reading, its ends are fixed by what they are. A binary relation
  // between two referents carries no voice in the atoms, so its end order is a candidate, not a fact: decided only when the language's own
  // marking decides it, which this slice cannot see. A verdict that rests on an undecided reading is never committed (law: undecided degrades
  // to unbound).
  for (const r of arrangements) r.reading = (isHas(r.rel) || isMost(r.rel)) ? { decided: true, by: "functional ends are typed" } : { decided: false, candidates: [[r.s, r.o], [r.o, r.s]], by: null };
  for (const r of arrangements) if (r.layer === "asserted") addEdge(hl, { rel: r.rel, s: r.s, o: r.o, polarity: r.polarity, source: [`${doc}:${r.span[0]}-${r.span[1]}`] });
  const rels = [...new Set(arrangements.map((r) => r.rel))];
  const licenses = [];
  for (const rel of rels) for (const L of LICENSES) if (L.on === "has_*" ? isHas(rel) : isMost(rel)) {
    const aff = compositionAffordance(hyperlexicon, "functional", L.on), ls = licenseStanding(aff);
    if (!ls.licensed) { licenses.push({ id: L.id, rel, giver: aff.giver ?? null, standing: aff.standing === "given" ? "ungrounded" : aff.standing, why: ls.why }); gaps.push({ kind: "license_not_given", license: L.id, rel, standing: aff.standing }); continue; }
    // REFUTATION PATH: a license is a claim about the world and the source can refute it. If the source itself holds two different values for one
    // key (one subject, one relation, asserted positively), the license is refuted for this reading and nothing is judged under it.
    // the key of a measure license is (being, what is measured): a figure whose attribute the reading did not name ("has_count", "has_value") has
    // no key, so the license does not apply to it (a "$50 million milestone" is not the "total of $216 million")
    if (L.id === "measure" && /^has_(count|value)$/.test(rel)) { licenses.push({ id: L.id, rel, giver: L.giver, standing: "unkeyed" }); gaps.push({ kind: "unkeyed_measure", rel }); continue; }
    const held = arrangements.filter((r) => r.rel === rel && r.layer === "asserted" && r.polarity === "+"), bySubj = new Map();
    for (const r of held) { const k = r.s; (bySubj.get(k) ?? bySubj.set(k, []).get(k)).push(r); }
    const broken = [...bySubj.entries()].filter(([, rs]) => new Set(rs.map((r) => r.o)).size > 1);
    if (broken.length) { licenses.push({ id: L.id, rel, giver: L.giver, standing: "refuted", by: broken.map(([k, rs]) => ({ subject: k, values: rs.map((r) => ({ o: r.o, span: r.span })) })) }); gaps.push({ kind: "license_refuted", license: L.id, rel }); continue; }
    declareFunctional(hl, rel, { giver: aff.giver }); licenses.push({ id: L.id, rel, giver: aff.giver, standing: "given", tier: ls.tier });
  }
  return { schema: STAGE_SCHEMA, doc, anchors: [...anchors.values()], arrangements, licenses, gaps, hl, _anchors: anchors, _M: M, _C: C };
}

// INS: bind one claim end to a source anchor of the stage, or say it binds to nothing. Identity is BOUNDED by DMD (activation.js dmdWindow): the
// anchors the end meets are derived from the first `depth` source anchors, and the binding is trusted at the shallowest depth whose conclusion equals
// the whole's. No candidate depth agreeing is a typed gap (reach_exceeds_candidates) and the end stays unbound. An end that meets two different
// anchors is ambiguous, never "the first one": it stays unbound too.
function bindEnd(stage, end, kind) {
  const M = stage._M, all = [...stage._anchors.values()];
  const meets = (a) => kind === "quantity"
    ? (a.kind === "quantity" && FIG(end) && a.figure?.measure === end.measure && M.figMeet(end, a.figure) ? `meets ${a.label} (${end.measure})` : null)
    : ((a.kind === "referent" || a.kind === "kind") && M.refMeet(end, a.arg) ? `is ${a.label}` : null);
  const derive = (obs) => obs.map((a) => ({ id: a.id, how: meets(a) })).filter((x) => x.how);
  const candidates = []; for (let d = 1; d < all.length; d *= 2) candidates.push(d);
  const whole = derive(all);
  if (!whole.length) return null;
  const w = candidates.length ? dmdWindow(all, derive, { candidates, restrict: (o, d) => o.slice(0, d) }) : { window: all.length, gap: null };
  if (w.gap) return { gap: w.gap };
  if (whole.length > 1) return { gap: "ambiguous_binding", among: whole.map((x) => x.id) };
  return { id: whole[0].id, how: `${whole[0].how} [identity settled by depth ${w.window ?? all.length} of ${all.length}]` };
}

export function judgeClaim(stage, claimAtoms, { licenses = LICENSES.map((l) => l.id) } = {}) {
  const C = canonical(claimAtoms), CM = meeters(C, C, {}), proofs = [], gaps = [];
  const on = new Set(licenses);
  // a stage restricted to the licenses switched on (ablation): declarations are rebuilt, edges are shared
  const hl = createStage(); hl.anchors = new Set(stage.hl.anchors); hl.types = new Map(stage.hl.types); hl.edges = new Map(stage.hl.edges);
  for (const L of stage.licenses) if (on.has(L.id) && L.standing === "given") declareFunctional(hl, L.rel, { giver: L.giver });
  let verdict = UNBOUND;
  for (const [i, a] of C.entries()) {
    const as = a.args ?? [];
    let rel = a.pred, s, o, binds = [], bs = null, bk = null;
    if (isHas(rel) && as.length === 2 && FIG(as[1]) && !a.neg && !a.hedged) {
      bs = bindEnd(stage, as[0], "referent"); if (!bs) continue; if (bs.gap) { gaps.push({ kind: bs.gap, atom: a.text }); continue; }
      binds.push(`${argText(as[0])} ${bs.how}`);
      const bq = bindEnd(stage, as[1], "quantity");
      let qid; if (bq?.gap) { gaps.push({ kind: bq.gap, atom: a.text }); continue; } if (bq) { qid = bq.id; binds.push(`${argText(as[1])} ${bq.how}`); }
      else { qid = `claim:q:${i}`; addAnchor(hl, qid, "quantity"); binds.push(`${argText(as[1])} meets no source ${as[1].measure}, enters as a fresh value`); }
      s = bs.id; o = qid;
    } else if (isMost(rel) && as.length === 1 && !a.neg && !a.hedged) {
      const K = kindOf(C, as[0], CM); if (!K) continue;
      bk = bindEnd(stage, K, "kind"); if (!bk) continue; if (bk.gap) { gaps.push({ kind: bk.gap, atom: a.text }); continue; }
      binds.push(`kind ${argText(K)} ${bk.how}`);
      const bh = bindEnd(stage, as[0], "referent");
      if (bh?.gap) { gaps.push({ kind: bh.gap, atom: a.text }); continue; }
      let hid; if (bh) { hid = bh.id; binds.push(`${argText(as[0])} ${bh.how}`); }
      else { hid = `claim:h:${i}`; addAnchor(hl, hid, "referent"); binds.push(`${argText(as[0])} is not in the source; it enters fresh because the slot it fills (${rel} of ${argText(K)}) is functional`); }
      s = bk.id; o = hid;
    } else continue;
    if (!hl.functional.has(rel)) continue;                                   // no license, nothing to read
    const v = read(hl, ["atom", rel, s, o]);
    const heldE = [...hl.edges.values()].filter((e) => e.rel === rel && e.s === s && e.o !== o);
    const cites = heldE.map((e) => e.source).flat();
    const lab = (id) => stage._anchors.get(id)?.label ?? null, fg = (id) => stage._anchors.get(id)?.figure ?? null;
    const claimEnd = isHas(rel) ? { label: argText(as[1]), measure: as[1].measure, base: as[1].base } : { label: argText(as[0]) };
    proofs.push({ atom: a.text, rel, binds, lic: [...hl.functional.entries()].filter(([r]) => r === rel).map(([r, d]) => `functional(${r}) giver "${d.giver}"`), verdict: v, cites,
      record: { rel, subject: lab(s) ?? lab(bs?.id ?? bk?.id), giver: hl.functional.get(rel)?.giver ?? null, claim: claimEnd,
        held: heldE.map((e) => ({ span: String(e.source[0]).replace(/^[^:]*:/, "").split("-").map(Number), label: lab(e.o), measure: fg(e.o)?.measure ?? null, base: fg(e.o)?.base ?? null })) } });
    if (v === CONTRADICTED) verdict = CONTRADICTED; else if (v === BOUND && verdict !== CONTRADICTED) verdict = BOUND;
  }
  // a contradiction is committed only if every source arrangement it cites has a decided reading
  if (verdict === CONTRADICTED) {
    const spans = new Set(proofs.flatMap((p) => p.cites));
    const undecided = stage.arrangements.filter((r) => spans.has(`${stage.doc}:${r.span[0]}-${r.span[1]}`) && !r.reading?.decided);
    if (undecided.length) { gaps.push({ kind: "undecided_reading", arrangements: undecided.map((r) => r.id) }); return { verdict: "N", hl: UNBOUND, proofs, gaps }; }
  }
  return { verdict: verdict === CONTRADICTED ? "C" : "N", hl: verdict, proofs, gaps };
}

// canonical text of a stage, for the determinism check (same bytes, same stage)
export function stageBytes(stage) { return JSON.stringify({ schema: stage.schema, doc: stage.doc, anchors: stage.anchors.map(({ arg, ...a }) => a), arrangements: stage.arrangements, licenses: stage.licenses, gaps: stage.gaps }); }

// stage-arm-verdict.js — a claim read against its source's stage by HL, in the cube's dependency order (the stage spec, §6–7).
//
// The claim goes through the same reader as its source and becomes a formula: the conjunction of its load-bearing arrangements over the
// source anchors their ends were bound to, negation as polarity. The verdict is HL's read(stage, formula) and nothing else: no matcher, no
// score, no threshold. What each verdict means for the meaning check:
//   bound → E (supported) · contradicted → C · unbound, beyond-reach → N (unknown) · contested → N, recorded as "the source disagrees with itself"
// The cells, ordered by plan() (the-fold/turn-order.js), which refuses at construction any cell that needs a later cell's product:
//   NUL  the claim opens what would have to be true      SIG  the claim's and the source's stages (read before this call)
//   INS  binding (stage-arm-bind.js): an unbound end ends its atom's chain at beyond-reach, and no later cell can bind it
//   SEG  the formula: roles and direction from the ordered ends      CON  the licenses declared on the source's HL stage
//   EVA  read(stage, formula)                           REC  the verdict, its path, its licenses and gaps, as one record
// M4 (both off by default, so the earlier modes read as they were recorded):
//   layered  RC5: hedged text is the reported layer. An asserted conjunct reads the asserted view of the source's HL stage (a reported edge
//            neither binds nor contradicts it); a hedged conjunct reads the union view (an asserted or a reported edge supports it).
//   gapRule  RC7: a claim arrangement whose byte span overlaps one of the claim's unread_word gaps is beyond-reach, not unbound, and a gap
//            outside every arrangement makes the formula beyond-reach: what was not read cannot be checked. The gaps are classed against the
//            source sentence (sourceText): a reading failure when the source states the word, else a real unknown. The class is reported;
//            it decides nothing.
//   stageVerdict({ claim, source, bind, licenses, layers, layered, gapRule, sourceText }) → { verdict, label, contested, binding, path, licenses, gaps, conjuncts, claimGaps }
import { plan } from "../the-fold/turn-order.js";
import { read, BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH } from "../interpretation/hl.js";
import { hlStageOf, classOf, HOLDS } from "./stage-arm.js";

export const LABEL_OF = Object.freeze({ [BOUND]: "E", [CONTRADICTED]: "C", [CONTESTED]: "N", [UNBOUND]: "N", [BEYOND_REACH]: "N" });

/** the claim's load-bearing arrangements as HL atoms over the bound source anchors; an unbound end stays the claim's own anchor id, which is on
 *  no source stage, so HL reads that atom beyond-reach (a key that did not bind takes the subject's place for the same reason) */
const overlaps = (a, b) => !!a && !!b && a[0] < b[1] && b[0] < a[1];
export const unreadGaps = (stage) => (stage.gaps ?? []).filter((g) => g.kind === "unread_word" && g.why === "unread");
export function conjunctsOf(claim, map, { layered = false, gapRule = false } = {}) {
  const B = (x) => (x == null ? null : map.get(x) ?? x);
  const out = [], gaps = gapRule ? unreadGaps(claim) : [], covered = new Set();
  for (const r of claim.arrangements) {
    if (r.identifying || r.superseded) continue; // a fact naming its referent, or an atom the reader's canonical form replaced
    const unbound = [r.s, r.o, r.key].filter((x) => x != null && !map.has(x));
    const hit = gaps.filter((g) => overlaps(g.span, r.span)); for (const g of hit) covered.add(g);
    const rel = layered ? `${r.layer === "reported" ? "U" : "A"}:${r.rel.lemma}` : r.rel.lemma;
    const s = hit.length ? `gap:${hit[0].text}` : r.key != null && !map.has(r.key) ? r.key : B(r.s);
    const atom = ["atom", rel, s, B(r.o), r.key != null ? B(r.key) : null];
    out.push({ arrangement: r.id, rel: r.rel.lemma, layer: r.layer, polarity: r.polarity, bound: !unbound.length && !hit.length, unbound, gapped: hit.map((g) => g.text), phi: r.polarity === "-" ? ["not", atom] : atom });
  }
  // a gap that overlaps no arrangement: the claim says something the reader did not read, so the whole is beyond reach
  for (const g of gaps) if (!covered.has(g)) out.push({ arrangement: null, rel: "unread", layer: "asserted", polarity: "+", bound: false, unbound: [], gapped: [g.text], phi: ["atom", "unread", `gap:${g.text}`, `gap:${g.text}`, null] });
  return out;
}
const foldWord = (w) => String(w ?? "").normalize("NFKC").toLowerCase().normalize("NFD").replace(/\p{M}+/gu, "");
/** the claim's unread words against the source sentence: a reading failure when the source states the word, otherwise a real unknown */
export function classGaps(claim, sourceText) {
  const src = foldWord(sourceText ?? "");
  return unreadGaps(claim).map((g) => ({ text: g.text, span: g.span, class: sourceText != null && src.includes(foldWord(g.text)) ? "reading_failure" : "unknown" }));
}
/** R7 at read time: a formula's atom over r is the disjunction of its atom over each relation of r's class (layer prefix kept); the stage is
 *  untouched. A license set with no equivalence expands nothing. */
export function expandEquivalents(phi, licenses) {
  if (!(licenses ?? []).some((l) => l.kind === "equivalent")) return phi;
  const one = (a) => {
    const m = /^([AU]:)?(.*)$/s.exec(a[1]), cls = classOf(licenses, m[2]);
    if (cls.length === 1) return a;
    return cls.map((r) => ["atom", `${m[1] ?? ""}${r}`, a[2], a[3], a[4]]).reduceRight((acc, p) => (acc ? ["or", p, acc] : p), null);
  };
  return phi[0] === "not" ? ["not", one(phi[1])] : one(phi);
}
export const conjoin = (phis) => (phis.length ? phis.slice(0, -1).reduceRight((acc, p) => ["and", p, acc], phis.at(-1)) : null);

export function stageVerdict({ claim, source, bind, licenses = [], layers = ["asserted", "reported"], layered = false, gapRule = false, sourceText = null } = {}) {
  const steps = [
    { name: "claim opens", cell: "NUL", gives: ["opening"], run: () => ({ opening: { doc: claim.doc.id, arrangements: claim.arrangements.length } }) },
    { name: "stages", cell: "SIG", needs: ["opening"], gives: ["claim-stage", "source-stage"], run: () => ({ "claim-stage": claim, "source-stage": source }) },
    { name: "bind", cell: "INS", needs: ["claim-stage", "source-stage"], gives: ["binding"], run: (c) => ({ binding: bind(c["claim-stage"], c["source-stage"]) }) },
    { name: "formula", cell: "SEG", needs: ["binding", "claim-stage"], gives: ["conjuncts"], run: (c) => ({ conjuncts: conjunctsOf(c["claim-stage"], c.binding.map, { layered, gapRule }) }) },
    // the binding cell may enter a claim value the source does not hold (a quantity that meets none of the source's) as an anchor of its own
    { name: "licenses", cell: "CON", needs: ["source-stage", "binding"], gives: ["licensed"], run: (c) => ({ licensed: { licenses, stage: (layers) => hlStageOf(c["source-stage"], { layers, licenses, layered, extraAnchors: [{ id: HOLDS, kind: "holds" }, ...(c.binding.extra ?? [])] }) } }) },
    { name: "read", cell: "EVA", needs: ["conjuncts", "licensed"], gives: ["verdict"], run: (c) => {
      const cs = c.conjuncts;
      if (!cs.length) return { verdict: { hl: BEYOND_REACH, per: [], why: "the claim opens nothing the reader read" } };
      const H = c.licensed.stage(layers), E = (k) => expandEquivalents(k.phi, licenses);
      return { verdict: { hl: read(H, conjoin(cs.map(E))), per: cs.map((k) => ({ arrangement: k.arrangement, rel: k.rel, hl: read(H, E(k)) })) } };
    } },
    { name: "record", cell: "REC", needs: ["verdict", "binding", "licensed"], gives: ["record"], run: (c) => ({ record: {
      verdict: c.verdict.hl, label: LABEL_OF[c.verdict.hl], contested: c.verdict.hl === CONTESTED ? "the source disagrees with itself" : null,
      binding: c.binding.how, licenses: c.licensed.licenses.map((l) => ({ kind: l.kind, rels: l.rels, giver: l.giver })), gaps: c.binding.gaps,
      conjuncts: c.conjuncts.map((k) => ({ arrangement: k.arrangement, rel: k.rel, layer: k.layer, bound: k.bound, ...(k.gapped?.length ? { gapped: k.gapped } : {}), hl: c.verdict.per.find((p) => p.arrangement === k.arrangement && p.rel === k.rel)?.hl ?? null })),
      claimGaps: gapRule ? classGaps(c["claim-stage"], sourceText) : null,
    } }) },
  ];
  const { order } = plan(steps);
  const ctx = {}, path = [];
  for (const s of order) { const out = s.run(ctx); for (const g of s.gives) ctx[g] = Object.freeze(out[g]); path.push({ cell: s.cell, name: s.name }); }
  return { ...ctx.record, path, trace: { conjuncts: ctx.conjuncts, binding: ctx.binding, stage: ctx.licensed.stage, licenses } };
}

/** V5 (PREREG run 23): constructed role and direction swaps of a verdict's bound two-place arrangements, read on the same stage. For each such
 *  conjunct: its ends reversed (direction), and each referent end replaced in turn by each other referent of the source (role: the sibling is
 *  drawn from the source's own universe, as testimony's null does, with no model). A swap is kept only when the source holds no edge, under any
 *  relation or polarity, from the swapped first end to the swapped second, so the swapped claim is one the source does not state. The swapped
 *  conjunct replaces the original in the claim's conjunction and HL reads it: bound is a false accept.
 *  swapReads(record, claim, source) → [{ kind: "direction" | "role-s" | "role-o", rel, hl }] */
export function swapReads(rec, claim, source) {
  const { conjuncts, binding, stage } = rec.trace, H = stage(["asserted", "reported"]);
  const A = new Map(source.anchors.map((a) => [a.id, a])), stated = new Set(source.arrangements.map((r) => `${r.s}\u0000${r.o}`));
  const refs = source.anchors.filter((a) => a.kind === "referent").map((a) => a.id).sort(), arr = new Map(claim.arrangements.map((r) => [r.id, r])), out = [];
  conjuncts.forEach((k, i) => {
    const r = k.arrangement && k.bound ? arr.get(k.arrangement) : null;
    if (!r || r.o === HOLDS || r.key != null) return;
    const s0 = binding.map.get(r.s), o0 = binding.map.get(r.o); if (s0 == null || o0 == null) return;
    const atom = k.phi[0] === "not" ? k.phi[1] : k.phi, neg = k.phi[0] === "not";
    const cands = [["direction", o0, s0]];
    if (A.get(s0)?.kind === "referent") for (const x of refs) if (x !== s0 && x !== o0) cands.push(["role-s", x, o0]);
    if (A.get(o0)?.kind === "referent") for (const x of refs) if (x !== s0 && x !== o0) cands.push(["role-o", s0, x]);
    for (const [kind, s2, o2] of cands) {
      if (stated.has(`${s2}\u0000${o2}`)) continue;
      const sw = ["atom", atom[1], s2, o2, null], phis = conjuncts.map((c, j) => expandEquivalents(j === i ? (neg ? ["not", sw] : sw) : c.phi, rec.trace.licenses));
      out.push({ kind, rel: k.rel, hl: read(H, conjoin(phis)) });
    }
  });
  return out;
}

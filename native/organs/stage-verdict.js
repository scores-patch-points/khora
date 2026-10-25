// stage-verdict.js — a claim read against its source's stage by HL, in the cube's dependency order (the stage spec, §6–7).
//
// The claim goes through the same reader as its source and becomes a formula: the conjunction of its load-bearing arrangements over the
// source anchors their ends were bound to, negation as polarity. The verdict is HL's read(stage, formula) and nothing else: no matcher, no
// score, no threshold. What each verdict means for the meaning check:
//   bound → E (supported) · contradicted → C · unbound, beyond-reach → N (unknown) · contested → N, recorded as "the source disagrees with itself"
// The cells, ordered by plan() (the-fold/turn-order.js), which refuses at construction any cell that needs a later cell's product:
//   NUL  the claim opens what would have to be true      SIG  the claim's and the source's stages (read before this call)
//   INS  binding (stage-bind.js): an unbound end ends its atom's chain at beyond-reach, and no later cell can bind it
//   SEG  the formula: roles and direction from the ordered ends      CON  the licenses declared on the source's HL stage
//   EVA  read(stage, formula)                           REC  the verdict, its path, its licenses and gaps, as one record
//   stageVerdict({ claim, source, bind, licenses, layers }) → { verdict, label, contested, binding, path, licenses, gaps, conjuncts }
import { plan } from "../the-fold/turn-order.js";
import { read, BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH } from "../interpretation/hl.js";
import { hlStageOf, HOLDS } from "./stage.js";

export const LABEL_OF = Object.freeze({ [BOUND]: "E", [CONTRADICTED]: "C", [CONTESTED]: "N", [UNBOUND]: "N", [BEYOND_REACH]: "N" });

/** the claim's load-bearing arrangements as HL atoms over the bound source anchors; an unbound end stays the claim's own anchor id, which is on
 *  no source stage, so HL reads that atom beyond-reach (a key that did not bind takes the subject's place for the same reason) */
export function conjunctsOf(claim, map) {
  const B = (x) => (x == null ? null : map.get(x) ?? x);
  const out = [];
  for (const r of claim.arrangements) {
    if (r.identifying) continue;
    const unbound = [r.s, r.o, r.key].filter((x) => x != null && !map.has(x));
    const s = r.key != null && !map.has(r.key) ? r.key : B(r.s);
    const atom = ["atom", r.rel.lemma, s, B(r.o), r.key != null ? B(r.key) : null];
    out.push({ arrangement: r.id, rel: r.rel.lemma, layer: r.layer, polarity: r.polarity, bound: !unbound.length, unbound, phi: r.polarity === "-" ? ["not", atom] : atom });
  }
  return out;
}
export const conjoin = (phis) => (phis.length ? phis.slice(0, -1).reduceRight((acc, p) => ["and", p, acc], phis.at(-1)) : null);

export function stageVerdict({ claim, source, bind, licenses = [], layers = ["asserted", "reported"] } = {}) {
  const steps = [
    { name: "claim opens", cell: "NUL", gives: ["opening"], run: () => ({ opening: { doc: claim.doc.id, arrangements: claim.arrangements.length } }) },
    { name: "stages", cell: "SIG", needs: ["opening"], gives: ["claim-stage", "source-stage"], run: () => ({ "claim-stage": claim, "source-stage": source }) },
    { name: "bind", cell: "INS", needs: ["claim-stage", "source-stage"], gives: ["binding"], run: (c) => ({ binding: bind(c["claim-stage"], c["source-stage"]) }) },
    { name: "formula", cell: "SEG", needs: ["binding", "claim-stage"], gives: ["conjuncts"], run: (c) => ({ conjuncts: conjunctsOf(c["claim-stage"], c.binding.map) }) },
    { name: "licenses", cell: "CON", needs: ["source-stage"], gives: ["licensed"], run: (c) => ({ licensed: { licenses, stage: (layers) => hlStageOf(c["source-stage"], { layers, licenses, extraAnchors: [{ id: HOLDS, kind: "holds" }] }) } }) },
    { name: "read", cell: "EVA", needs: ["conjuncts", "licensed"], gives: ["verdict"], run: (c) => {
      const cs = c.conjuncts;
      if (!cs.length) return { verdict: { hl: BEYOND_REACH, per: [], why: "the claim opens nothing the reader read" } };
      const H = c.licensed.stage(layers);
      return { verdict: { hl: read(H, conjoin(cs.map((k) => k.phi))), per: cs.map((k) => ({ arrangement: k.arrangement, hl: read(H, k.phi) })) } };
    } },
    { name: "record", cell: "REC", needs: ["verdict", "binding", "licensed"], gives: ["record"], run: (c) => ({ record: {
      verdict: c.verdict.hl, label: LABEL_OF[c.verdict.hl], contested: c.verdict.hl === CONTESTED ? "the source disagrees with itself" : null,
      binding: c.binding.how, licenses: c.licensed.licenses.map((l) => ({ kind: l.kind, rels: l.rels, giver: l.giver })), gaps: c.binding.gaps,
      conjuncts: c.conjuncts.map((k) => ({ arrangement: k.arrangement, rel: k.rel, bound: k.bound, hl: c.verdict.per.find((p) => p.arrangement === k.arrangement)?.hl ?? null })),
    } }) },
  ];
  const { order } = plan(steps);
  const ctx = {}, path = [];
  for (const s of order) { const out = s.run(ctx); for (const g of s.gives) ctx[g] = Object.freeze(out[g]); path.push({ cell: s.cell, name: s.name }); }
  return { ...ctx.record, path };
}

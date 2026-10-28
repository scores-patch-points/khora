// cancel-identity.js — the stage's `identity` hook, served by cancellation (kernel/identity-cancel.js) over canonical, perspective-typed features (arrangement-features.js).
//
//   makeCancelIdentity({ claimAtoms, sourceAtoms, same, lang }) → { standing(end, anchorArg), choose(end, anchorArgs), read(end) }
//
// The stage binder (kernel/stage.js bindEnd) nominates source anchors for a claim end by NAME, then asks the injected identity for a standing on each; and where several anchors are
// nominated it asks `choose` which one the end cancels with. Candidates for a claim end are every referent of the source; the mention is the end's own features in the claim.
//   same                  cancellation named this anchor alone (a margin exists between its residual and the next)
//   against               the anchor holds another value of a one-valued dimension the claim end states (excluded)
//   needs_deeper_reading  the anchor ties with others, or nothing cancels: `have` is [the mention's features, the anchor's], `need` the next residual level
// Pure given its inputs; the synonymy judge is injected (no giver, each word its own class).
import { cancelIdentity } from "../kernel/identity-cancel.js";
import { makeCanon, featuresOf, PERSPECTIVE } from "./arrangement-features.js";

export function makeCancelIdentity({ claimAtoms = [], sourceAtoms = [], same = null, lang = "en" } = {}) {
  const canon = makeCanon(same, { lang }).registerAtoms(sourceAtoms).registerAtoms(claimAtoms);
  const ids = new Set(); for (const a of sourceAtoms) for (const x of a.args ?? []) if (x.entity != null) ids.add(x.entity);
  const candidates = [...ids].map((id) => ({ id, feats: featuresOf(sourceAtoms, id, { canon, lang }) })).filter((c) => c.feats.length);
  const memo = new Map();
  const read = (end) => {
    if (end?.entity == null) return null;
    if (!memo.has(end.entity)) memo.set(end.entity, cancelIdentity({ mention: featuresOf(claimAtoms, end.entity, { canon, lang }), candidates, perspective: PERSPECTIVE, dropUniversal: true }));
    return memo.get(end.entity);
  };
  const standing = (end, anchorArg) => {
    const r = read(end); if (!r || anchorArg?.entity == null) return null;
    const id = anchorArg.entity, row = (r.residuals ?? []).find((x) => x.id === id), have = [r.size ?? 0, row?.carried ?? 0];
    if ((r.excluded ?? []).some((x) => x.id === id)) return { kind: "against", same: false, against: true, reason: `another value of ${r.excluded.find((x) => x.id === id).dimension}`, have, need: 0 };
    if (r.verdict === "same" && r.id === id) return { kind: "same", same: true, against: false, reason: `cancels alone; margin [${r.noise}, ${r.dmd ?? "∞"})`, have, need: r.dmd ?? 0 };
    if (r.verdict === "undecided" && r.tied.includes(id)) return { kind: "needs_deeper_reading", same: false, against: false, reason: `tied with ${r.tied.length - 1} other${r.tied.length > 2 ? "s" : ""} at residual ${r.noise}`, have, need: r.dmd ?? 0 };
    return { kind: "needs_deeper_reading", same: false, against: false, reason: r.verdict === "refused" ? r.why : "not the candidate that cancels", have, need: r.dmd ?? 0 };
  };
  // ONE-TO-ONE: a source being is the same as at most one claim end (a one-valued relation, the identity work's own rule). Two claim ends that each cancel alone to one anchor
  // CONTEST it: neither is chosen, and the standing says so. Read once over every claim end, so the contest is known before any choice.
  const claimEnds = [...new Set(claimAtoms.flatMap((a) => (a.args ?? []).filter((x) => x.entity != null).map((x) => x.entity)))];
  const wins = new Map(); for (const e of claimEnds) { const r = read({ entity: e }); if (r?.verdict === "same") (wins.get(r.id) ?? wins.set(r.id, []).get(r.id)).push(e); }
  const contested = (anchorId) => (wins.get(anchorId) ?? []).length > 1;
  const choose = (end, anchorArgs) => { const r = read(end); if (!r || r.verdict !== "same" || contested(r.id)) return null; return anchorArgs.find((a) => a?.entity === r.id) ?? null; };
  const standing0 = standing;
  const standingC = (end, anchorArg) => { const st = standing0(end, anchorArg); if (st?.kind === "same" && contested(anchorArg.entity)) return { ...st, kind: "needs_deeper_reading", same: false, reason: `contested: ${wins.get(anchorArg.entity).length} claim ends each cancel to this being; a being is the same as at most one` }; return st; };
  return { standing: standingC, choose, read, contested: (id) => contested(id), by: "cancellation" };
}

// identity-cancel.js — Same(a, b | W) as CANCELLATION, with the margin a plateau between the noise and the DMD.
//
// The definition (the operator, 2026-10-26): two things are equal if the identity on both sides of the equation cancel each other out when viewed from the same perspective, with a
// margin of error smaller than a DMD. Read for identity (HYPERLEXICON-IDENTITY-DEFINITION.md: sameness is by consequence; a difference counts only if it exceeds the ground's own variation).
//
//   cancelIdentity({ mention, candidates, perspective }) → { verdict: "same" | "undecided" | "refused", id?, tied?, excluded, noise, dmd, margin, residuals, why }
//
//   mention     the features of the thing being placed, in ONE vocabulary with the candidates' (W: whoever builds the features states the perspective by what they include: a unit, a
//               direction, an as-of, a kind are features like any other, so two things viewed from different perspectives simply do not cancel)
//   candidates  [{ id, feats }]
//   perspective the dimensions W declares ONE-VALUED, as feature prefixes: ["dir", "unit", "asof"] means a feature "dir=out" states the value of dimension dir. A candidate that holds a DIFFERENT value
//               of a dimension the mention states is EXCLUDED (reported, never a residual): an opposite value is a difference that makes a difference, not noise, exactly as a one-valued relation convicts
//               in the identity work (company-identity.mjs: only a given one-valued relation convicts). A candidate that states no value of the dimension is merely thinner: that is residual (noise).
//
//   RESIDUAL of a candidate = how many of the mention's features the candidate does not carry. What is left when the candidate is taken from the mention: zero is a perfect cancellation.
//   NOISE       the best candidate's residual: what the true thing still fails to carry (a different wording, a thin source). The margin cannot be below it, or the true thing is rejected.
//   DMD         the next distinct residual above the noise: the smallest difference that CHANGES the conclusion (one more tolerated feature admits a second candidate).
//   MARGIN      any value in [noise, dmd): the answer is the same for all of them, so no constant is chosen: the plateau is read off the material. Its width is reported.
//   same        one candidate has the noise residual alone: a margin exists that separates it
//   undecided   two or more candidates share the best residual: no margin separates them; they are INDISTINGUISHABLE under W (named), never broken by order
//   refused     the mention keeps no features, there is no candidate, or the best candidate carries none of them (noise = everything: nothing cancels, so there is nothing to say)
// A residual measured against a candidate that is itself thinner than the mention is the candidate's thinness, not a difference: it is reported (`carried`), never dressed as "different".
// Pure and deterministic. No threshold, no constant, no word list: the only numbers are counts of features.
export const CANCEL_SCHEMA = "IdentityCancel@1";

export function cancelIdentity({ mention = [], candidates = [], perspective = [] } = {}) {
  const M = new Set((mention ?? []).filter((x) => x != null && x !== ""));
  if (!M.size) return { schema: CANCEL_SCHEMA, verdict: "refused", why: "the mention keeps no features: there is nothing to cancel", residuals: [] };
  const cs = (candidates ?? []).filter((c) => c && c.feats && new Set(c.feats).size);
  if (!cs.length) return { schema: CANCEL_SCHEMA, verdict: "refused", why: "no candidate keeps any feature", residuals: [] };
  if (new Set(cs.map((c) => c.id)).size !== cs.length) return { schema: CANCEL_SCHEMA, verdict: "refused", why: "candidate ids must be unique", residuals: [] };
  const dims = new Set(perspective), dimOf = (f) => { const i = String(f).indexOf("="); return i > 0 && dims.has(String(f).slice(0, i)) ? String(f).slice(0, i) : null; };
  const stated = new Map(); for (const f of M) { const d = dimOf(f); if (d) (stated.get(d) ?? stated.set(d, new Set()).get(d)).add(f); }
  const excluded = [], live = [];
  for (const c of cs) {
    const C = new Set(c.feats), clash = [...stated].find(([d, vals]) => [...C].some((f) => dimOf(f) === d && !vals.has(f)));
    if (clash) excluded.push({ id: c.id, dimension: clash[0], holds: [...C].filter((f) => dimOf(f) === clash[0]), mentionStates: [...clash[1]] }); else live.push(c);
  }
  if (!live.length) return { schema: CANCEL_SCHEMA, verdict: "refused", why: "every candidate holds another value of a dimension the perspective declares one-valued: none can be the same from here", excluded, residuals: [] };
  const rows = live.map((c) => { const C = new Set(c.feats); let r = 0; for (const f of M) if (!C.has(f)) r++; return { id: c.id, residual: r, carried: M.size - r, keeps: C.size }; })
    .sort((a, b) => a.residual - b.residual || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const noise = rows[0].residual, dmd = rows.find((x) => x.residual > noise)?.residual ?? null;
  const out = { schema: CANCEL_SCHEMA, excluded, noise, dmd, margin: dmd == null ? { from: noise, to: null, width: null } : { from: noise, to: dmd, width: dmd - noise }, size: M.size, residuals: rows };
  if (noise >= M.size) return { ...out, verdict: "refused", why: "the best candidate carries none of the mention's features: nothing cancels" };
  const tied = rows.filter((x) => x.residual === noise).map((x) => x.id);
  if (tied.length > 1) return { ...out, verdict: "undecided", tied, why: `${tied.length} candidates cancel the mention equally: no margin separates them under this perspective` };
  return { ...out, verdict: "same", id: rows[0].id, why: dmd == null ? "the only candidate that cancels anything; no second level bounds the margin" : `one candidate cancels to ${noise}; the next level is ${dmd}: every margin in [${noise}, ${dmd}) gives this answer` };
}

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
//   dropUniversal a feature every live candidate carries is dropped from the mention before residuals are read (it separates nothing); reported as `universal`
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

export function cancelIdentity({ mention = [], candidates = [], perspective = [], dropUniversal = false } = {}) {
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
  // a feature EVERY live candidate carries separates none of them: it is ground, not figure (dropUniversal), and it is reported so the caller sees what was ground here
  let universal = [];
  if (dropUniversal && live.length > 1) { const n = live.length, count = new Map(); for (const c of live) for (const f of new Set(c.feats)) count.set(f, (count.get(f) ?? 0) + 1); universal = [...M].filter((f) => count.get(f) === n); for (const f of universal) M.delete(f); }
  if (!M.size) return { schema: CANCEL_SCHEMA, verdict: "refused", why: "every feature of the mention is carried by every candidate: all ground, no figure", excluded, universal, residuals: [] };
  const rows = live.map((c) => { const C = new Set(c.feats); let r = 0; for (const f of M) if (!C.has(f)) r++; return { id: c.id, residual: r, carried: M.size - r, keeps: C.size }; })
    .sort((a, b) => a.residual - b.residual || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const noise = rows[0].residual, dmd = rows.find((x) => x.residual > noise)?.residual ?? null;
  const out = { schema: CANCEL_SCHEMA, excluded, universal, noise, dmd, margin: dmd == null ? { from: noise, to: null, width: null } : { from: noise, to: dmd, width: dmd - noise }, size: M.size, residuals: rows };
  if (noise >= M.size) return { ...out, verdict: "refused", why: "the best candidate carries none of the mention's features: nothing cancels" };
  const tied = rows.filter((x) => x.residual === noise).map((x) => x.id);
  if (tied.length > 1) return { ...out, verdict: "undecided", tied, why: `${tied.length} candidates cancel the mention equally: no margin separates them under this perspective` };
  return { ...out, verdict: "same", id: rows[0].id, why: dmd == null ? "the only candidate that cancels anything; no second level bounds the margin" : `one candidate cancels to ${noise}; the next level is ${dmd}: every margin in [${noise}, ${dmd}) gives this answer` };
}

// ── STANDING: the verdict against a world with the relations destroyed ──────────────────────────────────────────────────────────────────────────────────────────
// A general finder is also a general finder of coincidences (THE-CORE-MECHANISM), so a "same" is a FINDING only if it cannot survive the deletion of the relation. The null here
// is janus correspond.mjs's: per feature KIND (the part before the first ":"), the values are shuffled among every candidate's features of that kind, so each candidate keeps how
// many features of each kind it has and loses WHO they point at (rewired, not relabelled: relabelling keeps every true set in the pool under a wrong name and the null cannot
// bind, measured on code, eval/meaning/identity-cancel-code.mjs). The mention's ceiling is the (1 - 1/n) quantile, over R rewired worlds, of the most of its features any
// candidate carried (the pool's own chance floor, as resolve.mjs reads it). A "same" that carries no more than its ceiling is `same_below_null`: reported, never promoted.
//   standingOf({ mention, candidates, perspective, dropUniversal, rewirings = 20, seed = 7 }) → { ...cancelIdentity(...), standing, carried, ceiling, worlds }
// Measured on code (8 files, two versions each, 165 "same" calls): 132 above the null, 132 right; the 2 wrong calls were both below it. Deterministic (seeded).
export function standingOf({ mention = [], candidates = [], perspective = [], dropUniversal = false, rewirings = 20, seed = 7 } = {}) {
  const r = cancelIdentity({ mention, candidates, perspective, dropUniversal });
  if (r.verdict !== "same") return { ...r, standing: r.verdict, carried: r.size != null ? r.size - r.noise : null, ceiling: null, worlds: 0 };
  const base = candidates.filter((c) => c && c.feats && c.feats.length), n = Math.max(2, base.length);
  const rewire = (k) => { let s = (seed + k) >>> 0; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    const edges = base.flatMap((c) => [...new Set(c.feats)].map((f) => { const i = String(f).indexOf(":"); return { id: c.id, kind: i > 0 ? f.slice(0, i) : "", other: i > 0 ? f.slice(i + 1) : String(f) }; }));
    const kinds = [...new Set(edges.map((e) => e.kind))];
    for (const kind of kinds) { const idx = edges.map((e, i) => (e.kind === kind ? i : -1)).filter((i) => i >= 0), others = idx.map((i) => edges[i].other); for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; } idx.forEach((ei, t) => { edges[ei].other = others[t]; }); }
    const by = new Map(base.map((c) => [c.id, new Set()])); for (const e of edges) by.get(e.id).add(e.kind ? `${e.kind}:${e.other}` : e.other); return base.map((c) => ({ id: c.id, feats: [...by.get(c.id)] })); };
  const bests = []; for (let k = 0; k < rewirings; k++) { const w = cancelIdentity({ mention, candidates: rewire(k), perspective, dropUniversal }); bests.push(w.verdict === "refused" ? 0 : (w.size ?? 0) - w.noise); }
  bests.sort((a, b) => a - b); const ceiling = bests[Math.min(rewirings - 1, Math.floor(rewirings * (1 - 1 / n)))], carried = r.size - r.noise;
  return { ...r, standing: carried > ceiling ? "same_above_null" : "same_below_null", carried, ceiling, worlds: rewirings };
}

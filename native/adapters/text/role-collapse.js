// adapters/text/role-collapse.js — A SPAN'S ROLE HELD OPEN UNTIL AN ACT COLLAPSES IT (round 32, 2026-11-28)
// identity/novels/PREREG-ROUND32-SUPERPOSITION.md (stamped before any code or run). Opt-in: read-core.mjs applies it only under
// `readerOptions.roleCollapse: true` (or "features": compute and report, collapse nothing; the builder's mode); off, the read is unchanged.
//
// Every capital-tier being (a cast row) carries a distribution over {name, not-a-name}. Two acts collapse it, in order:
//   BINDING  a row a pronoun binds to is a being (the binding measured it). The pronoun rungs ran on the uncollapsed cast.
//   WRITING  every other row collapses by P(name | support, ground, multi, recur): naive Bayes over the counts in role-collapse-<stem>.json
//            (GUM train, Laplace +1), not-a-name below 0.5 (the minimum-expected-error decision under the model; declared).
// A row that collapses to not-a-name stays in the read as `heard`: demoted, never deleted.

export const FEATURES = Object.freeze(["support", "ground", "multi", "recur"]);

/** The features of one cast row, from the read itself and the priors. */
export function featuresOf(row, { support, groundFired }) {
  const multi = (row.allSurfaces ?? [row.surface]).some((s) => String(s ?? "").trim().split(/\s+/).length >= 2);   // regex-ok: whitespace token count of the reader's own surface
  return { support, ground: groundFired ? "yes" : "no", multi: multi ? "yes" : "no", recur: (row.mentionSpans ?? []).length >= 2 ? "yes" : "no" };
}

/** P(name | features) under the model's counts, Laplace +1 per value; null when the model is absent or malformed. */
export function posteriorName(features, model) {
  if (model?.schema !== "RoleCollapse@1") return null;
  const n1 = Number(model.prior?.name), n0 = Number(model.prior?.other);
  if (!(n1 > 0 && n0 > 0)) return null;
  let lo = Math.log(n1) - Math.log(n0);
  for (const f of FEATURES) {
    const table = model.likelihood?.[f]; if (!table) return null;
    const values = Object.keys(table).length || 1;
    const c = table[features[f]] ?? { name: 0, other: 0 };
    lo += Math.log((Number(c.name) + 1) / (n1 + values)) - Math.log((Number(c.other) + 1) / (n0 + values));
  }
  return 1 / (1 + Math.exp(-lo));
}

/** Collapse the cast: { keep, demote, report }. `bound` is the set of refs a pronoun binds to; `mode` "features" collapses nothing. */
export function collapseRoles(cast, { bound, supportOfRow, groundFired, model, mode = "collapse" }) {
  const keep = [], demote = [], report = [];
  for (const row of cast ?? []) {
    const features = featuresOf(row, { support: supportOfRow(row), groundFired });
    if (bound.has(row.ref)) { keep.push(row); report.push({ ref: row.ref, features, p: null, act: "binding", role: "name" }); continue; }
    const p = posteriorName(features, model);
    const role = p === null || p >= 0.5 ? "name" : "not-a-name";
    report.push({ ref: row.ref, features, p, act: p === null ? "no_model" : "writing", role });
    if (mode === "collapse" && role === "not-a-name") demote.push(row); else keep.push(row);
  }
  return { keep, demote, report };
}

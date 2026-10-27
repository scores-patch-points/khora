// eval/meaning/identity-margin-sensitivity.mjs — does the margin that decides an identity verdict come from a DMD, or from a typed-in constant?
// EO-terminal's holographic identity (core/holographic-identity.mjs) declares worldsFloor, nullQuantile, minShare ... by hand. Each is swept across a wide ladder; a constant inside a real
// plateau changes no verdict across a wide range. FICTIONAL planted filers (grounding/identity/holographic-mock.mjs), not real companies.
//   EO_TERMINAL=<path to EO-terminal> node eval/meaning/identity-margin-sensitivity.mjs
const EO = process.env.EO_TERMINAL ?? new URL("../../../EO-terminal", import.meta.url).pathname;
const H = await import(EO + "/core/holographic-identity.mjs");
const { events } = await import(EO + "/grounding/identity/holographic-mock.mjs");
const asOf = events.map((e) => e.at).sort().at(-1), rec = H.buildRecord(events, { asOf }), ids = [...rec.nodes.keys()];
const sig = (o) => {
  const rows = []; for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) for (const l of Object.keys(H.LENSES)) { const r = H.judgePair(rec, ids[a], ids[b], { lens: l, opts: o }); rows.push(`${ids[a]}~${ids[b]}|${l}|${r.verdict}|${r.reason ?? ""}`); }
  const ed = H.successions(rec, { opts: o }).map((e) => `${e.type}:${e.from}>${e.into}`).sort();
  return JSON.stringify({ rows, ed });
};
const base = sig({}); const diff = (o) => { const s = sig(o); if (s === base) return 0; const A = JSON.parse(base), B = JSON.parse(s); return A.rows.filter((r, i) => r !== B.rows[i]).length + (JSON.stringify(A.ed) !== JSON.stringify(B.ed) ? 1000 : 0); };
console.log("declared:", JSON.stringify(H.DECLARED), "| pairs x lenses:", JSON.stringify(JSON.parse(base).rows.length), "| edges:", JSON.parse(base).ed.length);
const ladders = { worldsFloor: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1.0], nullQuantile: [0.5, 0.7, 0.8, 0.9, 0.95, 0.99], minShare: [0.0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.45, 0.5, 0.6, 0.8], minOthers: [0, 1, 2, 3, 5], successorSlackQuarters: [0, 1, 2, 3, 5], seed: [1, 2, 3, 7, 11, 13, 17, 19, 23], nullDraws: [20, 50, 100, 200, 400] };
for (const [k, vals] of Object.entries(ladders)) console.log(k.padEnd(24), vals.map((v) => `${v}:${diff({ [k]: v })}`).join("  "), "  (n = how many verdicts differ from the declared run; 1000+ = the succession edges changed)");

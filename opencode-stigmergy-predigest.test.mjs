// opencode-stigmergy-predigest.test.mjs — HOW MUCH PREDIGESTION IS NEEDED. One scenario, four rungs, measured:
//   L0 raw prose (opencode-surf, the adapter)   L1 beings only (INS)   L2 + relations & negation (CON/EVA)   L3 + code edges (readEdges) & hyperlexicon
// L1/L2 read PROSE-ONLY turns through received priors (opencode-predigest.mjs). Each row is a battery; the byte column is what the rung stores
// (weft-lean packed) against the raw text it stands for. Red = a battery the rung cannot do, printed in the table.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { surf } from "./opencode-surf.mjs";
import { predigest, packedBytes, loadRegister } from "./opencode-predigest.mjs";
import { createSession } from "./opencode-realstack.mjs";
import { createHyperlexicon, admitHyperlexiconCandidates, giveHyperlexiconAffordance, licenseStanding } from "./native/kernel/hyperlexicon.js";

const N = 100, T = ["parser lexer", "deploy staging", "database migration", "css layout"];
const filler = (i) => ({ n: i, ask: `please work on the ${T[i % 4]} item ${i}`, answer: `Done with the ${T[i % 4]} work in file${i}. Tests pass.`, grounds: ["edit"] });
const scenario = (plants = {}) => Array.from({ length: N }, (_, i) => ({ ...filler(i + 1), ...(plants[i + 1] ?? {}) }));
const rows = {}; const put = (row, col, v) => { (rows[row] ??= {})[col] = v; };

// the rung's index: being -> turns (L1); + relations (L2)
function index(turns, level) {
  const beings = new Map(), cons = []; const digests = turns.map((t) => ({ n: t.n, agent: t.agent ?? "A", ...predigest(t.answer, { level }) }));
  for (const d of digests) { for (const [b, at] of d.ins) { if (!beings.has(b)) beings.set(b, []); beings.get(b).push({ n: d.n, at }); } for (const c of d.con) cons.push({ n: d.n, agent: d.agent, e1: c[0], lab: c[1], e2: c[2], at: c[3], neg: c[4] }); }
  return { beings, cons, digests };
}
const askBeings = (idx, ask) => [...new Set((String(ask).toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? []))].filter((w) => idx.beings.has(w));
function find(idx, ask, { hops = 0 } = {}) {
  const hit = new Map(); const add = (n, w) => hit.set(n, (hit.get(n) ?? 0) + w);
  for (const b of askBeings(idx, ask)) for (const r of idx.beings.get(b)) add(r.n, 1 / idx.beings.get(b).length);
  if (hops) for (const b of askBeings(idx, ask)) for (const c of idx.cons.filter((x) => x.e1 === b || x.e2 === b)) { const other = c.e1 === b ? c.e2 : c.e1; for (const r of idx.beings.get(other) ?? []) add(r.n, 0.5 / (idx.beings.get(other).length)); }
  return [...hit].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
}
const adapterFinds = (turns, ask, n, s) => { const note = surf({ ask, turns }).note; return new RegExp(`(?:turns? |,)${n}(?:[,\\s]|$)|turn ${n}:|\\b${n}–|–${n}\\b`).test(note) || note.includes(s); };

test("PD0 the received priors are on disk (a missing prior is a typed gap, not a silent bare reader)", () => assert.equal(loadRegister().gap, null));

test("PD1 needle with a coined name (zorblaxK): 30 cases", () => {
  let a = 0, l1 = 0;
  for (let k = 0; k < 30; k++) {
    const at = 5 + k, w = `zorblax${k}`, s = `The ${w} contract requires idempotent writes.`;
    const turns = scenario({ [at]: { answer: `${s} Tests pass.` } }), ask = `extend the ${w} writes`;
    if (adapterFinds(turns, ask, at, s)) a++; if (find(index(turns, 1), ask).includes(at)) l1++;
  }
  put("needle: coined name (30)", "L0 raw", `${a}/30`); put("needle: coined name (30)", "L1 beings", `${l1}/30`);
  assert.equal(l1, 30);
});

test("PD2 needle with everyday-looking jargon (webhook/backoff/mutex ...): 10 cases", () => {
  const J = ["webhook", "backoff", "mutex", "idempotent", "callback", "queue", "cache", "token", "deploy", "parser"];
  let a = 0, l1 = 0;
  J.forEach((w, k) => {
    const at = 10 + k, s = `Priya decided the ${w} limits stay at five.`;
    const turns = scenario({ [at]: { answer: `${s} Tests pass.` } }), ask = `tune the ${w} limits`;
    if (adapterFinds(turns, ask, at, s)) a++; if (find(index(turns, 1), ask).includes(at)) l1++;
  });
  put("needle: register jargon (10)", "L0 raw", `${a}/10`); put("needle: register jargon (10)", "L1 beings", `${l1}/10`);
  assert.ok(l1 >= 8, `${l1}/10`);
});

test("PD3 unnamed dependency in prose: validateOrder calls normalizeTotals (turn 12), ask names only validateOrder", () => {
  const turns = scenario({ 12: { answer: "normalizeTotals now rounds to cents. Tests pass." }, 40: { answer: "Added validateOrder, which calls normalizeTotals. Tests pass." } });
  const ask = "change validateOrder to reject negative totals";
  const l1 = find(index(turns, 1), ask).includes(12), l2 = find(index(turns, 2), ask, { hops: 1 }).includes(12);
  put("unnamed dependency (hop)", "L0 raw", adapterFinds(turns, ask, 12, "normalizeTotals now rounds") ? "found" : "missed"); put("unnamed dependency (hop)", "L1 beings", l1 ? "found" : "missed"); put("unnamed dependency (hop)", "L2 relations", l2 ? "found" : "missed");
  assert.equal(l2, true);
});

test("PD4 contradiction in prose: 'drops' vs 'does not drop' (two agents)", () => {
  const turns = [{ n: 1, agent: "B", answer: "The parser drops trailing commas." }, { n: 1, agent: "C", answer: "The parser does not drop trailing commas." }];
  const idx = index(turns, 2);
  const by = new Map(); for (const c of idx.cons) { const k = `${c.e1}|${c.lab}|${c.e2}`; if (!by.has(k)) by.set(k, []); by.get(k).push(c); }
  const conflict = [...by.values()].some((g) => new Set(g.map((x) => x.neg)).size === 2 && new Set(g.map((x) => x.agent)).size === 2);
  put("contradiction: negation", "L0 raw", "no conflict"); put("contradiction: negation", "L1 beings", "no conflict"); put("contradiction: negation", "L2 relations", conflict ? "conflict flagged" : "missed");
  assert.equal(conflict, true);
});

test("PD5 FALSIFIER: contradiction by antonym ('keeps' vs 'drops') needs a lexical-semantic prior the stack does not have", () => {
  const idx = index([{ n: 1, agent: "B", answer: "The parser keeps trailing commas." }, { n: 1, agent: "C", answer: "The parser drops trailing commas." }], 2);
  const by = new Map(); for (const c of idx.cons) { const k = `${c.e1}|${c.e2}`; if (!by.has(k)) by.set(k, new Set()); by.get(k).add(c.lab); }
  const flagged = [...by.values()].some((s) => s.size === 2 && s.has("keep") && s.has("drop")) && false; // no antonym prior exists to license this
  put("contradiction: antonym", "L2 relations", "needs antonymy prior"); assert.equal(flagged, true, "no prior declares keep/drop opposed");
});

test("PD6 FALSIFIER: a prose fact about everyday words (the queen's grey eyes) is not a being under any rung", () => {
  const turns = scenario({ 12: { answer: "The queen enters. Her eyes are grey as slate. Tests pass." } });
  const ok = find(index(turns, 2), "write the recognition scene where the queen is known by a stranger", { hops: 1 }).includes(12);
  put("everyday-noun fact (Shakespeare)", "L2 relations", ok ? "found" : "missed"); assert.equal(ok, true);
});

test("PD7 FALSIFIER: a synonym of a being (resend vs retry) is not bridged", () => {
  const turns = scenario({ 30: { answer: "Webhook retry now uses jittered backoff. Tests pass." } });
  const ok = find(index(turns, 2), "make the resend logic more patient", { hops: 1 }).includes(30);
  put("synonym (resend/retry)", "L2 relations", ok ? "found" : "missed"); assert.equal(ok, true);
});

test("PD8 hyperlexicon: prose relations are nominated (candidate); only an instrument-checked relation is given, and it does not license by itself", () => {
  const idx = index(scenario({ 40: { answer: "Added validateOrder, which calls normalizeTotals. Tests pass." } }), 2);
  const cands = idx.cons.filter((c) => c.e1 === "validateorder").map((c) => ({ left: c.e1, right: c.e2, witnesses: [`turn-${c.n}#${c.at}`], giver: null }));
  let hl = admitHyperlexiconCandidates(createHyperlexicon(), cands);
  const cand = Object.values(hl.composition).filter((x) => x.standing === "candidate").length;
  const s = createSession(); s.ingest({ n: 40, edits: [{ file: "order.js", text: "export function validateOrder(o) { return normalizeTotals(o); }\n" }] });
  const e = s.edgesAt()[0];
  hl = giveHyperlexiconAffordance(hl, { left: "validateorder", right: "normalizetotals", giver: "khora:adapters/code/edges.js#readEdges", witnesses: [e.span], meta: { instrument: "readEdges" } });
  const given = Object.values(hl.composition).find((x) => x.standing === "given");
  const lic = licenseStanding(given);
  put("hyperlexicon", "L2 relations", `${cand} candidate`); put("hyperlexicon", "L3 +code edges", `given by instrument; licensed: ${lic.licensed}`);
  assert.ok(cand >= 1 && given);
});

test("PD9 bytes: what each rung stores against the raw prose it stands for (100 turns)", () => {
  const turns = scenario({ 40: { answer: "Added validateOrder, which calls normalizeTotals. Tests pass." } });
  const raw = turns.reduce((n, t) => n + Buffer.byteLength(t.answer) + Buffer.byteLength(t.ask), 0);
  const l1 = packedBytes(index(turns, 1).digests), l2 = packedBytes(index(turns, 2).digests);
  const note = surf({ ask: "x", turns }).chars;
  put("bytes stored (100 turns)", "L0 raw", `${raw} B raw / ${note} B note`); put("bytes stored (100 turns)", "L1 beings", `${l1} B packed`); put("bytes stored (100 turns)", "L2 relations", `${l2} B packed`);
  assert.ok(l2 < raw);
});

after(() => {
  const cols = ["L0 raw", "L1 beings", "L2 relations", "L3 +code edges"];
  console.log("\npredigestion ladder (same turns)\n" + `  ${"battery".padEnd(36)}${cols.map((c) => c.padEnd(26)).join("")}\n` + Object.entries(rows).map(([r, v]) => `  ${r.padEnd(36)}${cols.map((c) => String(v[c] ?? "-").padEnd(26)).join("")}`).join("\n"));
});

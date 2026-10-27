// g3-measure.mjs — identity-16: measure identity (concept and scope) added to the identity-8 verdict. Plain arm, no model.
//   node g3-measure.mjs --selftest             synthetic only
//   node g3-measure.mjs --build  OUT.json      build the fresh ground G2-M (seeded) from g2-pairs.json + EO-terminal timeline.json
//   node g3-measure.mjs --score  G2M.json      the single scoring pass (also reads g2-pairs.json for the regression and the shuffled control)
// Imports the frozen A1 rules from g2-score.mjs's library half (g2-lib.mjs, the text before the scoring pass); A1 is not edited.
import fs from "node:fs"; import crypto from "node:crypto";
const { verdicts: a1verdicts, periodOfNumber } = await import("./g2-lib.mjs");
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// ---- GIVERS (declared, closed; nothing learned) ----
// concept anchors: the declared concept class of g2pairs.mjs (a fixture-construction giver, here used as the reader's)
const ANCHOR = { Revenue: /\b(revenues?|sales)\b/gi, "Net income": /\bnet (income|loss|earnings)\b/gi, "Total assets": /\btotal assets\b/gi, "Total liabilities": /\btotal liabilities\b/gi, Equity: /\b(stockholders|shareholders)['’]? equity\b/gi, Cash: /\bcash( and cash equivalents)?\b/gi, "Operating cash flow": /\bcash (provided|used|flows?|generated)\b[^.]{0,40}\boperat\w*|\boperating (activities|cash)\b/gi };
// scope cues (closed list) -> a class; the record's scope comes from its tag
const CUES = [[/\battributable to\s+(?:the\s+)?(?:non-?controlling|minority)/i, "attributable:nci"], [/\battributable to\b/i, "attributable:parent"], [/\bincluding\s+(non-?controlling[\w\s]*?)(?=\s+(?:was|were|totaled|of)\b|,|$)/i, "incl:nci"], [/\bexcluding\s+([\w\s-]+?)(?=\s+(?:was|were|totaled|of)\b|,|$)/i, "excl"], [/\bfrom continuing operations\b/i, "continuing"], [/\bbefore (?:income )?tax(?:es)?\b/i, "pretax"], [/\bper (?:diluted |basic )?share\b/i, "pershare"], [/\band investments\b|\bincluding investments\b/i, "incl:investments"]];
const UNLISTED = /\b(adjusted|non-?gaap|pro forma|underlying|core)\b/i;
const TAG_SCOPE = (tag) => (/NetIncomeLoss/.test(tag) ? new Set(["attributable:parent"]) : new Set());   // what the tag already says about its scope; everything else is unqualified
export function conceptOf(quote, numberText) {
  const pos = quote.indexOf(numberText), hits = [];
  for (const [concept, re] of Object.entries(ANCHOR)) for (const m of quote.matchAll(re)) hits.push({ concept, a: m.index, b: m.index + m[0].length, len: m[0].length });
  if (!hits.length) return { concept: null, why: "no anchor" };
  const before = hits.filter((h) => h.b <= pos), pool = before.length ? before : hits;                      // the anchor nearest BEFORE the number; else nearest after
  const d = (h) => (h.b <= pos ? pos - h.b : h.a - pos), best = Math.min(...pool.map(d)), near = pool.filter((h) => d(h) === best), maxLen = Math.max(...near.map((h) => h.len)), top = [...new Set(near.filter((h) => h.len === maxLen).map((h) => h.concept))];
  return top.length === 1 ? { concept: top[0], a: near.find((h) => h.concept === top[0]).a } : { concept: null, why: "anchors tie" };
}
export function scopeOf(quote, numberText, anchorStart) {
  const pos = quote.indexOf(numberText), label = quote.slice(anchorStart ?? Math.max(0, pos - 90), pos), cues = new Set();
  for (const [re, cls] of CUES) if (re.test(label)) cues.add(cls);
  const lead = quote.slice(Math.max(0, (anchorStart ?? pos) - 20), pos);   // adjectives sit just BEFORE the anchor ("Adjusted revenue")
  return { cues, unlisted: UNLISTED.test(lead), label };
}
/** A3 = A1 + measure identity. Returns { v, rule, step } */
export function a3(pair) {
  const r1 = a1verdicts(pair), P = pair.prose, S = pair.structured;
  if (r1.A1.v === "refused") return { ...r1.A1, step: "entity" };
  const c = conceptOf(P.quote, P.numberText);
  if (c.concept && c.concept !== S.concept) return { v: "refused", rule: "measure", step: "concept", prose: c.concept, record: S.concept };
  const sc = scopeOf(P.quote, P.numberText, c.a), allowed = TAG_SCOPE(S.tag ?? ""), clash = [...sc.cues].filter((x) => !allowed.has(x));
  if (clash.length) return { v: "refused", rule: "scope", step: "scope", cues: clash };
  const measureKnown = !!c.concept && !sc.unlisted;                                  // unknown concept or an unlisted scope word never convicts
  if (r1.A1.v === "contradictory" && !measureKnown) return { v: "undecided", rule: c.concept ? "scope-unknown" : "measure-unknown", step: "withheld" };
  return { ...r1.A1, step: "a1" };
}
/** a pool-level verdict for a measure that is a composition (cash and investments); synthetic use only here */
export function poolVerdict({ concepts, stated, precision, cues }, rows) {
  const tol = precision / 2, comps = rows.filter((r) => concepts.includes(r.concept));
  const missing = concepts.filter((c) => !comps.some((r) => r.concept === c));
  if (!comps.length) return { v: "refused", rule: "measure" };
  if (missing.length) return { v: "refused", rule: "scope", missing };
  const sum = concepts.map((c) => comps.find((r) => r.concept === c).value).reduce((a, b) => a + b, 0);
  return Math.abs(sum - stated) <= tol ? { v: "aligned", composition: concepts } : { v: "contradictory", rule: "value", composition: concepts };
}

if (process.argv[2] === "--selftest") {
  const t = (n, c) => { console.log(c ? "ok  " : "FAIL", n); if (!c) process.exitCode = 1; };
  const q = "Cash flows from operations totaled $440.0 million for the twelve months ended December 31, 2025.";
  t("N138-like sentence is operating cash flow", conceptOf(q, "$440.0 million").concept === "Operating cash flow");
  t("revenue and loss in one sentence, by nearest anchor", conceptOf("Revenue was $10.3 million and net loss was $4.1 million.", "$4.1 million").concept === "Net income" && conceptOf("Revenue was $10.3 million and net loss was $4.1 million.", "$10.3 million").concept === "Revenue");
  t("scope cue: attributable to noncontrolling", scopeOf("Net loss attributable to noncontrolling interests was $1.0 million", "$1.0 million", 0).cues.has("attributable:nci"));
  t("scope cue: and investments", scopeOf("Cash, cash equivalents and investments totaled $311.6 million", "$311.6 million", 0).cues.has("incl:investments"));
  const mk = (quote, nt, sv, prec, concept, tag, value, start, end, ent = "0001370053") => ({ concept, prose: { path: `data/releases/${ent}/x.json`, quote, numberText: nt, statedValue: sv, statedPrecision: prec }, structured: { entity: ent, concept, tag, period: { start, end }, value, scale: 1, unit: "USD" }, asof: {} });
  const n138 = mk(q, "$440.0 million", 4.4e8, 1e5, "Net income", "us-gaap:NetIncomeLoss:USD", 123000000, "2025-01-01", "2025-12-31");
  t("N138: a net income row for an operating cash flow sentence is refused (measure), never contradictory", (() => { const r = a3(n138); return r.v === "refused" && r.rule === "measure"; })());
  const ok = mk(q, "$440.0 million", 4.4e8, 1e5, "Operating cash flow", "us-gaap:NetCashProvidedByUsedInOperatingActivities:USD", 440012000, "2025-01-01", "2025-12-31");
  t("same measure, cancelling, is aligned", a3(ok).v === "aligned");
  t("same measure, period known and equal, value differs: contradictory", a3({ ...ok, structured: { ...ok.structured, value: 540012000 } }).v === "contradictory");
  const trap = mk("Cash, cash equivalents and investments totaled $311.6 million as of Dec. 31, 2025.", "$311.6 million", 3.116e8, 1e5, "Cash", "us-gaap:CashAndCashEquivalentsAtCarryingValue:USD", 238196000, null, "2025-12-31");
  t("scope trap against the cash-only row is refused (scope), never contradictory", (() => { const r = a3(trap); return r.v === "refused" && r.rule === "scope"; })());
  const pv = (rows) => poolVerdict({ concepts: ["Cash", "Investments"], stated: 3.116e8, precision: 1e5 }, rows);
  t("pool with cash and investments summing to the stated value: aligned", pv([{ concept: "Cash", value: 238196000 }, { concept: "Investments", value: 73404000 }]).v === "aligned");
  t("pool with cash only: refused (scope)", (() => { const r = pv([{ concept: "Cash", value: 238196000 }]); return r.v === "refused" && r.rule === "scope"; })());
  t("pool whose parts do not sum: contradictory", pv([{ concept: "Cash", value: 238196000 }, { concept: "Investments", value: 1000 }]).v === "contradictory");
  t("an unlisted scope word withholds a conviction", (() => { const q2 = "Adjusted revenue was $10.3 million for the year ended December 31, 2022."; const p = mk(q2, "$10.3 million", 1.03e7, 1e5, "Revenue", "us-gaap:Revenues:USD", 99000000, "2022-01-01", "2022-12-31"); const r = a3(p); return r.v === "undecided" && r.rule === "scope-unknown"; })());
  process.exit(process.exitCode ?? 0);
}

const G2 = "/Users/mlacy/Downloads/workspace/g2-pairs/g2-pairs.json", TLF = "/Users/mlacy/Downloads/workspace/EO-terminal/data/observations/timeline.json";
if (process.argv[2] === "--build") {
  const ps = JSON.parse(fs.readFileSync(G2, "utf8")).pairs.filter((p) => p.origin === "natural"), TL = JSON.parse(fs.readFileSync(TLF, "utf8")).timelines, R = rng(20261101);
  const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const structuredOf = (t) => { const ss = t.readings.filter((r) => r.source !== "sec-release"); return ss.length ? ss.sort((a, b) => a.delivered.at.localeCompare(b.delivered.at))[0] : null; };
  const out = [], used = new Set();
  for (const p of shuffle(ps)) {   // MEASURE class: the record of ANOTHER concept, same entity and same period
    if (out.filter((x) => x.truth_rule === "measure").length >= 60) break;
    const alt = TL.filter((t) => t.entity === p.entity && t.start === p.period.start && t.end === p.period.end && t.concept !== p.concept && structuredOf(t)); if (!alt.length) continue;
    const t = alt[Math.floor(R() * alt.length)], s = structuredOf(t); used.add(p.id);
    out.push({ id: "M" + String(out.length + 1).padStart(3, "0"), truth: "not_comparable", truth_rule: "measure", basedOn: p.id, concept: p.concept, entity: p.entity, prose: p.prose, structured: { source: s.source, tag: s.tag, accession: s.accession, form: s.form, entity: t.entity, concept: t.concept, period: { start: t.start, end: t.end }, value: s.value, unit: "USD", scale: 1, delivered: s.delivered.date, evidence: s.evidence }, asof: { prose: p.prose.delivered, structured: s.delivered.date } });
  }
  const CUE_TEXT = ["excluding discontinued operations", "including noncontrolling interests", "from continuing operations", "before income taxes", "attributable to noncontrolling interests"];
  for (const p of shuffle(ps)) {   // SCOPE class (fictional edit): the same record, but the prose label gains a scope cue; the number is unchanged
    if (out.filter((x) => x.truth_rule === "scope").length >= 30) break;
    if (used.has(p.id) || out.some((x) => x.basedOn === p.id)) continue;
    const re = Object.values(ANCHOR).map((r) => new RegExp(r.source, "i")), c = conceptOf(p.prose.quote, p.prose.numberText); if (!c.concept) continue;
    const m = p.prose.quote.match(new RegExp(ANCHOR[c.concept].source, "i")); if (!m) continue;
    const cue = CUE_TEXT[Math.floor(R() * CUE_TEXT.length)], quote = p.prose.quote.slice(0, m.index + m[0].length) + " " + cue + p.prose.quote.slice(m.index + m[0].length);
    out.push({ id: "M" + String(out.length + 1).padStart(3, "0"), truth: "not_comparable", truth_rule: "scope", basedOn: p.id, cueInserted: cue, concept: p.concept, entity: p.entity, prose: { ...p.prose, quote }, structured: p.structured, asof: p.asof });
  }
  const set = { schema: "G2M@1", seed: 20261101, built: "see file mtime", source: { g2pairs_sha256: crypto.createHash("sha256").update(fs.readFileSync(G2)).digest("hex"), timeline: TLF }, counts: out.reduce((a, x) => ((a[x.truth_rule] = (a[x.truth_rule] ?? 0) + 1), a), {}), note: "FICTIONAL by construction for the scope class (a cue inserted into a real sentence); the measure class pairs a real sentence with a real record of another concept. Tests machinery, not the world.", pairs: out };
  fs.writeFileSync(process.argv[3], JSON.stringify(set, null, 1)); console.log(JSON.stringify(set.counts)); process.exit(0);
}

if (process.argv[2] === "--score") {
  const M = JSON.parse(fs.readFileSync(process.argv[3], "utf8")).pairs, G = JSON.parse(fs.readFileSync(G2, "utf8")).pairs, bump = (o, k) => (o[k] = (o[k] ?? 0) + 1);
  const res = { G2M: { A1: {}, A3: {} }, regression: { A1: {}, A3: {} }, shuffled: { A1: {}, A3: {} }, planted: { A1: {}, A3: {} } };
  for (const p of M) { for (const [arm, fn] of [["A1", (x) => a1verdicts(x).A1], ["A3", a3]]) { const r = fn(p); bump(res.G2M[arm], `${p.truth_rule} -> ${r.v}${r.rule ? ":" + r.rule : ""}`); } }
  for (const p of G) { const tag = `${p.origin}/${p.truth}/${p.rule ?? p.form}`; for (const [arm, fn] of [["A1", (x) => a1verdicts(x).A1], ["A3", a3]]) { const r = fn(p); bump(p.origin === "natural" ? res.regression[arm] : res.planted[arm], `${tag} -> ${r.v}${r.rule ? ":" + r.rule : ""}`); } }
  const R = rng(20261031), nat = G.filter((p) => p.origin === "natural");   // the SAME shuffled control as identity-14 (same seed and draw), as a regression
  for (const p of nat) { let q = null; for (let tries = 0; tries < 200 && !q; tries++) { const c = nat[Math.floor(R() * nat.length)]; if (c.id !== p.id && (c.structured.entity !== p.structured.entity || c.concept !== p.concept || c.structured.period.end !== p.structured.period.end) && Math.abs(Math.abs(c.structured.value * c.structured.scale) - p.prose.statedValue) > p.prose.statedPrecision) q = c; }
    if (!q) continue; const x = { ...p, structured: q.structured }; bump(res.shuffled.A1, (({ v, rule }) => `${v}${rule ? ":" + rule : ""}`)(a1verdicts(x).A1)); bump(res.shuffled.A3, (({ v, rule }) => `${v}${rule ? ":" + rule : ""}`)(a3(x))); }
  const n138 = G.find((p) => p.id === "N138"); console.log(JSON.stringify({ ...res, N138_as_given: a3(n138) }, null, 1));
}

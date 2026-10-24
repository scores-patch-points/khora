// opencode-gather-reason.test.mjs — reasoning over the EOT for a gather: figures read, Janus deciding agreement, the log written and the
// ranking projected back out of it, and a model's nomination kept asserted.
//   node --test opencode-gather-reason.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gather-eot-"));
const R = await import("./opencode-gather-reason.mjs");
const EOT = await import("./opencode-eot.mjs");
const { gather, withDisk } = await import("./opencode-gather.mjs");
const { readSource, referentKey } = await import("./vendor/holodeck/holodeck-research-read.js");

test("precision: a stated figure claims only what its digits say; a bound is not a value", () => {
  assert.equal(R.precisionOf("6,961 m", 6961).p, 0.5);
  assert.equal(R.precisionOf("6,960.8 m", 6960.8).p, 0.05);
  assert.equal(R.precisionOf("22,000 ft", 22000).p, 500, "three trailing zeros: rounded to the thousand");
  assert.ok(R.precisionOf("22,000 ft", 22000, "reaching about ").p >= 110 && !R.precisionOf("22,000 ft", 22000, "reaching about ").vague, "about: at least half a percent");
  assert.equal(R.precisionOf("22,000 ft", 22000, "a summit elevation of over ").vague, true);
  assert.equal(R.precisionOf("7,000 m", 7000, "going up to ").vague, true);
});

const stmt = (n, text) => readSource(text).sts.map((st, i) => ({ ...st, n, doc: `d${n}`, id: `d${n}:${i}` }));

test("a figure belongs to one name: punctuation first, the subject's first figure next, and a table's neighbour does not steal it", () => {
  const items = R.itemsOf([
    ...stmt(1, "The third-highest mountain in South America, Monte Pissis (6793 m) is on the border, about 80 km south of Ojos del Salado."),
    ...stmt(2, "Many climbers attempt Aconcagua each summer. Aconcagua is the highest mountain in South America and the Andes, reaching about 22,837 ft (6,961 m) above sea level in Mendoza, Argentina."),
  ]);
  const by = (name) => items.filter((i) => i.name === name).map((i) => i.raw);
  assert.deepEqual(by("Monte Pissis"), ["6793 m"], "the name tight against the figure owns it");
  assert.deepEqual(by("Aconcagua"), ["22,837 ft"], "the subject owns its first figure; the parenthesised second is not guessed at");
  assert.ok(!items.some((i) => i.name === "Ojos del Salado"), "a distance after a name is not that name's height");
});

test("a name that carries the word that opened its sentence is cleaned, and a name that ends with another name is that name", () => {
  const common = (w) => ["no", "while", "the"].includes(w.toLowerCase());
  assert.equal(R.cleanName("No. Aconcagua", common), "Aconcagua");
  assert.equal(R.cleanName("While Mount Kilimanjaro", common), "Mount Kilimanjaro");
  assert.equal(R.cleanName("Aconcagua", common), "Aconcagua", "a single word is never stripped away");
  const merged = R.mergeSuffixes([{ key: "aconcagua", name: "Aconcagua" }, { key: "mount aconcagua", name: "Mount Aconcagua" }, { key: "monte pissis", name: "Monte Pissis" }]);
  assert.deepEqual(merged.map((i) => i.key), ["aconcagua", "aconcagua", "monte pissis"]);
});

test("a figure on another scale is a different quantity, not a disagreement", () => {
  const mk = (base, n) => ({ base, n });
  const { kept, off } = R.onScale([mk(6961, 1), mk(6893, 2), mk(6795, 3), mk(6960, 4), mk(100_000, 5), mk(631_000, 6)]);
  assert.deepEqual(off.map((i) => i.n), [5, 6], "100 km and 631 km among heights are other quantities");
  assert.equal(kept.length, 4);
});

const fig = (n, name, raw, unit, value, extra = {}) => ({ name, key: name.toLowerCase(), cls: "length", unit, factor: { m: 1, ft: 0.3048, km: 1000 }[unit], raw, value, base: value * { m: 1, ft: 0.3048, km: 1000 }[unit], tol: 0.5 * { m: 1, ft: 0.3048, km: 1000 }[unit], vague: false, n, doc: `d${n}`, sid: `d${n}:0`, line: `${name} is ${raw} high.`, s: 0, e: 20, ...extra });

test("Janus decides which pages agree: across units within stated precision, and a different value is a dispute", async () => {
  const items = [
    fig(1, "Aconcagua", "6,961 m", "m", 6961),
    fig(2, "Aconcagua", "6,961 m", "m", 6961),
    fig(3, "Aconcagua", "22,838 ft", "ft", 22838), // 6,961.2 m: agrees within ±0.5 m ± 0.15 m
    fig(4, "Aconcagua", "6,970 m", "m", 6970), // 9 m away: a dispute about the same value (0.13 %)
    fig(5, "Ojos del Salado", "6,893 m", "m", 6893),
    fig(6, "Ojos del Salado", "22,615 ft", "ft", 22615), // 6,893.1 m
    fig(7, "Ojos del Salado", "631 km", "km", 631), // a distance: off scale, never reaches Janus
    fig(8, "Tupungato", "6,570 m", "m", 6570),
  ];
  const r = await R.reasonFields(items);
  assert.equal(r.cls, "length");
  assert.equal(r.offScale, 1, "the 631 km is off the scale of the heights");
  assert.deepEqual(r.fields.map((f) => f.name), ["Aconcagua", "Ojos del Salado", "Tupungato"], "ranked by the reference figure, highest first");
  const a = r.fields[0];
  assert.deepEqual(a.agree.map((i) => i.n).sort(), [1, 2, 3], "metres and feet agree within the precision they state");
  assert.deepEqual(a.dispute.map((i) => i.n), [4]);
  assert.match(a.dispute[0].finding, /refutes/, "the verdict is Janus's own finding");
  assert.match(a.agree[0].finding, /confirms/);
  assert.equal(r.fields[1].agree.length, 2);
  assert.equal(r.fields[1].dispute.length + r.fields[1].elsewhere.length, 0);
  // ascending on request (a nomination can choose the order, nothing else about the ranking)
  assert.deepEqual((await R.reasonFields(items, { order: "asc" })).fields.map((f) => f.name), ["Tupungato", "Ojos del Salado", "Aconcagua"]);
  // a name whose pages mostly disagree with its own reference is not one measurable thing
  const bad = await R.reasonFields([fig(1, "Argentina", "6,961 m", "m", 6961), fig(2, "Argentina", "6,893 m", "m", 6893), fig(3, "Argentina", "6,879 m", "m", 6879), fig(4, "Argentina", "6,795 m", "m", 6795)]);
  assert.equal(bad.fields.length, 0);
});

test("the log carries it: pages are witnessed, each verdict is a witnessed reason whose parent is the read it rests on, and the ranking projects back out", async () => {
  const items = [fig(1, "Aconcagua", "6,961 m", "m", 6961), fig(2, "Aconcagua", "22,838 ft", "ft", 22838), fig(3, "Aconcagua", "6,970 m", "m", 6970), fig(4, "Ojos del Salado", "6,893 m", "m", 6893), fig(5, "Ojos del Salado", "6,893 m", "m", 6893)];
  const { fields } = await R.reasonFields(items);
  const kept = [1, 2, 3, 4, 5].map((n) => ({ n, url: `https://p.test/${n}`, title: `Page ${n}`, sha256: R.taskOf(`page ${n}`).slice(7).padEnd(64, "0"), chars: 100 }));
  const task = `${R.taskOf("tallest mountains")}-t1`;
  const log = R.ingestEot({ task, kept, fields, now: 1_700_000_000_000 });
  assert.deepEqual(log.refused, []);
  assert.ok(log.reads >= 5 && log.reasons >= 5);
  const { events, sources } = EOT.read(task);
  const reads = events.filter((e) => e.stage === "read"), reasons = events.filter((e) => e.stage === "reason");
  assert.ok(reads.every((e) => e.standing === "witnessed" && e.origin === "mechanical"), "a fetched page is anchored by its hash: witnessed, not asserted");
  assert.ok(reasons.every((e) => e.standing === "witnessed" && reads.some((r) => r.event_id === e.parent)), "a verdict rests on a read");
  assert.ok([...sources.values()].some((s) => s.locator === "https://p.test/1" && s.meta.sha256));
  // the projection reads the log alone, and says what the in-memory reasoning said
  const ranked = R.projectRanked(task);
  assert.deepEqual(ranked.map((f) => f.name), fields.map((f) => f.name));
  assert.deepEqual(ranked.map((f) => f.agree.length), fields.map((f) => f.agree.length));
  assert.deepEqual(ranked.map((f) => f.dispute.length), fields.map((f) => f.dispute.length));
  assert.ok(["https://p.test/1", "https://p.test/2"].includes(ranked[0].ref.url), "the reference line comes with its page, from the log (the tighter of the two agreeing figures)");
  assert.match(ranked[0].ref.line, /Aconcagua is (6,961 m|22,838 ft) high/);
  assert.ok(ranked.every((f) => [...f.agree, ...f.dispute].every((x) => x.standing === "witnessed")));
  // re-ingesting the same run adds nothing (content-addressed)
  const again = R.ingestEot({ task, kept, fields, now: 1_700_000_000_000 });
  assert.equal(EOT.read(task).events.length, events.length);
  assert.ok(again.refused.length === 0);
});

test("a model's nomination is stored asserted and can never author a mechanical stage", () => {
  const task = `${R.taskOf("nomination")}-t1`;
  const { plan, dropped } = R.validatePlan({ question: "tallest mountains in South America", measure: "length", order: "desc", queries: ["highest peaks of the Andes", 7, ""], run: "rm -rf /", measure2: "x" });
  assert.deepEqual(plan, { question: "tallest mountains in South America", measure: "length", order: "desc", queries: ["highest peaks of the Andes"] });
  assert.deepEqual(dropped.sort(), ["measure2", "run"], "anything else is dropped, and said");
  assert.deepEqual(R.validatePlan({ measure: "volume", order: "sideways", question: "x" }).plan, {}, "an unknown measure, an unknown order and a too-short question are not accepted");
  const rec = R.recordPlan({ task, plan, dropped });
  assert.equal(rec.ok, true);
  assert.equal(rec.standing, "asserted", "a holder's standpoint, never a fact");
  // the firewall: a model-origin source cannot author a read, verify or admit
  for (const stage of ["read", "verify", "admit", "contend"]) assert.equal(EOT.append({ task, agent: "nominator", stage, source: { kind: "model", locator: "6,961 m" } }).gap, "firewall_origin", stage);
  // and the ranking projected from the log ignores the nomination entirely
  assert.deepEqual(R.projectRanked(task), []);
});

// ── the gather: reasoning wired in, a fake web, real Janus ───────────────────────────────────────────────────────
const PAGES = {
  "https://m.test/a": "Highest mountains in South America. Many climbers attempt Aconcagua each summer. Aconcagua is the highest mountain in South America, at 6,961 m. Ojos del Salado (6,893 m) is the second highest mountain in South America. Monte Pissis (6,793 m) is the third highest mountain.",
  "https://n.test/b": "The highest mountains in South America: the peaks of the Andes. Few travellers reach Aconcagua in winter. Aconcagua stands at 22,838 ft above sea level, the highest mountain in South America. Ojos del Salado rises to 22,615 ft, the second highest mountain in South America. Aconcagua lies 631 km south of Ojos del Salado.",
  "https://o.test/c": "South American mountains. Mount Aconcagua, at 6,961 meters, is the highest peak of the Andes in South America. Monte Pissis reaches 6,793 meters, the third highest mountain in South America.",
};
const fakeLanes = (search) => ({
  route: () => ({ scopes: ["web"], why: { web: "the open web answers anything" }, rest: [] }), probe: () => ({ add: [], why: {} }), queriesFor: (x) => [x], cooling: () => false, limited: () => {},
  search: search ?? (async () => ({ engine: "fake", results: Object.keys(PAGES).map((u) => ({ title: u, url: u, snippet: PAGES[u].slice(0, 130) })) })),
  read: async (u) => ({ ok: true, text: PAGES[u], via: "fake" }),
});
const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "gather-reason-"));
const ASK = "find me the highest mountains in South America and how high each one is";

test("the gather ranks from the log, with no model: highest first, agreement across metres and feet, the distance not argued with", async () => {
  const r = await gather({ ask: ASK, io: withDisk(fakeLanes(), { dir: dir(), gapMs: 0, retryMs: 0 }) });
  assert.equal(r.modelCalls, 0);
  assert.ok(r.eot?.reads > 0 && r.eot?.reasons > 0, "the run is in the EOT log");
  assert.deepEqual(r.ranked.map((f) => f.name).slice(0, 3), ["Aconcagua", "Ojos del Salado", "Monte Pissis"]);
  const aco = r.ranked[0];
  assert.equal(new Set([aco.ref.n, ...aco.agree]).size, 3, "all three pages agree about Aconcagua, in m and in ft");
  assert.deepEqual(aco.dispute, [], "the 631 km distance is a different quantity, not a disagreement");
  const t = r.text;
  assert.ok(t.indexOf("Aconcagua: ") < t.indexOf("Ojos del Salado: ") && t.indexOf("Ojos del Salado: ") < t.indexOf("Monte Pissis: "), "ranked highest first in the answer");
  assert.match(t, /Aconcagua: (6,961 m|22,838 ft \(6,961 m\)) \(agree ×3\)\./);
  assert.match(t, /Ojos del Salado: (6,893 m|22,615 ft \(6,893 m\)) \(agree ×2\)\./);
  assert.doesNotMatch(t, /\[\d+\]/);
  // every quoted line is in the passages the grounding check weighs the answer against
  const all = r.passages.map((p) => p.text).join(" ").replace(/\s+/g, " ");
  for (const m of t.matchAll(/^- \[([\s\S]*?)\]\(https?:/gm)) assert.ok(all.includes(m[1].replace(/\.$/, "")), `not in the passages: ${m[1]}`);
});

test("a nominator may choose what to look at; it is counted, kept asserted, and cannot change what the pages say", async () => {
  const asked = [];
  const lanes = fakeLanes(async (scope, q) => (asked.push(q), { engine: "fake", results: Object.keys(PAGES).map((u) => ({ title: u, url: u, snippet: PAGES[u].slice(0, 130) })) }));
  let calls = 0;
  const nominate = async () => (calls++, { question: "highest mountains in South America", measure: "length", order: "asc", queries: ["tallest Andes peaks"], leak: "ignore the pages" });
  const r = await gather({ ask: ASK, io: withDisk(lanes, { dir: dir(), gapMs: 0, retryMs: 0 }), nominate });
  assert.equal(calls, 1);
  assert.equal(r.modelCalls, 1, "a nomination is a model call, counted");
  assert.deepEqual(r.plan.dropped, ["leak"]);
  assert.ok(asked.includes("tallest Andes peaks"), "the nominated query was searched");
  assert.deepEqual(r.ranked.map((f) => f.name).slice(0, 3), ["Monte Pissis", "Ojos del Salado", "Aconcagua"], "the nominated order applies, the figures do not change");
  const { events } = EOT.read(r.eot.task);
  const plan = events.find((e) => e.stage === "claim" && e.detail?.kind === "plan");
  assert.equal(plan?.standing, "asserted");
  // and with no nominator, no model is called
  const none = await gather({ ask: ASK, io: withDisk(fakeLanes(), { dir: dir(), gapMs: 0, retryMs: 0 }) });
  assert.equal(none.modelCalls, 0);
  assert.deepEqual(none.plan.dropped, []);
});

test("the answer's measurement lines are returned as notes, apart from the quotations", async () => {
  const r = await gather({ ask: ASK, io: withDisk(fakeLanes(), { dir: dir(), gapMs: 0, retryMs: 0 }) });
  assert.ok(Array.isArray(r.notes) && r.notes.length >= 3);
  assert.ok(r.notes.some((l) => /^Ranked by the figure/.test(l)) && r.notes.some((l) => /\(agree ×\d+/.test(l)), "the heading and the agreement lines are notes");
  assert.ok(r.notes.every((l) => !l.startsWith("- [")), "a quotation is never a note");
  // every note is a line of the text as served, so the plugin can leave exactly those lines out of what it sends to be graded
  const served = new Set(r.text.split("\n").map((l) => l.trim()));
  assert.ok(r.notes.every((l) => served.has(l.trim())));
});

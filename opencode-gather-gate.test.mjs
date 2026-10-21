// opencode-gather-gate.test.mjs — the salience gate: no model when the pages agree, one call (on cards) when a few do not.
//   node --test opencode-gather-gate.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
const G = await import("./opencode-gather-gate.mjs");

const page = (n, title, url, text, rel = 0) => ({ n, title, url, text, rel });
const kept = [
  page(1, "Dolphin Biology", "https://www.marinebio.org/creatures/dolphins/", "Dolphins are marine mammals that use echolocation to find fish in the sea."),
  page(2, "Common dolphin", "https://en.wikipedia.org/wiki/Common_dolphin", "The common dolphin is a cetacean found in warm waters."),
  page(3, "Bottlenose conservation", "https://www.fisheries.noaa.gov/species/bottlenose", "Bottlenose dolphins are protected under the Marine Mammal Protection Act."),
  page(4, "Dolphin facts", "https://animalfact.com/dolphin", "Dolphins live in pods and communicate with whistles and clicks."),
  page(5, "Miami Dolphins Depth Chart", "https://www.espn.com/nfl/team/depth/_/name/mia", "Quarterback running back wide receiver tight end offensive line kicker punter."),
];
const hits = [0.45, 0.42, 0.47, 0.4, 0.08].map((share, i) => ({ s: kept[i], share }));

test("pages that agree raise no doubt, so no model is asked", async () => {
  const same = hits.map((h) => ({ ...h, share: 0.4 }));
  assert.deepEqual(G.doubtful(same), []);
  let calls = 0;
  const r = await G.decide({ question: "dolphins", kept, hits: same, gate: async () => { calls++; return "none"; } });
  assert.equal(calls, 0);
  assert.equal(r.gate.asked, false);
  assert.equal(r.drop.size, 0);
});

test("one far-off page is doubtful; with no model it is dropped mechanically", async () => {
  assert.deepEqual(G.doubtful(hits).map((h) => h.s.n), [5]);
  const r = await G.decide({ question: "dolphins", kept, hits });
  assert.deepEqual([...r.drop], [5]);
  assert.equal(r.gate.by, "mechanical");
  assert.equal(r.gate.asked, false);
});

test("with a model: exactly one call, on cards, and the model's answer decides the doubtful page", async () => {
  const seen = [];
  const drop = await G.decide({ question: "dolphins", kept, hits, gate: async (p) => { seen.push(p); return "KEEP: none"; } });
  assert.equal(seen.length, 1);
  assert.ok(seen[0].length < 1500, "the prompt is cards, not pages");
  assert.match(seen[0], /\[5\] espn\.com \| Miami Dolphins Depth Chart/);
  assert.ok(!seen[0].includes("echolocation to find fish in the sea and more text"), "no full page text");
  assert.deepEqual([...drop.drop], [5]);
  assert.equal(drop.gate.by, "model");
  const keep = await G.decide({ question: "the Miami Dolphins", kept, hits, gate: async () => "KEEP: 5" });
  assert.equal(keep.drop.size, 0, "a model can rescue a doubtful page");
});

test("the model can only keep or drop the doubtful pages: it cannot add, and a reply it should not have given is ignored", async () => {
  const r = await G.decide({ question: "dolphins", kept, hits, gate: async () => "1, 2, 3, 99" });
  assert.deepEqual([...r.drop], [5], "numbers outside the doubtful set name nothing, so no pick, so the mechanical default");
  assert.equal(r.gate.by, "mechanical");
  const err = await G.decide({ question: "dolphins", kept, hits, gate: async () => { throw new Error("down"); } });
  assert.deepEqual([...err.drop], [5], "a dead model falls back to the mechanical drop");
});

test("a gate from the environment is an OpenAI-compatible call, and absent when unset", async () => {
  assert.equal(G.gateFromEnv({}), undefined);
  let req;
  const gate = G.gateFromEnv({ FOLD_GATE_URL: "http://x/v1", FOLD_GATE_KEY: "k" }, async (url, init) => { req = { url, init }; return { ok: true, json: async () => ({ choices: [{ message: { content: "5" } }] }) }; });
  assert.equal(await gate("p"), "5");
  assert.equal(req.url, "http://x/v1/chat/completions");
  assert.equal(JSON.parse(req.init.body).max_tokens, 30);
});

test("a reply that names the page it rejects does not keep it: only a KEEP line is an answer", async () => {
  for (const reply of ["Page 5 is about NFL football, so drop it.", "5 is not about the topic", "I would keep none; 5 is an NFL page", "5", ""]) {
    assert.equal(G.parsePicks(reply, [5, 7]), null, JSON.stringify(reply));
  }
  assert.deepEqual([...G.parsePicks("Sure.\nKEEP: 7, 5", [5, 7])].sort(), [5, 7]);
  assert.equal(G.parsePicks("KEEP: none", [5]).size, 0);
  const r = await G.decide({ question: "dolphins", kept, hits, gate: async () => "Page 5 is a football page, drop it." });
  assert.deepEqual([...r.drop], [5], "no KEEP line: the mechanical default drops it");
});

test("the card gate judges every page in chunks, falls back per chunk, and a model cannot rescue a page it is not shown", async () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ n: i + 1, title: `Page ${i + 1}`, url: `https://s${i}.org/p`, text: "A line of text that is long enough to be a lead line.", rel: 30 - i }));
  const prompts = [];
  const r = await G.decideAll({ question: "jaguar", kept: many, sense: "Jaguar, large cat", fallback: new Set([30]), chunk: 12, gate: async (p) => { prompts.push(p); const ns = [...p.matchAll(/^\[(\d+)\]/gm)].map((m) => +m[1]); return `KEEP: ${ns.filter((n) => n % 2).join(", ")}`; } });
  assert.equal(prompts.length, 3, "30 pages in chunks of 12 is three calls");
  assert.ok(prompts.every((p) => /meaning: Jaguar, large cat/.test(p) && /Which of these pages are about the topic with that meaning/.test(p)));
  assert.deepEqual([...r.drop].filter((n) => n % 2).length, 0, "every odd page the model kept stays");
  assert.ok(r.drop.has(2) && r.drop.has(4), "the even pages it left out are dropped");
  assert.equal(r.gate.calls, 3);
  const dead = await G.decideAll({ question: "jaguar", kept: many.slice(0, 5), fallback: new Set([5]), gate: async () => { throw new Error("down"); } });
  assert.deepEqual([...dead.drop], [5], "a dead model leaves the mechanical decision");
  assert.equal(dead.gate.by, "mechanical");
});

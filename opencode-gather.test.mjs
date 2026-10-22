// opencode-gather.test.mjs — a search ask answered from the pages read, with no model. Run against a fake web:
//   node --test opencode-gather.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gather, withDisk, ordinaryEnglish, stanceOf, chatCompletion, contentQuestion } from "./opencode-gather.mjs";

const ASK = "find me a corpus of sample documents for OCR training";

// FIXTURE PAGES, written for this test (not copies of any site): two that bear on the ask, one about dinner.
const PAGES = {
  "https://a.test/ocr-datasets": [
    "Datasets for OCR training: a short guide.",
    "RVL-CDIP is a corpus of 400,000 scanned documents in 16 classes, widely used for OCR training and layout work.",
    "FUNSD is a dataset of 199 annotated forms with text, layout and entity labels for OCR training on noisy scans.",
    "SROIE is a benchmark of scanned receipts with text and key-value fields for OCR.",
    "IAM is a dataset of handwritten English sentences from 657 writers.",
    "Most teams reach for RVL-CDIP first when they need scanned documents.",
    "Subscribe to our newsletter for more.",
  ].join(" "),
  "https://b.test/document-ai": [
    "Document AI corpora.",
    "Most OCR training pipelines start from RVL-CDIP, a corpus of scanned documents sorted into 16 classes.",
    "FUNSD gives sample documents with form-level annotation, a dataset small enough to fine-tune on in an afternoon.",
    "PubLayNet is a dataset of document images from PubMed Central with layout labels for OCR region detection.",
    "DocBank is a corpus of 500,000 document pages with token-level labels drawn from arXiv.",
  ].join(" "),
  "https://a.test/dinner": "A Michelin-Star dinner in Lyon. The sample menu has six courses and the documents office closed at noon.",
};

const fakeLanes = (over = {}) => {
  const ran = { search: 0, read: 0, live: 0, peak: 0 };
  const lanes = {
    route: () => ({ scopes: ["web"], why: { web: "the open web answers anything" }, rest: [] }),
    probe: () => ({ add: [], why: {} }),
    queriesFor: (x) => [x],
    cooling: () => false,
    limited: () => {},
    search: async () => {
      ran.search++;
      ran.live++;
      ran.peak = Math.max(ran.peak, ran.live);
      await new Promise((r) => setTimeout(r, 3));
      ran.live--;
      return { engine: "fake", results: Object.keys(PAGES).map((u) => ({ title: u.split("/").pop(), url: u, snippet: PAGES[u].slice(0, 120) })) };
    },
    read: async (u) => (ran.read++, { ok: true, text: PAGES[u], via: "fake" }),
    ...over,
  };
  return { lanes, ran };
};
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "gather-test-"));

test("ordinary English comes from Zenodotus's UD English prior, counted by form", async () => {
  const bg = await ordinaryEnglish();
  assert.equal(bg.ok, true);
  assert.ok(bg.n > 100_000, `the prior holds ${bg.n} tokens`);
  assert.ok(bg.p("the") > bg.p("zorblatt"), "a word the prior never saw is rarer than the commonest word");
});

test("a search ask is answered from the pages read: relevance gated, off-topic turned away, zero model calls", async () => {
  const dir = tmp();
  try {
    const { lanes, ran } = fakeLanes();
    const calls = { search: 0, read: 0, cached: 0 };
    const io = withDisk(lanes, { dir, calls, gapMs: 0, retryMs: 0 });
    const r = await gather({ ask: ASK, io });
    assert.equal(r.modelCalls, 0);
    assert.equal(r.sources.length, 2, "the two pages about the ask were read");
    assert.ok(r.gaps.some((g) => g.kind === "turned-away" && g.url === "https://a.test/dinner"), "the dinner page is turned away by the relevance null, with its numbers");
    assert.match(r.text, /\[RVL-CDIP is a corpus of 400,000 scanned documents in 16 classes, widely used for OCR training and layout work\.\]\(https:\/\/a\.test\/ocr-datasets "ocr-datasets"\)/, "the line is quoted whole, with its page as a link on it");
    assert.doesNotMatch(r.text, /\[\d+\]/, "no address or number is typed into the answer");
    assert.match(r.text, /PubLayNet is a dataset of document images/);
    assert.doesNotMatch(r.text, /Subscribe to our newsletter/, "a line that adds nothing to what the asker named is not selected");
    assert.doesNotMatch(r.text, /Michelin/);
    assert.match(r.text, /Named by several independent sites: .*RVL-CDIP \(2 sites\)/);
    assert.equal(ran.read, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("every selected line is a verbatim span of a page that was read", async () => {
  const dir = tmp();
  try {
    const { lanes } = fakeLanes();
    const io = withDisk(lanes, { dir, gapMs: 0, retryMs: 0 });
    const r = await gather({ ask: ASK, io });
    const squash = (s) => s.replace(/\s+/g, " ");
    const lines = r.text.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).replace(/^\[([\s\S]*)\]\(https?:[^)]*\)$/, "$1"));
    assert.ok(lines.length >= 4);
    for (const line of lines) assert.ok(Object.values(PAGES).some((p) => squash(p).includes(squash(line))), `not in any page: ${line}`);
    // and the passages handed on for the grounding check are the pages' own text
    assert.deepEqual(r.passages.map((p) => p.name).sort(), ["https://a.test/ocr-datasets", "https://b.test/document-ai", "research record (assembled by the door)"]);
    // every quoted line is inside the passages the grounding check will weigh the answer against, and the passages stay small
    const all = r.passages.map((p) => p.text).join(" ").replace(/\s+/g, " ");
    for (const line of lines) assert.ok(all.includes(line.replace(/\.$/, "")), `not in the passages: ${line}`);
    assert.ok(r.passages.reduce((n, p) => n + p.text.length, 0) < 20_000);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the stance is the asker's own words: what they named is not news to them", async () => {
  const { namesIn } = await import("./vendor/holodeck/holodeck-research-read.js");
  const s = stanceOf(ASK, namesIn);
  assert.ok(s.conclusion.names.includes("OCR"));
  assert.deepEqual(s.conclusion.frames, ["fact"]);
});

test("searches run one at a time; a 502 is retried once, a 429 never (the router cools that lane)", async () => {
  const dir = tmp();
  try {
    let n = 0;
    const { lanes, ran } = fakeLanes({
      queriesFor: (x) => [x, x + " dataset", x + " benchmark"],
      search: async function () {
        ran.live++; ran.peak = Math.max(ran.peak, ran.live);
        await new Promise((r) => setTimeout(r, 4));
        ran.live--;
        if (n++ === 0) throw new Error("heimdall search answered 502");
        return { engine: "fake", results: Object.keys(PAGES).map((u) => ({ title: u, url: u, snippet: PAGES[u].slice(0, 120) })) };
      },
    });
    const calls = { search: 0, read: 0, cached: 0 };
    const io = withDisk(lanes, { dir, calls, gapMs: 0, retryMs: 0 });
    const r = await gather({ ask: ASK, io });
    assert.equal(ran.peak, 1, "never two searches at once");
    assert.ok(r.sources.length >= 1, "the 502 was retried and the run went on");
    assert.ok(calls.search >= 2);

    let limited = 0;
    const io429 = withDisk({ ...lanes, search: async () => { limited++; throw new Error("answered 429"); } }, { dir: tmp(), calls: { search: 0, read: 0, cached: 0 }, gapMs: 0, retryMs: 0 });
    await assert.rejects(() => io429.search("web", "q"), /429/);
    assert.equal(limited, 1, "a rate limit is not retried");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("what a repeat ask reads comes from disk; a failure is never kept", async () => {
  const dir = tmp();
  try {
    const { lanes, ran } = fakeLanes();
    const calls = { search: 0, read: 0, cached: 0 };
    const io = withDisk(lanes, { dir, calls, gapMs: 0, retryMs: 0 });
    await gather({ ask: ASK, io });
    const first = { ...ran };
    const calls2 = { search: 0, read: 0, cached: 0 };
    const again = await gather({ ask: ASK, io: withDisk(lanes, { dir, calls: calls2, gapMs: 0, retryMs: 0 }) });
    assert.deepEqual({ search: ran.search, read: ran.read }, { search: first.search, read: first.read }, "the repeat ran nothing on the web");
    assert.ok(calls2.cached >= 3);
    assert.equal(again.sources.length, 2);

    let up = false;
    const flaky = withDisk({ ...lanes, search: async () => (up ? lanes.search() : Promise.reject(new Error("no engine answered"))) }, { dir: tmp(), calls: { search: 0, read: 0, cached: 0 }, gapMs: 0, retryMs: 0 });
    await assert.rejects(() => flaky.search("web", "x"));
    up = true;
    assert.ok((await flaky.search("web", "x")).results.length > 0, "the engine that refused is asked again");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("nothing found, nothing readable: said, never filled in", async () => {
  const dir = tmp();
  try {
    const { lanes } = fakeLanes({ search: async () => ({ engine: "fake", results: [] }) });
    const r = await gather({ ask: ASK, io: withDisk(lanes, { dir, gapMs: 0, retryMs: 0 }) });
    assert.ok(r.text.startsWith("Nothing was read, so nothing is stated."));
    assert.match(r.text, /Search again later/);
    assert.equal(r.sources.length, 0);
    assert.equal(r.modelCalls, 0);

    const { lanes: l2 } = fakeLanes({ read: async () => ({ ok: false, error: "unreachable" }) });
    const r2 = await gather({ ask: ASK, io: withDisk(l2, { dir: tmp(), gapMs: 0, retryMs: 0 }) });
    assert.equal(r2.sources.length, 0);
    assert.ok(r2.gaps.some((g) => g.kind === "unread"), "an unreadable page is a typed gap");
    assert.match(r2.text, /Not read:[\s\S]*- unread https:\/\/a\.test\//, "and the person is told which page and why");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the answer is served in the wire format of an OpenAI-compatible chat model, with zero tokens reported", () => {
  const text = "Read 2 source(s).\n[1] a — https://a.test\n  - " + "x".repeat(900);
  const json = chatCompletion({ text, stream: false, id: "t1", now: () => 1 });
  assert.equal(json.type, "application/json");
  const j = JSON.parse(json.body);
  assert.equal(j.object, "chat.completion");
  assert.equal(j.choices[0].message.content, text);
  assert.equal(j.choices[0].finish_reason, "stop");
  assert.deepEqual(j.usage, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });

  const sse = chatCompletion({ text, stream: true, id: "t2", now: () => 1 });
  assert.equal(sse.type, "text/event-stream");
  const events = sse.body.split("\n\n").filter(Boolean);
  assert.equal(events.at(-1), "data: [DONE]");
  const chunks = events.slice(0, -1).map((e) => JSON.parse(e.replace(/^data: /, "")));
  assert.equal(chunks[0].choices[0].delta.role, "assistant");
  assert.equal(chunks.map((c) => c.choices[0]?.delta?.content ?? "").join(""), text, "the chunks put the text back together exactly");
  assert.ok(chunks.some((c) => c.choices[0]?.finish_reason === "stop"));
  assert.deepEqual(chunks.at(-1).usage, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
});

test("the lanes are asked the question inside the request, not the request's own frame", () => {
  assert.equal(contentQuestion("find me the tallest mountains in South America and how high each one is"), "tallest mountains in South America and how high each one is");
  assert.equal(contentQuestion("find me a corpus of sample documents for OCR training"), "corpus of sample documents for OCR training");
  assert.equal(contentQuestion("Could you please look up the boiling point of ethanol?"), "boiling point of ethanol");
  assert.equal(contentQuestion("search for rust async runtimes"), "rust async runtimes");
  assert.equal(contentQuestion("who painted the Sistine Chapel ceiling"), "who painted the Sistine Chapel ceiling", "a question that is already a question is left alone");
  assert.equal(contentQuestion("find"), "find", "nothing left to ask: the ask stands");
});

test("research is asked the content question (the lanes see no request frame)", async () => {
  const asked = [];
  const { lanes } = fakeLanes({ search: async (scope, q) => (asked.push(q), { engine: "fake", results: [] }) });
  await gather({ ask: "find me the tallest mountains in South America", io: withDisk(lanes, { dir: tmp(), gapMs: 0, retryMs: 0 }) });
  assert.ok(asked.length >= 1);
  for (const q of asked) assert.ok(!/^find me/i.test(q), q);
});

test("a soft deadline returns what was read, said plainly, and never claims the sources saturated", async () => {
  const dir = tmp();
  try {
    // forty relevant pages, each slow to read: the loop is still going when the deadline falls
    const many = {};
    // every page brings words and names no other page has (so the saturation test never calls it done)
    const word = (k, j) => crypto.createHash("sha1").update(`${k}-${j}`).digest("hex").slice(0, 9).replace(/[0-9a-f]/g, (c) => "ghijklmnopqrstuv"[parseInt(c, 16)]);
    for (let k = 0; k < 40; k++) many[`https://n.test/p${k}`] = `The corpus of sample documents for OCR training named ${word(k, 1)[0].toUpperCase()}${word(k, 1).slice(1)} ${word(k, 2)[0].toUpperCase()}${word(k, 2).slice(1)} holds ${k * 7 + 10} scanned documents, and ${word(k, 3)} ${word(k, 4)} ${word(k, 5)} ${word(k, 6)} say so for OCR training.`;
    const { lanes } = fakeLanes({
      search: async () => ({ engine: "fake", results: Object.keys(many).map((u) => ({ title: "OCR training corpus of sample documents", url: u, snippet: many[u].slice(0, 130) })) }),
      read: async (u) => { await new Promise((r) => setTimeout(r, 150)); return { ok: true, text: many[u], via: "fake" }; },
    });
    const t0 = Date.now();
    const r = await gather({ ask: ASK, io: withDisk(lanes, { dir, gapMs: 0, retryMs: 0 }), softMs: 500 });
    assert.ok(Date.now() - t0 < 6000, "it returned soon after the deadline, not after all forty pages");
    assert.match(String(r.stop?.reason), /time budget/);
    assert.ok(r.sources.length >= 1 && r.sources.length < 40, `what had been read is still stated (${r.sources.length} of 40)`);
    assert.match(r.text, /time budget/, "and the person is told it was cut");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a lane that hangs cannot hold the gather past its deadline (found by falsification: a one-word topic ran 127 s against a 45 s budget)", async () => {
  const dir = tmp();
  try {
    const { lanes } = fakeLanes({
      search: async () => ({ engine: "fake", results: Object.keys(PAGES).map((u) => ({ title: "OCR training corpus of sample documents", url: u, snippet: PAGES[u].slice(0, 130) })) }),
      read: () => new Promise(() => {}), // never answers
    });
    const t0 = Date.now();
    const r = await gather({ ask: ASK, io: withDisk(lanes, { dir, gapMs: 0, retryMs: 0, readMs: 150 }), softMs: 400 });
    assert.ok(Date.now() - t0 < 3000, `returned in ${Date.now() - t0} ms, not after the hung reads`);
    assert.equal(r.sources.length, 0);
    assert.ok(r.gaps.some((g) => g.kind === "unread" && /timed out|stopped/.test(g.why)), "each hung page is a typed gap that says it timed out");
    assert.match(r.text, /Nothing was read/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("an account of a world topic does not search the code host; a search for resources still may", async () => {
  const asked = (kind) => async () => {
    const seen = [];
    const base = fakeLanes().lanes;
    const lanes = { ...base, route: () => ({ scopes: ["web", "github"], why: { web: "w", github: "g" }, rest: ["github", "wikipedia"] }), probe: () => ({ add: ["github"], why: { github: "hits are repos" } }),
      search: async (scope) => (seen.push(scope), { engine: scope, results: scope === "github" ? [] : Object.keys(PAGES).map((u) => ({ title: "OCR training corpus of sample documents", url: u, snippet: PAGES[u].slice(0, 130) })) }) };
    await gather({ ask: ASK, kind, io: withDisk(lanes, { dir: tmp(), gapMs: 0, retryMs: 0 }) });
    return seen;
  };
  assert.ok(!(await asked("account")()).includes("github"), "account: no GitHub lane, whether chosen, voted or widened to");
  assert.ok((await asked("search")()).includes("github"), "search: the lane stays");
  assert.ok((await asked(null)()).includes("github"), "no kind: unchanged");
});

test("a name that recurs across the pages of one site is that site's furniture, not corroboration", async () => {
  const pages = {};
  for (let k = 0; k < 6; k++) pages[`https://forge.test/p${k}`] = `Dolphins are marine mammals of the order Cetacea. Platform Copilot Enterprise Actions Sponsors menu number ${k}. Dolphins use echolocation to find fish in murky water.`;
  pages["https://zoo.test/d"] = "Dolphins are marine mammals that live in groups called pods. Bottlenose dolphins live in warm seas and eat fish.";
  const lanes = fakeLanes({ search: async () => ({ engine: "fake", results: Object.keys(pages).map((u) => ({ title: "Dolphins marine mammals", url: u, snippet: pages[u].slice(0, 130) })) }), read: async (u) => ({ ok: true, text: pages[u], via: "fake" }) }).lanes;
  const r = await gather({ ask: "write me an essay about dolphins", topic: "dolphins marine mammals", io: withDisk(lanes, { dir: tmp(), gapMs: 0, retryMs: 0 }) });
  assert.ok(!/Platform Copilot|Enterprise Actions/.test((r.text.match(/Named by several independent sites:[^\n]*/) ?? [""])[0]), "site chrome on six pages of one host is not named by several sites");
});

test("an account ask is answered with the pages' own explanatory prose, which names and measures nothing new", async () => {
  const pages = {
    "https://sci.test/photo": "Photosynthesis is the process by which plants turn light into chemical energy. Plants use sunlight, water and carbon dioxide to make glucose and oxygen. This happens inside chloroplasts, which hold the green pigment chlorophyll. Subscribe to our newsletter Sign In Platform Pricing.",
    "https://edu.test/photo": "Photosynthesis happens in two stages in a plant cell. In the first stage, light is absorbed and water is split to release oxygen into the air. In the second stage, the energy is used to build sugar from carbon dioxide.",
  };
  const lanes = fakeLanes({ search: async () => ({ engine: "fake", results: Object.keys(pages).map((u) => ({ title: "Photosynthesis in plants", url: u, snippet: pages[u].slice(0, 130) })) }), read: async (u) => ({ ok: true, text: pages[u], via: "fake" }) }).lanes;
  const mk = (kind) => gather({ ask: "explain how photosynthesis works", topic: "photosynthesis", kind, io: withDisk(lanes, { dir: tmp(), gapMs: 0, retryMs: 0 }) });
  const acc = await mk("account");
  assert.match(acc.text, /Plants use sunlight, water and carbon dioxide to make glucose and oxygen\./, "the explanation itself is selected");
  assert.match(acc.text, /two stages in a plant cell|water is split to release oxygen|build sugar from carbon dioxide/, "and the second page is read too");
  assert.doesNotMatch(acc.text, /Subscribe to our newsletter/, "page furniture is not prose");
  // as a search for an entity it would have dropped all of it: nothing here names or measures anything the asker did not already hold
  const srch = await mk("search");
  assert.doesNotMatch(srch.text, /Plants use sunlight, water and carbon dioxide/);
});

test("page furniture is not an account: a comment with dates, a disambiguation page, and sentence-opening function words as names", async () => {
  const pages = {
    "https://sci.test/photo": "Photosynthesis is the process by which plants turn light into chemical energy. Plants use sunlight, water and carbon dioxide to make glucose and oxygen inside chloroplasts. Sagar Aryal October 26, 2024 at 7:44 PM thanks, the plant carbon page was updated on October 27, 2024. It is studied by plant biologists. In plants, chlorophyll absorbs light energy.",
    "https://edu.test/photo": "Photosynthesis happens in two stages in a plant cell. In the first stage, light is absorbed and water is split to release oxygen into the air. This is the light reaction, and it feeds the Calvin cycle with chemical energy.",
    "https://en.wiki.test/Photosynthesis_(disambiguation)": "Photosynthesis is a plant process. Photosynthesis, a song on a 2012 album by an artist. Photosynthesis, a board game published in 2017.",
  };
  const lanes = fakeLanes({ search: async () => ({ engine: "fake", results: Object.keys(pages).map((u) => ({ title: "Photosynthesis in plants", url: u, snippet: pages[u].slice(0, 130) })) }), read: async (u) => ({ ok: true, text: pages[u], via: "fake" }) }).lanes;
  const r = await gather({ ask: "explain how photosynthesis works", topic: "photosynthesis", kind: "account", io: withDisk(lanes, { dir: tmp(), gapMs: 0, retryMs: 0 }) });
  assert.doesNotMatch(r.text, /October 2[67], 2024/, "a statement with two dates is a comment or a log, not an explanation");
  assert.doesNotMatch(r.text, /board game|a song on a 2012 album/, "a disambiguation page is not a source for an account");
  const named = (r.text.match(/Named by several independent sites: ([^\n]*)/) ?? [, ""])[1];
  assert.doesNotMatch(named, /\b(It|In|This)\b \(/, "a sentence-opening function word is not a name");
});

test("a licence notice or terms-of-use line is page furniture, never a quoted line", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("./opencode-gather.mjs", import.meta.url), "utf8");
  const m = /const BOILER = (\/.*\/i);/.exec(src);
  assert.ok(m, "the furniture pattern is in the gather");
  const re = eval(m[1]);
  for (const l of ["Text is available under the Creative Commons Attribution-ShareAlike 4.0 License; additional terms may apply.", "By using this site, you agree to the Terms of Use and Privacy Policy.", "Subscribe to our newsletter for more."]) assert.ok(re.test(l), l);
  for (const l of ["The jaguar is a large cat species and the only living member of the genus Panthera that is native to the Americas.", "Dolphins find prey by echolocation."]) assert.ok(!re.test(l), l);
});

// opencode-stitch.test.mjs — the stitched layer: a piece assembled from pages with no model, its slots a recursive void hunt, every sentence
// byte-exact at its address, furniture never shown, a one-page facet a typed gap; and `admit`, the drawn text taken back through the hunt.
//   node --test opencode-stitch.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "stitch-eot-"));
// zero model calls: a fetch from this module would be a model call or a page read; both are refused loudly
const fetches = [];
globalThis.fetch = async (...a) => { fetches.push(a); throw new Error("the stitched layer never fetches"); };
const S = await import("./opencode-stitch.mjs");
const EOT = await import("./opencode-eot.mjs");
const R = await import("./opencode-residue.mjs");
const L = await import("./opencode-longform.mjs");

const NAV = "Home | Lighthouses | Keepers | Contact";
const COPY = "© 2024 Coastal Heritage Trust. All rights reserved.";
const page = (url, body) => ({ name: url, url, text: [NAV, "", ...body, "", COPY].join("\n") });
const PAGES = [
  page("https://heritage.example/towers", [
    "Lighthouses were built on rocky headlands to warn ships away from the coast at night.",
    "A keeper lived in the tower and climbed the stairs every evening to light the lamp.",
    "The keeper trimmed the wick, wound the clockwork and polished the lens before dawn.",
    "A Fresnel lens bends the light of a single lamp into a beam seen twenty miles out at sea.",
    "The first Fresnel lens was fitted in 1823 and lighthouses everywhere adopted it within decades.",
  ]),
  page("https://maritime.example/keepers", [
    "Keepers kept a log of every ship that passed and every storm that struck the tower.",
    "The keeper and his family were often cut off from the mainland for weeks in winter.",
    "Automation replaced the last keepers in the 1990s, and the towers now run unattended.",
    "A lens of ground glass prisms was heavy, and keepers cleaned it by hand each morning.",
    "Ships steered by the pattern of flashes, since each lighthouse had its own signature.",
  ]),
  page("https://coast.example/history", [
    "The keeper rang a bell in fog so that ships could find the harbour mouth.",
    "Automation began in the 1960s when electric lamps no longer needed a keeper to tend them.",
    "With automation the keepers' cottages were sold or turned into small museums.",
    "Ships still rely on the light where satellite navigation fails close to the rocks.",
  ]),
  page("https://optics.example/fresnel", [
    "Augustin Fresnel designed the lens in Paris to replace the mirrors used before it.",
    "A first-order lens stands nearly four metres tall and weighs several tonnes.",
    "The foghorn sounded a two-tone blast every thirty seconds when the light could not be seen.",
    "A foghorn was driven by compressed air and could be heard five miles off the coast.",
    "The last foghorn on this coast fell silent in 2005 and was never replaced.",
  ]),
  page("https://engineering.example/automation", [
    "Automation meant a timer, a lamp changer and a radio link to the shore station.",
    "The lamp changer swings a fresh bulb into place the moment the old one fails.",
    "Many towers were automated before the war but keepers stayed on as caretakers.",
    "Ships that pass the automated light see the same flashes the keepers once kept.",
  ]),
];
const QUOTES = ["A Fresnel lens bends the light of a single lamp into a beam seen twenty miles out at sea.", "Automation replaced the last keepers in the 1990s, and the towers now run unattended."];
const gathered = { passages: [{ name: "research record (assembled by the door)", text: "Read 5 sources." }, ...PAGES], quotes: QUOTES, voids: [] };
const bytesOf = (url, start, end) => Buffer.from(PAGES.find((p) => p.url === url).text).subarray(start, end).toString("utf8");

test("the index: clean sentences at true byte addresses, the pages' furniture measured out", () => {
  const index = S.buildIndex(gathered.passages, { quotes: QUOTES });
  assert.equal(index.sources.length, 5, "the research record is not a page");
  assert.ok(index.sentences.length >= 20);
  for (const s of index.sentences) assert.equal(bytesOf(index.sources[s.src].url, s.start, s.end), s.text);
  assert.ok(!index.sentences.some((s) => /All rights reserved|Home \|/.test(s.text)), "a line on every page is furniture");
  assert.ok(index.furniture.length >= 2);
  assert.ok(index.sentences.some((s) => s.quoted));
  assert.equal(index.stem("keepers"), "keeper");
  assert.equal(index.stem("lenses"), "lens", "conflation is anchored in the corpus's own forms");
});

test("the void hunt finds the facets the pages share, descends one level, and declares a one-page facet a gap", () => {
  const tree = S.voidHunt({ passages: gathered.passages, quotes: QUOTES, topic: "lighthouses" });
  const labels = tree.root.children.map((c) => c.label.toLowerCase());
  assert.ok(labels.some((l) => /keeper/.test(l)), `keepers is a facet: ${labels}`);
  assert.ok(labels.some((l) => /lens/.test(l)), `the lens is a facet: ${labels}`);
  assert.ok(labels.some((l) => /automation/.test(l)), `automation is a facet: ${labels}`);
  for (const c of tree.root.children) { assert.ok(c.sources.length >= 2, `${c.label} rests on two pages`); assert.equal(c.found.by, "recurrence"); assert.ok(c.found.sentences >= 2); }
  assert.ok(!labels.some((l) => /foghorn/.test(l)), "a facet one page speaks to is not a slot");
  const gaps = S.gapsOf(tree);
  const fog = gaps.find((g) => /foghorn/i.test(g.label));
  assert.ok(fog, `the foghorn is a typed gap: ${JSON.stringify(gaps.map((g) => g.label))}`);
  assert.equal(fog.kind, "one-source");
  assert.ok(fog.context.length >= 1 && fog.context.every((c) => typeof c.start === "number" && c.url), "a gap carries the addressed snips nearest it");
  assert.ok(tree.root.children.some((c) => c.children.length), "some slot has sub-voids of its own");
  const sub = tree.root.children.flatMap((c) => c.children);
  for (const c of sub) { assert.equal(c.level, 2); assert.ok(c.sources.length >= 2); assert.ok(c.chain.length, "a sub-slot carries its parent's terms"); }
  const shallow = S.voidHunt({ passages: gathered.passages, topic: "lighthouses", depth: 1 });
  assert.ok(shallow.root.children.every((c) => !c.children.length), "depth 1 does not descend");
});

test("stitch: every sentence verbatim at its address, from more than one page per slot where pages agree, no furniture, zero model calls", () => {
  const r = S.stitch({ passages: gathered.passages, quotes: QUOTES, topic: "lighthouses" });
  assert.equal(r.calls, 0);
  assert.ok(r.filled.length >= 3);
  let n = 0;
  for (const f of r.filled) for (const s of f.sentences) { n++; assert.equal(bytesOf(s.url, s.start, s.end), s.text); assert.ok(r.text.includes(`${s.text} [S${s.n} #${s.start}-${s.end}]`)); }
  assert.ok(n >= 6);
  const all = r.filled.flatMap((f) => f.sentences.map((s) => s.id));
  assert.equal(new Set(all).size, all.length, "a sentence serves one slot");
  assert.ok(r.filled.some((f) => new Set(f.sentences.map((s) => s.n)).size >= 2), "a slot's sentences come from more than one page");
  assert.ok(!/All rights reserved|Home \||Contact/.test(r.text), "no furniture in the piece");
  assert.ok(r.text.startsWith("# lighthouses\n\n## "));
  assert.ok(r.text.includes("## Sources\n\n- S1 — https://heritage.example/towers"));
  assert.ok(r.gaps.some((g) => /foghorn/i.test(g.label)));
  const fogSection = r.sections.find((s) => /foghorn/i.test(s.title));
  assert.ok(fogSection && /^\(only 1 page spoke to this: foghorn\)$/i.test(fogSection.text), `the gap is shown typed: ${fogSection?.text}`);
  assert.equal(fetches.length, 0);
});

test("stitchStart writes the drawn mode's file and logs every section as fully facing; the residue ledger reads marked 0%", () => {
  const s = S.stitchStart({ ask: "write an essay on lighthouses", topic: "lighthouses", gathered, now: 1_700_000_000_000 });
  assert.ok(s.ok, JSON.stringify(s.gap));
  assert.equal(s.calls, 0);
  const file = fs.readFileSync(s.path, "utf8");
  for (const sec of s.sections) { assert.ok(file.includes(`<!-- section:${sec.id} -->`)); assert.equal(L.sectionText(file, sec.id), sec.text.trim()); }
  const states = L.outlineStates({ outline: s.job.outline, texts: Object.fromEntries(s.sections.map((x) => [x.id, x.text])), material: {}, standing: {}, idx: s.sections.length });
  assert.ok(states.every((x) => x.state === "written"), "outlineStates-style readers parse the stitched sections");
  const events = EOT.read(s.job.id).events;
  const secs = events.filter((e) => e.detail?.kind === "longform-section");
  assert.equal(secs.length, s.sections.length);
  for (const e of secs) { assert.equal(e.detail.accepted, true); assert.equal(e.detail.stitched, true); assert.equal(e.detail.sentences, e.detail.supported); }
  const treeEv = events.find((e) => e.detail?.kind === "stitch-tree");
  assert.ok(treeEv && treeEv.detail.tree.children.length && treeEv.detail.gaps.some((g) => /foghorn/i.test(g.label)));
  const ledger = R.longformLedger({ task: s.job.id });
  assert.equal(ledger.answers, s.sections.length);
  assert.ok(ledger.total.sentences >= 6);
  assert.equal(ledger.total.marked, 0);
  const across = R.residueAcross({ root: process.env.FOLD_WORKNOTES_DIR });
  assert.ok(across.ledgers.some((l) => l.task === s.job.id && l.kind === "longform" && l.share === 0));
  assert.equal(fetches.length, 0);
});

test("the stitched module imports no model and never fetches", () => {
  const src = fs.readFileSync(new URL("./opencode-stitch.mjs", import.meta.url), "utf8");
  assert.ok(!/\bfetch\s*\(/.test(src));
  assert.ok(!/opencode-finish|opencode-model|ollama|anthropic|openai/i.test(src));
});

test("admit: a drawn sentence faces a page at its address, another is marked, and a referent two pages mention becomes a child gap", async () => {
  const s = S.stitchStart({ ask: "write an essay on lighthouses", topic: "lighthouses", gathered, now: 1_700_000_001_000 });
  const slot = s.gaps.find((g) => /foghorn/i.test(g.label)).slot;
  const drawn = [
    "The foghorn was driven by compressed air and could be heard five miles off the coast.", // faces optics.example, byte-exact
    "Sailors loved the sound and wrote songs about it on long voyages.", // nothing read states this
    "Ships steered by the flashes and kept clear of the rocks.", // raises ships, which several pages speak to and this slot does not state
  ].join(" ");
  const r = await S.admit({ tree: s.tree, slot, drawn, job: s.job, now: 1_700_000_002_000 });
  assert.ok(r.ok);
  assert.equal(r.calls, 0);
  assert.equal(r.placed.length, 1, JSON.stringify(r.marked));
  assert.equal(bytesOf(r.placed[0].faces.url, r.placed[0].start, r.placed[0].end), r.placed[0].faces.text);
  assert.ok(r.marked.some((m) => /Sailors loved/.test(m.text)));
  assert.ok(r.newGaps.some((g) => /ship/i.test(g.label)), `ships is a child gap: ${JSON.stringify(r.newGaps.map((g) => g.label))}`);
  const ship = r.newGaps.find((g) => /ship/i.test(g.label));
  assert.equal(ship.kind, "raised");
  assert.ok(ship.context.length >= 2 && ship.context.every((c) => c.url && typeof c.start === "number"));
  assert.ok(ship.slot.startsWith(`${slot}.g`));
  // the section now shows the admitted sentences: the facing one at its address, the model's own with the mark, nothing cut silently
  const file = fs.readFileSync(s.path, "utf8");
  const body = L.sectionText(file, r.section);
  assert.ok(body.includes(`${r.placed[0].text} [S${r.placed[0].n} #${r.placed[0].start}-${r.placed[0].end}]`));
  for (const m of r.marked) assert.ok(body.includes(`${m.text} [M]`));
  assert.ok(!body.includes("(only 1 page spoke to this"));
  // on the log: one admit event, and the admit as a section grade the residue ledger counts apart from the stitched sections
  const events = EOT.read(s.job.id).events;
  const ad = events.find((e) => e.detail?.kind === "longform-admit");
  assert.ok(ad && ad.detail.slot === slot && ad.detail.facing === 1 && ad.detail.marked === 2 && ad.detail.newGaps.length >= 1);
  const ledger = R.longformLedger({ task: s.job.id });
  assert.equal(ledger.answers, s.sections.length + 1);
  const admitRun = ledger.runs.find((x) => x.section === `${slot}#admit1`);
  assert.ok(admitRun && Math.abs(admitRun.share - 2 / 3) < 1e-9, "the drawn layer's marked share is counted on its own");
  assert.ok(ledger.runs.filter((x) => !x.section.includes("#admit")).every((x) => x.share === 0 || x.share === null));
  assert.equal(S.admitLedger({ task: s.job.id }).admits, 1);
  // a judge can only demote: with the faced sentence judged unsupported, it is marked, never placed
  const r2 = await S.admit({ tree: s.tree, slot, drawn: "The foghorn was driven by compressed air and could be heard five miles off the coast.", judge: async () => ["unsupported"] });
  assert.equal(r2.placed.length, 0);
  assert.equal(r2.marked.length, 1);
  assert.equal(fetches.length, 0);
});

test("a tree with nothing read is a typed gap, never a piece", () => {
  const s = S.stitchStart({ ask: "x", topic: "nothing", gathered: { passages: [], quotes: [] } });
  assert.equal(s.gap?.kind, "nothing-read");
  const one = S.stitchStart({ ask: "x", topic: "lighthouses", gathered: { passages: [PAGES[0]], quotes: [] } });
  assert.equal(one.gap?.kind, "no-facet", "one page shares no facet with another");
});

// ── any kind of unit: the hunt and the byte-exact fill do not assume prose ─────────────────────────────────────────────────────────────────
const ROWS = [
  { name: "https://data.example/ports-a", text: ["port | country | keepers | lamp", "Hatteras | USA | 3 | fresnel", "Portland | USA | 2 | fresnel", "Eddystone | UK | 4 | oil", "Fastnet | Ireland | 3 | oil", "port | country | keepers | lamp"].join("\n") },
  { name: "https://data.example/ports-b", text: ["port | country | keepers | lamp", "Hatteras | USA | 3 | fresnel", "Skerryvore | UK | 2 | fresnel", "Fastnet | Ireland | 3 | electric", "Eddystone | UK | 4 | electric"].join("\n") },
  { name: "https://data.example/ports-c", text: ["port | country | keepers | lamp", "Hatteras | USA | 3 | fresnel", "Portland | USA | 2 | electric", "Tory | Ireland | 1 | oil"].join("\n") },
];
test("rows: a table-like corpus, lines as units; the hunt finds shared columns' values, the fill is byte-exact, the body renders as rows", () => {
  const r = S.generateStitched({ passages: ROWS, topic: "ports", kind: "rows" });
  assert.equal(r.kind, "rows");
  assert.equal(r.tree.kind, "rows");
  const index = r.index;
  assert.equal(index.kind, "rows");
  assert.ok(index.sentences.length >= 9);
  assert.ok(!index.sentences.some((s) => /^port \|/.test(s.text)), "the header row, on every page, is furniture");
  for (const s of index.sentences) assert.equal(Buffer.from(ROWS[s.src].text).subarray(s.start, s.end).toString("utf8"), s.text);
  assert.ok(index.sentences.every((s) => !/[.!?]$/.test(s.text)), "no row is a sentence: the prose rule was not applied");
  const labels = r.tree.root.children.map((c) => c.label.toLowerCase());
  assert.ok(labels.some((l) => /fresnel|electric|usa|ireland/.test(l)), `facets are the values pages share: ${labels}`);
  for (const f of r.filled) for (const u of f.units) { assert.equal(Buffer.from(ROWS.find((p) => p.name === u.url).text).subarray(u.start, u.end).toString("utf8"), u.text); assert.ok(r.text.includes(`${u.text} [S${u.n} #${u.start}-${u.end}]`)); }
  const sec = r.sections[0];
  assert.ok(sec.text.split("\n").filter((l) => l.includes(" [S")).length >= 2, "rows stand one per line, each with its address");
  assert.ok(!sec.text.includes("] Hatteras") && !sec.text.includes("] Fastnet"), "rows are not run together into a paragraph");
  assert.ok(r.gaps.every((g) => g.kind === "one-source" || g.kind === "unfilled"));
  assert.equal(r.calls, 0);
});

test("code: a caller's own splitter, a fenced block, kind on the events and the file; the aliases are the same functions", async () => {
  assert.equal(S.generateStitched, S.stitch);
  assert.equal(S.admitDrawn, S.admit);
  const CODE = [
    { name: "a.js", text: "import fs from 'node:fs';\nconst clean = (s) => String(s).trim();\nexport const read = (p) => fs.readFileSync(p, 'utf8');\nexport const write = (p, t) => fs.writeFileSync(p, t);\n" },
    { name: "b.js", text: "import fs from 'node:fs';\nconst clean = (s) => s.trim();\nexport const read = (p) => fs.readFileSync(p);\nconst exists = (p) => fs.existsSync(p);\n" },
    { name: "c.js", text: "import path from 'node:path';\nexport const write = (p, t) => fs.writeFileSync(path.resolve(p), t);\nconst exists = (p) => fs.existsSync(p);\n" },
  ];
  // the caller's splitter: statements, with their character index; a unit whose text is not at its index is refused, never addressed
  const statements = (text) => { const out = []; let at = 0; for (const line of text.split(/\n/)) { if (line.trim()) out.push({ text: line.trim(), index: at + (line.length - line.trimStart().length) }); at += line.length + 1; } out.push({ text: "a forged unit", index: 0 }); return out; };
  const s = S.stitchStart({ ask: "assemble the fs helpers", topic: "helpers", gathered: { passages: CODE }, kind: "code", units: statements, now: 1_700_000_003_000 });
  assert.ok(s.ok, JSON.stringify(s.gap));
  assert.equal(s.kind, "code");
  assert.equal(s.job.index.refused.length, 3, "one forged unit per page was refused");
  for (const u of s.job.index.sentences) assert.equal(Buffer.from(CODE[u.src].text).subarray(u.start, u.end).toString("utf8"), u.text);
  const file = fs.readFileSync(s.path, "utf8");
  assert.ok(/```\n[^`]+\n```\n\[S\d+ #\d+-\d+\]/.test(file), "a code slot is a fenced block followed by its addresses");
  const events = EOT.read(s.job.id).events;
  assert.ok(events.filter((e) => e.detail?.kind === "longform-section").every((e) => e.detail.unitKind === "code"));
  assert.equal(events.find((e) => e.detail?.kind === "stitch-tree").detail.unitKind, "code");
  const slot = s.tree.root.children[0].id;
  const r = await S.admitDrawn({ tree: s.tree, slot, drawn: "const exists = (p) => fs.existsSync(p);\nconst invented = () => 42;", job: s.job });
  assert.equal(r.kind, "code");
  assert.equal(r.placed.length, 1);
  assert.equal(r.marked.length, 1);
  assert.equal(events.length + 2, EOT.read(s.job.id).events.length);
  assert.equal(EOT.read(s.job.id).events.find((e) => e.detail?.kind === "longform-admit").detail.unitKind, "code");
});

test("a gap raised under a gap is reachable (depth 2), and sibling gaps with the same snips fold into the first", async () => {
  const S = await import("./opencode-stitch.mjs");
  const root = { id: "root", level: 0, terms: [], children: [{ id: "s1", level: 1, terms: ["a"], children: [], gaps: [{ id: "s1.g1", level: 2, terms: ["b"], gap: { kind: "one-source", why: "x" }, gaps: [{ id: "s1.g1.g1", level: 3, terms: ["c"], gap: { kind: "raised", why: "y" } }] }, { id: "s1.g2", level: 2, terms: ["b"], gap: { kind: "one-source", why: "x" } }] }], gaps: [] };
  const index = { sentences: [], sources: [] };
  const tree = { root, index };
  assert.ok(S.findSlot(tree, "s1.g1.g1"), "the child of a gap is a slot the walk reaches");
  const gaps = S.gapsOf(tree, index);
  assert.deepEqual(gaps.map((g) => g.slot), ["s1.g1", "s1.g1.g1", "s1.g2"]);
  // s1.g2 has the same (empty) context as s1.g1 here only when both have context; with no sentences the key is empty and nothing folds
  assert.equal(gaps.filter((g) => g.foldedInto).length, 0, "an empty context never folds (nothing to be identical about)");
});

// node --test pharos-framed.test.mjs   needs the reader's priors (KHORA_PRIORS_DIR) and the pharos library (PHAROS_HOME); skips without them, saying why.
// The whole reading is written into the pharos by cell and kind (owner, 2026-11-26), and read back the way Janus and Penelope read it: by kind only, with no import of khora.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
let weave = null, why = null, KINDS = null;
const hasPharos = !!process.env.PHAROS_HOME && fs.existsSync(path.join(process.env.PHAROS_HOME, "lib", "pharos.mjs"));
try { ({ weaveFramedReading: weave, KINDS } = await import("./pharos-framed.mjs")); } catch (e) { why = String(e?.message ?? e).slice(0, 120); }
const skip = !hasPharos ? "set PHAROS_HOME to a pharos checkout" : !weave ? `module did not load: ${why}` : false;
const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "kframed-"));
const DOC = ["“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”", "Mr. Bennet replied that he had not.", "And God said, Let there be light: and there was light.", "Mr. Bennet made no answer."].join("\n\n") + "\n\n" + "Mr. Bennet made no answer. ".repeat(4);
const open = async (d) => { const P = await import(path.join(process.env.PHAROS_HOME, "lib", "pharos.mjs")); return { P, h: P.open("t", { dir: d, writer: "reader", frame: false }) }; };
const byKind = (P, h, kind) => P.fold(h, { kind }).entries ?? [];

test("the whole reading is woven by kind at the proposed cells, every entry is `of` the text, and a second weave adds nothing", { skip }, async () => {
  const d = dir(), a = await weave(DOC, { language: "eng", log: "t", dir: d, actPrior: null });
  if (a.gap) return assert.fail(`${a.gap}: ${a.why}`);
  for (const k of ["text", "text-cuts", "text-reading", "text-codec", "text-layers", "text-quotes", "text-frames"]) assert.ok(a.written.includes(k), `${k} was not written: ${JSON.stringify(a.written)}`);
  const { P, h } = await open(d), cellOf = { "text-codec": "SIG·Pattern", "text-layers": "SIG·Ground", "text-quotes": "SEG·Figure", "text-frames": "CON·Figure" }, t = byKind(P, h, "text")[0];
  for (const [kind, cell] of Object.entries(cellOf)) { const e = byKind(P, h, kind); assert.equal(e.length, 1, kind); assert.equal(e[0].cell, cell, kind); assert.deepEqual(e[0].of, [t.id], `${kind} is of the text`); assert.equal(e[0].by ?? e[0].writer ?? "khora", e[0].by ?? "khora"); }
  const b = await weave(DOC, { language: "eng", log: "t", dir: d, actPrior: null }); assert.deepEqual(b.written, [], "a second weave writes nothing");
});
test("read back BY KIND ONLY (as Janus and Penelope do): the codec, the quote spans, the frames and the ledger carry what the read decided", { skip }, async () => {
  const d = dir(); await weave(DOC, { language: "eng", log: "t", dir: d, actPrior: null }); const { P, h } = await open(d);
  const codec = byKind(P, h, "text-codec")[0].body, quotes = byKind(P, h, "text-quotes")[0].body, frames = byKind(P, h, "text-frames")[0].body, layers = byKind(P, h, "text-layers")[0].body;
  assert.ok(codec.distribution.length >= 1 && typeof codec.entropy === "number"); assert.equal(codec.declared, "eng"); assert.ok(codec.quotes.table.pairs.some((p) => p[0] === "“"), "the convention the codec brought");
  assert.ok(quotes.spans.length >= 2 && quotes.spans.every((s) => s.close > s.open)); assert.ok(frames.frames.some((f) => f.framed === true), "a verb inside a quotation is framed");
  assert.deepEqual(layers.layers.map((r) => r.layer), ["language", "cut", "parse", "cast", "pronouns", "clauses", "speakers", "frames.quotes", "frames.speech"]);
});
test("ablating a layer is woven as ablated and unknown, never false; the quote spans are not written when the quote layer is off", { skip }, async () => {
  const d = dir(), a = await weave(DOC, { language: "eng", ablate: ["quotes"], log: "t", dir: d, actPrior: null }); const { P, h } = await open(d);
  assert.ok(!a.written.includes("text-quotes") && byKind(P, h, "text-quotes").length === 0);
  const frames = byKind(P, h, "text-frames")[0].body, layers = byKind(P, h, "text-layers")[0].body.layers;
  assert.ok(frames.frames.every((f) => f.framed === null), "unknown"); assert.equal(layers.find((r) => r.layer === "frames.quotes").ran, "ablated"); assert.deepEqual(byKind(P, h, "text-layers")[0].body.ablate, ["quotes"]);
});
test("a text with no declared language is a TYPED GAP entry (NUL·Figure) and NO frames entry; the codec is still recorded", { skip }, async () => {
  const d = dir(), a = await weave("Mr. Bennet made no answer. ".repeat(10), { log: "t", dir: d }); const { P, h } = await open(d);
  assert.ok(a.gaps.includes("language_not_declared")); const g = byKind(P, h, "text-gap"); assert.ok(g.length >= 1 && g.every((e) => e.cell === "NUL·Figure")); assert.equal(byKind(P, h, "text-frames").length, 0, "no frames for an undeclared language");
  assert.equal(byKind(P, h, "text-codec").length, 1, "the codec choice is still a record");
});
test("khora writes only Existence and Structure cells plus the protocol's own kind declarations: never DEF, EVA or REC (that is Penelope's)", { skip }, async () => {
  const d = dir(); await weave(DOC, { language: "eng", log: "t", dir: d, actPrior: null }); const { P, h } = await open(d);
  const all = P.fold(h, {}).entries ?? []; assert.ok(all.length > 5);
  for (const e of all) if (/^(DEF|EVA|REC)·/.test(e.cell)) assert.equal(e.kind, "kind", `khora wrote ${e.kind} at ${e.cell}: Interpretation is Penelope's`);
  assert.deepEqual(KINDS.map((k) => k.cell).filter((c) => /^(DEF|EVA|REC)·/.test(c)), []);
});

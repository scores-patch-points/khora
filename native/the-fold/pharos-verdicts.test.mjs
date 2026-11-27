// node --test pharos-verdicts.test.mjs   needs PHAROS_HOME, KHORA_PRIORS_DIR (and ACT_PRIOR for the speech layer). A SYNTHETIC second writer plays Penelope: the test proves khora reads verdicts by cell and kind, not who Penelope is.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { pathToFileURL } from "node:url";
const hasPharos = !!process.env.PHAROS_HOME && fs.existsSync(path.join(process.env.PHAROS_HOME, "lib", "pharos.mjs"));
let weaveFramedReading = null, readVerdicts = null, why = null;
try { ({ weaveFramedReading } = await import("./pharos-framed.mjs")); ({ readVerdicts } = await import("./pharos-verdicts.mjs")); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const skip = !hasPharos ? "set PHAROS_HOME to a pharos checkout" : !readVerdicts ? `did not load: ${why}` : false;
const DOC = ["“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”", "Mr. Bennet replied that he had not.", "And God said, Let there be light: and there was light.", "Mr. Bennet made no answer."].join("\n\n") + "\n\n" + "Mr. Bennet made no answer. ".repeat(4);
const sha16 = (await import("./pharos-reading.mjs")).sha16;
async function setup({ frameCell = "EVA·Figure" } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "kverd-")); await weaveFramedReading(DOC, { language: "eng", log: "t", dir: d });
  const P = await import(pathToFileURL(path.join(process.env.PHAROS_HOME, "lib", "pharos.mjs")).href), pen = P.open("t", { dir: d, writer: "someone-else", frame: false });   // the verdict writer: any writer; khora does not look at who
  for (const [k, cell] of [["frame-verdict", frameCell], ["quote-verdict", "DEF·Figure"]]) P.weave(pen, { cell: "DEF·Figure", kind: "kind", addr: `kind:${k}`, body: { name: k, cell, why: "a verdict on a khora nomination" } });
  const sha = sha16(DOC), id = (kind, addr) => (P.fold(pen, { kind, addr }).entries ?? []).at(-1).id; return { d, P, pen, sha, fid: id("text-frames", `frames:${sha}`), qid: id("text-quotes", `quotes:${sha}`) };
}
test("with no verdict the effective value IS the nomination, and says so", { skip }, async () => {
  const { d } = await setup(), r = await readVerdicts(DOC, { log: "t", dir: d }); assert.ok(r.frames.length > 0); for (const f of r.frames) { assert.equal(f.effective.source, "nomination"); assert.equal(f.effective.reported, f.reported ?? null); assert.equal(f.judged, null); } assert.deepEqual(r.gaps, []);
});
test("a verdict at an Interpretation cell overrides the nomination for that frame only, and the nomination itself is untouched", { skip }, async () => {
  const { d, P, pen, sha, fid } = await setup(), before = await readVerdicts(DOC, { log: "t", dir: d }), i = before.frames.findIndex((f) => f.reported === true); assert.ok(i >= 0, "a reported frame to judge");
  const v = P.weave(pen, { cell: "EVA·Figure", kind: "frame-verdict", addr: `frames:${sha}#${i}`, body: { index: i, reported: false }, of: [fid] }); const r = await readVerdicts(DOC, { log: "t", dir: d });
  assert.equal(r.frames[i].effective.reported, false); assert.equal(r.frames[i].effective.source, "verdict"); assert.equal(r.frames[i].reported, true, "the nomination is not edited"); assert.deepEqual(r.frames[i].judged, { id: v.id, cell: "EVA·Figure" });
  r.frames.forEach((f, j) => { if (j !== i) assert.equal(f.effective.source, "nomination", `frame ${j} is untouched`); });
});
test("a newer verdict at the same address REVISES the older; a retraction puts the nomination back", { skip }, async () => {
  const { d, P, pen, sha, fid } = await setup(), i = (await readVerdicts(DOC, { log: "t", dir: d })).frames.findIndex((f) => f.reported === true);
  P.weave(pen, { cell: "EVA·Figure", kind: "frame-verdict", addr: `frames:${sha}#${i}`, body: { index: i, reported: false }, of: [fid] });
  await new Promise((r) => setTimeout(r, 15));   // pharos orders entries by their timestamp: two verdicts in one millisecond have no defined order, which is pharos's rule, not khora's
  const rev = P.weave(pen, { cell: "EVA·Figure", kind: "frame-verdict", addr: `frames:${sha}#${i}`, body: { index: i, reported: true }, of: [fid] }); let r = await readVerdicts(DOC, { log: "t", dir: d });
  assert.equal(r.frames[i].effective.reported, true); assert.equal(r.frames[i].judged.id, rev.id); assert.equal(r.frames[i].judged.cell, "EVA·Figure");
  await new Promise((r) => setTimeout(r, 15)); P.weave(pen, { cell: "NUL·Figure", kind: "retract", addr: `retract:${rev.id}`, body: {}, of: [rev.id] }); r = await readVerdicts(DOC, { log: "t", dir: d });
  assert.notEqual(r.frames[i].judged?.id, rev.id, "a retracted verdict stops counting");
});
test("a verdict kind declared OUTSIDE Interpretation is NOT applied (a verdict is a definition or a judgement), and one about a superseded nomination is NOT applied: both are typed gaps", { skip }, async () => {
  const { d, P, pen, sha, fid } = await setup({ frameCell: "INS·Figure" }); P.weave(pen, { cell: "INS·Figure", kind: "frame-verdict", addr: `frames:${sha}#0`, body: { index: 0, reported: true }, of: [fid] });
  const r = await readVerdicts(DOC, { log: "t", dir: d }); assert.deepEqual(r.gaps.map((g) => g.gap), ["verdict_not_interpretation"]); assert.ok(r.frames.every((f) => f.effective.source === "nomination"));
  const e = await setup(); P.weave(e.pen, { cell: "EVA·Figure", kind: "frame-verdict", addr: `frames:${e.sha}#1`, body: { index: 1, reported: true }, of: [(P.fold(e.pen, { kind: "text" }).entries ?? [])[0].id] }); const r2 = await readVerdicts(DOC, { log: "t", dir: e.d });
  assert.deepEqual(r2.gaps.map((g) => g.gap), ["verdict_of_other_entry"]); assert.ok(r2.frames.every((f) => f.effective.source === "nomination"));
});
test("a quote verdict says a span is, or is not, a quotation; with none it is unknown (null), never false", { skip }, async () => {
  const { d, P, pen, sha, qid } = await setup(); let r = await readVerdicts(DOC, { log: "t", dir: d }); assert.ok(r.quotes.length >= 2); assert.ok(r.quotes.every((q) => q.quotation === null));
  P.weave(pen, { cell: "DEF·Figure", kind: "quote-verdict", addr: `quotes:${sha}#0`, body: { index: 0, quotation: false }, of: [qid] }); r = await readVerdicts(DOC, { log: "t", dir: d }); assert.equal(r.quotes[0].quotation, false); assert.equal(r.quotes[1].quotation, null);
});

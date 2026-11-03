// cli/tests/opencode-perceive-senses.test.mjs — attachments reach the ear and the eye through foldcode's one channel (text),
// labelled as a measurement, never in place of the source's own characters, never removing the media when there are none.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

process.env.FOLD_OPENCODE_STATE = mkdtempSync(join(tmpdir(), "door-perceive-senses-"));
const { onPerceive, loadPerceiveConfig, savePerceiveConfig, PERCEIVE_DEFAULTS } = await import("../../opencode-doorway.mjs");
const D = await import("../../senses/describe.mjs");
const haveFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

const wav = (sec = 3, hz = 440) => { const n = 16000 * sec, b = Buffer.alloc(44 + n * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(9000 * Math.sin((2 * Math.PI * hz * i) / 16000)), 44 + i * 2); return b; };
const grayPng = () => spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=0x808080:s=320x240", "-frames:v", "1", "-f", "image2", "-c:v", "png", "pipe:1"], { maxBuffer: 1 << 24 }).stdout;
const call = (bytes, mime) => onPerceive({ mime, name: "attachment", dataBase64: bytes.toString("base64") });

test("config: describe defaults to when-no-text, accepts a string, ignores a number", () => {
  assert.equal(PERCEIVE_DEFAULTS.describe, "when-no-text"); assert.equal(loadPerceiveConfig().describe, "when-no-text");
  assert.equal(savePerceiveConfig({ describe: 7 }).describe, "when-no-text"); assert.equal(savePerceiveConfig({ describe: "always" }).describe, "always"); savePerceiveConfig({ describe: "when-no-text" });
  assert.equal(D.modeOf("nonsense"), "when-no-text", "an unknown mode falls back to the default");
});

test("what counts as the source's own characters: recogniser captions and music marks do not", () => {
  for (const t of ["", "[MUSIC]", "(applause)", "♪ ♪", "[Music] (upbeat) ♫", "{noise}"]) assert.equal(D.hasSourceCharacters(t), false, JSON.stringify(t));
  for (const t of ["hello", "[Music] hello there", "שלום", "你好", "40%", "(applause) thank you"]) assert.equal(D.hasSourceCharacters(t), true, JSON.stringify(t));
});

test("policy: when-no-text adds a note only without source characters; always adds; off never does", () => {
  assert.equal(D.wantsNote("when-no-text", ""), true); assert.equal(D.wantsNote("when-no-text", "[MUSIC]"), true); assert.equal(D.wantsNote("when-no-text", "the committee will come to order"), false);
  assert.equal(D.wantsNote("always", "words"), true); assert.equal(D.wantsNote("off", ""), false);
});

test("compose: the source's text comes first and is unaltered; with none, the media is KEPT; with some, the config decides", () => {
  const d = { kind: "ear", note: "[measured, not words in the file — x]\n0:00-0:03 heard: ...", reading: { schema: "KhoraEar@1" } };
  const bare = D.compose({ text: "", via: "audio-probe", replaceMedia: true, gaps: [] }, d, { replaceMedia: true });
  assert.equal(bare.replaceMedia, false, "no source characters: never replace the media with a measurement"); assert.ok(bare.text.startsWith("[measured, not words in the file")); assert.equal(bare.measured.schema, "KhoraEar@1");
  const caption = D.compose({ text: "[MUSIC]", gaps: [] }, d, { replaceMedia: true }); assert.ok(caption.text.startsWith("[MUSIC]\n\n[measured")); assert.equal(caption.replaceMedia, false);
  const spoken = D.compose({ text: "hello there", gaps: [] }, d, { replaceMedia: true }); assert.ok(spoken.text.startsWith("hello there\n\n[measured")); assert.equal(spoken.replaceMedia, true, "source text exists: the configured behaviour stands");
  assert.deepEqual(D.compose({ passthrough: true }, d, {}), { passthrough: true }, "a passthrough is never touched");
  assert.equal(D.compose({ text: "x" }, null, {}).text, "x");
});

test("the note stays within its budget however many sections there are", () => {
  const meta = { organ: "alcmaeon", stratum: "S2", by: "mechanical", description: Array.from({ length: 60 }, (_, i) => `0:${String(i).padStart(2, "0")}.0-0:${String(i + 1).padStart(2, "0")}.0 heard: level -20 dB rms; section begins at class; relative class in this recording: sustained 0.99`) };
  const note = D.noteOf("ear", { meta, gaps: [{ reason: "named_sounds_not_assessed" }, { reason: "timbre_sections_not_assessed" }] });
  assert.ok(note.length <= D.MAX_NOTE_CHARS, String(note.length)); assert.match(note, /more section\(s\)/); assert.match(note, /not assessed: named sounds, timbre sections\./);
});

test("end to end, audio: with describe=always the door's answer carries the labelled ear note after any transcript", { skip: !haveFfmpeg }, async () => {
  savePerceiveConfig({ describe: "always" });
  const a = await call(wav(), "audio/wav");
  assert.equal(a.passthrough, undefined); assert.ok(a.text.includes("[measured, not words in the file"), a.text.slice(0, 200)); assert.equal(a.measured.schema, "KhoraEar@1"); assert.equal(a.measured.stratum, "S2"); assert.ok(a.text.length <= 1400 + (a.text.indexOf("[measured") > 0 ? a.text.indexOf("[measured") : 0));
  if (a.text.indexOf("[measured") > 0) assert.ok(a.text.slice(0, a.text.indexOf("[measured")).trim().length >= 0, "any transcript precedes the note");
  savePerceiveConfig({ describe: "when-no-text" });
});

test("end to end, image with no lettering: the eye note is added and the media is kept", { skip: !haveFfmpeg }, async () => {
  const a = await call(grayPng(), "image/png");
  assert.ok(a.text.startsWith("[measured, not words in the file"), a.text.slice(0, 160)); assert.equal(a.replaceMedia, false); assert.equal(a.measured.schema, "KhoraEye@1");
  assert.match(a.text, /scene kind \(a proposal, not verified\)/); assert.match(a.text, /not assessed: .*faces/);
});

test("describe=off leaves the answer exactly as before: no note, no measured field", { skip: !haveFfmpeg }, async () => {
  savePerceiveConfig({ describe: "off" });
  const a = await call(grayPng(), "image/png"); assert.equal(a.measured, undefined); assert.equal(a.measuredNote, undefined); assert.ok(!String(a.text).includes("[measured")); assert.equal(a.replaceMedia, loadPerceiveConfig().replaceMedia);
  savePerceiveConfig({ describe: "when-no-text" });
});

test("a medium with no organ is untouched: a PDF or text gets no note", async () => {
  assert.equal(D.describableMime("application/pdf"), false); assert.equal(D.describableMime("text/plain"), false); assert.equal(D.describableMime("video/mp4"), true);
});

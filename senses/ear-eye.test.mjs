// senses/ear-eye.test.mjs — the ear (Alcmaeon) and the eye (Alhazen) as organs of the sense-swarm.
// Needs ffmpeg for the decode; the tests that need it skip without it, the rest do not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const STATE = mkdtempSync(join(tmpdir(), "senses-ear-eye-"));
const { huntOrgans, organsFor, perceiveMany, deltaOf } = await import("./registry.mjs");
const { earOrgan } = await import("./organs/ear.mjs");
const { eyeOrgan } = await import("./organs/eye.mjs");
const haveFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

// 3 s of a 440 Hz tone, 16-bit mono WAV, built in memory
const wav = (sec = 3, hz = 440) => { const n = 16000 * sec, b = Buffer.alloc(44 + n * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(9000 * Math.sin((2 * Math.PI * hz * i) / 16000)), 44 + i * 2); return b; };
const png = () => spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=320x240:d=1", "-frames:v", "1", "-f", "image2", "-c:v", "png", "pipe:1"], { maxBuffer: 1 << 24 }).stdout;

test("the hunt finds the ear and the eye where ffmpeg is present, and says nothing is assumed", { skip: !haveFfmpeg }, () => {
  const h = huntOrgans({ stateDir: STATE }), ids = h.found.map((o) => o.id);
  for (const id of ["alcmaeon", "alcmaeon-soundtrack", "alhazen"]) assert.ok(ids.includes(id), `${id} not hunted`);
  assert.ok(h.found.find((o) => o.id === "alcmaeon").kind === "ear" && h.found.find((o) => o.id === "alhazen").kind === "eye");
  assert.ok(organsFor("video/mp4").some((o) => o.id === "alcmaeon-soundtrack"), "video now has an organ: its soundtrack");
  assert.ok(organsFor("image/png").some((o) => o.id === "alhazen") && organsFor("audio/wav").some((o) => o.id === "alcmaeon"));
});

test("the ear returns NO text, a stamped S2 mechanical reading in meta, and says what it could not do", { skip: !haveFfmpeg }, async () => {
  const r = await earOrgan(wav(), { name: "tone.wav" });
  assert.equal(r.text, ""); assert.equal(r.chars, 0); assert.equal(r.meta.schema, "KhoraEar@1"); assert.equal(r.meta.stratum, "S2"); assert.equal(r.meta.by, "mechanical");
  assert.ok(Math.abs(r.meta.duration - 3) < 0.05); assert.ok(r.meta.sections.length >= 1); assert.match(r.meta.note, /not words the file contained/);
  assert.ok(r.gaps.some((g) => /named_sounds/.test(g.reason)), "no named sounds without a model organ");
  assert.ok(r.gaps.some((g) => /timbre_sections/.test(g.reason)), "khora's engine carries no surf, so timbre edges are skipped and said so");
  assert.match(r.meta.sectionsFrom, /no surf/);
});

test("the ear is deterministic and a recording with no audio is a typed gap, not a number", { skip: !haveFfmpeg }, async () => {
  assert.deepEqual((await earOrgan(wav(), {})).meta.description, (await earOrgan(wav(), {})).meta.description);
  const none = await earOrgan(Buffer.from("not audio at all"), {}); assert.equal(none.text, ""); assert.ok(none.gaps.some((g) => g.reason === "ear_nothing_heard"), JSON.stringify(none.gaps));
});

test("the eye returns NO text, measured structure in meta, the scene kind as a proposal, and faces as a gap (never zero)", { skip: !haveFfmpeg }, async () => {
  const r = await eyeOrgan(png(), { name: "card.png" });
  assert.equal(r.text, ""); assert.equal(r.meta.schema, "KhoraEye@1"); assert.equal(r.meta.stratum, "S2"); assert.equal(r.meta.by, "mechanical");
  assert.equal(r.meta.sceneKind.status, "proposal"); assert.ok(r.meta.width === 480 && r.meta.height > 0); assert.ok("faces" in r.meta === false, "no face count is invented");
  assert.ok(r.gaps.some((g) => g.reason === "faces_not_assessed"));
  const bad = await eyeOrgan(Buffer.from("not an image"), {}); assert.ok(bad.gaps.some((g) => g.reason === "eye_nothing_seen"));
});

test("NON-INTERFERENCE: descriptive organs never enter the delta and are never the representative ground", () => {
  const whisper = { organ: "whisper", kind: "asr", text: "the committee will now come to order", gaps: [] };
  const ear = { organ: "alcmaeon", kind: "ear", text: "", meta: { description: ["0:00.0-0:03.0 heard: level -20 dB rms ..."] }, gaps: [] };
  const eye = { organ: "alhazen", kind: "eye", text: "", meta: { textLines: 3 }, gaps: [] };
  const alone = deltaOf([whisper]), withSenses = deltaOf([whisper, ear, eye]);
  assert.deepEqual(withSenses, alone, "adding an ear and an eye must not change the delta at all");
  const two = deltaOf([whisper, { organ: "mlx", kind: "asr", text: "the committee will now come to order please", gaps: [] }, ear, eye]);
  assert.equal(two.organs, 2, "only text readings are compared");
});

test("through the whole swarm: whisper-less audio still yields an ear reading, and the swarm's text stays empty", { skip: !haveFfmpeg }, async () => {
  const s = await perceiveMany(wav(), { mime: "audio/wav", name: "tone.wav", stateDir: STATE });
  const ear = s.readings.find((r) => r.organ === "alcmaeon"); assert.ok(ear, "the ear read it"); assert.equal(ear.text, ""); assert.ok(ear.meta?.sections);
  assert.ok(!(s.via === "alcmaeon"), "an ear is never the representative ground");
  const withText = s.readings.filter((r) => r.text.trim()); assert.ok(withText.every((r) => r.kind === "asr"), "only transcribers contribute text");
});

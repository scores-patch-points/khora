// cli/tests/opencode-perceive.test.mjs — the door's perceive event and its
// local-first routing: bytes in, the source's own text plus provenance out,
// never a model call. Typed gaps, never silent numbers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

process.env.FOLD_OPENCODE_STATE = mkdtempSync(join(tmpdir(), "door-perceive-"));

const { answer, loadPerceiveConfig, savePerceiveConfig, PERCEIVE_DEFAULTS } = await import("../../opencode-doorway.mjs");
const { perceiveMedia, describeGray } = await import("../../khora/perceive/local.mjs");

const b64 = (s) => Buffer.from(s, "utf8").toString("base64");

test("perceive config defaults to local-first backends", () => {
  const cfg = loadPerceiveConfig();
  assert.equal(cfg.vision, "khora-local");
  assert.equal(cfg.transcription, "local");
  assert.equal(cfg.pdf, "layer-then-ocr");
  assert.equal(typeof cfg.ocrLang, "string");
});

test("perceive config round-trips a patch and rejects unknown keys", () => {
  const next = savePerceiveConfig({ vision: "frontier", bogus: 1 });
  assert.equal(next.vision, "frontier");
  assert.ok(!("bogus" in next));
  assert.deepEqual(Object.keys(next).sort(), Object.keys(PERCEIVE_DEFAULTS).sort());
  savePerceiveConfig({ vision: "khora-local" }); // restore the default for later tests
});

test("text bytes pass through as the source's own characters", async () => {
  const out = await answer({ event: "perceive", mime: "text/plain", name: "notes.txt", dataBase64: b64("dedication matters") });
  assert.equal(out.text, "dedication matters");
  assert.equal(out.via, "utf8-passthrough");
  assert.deepEqual(out.gaps, []);
});

test("image bytes yield CV descriptors, never generated prose", async () => {
  const dir = mkdtempSync(join(tmpdir(), "door-perceive-img-"));
  const png = join(dir, "frame.png");
  const made = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc=size=64x64:rate=1:duration=1", "-vframes", "1", png]);
  assert.equal(made.status, 0);
  const { readFileSync, rmSync } = await import("node:fs");
  const bytes = readFileSync(png);
  rmSync(dir, { recursive: true, force: true });
  const out = await perceiveMedia(bytes, { mime: "image/png", name: "frame.png" });
  assert.ok(out.cv && typeof out.cv.mean === "number" && typeof out.cv.edgeDensity === "number");
  assert.equal(out.cv.scanlines.length, 64);
  assert.ok(Array.isArray(out.gaps));
});

test("describeGray is arrangement-sensitive: a gradient is not flat noise", () => {
  const w = 8, h = 8;
  const flat = { buf: Buffer.alloc(w * h, 128), w, h };
  const grad = { buf: Buffer.from(Array.from({ length: w * h }, (_, i) => i * 4)), w, h };
  assert.equal(describeGray(flat).edgeDensity, 0);
  assert.ok(describeGray(grad).edgeDensity > 0);
});

test("unsupported media is a typed gap, refused by silence", async () => {
  const out = await answer({ event: "perceive", mime: "video/mp4", name: "clip.mp4", dataBase64: b64("not really video") });
  assert.equal(out.passthrough, undefined); // the door still answers what it derived…
  assert.ok((out.gaps ?? []).some((g) => g.reason === "unsupported_media"));
  assert.equal(out.text, "");
});

test("vision=frontier passes images straight through", async () => {
  savePerceiveConfig({ vision: "frontier" });
  const out = await answer({ event: "perceive", mime: "image/png", name: "x.png", dataBase64: b64("bytes") });
  assert.equal(out.passthrough, true);
  assert.equal(out.via, "frontier-direct");
  savePerceiveConfig({ vision: "khora-local" });
});

test("missing bytes fail open with a gap, never a throw", async () => {
  const out = await answer({ event: "perceive", mime: "image/png", name: "x.png" });
  assert.equal(out.passthrough, true);
  assert.equal(out.gap, "no_media_bytes");
});

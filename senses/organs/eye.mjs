// senses/organs/eye.mjs — the EYE organ: Alhazen over an image's bytes.
//
// Same contract as the ear: `text: ""`, the reading in `meta`. Alhazen MEASURES (luminance, palette, ink share, regions, text
// bands, polarity); it does not read letters (tesseract and the macOS Vision organ do), and its `sceneKind` is "a proposal, not
// a fact" in its own words, so it is carried as one. Faces are not assessed: Alhazen's skin-tone prior is off by default and
// this organ does not turn it on, so a face count is a typed gap, never a zero.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Alhazen = require("../vendor/alhazen.cjs");
export const EYE_VERSION = "khora-eye@0.1+alhazen";
const WIDTH = 480;

const decodeRgba = (bytes) => new Promise((resolve) => {
  const p = spawn("ffmpeg", ["-v", "error", "-i", "pipe:0", "-vf", `scale=${WIDTH}:-2`, "-frames:v", "1", "-pix_fmt", "rgba", "-f", "rawvideo", "pipe:1"]);
  const out = []; let err = "";
  p.stdout.on("data", (c) => out.push(c)); p.stderr.on("data", (d) => { err += d; });
  p.on("error", () => resolve({ code: -1 })); p.on("close", (code) => resolve({ code, buf: Buffer.concat(out), err })); p.stdin.on("error", () => {}); p.stdin.end(bytes);
});

export async function eyeOrgan(bytes, { name = "material" } = {}) {
  const d = await decodeRgba(bytes);
  if (d.code === -1) return { text: "", via: "alhazen", gaps: [{ reason: "eye_decode_unavailable", detail: "ffmpeg not installed: nothing was seen" }] };
  if (d.code !== 0 || !d.buf.length || d.buf.length % (4 * WIDTH)) return { text: "", via: "alhazen", gaps: [{ reason: "eye_nothing_seen", detail: String(d.err).slice(0, 200) || "ffmpeg decoded no picture" }] };
  const h = d.buf.length / 4 / WIDTH, px = new Uint8ClampedArray(d.buf.buffer, d.buf.byteOffset, d.buf.length), r = Alhazen.readImage(px, WIDTH, h, {});
  const meta = {
    schema: "KhoraEye@1", organ: "alhazen", version: EYE_VERSION, stratum: "S2", by: "mechanical", standing: r.standing,
    width: WIDTH, height: h, luminance: r.luminance, saturation: r.saturation, background: r.background, polarity: r.polarity, inkShare: r.inkShare,
    palette: r.palette, regionCounts: r.regionCounts, textLines: r.textLines,
    sceneKind: { value: r.sceneKind, status: "proposal", by: "mechanical heuristic, not verified" },
    note: "measured from the pixels of " + name + "; it reads no letters and names no objects",
  };
  const gaps = (r.gaps || []).map((g) => ({ reason: String(g.kind || "gap"), detail: g.because || null }));
  gaps.push({ reason: "faces_not_assessed", detail: "Alhazen's skin-tone prior is off by default and is not enabled here; absence of a face count is not zero faces" });
  return { text: "", via: "alhazen", chars: 0, meta, gaps };
}

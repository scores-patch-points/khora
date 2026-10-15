// khora/perceive/local.mjs — LOCAL perception backends for the opencode doorway.
//
// Every backend here runs on the box: ffmpeg (CV descriptors), tesseract
// (OCR), poppler (PDF text layer + page rendering), whisper.cpp (audio
// transcription, when installed). No network, no frontier model, no GPU.
//
// Discipline: neutral observations only. These backends NOMINATE text the
// fold can admit (transcription, descriptors) — they never decide
// significance, identity, or meaning. A missing binary is a typed gap
// (`*_unavailable`), never a silent number and never a model fallback.
// Fold text is always the source's own characters (bytes, text layer, or
// transcription) — never generated prose.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const PERCEIVE_VERSION = "khora-perceive-local@0.1";
export const MAX_PDF_OCR_PAGES = 10;
export const SCAN_THRESHOLD_CHARS = 50;

const run = (cmd, args, { input = null } = {}) =>
  new Promise((resolve) => {
    const proc = spawn(cmd, args);
    let out = Buffer.alloc(0);
    let err = "";
    proc.stdout.on("data", (d) => { out = Buffer.concat([out, d]); });
    proc.stderr.on("data", (d) => { err += d; });
    proc.on("error", () => resolve({ code: -1, out: Buffer.alloc(0), err: "spawn failed" }));
    proc.on("close", (code) => resolve({ code, out, err }));
    if (input) { proc.stdin.write(input); proc.stdin.end(); }
  });

const available = (() => {
  const cache = new Map();
  return async (cmd, probeArgs) => {
    if (!cache.has(cmd)) {
      cache.set(cmd, run(cmd, probeArgs).then((r) => r.code !== -1));
    }
    return cache.get(cmd);
  };
})();

export const probeBackends = async () => ({
  ffmpeg: await available("ffmpeg", ["-version"]),
  tesseract: await available("tesseract", ["--version"]),
  pdftotext: await available("pdftotext", ["-v"]),
  pdftoppm: await available("pdftoppm", ["-h"]),
  whisper: (await available("whisper", ["--help"])) || (await available("whisper.cpp", ["-h"])),
});

// ── CV: ffmpeg → 64×64 gray → neutral descriptors ───────────────────────────
// Arrangement-sensitive (adjacency is what a permutation destroys), never
// semantic: means, spread, edge density. No objects, no scenes, no words.

export const decodeGrayStdin = async (bytes, { w = 64, h = 64 } = {}) => {
  const r = await run("ffmpeg", ["-v", "error", "-i", "pipe:0", "-vf", `scale=${w}:${h}`, "-pix_fmt", "gray", "-f", "rawvideo", "-vframes", "1", "pipe:1"], { input: bytes });
  if (r.code !== 0) throw new Error(`ffmpeg decode failed (${r.code}): ${String(r.err).slice(0, 200)}`);
  return { buf: r.out, w, h };
};

const round3 = (v) => Math.round(v * 1000) / 1000;

export const describeGray = ({ buf, w, h }) => {
  const n = w * h;
  let sum = 0, sumSq = 0, min = 255, max = 0, dark = 0, bright = 0;
  for (let i = 0; i < n; i++) {
    const v = buf[i];
    sum += v; sumSq += v * v;
    if (v < min) min = v;
    if (v > max) max = v;
    if (v < 64) dark++;
    if (v > 192) bright++;
  }
  const mean = sum / n;
  let edge = 0, edgeN = 0;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const v = buf[r * w + c];
      if (c + 1 < w) { edge += Math.abs(v - buf[r * w + c + 1]); edgeN++; }
      if (r + 1 < h) { edge += Math.abs(v - buf[(r + 1) * w + c]); edgeN++; }
    }
  }
  const scanlines = [];
  for (let r = 0; r < h; r++) {
    let s = 0;
    for (let c = 0; c < w; c++) s += buf[r * w + c];
    scanlines.push(round3(s / w));
  }
  return {
    width: w, height: h,
    mean: round3(mean), std: round3(Math.sqrt(Math.max(0, sumSq / n - mean * mean))),
    min, max,
    darkFraction: round3(dark / n), brightFraction: round3(bright / n),
    edgeDensity: round3(edge / edgeN / 255),
    scanlines,
  };
};

// ── OCR: tesseract over bytes ──────────────────────────────────────────────

export const ocrBytes = async (bytes, { lang = "eng", psm = 6 } = {}) => {
  if (!(await available("tesseract", ["--version"]))) {
    return { text: "", gap: "ocr_unavailable", detail: "tesseract not installed — no transcription attempted, no model called" };
  }
  const dir = mkdtempSync(join(tmpdir(), "khora-ocr-"));
  try {
    const img = join(dir, "src");
    writeFileSync(img, bytes);
    const r = await run("tesseract", [img, "stdout", "-l", lang, "--psm", String(psm)]);
    const text = r.out.toString("utf8").replace(/\f/g, "\n").trim();
    if (r.code !== 0) return { text: "", gap: "ocr_failed", detail: String(r.err).slice(0, 200) };
    if (!text) return { text: "", gap: "ocr_empty", detail: "tesseract returned no text — no letterforms found" };
    return { text, engine: "tesseract", lang, psm, chars: text.length };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// ── PDF: text layer first, page-render + OCR when scanned ────────────────────

export const pdfTextLayerBytes = async (bytes) => {
  if (!(await available("pdftotext", ["-v"]))) {
    return { text: "", gap: "pdf_unavailable", detail: "pdftotext not installed" };
  }
  const dir = mkdtempSync(join(tmpdir(), "khora-pdf-"));
  try {
    const pdf = join(dir, "src.pdf");
    writeFileSync(pdf, bytes);
    const r = await run("pdftotext", ["-layout", pdf, "-"]);
    return { text: r.out.toString("utf8").trim(), partial: r.code !== 0 };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

export const pdfOcrBytes = async (bytes, { lang = "eng", maxPages = MAX_PDF_OCR_PAGES } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "khora-pdfocr-"));
  try {
    const pdf = join(dir, "src.pdf");
    writeFileSync(pdf, bytes);
    const texts = [];
    const pages = [];
    for (let p = 1; p <= maxPages; p++) {
      const prefix = join(dir, `page-${p}`);
      const r = await run("pdftoppm", ["-png", "-r", "200", "-f", String(p), "-l", String(p), pdf, prefix]);
      if (r.code !== 0) { pages.push({ page: p, source: "render-failed", gap: "page_render_failed" }); continue; }
      const { readFileSync } = await import("node:fs");
      let img = null;
      try { img = readFileSync(`${prefix}-${p}.png`); } catch { /* zero-padded variant below */ }
      if (!img) {
        try { img = readFileSync(`${prefix}-0${p}.png`); } catch { /* truly missing */ }
      }
      if (!img) { pages.push({ page: p, source: "render-missing", gap: "page_render_failed" }); continue; }
      const ocr = await ocrBytes(img, { lang });
      // A page past the document's end renders nothing OCR-able: empty with
      // no error is the stop signal, not a gap.
      if (!ocr.text && (ocr.gap === "ocr_empty" || ocr.gap === "ocr_failed")) {
        if (p > 1 && texts.every((t) => !t)) break;
        pages.push({ page: p, source: "ocr-empty", gap: null, chars: 0 });
        continue;
      }
      texts.push(ocr.text);
      pages.push({ page: p, source: ocr.text ? "ocr" : "ocr-empty", gap: ocr.gap ?? null, chars: ocr.text.length });
    }
    const text = texts.filter(Boolean).join("\n\f\n").trim();
    return { text, pages, chars: text.length, ...(text ? {} : { gap: "ocr_empty", detail: "no page yielded text" }) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// ── Audio: whisper.cpp when present, probe metadata always ──────────────────

export const audioProbeBytes = async (bytes) => {
  if (!(await available("ffmpeg", ["-version"]))) {
    return { gap: "audio_probe_unavailable", detail: "ffmpeg not installed" };
  }
  const r = await run("ffmpeg", ["-v", "error", "-i", "pipe:0", "-f", "null", "-"], { input: bytes });
  const info = String(r.err).trim().slice(0, 500);
  return info ? { probe: info } : { gap: "audio_unreadable", detail: "ffmpeg could not read this audio" };
};

export const transcribeAudioBytes = async (bytes, { model = null } = {}) => {
  const whisperBin = (await available("whisper", ["--help"])) ? "whisper" : (await available("whisper.cpp", ["-h"])) ? "whisper.cpp" : null;
  if (!whisperBin) {
    return { text: "", gap: "transcription_unavailable", detail: "no local whisper binary (whisper / whisper.cpp) — no transcription attempted, no cloud model called" };
  }
  const dir = mkdtempSync(join(tmpdir(), "khora-stt-"));
  try {
    const src = join(dir, "src");
    writeFileSync(src, bytes);
    const args = model ? ["-m", model, "-f", src, "-otxt", "-of", join(dir, "out")] : ["-f", src, "-otxt", "-of", join(dir, "out")];
    const r = await run(whisperBin, args);
    const { readFileSync } = await import("node:fs");
    let text = "";
    try { text = readFileSync(join(dir, "out.txt"), "utf8").trim(); } catch { /* no output */ }
    if (!text) return { text: "", gap: "transcription_empty", detail: String(r.err).slice(0, 200) || "whisper returned no text" };
    return { text, engine: whisperBin, chars: text.length };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// ── Router: bytes + mime → the source's own text + provenance ───────────────
// kind routing mirrors the khora contract: text-family passes through,
// image gets CV + OCR, PDF gets layer-then-OCR, audio gets local STT or a
// gap. Video and provider-side refs are typed gaps — refused by silence,
// never derived, never sent to a cloud model from here.

export const perceiveMedia = async (bytes, { mime = "application/octet-stream", name = "attachment", lang = "eng" } = {}) => {
  const m = String(mime).toLowerCase();
  const base = { schema: "KhoraPerceive@1", perceiver: PERCEIVE_VERSION, name, mediaType: m, gaps: [], custody: { originalBytesPreserved: true } };

  if (m.startsWith("text/") || m === "application/json" || m.endsWith("+json")) {
    const text = bytes.toString("utf8");
    return { ...base, text, chars: text.length, via: "utf8-passthrough" };
  }
  if (m === "application/pdf") {
    const layer = await pdfTextLayerBytes(bytes);
    if (layer.gap) return { ...base, text: "", gaps: [{ reason: layer.gap, detail: layer.detail }] };
    if (layer.text.length >= SCAN_THRESHOLD_CHARS) {
      return { ...base, text: layer.text, chars: layer.text.length, via: layer.partial ? "text-layer-partial" : "text-layer" };
    }
    const ocr = await pdfOcrBytes(bytes, { lang });
    const gaps = ocr.gap ? [{ reason: ocr.gap, detail: ocr.detail ?? null }] : [];
    return { ...base, text: ocr.text ?? "", chars: (ocr.text ?? "").length, via: "pdf-ocr", pages: ocr.pages ?? [], gaps };
  }
  if (m.startsWith("image/")) {
    const [cv, ocr] = await Promise.all([
      decodeGrayStdin(bytes).then(describeGray).catch((e) => ({ error: e.message })),
      ocrBytes(bytes, { lang }),
    ]);
    const gaps = [];
    if (cv?.error) gaps.push({ reason: "cv_decode_failed", detail: cv.error });
    if (ocr.gap) gaps.push({ reason: ocr.gap, detail: ocr.detail ?? null });
    return {
      ...base, text: ocr.text ?? "", chars: (ocr.text ?? "").length, via: "image-khora",
      cv: cv && !cv.error ? { decoder: "cv-khora", ...cv } : null,
      ocrEngine: ocr.engine ?? null, gaps,
    };
  }
  if (m.startsWith("audio/")) {
    const stt = await transcribeAudioBytes(bytes);
    if (stt.gap) {
      const probe = await audioProbeBytes(bytes);
      return { ...base, text: "", via: "audio-probe", probe: probe.probe ?? null, gaps: [{ reason: stt.gap, detail: stt.detail }] };
    }
    return { ...base, text: stt.text, chars: stt.chars, via: `audio-${stt.engine}`, gaps: [] };
  }
  return { ...base, text: "", via: "unsupported", gaps: [{ reason: "unsupported_media", detail: `media ${m} has no local backend; nothing was derived` }] };
};

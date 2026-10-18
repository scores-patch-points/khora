// senses/registry.mjs — THE SENSE-SWARM: hunt for organs, run several providers on
// one material, keep the delta, and learn each organ's reliability over time.
//
// The box is not a single CV or OCR. It is whatever organs can be found — a local
// binary (tesseract, ffmpeg, poppler, whisper), a macOS framework reached through
// `swift` (Vision), a package manager's install (easyocr), a network provider when a
// key is present. The HUNT probes for them (no install, no guess: a missing organ is
// a typed gap). The FAN-OUT runs every applicable organ on the same bytes in parallel.
// The DELTA is their residue — agreement is the consensus, disagreement is a finding,
// never averaged away. The LEDGER records each reading so the swarm learns, over many
// materials, which organ to trust for which modality and language.
//
// Discipline (same as perceive/local.mjs): neutral observations only. An organ
// NOMINATES text; it never decides meaning. No model, no network for the local
// organs. The representative ground is one organ's own characters, chosen by how
// well it agrees with the consensus — never a synthesized blend.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ocrBytes,
  pdfTextLayerBytes,
  pdfOcrBytes,
  transcribeAudioBytes,
  decodeGrayStdin,
  describeGray,
} from "../khora/perceive/local.mjs";
import { huntSidecar, perceiveOrgan, probeModules } from "../native/organs/cube-sidecar.mjs";

export const SENSES_VERSION = "khora-senses@0.1";

const now = () => Date.now();
const tmp = (ext = "") => path.join(os.tmpdir(), `khora-sense-${process.pid}-${Math.random().toString(36).slice(2)}${ext}`);

// ── the macOS Vision organ: reached through `swift`, no install ──────────────
// Apple's own on-device text recognizer. Compiled once to a cached binary, then
// run per image. It is a sense, not a model: it returns the words the pixels carry.
const VISION_SWIFT = [
  "import Foundation",
  "import Vision",
  "import AppKit",
  "let args = CommandLine.arguments",
  'guard args.count > 1, let img = NSImage(contentsOfFile: args[1]), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { FileHandle.standardError.write("cannot load image\\n".data(using: .utf8)!); exit(2) }',
  "let req = VNRecognizeTextRequest()",
  "req.recognitionLevel = .accurate",
  "req.usesLanguageCorrection = true",
  'if args.count > 2, !args[2].isEmpty { req.recognitionLanguages = [args[2]] }',
  "let handler = VNImageRequestHandler(cgImage: cg, options: [:])",
  'do { try handler.perform([req]) } catch { FileHandle.standardError.write("\\(error)\\n".data(using: .utf8)!); exit(3) }',
  "for obs in (req.results ?? []) { if let c = obs.topCandidates(1).first { print(c.string) } }",
].join("\n");

const LANG_BCP47 = {
  eng: "en-US", spa: "es-ES", fra: "fr-FR", deu: "de-DE", ita: "it-IT", por: "pt-BR",
  nld: "nl-NL", rus: "ru-RU", zho: "zh-Hans", jpn: "ja-JP", kor: "ko-KR", ara: "ar-SA", hin: "hi-IN",
};

const visionBinary = (stateDir) => path.join(stateDir, "organs", "macos-vision-ocr");

const runVision = async (bytes, { lang = "eng", stateDir }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "khora-vision-"));
  const img = path.join(dir, "src.img");
  try {
    fs.writeFileSync(img, bytes);
    const bin = visionBinary(stateDir);
    if (!fs.existsSync(bin)) {
      fs.mkdirSync(path.dirname(bin), { recursive: true });
      const src = path.join(dir, "ocr.swift");
      fs.writeFileSync(src, VISION_SWIFT);
      const build = spawnSync("swiftc", ["-O", "-o", bin, src], { encoding: "utf8", timeout: 120_000 });
      if (build.error || build.status !== 0 || !fs.existsSync(bin)) {
        return { text: "", via: "macos-vision", gaps: [{ reason: "vision_build_failed", detail: String(build.stderr ?? build.error ?? "").slice(0, 200) }] };
      }
    }
    const r = spawnSync(bin, [img, LANG_BCP47[lang] ?? ""], { encoding: "utf8", timeout: 60_000 });
    if (r.error || r.status !== 0) return { text: "", via: "macos-vision", gaps: [{ reason: "vision_failed", detail: String(r.stderr ?? r.error ?? "").slice(0, 200) }] };
    const text = String(r.stdout ?? "").trim();
    if (!text) return { text: "", via: "macos-vision", gaps: [{ reason: "vision_empty", detail: "Vision found no text" }] };
    return { text, via: "macos-vision", chars: text.length };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const sipsMeta = async (bytes) => {
  const f = tmp(".img");
  try {
    fs.writeFileSync(f, bytes);
    const r = spawnSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "format", f], { encoding: "utf8", timeout: 30_000 });
    if (r.error || r.status !== 0) return { text: "", via: "sips", gaps: [{ reason: "sips_failed", detail: String(r.stderr ?? r.error ?? "").slice(0, 160) }] };
    const meta = Object.fromEntries(String(r.stdout ?? "").split("\n").flatMap((l) => {
      const m = /^\s*([\w]+):\s*(.+)$/.exec(l);
      return m ? [[m[1], m[2].trim()]] : [];
    }));
    return { text: "", via: "sips", meta };
  } finally {
    fs.rmSync(f, { force: true });
  }
};

const cvKhora = async (bytes) => {
  try {
    const gray = await decodeGrayStdin(bytes);
    return { text: "", via: "cv-khora", meta: describeGray(gray) };
  } catch (e) {
    return { text: "", via: "cv-khora", gaps: [{ reason: "cv_decode_failed", detail: String(e?.message ?? e).slice(0, 160) }] };
  }
};

const tesseractOrgan = async (bytes, { lang = "eng" }) => {
  const r = await ocrBytes(bytes, { lang });
  return r.gap ? { text: "", via: "tesseract", gaps: [{ reason: r.gap, detail: r.detail ?? null }] } : { text: r.text, via: "tesseract", chars: r.chars };
};

const pdfLayerOrgan = async (bytes) => {
  const r = await pdfTextLayerBytes(bytes);
  return r.gap ? { text: "", via: "pdftotext", gaps: [{ reason: r.gap, detail: r.detail ?? null }] } : { text: r.text, via: "pdftotext", chars: r.text.length };
};

const pdfOcrOrgan = async (bytes, { lang = "eng" }) => {
  const r = await pdfOcrBytes(bytes, { lang });
  return { text: r.text ?? "", via: "pdf-ocr", chars: (r.text ?? "").length, gaps: r.gap ? [{ reason: r.gap, detail: r.detail ?? null }] : [] };
};

const whisperOrgan = async (bytes) => {
  const r = await transcribeAudioBytes(bytes);
  return r.gap ? { text: "", via: "whisper", gaps: [{ reason: r.gap, detail: r.detail ?? null }] } : { text: r.text, via: "whisper", chars: r.chars, meta: { engine: r.engine } };
};

// ── the registry: each organ is a probe (is it here?) + a run (bytes → a reading) ──
const ORGAN_CANDIDATES = [
  { id: "cv-khora", kind: "cv", modality: "image", provider: "local", probe: ["ffmpeg", ["-version"]], run: cvKhora },
  { id: "macos-vision", kind: "ocr", modality: "image", provider: "macos", probe: ["swiftc", ["--version"]], run: runVision },
  { id: "tesseract", kind: "ocr", modality: "image", provider: "local", probe: ["tesseract", ["--version"]], run: tesseractOrgan },
  { id: "sips", kind: "meta", modality: "image", provider: "macos", probe: ["sips", ["--help"]], run: sipsMeta },
  { id: "pdftotext", kind: "text-layer", modality: "pdf", provider: "local", probe: ["pdftotext", ["-v"]], run: pdfLayerOrgan },
  { id: "pdf-ocr", kind: "ocr", modality: "pdf", provider: "local", probe: ["pdftoppm", ["-h"]], run: pdfOcrOrgan },
  { id: "whisper", kind: "asr", modality: "audio", provider: "local", probe: ["whisper", ["--help"]], run: whisperOrgan },
];

// ── the python organs (the cube sidecar): the SAME fan-out, hunted the same way ──
// cube-tools.json registers python readers for modalities the local binaries
// already serve (ocrmac for images, pdfplumber/pymupdf for PDFs, mlx-whisper
// for audio). They join the swarm as ordinary organs — hunted (a missing venv
// or module is a typed gap, never an install), run on the same bytes, kept in
// the same delta and ledger. Never a second swarm.
const sidecarProbeCache = new Map();
const sidecarModulePresent = (module) => {
  if (!sidecarProbeCache.has(module)) {
    const r = probeModules([module]);
    sidecarProbeCache.set(module, r.ok === true && Array.isArray(r.present) && r.present.includes(module));
  }
  return sidecarProbeCache.get(module);
};

const pyOrganRun = (organ, suffix) => async (bytes, { lang = "eng" } = {}) => {
  const r = await perceiveOrgan({ organ, bytes, lang, suffix });
  if (r.ok !== true) return { text: "", via: `sidecar-${organ}`, gaps: [{ reason: r.gap ?? "perceive_failed", detail: String(r.why ?? "").slice(0, 200) }] };
  const text = String(r.text ?? "").trim();
  if (!text) return { text: "", via: `sidecar-${organ}`, gaps: [{ reason: "organ_empty", detail: `${organ} found no text` }] };
  return { text, via: `sidecar-${organ}`, chars: text.length, meta: { producer: r.producer } };
};

export const PY_ORGAN_CANDIDATES = [
  { id: "sidecar-ocrmac", kind: "ocr", modality: "image", provider: "sidecar", module: "ocrmac", organ: "ocrmac", suffix: ".png" },
  { id: "sidecar-pdfplumber", kind: "text-layer", modality: "pdf", provider: "sidecar", module: "pdfplumber", organ: "pdfplumber", suffix: ".pdf" },
  { id: "sidecar-pymupdf", kind: "text-layer", modality: "pdf", provider: "sidecar", module: "pymupdf", organ: "pymupdf", suffix: ".pdf" },
  { id: "sidecar-mlx-whisper", kind: "asr", modality: "audio", provider: "sidecar", module: "mlx_whisper", organ: "mlx_whisper", suffix: ".wav" },
].map((spec) => ({
  id: spec.id,
  kind: spec.kind,
  modality: spec.modality,
  provider: spec.provider,
  module: spec.module,
  available: () => huntSidecar().found && sidecarModulePresent(spec.module),
  run: pyOrganRun(spec.organ, spec.suffix),
}));

const allCandidates = () => [...ORGAN_CANDIDATES, ...PY_ORGAN_CANDIDATES];

const probes = new Map();
const isAvailable = (organ) => {
  if (typeof organ.available === "function") return !!organ.available();
  const [cmd, args] = organ.probe;
  const key = `${cmd} ${args.join(" ")}`;
  if (!probes.has(key)) {
    const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 15_000 });
    probes.set(key, !r.error && r.status !== null);
  }
  return probes.get(key);
};

const modalityOf = (mime) => {
  const m = String(mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf") return "pdf";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  return "other";
};

const organsFile = (stateDir) => path.join(stateDir, "senses-organs.json");

/**
 * THE HUNT: probe every candidate, persist those present, and report those absent.
 * A missing organ is a typed gap (its `probe` did not answer), never an install and
 * never a guess. Runs on demand; the result is cached to the state dir for inspection.
 */
export function huntOrgans({ stateDir = path.join(os.homedir(), ".fold", "opencode-senses") } = {}) {
  const found = [], missing = [];
  for (const organ of allCandidates()) (isAvailable(organ) ? found : missing).push({ id: organ.id, kind: organ.kind, modality: organ.modality, provider: organ.provider });
  // Why a python organ is missing is disclosed in the report: an absent venv
  // (fold-door.sh FOLD_CUBE=1, or uv sync) and an absent module are different
  // gaps, and the difference is the whole reason this hunt exists.
  const report = { schema: "SenseHunt@1", at: new Date().toISOString(), found, missing, sidecar: huntSidecar(), byModality: found.reduce((a, o) => ({ ...a, [o.modality]: (a[o.modality] ?? 0) + 1 }), {}) };
  try { fs.mkdirSync(stateDir, { recursive: true }); fs.writeFileSync(organsFile(stateDir), JSON.stringify(report, null, 2) + "\n"); } catch { /* the hunt never blocks */ }
  return report;
}

/** Applicable, present organs for a modality. The hunt gates by presence, never by a list. */
export function organsFor(mime) {
  const mod = modalityOf(mime);
  const candidates = allCandidates();
  const pdfOrgans = mod === "pdf" ? candidates.filter((o) => o.modality === "pdf") : [];
  const base = candidates.filter((o) => o.modality === mod && !pdfOrgans.includes(o));
  return [...base, ...pdfOrgans].filter(isAvailable);
}

// ── the delta: agreement is the consensus, disagreement is the finding ────────
const tokens = (t) => new Set(String(t ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);

export function deltaOf(readings = []) {
  const withText = readings.filter((r) => typeof r.text === "string" && r.text.trim());
  if (withText.length < 2) {
    return {
      schema: "SenseDelta@1", organs: withText.length, agreement: null, pairs: 0, consensus: 0, disputed: 0, sample: [],
      line: withText.length === 1 ? "sense delta: single organ read — no second reading to compare" : "sense delta: no text reading",
    };
  }
  const sets = withText.map((r) => tokens(r.text));
  let sum = 0, pairs = 0;
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    const a = sets[i], b = sets[j];
    const inter = [...a].filter((x) => b.has(x)).length;
    const uni = new Set([...a, ...b]).size;
    sum += uni ? inter / uni : 0;
    pairs += 1;
  }
  const count = new Map();
  for (const s of sets) for (const t of s) count.set(t, (count.get(t) ?? 0) + 1);
  const half = sets.length / 2;
  const consensus = [...count].filter(([, n]) => n > half);
  const disputed = [...count].filter(([, n]) => n > 0 && n <= half).map(([t]) => t);
  const agreement = pairs ? sum / pairs : null;
  return {
    schema: "SenseDelta@1", organs: sets.length, agreement, pairs,
    consensus: consensus.length, disputed: disputed.length, sample: disputed.slice(0, 20),
    line: `sense delta: ${sets.length} organ(s), agreement ${agreement === null ? "n/a" : `${Math.round(agreement * 100)}%`} over ${pairs} pair(s); ${consensus.length} consensus token(s), ${disputed.length} disputed`,
  };
}

const agreeWithMajority = (text, majoritySet) => {
  if (!majoritySet.size) return null;
  const s = tokens(text);
  return [...s].filter((t) => majoritySet.has(t)).length / majoritySet.size;
};

/**
 * THE FAN-OUT: run every applicable organ on one material, in parallel, and return
 * their readings plus the delta. The representative ground is the reading that agrees
 * best with the consensus (ties → longest) — one organ's own characters, never a
 * synthesized blend. Each reading is appended to the reliability ledger.
 */
export async function perceiveMany(bytes, { mime = "application/octet-stream", name = "material", lang = "eng", stateDir = path.join(os.homedir(), ".fold", "opencode-senses") } = {}) {
  const organs = organsFor(mime);
  if (!organs.length) return { schema: "SenseSwarm@1", via: "none", text: "", modality: modalityOf(mime), readings: [], gaps: [{ reason: "no_sense_organs", detail: `no present organ reads ${mime}` }], delta: deltaOf([]) };
  const readings = await Promise.all(organs.map(async (organ) => {
    const t0 = now();
    let out;
    try { out = (await organ.run(bytes, { lang, name, stateDir })) ?? {}; }
    catch (e) { out = { text: "", via: organ.id, gaps: [{ reason: "organ_threw", detail: String(e?.message ?? e).slice(0, 200) }] }; }
    return { organ: organ.id, kind: organ.kind, provider: organ.provider, via: out.via ?? organ.id, text: out.text ?? "", meta: out.meta ?? null, chars: (out.text ?? "").length, ms: now() - t0, gaps: out.gaps ?? [] };
  }));
  const delta = deltaOf(readings);
  const withText = readings.filter((r) => r.text.trim());
  const majoritySet = new Set(delta.pairs ? tokenMajorityOf(withText) : []);
  for (const r of readings) r.agreeWithMajority = agreeWithMajority(r.text, majoritySet);
  const ranked = withText.slice().sort((a, b) => (b.agreeWithMajority ?? -1) - (a.agreeWithMajority ?? -1) || b.chars - a.chars);
  const representative = ranked[0] ?? null;
  recordReliability({ stateDir, mime, name, readings, delta });
  return {
    schema: "SenseSwarm@1",
    modality: modalityOf(mime),
    via: representative?.organ ?? "none",
    text: representative?.text ?? "",
    lang,
    readings,
    delta,
    gaps: readings.flatMap((r) => r.gaps.map((g) => ({ organ: r.organ, ...g }))),
  };
}

function tokenMajorityOf(withText) {
  const sets = withText.map((r) => tokens(r.text));
  const count = new Map();
  for (const s of sets) for (const t of s) count.set(t, (count.get(t) ?? 0) + 1);
  const half = sets.length / 2;
  return [...count].filter(([, n]) => n > half).map(([t]) => t);
}

// ── the ledger: what each organ measured, and how it agreed, over time ────────
const ledgerFile = (stateDir) => path.join(stateDir, "senses-ledger.jsonl");

export function recordReliability({ stateDir, mime, name, readings, delta }) {
  const row = {
    schema: "SenseReading@1", at: new Date().toISOString(), mime, name,
    agreement: delta?.agreement ?? null,
    organs: readings.map((r) => ({ organ: r.organ, provider: r.provider, chars: r.chars, ms: r.ms, agreeWithMajority: r.agreeWithMajority ?? null, gap: r.gaps[0]?.reason ?? null })),
  };
  try { fs.mkdirSync(stateDir, { recursive: true }); fs.appendFileSync(ledgerFile(stateDir), JSON.stringify(row) + "\n"); } catch { /* the ledger never blocks a read */ }
  return row;
}

/** What the swarm has learned about each organ: runs, mean agreement with the
 *  majority reading, mean chars, and the gaps it raised. Read-only projection. */
export function organStanding({ stateDir = path.join(os.homedir(), ".fold", "opencode-senses") } = {}) {
  const by = new Map();
  let rows = [];
  try { rows = fs.readFileSync(ledgerFile(stateDir), "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }); } catch { rows = []; }
  for (const row of rows) for (const o of row.organs ?? []) {
    const s = by.get(o.organ) ?? { organ: o.organ, provider: o.provider, runs: 0, agree: [], chars: 0, gaps: 0 };
    s.runs += 1;
    if (typeof o.agreeWithMajority === "number") s.agree.push(o.agreeWithMajority);
    s.chars += o.chars ?? 0;
    if (o.gap) s.gaps += 1;
    by.set(o.organ, s);
  }
  return [...by.values()].map((s) => ({
    organ: s.organ, provider: s.provider, runs: s.runs, gaps: s.gaps,
    meanAgree: s.agree.length ? Math.round((s.agree.reduce((a, b) => a + b, 0) / s.agree.length) * 1000) / 1000 : null,
    meanChars: s.runs ? Math.round(s.chars / s.runs) : 0,
  })).sort((a, b) => (b.meanAgree ?? -1) - (a.meanAgree ?? -1) || b.runs - a.runs);
}

export { ORGAN_CANDIDATES };

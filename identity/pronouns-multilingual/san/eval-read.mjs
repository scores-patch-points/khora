// eval-read.mjs — read chunks of a Sanskrit text with the canonical read (language declared san, DEFAULT dials) and keep what the falsifier needs. One process per text; per-chunk results are cached.
// Usage: KHORA_PRIORS_DIR=<priors with frame-san.json> node eval-read.mjs <name> <prepared-text> <nChunks> <chunkChars> <out-dir>
import fs from "node:fs"; import path from "node:path";
import { readToWeft } from "../../../native/the-fold/read-process.mjs";
const [NAME, FILE, K, CH, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const text = fs.readFileSync(FILE, "utf8"), n = +K, len = +CH;
const chunks = []; for (let i = 0; i < n; i++) { let a = Math.floor(((i + 0.5) / n) * (text.length - len)); const nl = text.indexOf("\n", a); a = nl < 0 ? a : nl + 1; let b = a + len; const last = Math.max(text.lastIndexOf("|", b), text.lastIndexOf("\n", b)); if (last > a + len / 2) b = last + 1; chunks.push([a, b]); }
for (const [i, [a, b]] of chunks.entries()) {
  const f = path.join(OUT, `${NAME}-${String(i).padStart(2, "0")}.json`); if (fs.existsSync(f)) continue;
  const t0 = Date.now(); const e = readToWeft(text.slice(a, b), { address: `${NAME}:${a}`, language: "san" });
  const pi = e.presenceInputs;
  fs.writeFileSync(f, JSON.stringify({ name: NAME, chunk: i, from: a, to: b, chars: b - a, ms: Date.now() - t0, language: e.language, sentences: e.sentences.map((s) => ({ text: s.text, offset: s.offset })), castN: e.cast.length, heard: e.heard.map((h) => ({ surface: h.surface, n: h.mentionSpans.length })), mentions: pi?.mentions ?? [], nonPersonal: pi?.nonPersonal ?? [], bound: (e.pronounsPresence ?? []).length, gaps: e.gaps.map((g) => g.gap) }));
  console.log(NAME, i, "chars", b - a, "sentences", e.sentences.length, "beings", new Set((pi?.mentions ?? []).map((m) => m.ref)).size, "bound", (e.pronounsPresence ?? []).length, "ms", Date.now() - t0);
}

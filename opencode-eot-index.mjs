// opencode-eot-index.mjs — a DERIVED, disposable binary index over a task's EOT log, learned from
// eodb (matrix-events: src/pack.js, src/store.js, src/fold.js).
//
// The JSONL log stays the SOURCE OF TRUTH (one writer per agent, append-only; opencode-eot.mjs). This
// index is a rebuildable projection of it, never authoritative:
//
//   <root>/<task>/eot/<agent>.jsonl   authoritative, unchanged
//   <root>/<task>/eot/<agent>.idx     derived binary index over exactly the jsonl bytes it covers
//
// The three moves EODB proved, applied to the fold:
//   1. FIXED-HEADER BINARY RECORDS — 24 bytes per row (kind, stage, ts:u48, id-hash:u64, src-hash:u32,
//      body-length:u32) + the row's JSON as the body. Count, time range and per-stage counts read by
//      byte-striding the headers WITHOUT parsing a single body (pack.js scanMeta/unpackSince).
//   2. DELTA READ — a read parses only the jsonl bytes appended since the index was built, never the
//      whole file again. One JSON pass over a file, ever (pack.js unpackSince).
//   3. ADAPTIVE CHECKPOINT — the covered byte offset is persisted in the index header; a read that
//      finds no growth does ZERO json parsing (store.js _plain cache + shouldCheckpoint).
//
// The invariant, pinned by test: readIndexed(task) deep-equals read(task). The index is a cache; if it
// drifts, a missing file appears, or a byte is corrupt, the reader falls back to a full parse and
// rebuilds. Fails typed, never throws past the caller.
import fs from "node:fs";
import path from "node:path";
import { STAGES } from "./opencode-eot-stages.mjs";
import { taskDir } from "./opencode-worknotes.mjs";

// ── FNV-1a: fast, non-crypto, deterministic (same family eodb uses for dedup/identity) ─────────────
function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function fnv1a64(str) {
  let lo = 0x811c9dc5, hi = 0xcbf29ce4;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    lo ^= c; hi ^= c;
    lo = Math.imul(lo, 0x01000193);
    hi = Math.imul(hi, 0x00000100 + 0x193);
  }
  return [lo >>> 0, hi >>> 0];
}

const HEADER = 24;
const IDX_MAGIC = [0x45, 0x4f, 0x49, 0x58]; // "EOIX"
const IDX_VERSION = 1;
const IDX_PREFIX = 4 + 1 + 4 + 4; // magic(4) version(1) covered(4) count(4)
const KIND_SRC = 0, KIND_EVT = 1;
const STAGE_ORD = new Map(STAGES.map((s, i) => [s, i]));

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ── pack: one contiguous buffer of fixed-header records (pack.js packBatch) ────────────────────────
/** @param {Array<object>} rows eot rows ({t:"src"|"evt", ...}) */
export function packRows(rows) {
  const bodies = rows.map((r) => encoder.encode(JSON.stringify(r)));
  const total = rows.length * HEADER + bodies.reduce((s, b) => s + b.length, 0);
  const buf = new ArrayBuffer(total);
  const view = new DataView(buf);
  const arr = new Uint8Array(buf);
  let off = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const isEvt = r.t === "evt";
    const ts = isEvt ? (r.ts || 0) : 0;
    view.setUint8(off, isEvt ? KIND_EVT : KIND_SRC);
    view.setUint8(off + 1, isEvt ? (STAGE_ORD.get(r.stage) ?? 255) : 0);
    view.setUint16(off + 2, (ts / 0x100000000) & 0xffff);
    view.setUint32(off + 4, ts >>> 0);
    const [idLo, idHi] = fnv1a64(String((isEvt ? r.event_id : r.source_id) ?? ""));
    view.setUint32(off + 8, idLo);
    view.setUint32(off + 12, idHi);
    view.setUint32(off + 16, fnv1a32(String(r.source_id ?? "")));
    view.setUint32(off + 20, bodies[i].length);
    arr.set(bodies[i], off + HEADER);
    off += HEADER + bodies[i].length;
  }
  return arr;
}

const headerAt = (view, off) => ({
  kind: view.getUint8(off),
  stage: view.getUint8(off + 1),
  ts: view.getUint16(off + 2) * 0x100000000 + view.getUint32(off + 4),
  idLo: view.getUint32(off + 8),
  idHi: view.getUint32(off + 12),
  srcHash: view.getUint32(off + 16),
  bodyLen: view.getUint32(off + 20),
});

/** Header-only scan: count, time range, per-stage counts. Zero body decode (pack.js scanMeta). */
export function scanMeta(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let off = 0, count = 0, firstTs = Infinity, lastTs = 0;
  const byStage = new Array(9).fill(0);
  while (off + HEADER <= buf.length) {
    const h = headerAt(view, off);
    if (off + HEADER + h.bodyLen > buf.length) break; // truncated tail
    if (h.kind === KIND_EVT) { if (h.ts < firstTs) firstTs = h.ts; if (h.ts > lastTs) lastTs = h.ts; }
    if (h.stage < byStage.length) byStage[h.stage]++;
    count++;
    off += HEADER + h.bodyLen;
  }
  return { count, firstTs: firstTs === Infinity ? 0 : firstTs, lastTs, byStage };
}

/**
 * Unpack rows, parsing bodies only for events at/after `sinceTs` (pack.js unpackSince). Rows before the
 * cursor are counted but not decoded, so a delta read costs one header stride plus the tail's parse.
 * Returns { rows, decoded } where `decoded` is the number of bodies actually JSON.parsed (falsifiable).
 */
export function unpack(buf, { sinceTs = 0, includeSrc = true } = {}) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const rows = [];
  let off = 0, decoded = 0;
  while (off + HEADER <= buf.length) {
    const h = headerAt(view, off);
    if (off + HEADER + h.bodyLen > buf.length) break;
    const wanted = h.kind === KIND_SRC ? includeSrc && sinceTs <= 0 : h.ts >= sinceTs;
    if (wanted) {
      const body = buf.subarray(off + HEADER, off + HEADER + h.bodyLen);
      try { rows.push(JSON.parse(decoder.decode(body))); decoded++; } catch { /* a bad body is dropped, typed by omission */ }
    }
    off += HEADER + h.bodyLen;
  }
  return { rows, decoded };
}

// ── the derived index over one jsonl file ──────────────────────────────────────────────────────────
const stem = (jsonl) => `${jsonl}.idx`;

/** Read an index file: { covered, rows } or null when absent/corrupt/foreign-version. */
function readIndex(file) {
  let raw;
  try { raw = fs.readFileSync(file); } catch { return null; }
  if (raw.length < IDX_PREFIX) return null;
  if (raw[0] !== IDX_MAGIC[0] || raw[1] !== IDX_MAGIC[1] || raw[2] !== IDX_MAGIC[2] || raw[3] !== IDX_MAGIC[3]) return null;
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  if (view.getUint8(4) !== IDX_VERSION) return null;
  const covered = view.getUint32(5);
  const count = view.getUint32(9);
  const { rows } = unpack(raw.subarray(IDX_PREFIX));
  if (rows.length !== count) return null; // a torn write — rebuild
  return { covered, rows };
}

function writeIndex(file, covered, rows) {
  const packed = packRows(rows);
  const out = new Uint8Array(IDX_PREFIX + packed.length);
  out.set(IDX_MAGIC, 0);
  out[4] = IDX_VERSION;
  new DataView(out.buffer).setUint32(5, covered);
  new DataView(out.buffer).setUint32(9, rows.length);
  out.set(packed, IDX_PREFIX);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, out);
  fs.renameSync(tmp, file); // atomic swap; the log is untouched
}

/** Parse complete JSON lines from a byte buffer (an append can land mid-line; stop at the last \n). */
function rowsFromBytes(buf) {
  const nl = buf.lastIndexOf(0x0a);
  if (nl < 0) return { rows: [], consumed: 0, lines: 0 };
  const lines = decoder.decode(buf.subarray(0, nl)).split("\n").filter(Boolean);
  const rows = [];
  for (const line of lines) {
    try { rows.push(JSON.parse(line)); } catch { /* dropped, as opencode-eot.read() does */ }
  }
  return { rows, consumed: nl + 1, lines: lines.length };
}

// Session cache of parsed rows per file, so a second read in one process parses nothing new
// (store.js `_plain`). Keyed by absolute jsonl path.
const cache = new Map();
/** Parse counters — the falsifier's signal: a warm read must not decode. */
export const stats = { reads: 0, decodes: 0 };
export function resetCache() { cache.clear(); stats.reads = 0; stats.decodes = 0; }

/**
 * The rows of one jsonl file, parsed at most once: cover the file once, then tail-only. Falls back to
 * a full re-parse whenever the covered offset is ahead of the file (a truncation/rewrite) or the index
 * is unusable. Returns rows in file order (src and evt interleaved, exactly as the log holds them).
 */
function rowsOfFile(file) {
  let size = 0;
  try { size = fs.statSync(file).size; } catch { return { rows: [], covered: 0 }; }

  const hit = cache.get(file);
  if (hit && hit.covered === size) return hit; // warm and complete — zero work

  const idx = readIndex(stem(file));
  const base = idx && idx.covered <= size ? idx : { covered: 0, rows: [] };

  let parsed = { rows: [], consumed: 0, lines: 0 };
  try { parsed = rowsFromBytes(fs.readFileSync(file).subarray(base.covered)); } catch { /* unreadable — leave empty */ }
  const { rows, consumed } = parsed;
  stats.decodes += parsed.lines; // bodies actually JSON.parsed this call (the falsifier's signal)

  const covered = base.covered + consumed;
  const merged = rows.length ? base.rows.concat(rows) : base.rows;
  const entry = { rows: merged, covered };
  cache.set(file, entry);
  writeIndex(stem(file), covered, merged); // persist the checkpoint (adaptive write cost = one pack)
  return entry;
}

const dirOf = (task) => { const d = taskDir(task); return d ? path.join(d, "eot") : null; };

/** The task's merged log, identical in shape to opencode-eot.read(): { sources: Map, events: [...] }. */
export function readIndexed(task) {
  stats.reads++;
  const sources = new Map(), events = [];
  const d = dirOf(task);
  if (!d || !fs.existsSync(d)) return { sources, events };
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".jsonl"))) {
    const { rows } = rowsOfFile(path.join(d, f));
    for (const r of rows) {
      if (r.t === "src" && r.source_id) sources.set(r.source_id, r);
      else if (r.t === "evt" && r.event_id) events.push(r);
    }
  }
  events.sort((a, b) => (a.ts - b.ts) || String(a.event_id).localeCompare(String(b.event_id)));
  return { sources, events };
}

/** Header-only metadata for a task's log without parsing bodies: count + time range across agents. */
export function scan(task) {
  const d = dirOf(task);
  if (!d || !fs.existsSync(d)) return { files: 0, count: 0, firstTs: 0, lastTs: 0 };
  let files = 0, count = 0, firstTs = Infinity, lastTs = 0;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".idx"))) {
    let raw;
    try { raw = fs.readFileSync(path.join(d, f)); } catch { continue; }
    if (raw.length < IDX_PREFIX) continue;
    files++;
    const m = scanMeta(raw.subarray(IDX_PREFIX));
    count += m.count;
    if (m.firstTs && m.firstTs < firstTs) firstTs = m.firstTs;
    if (m.lastTs > lastTs) lastTs = m.lastTs;
  }
  return { files, count, firstTs: firstTs === Infinity ? 0 : firstTs, lastTs };
}

// opencode-eot-bin.mjs — THE BINARY LOG (EOT), learned from eodb (matrix-events: src/pack.js, src/store.js).
//
//   <root>/<task>/eot/<agent>.bin    the log, one writer per file, append-only
//   <root>/<task>/eot/<agent>.jsonl  LEGACY (read-merged; migrated on the writer's next append)
//
// Format, exactly EODB's record (pack.js): magic "EOBL" + version:u8, then fixed records —
//
//   op/kind : u8      (0 src, 1 evt)
//   stage   : u8      (STAGES order for evt, 0 for src)
//   ts      : u48     (u16 hi + u32 lo, ms since epoch)
//   id_hash : u64     (FNV-1a of event_id / source_id, two u32)
//   src_hash: u32     (FNV-1a of source_id)
//   body_len: u32
//   body    : UTF-8 JSON of the row (the same row opencode-eot.mjs always wrote)
//
// The three moves EODB proved, now on the PRIMARY file (not a derived index):
//   1. FIXED-HEADER RECORDS — count, time range, per-stage counts and EVENT-IDENTITY DEDUP read by
//      byte-striding headers alone (pack.js scanMeta); zero JSON touched.
//   2. IN-MEMORY LOG (store.js `_plain`) — one header pass seeds a per-file entry (seen-id map with
//      byte offsets, parsed rows); every later read parses only the bytes appended since.
//   3. TORN-TAIL TOLERANCE (pack.js `break`) — a crash mid-append leaves a partial record; the tail
//      is dropped by readers and truncated once by the writer, never a lost log.
//
// The writer appends one packed buffer per row via a cached fd (O(1), no re-read): the jsonl path
// re-parsed the whole file per append for dedup — O(n) per write, O(n²) per session — this is why
// the log is binary. A legacy jsonl is migrated ONCE (atomic tmp+rename) so no read ever parses it
// again. The row SHAPE is unchanged: every projection (record, commons, plans) reads the same objects.
import fs from "node:fs";
import path from "node:path";
import { STAGES } from "./opencode-eot-stages.mjs";
import { taskDir } from "./opencode-worknotes.mjs";

const HEADER = 24;
const MAGIC = [0x45, 0x4f, 0x42, 0x4c]; // "EOBL"
const VERSION = 1;
const PREFIX = 5;
const KIND_SRC = 0;
const KIND_EVT = 1;
const STAGE_ORD = new Map(STAGES.map((s, i) => [s, i]));
const PREFIX_BYTES = new Uint8Array([...MAGIC, VERSION]);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
// FOLD_EOT_TEXT=1 mirrors every appended row to the legacy jsonl as well (a human-readable archive;
// off by default — the log is binary). FOLD_EOT_BIN=0 disables the binary log entirely (opencode-eot
// then falls back to jsonl), for an escape hatch that never needs a code change.
export const BIN_ON = () => process.env.FOLD_EOT_BIN !== "0";
export const TEXT_MIRROR = () => process.env.FOLD_EOT_TEXT === "1";

// ── FNV-1a: fast, non-crypto, deterministic (same family eodb/opencode-eot-index use) ──────────────
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
const idKey = (idLo, idHi) => `${idLo}:${idHi}`;
const keyOfId = (id) => { const [lo, hi] = fnv1a64(String(id ?? "")); return idKey(lo, hi); };

const ident = (s) => { const v = String(s ?? ""); return /^[\w.-]+$/.test(v) && v !== "." && v !== ".." ? v : null; };
const dirOf = (task) => { const d = taskDir(task); return d ? path.join(d, "eot") : null; };
export const binOf = (task, agent) => { const d = dirOf(task); const a = ident(agent); return d && a ? path.join(d, `${a}.bin`) : null; };
const jsonlOf = (task, agent) => { const d = dirOf(task); const a = ident(agent); return d && a ? path.join(d, `${a}.jsonl`) : null; };

/** Parse complete JSON lines from a buffer (an append can land mid-line; stop at the last \n). */
function rowsFromBytes(buf) {
  const text = decoder.decode(buf);
  const nl = text.lastIndexOf("\n");
  if (nl < 0) return [];
  return text.slice(0, nl).split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
}

// ── pack: one contiguous buffer of fixed-header records (pack.js packBatch) ────────────────────────
/** Pack rows into { bytes, keys } where keys = [{ key, offset }] per record (for the seen map). */
export function packRecords(rows) {
  const parts = rows.map((r) => {
    const isEvt = r.t === "evt";
    const body = encoder.encode(JSON.stringify(r));
    const buf = new Uint8Array(HEADER + body.length);
    const view = new DataView(buf.buffer);
    const ts = isEvt ? (r.ts || 0) : 0;
    view.setUint8(0, isEvt ? KIND_EVT : KIND_SRC);
    view.setUint8(1, isEvt ? (STAGE_ORD.get(r.stage) ?? 255) : 0);
    view.setUint16(2, (ts / 0x100000000) & 0xffff);
    view.setUint32(4, ts >>> 0);
    const id = String((isEvt ? r.event_id : r.source_id) ?? "");
    const [idLo, idHi] = fnv1a64(id);
    view.setUint32(8, idLo);
    view.setUint32(12, idHi);
    view.setUint32(16, fnv1a32(String(r.source_id ?? "")));
    view.setUint32(20, body.length);
    buf.set(body, HEADER);
    return { buf, key: idKey(idLo, idHi) };
  });
  const total = parts.reduce((s, p) => s + p.buf.length, 0);
  const bytes = new Uint8Array(total);
  const keys = [];
  let off = 0;
  for (const p of parts) { bytes.set(p.buf, off); keys.push({ key: p.key, offset: off }); off += p.buf.length; }
  return { bytes, keys };
}

const headerAt = (view, off) => ({
  kind: view.getUint8(off),
  stage: view.getUint8(off + 1),
  ts: view.getUint16(off + 2) * 0x100000000 + view.getUint32(off + 4),
  idLo: view.getUint32(off + 8),
  idHi: view.getUint32(off + 12),
  bodyLen: view.getUint32(off + 20),
});

/** Header-only scan of a bin buffer: record count, time range, per-stage counts, seen-id offsets.
 *  Zero body decode (pack.js scanMeta). Stops at a torn tail — the partial record is reported, not read. */
export function scanFile(file) {
  let raw;
  try { raw = fs.readFileSync(file); } catch { return null; }
  if (raw.length < PREFIX) return null;
  for (let i = 0; i < 4; i++) if (raw[i] !== MAGIC[i]) return null;
  if (raw[4] !== VERSION) return null;
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  let off = PREFIX, count = 0, firstTs = Infinity, lastTs = 0, evts = 0;
  const byStage = new Array(9).fill(0);
  const seen = new Map();
  while (off + HEADER <= raw.length) {
    const h = headerAt(view, off);
    if (off + HEADER + h.bodyLen > raw.length) break; // torn tail: dropped, never guessed
    seen.set(idKey(h.idLo, h.idHi), off);
    if (h.kind === KIND_EVT) {
      evts++;
      if (h.ts < firstTs) firstTs = h.ts;
      if (h.ts > lastTs) lastTs = h.ts;
      if (h.stage < byStage.length) byStage[h.stage]++;
    }
    count++;
    off += HEADER + h.bodyLen;
  }
  return { size: raw.length, goodEnd: off, count, evts, firstTs: firstTs === Infinity ? 0 : firstTs, lastTs, byStage, seen };
}

/** Parse records from `from` to the end of the buffer: rows in file order, `decoded` bodies parsed. */
function parseFrom(raw, from) {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const rows = [];
  let off = from, decoded = 0, end = from;
  while (off + HEADER <= raw.length) {
    const h = headerAt(view, off);
    if (off + HEADER + h.bodyLen > raw.length) break;
    const body = raw.subarray(off + HEADER, off + HEADER + h.bodyLen);
    try { rows.push(JSON.parse(decoder.decode(body))); decoded++; } catch { /* a bad body is dropped, typed by omission */ }
    off += HEADER + h.bodyLen;
    end = off;
  }
  return { rows, decoded, end };
}

// ── per-file entries: the in-memory log (store.js `_plain`) ────────────────────────────────────────
// file -> { fd, size, parsedEnd, seen: Map(key->offset), sources: Map, events: [], legacyRows? }
const entries = new Map();
/** Counters — the falsifier's signals: warm reads must not decode; appends must not re-read. */
export const stats = { appends: 0, rows: 0, bytes: 0, decodes: 0, reads: 0, migrated: 0, healed: 0, fds: 0 };
export function resetBinStats() { Object.assign(stats, { appends: 0, rows: 0, bytes: 0, decodes: 0, reads: 0, migrated: 0, healed: 0 }); }
export function resetBinCache() { for (const e of entries.values()) { try { fs.closeSync(e.fd); } catch { /* already gone */ } } entries.clear(); mergedCache.clear(); stats.fds = 0; }
const mergedCache = new Map(); // task -> { sig, sources, events }
const FD_CAP = 256;

function ingest(entry, rows) {
  for (const r of rows) {
    if (r.t === "src" && r.source_id) entry.sources.set(r.source_id, r);
    else if (r.t === "evt" && r.event_id) entry.events.push(r);
  }
}

/** The row-parse of a legacy jsonl (one time per size — it is migrated on the next append of that
 *  agent). Size-keyed so a legacy append in this process invalidates the cache, never serving staleness. */
const legacyRows = new Map(); // file -> { size, rows }
function rowsOfJsonl(file) {
  let size = -1;
  try { size = fs.statSync(file).size; } catch { return []; }
  const hit = legacyRows.get(file);
  if (hit && hit.size === size) return hit.rows;
  let rows = [];
  try { rows = rowsFromBytes(fs.readFileSync(file)); } catch { rows = []; }
  legacyRows.set(file, { size, rows });
  return rows;
}

/** Migrate a legacy jsonl to bin: atomic (tmp + rename) so a crash leaves the jsonl authoritative. */
function migrate(file, jsonl) {
  const rows = rowsFromBytes(fs.readFileSync(jsonl));
  const { bytes } = packRecords(rows);
  const out = new Uint8Array(PREFIX + bytes.length);
  out.set(PREFIX_BYTES, 0);
  out.set(bytes, PREFIX);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, out);
  fs.renameSync(tmp, file);
  stats.migrated++;
}

/** Open (and heal, and migrate) one writer file: returns the entry or null. */
function ensure(file, jsonl) {
  const hit = entries.get(file);
  if (hit) {
    let size = 0;
    try { size = fs.statSync(file).size; } catch { /* unreadable */ }
    if (size === hit.size) return hit;
    // grew under us (another process — should not happen with one writer per file): re-scan the tail
    const raw = fs.readFileSync(file);
    const { rows, decoded, end } = parseFrom(raw, hit.parsedEnd);
    stats.decodes += decoded;
    ingest(hit, rows);
    hit.size = end;
    hit.parsedEnd = end;
    return hit;
  }
  if (!fs.existsSync(file) && jsonl && fs.existsSync(jsonl)) {
    try { migrate(file, jsonl); } catch { /* the jsonl stays authoritative */ }
  }
  if (!fs.existsSync(file)) {
    try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, PREFIX_BYTES); } catch { return null; }
  }
  const scan = scanFile(file);
  if (!scan) return null;
  if (scan.goodEnd < scan.size) {
    // a torn tail (a crash mid-append): truncate once, disclosed
    try { fs.truncateSync(file, scan.goodEnd); stats.healed++; } catch { /* reader still tolerates it */ }
  }
  const raw = fs.readFileSync(file);
  const { rows, decoded, end } = parseFrom(raw, PREFIX);
  stats.decodes += decoded;
  let fd;
  try { fd = fs.openSync(file, "a"); } catch { return null; }
  const entry = { fd, size: end, parsedEnd: end, seen: scan.seen, sources: new Map(), events: [] };
  ingest(entry, rows);
  entries.set(file, entry);
  stats.fds = entries.size;
  if (entries.size > FD_CAP) for (const [f, e] of entries) { if (entries.size <= FD_CAP) break; if (f !== file) { try { fs.closeSync(e.fd); } catch { /* */ } entries.delete(f); } }
  return entry;
}

// ── append ─────────────────────────────────────────────────────────────────────────────────────────
/** Append rows to one writer's log: one packed write via a cached fd. Never re-reads the file. */
export function appendRows(task, agent, rows) {
  const file = binOf(task, agent);
  if (!file) return { ok: false, gap: "bad-address" };
  const entry = ensure(file, jsonlOf(task, agent));
  if (!entry) return { ok: false, gap: "unopenable" };
  const { bytes, keys } = packRecords(rows);
  try { fs.writeSync(entry.fd, bytes); } catch { return { ok: false, gap: "write_failed" }; }
  const base = entry.size;
  for (const k of keys) entry.seen.set(k.key, base + k.offset);
  entry.size = base + bytes.length;
  entry.parsedEnd = entry.size;
  ingest(entry, rows);
  stats.appends++;
  stats.rows += rows.length;
  stats.bytes += bytes.length;
  return { ok: true };
}

/** Exact event dedup: header-hash first (zero decode); on a hit, the ONE record's body is verified
 *  against the full event_id, so a 64-bit hash collision can never drop a real event. */
export function hasEvent(task, agent, event_id) {
  const file = binOf(task, agent);
  if (!file) return false;
  const entry = ensure(file, jsonlOf(task, agent));
  if (!entry) return false;
  const key = keyOfId(event_id);
  const off = entry.seen.get(key);
  if (off === undefined) return false;
  let raw;
  try { raw = fs.readFileSync(file); } catch { return false; }
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  if (off + HEADER > raw.length) return false;
  const h = headerAt(view, off);
  if (off + HEADER + h.bodyLen > raw.length) return false;
  try { return JSON.parse(decoder.decode(raw.subarray(off + HEADER, off + HEADER + h.bodyLen))).event_id === event_id; } catch { return false; }
}

// ── read ──────────────────────────────────────────────────────────────────────────────────────────
/** The task's merged log { sources: Map, events: [] } — binary files plus any un-migrated jsonl.
 *  Warm: zero parses. Cold: each body parsed exactly once per process, then kept. */
export function readBin(task) {
  stats.reads++;
  const d = dirOf(task);
  const sources = new Map(), events = [];
  if (!d || !fs.existsSync(d)) return { sources, events };
  const files = fs.readdirSync(d);
  for (const f of files.filter((x) => x.endsWith(".bin"))) {
    const entry = ensure(path.join(d, f), null);
    if (!entry) continue;
    for (const [id, r] of entry.sources) sources.set(id, r);
    for (const r of entry.events) events.push(r);
  }
  for (const f of files.filter((x) => x.endsWith(".jsonl"))) {
    if (files.includes(`${f.slice(0, -6)}.bin`)) continue; // migrated: the bin is complete
    for (const r of rowsOfJsonl(path.join(d, f))) {
      if (r.t === "src" && r.source_id) sources.set(r.source_id, r);
      else if (r.t === "evt" && r.event_id) events.push(r);
    }
  }
  events.sort((a, b) => (a.ts - b.ts) || String(a.event_id).localeCompare(String(b.event_id)));
  return { sources, events };
}

/** Header-only metadata across the task's binary logs: count, time range, per-stage counts.
 *  No body is decoded, no jsonl parsed (un-migrated jsonl is counted by a line scan of its bytes). */
export function scan(task) {
  const d = dirOf(task);
  if (!d || !fs.existsSync(d)) return { files: 0, count: 0, evts: 0, firstTs: 0, lastTs: 0, byStage: new Array(9).fill(0) };
  let files = 0, count = 0, evts = 0, firstTs = Infinity, lastTs = 0;
  const byStage = new Array(9).fill(0);
  for (const f of fs.readdirSync(d)) {
    const full = path.join(d, f);
    if (f.endsWith(".bin")) {
      const s = scanFile(full);
      if (!s) continue;
      files++;
      count += s.count; evts += s.evts;
      if (s.firstTs && s.firstTs < firstTs) firstTs = s.firstTs;
      if (s.lastTs > lastTs) lastTs = s.lastTs;
      for (let i = 0; i < 9; i++) byStage[i] += s.byStage[i];
    } else if (f.endsWith(".jsonl") && !fs.existsSync(`${full.slice(0, -6)}.bin`)) {
      files++;
      const rows = rowsOfJsonl(full);
      count += rows.length;
      for (const r of rows) if (r.t === "evt") {
        evts++;
        if (r.ts < firstTs) firstTs = r.ts;
        if (r.ts > lastTs) lastTs = r.ts;
        const o = STAGE_ORD.get(r.stage);
        if (o !== undefined && o < 9) byStage[o]++;
      }
    }
  }
  return { files, count, evts, firstTs: firstTs === Infinity ? 0 : firstTs, lastTs, byStage };
}

/** Delta read — Amino's "replay the tail" cursor. sinceSeq > 0 selects by the record's ORDINAL in the
 *  one-writer file (the padded-seq analogue: the ordinal IS the seq); otherwise events with ts >= sinceTs.
 *  Bodies decode only for the wanted records (pack.js unpackSince). { rows, decoded } — decoded is falsifiable. */
export function readSince(task, { sinceTs = 0, sinceSeq = 0 } = {}) {
  const d = dirOf(task);
  const rows = [];
  let decoded = 0;
  if (!d || !fs.existsSync(d)) return { rows, decoded };
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".bin"))) {
    let raw;
    try { raw = fs.readFileSync(path.join(d, f)); } catch { continue; }
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    let off = PREFIX, ordinal = 0;
    while (off + HEADER <= raw.length) {
      const h = headerAt(view, off);
      if (off + HEADER + h.bodyLen > raw.length) break;
      const wanted = sinceSeq > 0 ? ordinal >= sinceSeq : h.kind === KIND_SRC || h.ts >= sinceTs;
      if (wanted) {
        try { rows.push(JSON.parse(decoder.decode(raw.subarray(off + HEADER, off + HEADER + h.bodyLen)))); decoded++; } catch { /* dropped */ }
      }
      ordinal++;
      off += HEADER + h.bodyLen;
    }
  }
  return { rows, decoded };
}

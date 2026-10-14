// pinax.js — Callimachus, Layer 0: fixity. Every source version pinned by the hash of its exact bytes; every span a versioned byte address.
// Pure: no DOM, no IO, no model, no clock (the caller passes `retrievedAt`). WebCrypto SHA-256 only, the same digest record-log.js uses.
// Spec: CALLIMACHUS draft 1 (2026-10-14), §5. Increment A.
//
//   canonicalText(s)                       → the declared text form: NFC, LF newlines (UAX #15; giver below)
//   offsetMap(s)                           → a sparse map between UTF-16 units, code points and UTF-8 bytes; exact, never estimated
//   convertOffset(map, from, to, n)        → n on axis `from` as an offset on axis `to`, or null when n splits a character
//   makePinax({ url, raw, text, … })       → { entry: Pinax@1, layers: { raw: Uint8Array, text: Uint8Array } }
//   refetch(prior, args)                   → { same: true, entry } when the raw bytes did not change; else a NEW entry that `supersedes` prior
//   formatAddress / parseAddress           → `<pinax>/<layer>@<sha[0:12]>#b<start>-<end>`; a legacy `name#s-e` parses as { legacy: true }
//   upgradeLegacy(at, record)              → a legacy UTF-16 address on a record's text layer, as the versioned byte address
//   makeSpan(record, layer, start, end)    → Span@1 { sha256, head, tail, … }; a span that splits a code point is refused
//   quoteOf(span, record, { supplied })    → the quote, sliced from the stored layer; anything supplied is ignored (L4) and said so
//   archiveWitness(record, archiveRecord)  → "matches" | "differs" | "not_archived"
//   checkFixity(span, { store, current, others, archive })
//                                          → { verdict, sigil, source_axis, span_axis, at, was, … } — the two-axis table of §5.5
//
// The walls (each pinned in pinax.test.mjs):
//   BYTES ARE NEVER REWRITTEN (L3) — the raw layer is the fetched bytes; the text layer is a DERIVED layer with its own hash and its
//     extractor's hash. A refetch with different bytes is a new entry; nothing is overwritten (Arokin).
//   THE ADDRESS NAMES THE EDITION (L2) — every address carries its layer's hash prefix; an address without one is legacy and says so.
//   SAME HASH CANNOT DRIFT — under an unchanged layer hash, a span whose bytes no longer hash to its own sha256 is `address_error`: a
//     defect in this record, never a finding about the source.
//   UNREACHABLE IS NOT A REFUTATION — `unchecked`, never `altered`.
//   NO MODEL, NO SIMILARITY — the span axis is span-drift.js unchanged: exact / shifted / moved / gone.
//
// DECLARED, not measured (Constitution II.11):
//   NORMALISATION = "NFC", NEWLINES = "LF" — giver: Unicode UAX #15 (form) and the author, 2026-10-14 (choice of form). Used to parse form
//     only (L7): two encodings of one text get one text hash; nothing about what a claim is depends on it.
//   INCIPIT_BYTES = 64, SPAN_EDGE_BYTES = 16 — giver: the author, 2026-10-14 (spec §5.1, §5.4). Coarse boundary witnesses, not gates.
//   ADDRESS_HASH_HEX = 12 — giver: the author, 2026-10-14 (spec §5.3). The full hash is kept in the span record; the prefix is for reading.
//   stichometry.passages — counted as blank-line blocks until the Field chunker is wired here (`passages_by` says so).
import { driftOf } from "../the-fold/span-drift.js";

export const NORMALISATION = "NFC";
export const NEWLINES = "LF";
export const INCIPIT_BYTES = 64;
export const SPAN_EDGE_BYTES = 16;
export const ADDRESS_HASH_HEX = 12;
export const PASSAGES_BY = "blank-line blocks (Field chunker not yet wired; giver: the author, 2026-10-14)";

export const SIGLA = Object.freeze({
  intact: "⊙", revised: "↻", moved: "⇢", altered: "✕", via_archive: "◫", re_encoded: "≈", unchecked: "?", lossy: "⌁",
});

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: false });

const toBytes = (v) => (v instanceof Uint8Array ? v : typeof v === "string" ? enc.encode(v) : v instanceof ArrayBuffer ? new Uint8Array(v) : null);

export async function sha256Hex(bytes) {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", toBytes(bytes));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The declared text form: Unicode NFC, every CRLF or lone CR as LF. Form only; content is untouched. */
export function canonicalText(s) {
  return String(s ?? "").replace(/\r\n?/g, "\n").normalize(NORMALISATION);
}

// ---- offsets --------------------------------------------------------------------------------------------------------------------------

const AXES = ["u", "cp", "b"];

/**
 * A sparse offset map: one anchor before each non-ASCII code point, carrying its position on all three axes and its width on each. Between
 * anchors every character is ASCII, so the three axes advance together and the gap is exact arithmetic, never an estimate.
 */
export function offsetMap(s) {
  const text = String(s ?? "");
  const anchors = [];
  let u = 0, cp = 0, b = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0);
    const du = ch.length;
    const db = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    if (c >= 0x80) anchors.push({ u, cp, b, du, dcp: 1, db });
    u += du; cp += 1; b += db;
  }
  return { units: u, codepoints: cp, bytes: b, anchors };
}

const width = (a, axis) => (axis === "u" ? a.du : axis === "cp" ? a.dcp : a.db);

/** n on axis `from` ("u" | "cp" | "b") as an offset on axis `to`. null when n lands inside a character, or beyond the text. */
export function convertOffset(map, from, to, n) {
  if (!AXES.includes(from) || !AXES.includes(to)) throw new TypeError(`convertOffset: axes are ${AXES.join(", ")}`);
  const total = { u: map.units, cp: map.codepoints, b: map.bytes };
  if (!Number.isInteger(n) || n < 0 || n > total[from]) return null;
  const as = map.anchors;
  let lo = 0, hi = as.length - 1, k = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (as[mid][from] <= n) { k = mid; lo = mid + 1; } else hi = mid - 1; }
  if (k < 0) return n;
  const a = as[k];
  if (n === a[from]) return a[to];
  const past = n - a[from] - width(a, from);
  if (past < 0) return null;
  return a[to] + width(a, to) + past;
}

// ---- the Pinax entry ------------------------------------------------------------------------------------------------------------------

const isBoundary = (bytes, i) => i <= 0 || i >= bytes.length || (bytes[i] & 0xc0) !== 0x80;
const backToBoundary = (bytes, i) => { while (i > 0 && !isBoundary(bytes, i)) i--; return i; };
const fwdToBoundary = (bytes, i) => { while (i < bytes.length && !isBoundary(bytes, i)) i++; return i; };

function stichometry(text, bytes) {
  const lines = text === "" ? 0 : (text.match(/\n/g)?.length ?? 0) + (text.endsWith("\n") ? 0 : 1);
  const passages = text.split(/\n[ \t]*\n/).filter((p) => p.trim()).length;
  return { bytes: bytes.length, lines, passages, passages_by: PASSAGES_BY };
}

async function edgeSpan(bytes, start, end) {
  return { layer: "text", start, end, sha256: await sha256Hex(bytes.subarray(start, end)) };
}

/**
 * One Pinax@1 entry for one fetched version. `raw` is the fetched bytes (Uint8Array or string); `text` is what the extractor read from them
 * (it is canonicalised here, and the result is the text layer). `extractor` is `{ name, sha256, lossy? }`: the recipe and its own hash.
 * `retrievedAt` is supplied by the caller — this file reads no clock.
 */
export async function makePinax({ url, finalUrl = null, retrievedAt = null, fetch = null, raw, text, extractor = {}, language = null, giver = null, supersedes = null } = {}) {
  const rawBytes = toBytes(raw);
  if (!rawBytes) throw new TypeError("makePinax: `raw` is the fetched bytes (Uint8Array or string)");
  if (typeof text !== "string") throw new TypeError("makePinax: `text` is the extractor's output (a string)");
  const canon = canonicalText(text);
  const textBytes = enc.encode(canon);
  const map = offsetMap(canon);
  const rawSha = await sha256Hex(rawBytes);
  const textSha = await sha256Hex(textBytes);
  const inEnd = backToBoundary(textBytes, Math.min(INCIPIT_BYTES, textBytes.length));
  const exStart = fwdToBoundary(textBytes, Math.max(0, textBytes.length - INCIPIT_BYTES));
  const entry = {
    schema: "Pinax@1",
    id: `px_${rawSha.slice(0, 20)}`,
    url: url ?? null, final_url: finalUrl ?? url ?? null,
    retrieved_at: retrievedAt,
    fetch,
    raw: { sha256: rawSha, bytes: rawBytes.length },
    text: {
      sha256: textSha, bytes: textBytes.length, codepoints: map.codepoints,
      extractor: extractor.name ?? null, extractor_sha256: extractor.sha256 ?? null, lossy: !!extractor.lossy,
      normalisation: NORMALISATION, newlines: NEWLINES,
    },
    stichometry: stichometry(canon, textBytes),
    incipit: await edgeSpan(textBytes, 0, inEnd),
    explicit: await edgeSpan(textBytes, exStart, textBytes.length),
    language, giver,
    kind: null,
    archive: null,
    supersedes,
  };
  return { entry, layers: { raw: rawBytes, text: textBytes } };
}

/** A refetch: the same raw bytes are the same entry (nothing new is minted); different bytes are a new entry that supersedes the old. */
export async function refetch(prior, args) {
  const next = await makePinax({ ...args, supersedes: prior?.entry?.id ?? null });
  if (prior && next.entry.raw.sha256 === prior.entry.raw.sha256) return { same: true, ...prior };
  return { same: false, ...next };
}

// ---- addresses ------------------------------------------------------------------------------------------------------------------------

const VERSIONED = /^(px_[0-9a-f]+)\/(raw|text)@([0-9a-f]+)#b(\d+)-(\d+)$/;
const LEGACY = /^(.+?)#(\d+)-(\d+)$/;

export function formatAddress({ pinax, layer, layerSha256, start, end }) {
  return `${pinax}/${layer}@${String(layerSha256).slice(0, ADDRESS_HASH_HEX)}#b${start}-${end}`;
}

/** A versioned address as its parts; a legacy `name#start-end` as `{ legacy: true, … }` (UTF-16 units, no edition); else a typed gap. */
export function parseAddress(at) {
  const s = String(at ?? "");
  const v = s.match(VERSIONED);
  if (v) return { ok: true, legacy: false, pinax: v[1], layer: v[2], hash: v[3], start: Number(v[4]), end: Number(v[5]) };
  const l = s.match(LEGACY);
  if (l) return { ok: true, legacy: true, source: l[1], start: Number(l[2]), end: Number(l[3]), units: "utf16", detail: "legacy address: no edition hash, UTF-16 offsets" };
  return { ok: false, gap: { type: "address_malformed", at: s } };
}

const layerOf = (record, layer) => record?.layers?.[layer] ?? null;
const layerSha = (record, layer) => record?.entry?.[layer]?.sha256 ?? null;

/**
 * A legacy UTF-16 address, upgraded exactly onto a record's text layer. Only when `legacyText` (the string the legacy offsets counted in)
 * IS the canonical text layer; offsets into some other string cannot be carried across, and that is a typed gap, never a guess.
 */
export async function upgradeLegacy(at, record, { legacyText } = {}) {
  const p = parseAddress(at);
  if (!p.ok) return p;
  if (!p.legacy) return { ok: true, at, already: true };
  const canon = dec.decode(layerOf(record, "text"));
  if (typeof legacyText === "string" && legacyText !== canon) {
    return { ok: false, gap: { type: "legacy_text_not_layer", at, detail: "the legacy offsets count a string that is not this record's canonical text layer" } };
  }
  const map = offsetMap(canon);
  const start = convertOffset(map, "u", "b", p.start), end = convertOffset(map, "u", "b", p.end);
  if (start == null || end == null || end < start) return { ok: false, gap: { type: "address_beyond_source", at, detail: "the legacy offsets fall outside the layer or inside a character" } };
  const span = await makeSpan(record, "text", start, end);
  return span.ok === false ? span : { ok: true, at: span.address, was: at, span };
}

/** A Span@1 over a stored layer. Offsets are UTF-8 bytes and must sit on code point boundaries. */
export async function makeSpan(record, layer, start, end) {
  const bytes = layerOf(record, layer);
  if (!bytes) return { ok: false, gap: { type: "layer_absent", layer } };
  if (!(Number.isInteger(start) && Number.isInteger(end) && 0 <= start && start <= end && end <= bytes.length)) {
    return { ok: false, gap: { type: "address_beyond_source", layer, start, end, length: bytes.length } };
  }
  if (layer === "text" && (!isBoundary(bytes, start) || !isBoundary(bytes, end))) {
    return { ok: false, gap: { type: "span_splits_codepoint", layer, start, end } };
  }
  const sha = layerSha(record, layer);
  const slice = bytes.subarray(start, end);
  const headEnd = layer === "text" ? backToBoundary(slice, Math.min(SPAN_EDGE_BYTES, slice.length)) : Math.min(SPAN_EDGE_BYTES, slice.length);
  const tailStart = layer === "text" ? fwdToBoundary(slice, Math.max(0, slice.length - SPAN_EDGE_BYTES)) : Math.max(0, slice.length - SPAN_EDGE_BYTES);
  return {
    schema: "Span@1",
    pinax: record.entry.id, layer, layer_sha256: sha, start, end,
    sha256: await sha256Hex(slice),
    head: dec.decode(slice.subarray(0, headEnd)), tail: dec.decode(slice.subarray(tailStart)),
    address: formatAddress({ pinax: record.entry.id, layer, layerSha256: sha, start, end }),
  };
}

/** L4: a quote is copied, never typed. The stored layer is sliced at the span; a `supplied` string is ignored, and the result says whether
 *  it would have differed. A span whose bytes no longer hash to its own sha256 yields no quote. */
export async function quoteOf(span, record, { supplied } = {}) {
  const bytes = layerOf(record, span?.layer);
  if (!bytes || record.entry.id !== span.pinax) return { ok: false, gap: { type: "source_absent", pinax: span?.pinax } };
  const slice = bytes.subarray(span.start, span.end);
  if ((await sha256Hex(slice)) !== span.sha256) return { ok: false, gap: { type: "address_error", at: span.address } };
  const text = dec.decode(slice);
  return { ok: true, text, supplied_ignored: supplied !== undefined, supplied_differs: supplied !== undefined && supplied !== text };
}

/** The archive copy as a second witness of the text: extracted by the same recipe, compared by text hash. */
export function archiveWitness(record, archiveRecord) {
  if (!archiveRecord?.entry) return "not_archived";
  return archiveRecord.entry.text.sha256 === record.entry.text.sha256 ? "matches" : "differs";
}

// ---- the two-axis verdict (§5.5) ------------------------------------------------------------------------------------------------------

const sigilFor = (verdict, { viaArchive, lossy }) => (viaArchive ? SIGLA.via_archive : SIGLA[verdict] ?? "") + (lossy ? SIGLA.lossy : "");

async function spanAt(bytes, start, end) {
  if (!bytes || end > bytes.length) return null;
  return sha256Hex(bytes.subarray(start, end));
}

/**
 * Check a span against the source as it stands now.
 *   store    — { [pinaxId]: record } every version this record holds (the span's own version must be there; the record is append-only)
 *   current  — the record for the latest fetch of the span's source, or null when the source was unreachable this check
 *   others   — current records of OTHER sources, where the words may have moved
 *   archive  — the archive.org record for the span's own version, if one was taken
 */
export async function checkFixity(span, { store = {}, current = null, others = [], archive = null } = {}) {
  const was = span.address;
  const own = store[span.pinax];
  const lossy = !!own?.entry?.text?.lossy;
  const done = (verdict, extra = {}) => ({ verdict, sigil: sigilFor(verdict, { viaArchive: !!extra.via_archive, lossy }), was, ...extra });

  // The archive witness can still show the span when the live page cannot: its text layer must be the span's own layer, byte for byte.
  const viaArchive = async () => {
    if (!archive || span.layer !== "text" || archive.entry.text.sha256 !== span.layer_sha256) return false;
    return (await spanAt(archive.layers.text, span.start, span.end)) === span.sha256;
  };

  if (!current) {
    const va = await viaArchive();
    return done("unchecked", { source_axis: "unreachable", span_axis: null, at: was, ...(va ? { via_archive: true } : {}) });
  }

  const sameRaw = current.entry.raw.sha256 === own?.entry?.raw?.sha256;
  const sameLayer = layerSha(current, span.layer) === span.layer_sha256;

  if (sameLayer) {
    const ok = (await spanAt(layerOf(current, span.layer), span.start, span.end)) === span.sha256;
    if (!ok) return done("address_error", { source_axis: "same", span_axis: "mismatch", at: was, defect: "callimachus", detail: "the layer hash is unchanged but the span's bytes do not hash to its own sha256: this record is wrong, not the source" });
    if (!sameRaw) return done("re_encoded", { source_axis: "re_encoded", span_axis: "exact", at: formatAddress({ pinax: current.entry.id, layer: span.layer, layerSha256: span.layer_sha256, start: span.start, end: span.end }) });
    return done("intact", { source_axis: "same", span_axis: "exact", at: was });
  }

  // The layer changed. Relocate the cited words with span-drift, unchanged; offsets cross into UTF-16 for it and back to bytes after.
  if (span.layer !== "text") return done("altered", { source_axis: "changed", span_axis: "unrelocatable", at: null, detail: "raw-layer spans are not relocated; only the text layer is" });
  if (!own) return done("unchecked", { source_axis: "changed", span_axis: null, at: was, gap: { type: "version_absent", pinax: span.pinax, detail: "the span's own version is not in the store, so its words cannot be read to relocate" } });
  const ownText = dec.decode(own.layers.text);
  const ownMap = offsetMap(ownText);
  const cited = dec.decode(own.layers.text.subarray(span.start, span.end));
  const curId = current.entry.id;
  const sources = { [curId]: dec.decode(current.layers.text) };
  const byId = { [curId]: current };
  for (const o of others) { if (o?.entry && o.entry.id !== curId) { sources[o.entry.id] = dec.decode(o.layers.text); byId[o.entry.id] = o; } }
  const us = convertOffset(ownMap, "b", "u", span.start), ue = convertOffset(ownMap, "b", "u", span.end);
  const d = driftOf({ address: `${curId}#${us}-${ue}`, text: cited }, sources);

  if (d.kind === "gone") {
    const va = await viaArchive();
    return done("altered", { source_axis: "changed", span_axis: "gone", at: null, gap: d.gap, ...(va ? { via_archive: true } : {}) });
  }
  const holder = byId[d.kind === "exact" ? curId : d.source];
  const hMap = offsetMap(sources[holder.entry.id]);
  const [hs, he] = d.kind === "exact" ? [us, ue] : [d.start, d.end];
  const bs = convertOffset(hMap, "u", "b", hs), be = convertOffset(hMap, "u", "b", he);
  const fresh = await makeSpan(holder, "text", bs, be);
  const verdict = d.kind === "moved" ? "moved" : "revised";
  return done(verdict, { source_axis: "changed", span_axis: d.kind, at: fresh.address, span: fresh, ...(d.ambiguous ? { ambiguous: true, candidates: d.candidates } : {}) });
}

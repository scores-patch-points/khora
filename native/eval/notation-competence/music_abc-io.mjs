// eval/notation-competence/music_abc-io.mjs — corpus access for the music card. Reads the manifest the prep scripts wrote and
// turns a manifest entry into text (an .mxl is a zip: container.xml names the score). Pure node, no dependencies. Nothing here
// knows a prior, a rung or the adapter; it is data plumbing shared by the prior builder and the instrument.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";

export const CORPUS_DIR = process.env.MUSIC_ABC_DIR || "/private/tmp/claude-501/notation/music_abc";

export function loadManifest() {
  const p = path.join(CORPUS_DIR, "manifest.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** Entry file (absolute). */
export const entryPath = (e) => (e.absolute ? e.file : path.join(CORPUS_DIR, e.file));

/** Minimal zip reader: the named entry of a zip buffer, or null. */
export function zipEntry(buf, name) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) return null;
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return null;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const nm = buf.toString("utf8", p + 46, p + 46 + nlen);
    if (nm === name) {
      const ln = buf.readUInt16LE(off + 26), le = buf.readUInt16LE(off + 28);
      const data = buf.subarray(off + 30 + ln + le, off + 30 + ln + le + csize);
      return method === 0 ? data : zlib.inflateRawSync(data);
    }
    p += 46 + nlen + elen + clen;
  }
  return null;
}
function zipNames(buf) {
  const out = [];
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) return out;
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < n; k++) {
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    out.push(buf.toString("utf8", p + 46, p + 46 + nlen)); p += 46 + nlen + elen + clen;
  }
  return out;
}

/** The text of a manifest entry. `.mxl` is unzipped. Returns null when unreadable (a typed gap for the caller, never a throw). */
export function loadText(e) {
  try {
    const buf = fs.readFileSync(entryPath(e));
    if (e.file.endsWith(".mxl")) {
      const c = zipEntry(buf, "META-INF/container.xml");
      let root = null;
      if (c) { const m = /full-path="([^"]+)"/.exec(c.toString("utf8")); root = m ? m[1] : null; }
      if (!root) root = zipNames(buf).find((n) => /\.(xml|musicxml)$/i.test(n) && !n.startsWith("META-INF")) ?? null;
      const d = root ? zipEntry(buf, root) : null;
      return d ? d.toString("utf8") : null;
    }
    return buf.toString("utf8");
  } catch { return null; }
}

/** A negative read in place (an installed file) records sha256 of its first 4096 bytes: false when the file on disk drifted or vanished (the card counts it as a typed gap). */
export function verifyEntry(e) {
  if (!e.head_sha256) return true;
  try {
    const fd = fs.openSync(entryPath(e), "r");
    try { const b = Buffer.alloc(4096); const n = fs.readSync(fd, b, 0, 4096, 0); return createHash("sha256").update(b.subarray(0, n)).digest("hex") === e.head_sha256; } finally { fs.closeSync(fd); }
  } catch { return false; }
}

/** Slug used by the gold files: "src:hash" -> "src__hash". */
export const slug = (id) => id.replace(/:/g, "__");

export function loadGoldEvents(id) {
  const p = path.join(CORPUS_DIR, "gold/event", slug(id) + ".json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}
export function loadGoldLex(id) {
  const p = path.join(CORPUS_DIR, "gold/lex", slug(id) + ".json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}
export function loadGoldAbcLex(id) {
  const p = path.join(CORPUS_DIR, "gold/abclex", slug(id) + ".json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}
export function loadGoldLy(id) {
  const p = path.join(CORPUS_DIR, "gold/lylex", slug(id) + ".json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}

let _structure;
/** derived/structure.json (scripts/validate_structure.mjs): the abcjs structural certification of the derived ABC gold, or null when absent. */
export function loadStructure() {
  if (_structure !== undefined) return _structure;
  const p = path.join(CORPUS_DIR, "derived/structure.json");
  try { _structure = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; } catch { _structure = null; }
  return _structure;
}

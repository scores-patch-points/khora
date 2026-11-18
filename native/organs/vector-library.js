// vector-library.js — a library of embeddings, computed once and kept (the substrate of semantic smells).
//
// One BINARY file per (model digest, prefix): an append-only log of fixed-size records, so a vector is never embedded twice and a save is an append, not a rewrite.
//   header  : "KVL1" | uint32 dim | uint32 keyLen (32) | 16 bytes of the model digest | uint32 prefix byte length | prefix bytes (utf8)
//   record  : 32-byte sha256 key of (digest \0 prefix \0 text) | dim x float32 (little-endian, L2-normalised)
// Opening scans the file once into a key -> offset index; a torn last record (a crash mid-append) is ignored and overwritten by the next append.
// `embedAll(texts)` embeds only the texts the library has never seen, in parallel batches through an injected `embedder(texts) -> number[][]` (the library holds no model).
// Derived data: it belongs next to the priors (KHORA_VECTORS_DIR, default ~/.khora/vectors, outside every repo), with its model and prefix in its own header; it is never committed.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import os from "node:os";
const MAGIC = "KVL1"; const KEY = 32;
export const vectorsDir = () => process.env.KHORA_VECTORS_DIR || path.join(os.homedir(), ".khora", "vectors");
export const keyOf = (digest, prefix, text) => crypto.createHash("sha256").update(`${digest}\0${prefix}\0${text}`).digest();
const norm = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; const o = new Float32Array(v.length); for (let i = 0; i < v.length; i++) o[i] = v[i] / n; return o; };

/** openLibrary({ file, digest, prefix = "", dim }) -> { get, has, put, flush, embedAll, size, dim, file }. `dim` is required to create the file, read back from the header otherwise.
 *  Several processes may share one file: an append is made under a lock file, after re-reading whatever another process appended meanwhile. */
export function openLibrary({ file, digest, prefix = "", dim = null }) {
  if (!file || !digest) throw new TypeError("openLibrary: a file and the model digest are required (a vector without its model is meaningless)");
  const dg = crypto.createHash("sha256").update(String(digest)).digest().subarray(0, 16); const pre = Buffer.from(prefix, "utf8");
  let D = dim, buf = null, index = new Map(), end = 0; const pending = new Map(); // hex -> { k, v }
  const header = (d) => { const h = Buffer.alloc(4 + 4 + 4 + 16 + 4 + pre.length); h.write(MAGIC, 0, "latin1"); h.writeUInt32LE(d, 4); h.writeUInt32LE(KEY, 8); dg.copy(h, 12); h.writeUInt32LE(pre.length, 28); pre.copy(h, 32); return h; };
  const load = () => { // (re)read the file: header, index, end; a torn last record is dropped
    buf = fs.readFileSync(file); if (buf.toString("latin1", 0, 4) !== MAGIC) throw new Error("vector-library: not a KVL1 file: " + file);
    D = buf.readUInt32LE(4); if (!buf.subarray(12, 28).equals(dg)) throw new Error("vector-library: this file was built with a different model digest");
    const pl = buf.readUInt32LE(28); if (!buf.subarray(32, 32 + pl).equals(pre)) throw new Error("vector-library: this file was built with a different prefix");
    const rec = KEY + 4 * D; let off = 32 + pl; index = new Map(); while (off + rec <= buf.length) { index.set(buf.subarray(off, off + KEY).toString("hex"), off + KEY); off += rec; } end = off; return off < buf.length; };
  if (fs.existsSync(file) && fs.statSync(file).size > 0) { if (load()) fs.truncateSync(file, end); }
  else { if (!D) throw new TypeError("openLibrary: dim is required to create a new library"); fs.mkdirSync(path.dirname(file), { recursive: true }); const h = header(D); fs.writeFileSync(file, h); buf = h; end = h.length; }
  const rec = () => KEY + 4 * D;
  const vecAt = (off) => new Float32Array(buf.buffer.slice(buf.byteOffset + off, buf.byteOffset + off + 4 * D));
  const get = (text) => { const hex = keyOf(digest, prefix, text).toString("hex"); const p = pending.get(hex); if (p) return p.v; const off = index.get(hex); return off === undefined ? undefined : vecAt(off); };
  const has = (text) => { const hex = keyOf(digest, prefix, text).toString("hex"); return pending.has(hex) || index.has(hex); };
  const withLock = (fn) => { const lock = file + ".lock"; let fd = -1; for (let i = 0; i < 6000; i++) { try { fd = fs.openSync(lock, "wx"); break; } catch (e) { if (e.code !== "EEXIST") throw e; try { if (Date.now() - fs.statSync(lock).mtimeMs > 60000) fs.unlinkSync(lock); } catch {} Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); } } if (fd < 0) throw new Error("vector-library: could not take the lock on " + file); try { return fn(); } finally { fs.closeSync(fd); try { fs.unlinkSync(lock); } catch {} } };
  const flush = () => { if (!pending.size) return; withLock(() => { if (fs.statSync(file).size !== end) { const torn = load(); if (torn) fs.truncateSync(file, end); }
    const fresh = [...pending].filter(([hex]) => !index.has(hex)); if (fresh.length) { const out = Buffer.alloc(fresh.length * rec()); fresh.forEach(([, p], i) => { p.k.copy(out, i * rec()); Buffer.from(p.v.buffer, p.v.byteOffset, p.v.byteLength).copy(out, i * rec() + KEY); }); fs.appendFileSync(file, out); load(); } pending.clear(); }); };
  const put = (text, v) => { const k = keyOf(digest, prefix, text); const hex = k.toString("hex"); if (pending.has(hex) || index.has(hex)) return; if (v.length !== D) throw new Error(`vector-library: dim ${v.length} != ${D}`); pending.set(hex, { k, v: norm(v) }); if (pending.size >= 256) flush(); };
  /** embedAll(texts, { embedder, batch = 64, concurrency = 3 }) -> Float32Array[] in the order of `texts`; only the unseen are embedded */
  async function embedAll(texts, { embedder, batch = 64, concurrency = 3 } = {}) {
    const need = [...new Set(texts.filter((t) => !has(t)))];
    if (need.length) { if (typeof embedder !== "function") throw new TypeError("vector-library: unseen texts need an embedder"); const batches = []; for (let i = 0; i < need.length; i += batch) batches.push(need.slice(i, i + batch)); let next = 0;
      await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, async () => { while (next < batches.length) { const b = batches[next++]; const vs = await embedder(b); if (vs.length !== b.length) throw new Error("vector-library: the embedder returned a different number of vectors"); b.forEach((t, i) => put(t, Float32Array.from(vs[i]))); } })); flush(); }
    return texts.map((t) => get(t));
  }
  return { get, has, put, flush, embedAll, get size() { return index.size + pending.size; }, get dim() { return D; }, file };
}

// gold.mjs: node wrapper around gold.py (the programming-language GOLD EXTRACTOR, see gold.py's header).
//
//   import { goldFor, goldBatch, goldAvailable } from "./gold.mjs";
//   const g = await goldFor({ language: "python", text, fileName: "x.py" });
//
// Independent authority = tree-sitter grammars via the language pack in a python venv. No model, no network at
// call time (a grammar missing from the local cache is downloaded once by gold.py). Gold is cached on disk by
// sha256(gold version, hash of gold.py, package versions, language, fileName, text): an upgrade of the grammar
// pack or any edit to the extractor invalidates it. All offsets in the result are UTF-16 code units: text.slice(start, end) works.
//
// Environment: GOLD_PYTHON (default /private/tmp/claude-501/venv/bin/python), GOLD_CACHE_DIR (default
// /private/tmp/claude-501/coding-competence/gold-cache), GOLD_TS_CACHE (the grammar cache, read by gold.py).
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const GOLD_VERSION = "gold-1";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const GOLD_PY = path.join(HERE, "gold.py");
export const PYTHON = process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python";
export const CACHE_DIR = process.env.GOLD_CACHE_DIR || "/private/tmp/claude-501/coding-competence/gold-cache";
export const FIXTURE_DIR = path.join(HERE, "fixtures");
export const CLASSES = ["keyword", "identifier", "literal", "operator", "punctuation", "comment", "string", "type", "other"];
// R3 "beings" vs value-level declarations (single source: gold.py CORE_KINDS / SECONDARY_KINDS; a test pins equality)
export const CORE_DEF_KINDS = ["function", "method", "class", "interface", "type", "enum", "variant", "module", "macro", "table", "view",
  "index", "sequence", "schema", "trigger", "event", "theorem", "paragraph"];
export const SECONDARY_DEF_KINDS = ["constant", "variable", "property", "field", "label", "section", "id", "anchor", "keyframes"];

let _avail = null;

/** Synchronous, memoised: can the extractor run here? -> { available, reason?, python, versions?, languages? } */
export function goldAvailable() {
  if (_avail) return _avail;
  if (!fs.existsSync(PYTHON)) {
    return (_avail = { available: false, python: PYTHON, reason: `python venv not found at ${PYTHON} (set GOLD_PYTHON)` });
  }
  const r = spawnSync(PYTHON, [GOLD_PY, "check"], { encoding: "utf8", timeout: 60000, maxBuffer: 1 << 24 });
  if (r.status !== 0) {
    const why = (r.stderr || r.stdout || r.error?.message || "").toString().trim().split("\n").slice(-2).join(" | ");
    return (_avail = { available: false, python: PYTHON, reason: `gold.py check failed: ${why || "exit " + r.status}` });
  }
  let info;
  try { info = JSON.parse(r.stdout.trim().split("\n").pop()); } catch { info = null; }
  if (!info?.ok) return (_avail = { available: false, python: PYTHON, reason: "gold.py check gave no ok" });
  return (_avail = { available: true, python: PYTHON, versions: info.versions, languages: info.languages, goldVersion: info.gold_version,
    coreKinds: info.core_kinds, secondaryKinds: info.secondary_kinds });
}

function unavailable() {
  const a = goldAvailable();
  if (a.available) return null;
  const e = new Error(`gold extractor unavailable: ${a.reason}`);
  e.code = "GOLD_UNAVAILABLE";
  return e;
}

// the extractor's own source is part of the key: any change to gold.py invalidates every cached gold
const SRC_HASH = crypto.createHash("sha256").update(fs.readFileSync(GOLD_PY)).digest("hex").slice(0, 16);

export function cacheKey({ language, text, fileName }) {
  const a = goldAvailable();
  const h = crypto.createHash("sha256");
  h.update(GOLD_VERSION + "\0" + SRC_HASH + "\0" + JSON.stringify(a.versions || {}) + "\0" + (language || "") + "\0" + (fileName || "") + "\0");
  h.update(text);
  return h.digest("hex");
}

function cachePath(key) { return path.join(CACHE_DIR, key.slice(0, 2), key + ".json"); }

function cacheGet(key) {
  try { return JSON.parse(fs.readFileSync(cachePath(key), "utf8")); } catch { return null; }
}

function cachePut(key, obj) {
  try {
    const p = cachePath(key);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = `${p}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(obj));
    fs.renameSync(tmp, p);
  } catch { /* the cache is a convenience, never a requirement */ }
}

/** Run requests through ONE python process (JSONL in, JSONL out). -> Promise<Map(id -> {gold|error})> */
function runJsonl(requests) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [GOLD_PY, "serve"], { stdio: ["pipe", "pipe", "pipe"] });
    const chunks = [];
    let err = "";
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => { err += c.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      const out = new Map();
      const lines = Buffer.concat(chunks).toString("utf8").split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        let o;
        try { o = JSON.parse(line); } catch { continue; }
        out.set(o.id, o);
      }
      if (code !== 0 && out.size < requests.length) return reject(new Error(`gold.py exited ${code}: ${err.trim().split("\n").slice(-3).join(" | ")}`));
      resolve(out);
    });
    for (const r of requests) child.stdin.write(JSON.stringify(r) + "\n");
    child.stdin.end();
  });
}

function normalise(item) {
  if (typeof item?.text !== "string") throw new TypeError("goldFor: text must be a string");
  if (!item.language && !item.fileName) throw new TypeError("goldFor: give language or fileName");
  return { language: item.language || null, text: item.text, fileName: item.fileName || null };
}

/**
 * Gold for one file. -> Promise<Gold> (shape in gold.py's header). Rejects with code GOLD_UNAVAILABLE when the
 * python toolchain is absent, and with the extractor's message when the language cannot be resolved.
 * opts.cache = false bypasses the disk cache.
 */
export async function goldFor(item, opts = {}) {
  const u = unavailable();
  if (u) throw u;
  const it = normalise(item);
  const key = cacheKey(it);
  if (opts.cache !== false) {
    const hit = cacheGet(key);
    if (hit) return hit;
  }
  const res = (await runJsonl([{ id: 0, ...it }])).get(0);
  if (!res || res.error) {
    const e = new Error(res?.error || "gold.py returned nothing");
    e.code = (res?.error || "").split(":")[0] || "GOLD_ERROR";
    throw e;
  }
  if (opts.cache !== false) cachePut(key, res.gold);
  return res.gold;
}

/**
 * Gold for many files through one python process. -> Promise<Array<Gold | {error}>> in input order. A request
 * the extractor cannot serve is { error } (never thrown), so one bad language does not lose the batch.
 */
export async function goldBatch(items, opts = {}) {
  const u = unavailable();
  if (u) throw u;
  const its = items.map(normalise);
  const keys = its.map(cacheKey);
  const out = new Array(its.length);
  const todo = [];
  its.forEach((it, i) => {
    const hit = opts.cache === false ? null : cacheGet(keys[i]);
    if (hit) out[i] = hit; else todo.push(i);
  });
  const CHUNK = opts.chunk || 40;
  for (let s = 0; s < todo.length; s += CHUNK) {
    const part = todo.slice(s, s + CHUNK);
    const res = await runJsonl(part.map((i) => ({ id: i, ...its[i] })));
    for (const i of part) {
      const r = res.get(i);
      if (!r || r.error) { out[i] = { error: r?.error || "gold.py returned nothing" }; continue; }
      out[i] = r.gold;
      if (opts.cache !== false) cachePut(keys[i], r.gold);
    }
  }
  return out;
}

/** The languages gold.py maps (name -> extensions) and its aliases. */
export async function goldLanguages() {
  const u = unavailable();
  if (u) throw u;
  const r = spawnSync(PYTHON, [GOLD_PY, "languages"], { encoding: "utf8", maxBuffer: 1 << 24 });
  return JSON.parse(r.stdout.trim().split("\n").pop());
}

/** Is a def kind a "being" for R3 (core) rather than a value-level declaration? */
export function isCoreKind(kind) { return CORE_DEF_KINDS.includes(kind); }

/** Slice helper: the text of a gold span (UTF-16 offsets). */
export function sliceOf(text, a, b) { return text.slice(a, b); }

// CLI: node gold.mjs LANG FILE  -> prints the gold JSON
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [lang, file] = process.argv.slice(2);
  if (!file) { console.error("usage: node gold.mjs LANG|- FILE"); process.exit(2); }
  const text = fs.readFileSync(file, "utf8");
  goldFor({ language: lang === "-" ? null : lang, text, fileName: path.basename(file) })
    .then((g) => { console.log(JSON.stringify(g)); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}

// native/eval/weft/watch.mjs — a browser tab onto the corpus weft build (aggregates ALL shards). Read-only.
//
//   node native/eval/weft/watch.mjs [--port 8890]
//
// Reads every `weft.jsonl` / `weft.<i>.jsonl` in this dir (streamed incrementally), every `*.progress.json`,
// and the supervisor log. Serves `/` (auto-refreshing), `/status.json`, `/quality.json`. No writes.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const port = (() => { const i = process.argv.indexOf("--port"); return i >= 0 ? Number(process.argv[i + 1]) : Number(process.env.WEFT_PORT || 8890); })();
const shardFiles = () => { try { return fs.readdirSync(HERE).filter((f) => /^weft(\.[0-9]+)?\.jsonl$/.test(f)).map((f) => path.join(HERE, f)).sort(); } catch { return []; } };
const progressFiles = () => { try { return fs.readdirSync(HERE).filter((f) => /^weft.*\.progress\.json$/.test(f)).map((f) => path.join(HERE, f)); } catch { return []; } };
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const rss0 = () => 0;

// ── QUALITY (intrinsic, live): streamed incrementally from every shard file. Proxies, not gold.
const CLOSED = new Set(["a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by", "from", "as", "is", "was", "were", "be", "been", "are", "he", "she", "it", "they", "his", "her", "its", "that", "this", "which", "who", "had", "has", "have", "not", "de", "la", "el", "los", "las", "y", "que", "il", "lo", "le", "les", "et", "der", "die", "das", "und"]);
const isNamed = (s) => { const t = String(s ?? "").trim().replace(/^[^\p{L}]+/u, ""); return t.length > 0 && !CLOSED.has(t.toLowerCase()) && /^\p{Lu}/u.test(t); };
const offsets = new Map();
const q = { docs: 0, chars: 0, errors: 0, skipped: 0, cast: 0, castNamed: 0, rel: 0, ends: 0, boundEnds: 0, rebound: 0, gaps: {}, langs: {}, recent: [] };
function pumpFile(f) {
  let fd; try { fd = fs.openSync(f, "r"); } catch { return; }
  let size = 0; try { size = fs.fstatSync(fd).size; } catch { fs.closeSync(fd); return; }
  const off = offsets.get(f) || 0;
  if (size <= off) { fs.closeSync(fd); return; }
  const buf = Buffer.alloc(size - off);
  try { fs.readSync(fd, buf, 0, buf.length, off); } finally { fs.closeSync(fd); }
  const text = buf.toString("utf8");
  const cut = text.lastIndexOf("\n");
  if (cut < 0) return;
  offsets.set(f, off + Buffer.byteLength(text.slice(0, cut + 1), "utf8"));
  for (const l of text.slice(0, cut).split("\n")) {
    if (!l) continue; let d; try { d = JSON.parse(l); } catch { continue; }
    q.docs += 1; q.chars += d.readCharacters || 0;
    if (d.error) q.errors += 1; if (d.skipped) q.skipped += 1;
    for (const g of d.gaps ?? []) { const k = String(g).split(":")[0]; q.gaps[k] = (q.gaps[k] ?? 0) + 1; }
    q.langs[d.language || "undetected"] = (q.langs[d.language || "undetected"] ?? 0) + 1;
    let dn = 0; const cast = d.cast ?? [];
    for (const c of cast) { q.cast += 1; if (isNamed(c.surface)) { q.castNamed += 1; dn += 1; } }
    let de = 0, db = 0;
    for (const r of d.relations ?? []) { q.rel += 1; for (const p of r.participants ?? []) { q.ends += 1; de += 1; if (p.standing === "referent") { q.boundEnds += 1; db += 1; } if (String(p.resolution || "").startsWith("rebound")) q.rebound += 1; } }
    if (d.vocabulary?.grammarPrior) q.primed = (q.primed ?? 0) + 1;
    for (const e of d.edges ?? []) {                       // the REAL reader's shape (engineRelationsFor)
      q.rel += 1; q.ends += 2; q.boundEnds += 2; de += 2; db += 2;
      for (const s of [e.end1Face ?? e.end1, e.end2Face ?? e.end2]) if (s) { q.cast += 1; if (isNamed(s)) { q.castNamed += 1; dn += 1; } }
    }
    const nEdges = (d.edges ?? []).length;
    q.recent.push({ address: (d.address || "") + (d.chunkStart ? `#${d.chunkStart}` : ""), lang: d.language || "-", cast: cast.length + nEdges * 2, named: dn, rel: (d.relations ?? []).length + nEdges, bound: de ? +(db / de).toFixed(2) : null, primed: !!(d.vocabulary?.grammarPrior), err: d.error ?? null });
    if (q.recent.length > 14) q.recent.shift();
  }
}
const quality = () => ({ docs: q.docs, charsRead: q.chars, cast: q.cast, castNameShare: q.cast ? +(q.castNamed / q.cast).toFixed(3) : null, relations: q.rel, ends: q.ends, boundShare: q.ends ? +(q.boundEnds / q.ends).toFixed(3) : null, rebound: q.rebound, primed: q.primed ?? 0, relationsPerKChar: q.chars ? +(q.rel / (q.chars / 1000)).toFixed(2) : null, errors: q.errors, skipped: q.skipped, gaps: q.gaps, langs: q.langs, recent: q.recent });

// ── PROGRESS (aggregate all shards)
function progress() {
  const ps = progressFiles().map(readJson).filter(Boolean);
  const a = { total: 0, done: 0, remaining: 0, readThisRun: 0, errors: 0, skipped: 0, chars: 0, elapsedSec: 0, perSec: 0, running: false, finished: ps.length > 0, out: `${ps.length} shard(s)`, cap: ps[0]?.cap ?? "-", current: null, updated: null, shards: ps.length };
  for (const p of ps) {
    a.total += p.total || 0; a.done += p.done || 0; a.remaining += p.remaining || 0; a.readThisRun += p.readThisRun || 0;
    a.errors += p.errors || 0; a.skipped += p.skipped || 0; a.chars += p.chars || 0;
    a.elapsedSec = Math.max(a.elapsedSec, p.elapsedSec || 0);
    if (p.current && (!a.current)) a.current = p.current;
    if (p.updated && (!a.updated || p.updated > a.updated)) a.updated = p.updated;
    if (p.finished === false) a.finished = false;
    try { process.kill(p.pid, 0); a.running = true; } catch { /* not running */ }
  }
  a.perSec = a.elapsedSec > 0 ? +(a.readThisRun / a.elapsedSec).toFixed(2) : 0;
  a.etaSec = a.perSec > 0 ? Math.round(a.remaining / a.perSec) : null;
  return a;
}
const tail = (p, n = 10) => { try { return fs.readFileSync(p, "utf8").split("\n").slice(-n).join("\n"); } catch { return ""; } };
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const fmt = (s) => s == null ? "-" : s >= 3600 ? `${(s / 3600).toFixed(1)}h` : s >= 60 ? `${Math.round(s / 60)}m` : `${s}s`;
function status() { shardFiles().forEach(pumpFile); const p = progress(); return { ...p, now: new Date().toISOString(), logTail: tail(path.join(HERE, "supervisor.log"), 10), quality: quality() }; }
function page() {
  const s = status();
  const pct = s.total ? ((s.done / s.total) * 100).toFixed(1) : "0";
  return `<!doctype html><meta charset=utf-8><title>weft · ${pct}%</title><meta http-equiv=refresh content=5>
<style>body{background:#0b0e13;color:#cdd6e0;font:14px/1.5 ui-monospace,Menlo,monospace;margin:0;padding:24px}h1{font-size:16px;color:#7fd1ff;margin:18px 0 4px}big{font-size:44px;color:#e8f0f8}.bar{background:#1a2230;height:22px;border-radius:4px;overflow:hidden;margin:14px 0}.fill{background:linear-gradient(90deg,#2b6,#5ec);height:100%}table{border-collapse:collapse;margin:10px 0}td{padding:2px 16px 2px 0;color:#9fb0c0}td.v{color:#e8f0f8}pre{background:#111722;padding:12px;border-radius:6px;overflow:auto;color:#8fa3b8;max-height:260px}.k{color:#7fd1ff}</style>
<h1>THE WEFT ${s.running ? "<span style=color:#5ec>· running</span>" : s.finished ? "<span style=color:#5ec>· DONE</span>" : "<span style=color:#e66>· stopped</span>"}</h1>
<div><big>${pct}%</big> <span class=k>${s.done} / ${s.total}</span> documents</div>
<div class=bar><div class=fill style="width:${pct}%"></div></div>
<table>
<tr><td>shards</td><td class=v>${s.shards}</td><td>rate</td><td class=v>${s.perSec}/s</td><td>ETA</td><td class=v>${fmt(s.etaSec)}</td></tr>
<tr><td>remaining</td><td class=v>${s.remaining}</td><td>errors</td><td class=v>${s.errors}</td><td>skipped</td><td class=v>${s.skipped}</td></tr>
<tr><td>elapsed</td><td class=v>${fmt(s.elapsedSec)}</td><td>cap</td><td class=v>${s.cap}</td><td>updated</td><td class=v>${s.updated || "-"}</td></tr>
<tr><td>current</td><td class=v colspan=5>${esc(s.current) || "-"}</td></tr>
</table>
<h1>READING QUALITY <span class=k>(proxies — gold is the competence ladder r0–r5)</span></h1>
<table>
<tr><td>docs read</td><td class=v>${s.quality.docs}</td><td>cast</td><td class=v>${s.quality.cast}</td><td>cap. ends</td><td class=v>${s.quality.castNameShare ?? "-"}</td></tr>
<tr><td>relations</td><td class=v>${s.quality.relations}</td><td>ends→referent</td><td class=v>${s.quality.boundShare ?? "-"}</td><td>rel / 1k chars</td><td class=v>${s.quality.relationsPerKChar ?? "-"}</td></tr>
<tr><td>errors</td><td class=v>${s.quality.errors}</td><td>primed</td><td class=v>${s.quality.primed ?? 0}</td><td>chars read</td><td class=v>${(s.quality.charsRead/1e6).toFixed(2)}M</td></tr>
</table>
<div class=k>recent documents</div>
<pre>${esc((s.quality.recent || []).map((r) => `${String(r.cast).padStart(4)} cast ${String(r.named).padStart(4)} named ${String(r.rel).padStart(4)} rel  bound ${r.bound ?? "-"}  ${String(r.lang).padEnd(6)} ${r.address}${r.err ? "  ERR" : ""}`).join("\n"))}</pre>
<div class=k>gaps</div><pre>${esc(JSON.stringify(s.quality.gaps))}</pre>
<div class=k>supervisor</div><pre>${esc(s.logTail)}</pre>`;
}
http.createServer((req, res) => {
  if (req.url.startsWith("/quality.json")) { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(status().quality, null, 1)); return; }
  if (req.url.startsWith("/status.json")) { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(status(), null, 1)); return; }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(page());
}).listen(port, "127.0.0.1", () => console.log(`weft watcher on http://localhost:${port}  (dir ${HERE})`));

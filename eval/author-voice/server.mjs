// eval/author-voice/server.mjs — the author-voice results, in the browser, with every number's file one click away.   node eval/author-voice/server.mjs   ->   http://127.0.0.1:4872
// Reads only what the experiments wrote (results/*.json, results/E3-austen.txt, the prereg, the stamp, the results note). It runs nothing and calls no model.
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname), PORT = Number(process.env.PORT || 4872), RES = path.join(HERE, "results");
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } }, readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const json = (res, code, b) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(b)); };
const files = fs.existsSync(RES) ? fs.readdirSync(RES) : [];
const results = () => ({
  e0: { fresh: readJson(path.join(RES, "E0-fresh-austen.json")) },
  e1: files.filter((f) => /^E1-/.test(f)).sort().map((f) => ({ file: f, ...readJson(path.join(RES, f)) })),
  e1b: files.filter((f) => /^E1b-/.test(f)).sort().map((f) => ({ file: f, ...readJson(path.join(RES, f)) })),
  e1c: files.filter((f) => /^E1c-/.test(f)).sort().map((f) => ({ file: f, ...readJson(path.join(RES, f)) })),
  e2: readJson(path.join(RES, "E2-min200.json")), e3: read(path.join(RES, "E3-austen.txt")), stamp: read(path.join(HERE, "STAMP-E0-E1.txt")),
});
const OK = new Set(["PREREG-E0-E1.md", "RESULTS-E0-E1-E2.md", "STAMP-E0-E1.txt", "authors.json", "e0-author-signal.mjs", "e1-lexical-preference.mjs", "e1b-treebank-verbs.mjs", "e1c-cross-author-verbs.mjs", "e2-usage-corroborates.mjs", "e3-voice-table.mjs"]);
http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(path.join(HERE, "index.html"), "utf8")); }
  if (url.pathname === "/api/results") return json(res, 200, results());
  const m = url.pathname.match(/^\/file\/(.+)$/); if (m) { const n = decodeURIComponent(m[1]), f = OK.has(n) ? path.join(HERE, n) : files.includes(n) ? path.join(RES, n) : null; const t = f && read(f); if (t != null) { res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }); return res.end(t); } }
  json(res, 404, { error: "not found" });
}).listen(PORT, "127.0.0.1", () => console.log(`author-voice results on http://127.0.0.1:${PORT}`));

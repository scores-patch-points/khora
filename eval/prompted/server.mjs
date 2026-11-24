// eval/prompted/server.mjs — the prompted chat, with the audit of every reply beside it.   node eval/prompted/server.mjs   ->   http://127.0.0.1:4871
// Pick a prompt (none, a fixture, a Claude prompt from the local persona cache, or type your own), ask, and see the reply together with where it came from.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createHash } from "node:crypto";
import { cachedPrompts, FIXTURES, audit, experiment, weaveAudits, policyOf, SELF, CONTROLS } from "./audit.mjs";
import { makeEmbedder } from "../../native/adapters/text/embed-personhood.js"; import { LEVERS } from "../../native/organs/prompt-policy.js";
const embedder = makeEmbedder({ prefix: "classification: " });
const HERE = path.dirname(new URL(import.meta.url).pathname), PORT = Number(process.env.PORT || 4871);
const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const prompts = [{ id: "none", label: "No prompt (the system as it is)", source: null, text: null }, ...FIXTURES.map((f) => ({ ...f, fixture: true })), ...cachedPrompts().map((p) => ({ ...p, label: `${p.label} (${Math.round(p.size / 1000)} KB, from the persona cache)` }))];
const find = (id, custom) => (custom ? { id: `custom-${sha(custom).slice(0, 8)}`, label: "your own prompt", source: "typed in the page", text: custom } : prompts.find((p) => p.id === id) ?? prompts[0]);
const json = (res, code, b) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(b)); };
const body = (req) => new Promise((ok) => { let b = ""; req.on("data", (c) => { b += c; if (b.length > 400000) req.destroy(); }); req.on("end", () => ok(b)); });
let last = null; const trail = []; let matrix = null;
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (req.method === "GET" && url.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(path.join(HERE, "index.html"), "utf8")); }
    if (req.method === "GET" && url.pathname === "/api/prompts") return json(res, 200, { prompts: prompts.map((p) => ({ id: p.id, label: p.label, source: p.source, bytes: p.text ? Buffer.byteLength(p.text) : 0, sha256: p.text ? sha(p.text) : null, fixture: !!p.fixture, text: p.text && p.text.length < 4000 ? p.text : null })), self: SELF, controls: CONTROLS });
    if (req.method === "POST" && url.pathname === "/api/ask") {
      const { promptId, custom, question, prove } = JSON.parse((await body(req)) || "{}"), p = find(promptId, custom), t0 = Date.now();
      const rec = await audit(p, String(question ?? ""), { prove: !!prove }); rec.ms = Date.now() - t0;
      trail.push(rec); return json(res, 200, { ...rec, promptText: p.text ?? null });   // the whole prompt goes with the reply so the page can show the sentence in place; it is not part of the audit record
    }
    if (req.method === "GET" && url.pathname === "/api/prompt") { const p = prompts.find((x) => x.id === url.searchParams.get("id")); return json(res, p ? 200 : 404, p ? { id: p.id, label: p.label, source: p.source, sha256: p.text ? sha(p.text) : null, text: p.text } : { error: "no such prompt" }); }
    if (req.method === "POST" && url.pathname === "/api/policy") { const { promptId, custom } = JSON.parse((await body(req)) || "{}"), p = find(promptId, custom); if (!p.text) return json(res, 200, { none: true }); const out = await policyOf(p, (t) => embedder.embed(t)); embedder.save(); return json(res, 200, { prompt: { id: p.id, label: p.label, bytes: Buffer.byteLength(p.text) }, capacities: LEVERS.map((l) => ({ id: l.id, kind: l.kind, says: l.says, why: l.why, acts: l.acts ?? null })), ...out }); }
    if (req.method === "POST" && url.pathname === "/api/experiment") {
      const use = prompts.filter((p) => p.fixture || (p.label.includes("Claude") && p.bytes === undefined && p.size > 20000 && p.size < 30000));
      matrix = await experiment({ prompts: use }); return json(res, 200, { ...matrix, order: ["none", ...use.map((p) => p.id)], self: SELF, controls: CONTROLS, texts: Object.fromEntries(use.map((p) => [p.id, p.text])) });
    }
    if (req.method === "POST" && url.pathname === "/api/weave") { const recs = matrix ? Object.values(matrix.matrix).flatMap((r) => Object.values(r)) : trail; return json(res, 200, { woven: await weaveAudits(recs), writer: "prompt-audit", kind: "prompted-turn" }); }
    json(res, 404, { error: "not found" });
  } catch (e) { json(res, 500, { error: String(e?.stack ?? e).slice(0, 300) }); }
}).listen(PORT, "127.0.0.1", () => console.log(`prompted chat on http://127.0.0.1:${PORT} (${prompts.length} prompts)`));

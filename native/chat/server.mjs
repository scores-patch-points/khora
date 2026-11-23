// native/chat/server.mjs — the chat app: one endpoint, no model.
//   node native/chat/server.mjs   →   http://localhost:4861
// What you say is read into the thread's fold; what you ask is answered from it (thread.mjs); everything is written to pharos
// (record.mjs). The same engine runs the book panel. The givers (the hyperlexicon, the dictionary, Wikidata) are reached only for what
// the thread cannot say, and a reply that used one says so.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeThread } from "./thread.mjs";
import { openLog, weaveSay, weaveQuestion, LOG_DIR } from "./record.mjs";
import { listPersonas, fetchPrompt, readPersona } from "./personas.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4861);
const know = await (async () => { try { const { makeKnowledge } = await import("../demo/knowledge.mjs"); return makeKnowledge(); } catch (e) { console.error("givers unavailable:", String(e?.message ?? e).slice(0, 120)); return null; } })();
const thread = await makeThread({ hl: process.env.HL_DOOR || "http://127.0.0.1:11450", know });
const log = openLog();

const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const body = (req) => new Promise((ok) => { let b = ""; req.on("data", (c) => { b += c; if (b.length > 40000) req.destroy(); }); req.on("end", () => ok(b)); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(path.join(HERE, "app.html"), "utf8")); }
  if (req.method === "GET" && url.pathname === "/api/state") return json(res, 200, { ...thread.state(), pharos: LOG_DIR, givers: !!know });
  // PERSONAS: the list is the collection's file tree (names only); choosing one fetches that ONE prompt (size-capped, cached, read as text, never run)
  if (req.method === "GET" && url.pathname === "/api/personas") { try { return json(res, 200, { items: await listPersonas() }); } catch (e) { return json(res, 502, { error: String(e?.message ?? e) }); } }
  if (req.method === "POST" && url.pathname === "/api/persona") {
    try {
      const { path: pth } = JSON.parse((await body(req)) || "{}");
      if (!pth) { thread.setPersona(null); return json(res, 200, { persona: null }); }
      const it = (await listPersonas()).find((x) => x.path === pth); if (!it) return json(res, 400, { error: "that is not in the collection" });   // only a listed path can be fetched
      const prompt = await fetchPrompt(it.path);
      const pz = { ...(await readPersona(prompt, { source: `github.com/asgeirtj/system_prompts_leaks/${it.path}` })), name: it.name, vendor: it.vendor };
      thread.setPersona(pz);
      return json(res, 200, { persona: { name: pz.name, vendor: pz.vendor, identity: pz.identity, declaredTools: pz.declaredTools, source: pz.source }, bytes: prompt.length });
    } catch (e) { return json(res, 502, { error: String(e?.message ?? e) }); }
  }
  if (req.method === "POST" && url.pathname === "/api/chat") {
    try {
      const text = String(JSON.parse((await body(req)) || "{}").message ?? "").trim();
      if (!text) return json(res, 200, { role: "assistant", text: "" });
      const r = await thread.turn(text);
      if (r.type === "read") {
        const n = weaveSay(log, thread.id, text, r, thread.engine.S.read?.cast);
        return json(res, 200, { role: "assistant", kind: "read", handled: true, text: r.text, facts: r.facts, referents: r.referents, wrote: n });
      }
      weaveQuestion(log, r);
      return json(res, 200, { role: "assistant", kind: r.type, handled: r.handled, text: r.text, evidence: r.evidence ?? [], trace: r.trace ?? [], tools: r.tools ?? [], from: r.from ?? null, gap: r.gap ?? null, persona: r.persona ?? null });
    } catch (e) { return json(res, 500, { error: String(e?.stack ?? e).slice(0, 400) }); }
  }
  json(res, 404, { error: "not found" });
}).listen(PORT, "127.0.0.1", () => console.log(`chat on http://127.0.0.1:${PORT} (pharos: ${LOG_DIR}, givers: ${know ? "on" : "off"})`));

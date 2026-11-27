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
import { mountJanus } from "./janus-door.mjs";
import { listPersonas, fetchPrompt, readPersona } from "./personas.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4861);
const know = await (async () => { try { const { makeKnowledge } = await import("../demo/knowledge.mjs"); return makeKnowledge(); } catch (e) { console.error("givers unavailable:", String(e?.message ?? e).slice(0, 120)); return null; } })();
const log = openLog();
// janus is mounted with its OWN door onto the same log (writer "janus"): its verdicts are its own entries, not the chat's. Not found = a
// typed gap in the state and in every reply that needed it (janus-door.mjs), never a silent degrade.
const janus = await mountJanus({ dir: LOG_DIR });
if (!janus.on) console.error("janus not mounted:", janus.why);
const HL = process.env.HL_DOOR || "http://127.0.0.1:11450";
let thread = await makeThread({ hl: HL, know, janus, log }), personaNow = null;

const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const body = (req) => new Promise((ok) => { let b = ""; req.on("data", (c) => { b += c; if (b.length > 40000) req.destroy(); }); req.on("end", () => ok(b)); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(path.join(HERE, "app.html"), "utf8")); }
  if (req.method === "GET" && url.pathname === "/api/state") return json(res, 200, { ...thread.state(), pharos: LOG_DIR, givers: !!know });
  // PERSONAS: the list is the collection's file tree (names only); choosing one fetches that ONE prompt (size-capped, cached, read as text, never run)
  if (req.method === "POST" && url.pathname === "/api/new") { thread = await makeThread({ hl: HL, know, janus, log }); if (personaNow) await thread.setPersona(personaNow); return json(res, 200, { id: thread.id }); }
  if (req.method === "GET" && url.pathname === "/api/doors") return json(res, 200, { doors: thread.doors() });
  if (req.method === "GET" && url.pathname === "/api/personas") { try { return json(res, 200, { items: await listPersonas() }); } catch (e) { return json(res, 502, { error: String(e?.message ?? e) }); } }
  if (req.method === "POST" && url.pathname === "/api/persona") {
    try {
      const { path: pth } = JSON.parse((await body(req)) || "{}");
      if (!pth) { personaNow = null; await thread.setPersona(null); return json(res, 200, { persona: null }); }
      const it = (await listPersonas()).find((x) => x.path === pth); if (!it) return json(res, 400, { error: "that is not in the collection" });   // only a listed path can be fetched
      const prompt = await fetchPrompt(it.path);
      const read = await readPersona(prompt, { source: `github.com/asgeirtj/system_prompts_leaks/${it.path}` });
      const pz = { ...read, name: read.name ?? it.name, label: it.label ?? it.name, vendor: it.vendor };
      personaNow = pz; await thread.setPersona(pz);
      return json(res, 200, { persona: { name: pz.name, label: pz.label, vendor: pz.vendor, identity: pz.identity, declaredTools: pz.declaredTools, source: pz.source, foldSentences: !!pz.text, behaviours: pz.behaviours ?? null }, bytes: prompt.length });
    } catch (e) { return json(res, 502, { error: String(e?.message ?? e) }); }
  }
  if (req.method === "POST" && url.pathname === "/api/chat") {
    const stream = String(req.headers.accept ?? "").includes("application/x-ndjson");
    try {
      const text = String(JSON.parse((await body(req)) || "{}").message ?? "").trim();
      if (!text) return json(res, 200, { role: "assistant", text: "" });
      if (stream) res.writeHead(200, { "content-type": "application/x-ndjson", "cache-control": "no-cache" });
      const r = await thread.turn(text, { onStatus: stream ? (t) => res.write(`${JSON.stringify({ status: t })}\n`) : undefined });
      let payload;
      if (r.type === "read") {
        const n = weaveSay(log, thread.id, text, r, thread.engine.S.read?.cast);
        payload = { role: "assistant", kind: "read", handled: true, text: r.text, facts: r.facts, referents: r.referents, wrote: n, thought: r.thought ?? null, taken: r.taken ?? null, acts: r.acts ?? null };
      } else {
        weaveQuestion(log, r);
        // a sentence a giver supplied (Wikidata, Wikipedia) went into the thread as the giver's: it is written as such, never as the user's
        for (const g of r.introduced ?? []) weaveSay(log, thread.id, g.text, g.read, thread.engine.S.read?.cast, { given: g.source });
        payload = { role: "assistant", kind: r.type, handled: r.handled, text: r.text, evidence: r.evidence ?? [], trace: r.trace ?? [], tools: r.tools ?? [], from: r.from ?? null, gap: r.gap ?? null, persona: r.persona ?? null, thought: r.thought ?? null, cites: r.cites ?? [], retry: !!r.research, taken: r.taken ?? null, acts: r.acts ?? null };
      }
      if (stream) { res.write(`${JSON.stringify({ reply: payload })}\n`); return res.end(); }
      return json(res, 200, payload);
    } catch (e) {
      const err = { error: String(e?.stack ?? e).slice(0, 400) };
      if (stream && res.headersSent) { res.write(`${JSON.stringify({ reply: err })}\n`); return res.end(); }
      return json(res, 500, err);
    }
  }
  json(res, 404, { error: "not found" });
}).listen(PORT, "127.0.0.1", () => console.log(`chat on http://127.0.0.1:${PORT} (pharos: ${LOG_DIR}, givers: ${know ? "on" : "off"})`));

// chat-sys/server.mjs — live server: facing page + folded app + promptable local-mouth chat.
//
// Serves the launch-exp dir, plus:
//   POST /api/chat {prompt, model?} -> local ollama draw (free chat, logged)
//   POST /api/rung {task}           -> task in {fmtAgo, filter, paths}:
//                                      draw from mouth, probe with the organ,
//                                      verdict + running score, appended to
//                                      ladder-live.jsonl
//   GET  /api/score                 -> scoreboard from the log
// What improves in real time is the SYSTEM (standing rules accumulate,
// box owns more shapes) — the mouth doesn't learn. The scoreboard says so.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { swatch } from "../organs/generation-door.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXP = path.join(HERE, "..", "apps"); // serve the repo's own apps (single source of truth)
const PROXY = "http://127.0.0.1:11436"; // the proxy door (chat + build admission)
const CHANNEL = "http://127.0.0.1:11434"; // Heimdall's channel — one door for servers, held not bounced
const LOG = path.join(HERE, "ladder-live.jsonl");

// ONE IDENTITY, ALL DOORS (2026-10-01, "all generation related to eoreader7
// runs through Penelope"): every door Penelope speaks through — the gym chat,
// the rung probes, the stream, the weave build, the generation door — carries
// the same person key, so Heimdall's queue holds ONE place for her (one app,
// one place in line — the house rule), and the kind header feeds the box's
// fair-share round robin: chat/probe/stream/build rotate by measured service,
// never by arrival alone. The channel keys a headerless call by its resolved
// server; Penelope declares herself instead.
const ID = { "x-er7-user": "penelope", "x-er7-caller": "penelope-gym" };

// All draws route through Heimdall admission (the proxy's shared mouth or the
// channel), never ollama direct: x-er7-user gives Penelope her one place in
// line, x-er7-priority queues batch behind interactive work. 429/503 +
// Retry-After are honored with bounded backoff, then a typed refusal —
// never a silent stop, never a wedge.
const er7model = (m) => (String(m).startsWith("er7:") ? m : `er7:${m}`);

// Two routes, by evidence (2026-10-01, updated from the 2026-10-01 original):
// - chat goes through the proxy door (heimdall admission, shared mouth).
// - code draws go through the CHANNEL (heimdall's held door). Measured reason:
//   the chat doors' hard-meaning auto-route swallows code prompts whole and
//   returns a swarm verdict instead of a draw ("Hard meaning (truncated_end)…",
//   logged); the channel holds a batch caller on the socket instead of
//   bouncing it, and the streaming doors on the proxy hang (code 000, 90s,
//   zero bytes). This matches house precedent (code-build.js and the
//   arrangement engine both draw through the channel). Consolidation
//   falsified for code draws — disclosed, not hidden.

// The hunt's fetch, bounded: honor 429 + Retry-After with backoff, then hand
// back the last status — the door reports what the feed said (GL-RT-03).
async function fetchRetryLegistar(url, tries) {
  let last = null;
  for (let a = 0; a < tries; a += 1) {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    last = r;
    if (r.status !== 429) return r;
    const wait = Math.min(10000, (Number(r.headers.get("Retry-After")) || 2) * 1000);
    await new Promise((res) => setTimeout(res, wait));
  }
  return last;
}

// The channel's own rule, reused, never invented: a PAGE on this box is a
// person at a page — interactive, so it gets a person's place in line and
// the on-device substitute ladder; anything else is a server — batch.
const pageOrigin = (o) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(o ?? ""));
async function drawChat(prompt, { interactive = false } = {}) {
  const body = JSON.stringify({
    model: "er7:gemma2:2b", stream: false, temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });
  let last = null;
  for (let a = 0; a < 3; a += 1) {
    const r = await fetch(`${PROXY}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...ID,
        "x-er7-priority": interactive ? "interactive" : "batch",
        "x-er7-kind": "chat",
      },
      body,
      signal: AbortSignal.timeout(150000),
    });
    if (r.status === 429 || r.status === 503) {
      last = r.status;
      const wait = Math.min(60000, (Number(r.headers.get("retry-after")) || 20) * 1000);
      await new Promise((res) => setTimeout(res, wait));
      continue;
    }
    const j = await r.json();
    const text = j.choices?.[0]?.message?.content ?? "";
    if (text) return text;
    throw new Error(`heimdall-ok-but-empty (status ${r.status})`);
  }
  throw new Error(`heimdall-refused (${last}) after bounded backoff — named gap, retry later`);
}

async function draw(model, prompt, num_predict = 260) {
  let last = null;
  for (let a = 0; a < 3; a += 1) {
    const r = await fetch(`${CHANNEL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json", ...ID, "x-er7-priority": "batch", "x-er7-kind": "probe" },
      body: JSON.stringify({ model, prompt, stream: false, options: { num_predict, temperature: 0 } }),
      signal: AbortSignal.timeout(150000),
    });
    if (r.status === 429 || r.status === 503) {
      last = r.status;
      const wait = Math.min(60000, (Number(r.headers.get("retry-after")) || 20) * 1000);
      await new Promise((res) => setTimeout(res, wait));
      continue;
    }
    const j = await r.json();
    return j.response ?? "";
  }
  throw new Error(`heimdall-refused (${last}) after bounded backoff — named gap, retry later`);
}
// The chat door talks (prose around code); raw generate didn't. So the
// snip extracts function-shaped spans instead of loading whole text.
const snipJs = (t) => {
  const src = String(t ?? "").replace(/```[a-z]*/gi, "");
  const spans = [...src.matchAll(/function\s+[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/g)];
  if (!spans.length) return src.trim();
  // cut from first function head to the last closing brace on its own line
  const start = spans[0].index;
  const end = src.lastIndexOf("\n}");
  return (end > start ? src.slice(start, end + 3) : src.slice(start)).trim();
};
function loadJs(src, names) {
  const f = new Function(`${src}
return { ${names.join(", ")} };`);
  return f();
}
// probes (mirror the organs; box-side, no model)
const PROBES = {
  fmtAgo: {
    files: null, names: ["fmtAgo"], model: "gemma2:2b", tokens: 180,
    prompt: `Write JavaScript. Output ONLY raw code, no prose, no fences. Exactly one function. Spec: fmtAgo(t, now) takes epoch-ms t and epoch-ms now, returns short relative string. Golden pair: fmtAgo(970000, 1000000) is "30s ago"; fmtAgo(700000, 1000000) is "5m ago". function fmtAgo(t, now){}`,
    cases: [[[970000, 1000000], "30s ago"], [[700000, 1000000], "5m ago"], [[1000000 - 3 * 3600000, 1000000], "3h ago"], [[1000000 - 2 * 86400000, 1000000], "2d ago"]],
    run(f) { return this.cases.map(([a, w]) => { try { const g = f.fmtAgo(...a); return { ok: g === w, got: String(g).slice(0, 40), want: w }; } catch (e) { return { ok: false, got: "threw: " + String(e.message).slice(0, 60), want: w }; } }); },
  },
  filter: {
    names: ["filterLaunches", "resolveDetail"], model: "gemma2:2b", tokens: 300,
    prompt: `Write JavaScript. Output ONLY raw code, no prose, no fences. Exactly TWO pure functions (arguments only, never mutate inputs, no document/window/fetch). Spec: filterLaunches(q, items) keeps items where the CONCATENATED string (item.mission + " " + item.site).toLowerCase() includes String(q).toLowerCase(). Guard missing fields with || "". resolveDetail(id, items) returns the match or else null (never undefined — use || null). function filterLaunches(q, items){}`,
    cases: null, // built per-run (fresh items)
    run(f) {
      const mk = () => [{ id: "a", mission: "Crew-13", site: "Cape" }, { id: "b", mission: "Starlink", site: "Vandenberg" }];
      const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      const out = [];
      try { const g = f.filterLaunches("CREW", mk()); out.push({ ok: eq(g, [mk()[0]]), got: JSON.stringify(g).slice(0, 60), want: "crew-row" }); }
      catch (e) { out.push({ ok: false, got: "threw: " + String(e.message).slice(0, 60), want: "crew-row" }); }
      try { const g = f.resolveDetail("zz", mk()); out.push({ ok: g === null, got: String(g).slice(0, 40), want: "null" }); }
      catch (e) { out.push({ ok: false, got: "threw: " + String(e.message).slice(0, 60), want: "null" }); }
      return out;
    },
  },
  paths: {
    names: [], model: "gemma2:2b", tokens: 120,
    prompt: `Launch detail JSON has these URL-ish fields: flightclub_url (string), infoURLs (array of {url}), vidURLs (array of {url}), webcast_live (boolean flag). Output ONLY raw JSON, no prose: {"webcast": "<dot-path to the first livestream URL>", "info": "<dot-path to the first info URL>"}. Numeric segments index arrays.`,
    runText(txt) {
      let p = null;
      try { const s = txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1); p = JSON.parse(s); }
      catch { return [{ ok: false, got: txt.slice(0, 60), want: "parseable JSON" }]; }
      const out = [];
      out.push({ ok: p.webcast === "vidURLs.0.url", got: String(p.webcast).slice(0, 40), want: "vidURLs.0.url" });
      out.push({ ok: p.info === "infoURLs.0.url", got: String(p.info).slice(0, 40), want: "infoURLs.0.url" });
      return out;
    },
  },
};

// The ask-back channel — a build may pause and ask instead of guessing
// (build-clarify's posture: the reverse prompt; an answer that moves
// nothing is never re-asked). Pending asks live in gym/asks.jsonl; every
// ask and answer is logged. The build that asked resumes with the answer
// on the record.
const ASK = path.join(HERE, "asks.jsonl");
const pendingAsks = () => {
  try { return fs.readFileSync(ASK, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((a) => !a.answer); }
  catch { return []; }
};
function logAsk(row) { fs.appendFileSync(ASK, JSON.stringify(row) + "\n"); }

function score() {
  let rows = [];
  try { rows = fs.readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch {}
  const by = {};
  for (const r of rows) {
    if (r.kind !== "rung" || !r.task) continue;
    by[r.task] ??= { task: r.task, attempts: 0, passes: 0, mouth: 0, box: 0 };
    by[r.task].attempts += 1;
    if (r.pass) by[r.task].passes += 1;
    by[r.task][r.winner] += 1;
  }
  return { tasks: Object.values(by), total: rows.length };
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x");
    if (req.method === "GET" && (u.pathname === "/" || u.pathname === "/chat")) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(fs.readFileSync(path.join(HERE, "chat.html")));
      return;
    }
    if (req.method === "GET" && u.pathname === "/api/score") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(score()));
      return;
    }
    // THE WEAVE DOOR — Penelope's one public generation operation.
    // Text, code, application, and future artifact kinds all enter here.
    // Raw model draws remain below at /api/generate; they are a primitive,
    // not a competing generation API.
    if (req.method === "POST" && u.pathname === "/api/weave") {
      let body = "";
      for await (const c of req) body += c;
      const j = JSON.parse(body || "{}");
      // Artifact generation uses the canonical lifecycle. The legacy build
      // loom is retained only for its banked/measurement-specific routes.
      if (j.intent || j.artifact) {
        const { weave } = await import("../organs/generation/api.mjs");
        const result = await weave({
          intent: j.intent,
          artifact: j.artifact,
          constraints: j.constraints,
          context: j.context,
          verification: j.verification,
          model: j.model,
          output: j.output,
        }).catch((e) => ({ schema: "GenerationResult@1", ok: false, status: "error", error: String(e?.message ?? e).slice(0, 500) }));
        res.writeHead(result.ok ? 200 : 422, { "content-type": "application/json" });
        res.end(JSON.stringify(result));
        return;
      }
      // Legacy specialized weave classes remain reachable without creating
      // another public generation surface.
      const { runWeave } = await import("./weave-build.mjs");
      const w = await runWeave({ ask: j.ask, testCommand: j.testCommand, out: j.out, banked: j.class, model: j.model, html: j.html, sel: j.sel, image: j.image });
      res.writeHead(w.ok ? 200 : 400, { "content-type": "application/json" });
      res.end(JSON.stringify(w));
      return;
    }
    // THE GENERATION DOOR (2026-10-01, "all generation related to eoreader7
    // runs through Penelope"): the seam eoreader7's own engine draws route
    // through (streamOllamaChat → this door, ER7_GENERATION_DOOR). The door
    // checks the box (organs), draws only the residue through Heimdall's
    // channel with Penelope's one identity + the draw's kind, and records
    // every draw on the swatch — the economy is measured, never asserted.
    if (req.method === "POST" && u.pathname === "/api/generate") {
      let body = "";
      for await (const c of req) body += c;
      const { runDrawDoor } = await import("../organs/generation-door.mjs");
      const j = JSON.parse(body || "{}");
      const r = await runDrawDoor(j).catch((e) => ({ ok: false, error: String(e?.message ?? e).slice(0, 300) }));
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      res.end(JSON.stringify(r));
      return;
    }
    // Specialized weave routing is handled inside the canonical /api/weave door above.
    // The hunt's own door: legistar's WebAPI sends no CORS headers (measured
    // 2026-10-01), so a browser cannot fetch it cross-origin — the loom fetches
    // at home and the browser reads the hunt through the door. Bounded retry on
    // 429, then the typed status — never a silent stop (GL-RT-03).
    if (req.method === "GET" && u.pathname === "/api/council/events") {
      const d = new Date();
      const today = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const url = `https://webapi.legistar.com/v1/nashville/Events?$filter=EventDate ge datetime'${today}T00:00:00'&$orderby=EventDate&$top=12`;
      const r = await fetchRetryLegistar(url, 3);
      res.writeHead(r.status, { "content-type": "application/json" });
      res.end(await r.text());
      return;
    }
    if (req.method === "GET" && u.pathname.startsWith("/api/council/events/")) {
      const id = u.pathname.match(/^\/api\/council\/events\/(\d+)\/items$/)?.[1];
      if (!id) { res.writeHead(404); res.end("nope"); return; }
      const r = await fetchRetryLegistar(`https://webapi.legistar.com/v1/nashville/Events/${id}/EventItems`, 3);
      res.writeHead(r.status, { "content-type": "application/json" });
      res.end(await r.text());
      return;
    }
    if (req.method === "GET" && u.pathname === "/api/asks") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(pendingAsks()));
      return;
    }
    if (req.method === "POST" && (u.pathname === "/api/ask" || u.pathname === "/api/answer")) {
      let body = "";
      for await (const c of req) body += c;
      const j = JSON.parse(body || "{}");
      if (u.pathname === "/api/ask") {
        const id = "ask-" + Date.now();
        const row = { id, t: Date.now(), kind: "ask", question: String(j.question ?? "").slice(0, 500), context: String(j.context ?? "").slice(0, 300), answer: null };
        logAsk(row);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ id }));
        return;
      }
      const rows = (() => { try { return fs.readFileSync(ASK, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } })();
      const i = rows.findIndex((r) => r.id === j.id);
      if (i < 0) { res.writeHead(404); res.end("no such ask"); return; }
      rows[i].answer = String(j.answer ?? "");
      rows[i].answeredAt = Date.now();
      fs.writeFileSync(ASK, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
      fs.appendFileSync(LOG, JSON.stringify({ t: Date.now(), kind: "answer", id: j.id, answer: String(j.answer ?? "").slice(0, 300) }) + "\n");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === "POST" && u.pathname === "/api/chat-stream") {
      // SSE live tokens. Through the CHANNEL (heimdall's held door), measured
      // 2026-10-01: both proxy streaming doors hang (code 000, 90s, zero
      // bytes — /v1/chat/completions and /api/chat); the channel streams the
      // ollama wire fine. Every chat is logged either way.
      let body = "";
      for await (const c of req) body += c;
      const { prompt, model } = JSON.parse(body || "{}");
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      const flush = (o) => res.write(`data: ${JSON.stringify(o)}

`);
      let full = "";
      try {
        const r = await fetch(`${CHANNEL}/api/generate`, {
          method: "POST",
          headers: { "content-type": "application/json", ...ID, "x-er7-priority": "interactive", "x-er7-kind": "stream" },
          body: JSON.stringify({ model: model ?? "gemma2:2b", prompt: String(prompt ?? ""), stream: true, options: { temperature: 0 } }),
          signal: AbortSignal.timeout(240000),
        });
        if (!r.ok || !r.body) throw new Error("draw failed HTTP " + r.status);
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
            if (!line.trim()) continue;
            let j;
            try { j = JSON.parse(line); } catch { continue; }
            const tok = j.response ?? "";
            if (tok) { full += tok; flush({ t: tok }); }
            if (j.done) { flush({ done: true }); break; }
          }
        }
      } catch (e) {
        flush({ err: String(e.message ?? e).slice(0, 200) });
      }
      fs.appendFileSync(LOG, JSON.stringify({ t: Date.now(), kind: "chat", stream: true, model: model ?? "gemma2:2b", prompt: String(prompt).slice(0, 200), text: full.slice(0, 400) }) + "\n");
      swatch({ weave: "chat:stream", class: "draw", engine: "server /api/chat-stream (channel)", model: model ?? "gemma2:2b", mouthCalls: 1, mouthBytes: full.length, corpusBytes: 0, huntBytes: 0, boxBytes: 0, verdict: "mouth", evidence: "2026-10-04 Autonoe's duty: every draw on the swatch" });
      res.end();
      return;
    }
    if (req.method === "POST" && (u.pathname === "/api/chat" || u.pathname === "/api/rung")) {
      let body = "";
      for await (const c of req) body += c;
      const { prompt, task, model } = JSON.parse(body || "{}");
      if (u.pathname === "/api/chat") {
        const text = await drawChat(String(prompt ?? ""), { interactive: pageOrigin(req.headers.origin) });
        fs.appendFileSync(LOG, JSON.stringify({ t: Date.now(), kind: "chat", model: model ?? "gemma2:2b", prompt: String(prompt).slice(0, 200) }) + "\n");
        swatch({ weave: "chat:chat", class: "draw", engine: "server /api/chat (proxy door)", model: model ?? "gemma2:2b", mouthCalls: 1, mouthBytes: text.length, corpusBytes: 0, huntBytes: 0, boxBytes: 0, verdict: "mouth", evidence: "2026-10-04 Autonoe's duty: every draw on the swatch" });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ text }));
        return;
      }
      const P = PROBES[task];
      if (!P) { res.writeHead(400); res.end("unknown task"); return; }
      const raw = await draw(model ?? P.model, P.prompt, P.tokens);
      let results;
      if (P.runText) results = P.runText(raw);
      else {
        try {
          const f = loadJs(snipJs(raw), P.names);
          results = P.run(f);
        } catch (e) { results = [{ ok: false, got: "load: " + String(e.message).slice(0, 80), want: "runnable" }]; }
      }
      const pass = results.length > 0 && results.every((r) => r.ok);
      const row = { t: Date.now(), kind: "rung", task, model: model ?? P.model, pass, winner: pass ? "mouth" : "box", results, draw: raw.slice(0, 600) };
      fs.appendFileSync(LOG, JSON.stringify(row) + "\n");
      swatch({ weave: `rung:${task}`, class: "draw", engine: "server /api/rung (channel)", model: model ?? P.model, mouthCalls: 1, mouthBytes: raw.length, corpusBytes: 0, huntBytes: 0, boxBytes: 0, verdict: pass ? "mouth" : "box", evidence: "2026-10-04 Autonoe's duty: every draw on the swatch" });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ...row, score: score() }));
      return;
    }
    // static: launch-exp first, then the woven apps, then the gym dir
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, "").replace(/\.\./g, "");
    for (const base of [EXP, path.join(HERE, "..", "apps"), HERE]) {
      const fp = path.join(base, rel || "index.html");
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
        res.writeHead(200, { "content-type": MIME[path.extname(fp)] ?? "application/octet-stream" });
        res.end(fs.readFileSync(fp));
        return;
      }
    }
    res.writeHead(404); res.end("nope");
  } catch (e) {
    res.writeHead(500); res.end(String(e.message).slice(0, 200));
  }
});
server.listen(8137, "127.0.0.1", () => console.log("live on http://127.0.0.1:8137/ (facing) http://127.0.0.1:8137/chat (chat)"));

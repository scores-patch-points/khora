// eval/train-demo/server.mjs — THE TRAIN OF THOUGHT, IN A BROWSER: the loop (organs/train.js) wired to the real reader, the real hunt over live Wikipedia, the trail
// store and the expression library, so the marks they leave can be watched. The chat's own act layer is the chat's; the few lines in readAct below stand in for it.
//   node eval/train-demo/server.mjs   ->   http://127.0.0.1:4870
import http from "node:http"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { spawn } from "node:child_process";
const N = new URL("../../native/", import.meta.url).href, HERE = path.dirname(new URL(import.meta.url).pathname), ROOT = path.resolve(HERE, "..", "..");
const { rowsOfFor } = await import(N + "reading.js"), { splitSentences } = await import(N + "adapters/text/spans.js"), { priorsFor, abbreviationsFor } = await import(N + "the-fold/read-core.mjs");
const { voidOfQuestion, huntVoid } = await import(N + "organs/void-hunt.js"), { wikipediaSource, defaultGetJson } = await import(N + "organs/hunt-sources.js");
const { makeLibrary, keyOf } = await import(N + "organs/expression-library.js"), { makeTrailStore } = await import(N + "organs/trail-store.mjs"), { makeTrain } = await import(N + "organs/train.js");
const { makeEmbedder } = await import(N + "adapters/text/embed-personhood.js");
const PORT = Number(process.env.PORT || 4870);
const P = await rowsOfFor("eng"), pr = priorsFor("eng"), cache = new Map();
const read = (s) => { if (!cache.has(s)) cache.set(s, P.rowsOf(s) ?? []); return cache.get(s); };
const split = (t) => splitSentences(t, { abbreviations: abbreviationsFor(t, { priors: pr, aliases: [], abbreviations: null }).set }).map((c) => c.text);
const invFile = path.join(os.homedir(), ".khora", "expressions", "casual.json");

let trails, T, requests = 0, library = null, libWhy = null;
const embedder = makeEmbedder({ prefix: "classification: " });
const fresh = () => {
  trails = makeTrailStore({ file: path.join(os.tmpdir(), `train-demo-trails-${process.pid}-${Date.now()}.json`), name: "demo" });
  const counting = async (u) => { requests++; return defaultGetJson(u, { maxWait: 45000 }); };
  const source = wikipediaSource({ getJson: counting, trails, documents: 3, maxWait: 45000 });
  try { library = makeLibrary(JSON.parse(fs.readFileSync(invFile, "utf8")), { embed: (t) => embedder.embed(t), trails }); } catch (e) { library = null; libWhy = `no inventory at ${invFile}: run native/organs/expression-library-build.mjs (${String(e.message).slice(0, 60)})`; }
  // STAND-IN for the chat's act layer: what the person is doing, and for a social act the intent the reply carries
  const SOCIAL = new Map([["thanks", "you're welcome"], ["thank you", "you're welcome"], ["thx", "you're welcome"], ["hi", "hello"], ["hello", "hello"], ["hey", "hello"], ["bye", "goodbye"], ["goodbye", "goodbye"], ["sorry", "no worries"], ["i don't know", "I don't know"]]);
  const readAct = (m) => { const k = keyOf(m); return SOCIAL.has(k) ? { kind: "social", intent: SOCIAL.get(k) } : m.trim().endsWith("?") ? { kind: "question", rows: read(m.trim()) } : { kind: "statement" }; };
  T = makeTrain({ readAct, voidOf: voidOfQuestion, notebook: async () => null, hunt: (v) => huntVoid(v, { sources: [source], read, split, trails, budgetMs: 100000 }), library: library ?? { say: async () => ({ gap: "no_inventory", detail: libWhy }), outcome() {} }, trails });
};
fresh();

const json = (res, code, b) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(b)); };
const body = (req) => new Promise((ok) => { let b = ""; req.on("data", (c) => { b += c; if (b.length > 20000) req.destroy(); }); req.on("end", () => ok(b)); });
const trailView = () => { const snap = trails.snapshot(); return { heads: Object.keys(snap.trails).map((h) => ({ head: h, routes: trails.stats(h).filter((s) => s.deposits > 0).sort((a, b) => b.strength - a.strength).map((s) => ({ route: s.route, strength: +s.strength.toFixed(2), deposits: s.deposits })) })), marks: Object.entries(snap.marks).filter(([, m]) => m.until > Date.now()).map(([k, m]) => ({ key: k, seconds: Math.round((m.until - Date.now()) / 1000) })), vetoes: snap.vetoes }; };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (req.method === "GET" && url.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(path.join(HERE, "index.html"), "utf8")); }
    if (req.method === "GET" && url.pathname === "/api/state") return json(res, 200, { library: !!library, why: libWhy, ...trailView() });
    if (req.method === "POST" && url.pathname === "/api/turn") {
      const { thread = "demo", message = "", seed } = JSON.parse((await body(req)) || "{}"); const r0 = requests, t0 = Date.now();
      const o = await T.turn(thread, String(message), { seed: seed ?? Math.floor(Math.random() * 1e9) });
      return json(res, 200, { ...o, candidates: (o.candidates ?? []).slice(0, 4).map((c) => ({ answer: c.answer, tier: c.tier, documents: c.documents })), requests: requests - r0, ms: Date.now() - t0, ...trailView() });
    }
    if (req.method === "POST" && url.pathname === "/api/veto") { const { head, route } = JSON.parse((await body(req)) || "{}"); trails.veto(head, route, "marked wrong in the demo"); return json(res, 200, trailView()); }
    if (req.method === "POST" && url.pathname === "/api/forget") { fresh(); return json(res, 200, { library: !!library, ...trailView() }); }
    if (req.method === "GET" && url.pathname === "/api/tests") {
      const files = ["void-hunt", "puzzle-reader", "epistemic-core", "expression-library", "trail-store", "train"].map((n) => path.join(ROOT, "native", "organs", `${n}.test.mjs`)), t0 = Date.now(), out = [];
      const p = spawn(process.execPath, ["--test", "--test-reporter=tap", ...files], { cwd: ROOT }); let buf = ""; p.stdout.on("data", (d) => { buf += d; }); p.stderr.on("data", () => {});
      p.on("close", () => { for (const line of buf.split("\n")) { const ok = line.startsWith("ok "), bad = line.startsWith("not ok "); if (!ok && !bad) continue; const dash = line.indexOf(" - "); if (dash < 0) continue; const name = line.slice(dash + 3), skip = name.indexOf(" # SKIP"); out.push({ ok, name: skip >= 0 ? `${name.slice(0, skip)} (skipped)` : name }); } json(res, 200, { tests: out, passed: out.filter((x) => x.ok).length, failed: out.filter((x) => !x.ok).length, ms: Date.now() - t0 }); });
      return;
    }
    json(res, 404, { error: "not found" });
  } catch (e) { json(res, 500, { error: String(e?.stack ?? e).slice(0, 300) }); }
}).listen(PORT, "127.0.0.1", () => console.log(`train demo on http://127.0.0.1:${PORT} (library ${library ? "on" : "off: " + libWhy})`));

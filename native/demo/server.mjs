// demo/server.mjs — serve the fold demo: read text into the fold, ask questions, show the narrowing.
//   node native/demo/server.mjs   -> http://localhost:4860
// No dependencies: node:http + the parser + the fold store. The parser model is loaded from
// KHORA_PRIORS_DIR/parser-eng-ewt.json, else the janus priors, else the vendored path.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel } from "../adapters/text/english-parser.js";
import { makeFold } from "./fold-store.mjs";
import { makeKnowledge } from "./knowledge.mjs";
import { voiceDefinition, voiceRelation, voiceSummary, voiceIdentity } from "./voice.mjs";
import * as pharos from "../../../pharos/lib/pharos.mjs";
import { weaveRead, weaveAsk, weaveBeing } from "./record.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4860);
const PHAROS_DIR = process.env.PHAROS_HOME || path.join(os.homedir(), ".pharos", "fold-demo");

const MODEL_CANDIDATES = [
  process.env.KHORA_PRIORS_DIR ? path.join(process.env.KHORA_PRIORS_DIR, "parser-eng-ewt.json") : null,
  "/Users/mlacy/janus-main/priors/parser-eng-ewt.json",
  path.join(HERE, "..", "priors", "parser-eng-ewt.json"),
].filter(Boolean);

let model = null, modelPath = null;
for (const p of MODEL_CANDIDATES) if (fs.existsSync(p)) { model = loadModel(JSON.parse(fs.readFileSync(p, "utf8"))); modelPath = p; break; }
if (!model) { console.error("parser-eng-ewt.json not found. Set KHORA_PRIORS_DIR or put the model in janus priors."); process.exit(1); }

const fold = makeFold({ model });
const know = makeKnowledge();
const P = pharos.open("fold-demo", { dir: PHAROS_DIR, writer: "khora-demo" });

// declare the kinds the demo weaves, once (re-declaring at the same cell is a no-op). The nine operators.
for (const [name, cell] of [
  ["being", "INS·Figure"], ["karaka", "SYN·Pattern"], ["sign", "SIG·Figure"],
  ["void", "DEF·Ground"], ["candidate", "SEG·Pattern"], ["binding", "CON·Figure"],
  ["verdict", "EVA·Figure"], ["utterance", "REC·Figure"], ["empty", "NUL·Figure"],
]) {
  try { pharos.weave(P, { cell: "DEF·Figure", kind: "kind", addr: `kind:${name}`, body: { name, cell } }); } catch { /* already declared */ }
}

const tripleKey = (t) => JSON.stringify(Object.fromEntries(Object.entries(t).filter(([k]) => k !== "surface").map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v]).sort(([a], [b]) => (a[0] < b[0] ? -1 : 1))));

// respond(turn) -> the turn with its voiced sentence, for every intent.
async function respond(r) {
  let voiced = null;
  if (r.type === "identity") voiced = voiceIdentity(r.target, r.relations);
  else if (r.type === "definitional") { const def = await know.lookup(r.target); r.definition = def; voiced = voiceDefinition(r.target, def.primary); }
  else if (r.type === "topic") { voiced = voiceSummary(fold.state().triples); r.summary = fold.state().triples.length; }
  else if (r.type === "polar") voiced = r.answer === "yes" ? "Yes." : (r.answer === "no" && r.matched?.surface ? "No — " + voiceRelation(r.matched.surface).replace(/[.]\s*$/, "") + "." : null);
  else if (r.type === "meta") voiced = r.answer === "yes" ? (r.lastVoiced ? "Yes — " + r.lastVoiced.replace(/[.]\s*$/, "") + "." : "Yes.") : "No — I couldn't ground that.";
  else { const knowledge = []; for (const w of new Set(r.words ?? [])) knowledge.push(await know.lookup(w)); r.knowledge = knowledge; voiced = r.matched?.surface ? voiceRelation(r.matched.surface) : null; }
  r.voiced = voiced;
  return r;
}

const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(path.join(HERE, "index.html"), "utf8"));
  }
  if (req.method === "GET" && url.pathname === "/api/state") return json(res, 200, { modelPath, ...fold.state() });
  if (req.method === "POST" && url.pathname === "/api/read") {
    let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
      try { const { text } = JSON.parse(body); const r = fold.read(String(text ?? "")); for (const c of r.cast ?? []) weaveBeing(P, c); for (const t of r.triples ?? []) weaveRead(P, t, tripleKey(t)); return json(res, 200, { ...r, pharos: PHAROS_DIR }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/ask") {
    let body = ""; req.on("data", (c) => (body += c)); req.on("end", async () => {
      try {
        const { question } = JSON.parse(body);
        const r = await respond(fold.ask(String(question ?? "")));
        const voidId = weaveAsk(P, r, r.voiced);
        return json(res, 200, { ...r, pharos: PHAROS_DIR, voidId });
      }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/know") {
    let body = ""; req.on("data", (c) => (body += c)); req.on("end", async () => {
      try { const { word } = JSON.parse(body); return json(res, 200, await know.lookup(String(word ?? ""))); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/chat") {
    let body = ""; req.on("data", (c) => (body += c)); req.on("end", async () => {
      try {
        const text = String((JSON.parse(body) ?? {}).message ?? "").trim();
        if (!text) return json(res, 200, { role: "assistant", text: "" });
        if (/[?]\s*$/.test(text)) {
          const r = await respond(fold.ask(text));
          weaveAsk(P, r, r.voiced);
          return json(res, 200, { role: "assistant", text: r.voiced ?? "Nothing in the fold answers that, and nothing grounds a guess.", kind: "ask", ...r });
        }
        const r = fold.read(text);
        for (const c of r.cast ?? []) weaveBeing(P, c);
        for (const t of r.triples ?? []) weaveRead(P, t, tripleKey(t));
        const ack = r.added ? `Read into the fold: ${r.added} triple${r.added === 1 ? "" : "s"}.` : "Already in the fold.";
        return json(res, 200, { ...r, role: "assistant", text: ack });
      }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    });
    return;
  }
  json(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`fold demo on http://localhost:${PORT}  (parser: ${path.basename(modelPath)})`);
});

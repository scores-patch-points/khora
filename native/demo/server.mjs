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
import { voiceDefinition, voiceRelation, voiceSummary, voiceIdentity, reformat } from "./voice.mjs";
import { threadOf } from "../adapters/text/coherence.js";
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
  ["void", "DEF·Ground"], ["thought", "INS·Figure"], ["candidate", "SEG·Pattern"], ["binding", "CON·Figure"],
  ["verdict", "EVA·Figure"], ["utterance", "REC·Figure"], ["empty", "NUL·Figure"],
]) {
  try { pharos.weave(P, { cell: "DEF·Figure", kind: "kind", addr: `kind:${name}`, body: { name, cell } }); } catch { /* already declared */ }
}

const tripleKey = (t) => JSON.stringify(Object.fromEntries(Object.entries(t).filter(([k]) => k !== "surface").map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v]).sort(([a], [b]) => (a[0] < b[0] ? -1 : 1))));

// the THOUGHT: the middle ground between the tension and the release — the derivation trace of one
// turn. layer names which depth the tension lives at; the steps name what was read, which prior (with
// its giver), which rule, and what released the tension.
function thoughtOf(r, { prior = null, rule = null, release = null, candidates = null } = {}) {
  const steps = [];
  steps.push({ step: "tension", layer: r.void?.layer ?? null, void: r.void ?? null });
  if (candidates != null) steps.push({ step: "candidates", out: candidates });
  if (prior) steps.push({ step: "prior", giver: prior.giver ?? null, out: prior.out });
  if (rule) steps.push({ step: "rule", out: rule });
  if (release != null) steps.push({ step: "release", out: release });
  return { layer: r.void?.layer ?? null, steps };
}

// respond(turn) -> the turn with its voiced sentence and its thought, for every intent.
async function respond(r) {
  let voiced = null;
  if (r.type === "time") {
    const now = new Date();
    const day = now.toLocaleDateString("en-US", { weekday: "long" });
    const date = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    voiced = r.timeWord === "day" ? `Today is ${day}.` : r.timeWord === "time" ? `It is ${time}.` : `The date is ${date}.`;
    r.thought = thoughtOf(r, { prior: { giver: "the clock (Date)", out: "regional time" }, rule: "the present moment is grounded in code, not read from the fold", release: `${day}, ${time}` });
  }
  else if (r.type === "location") {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    voiced = `You are in the ${tz.replace(/_/g, " ")} timezone.`;
    r.thought = thoughtOf(r, { prior: { giver: "the clock (Intl)", out: "the system's timezone" }, rule: "location is grounded in code, not read from the fold", release: tz });
  }
  else if (r.type === "self") {
    const traits = (r.identity ?? []).filter((t) => t.predicate === "be").flatMap((t) => t.karman ?? []).filter((k) => !["you", "system"].includes(k));
    voiced = traits.length ? `I am ${traits.map((t) => /^[aeiou]/i.test(t) ? "an " + t : "a " + t).join(" and ")}.` : null;
    r.thought = thoughtOf(r, { prior: { giver: "the identity thread", out: "what the system is and does" }, rule: "self-reference: `you` is the system, and the identity assertions cohere on it", release: traits.join(", ") || "nothing asserted" });
  }
  else if (r.type === "identity") {
    voiced = voiceIdentity(r.target, r.relations);
    r.thought = thoughtOf(r, { prior: { giver: "the reader", out: "the cast" }, rule: "significance: an admitted referent outranks the dictionary", release: r.relations.length + " relation(s) in the fold" });
  }
  else if (r.type === "reference") {
    const e = await know.person(r.target);
    r.entity = e;
    if (e?.id) fold.admit(r.target, e.label ?? r.target, e.description); // only a genuine being is admitted
    voiced = e?.description ? `${e.label ?? r.target} — ${e.description}.` : null;
    const cands = (e?.candidates ?? []).slice(0, 5).map((c) => `${c.label}${c.description ? ` — ${c.description}` : ""}`);
    r.thought = thoughtOf(r, { candidates: cands.length ? `search "${r.target}" returned ${cands.join(" · ")}` : null, prior: { giver: "Wikidata (wbsearchentities + P31)", out: "filtered to instance-of-human" }, rule: "reference: resolve the name to the person, not the surname or the title", release: e?.description ?? "no person found" });
  }
  else if (r.type === "current") {
    voiced = `I don't know who the current ${r.target} is — that is time-dependent knowledge, and I have no giver for it.`;
    r.thought = thoughtOf(r, { prior: { giver: "none", out: "the current officeholder is time-dependent" }, rule: "a title is not a person; never answer it with a random human", release: "not known (time-dependent)" });
  }
  else if (r.type === "kind") {
    const k = await know.kindOf(r.target);
    r.kind = k;
    const ancestors = (k?.ancestors ?? []).filter((a) => a.toLowerCase() !== String(r.target).toLowerCase());
    voiced = ancestors.length ? `${cap(r.target)} is a ${ancestors.join(", a ")}.` : null;
    r.thought = thoughtOf(r, { prior: { giver: "Wikidata P279", out: "transitive subclass-of closure" }, rule: "the kind hierarchy, one SPARQL query", release: ancestors.join(" > ") || "no kind" });
  }
  else if (r.type === "definitional") {
    const def = await know.lookup(r.target);
    r.definition = def;
    voiced = voiceDefinition(r.target, def.primary);
    r.thought = thoughtOf(r, { prior: { giver: "the kaikki dictionary", out: "definitions (glosses)" }, rule: "a cross-reference gloss is not a definition", release: def.primary ?? "no definition" });
  }
  else if (r.type === "topic") {
    voiced = voiceSummary(fold.state().triples);
    r.summary = fold.state().triples.length;
    r.thought = thoughtOf(r, { prior: { giver: "the reader", out: "the fold" }, rule: "the whole fold, spoken", release: fold.state().triples.length + " relation(s)" });
  }
  else if (r.type === "polar") {
    voiced = r.answer === "yes" ? "Yes." : (r.answer === "no" && r.matched?.surface ? "No — " + voiceRelation(r.matched.surface).replace(/[.]\s*$/, "") + "." : null);
    r.thought = thoughtOf(r, { prior: { giver: "the reader", out: "the fold" }, rule: "does the fold hold the proposition?", release: r.answer ?? "unknown" });
  }
  else if (r.type === "meta") {
    voiced = r.answer === "yes" ? (r.lastVoiced ? "Yes — " + r.lastVoiced.replace(/[.]\s*$/, "") + "." : "Yes.") : "No — I couldn't ground that.";
    r.thought = thoughtOf(r, { prior: { giver: "the interpreter", out: "the turns" }, rule: "was the last answer grounded?", release: r.answer ?? "no" });
  }
  else {
    const knowledge = [];
    for (const w of new Set(r.words ?? [])) knowledge.push(await know.lookup(w));
    r.knowledge = knowledge;
    voiced = r.matched?.surface ? voiceRelation(r.matched.surface) : null;
    const candidates = fold.state().triples.length;
    const cut = r.dmd?.find((s) => s.step === "match");
    r.thought = thoughtOf(r, { candidates: candidates + " relation(s) in the fold", prior: { giver: "the reader", out: "the kāraka DAG" }, rule: cut ? `the DMD: ${cut.matched}/${cut.total} survived` : "the DMD over the fold", release: r.answer ?? (r.reason ?? "nothing") });
  }
  r.voiced = voiced ? reformat(voiced) : voiced;
  return r;
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(path.join(HERE, "index.html"), "utf8"));
  }
  if (req.method === "GET" && url.pathname === "/api/state") {
    const st = fold.state();
    const self = threadOf(st.triples, { predicate: "be", kartṛ: ["you"] });
    return json(res, 200, { modelPath, ...st, self });
  }
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

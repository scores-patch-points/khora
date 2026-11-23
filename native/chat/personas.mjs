// native/chat/personas.mjs — A PERSONA IS WHAT A PROMPT DECLARES, READ THROUGH THE READER. No model, so no imitation of a model.
//
// The source is a public collection of published system prompts (github.com/asgeirtj/system_prompts_leaks, CC0 as the repo declares).
// A persona here is exactly what a prompt says about itself, read mechanically: the sentence in which it tells "you" what you are
// ("You are ChatGPT, a large language model trained by OpenAI.") becomes the persona's identity, and the tools it names are listed as
// declared. The chat then answers "who are you?" as that persona, labelled as a simulation. What a persona CANNOT be, with no model:
// its style, its judgment, its refusals. The prompt's other instructions are data and are never followed.
//
// Nothing is downloaded until a persona is chosen, and then one file: raw GitHub, size-capped, cached under ~/.khora/personas, read as
// text and never executed. The list is the repo's file tree (names only).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { rowsOfFor } from "../reading.js";
import { splitSentences } from "../adapters/text/spans.js";
import { priorsFor, abbreviationsFor } from "../the-fold/read-core.mjs";

export const REPO = "asgeirtj/system_prompts_leaks", BRANCH = "main";
export const CACHE = process.env.KHORA_PERSONA_CACHE || path.join(os.homedir(), ".khora", "personas");
export const MAX_BYTES = 300 * 1024;
const NOT_A_PERSONA = ["artifact-types/", "/reference/", "SKILL.md", ".github/", "LICENSE", "README"];

/** the personas the repo lists: { path, vendor, name } from its file tree (names only; nothing else is fetched) */
export async function listPersonas({ fetchImpl = globalThis.fetch } = {}) {
  const f = path.join(CACHE, "index.json");
  try { const j = JSON.parse(fs.readFileSync(f, "utf8")); if (Date.now() - j.at < 3600e3) return j.items; } catch { /* no fresh index */ }
  const r = await fetchImpl(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`the persona list could not be read (${r.status})`);
  const items = (await r.json()).tree.filter((x) => x.type === "blob" && (x.path.endsWith(".md") || x.path.endsWith(".txt")) && x.size <= MAX_BYTES && !NOT_A_PERSONA.some((n) => x.path.includes(n)))
    .map((x) => ({ path: x.path, vendor: x.path.split("/")[0], name: path.basename(x.path).replace(/\.(md|txt)$/, ""), size: x.size })).slice(0, 600);
  fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(f, JSON.stringify({ at: Date.now(), items }));
  return items;
}

/** one persona's prompt text: cached, else ONE size-capped fetch; text only */
export async function fetchPrompt(p, { fetchImpl = globalThis.fetch } = {}) {
  if (!p || p.includes("..") || p.startsWith("/")) throw new Error("not a path in the collection");
  fs.mkdirSync(CACHE, { recursive: true });
  const cached = path.join(CACHE, createHash("sha256").update(p).digest("hex").slice(0, 16) + ".txt");
  if (fs.existsSync(cached)) return fs.readFileSync(cached, "utf8");
  const r = await fetchImpl(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${p.split("/").map(encodeURIComponent).join("/")}`, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`that prompt could not be fetched (${r.status})`);
  const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > MAX_BYTES) throw new Error("that prompt is larger than the cap");
  const t = buf.toString("utf8"); fs.writeFileSync(cached, t); return t;
}

const NO_SPACE_BEFORE = new Set([",", ".", ";", ":", "!", "?", ")", "’", "'s", "n't"]), NO_SPACE_AFTER = new Set(["(", "“", "‘"]);
const detok = (forms) => { let o = ""; forms.forEach((w, i) => { o += (i && !NO_SPACE_BEFORE.has(w) && !NO_SPACE_AFTER.has(forms[i - 1]) ? " " : "") + w; }); return o; };

/**
 * readPersona(promptText, { source }) → { identity, source, declaredTools }, read with the reader's rows:
 *   identity     the first sentence (of the first 40) that tells "you" what you are: a copular clause whose subject is "you",
 *                its predicate phrase as written ("ChatGPT, a large language model trained by OpenAI")
 *   declaredTools the names the prompt gives its tools under a "tool" or "function" heading: not run, only listed
 */
export async function readPersona(promptText, { source = null } = {}) {
  const parser = await rowsOfFor("eng"), pr = priorsFor("eng"), head = String(promptText ?? "").slice(0, 6000);
  const cuts = splitSentences(head, { abbreviations: abbreviationsFor(head, { priors: pr, aliases: [], abbreviations: null }).set }).slice(0, 40);
  let identity = null;
  for (const c of cuts) {
    const rows = parser.rowsOf(c.text) ?? [];
    const root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT");
    if (!root || !rows.some((r) => r.head === root.id && r.deprel === "cop") || !rows.some((r) => r.head === root.id && r.deprel === "nsubj" && String(r.lemma ?? r.form).toLowerCase() === "you")) continue;
    const kids = new Map(); for (const r of rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
    const keep = new Set(), st = [root.id]; while (st.length) { const x = st.pop(); keep.add(x); for (const k of kids.get(x) ?? []) { if (x === root.id && (k.deprel === "nsubj" || k.deprel === "cop")) continue; if (["parataxis", "dep", "list", "discourse", "vocative"].includes(k.deprel.split(":")[0]) || (k.upos === "VERB" && (kids.get(k.id) ?? []).some((c) => c.deprel.split(":")[0] === "nsubj"))) continue; st.push(k.id); } }   // a separate clause with its own subject ("... Example Corp. You help ...") is not part of the identity
    const body = rows.filter((r) => keep.has(r.id) && r.upos !== "PUNCT").map((r) => r.id), lo = Math.min(...body), hi = Math.max(...body);
    const forms = rows.filter((r) => r.id >= lo && r.id <= hi && (keep.has(r.id) || r.upos === "PUNCT")).map((r) => r.form);   // the predicate as written, commas and all
    identity = forms.length ? detok(forms) : null; if (identity) break;
  }
  const lines = String(promptText ?? "").split("\n"), tools = [];
  lines.forEach((ln, i) => { const t = ln.trim(); if (t.startsWith("#") && /tool|function/i.test(t)) for (const nx of lines.slice(i + 1, i + 40)) { const m = nx.trim(); if (m.startsWith("#")) break; if (m.startsWith("## ") || m.startsWith("- `") || m.startsWith("* `")) tools.push(m.replace(/[#*`-]/g, "").trim().split(/[\s:(]/)[0]); } });   // regex-ok: tool names in a markdown file's headings and bullets, a file format and not language
  return { identity, source, declaredTools: [...new Set(tools.filter(Boolean))].slice(0, 30) };
}

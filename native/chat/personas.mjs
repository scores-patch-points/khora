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
import { featsOf } from "../adapters/text/gender-from-corpus.js";

export const REPO = "asgeirtj/system_prompts_leaks", BRANCH = "main";
export const CACHE = process.env.KHORA_PERSONA_CACHE || path.join(os.homedir(), ".khora", "personas");
export const MAX_BYTES = 300 * 1024;
const NOT_A_PERSONA = ["artifact-types/", "/reference/", "SKILL.md", ".github/", "LICENSE", "README"];
// folders of the collection that hold parts of a product (skills, agent definitions, tool and API references, docs guides), not the prompt
// an assistant is given: a file's FOLDER says so. (Found 2026-11-23: "claude" was Claude Code's FleetView agent file, 2 KB.)
const NOT_A_PROMPT_DIR = new Set(["skills", "agents", "guide", "shared", "references", "examples", "evals", "assets", "fonts", "output-styles", "managed-agents-quickstarts", "claude-docs", "tools", "prompts", "raw", "anthropic-usage-policies", "claude-constitution"]);
const isDate = (x) => { const p = String(x).split("-"); return p.length === 3 && p.every((n) => n !== "" && !Number.isNaN(Number(n))); };
const titled = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);
/** a name a person can read: "2026-11-09-claude-sonnet-5.5" -> "Claude Sonnet 5.5 · 2026-11-09" (the file name, tidied; nothing is added to it) */
export function labelOf(file) {
  const parts = String(file).split("-"); const date = parts.length > 3 && isDate(parts.slice(0, 3).join("-")) ? parts.slice(0, 3).join("-") : null;
  const body = (date ? parts.slice(3) : parts).join(" ").split("_").join(" ");
  return `${body.split(" ").map(titled).join(" ")}${date ? ` · ${date}` : ""}`;
}

/** the personas the repo lists: { path, vendor, name } from its file tree (names only; nothing else is fetched) */
export async function listPersonas({ fetchImpl = globalThis.fetch } = {}) {
  const f = path.join(CACHE, "index.json");
  try { const j = JSON.parse(fs.readFileSync(f, "utf8")); if (j.v === 2 && Date.now() - j.at < 3600e3) return j.items; } catch { /* no fresh index */ }
  const r = await fetchImpl(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`the persona list could not be read (${r.status})`);
  const items = (await r.json()).tree.filter((x) => x.type === "blob" && (x.path.endsWith(".md") || x.path.endsWith(".txt")) && x.size <= MAX_BYTES && !NOT_A_PERSONA.some((n) => x.path.includes(n)) && !x.path.split("/").slice(0, -1).some((d) => NOT_A_PROMPT_DIR.has(d)))
    .map((x) => { const segs = x.path.split("/"), file = segs.at(-1).slice(0, segs.at(-1).lastIndexOf(".")); return { path: x.path, vendor: segs[0], group: segs.length > 2 ? segs.slice(1, -1).join("/") : "", name: file, label: labelOf(file), size: x.size }; })
    .sort((a, b) => (a.vendor + a.group).localeCompare(b.vendor + b.group) || b.name.localeCompare(a.name)).slice(0, 600);
  fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(f, JSON.stringify({ v: 2, at: Date.now(), items }));
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
export const detok = (forms) => { let o = ""; forms.forEach((w, i) => { o += (i && !NO_SPACE_BEFORE.has(w) && !NO_SPACE_AFTER.has(forms[i - 1]) ? " " : "") + w; }); return o; };

/**
 * readPersona(promptText, { source }) → { identity, source, declaredTools }, read with the reader's rows:
 *   identity     the first sentence (of the first 40) that tells "you" what you are: a copular clause whose subject is "you",
 *                its predicate phrase as written ("ChatGPT, a large language model trained by OpenAI")
 *   declaredTools the names the prompt gives its tools under a "tool" or "function" heading: not run, only listed
 */
export async function readPersona(promptText, { source = null } = {}) {
  const parser = await rowsOfFor("eng"), pr = priorsFor("eng"), whole = String(promptText ?? "");
  const all = splitSentences(whole, { abbreviations: abbreviationsFor(whole.slice(0, 8000), { priors: pr, aliases: [], abbreviations: null }).set });
  const read = (c) => ({ text: c.text, rows: parser.rowsOf(c.text) ?? [] });
  const isYou = (r) => r.upos === "PRON" && featsOf(r.feats).Person === "2";
  // THE PROTAGONIST: whom the prompt is about is the one it most often makes the subject of a clause, a name or "you" (counted over sentences
  // spread across the whole prompt, not listed): identity can be said anywhere in it
  const step = Math.max(1, Math.ceil(all.length / 400)), subj = new Map();
  for (const c of all.filter((_, i) => i % step === 0).slice(0, 400)) for (const r of read(c).rows) if (r.deprel?.startsWith("nsubj") && (r.upos === "PROPN" || isYou(r))) { const k = isYou(r) ? "you" : r.form; subj.set(k, (subj.get(k) ?? 0) + 1); }
  const top = [...subj].sort((x, y) => y[1] - x[1])[0], protagonist = top && top[1] >= 3 ? top[0] : null;
  const predicateOf = (rows, root) => {
    const kids = new Map(); for (const r of rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
    const keep = new Set(), st = [root.id]; while (st.length) { const x = st.pop(); keep.add(x); for (const k of kids.get(x) ?? []) { if (x === root.id && (k.deprel === "nsubj" || k.deprel === "cop")) continue; if (["parataxis", "dep", "list", "discourse", "vocative"].includes(k.deprel) && x === root.id) continue; st.push(k.id); } }
    const body = rows.filter((r) => keep.has(r.id) && r.upos !== "PUNCT").map((r) => r.id); if (!body.length) return null;
    const lo = Math.min(...body), hi = Math.max(...body);
    const forms = rows.filter((r) => r.id >= lo && r.id <= hi && (keep.has(r.id) || r.upos === "PUNCT")).map((r) => r.form);   // the predicate as written, commas and all
    return forms.length ? detok(forms) : null;
  };
  // the sentences about the protagonist: those that name it (a literal name is found by containment), or, for "you", the opening of the prompt
  const about = protagonist && protagonist !== "you" ? all.filter((c) => c.text.includes(protagonist)) : all.slice(0, 120);
  // the identity: the first clause of the form "<the protagonist> is <what it is>": the subject is "you" or the name, or the predicate is the name
  // ("The assistant is Claude, created by Anthropic."), or the subject holds the name and the predicate is a name ("This iteration of Claude is Claude Sonnet 5.5.")
  // A clause that names what the protagonist IS ranks above one that merely has it as subject ("Claude is accessible via ..." is availability, not identity):
  //   1  the predicate is a name (a PROPN head): "The assistant is Claude, created by Anthropic.", "This iteration of Claude is Claude Sonnet 5.5.", "You are ChatGPT, ..."
  //   2  the subject is the protagonist and the predicate is a noun phrase with an indefinite article ("a large language model")
  // within a rank, the earliest in the prompt wins
  // The parser is noisy on exactly these sentences (a name tagged as an adjective, the copula clause hung under another verb), so the clause is found
  // by its COPULA, wherever it hangs, and "a name" is the reader's own name signal: a PROPN, or a capitalised word that is not sentence-initial.
  let identity = null, rank = 9;
  const looksNamed = (r) => r.upos === "PROPN" || (r.id > 1 && r.form[0] !== r.form[0].toLowerCase());
  about.slice(0, 160).forEach((c) => {
    if (rank === 1) return;
    const { rows } = read(c);
    for (const cop of rows.filter((r) => r.deprel === "cop")) {
      const H = rows.find((r) => r.id === cop.head); if (!H || rows.some((r) => r.head === H.id && r.deprel === "aux")) continue;   // "can be a calm presence" is not what it is
      const sub = rows.find((r) => r.head === H.id && r.deprel === "nsubj"); if (!sub) continue;
      const inSubject = (r) => { let x = r, n = 0; while (x && n++ < 6) { if (x.id === sub.id) return true; x = rows.find((y) => y.id === x.head); } return false; };
      const youSub = isYou(sub), nameSub = !!protagonist && protagonist !== "you" && sub.form === protagonist, holdsName = !!protagonist && protagonist !== "you" && rows.some((r) => r.form === protagonist && inSubject(r));
      const r1 = looksNamed(H) && (youSub || nameSub || holdsName || H.form === protagonist), r2 = (youSub || nameSub) && H.upos === "NOUN" && rows.some((r) => r.head === H.id && r.deprel === "det" && featsOf(r.feats).Definite === "Ind");
      const got = r1 ? 1 : r2 ? 2 : 9; if (got >= rank) continue;
      const id = predicateOf(rows, H); if (id) { identity = id; rank = got; }
    }
  });
  // the name: the protagonist if it is a name, else the identity's own first phrase ("ChatGPT, a large language model ...")
  const name = protagonist && protagonist !== "you" ? protagonist : identity ? identity.split(",")[0].trim() : null;
  // the prompt as the persona's own fold: the sentences about it, in order, up to the cap (what it can answer "you" questions from)
  let text = "", n = 0; for (const c of about) { if (n + c.text.length > 12000) break; text += (text ? " " : "") + c.text; n += c.text.length; }
  const lines = String(promptText ?? "").split("\n"), tools = [];
  lines.forEach((ln, i) => { const t = ln.trim(); if (t.startsWith("#") && ["tool", "function"].some((w) => t.toLowerCase().includes(w))) for (const nx of lines.slice(i + 1, i + 40)) { const m = nx.trim(); if (m.startsWith("#")) break; if (m.startsWith("## ") || m.startsWith("- `") || m.startsWith("* `")) tools.push(m.replace(/[#*`-]/g, "").trim().split(/[\s:(]/)[0]); } });   // regex-ok: tool names in a markdown file's headings and bullets, a file format and not language
  return { identity, name, source, declaredTools: [...new Set(tools.filter(Boolean))].slice(0, 30), text };
}

// opencode-research.mjs — THE FALSIFIER'S LEGS. When the model asserts something the turn's own material does not
// support, the system goes and looks, mechanically, and tries to settle it either way:
//
//   1. the WORKSPACE — a bounded grep for the claim's subject (prose) or the symbol's definition (code);
//   2. WIKIPEDIA — the article for the claim's subject, read whole as plain text (prose only).
//
// Every finding is evidence with its own address (file:line, or the article URL) and goes back through the SAME
// judge (opencode-profile.mjs) — research never decides by itself, and a claim is never "fixed", only disclosed as
// supported, contradicted, or unsupported with WHERE IT WAS LOOKED FOR.
//
// THE WIKIMEDIA BUDGET (the machine's standing rule): on demand only, one request per 10 s across Wikimedia, every
// answer cached on disk, a bounded number of lookups per answer, and a lookup that would overrun the answer's time
// budget is SKIPPED and said so — never silently dropped, never bulk. Wiktionary and Wikidata are not used here.
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { judge, definitionIn } from "./opencode-profile.mjs";
import { wikipediaArticle, wiktionary } from "./opencode-wiki.mjs";
import { whoIs } from "./opencode-identity.mjs";
import { janusPass } from "./opencode-janus.mjs";

const WIKI_MAX = Number(process.env.FOLD_RESEARCH_MAX ?? 3); // beings looked up per answer
const TEXTY = ["md", "txt", "rst", "adoc", "org", "html", "json", "yaml", "yml", "csv"];
const CODEY = ["ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "go", "rs", "java", "kt", "rb", "swift", "c", "h", "cpp", "cs", "php", "sh"];

/** A bounded grep of the workspace: [{ file, line, text }]. Never reads node_modules, .git, build output. */
export function grepWorkspace(root, pattern, { exts = TEXTY, max = 40, timeout = 4000, word = true } = {}) {
  if (!root || !fs.existsSync(root)) return Promise.resolve([]);
  const args = ["-rIn", "-E", ...(word ? ["-w"] : []), "-i", "--max-count=5", ...exts.map((e) => `--include=*.${e}`),
    "--exclude-dir=node_modules", "--exclude-dir=.git", "--exclude-dir=dist", "--exclude-dir=build", "--exclude-dir=.turbo", "--exclude-dir=.next", "--exclude-dir=target", "--exclude-dir=.venv", pattern, root];
  return new Promise((resolve) => {
    execFile("grep", args, { timeout, maxBuffer: 2_000_000 }, (_err, stdout) => {
      const rows = String(stdout ?? "").split("\n").filter(Boolean).slice(0, max).flatMap((l) => {
        const m = /^(.*?):(\d+):(.*)$/.exec(l);
        return m ? [{ file: path.relative(root, m[1]), line: Number(m[2]), text: m[3].trim().slice(0, 400) }] : [];
      });
      resolve(rows);
    });
  });
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The claim with its subject named by the being identity bound: a bare "Curie"/"she" opening the sentence becomes the full
 *  name, so a source's sentence naming the full person is read as the same subject (and a different person is not). */
export function claimNamed(claim, name) {
  const lead = claim.beings?.[0];
  if (!name || !lead) return claim.text;
  const bare = lead.split(/\s+/).at(-1);
  return claim.text.replace(new RegExp(`^(?:${esc(lead)}|${esc(bare)}|[Ss]he|[Hh]e|[Tt]hey)\\b`), name);
}

/** The subjects a claim could be looked up under, most specific first: its beings (subject first), else its longest
 *  capitalised run past the first word. */
export function subjectsOf(claim) {
  if (claim.beings?.length) return claim.beings.slice(0, 3);
  const one = subjectOf(claim);
  return one ? [one] : [];
}
export function subjectOf(claim) {
  if (claim.beings?.length) return claim.beings[0];
  const toks = claim.text.split(/\s+/);
  let best = "", run = [];
  toks.forEach((w, i) => {
    const clean = w.replace(/^[("'“]|[)"'”,.;:!?]+$/g, "");
    if (i > 0 && /^[A-Z][\p{L}\p{N}-]+$/u.test(clean)) run.push(clean);
    else { if (run.join(" ").length > best.length) best = run.join(" "); run = []; }
  });
  if (run.join(" ").length > best.length) best = run.join(" ");
  return best || null;
}

// The predicates Wikidata states as structured facts, by the words a claim uses for them. A claim that names the
// predicate and a year is checked against the bound entity's own dated statement.
const DATED = [
  { re: /\b(born|birth)\b/i, field: "born", pid: "P569", label: "date of birth" },
  { re: /\b(died|dies|death|passed away)\b/i, field: "died", pid: "P570", label: "date of death" },
];

/** A claim against the bound entity's structured facts: supported / contradicted with the statement as evidence, or null. */
export function structuredVerdict(claim, entity) {
  const ys = (claim.text.match(/\b1\d{3}\b|\b20\d{2}\b/g) ?? []).map(Number);
  if (!ys.length || !entity) return null;
  for (const d of DATED) {
    if (!d.re.test(claim.text)) continue;
    const said = entity[d.field] ?? [];
    if (!said.length) continue;
    const evidence = { source: `wikidata: ${entity.label} (${entity.qid})`, ref: `${entity.qid}#${d.pid}`, url: `${entity.url}#${d.pid}`, text: `${d.label}: ${said.map((x) => x.date).join(" / ")}` };
    if (ys.some((y) => said.some((x) => x.year === y))) return { standing: "supported", evidence };
    return { standing: "contradicted", evidence, why: `${d.label} is ${said.map((x) => x.year).join(" / ")}, not ${ys.join(", ")}` };
  }
  return null;
}

/** Is a capitalised word a name at all? Asked of Wiktionary only when the reader cannot tell (no being resolved it). */
async function isName(word, opts, log) {
  if (/\s/.test(word)) return true; // a run of capitalised words is a name
  const w = await wiktionary(word, opts);
  log.push({ where: "wiktionary", query: word, found: !!w.found, ...(w.upos ? { upos: w.upos } : {}), ...(w.cached ? { cached: true } : {}), ...(w.why ? { why: w.why } : {}) });
  if (!w.found) return true; // unknown to the dictionary: a name is the likelier reading, and identity still decides
  return w.upos.includes("PROPN") || w.entries.some((e) => /proper/i.test(e.heading ?? ""));
}

/** Try to falsify (or support) each unsupported claim by research. Returns the re-judged claims, the beings bound
 *  (which one the text means, and why), and the research log (every request: where, what, cached, or why skipped). */
export async function researchClaims(claims, { workspace = null, budgetMs = Number(process.env.FOLD_RESEARCH_MS ?? 90_000), fetchImpl, text = "" } = {}) {
  const deadline = Date.now() + budgetMs;
  const opts = { deadline, fetchImpl };
  const log = [];
  const bound = new Map(); // name → whoIs result
  const articles = new Map(); // qid → article
  const grepped = new Map();
  const out = [];
  // everything the turn says about a being: the context identity is judged against
  const about = (name) => claims.filter((c) => (c.beings ?? []).includes(name)).map((c) => c.text).join(" ") + " " + text;
  for (const c of claims) {
    if (c.standing !== "unsupported") { out.push(c); continue; }
    const searched = [...(c.searched ?? ["material"])];
    let verdict = { standing: "unsupported" };
    let identity = null;
    // 1. the workspace: the subject's own name, in the project's prose
    const subject = subjectOf(c);
    if (workspace && subject && Date.now() < deadline) {
      if (!grepped.has(subject)) {
        const rows = await grepWorkspace(workspace, esc(subject), { exts: TEXTY });
        grepped.set(subject, rows);
        log.push({ where: "workspace", query: subject, hits: rows.length });
      }
      const rows = grepped.get(subject);
      searched.push("workspace");
      // each file that mentions the subject is an independent source, read as the lines the grep returned
      if (rows.length) verdict = judge(c.text, [...new Set(rows.map((r) => r.file))].map((file) => ({ name: file, text: rows.filter((r) => r.file === file).map((r) => r.text).join("\n") })));
    }
    // 2. the world: WHICH being the text means (Wikidata nominates, identity decides), then its own statements, then
    //    its article. A name no identity binds is disclosed as ambiguous and nothing is judged against a guess.
    for (const name of verdict.standing === "unsupported" ? subjectsOf(c) : []) {
      if (!bound.has(name)) {
        if (bound.size >= WIKI_MAX) { searched.push(`wikidata: ${name} (lookup budget spent)`); break; }
        if (!c.beings?.includes(name) && !(await isName(name, opts, log))) { bound.set(name, { verdict: "none", name, basis: "Wiktionary reads it as a common word, not a name", candidates: [] }); }
        else {
          const who = await whoIs(name, { text: about(name), person: !!c.person && c.beings?.[0] === name, ...opts });
          bound.set(name, who);
          log.push({ where: "wikidata", query: name, verdict: who.verdict, ...(who.entity ? { qid: who.entity.qid, label: who.entity.label } : {}), basis: who.basis });
        }
      }
      const who = bound.get(name);
      if (who.verdict !== "bound") { searched.push(`wikidata: ${name} (${who.verdict}${who.verdict === "skipped" ? "" : `: ${who.basis}`})`); continue; }
      identity = { name, qid: who.entity.qid, label: who.entity.label, description: who.entity.description, url: who.entity.url, basis: who.basis };
      searched.push(`wikidata: ${who.entity.label} (${who.entity.qid})`);
      const structured = structuredVerdict(c, who.entity);
      if (structured) { verdict = structured; break; }
      if (!who.entity.enwiki) break;
      if (!articles.has(who.entity.qid)) articles.set(who.entity.qid, await wikipediaArticle(who.entity.enwiki, opts));
      const a = articles.get(who.entity.qid);
      if (!a.found) { searched.push(`wikipedia: ${who.entity.enwiki} (${a.skipped ? "skipped" : a.why})`); break; }
      searched.push(`wikipedia: ${a.title}`);
      // the bound entity's article is one more independent source (its own domain), judged by the same falsifier; the
      // sentence is read against the NAME the identity bound, so "she"/"Curie" is the person the article is about
      const subject = who.entity.label;
      const sentence = claimNamed(c, subject);
      const article = [{ name: `wikipedia: ${a.title}`, text: a.text, url: a.url }];
      verdict = judge(sentence, article);
      // order and counts are arithmetic over the article's own numbers, decided by Janus
      if (verdict.standing === "unsupported") verdict = (await janusPass([{ ...c, text: sentence, ...verdict }], article))[0];
      if (verdict.evidence) verdict.evidence = { ...verdict.evidence, url: a.url };
      break;
    }
    out.push({ ...c, ...verdict, searched, ...(identity ? { identity } : {}), ...(verdict.standing !== "unsupported" ? { researched: true } : {}) });
  }
  const beings = [...bound.values()].map((w) => ({ name: w.name, verdict: w.verdict, basis: w.basis, ...(w.entity ? { qid: w.entity.qid, label: w.entity.label, description: w.entity.description, url: w.entity.url } : {}), candidates: (w.candidates ?? []).slice(0, 5) }));
  return { claims: out, beings, log };
}

/** Code: a symbol not found (or a key whose function was not read) is looked for in the workspace's own source. */
export async function researchSymbols(symbols, { workspace = null, budgetMs = 8000 } = {}) {
  const deadline = Date.now() + budgetMs;
  const log = [];
  const files = new Map();
  const readFile = (rel) => { if (!files.has(rel)) { try { files.set(rel, fs.readFileSync(path.join(workspace, rel), "utf8")); } catch { files.set(rel, ""); } } return files.get(rel); };
  const out = [];
  for (const s of symbols) {
    const target = s.kind === "key" && s.standing === "unchecked" ? s.of : s.standing === "not_found" && s.kind !== "path" ? s.name : null;
    if (!workspace || !target || Date.now() > deadline) { out.push(s); continue; }
    const rows = await grepWorkspace(workspace, `(function|const|let|var|class|def|interface|type)[[:space:]]+${esc(target)}([^A-Za-z0-9_$]|$)`, { exts: CODEY, word: false, max: 5 });
    log.push({ where: "workspace", query: target, hits: rows.length });
    const def = rows.length ? definitionIn(target, rows.map((r) => ({ name: `${r.file}`, text: readFile(r.file) }))) : null;
    if (!def) { out.push({ ...s, searched: ["material", "workspace"] }); continue; }
    if (s.kind === "key") {
      const has = new RegExp(`(^|[^\\w$])${esc(s.name)}([^\\w$]|$)`).test(def.signature);
      const takes = (/\{([^{}]*)\}/.exec(def.signature)?.[1] ?? "").split(/[;,]/).map((x) => /^\s*([A-Za-z_$][\w$]*)\??\s*:/.exec(x)?.[1]).filter(Boolean);
      out.push({ ...s, standing: has ? "found" : "contradicted", ref: `${def.passage}:${def.line}`, ...(has ? {} : { why: takes.length ? `${s.of} takes { ${takes.join(", ")} }` : `${s.of}'s signature has no ${s.name}` }), evidence: { source: def.passage, ref: `${def.passage}:${def.line}`, text: def.signature }, searched: ["material", "workspace"], researched: true });
    } else out.push({ ...s, standing: "found", ref: `${def.passage}:${def.line}`, evidence: { source: def.passage, ref: `${def.passage}:${def.line}`, text: def.signature }, searched: ["material", "workspace"], researched: true });
  }
  return { symbols: out, log };
}

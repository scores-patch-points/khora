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
import { checkByIdentity, nounLemmasOf, subjectNounsOf } from "./opencode-keyed.mjs";
import { primaryFor } from "./opencode-primary.mjs";
import { makeGetJson } from "./opencode-wiki.mjs";

const WIKI_MAX = Number(process.env.FOLD_RESEARCH_MAX ?? 4); // beings looked up per answer
const PRIMARY_MAX = Number(process.env.FOLD_PRIMARY_MAX ?? 10);
const RESEARCH_CLAIMS = Number(process.env.FOLD_RESEARCH_CLAIMS ?? 8); // claims researched per answer
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
export function subjectsOf(claim, named = () => true) {
  const names = (claim.beings ?? []).filter((b) => properName(b) && named(b));
  if (names.length) return names.slice(0, 3);
  const one = subjectOf(claim);
  return one && properName(one) && named(one) ? [one] : [];
}

// A thing worth a lookup is a NAME: a capitalised word that is not a determiner phrase ("the water", "the animal" are noun phrases the
// referent reader individuates, not beings anyone could look up). Declared, English-shaped: a language without capitals is a typed gap
// here (nothing is looked up), never a guess. A single word must also be written capitalised somewhere NOT at a sentence start
// ("Web" opening a sentence is a word, "Curie" in the middle of one is a name) — the `named` check the caller builds from the answer.
const DETERMINER = /^(?:the|a|an|this|that|these|those|their|his|her|its|our|my|your|some|many|most|each|every|all|no)\s/i;
export const properName = (name) => /^\p{Lu}/u.test(String(name ?? "")) && !DETERMINER.test(String(name ?? ""));
/** Names written capitalised in the middle of a sentence of `text`: the answer's own evidence that a capitalised word is a name. */
export function midSentenceNames(text) {
  const out = new Set();
  for (const m of String(text ?? "").matchAll(/(?<=[^.!?\n]\s)\p{Lu}[\p{L}'’-]+(?:\s+\p{Lu}[\p{L}'’-]+)*/gu)) out.add(m[0]);
  return out;
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
export async function researchClaims(claims, { workspace = null, budgetMs = Number(process.env.FOLD_RESEARCH_MS ?? 90_000), fetchImpl, text = "", answer = "", keyed = process.env.FOLD_KEYED !== "0", ask = "" } = {}) {
  const deadline = Date.now() + budgetMs;
  const opts = { deadline, fetchImpl };
  const log = [];
  const bound = new Map(); // name → whoIs result
  const articles = new Map(); // qid → article
  const grepped = new Map();
  let primaryUsed = 0;
  const primaryOn = process.env.FOLD_PRIMARY !== "0";
  const out = [];
  // every article the falsifier read, kept whole so the window can show a claim in its source
  const pages = new Map();
  const keep = (a) => pages.set(a.url, { name: `wikipedia: ${a.title}`, url: a.url, text: a.text });
  // everything the turn says about a being: the context identity is judged against
  const about = (name) => claims.filter((c) => (c.beings ?? []).includes(name)).map((c) => c.text).join(" ") + " " + text;
  // The lookup budget is spent where a lookup can settle something: a claim that carries a figure or a date AND names a being. The rest
  // stay unsupported — said so — and a long essay is not 70 requests at one per 10 s.
  const mid = midSentenceNames(answer || claims.map((c) => c.text).join(" "));
  const named = (b) => b.includes(" ") || mid.has(b);
  // keyed (the default): a sentence that names a being is worth a look even with no figure — the entity's own keys may name its relation
  const eligible = new Set(claims.filter((c) => c.standing === "unsupported" && (keyed || /\d/.test(c.text)) && subjectsOf(c, named).length).slice(0, RESEARCH_CLAIMS));
  // THE TOPIC AS A THING. An essay "about dolphins" names no being, so no claim of it is eligible above; but its topic noun is the one thing most of its claims
  // are about. The noun (the parser prior's lemma, most claims, preferring the ask's) is bound to its encyclopedia article, and the claims that mention it are judged
  // against that article by the same falsifier. A topic that is not a single article (a disambiguation) binds nothing and says so.
  let topic = null;
  const pending = claims.filter((c) => (c.standing === "unsupported" || c.standing === "argument") && !eligible.has(c));
  // OFF unless FOLD_TOPIC=1: measured 2026-10-20, the article judged "Dolphins are fish." SUPPORTED from "dolphins ... feed largely on fish" (shared stems, no relation read)
  if (process.env.FOLD_TOPIC === "1" && pending.length >= 3 && Date.now() < deadline) {
    const askNouns = new Set(await nounLemmasOf(ask));
    const counts = new Map();
    const lemmas = new Map();
    for (const c of pending) { const ls = [...new Set(await nounLemmasOf(c.text))]; lemmas.set(c, new Set(ls)); for (const l of ls) counts.set(l, (counts.get(l) ?? 0) + 1); }
    const best = [...counts].filter(([, n]) => n >= 3 && n >= pending.length * 0.2).sort((a, b) => (askNouns.has(b[0]) - askNouns.has(a[0])) || b[1] - a[1])[0];
    if (best) {
      const title = best[0][0].toUpperCase() + best[0].slice(1);
      const article = await wikipediaArticle(title, opts);
      log.push({ where: "wikipedia", query: title, topic: true, found: article.found, why: article.found ? null : article.why });
      topic = { lemma: best[0], title, article, lemmas };
    }
  }
  // THE CLAIM'S OWN SUBJECT. A claim that names no being is still about something: its subject nouns (subjectNounsOf: before the verb,
  // head first), at most three, are tried as encyclopedia articles, and the first article found judges the claim by the same falsifier. A disambiguation
  // binds nothing. Supported or contradicted is recorded with the article as evidence; silence leaves the claim unsupported, with the
  // article named where it looked. FOLD_SUBJECT_NOUN=0 turns it off.
  let nounLooks = 0;
  const bySubjectNoun = async (c) => {
    if (process.env.FOLD_SUBJECT_NOUN === "0") return null;
    nounLooks++;
    const searched = [...(c.searched ?? ["material"])];
    for (const lemma of (await subjectNounsOf(c.text)).slice(0, 3)) {
      if (Date.now() >= deadline) break;
      const title = lemma[0].toUpperCase() + lemma.slice(1);
      if (!articles.has(title)) {
        const found = await wikipediaArticle(title, opts);
        articles.set(title, found);
        log.push({ where: "wikipedia", query: title, subjectNoun: true, found: found.found, why: found.found ? null : found.why });
      }
      const a = articles.get(title);
      if (!a.found) continue;
      keep(a);
      searched.push(`wikipedia: ${a.title} (the claim's subject: ${lemma})`);
      let verdict = judge(c.text, [{ name: `wikipedia: ${a.title}`, text: a.text, url: a.url }]);
      if (verdict.standing === "unsupported") verdict = (await janusPass([{ ...c, ...verdict }], [{ name: `wikipedia: ${a.title}`, text: a.text }]))[0];
      if (verdict.evidence) verdict.evidence = { ...verdict.evidence, url: a.url };
      if (verdict.standing === "supported" || verdict.standing === "contradicted")
        return { ...c, ...verdict, searched, researched: true, ...(verdict.standing === "supported" ? { tier: "index" } : {}) };
      return { ...c, searched };
    }
    return searched.length > (c.searched ?? ["material"]).length ? { ...c, searched } : null;
  };
  for (const c of claims) {
    // a sentence the gate called argument (it names no being, number or quote) that states a fact about the bound topic is judged too, and is PROMOTED only by evidence:
    // the article states it (supported) or contradicts it; silence leaves it exactly what it was
    if (c.standing === "argument" && topic?.article.found && topic.lemmas.get(c)?.has(topic.lemma)) {
      const a = topic.article;
      keep(a);
      const v = judge(c.text, [{ name: `wikipedia: ${a.title}`, text: a.text, url: a.url }]);
      if (v.standing === "supported" || v.standing === "contradicted") {
        out.push({ ...c, ...v, ...(v.evidence ? { evidence: { ...v.evidence, url: a.url } } : {}), searched: [`wikipedia: ${a.title} (the topic: ${topic.lemma})`], researched: true, ...(v.standing === "supported" ? { tier: "index" } : {}) });
        continue;
      }
    }
    if (c.standing !== "unsupported") { out.push(c); continue; }
    if (!eligible.has(c) && topic?.article.found && topic.lemmas.get(c)?.has(topic.lemma)) {
      const a = topic.article;
      keep(a);
      let verdict = judge(c.text, [{ name: `wikipedia: ${a.title}`, text: a.text, url: a.url }]);
      if (verdict.standing === "unsupported") verdict = (await janusPass([{ ...c, ...verdict }], [{ name: `wikipedia: ${a.title}`, text: a.text }]))[0];
      if (verdict.evidence) verdict.evidence = { ...verdict.evidence, url: a.url };
      out.push({ ...c, ...verdict, searched: [...(c.searched ?? ["material"]), `wikipedia: ${a.title} (the topic: ${topic.lemma})`], ...(verdict.standing === "supported" ? { tier: "index", researched: true } : verdict.standing === "contradicted" ? { researched: true } : {}) });
      continue;
    }
    if (!eligible.has(c)) {
      // a claim with no named being is looked up by its own subject noun ("The element radium glows…" → Radium)
      const found = nounLooks < RESEARCH_CLAIMS && Date.now() < deadline ? await bySubjectNoun(c) : null;
      out.push(found ?? { ...c, searched: [...(c.searched ?? ["material"]), "not researched: no figure or no name to look up"] });
      continue;
    }
    const searched = [...(c.searched ?? ["material"])];
    let verdict = { standing: "unsupported" };
    let identity = null;
    let indexTitle = null;
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
    for (const name of verdict.standing === "unsupported" ? subjectsOf(c, named) : []) {
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
      indexTitle = who.entity.enwiki ?? null;
      identity = { name, qid: who.entity.qid, label: who.entity.label, description: who.entity.description, url: who.entity.url, basis: who.basis };
      searched.push(`wikidata: ${who.entity.label} (${who.entity.qid})`);
      // THE KEYED DOOR first (opencode-keyed.mjs): the sentence's relation as a key of the entity's own kind, the typed value against the filler.
      // A refusal is typed and goes in the trail; the dated-statement check below stays as the fallback.
      if (keyed) {
        const getJson = makeGetJson({ known: { pageprops: { [who.entity.enwiki]: who.entity.qid } }, ...opts });
        const k = await checkByIdentity({ claim: c.text, anchorNames: [name, who.entity.label].filter(Boolean), entity: who.entity, getJson });
        if (k.standing) { verdict = { standing: k.standing, evidence: k.evidence, ...(k.why ? { why: k.why } : {}), keyed: { property: k.property?.id, label: k.property?.label, values: k.values } }; searched.push(`wikidata key: ${k.property?.label} (${k.property?.id})`); break; }
        searched.push(`wikidata key: ${k.gap}${k.detail ? ` — ${k.detail}` : ""}`);
        log.push({ where: "wikidata-key", query: c.text.slice(0, 60), gap: k.gap, detail: k.detail ?? null });
      }
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
      keep(a);
      verdict = judge(sentence, article);
      // order and counts are arithmetic over the article's own numbers, decided by Janus
      if (verdict.standing === "unsupported") verdict = (await janusPass([{ ...c, text: sentence, ...verdict }], article))[0];
      if (verdict.evidence) verdict.evidence = { ...verdict.evidence, url: a.url };
      break;
    }
    // THE PRIMARY TIER (opencode-primary.mjs): an encyclopedia is an index, so the footnote on the sentence that states the claim is followed to the page it
    // cites; a page of another kind of host that asserts the claim under The Fold's strict gate makes the tier "primary", else a researched support stays "index".
    let tier = null;
    if (primaryOn && identity && indexTitle && (verdict.standing === "supported" || verdict.standing === "unsupported") && primaryUsed < PRIMARY_MAX && Date.now() < deadline) {
      primaryUsed++;
      const pr = await primaryFor({ claim: claimNamed(c, identity.label ?? identity.name), indexTitle, deadline, fetchImpl });
      log.push({ where: "primary", query: c.text.slice(0, 60), tier: pr.tier, hosts: (pr.trail ?? []).map((t) => `${t.host ?? ""}:${t.verdict}${t.why ? `:${t.why}` : ""}`).slice(0, 8) });
      if (pr.tier === "primary") {
        searched.push(`primary: ${pr.evidence.source}`);
        if (verdict.standing === "unsupported") verdict = { standing: "supported", evidence: pr.evidence };
        verdict = { ...verdict, primary: pr.evidence };
        tier = "primary";
      } else searched.push(`primary: none (${(pr.trail ?? []).at(-1)?.why ?? "no page"})`);
    }
    if (!tier && verdict.standing === "supported" && identity) tier = "index";
    out.push({ ...c, ...verdict, searched, ...(tier ? { tier } : {}), ...(identity ? { identity } : {}), ...(verdict.standing !== "unsupported" ? { researched: true } : {}) });
  }
  const beings = [...bound.values()].map((w) => ({ name: w.name, verdict: w.verdict, basis: w.basis, ...(w.entity ? { qid: w.entity.qid, label: w.entity.label, description: w.entity.description, url: w.entity.url } : {}), candidates: (w.candidates ?? []).slice(0, 5) }));
  return { claims: out, beings, log, pages: [...pages.values()] };
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

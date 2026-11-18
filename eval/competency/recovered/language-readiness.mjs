#!/usr/bin/env node
// language-readiness.mjs — the roadmap for "get better at all our languages".
//
// A language reads NATIVELY when the stack is complete, and the stack is four
// pieces on disk (the seam needs only a prior + a thin parameter, never new
// machinery — reader-lat.mjs's own doctrine):
//   1. POS prior          janus/priors/pos-<code>.json        (the verb lexicon)
//   2. case-marking prior janus/priors/case-marking-<code>.json (the case-ending tables)
//   3. a reader           scene/reader-<code>.mjs (or greek-read/reader-en)
//   4. (optional) a lemma prior  janus/priors/lemma/<code>-lemma.json (the being resolver)
// An ARTICLE-case language (German) needs no case prior: the article carries case.
// A language with 1+2 but no reader is ONE PARAMETER from reading. A language with
// only 1 is a typed gap that needs its case prior built from its treebank.
//
// Reads only; writes LANGUAGE-READINESS.md and manifests/language-readiness.json.
// Deterministic. Falsifying control: a language reported "reading" with no reader
// file on disk, or "case-ready" with no case-marking prior, is a bug.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LP = path.join(HERE, "..");
const PRIORS = path.join(LP, "..", "janus", "priors");
const SCENE = path.join(LP, "..", "khora", "native", "eval", "the-fold", "scene");
const FIXTURES = path.join(LP, "..", "khora", "native", "eval", "fixtures");

const READERS = { grc: "greek-read.mjs", ell: "greek-read.mjs", lat: "reader-lat.mjs",
  san: "reader-san.mjs", deu: "reader-deu.mjs", eng: "reader-en.mjs", rus: "reader-rus.mjs",
  spa: "reader-params.mjs", ita: "reader-params.mjs", por: "reader-params.mjs",
  fas: "reader-params.mjs", ara: "reader-params.mjs", tur: "reader-params.mjs", nld: "reader-params.mjs", fra: "reader-params.mjs" };
// article-case languages: no case-marking prior needed
const ARTICLE = new Set(["deu", "nld", "eng", "grc", "ell"]); // Greek's article is a case probe
const NAMES = { grc: "Ancient Greek", lat: "Latin", san: "Sanskrit", rus: "Russian", deu: "German",
  eng: "English", ell: "Modern Greek", fas: "Persian", arb: "Arabic", heb: "Hebrew", spa: "Spanish",
  fra: "French", ita: "Italian", por: "Portuguese", cat: "Catalan", glg: "Galician", nld: "Dutch",
  pol: "Polish", ces: "Czech", slk: "Slovak", slv: "Slovene", hrv: "Croatian", srp: "Serbian",
  bul: "Bulgarian", ron: "Romanian", hun: "Hungarian", fin: "Finnish", est: "Estonian", lit: "Lithuanian",
  lav: "Latvian", tur: "Turkish", vie: "Vietnamese", ind: "Indonesian", ja: "Japanese", ko: "Korean",
  zh: "Chinese", cmn: "Mandarin", lzh: "Literary Chinese", hin: "Hindi", urd: "Urdu", mar: "Marathi",
  tam: "Tamil", tel: "Telugu", hye: "Armenian", kat: "Georgian", heb2: "Hebrew", eus: "Basque",
  cym: "Welsh", gle: "Irish", mlt: "Maltese", afr: "Afrikaans", nob: "Norwegian", swe: "Swedish",
  dan: "Danish", uig: "Uyghur", wol: "Wolof" };

const has = (p) => fs.existsSync(p);
const posLangs = fs.readdirSync(PRIORS).filter((f) => /^pos-[a-z0-9-]+\.json$/.test(f)).map((f) => f.replace(/^pos-|\.json$/g, ""));
const caseLangs = has(PRIORS) ? fs.readdirSync(PRIORS).filter((f) => /^case-marking-.*\.json$/.test(f)).map((f) => f.replace(/^case-marking-|\.json$/g, "")) : [];
const all = [...new Set([...posLangs, ...caseLangs])].sort();

const rows = [];
for (const code of all) {
  const pos = has(path.join(PRIORS, `pos-${code}.json`));
  const cse = has(path.join(PRIORS, `case-marking-${code}.json`));
  const paramsPrior = has(path.join(PRIORS, `params-${code}.json`));
  const lemma = has(path.join(PRIORS, "lemma", `${code}-lemma.json`));
  const role = has(path.join(PRIORS, `role-config-${code}.json`));
  const readerFile = READERS[code] && has(path.join(SCENE, READERS[code])) ? READERS[code] : null;
  const article = ARTICLE.has(code);
  const fixture = has(FIXTURES) && fs.readdirSync(FIXTURES).some((d) => d.includes(code) || d.includes(NAMES[code]?.toLowerCase() ?? "\u0000"));

  let tier, next;
  if (readerFile && (cse || article || paramsPrior)) { tier = "reading"; next = lemma ? "—" : "build the lemma prior (being resolver)"; }
  else if (pos && cse) { tier = "case-ready"; next = `add reader-${code}.mjs (one parameter: pos-${code} + case-marking-${code})`; }
  else if (pos && paramsPrior) { tier = "params-reader"; next = `add ${code} to reader-params (parametrize: pos-${code} + params-${code})`; }
  else if (pos && article) { tier = "article-ready"; next = `add reader-${code}.mjs (article-case seam)`; }
  else if (pos) { tier = "lexical-only"; next = cse ? "reader" : `build case-marking-${code}.json${fixture ? " (treebank fixture on disk)" : " (needs the treebank)"}`; }
  else { tier = "case-prior-only"; next = `build pos-${code}.json`; }

  rows.push({ code, name: NAMES[code] ?? code, pos, cse, lemma, role, reader: readerFile, fixture, tier, next });
}

const order = { reading: 0, "case-ready": 1, "article-ready": 2, "params-reader": 3, "lexical-only": 4, "case-prior-only": 5 };
rows.sort((a, b) => (order[a.tier] - order[b.tier]) || a.code.localeCompare(b.code));

const report = { schema: "LanguageReadiness@1", generatedAt: new Date().toISOString(),
  instrument: "scripts/language-readiness.mjs", pieces: ["pos prior", "case-marking prior", "reader", "lemma prior"],
  languages: rows };
fs.writeFileSync(path.join(LP, "manifests", "language-readiness.json"), JSON.stringify(report, null, 1));

const L = [];
L.push("# Language Readiness — the roadmap to reading every language natively");
L.push("");
L.push(`*Generated ${new Date().toISOString().slice(0, 10)} by \`node scripts/language-readiness.mjs\`. The stack is four pieces on disk; a language reads when it has a POS prior + (a case-marking prior OR an article-case grammar) + a reader. Reads only.*`);
L.push("");
const tally = {}; for (const r of rows) tally[r.tier] = (tally[r.tier] ?? 0) + 1;
L.push(`**${rows.length} languages** — reading **${tally.reading ?? 0}** · case-ready **${tally["case-ready"] ?? 0}** · article-ready **${tally["article-ready"] ?? 0}** · params-reader **${tally["params-reader"] ?? 0}** · lexical-only **${tally["lexical-only"] ?? 0}** · case-prior-only **${tally["case-prior-only"] ?? 0}**.`);
L.push("");
L.push("## Reading now");
L.push("");
L.push("| Language | POS | Case | Lemma | Role | Reader | Fixture | Next |");
L.push("|---|---|---|---|---|---|---|---|");
for (const r of rows.filter((x) => x.tier === "reading" || x.tier === "case-ready" || x.tier === "article-ready")) {
  const ck = (b) => b ? "✓" : "—";
  L.push(`| ${r.name} (\`${r.code}\`) | ${ck(r.pos)} | ${ck(r.cse)} | ${ck(r.lemma)} | ${ck(r.role)} | ${r.reader ?? "—"} | ${ck(r.fixture)} | ${r.next} |`);
}
L.push("");
L.push("## The nearest wins (case-ready — one parameter from reading)");
L.push("");
const cr = rows.filter((r) => r.tier === "case-ready");
L.push(cr.length ? cr.map((r) => `- **${r.name}** — \`${r.next}\``).join("\n") : "_none_");
L.push("");
L.push("## Lexical-only (need a case prior, built from a treebank)");
L.push("");
const lo = rows.filter((r) => r.tier === "lexical-only");
L.push(lo.length ? lo.map((r) => `- ${r.name} (\`${r.code}\`)${r.fixture ? " — treebank fixture on disk" : ""}`).join("\n") : "_none_");
L.push("");
L.push("## Falsifying controls");
L.push("");
L.push("- A language reported **reading** with no reader file on disk is a bug.");
L.push("- A language reported **case-ready** with no `case-marking-<code>.json` is a bug.");
L.push("- Re-running reproduces the table (deterministic).");
L.push("");
fs.writeFileSync(path.join(LP, "LANGUAGE-READINESS.md"), L.join("\n"));

console.log(`wrote LANGUAGE-READINESS.md (${rows.length} languages)`);
console.log(`  reading ${tally.reading ?? 0} · case-ready ${tally["case-ready"] ?? 0} · article-ready ${tally["article-ready"] ?? 0} · lexical-only ${tally["lexical-only"] ?? 0}`);
for (const r of rows.filter((x) => x.tier === "case-ready")) console.log(`  nearest win: ${r.name} → ${r.next}`);

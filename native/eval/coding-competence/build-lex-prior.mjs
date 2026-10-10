// build-lex-prior.mjs: build priors/code-lex-<language>.json (CodeLexPrior@1) from TRAIN gold only.
//
//   node eval/coding-competence/build-lex-prior.mjs --language python [--max-files N] [--out DIR]
//
// GIVER: the tree-sitter grammar of the language (tree-sitter-language-pack, or the named standalone grammar), read through
// eval/coding-competence/gold.mjs (gold-1). The prior is a statistic over what that grammar calls a token in TRAIN
// repositories; nothing is typed per language here. Split by REPOSITORY (the manifest's own split); this script never reads
// a dev or test row. The prior records its train repos (with commit and licence from the manifest) and train file hashes,
// and c1-lex.mjs refuses to score a file whose repo is among them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, selectRows, loadDocs, GOLD_ERR_TOL, MAX_BYTES } from "./c1-common.mjs";
import { deriveLexPrior, lexPriorFile } from "../../adapters/code/lex.js";
import { GOLD_VERSION } from "./gold.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const language = opt("--language");
if (!language) { console.error("usage: build-lex-prior.mjs --language <lang> [--max-files N] [--out DIR]"); process.exit(2); }
const maxFiles = Number(opt("--max-files", 100000)); // default: every eligible TRAIN file (amendment A3 in c1-lex.mjs; was 150)
const outDir = opt("--out", null);

const manifest = loadManifest();
const sel = selectRows(manifest, language, "train", maxFiles);
if (!sel.rows.length) { console.error(`no TRAIN rows for ${language}`); process.exit(1); }
const t0 = Date.now();
const { docs, gaps } = await loadDocs(language, sel.rows);
const repos = [...new Set(docs.map((d) => d.repo))].sort();
const prior = deriveLexPrior(docs.map((d) => ({ repo: d.repo, text: d.text, tokens: d.tokens })), {
  language,
  grammar: docs[0]?.gold.grammar ?? null,
  goldVersion: GOLD_VERSION,
  giver: `tree-sitter grammar \`${docs[0]?.gold.grammar ?? language}\` (tree-sitter-language-pack via eval/coding-competence/gold.py, ${GOLD_VERSION}), TRAIN repositories only`,
  trainRepos: repos.map((r) => ({ repo: r, ...(({ url, commit, license, license_text_family }) => ({ url, commit, license, license_text_family }))(manifest.repos?.[r] ?? {}) })),
  trainFiles: docs.map((d) => ({ rel: d.row.rel, repo: d.repo, sha256: d.row.sha256, bytes: d.row.bytes })),
});
prior.provenance.selection = { split: "train", maxFiles, maxBytes: MAX_BYTES, goldErrTol: GOLD_ERR_TOL, eligible: sel.total, excluded: sel.excluded, gaps, builtAt: new Date().toISOString().slice(0, 10) };
const dest = outDir ? path.join(outDir, `code-lex-${language}.json`) : fileURLToPath(lexPriorFile(language));
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(prior, null, 1) + "\n");
const summary = {
  language, dest, files: docs.length, repos: repos.length, tokens: prior.provenance.trainTokens,
  keywords: prior.words.keyword.length, literals: prior.words.literal.length, symbols: Object.keys(prior.symbols.table).length,
  comments: prior.comments.map((c) => `${c.open}..${c.close ?? "EOL"} (${c.matchRate})`),
  strings: prior.strings.map((s) => `${s.open}${s.escape ? " esc" : ""}${s.multiline ? " ml" : ""}${s.trailing ? " trail" : ""}${s.interp.length ? " interp" + s.interp.join("") : ""}${s.prefixes.length ? " pre:" + s.prefixes.join(",") : ""} (${s.matchRate})`),
  conditional: prior.conditional.map((c) => `${c.kind}:${c.open}${c.close ? ".." + c.close : ""} after text[${c.afterText.slice(0, 8).join(" ")}${c.afterText.length > 8 ? " +" + (c.afterText.length - 8) : ""}] class[${c.afterClass.join(" ")}] n=${c.n} (${c.matchRate})`),
  wordChars: prior.wordChars, ms: Date.now() - t0,
};
console.log(JSON.stringify(summary));

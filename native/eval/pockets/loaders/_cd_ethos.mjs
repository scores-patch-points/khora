// loaders/_cd_ethos.mjs — pockets from /Users/mlacy/Documents/3.0/Zenodotus/09-source-code (landmark + audited upstream code, plus the user's own EO matrix app).
// Each language has only a handful of long files, so a document is a block of 300 non-empty lines inside one file (never spanning files); the EO app and the docs pocket use whole files.
import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../lib/pocket.mjs";
import { codeText, proseSentences, newStats, sumStats, blocksOf, takeDocs, makePocket, entry, readText, sortedFiles } from "./_cd_util.mjs";

export const E09 = "/Users/mlacy/Documents/3.0/Zenodotus/09-source-code";
const EOAPP = "clovenbradshaw_bare-metal-eo-matrix-app";
const CODE_TOK = "code tokens: maximal runs of letters/marks/digits/underscore, lowercased NFC, NOT split on camelCase or snake_case; numeric literals (token starting with a digit), unspaced-script characters and tokens > 64 characters dropped; operators and punctuation dropped; comment and string words kept; unit = physical source line with >= 1 token";

function walk(dir) { const out = []; for (const f of fs.readdirSync(dir).sort()) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) out.push(...walk(p)); else out.push(p); } return out; }
const allFiles = () => fs.existsSync(E09) ? walk(E09) : [];
const upstream = (p) => !p.includes(`/${EOAPP}/`);

function blockPocket(id, language, exts, blockLines) {
  return entry(id, () => {
    const files = allFiles().filter((p) => upstream(p) && exts.includes(path.extname(p)));
    const blocks = [], per = [];
    for (const f of files) { const st = newStats(); const u = codeText(readText(f), st); per.push(st); for (const b of blocksOf(u, blockLines)) blocks.push({ f, b }); }
    const r = takeDocs(id, blocks, (c) => (c.b.length >= 50 ? c.b : []));
    return makePocket({ id, register: "code", language, script: "latn", units: r.units, docOf: r.docOf, meta: {
      tokenisation: CODE_TOK, docDef: `block of ${blockLines} consecutive non-empty lines inside one file (blocks of < 50 lines at a file end dropped); whole blocks in sha256(id:blockIndex) order`,
      source: `${E09} files with extension ${exts.join(",")} (excluding ${EOAPP}); ${files.length} files`,
      notes: `upstream landmark/audited system code (${files.map((f) => path.basename(path.dirname(f))).filter((v, i, a) => a.indexOf(v) === i).join(", ")}); not a natural language; token-drop counters over all files: ${JSON.stringify(sumStats(per))}`,
    } });
  });
}

const DOC_EXT = new Set([".txt", ".md", ".rst"]);
const DOC_BARE = new Set(["Documentation_CodingGuidelines", "PROTOCOL"]);
const SKIP_DOC = /(^|\/)(PROVENANCE\.md|VETTING\.md|LICENSE\.txt|[^/]*\.eot\.json|AUTHORS\.md\.txt|Releases\.md\.txt|CHANGELOG\.md\.txt|CHANGES\.rst\.txt)$/; // licence text, repo-authored files, contributor-name lists and release-note bullet logs (not prose)
export function ethosEntries() {
  if (!fs.existsSync(E09)) return [];
  return [
    blockPocket("cd-e09-c", "x-c", [".c", ".h"], 300),
    blockPocket("cd-e09-cpp", "x-cpp", [".cpp"], 300),
    blockPocket("cd-e09-go", "x-go", [".go"], 300),
    blockPocket("cd-e09-python", "x-python", [".py"], 300),
    entry("cd-e09-eoapp-js", () => {
      const files = walk(path.join(E09, EOAPP)).filter((p) => [".js", ".jsx"].includes(path.extname(p)));
      const per = new Map();
      const r = takeDocs("cd-e09-eoapp-js", files, (f, i) => { const s = newStats(); const u = codeText(readText(f), s); per.set(i, s); return u; });
      return makePocket({ id: "cd-e09-eoapp-js", register: "code", language: "x-javascript", script: "latn", units: r.units, docOf: r.docOf, meta: {
        tokenisation: CODE_TOK, docDef: "one source file (.js/.jsx) = one document", source: `${E09}/${EOAPP}, ${files.length} files`,
        notes: `the user's own EO matrix web app (JavaScript + JSX); not natural language; token-drop counters: ${JSON.stringify(sumStats([...per.values()]))}` } });
    }),
    entry("cd-e09-docs", () => {
      const seenHash = new Set(), dupSkipped = [];
      const files = allFiles().filter((p) => upstream(p) && (DOC_EXT.has(path.extname(p)) || DOC_BARE.has(path.basename(p))) && !SKIP_DOC.test(p) && p !== path.join(E09, "README.md")).filter((p) => { const h = sha256(fs.readFileSync(p)); if (seenHash.has(h)) { dupSkipped.push(path.basename(p)); return false; } seenHash.add(h); return true; });
      const per = new Map();
      const r = takeDocs("cd-e09-docs", files, (f, i) => { let t = readText(f); if (/\.html(\.in)?\.txt$/.test(f)) t = t.replace(/<[^>]+>/g, " "); const s = newStats(); const u = proseSentences(t, s); per.set(i, s); return u; });
      return makePocket({ id: "cd-e09-docs", register: "docs", language: "en", script: "latn", units: r.units, docOf: r.docOf, meta: {
        tokenisation: "prose words: runs of letters/marks/digits/underscore with inner apostrophes kept (don't), lowercased NFC, numeric-initial tokens dropped; HTML tags stripped for .html.txt files; fenced code blocks skipped; unit = sentence (split after . ! ? + whitespace inside re-joined paragraphs)",
        docDef: "one upstream documentation file (.md/.txt/.rst) = one document", source: `${E09} upstream docs (LICENSE/COPYING/PROVENANCE/VETTING, the repo-authored root README, AUTHORS name lists, release-note changelogs and byte-identical duplicates [${dupSkipped.join(", ") || "none"}] excluded); ${files.length} candidate files, ${r.docKeys.length} taken`,
        notes: `technical prose about code: kernel coding style, CPython tutorial, PostgreSQL READMEs, Go and ziglang references (English); token-drop counters: ${JSON.stringify(sumStats(r.docKeys.map((i) => per.get(i))))}` } });
    }),
  ];
}

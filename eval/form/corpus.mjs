// eval/form/corpus.mjs — the corpora the form skeletons are measured on: what is local and licensed (the user's own workspace).
// No local Wikipedia exists under ~/Downloads/workspace (only Wiktionary slim and translation packs, which are dictionaries, not pieces), and the
// VM is not asked anything; so the essay skeleton is read off the workspace's own essays, the README skeleton off the repos' README.md files, and
// the table skeleton off the markdown tables those documents carry. Identical copies (vaulted or vendored duplicates) count once, by sha256.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const WORKSPACE = "/Users/mlacy/Downloads/workspace";
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

/** Essays: the pieces the workspace itself calls essays (by file name or by their own subtitle), plus the standing-finding essays written in the
 * same frame. Not taken: memos, fiction (scenes, a fan story), ledgers, notes under 400 words, tables. */
export const ESSAYS = [
  "WHAT-THE-FOLD-IS-BECOMING-ESSAY.md",
  "WIKTIONARY-HOLOGRAPH-HYPERLEXICON-ESSAY.md",
  "OPENCODE-X-THE-FOLD-ESSAY.md",
  "THE-FOLD-PRIOR-ART-ESSAY.md",
  "penelope/gym/composed/the-weight-of-witness.md",
  "penelope/gym/composed/the-mirror-ages.md",
  "penelope/gym/composed/the-verge-of-being.md",
  "penelope/gym/composed/sea-turtles-essay.md",
  "penelope/gym/composed/sea-turtles-essay-gemma.md",
  "penelope/gym/composed/sea-turtles-cited.md",
  "penelope/gym/composed/sea-turtles-predictive.md",
  "CONCEPTS-FROM-PARALLEL-STRUCTURE.md",
  "HYPERLEXICON-IDENTITY-DEFINITION.md",
  "fold-suite/reports/BAYESIAN-SURPRISE-BY-RUNG.md",
  "eo-teachings/research/non-western-coding-paradigms-fit.md",
];
export const EXCLUDED = [
  ["penelope/gym/composed/radiation-decision-memo-real.md", "a memo (its own title), another kind"],
  ["penelope/gym/composed/lighthouse-v*.md, lighthouse-narrative.md", "fiction in scenes, another kind"],
  ["penelope/gym/composed/Am I the Captain?.md", "a fan story with a summary header, another kind"],
  ["penelope/gym/composed/sea-turtles-table.md", "a table, measured under the table kind"],
  ["the-fold/THE-ESSAY-THREAD.md", "387 words: a note on an essay pipeline, not an essay"],
  ["dolphins-grounded-essay.md", "714 words, half of it a ground panel dump"],
  ["*-report.md under penelope/gym/composed", "model run reports under 240 words"],
];

const walk = (dir, depth, out = []) => {
  if (depth < 0) return out;
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth - 1, out);
    else if (e.isFile() && e.name === "README.md") out.push(p);
  }
  return out;
};

/** READMEs: every README.md within three levels of the workspace with >= minWords words and >= minHeadings headings, identical copies once. */
export function readmes({ minWords = 300, minHeadings = 3 } = {}) {
  const seen = new Set();
  const out = [];
  for (const p of walk(WORKSPACE, 3).sort()) {
    const text = fs.readFileSync(p, "utf8");
    const h = sha(text);
    if (seen.has(h)) continue;
    const words = text.split(/\s+/).filter(Boolean).length;
    const headings = (text.match(/^#{1,6}\s/gm) ?? []).length;
    if (words < minWords || headings < minHeadings) continue;
    seen.add(h);
    out.push({ name: path.relative(WORKSPACE, p), text, words, bytes: Buffer.byteLength(text) });
  }
  return out;
}

/** Tables: every markdown table with >= minRows body rows in the essays and READMEs, as its own piece (header row + rows), identical copies once. */
export function tables({ minRows = 4 } = {}) {
  const docs = [...ESSAYS.map((f) => ({ name: f, text: fs.readFileSync(path.join(WORKSPACE, f), "utf8") })), ...readmes()];
  const seen = new Set();
  const out = [];
  for (const d of docs) {
    const lines = d.text.split(/\r?\n/);
    let block = [];
    const flush = () => {
      const rows = block.filter((l) => !/^\|[\s:|-]+\|$/.test(l.trim()));
      if (rows.length - 1 >= minRows) { const text = block.join("\n"); const h = sha(text); if (!seen.has(h)) { seen.add(h); out.push({ name: `${d.name}#table${out.length + 1}`, text, rows: rows.length - 1, bytes: Buffer.byteLength(text) }); } }
      block = [];
    };
    for (const l of lines) { if (/^\s*\|.*\|\s*$/.test(l)) block.push(l.trim()); else if (block.length) flush(); }
    if (block.length) flush();
  }
  return out;
}

export function essays() {
  return ESSAYS.map((f) => { const text = fs.readFileSync(path.join(WORKSPACE, f), "utf8"); return { name: f, text, words: text.split(/\s+/).filter(Boolean).length, bytes: Buffer.byteLength(text) }; });
}

/** CORPUS.md: which pieces were used, with paths and sizes. */
export function corpusNote({ essays: E, readmes: R, tables: T }) {
  const row = (p) => `| ${p.name} | ${p.words ?? p.rows + " rows"} | ${p.bytes} |`;
  return [
    "# Form corpora (eval/form)",
    "",
    "Local and licensed: the user's own workspace. No local Wikipedia exists under ~/Downloads/workspace (only Wiktionary slim and translation packs); the VM was not asked.",
    "",
    `## Essays (${E.length})`, "", "| path (under ~/Downloads/workspace) | words | bytes |", "|---|---|---|", ...E.map(row),
    "", "Excluded, and why:", ...EXCLUDED.map(([p, why]) => `- ${p}: ${why}`),
    "", `## READMEs (${R.length}; README.md within three levels, >= 300 words, >= 3 headings, identical copies once)`, "", "| path | words | bytes |", "|---|---|---|", ...R.map(row),
    "", `## Tables (${T.length}; markdown tables with >= 4 body rows in the essays and READMEs, identical copies once)`, "", "| source#table | rows | bytes |", "|---|---|---|", ...T.map(row),
    "",
  ].join("\n");
}

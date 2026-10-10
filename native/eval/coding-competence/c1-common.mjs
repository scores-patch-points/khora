// c1-common.mjs: file selection and gold loading shared by build-lex-prior.mjs (TRAIN) and c1-lex.mjs (DEV/TEST).
// Selection is deterministic and content-blind: files are ordered by sha256 inside each repository and repositories are
// interleaved round-robin, so a --limit never takes one repository only and never picks by size or by looking at gold.
// Declared exclusions (each counted, never silent): restricted (copyleft) rows, files over MAX_BYTES, files the gold
// extractor could not parse (error), files whose gold parse error share is over GOLD_ERR_TOL.
import fs from "node:fs";
import { goldBatch } from "./gold.mjs";

export const MANIFEST = "/private/tmp/claude-501/code-corpus/manifest.json";
export const OUT_DIR = "/private/tmp/claude-501/coding-competence";
export const MAX_BYTES = 200_000;     // gold time is bounded; macro-heavy/minified giants would dominate a micro-pooled score
export const GOLD_ERR_TOL = 0.02;     // gold.py's own P2 tolerance: a file the authority could not parse is no authority

export function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

/** rows of a language/split in selection order, with the exclusion counts. -> { rows, excluded:{restricted,tooBig}, total } */
export function selectRows(manifest, language, split, limit = null) {
  const lang = manifest.languages?.[language];
  if (!lang || !Array.isArray(lang[split])) return { rows: [], excluded: {}, total: 0, missing: true };
  const all = lang[split];
  const excluded = { restricted: 0, tooBig: 0 };
  const eligible = [];
  for (const r of all) {
    if (r.restricted) { excluded.restricted++; continue; }
    if (r.bytes > MAX_BYTES) { excluded.tooBig++; continue; }
    eligible.push(r);
  }
  const byRepo = new Map();
  for (const r of eligible) { if (!byRepo.has(r.repo)) byRepo.set(r.repo, []); byRepo.get(r.repo).push(r); }
  const repos = [...byRepo.keys()].sort();
  for (const k of repos) byRepo.get(k).sort((a, b) => (a.sha256 < b.sha256 ? -1 : a.sha256 > b.sha256 ? 1 : 0));
  const rows = [];
  for (let i = 0; ; i++) {
    let any = false;
    for (const k of repos) { const l = byRepo.get(k); if (i < l.length) { rows.push(l[i]); any = true; } }
    if (!any) break;
  }
  return { rows: limit ? rows.slice(0, limit) : rows, excluded, total: all.length };
}

/** gold for rows, through one python process. -> { docs:[{row,text,gold}], gaps:[{reason,count}] } */
export async function loadDocs(language, rows) {
  const items = [];
  const keep = [];
  const gaps = new Map();
  const gap = (r) => gaps.set(r, (gaps.get(r) ?? 0) + 1);
  for (const row of rows) {
    let text;
    try { text = fs.readFileSync(row.path, "utf8"); } catch { gap("unreadable file"); continue; }
    keep.push({ row, text });
    items.push({ language, text, fileName: row.path.split("/").pop() });
  }
  const golds = await goldBatch(items);
  const docs = [];
  golds.forEach((g, i) => {
    if (g.error) { gap(`gold error: ${String(g.error).split(":")[0]}`); return; }
    if (g.parse.error_bytes_frac > GOLD_ERR_TOL) { gap(`gold parse error share > ${GOLD_ERR_TOL}`); return; }
    docs.push({ row: keep[i].row, repo: keep[i].row.repo, text: keep[i].text, gold: g, tokens: g.tokens });
  });
  return { docs, gaps: [...gaps].map(([reason, count]) => ({ reason, count })) };
}

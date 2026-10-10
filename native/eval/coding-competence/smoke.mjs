// smoke.mjs: DEV smoke of the gold extractor on REAL files (not a score, not a card). For each language it picks
// up to three files that exist on disk (a spread by size) and prints counts plus a few extracted names so a person
// can check "does this look sane" by eye. A language with no real file here is listed as UNMEASURED (never "ok").
//
//   node eval/coding-competence/smoke.mjs [--corpus DIR] [--extra FILE ...] [--json OUT]
//
// Default corpus: /Users/mlacy/Documents/3.0/ethos/09-source-code. Files are read in place; nothing is copied.
// Writes /private/tmp/claude-501/coding-competence/gold-smoke.json unless --json says otherwise.
import fs from "node:fs";
import path from "node:path";
import { goldAvailable, goldBatch, goldLanguages } from "./gold.mjs";

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const CORP = opt("--corpus", "/Users/mlacy/Documents/3.0/ethos/09-source-code");
const OUT = opt("--json", "/private/tmp/claude-501/coding-competence/gold-smoke.json");
const extra = args.flatMap((a, i) => (args[i - 1] === "--extra" ? [a] : []));
const MAX_BYTES = 600000;

const av = goldAvailable();
if (!av.available) { console.error(`gold unavailable: ${av.reason}`); process.exit(2); }
const { languages } = await goldLanguages();
const extToLang = new Map();
for (const [lang, exts] of Object.entries(languages)) for (const e of exts) if (!extToLang.has(e)) extToLang.set(e, lang);

const files = [];
const walk = (d) => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else files.push(p);
  }
};
walk(CORP);
files.push(...extra);

const by = new Map();
for (const p of files) {
  const lang = extToLang.get(path.extname(p).toLowerCase());
  if (!lang) continue;
  let st; try { st = fs.statSync(p); } catch { continue; }
  if (!st.isFile() || st.size < 200 || st.size > MAX_BYTES) continue;
  if (!by.has(lang)) by.set(lang, []);
  by.get(lang).push({ p, size: st.size });
}

const picks = [];
for (const [lang, list] of [...by].sort()) {
  list.sort((a, b) => a.size - b.size);
  const idx = [...new Set([Math.floor(list.length / 4), Math.floor(list.length / 2), list.length - 1])].filter((i) => i < list.length);
  for (const i of idx) picks.push({ language: lang, ...list[i] });
}

const golds = await goldBatch(picks.map((f) => ({ language: f.language, text: fs.readFileSync(f.p, "utf8"), fileName: path.basename(f.p) })));
const rows = [];
golds.forEach((g, i) => {
  const f = picks[i];
  if (g.error) { rows.push({ language: f.language, file: f.p, size: f.size, error: g.error }); return; }
  const hist = {};
  for (const t of g.tokens) hist[t.class] = (hist[t.class] || 0) + 1;
  const first = (arr, fn, n = 8) => [...new Set(arr.map(fn))].slice(0, n);
  rows.push({
    language: f.language, file: f.p, bytes: f.size, tokens: g.tokens.length, errorShare: g.parse.error_bytes_frac,
    uncovered: g.parse.uncovered_tokens, defs: g.defs.length, calls: g.calls.length, imports: g.imports.length, extends: g.extends.length,
    classes: hist, sampleDefs: first(g.defs, (d) => `${d.kind}:${d.name}`), sampleCalls: first(g.calls, (c) => c.callee),
    sampleImports: first(g.imports, (m) => m.module), sampleExtends: first(g.extends, (e) => `${e.child}<${e.base}`),
    gaps: Object.entries(g.capabilities).filter(([, c]) => c.status === "gap").map(([k, c]) => `${k}: ${c.reason}`),
    injections: g.injections?.map((x) => x.language),
  });
});

const have = new Set(rows.map((r) => r.language));
const unmeasured = Object.keys(languages).filter((l) => !have.has(l)).sort();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ corpus: CORP, when: new Date().toISOString(), rows, unmeasuredNoRealFile: unmeasured }, null, 1));

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
for (const r of rows) {
  if (r.error) { console.log(`${pad(r.language, 11)} ERROR ${r.file}: ${r.error}`); continue; }
  console.log(`${pad(r.language, 11)} ${pad(path.basename(r.file), 34)} ${String(r.bytes).padStart(8)}B tok=${String(r.tokens).padStart(6)} err=${r.errorShare.toFixed(4)} unc=${String(r.uncovered).padStart(4)} defs=${String(r.defs).padStart(4)} calls=${String(r.calls).padStart(5)} imps=${String(r.imports).padStart(3)} ext=${String(r.extends).padStart(3)}`);
}
console.log(`\nUNMEASURED on a real file here (authored fixture only): ${unmeasured.join(", ")}`);
console.log(`wrote ${OUT}`);

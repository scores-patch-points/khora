// loaders/_cd_crosscheck.mjs — cross-check of the "cd" code tokenisation against the parser-gold lexed ant-code data (kinds-swarm/ant-code/data/lex/*.json: acorn/ast-based JS, Python, Ruby lexers).
// Not a pocket. Usage: node loaders/_cd_crosscheck.mjs  -> writes loaders/codemisc.crosscheck.json
// For each lexed file still on disk: A = multiset of the lexer's identifier-class tokens (classes U user, E external, K keyword, A ambiguous; operators/literals excluded), run through the same
// word-splitting and filters as codeLine; B = the multiset of codeLine tokens of the source file. coverage = |A n B| / |A| (did my tokeniser keep every parser-gold identifier?),
// share = |A n B| / |B| (how much of my token stream is parser-gold identifier/keyword; the remainder is comment words, string-literal words and other non-identifier words).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { codeText, newStats, codeLine } from "./_cd_util.mjs";

const LEX = "/Users/mlacy/Documents/3.0/khora/native/eval/kinds-swarm/ant-code/data/lex";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const bag = (xs) => { const m = new Map(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
const inter = (a, b) => { let n = 0; for (const [k, v] of a) n += Math.min(v, b.get(k) ?? 0); return n; };
const rows = []; let skippedMissing = 0, skippedOther = 0;
for (const f of fs.readdirSync(LEX).filter((x) => x.endsWith(".json")).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(LEX, f), "utf8"));
  if (!fs.existsSync(d.file)) { skippedMissing++; continue; }
  if (!Array.isArray(d.raw) || !Array.isArray(d.cls)) { skippedOther++; continue; }
  const st = newStats(), A = [];
  d.raw.forEach((u, i) => u.forEach((raw, j) => { if (["U", "E", "K", "A"].includes(d.cls[i][j]) && /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(raw)) A.push(...codeLine(raw, st)); }));
  const B = codeText(fs.readFileSync(d.file, "utf8"), newStats()).flat(), a = bag(A), b = bag(B), hit = inter(a, b);
  rows.push({ lex: f, lang: d.lang, file: d.file, lexerIdentifierTokens: A.length, myTokens: B.length, coverage: A.length ? +(hit / A.length).toFixed(4) : null, shareOfMine: B.length ? +(hit / B.length).toFixed(4) : null });
}
const cov = rows.map((r) => r.coverage).filter((x) => x != null).sort((x, y) => x - y), sh = rows.map((r) => r.shareOfMine).filter((x) => x != null).sort((x, y) => x - y);
const med = (x) => (x.length ? x[Math.floor(x.length / 2)] : null);
const out = { source: LEX, filesChecked: rows.length, skippedMissingSource: skippedMissing, skippedOther, medianCoverage: med(cov), minCoverage: cov[0] ?? null, medianShareOfMine: med(sh), minShare: sh[0] ?? null, rows };
fs.writeFileSync(path.join(HERE, "codemisc.crosscheck.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, rows: undefined }));

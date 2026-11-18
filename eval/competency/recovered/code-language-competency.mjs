#!/usr/bin/env node
// Zenodotus/scripts/code-language-competency.mjs — THE CODE-LANGUAGE SCOREBOARD.
// The NL board (LANGUAGE-COMPETENCY.md) mirrored for code: the SAME three
// instruments (token-class prior · binding-marker/case prior · thin reader),
// the same lenses and controls:
//   READ    — identifier marker coverage against the family's own prior.
//   DETECT  — priors-only family identification (route a file to its family).
//   CONTROL — the wrong-family control must stay low: a js file must not score
//             as if python bound it.
//   LENS    — the code Talmy: identifier CASING convention per family
//             (camel · snake · kebab · pascal · upper) — a lens, never a claim.
// Deterministic, model-free, no network at score time; re-run reproduces.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const V3 = path.resolve(HERE, "..", "..");
const PRIORS = path.join(V3, "Zenodotus/derived-priors/code-priors/code-lang/code-lang-priors.jsonl");
const rr = await import("file:///Users/mlacy/Documents/3.0/penelope/organs/read-code-by-priors.mjs");
const read = rr.readByPriors; const tokenize = rr.tokenize;
const families = { js: ["js", "mjs", "ts", "jsx"], py: ["py"], css: ["css"], html: ["html"], md: ["md"], json: ["json"], sh: ["sh"], rs: ["rs"], go: ["go"], rb: ["rb"] };
const priors = fs.readFileSync(PRIORS, "utf8").split("\n").filter(Boolean).map(JSON.parse);
const priorOf = (f) => priors.find((p) => p.lang === f) ?? null;
const markerSet = (p) => new Set((p?.bindingMarkers ?? []).filter((m) => m.sharePct >= 0.5).map((m) => m.marker));
const SKIP = [/node_modules/, /vendor/, /legacy/, /\.git/, /dist/, /arrangement-out/, /eval/, /experiments/, /figures/, /ocr/, /site-packages/];

function* filesFor(lang) {
  const exts = new Map(families[lang].map((e) => [e, 1]));
  const roots = [V3, path.join(V3, "language-corpus")];
  let n = 0;
  for (const root of roots) {
    const stack = [root];
    while (stack.length && n < 30) {
      const dir = stack.pop(); let es; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const e of es) { const p = path.join(dir, e.name); if (SKIP.some((r) => r.test(p))) continue;
        if (e.isDirectory()) stack.push(p);
        else if (exts.has(path.extname(e.name).slice(1)) && n < 30) { try { yield p; n++; } catch {} } }
    }
    if (n >= 30) break;
  }
}

function casingLens(src) {
  const ids = [...src.matchAll(/\b[A-Za-z_]\w+\b/g)].map((m) => m[0]);
  const c = (re) => ids.filter((w) => re.test(w)).length;
  const n = Math.max(1, ids.length);
  return { camel: c(/^[a-z][a-zA-Z0-9]*[A-Z]/), snake: c(/^[a-z0-9]+(_[a-z0-9]+)+$/), kebab: c(/^[a-z0-9]+(-[a-z0-9]+)+$/), pascal: c(/^[A-Z][a-zA-Z0-9]*/), upper: c(/^[A-Z][A-Z0-9_]*$/), total: ids.length, pct: Math.round(c(/^[a-z]/) / n * 100 * 100) / 100 };
}

const rows = [];
let controlViolations = 0;
for (const lang of Object.keys(families)) {
  const prior = priorOf(lang);
  if (!prior) { rows.push({ lang, read: "—", detect: "—", control: "—", lens: "—", note: "typed gap: no prior harvested" }); continue; }
  const mine = markerSet(prior);
  let readShare = 0, strictShare = 0, routed = 0, mk = 0, files = 0, abstain = 0, lens = null;
  const cross = new Map();
  for (const f of filesFor(lang)) {
    let src; try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
    if (src.length > 2_000_000) continue;
    files++; if (!lens) lens = casingLens(src.slice(0, 300_000));
    const r = read(f, src.slice(0, 400_000));
    const known = r.readings.filter((x) => !x.unknown).length;
    const strict = r.readings.filter((x) => x.bound && !x.bound.weak && !x.ref).length;
    readShare += known / Math.max(1, r.readings.length);
    strictShare += strict / Math.max(1, r.readings.length);
    // DETECT — THE LENSED SCORE (Chomsky, 2026-10-10): a file is routed by
    // HALF markers, half CLASS SHAPE (token-class proportions + divider
    // ratios), so close corpora like css↔html separate on shape, not only on
    // their markers — a file says what it is with more than its particles.
    // DETECT uses the STRONG tier only — routing is a sharp instrument; weak
    // markers are reading, not identity (falsified 2026-10-10: weak markers
    // diluted routing, js 85→74, html 100→77).
    const fileMarkers = new Set(r.readings.filter((x) => x.bound && !x.bound.weak).map((b) => b.bound.by));
    const cl = { com: 0, id: 0, op: 0, str: 0, num: 0, lt: 0, lb: 0, sc: 0, lp: 0, q: 0 };
    for (const t of tokenize(src.slice(0, 400_000))) { if (t.cls in cl) cl[t.cls]++; if (t.lex === "<") cl.lt++; if (t.lex === "{") cl.lb++; if (t.lex === ";") cl.sc++; if (((t.lex === "(") || (t.lex === ")"))) cl.lp++; if (t.lex === "\"") cl.q++; }
    const tc = Math.max(1, cl.com + cl.id + cl.op + cl.str + cl.num);
    const profile = [cl.com / tc, cl.id / tc, cl.op / tc, cl.str / tc, cl.num / tc, cl.lt / tc, cl.lb / tc, cl.sc / tc, cl.lp / tc, cl.q / tc];
    let best = null, bestScore = 0;
    for (const p of priors) { if (!p.bindingMarkers?.length) continue;
      const s = new Set(p.bindingMarkers.filter((m) => m.sharePct >= 0.5).map((m) => m.marker));
      let overlap = 0; for (const m of fileMarkers) if (s.has(m)) overlap++;
      const d = p.dividers ?? {}; const td = p.tokens ?? { com: 0, id: 0, op: 0, str: 0, num: 0 };
      const ptc = Math.max(1, (td.com || 0) + (td.id || 0) + (td.op || 0) + (td.str || 0) + (td.num || 0));
      const pshape = [(td.com || 0) / ptc, (td.id || 0) / ptc, (td.op || 0) / ptc, (td.str || 0) / ptc, (td.num || 0) / ptc,
        (d["<"] || 0) / ptc, (d["{"] || 0) / ptc, (d[";"] || 0) / ptc, ((d["("] || 0) + (d[")"] || 0)) / ptc, (d["\""] || 0) / ptc];
      const shapeScore = pshape.reduce((acc, v, i) => acc + (1 - Math.min(1, Math.abs(v - profile[i]))), 0) / pshape.length;
      const score = 0.5 * (overlap / Math.max(1, fileMarkers.size)) + 0.5 * shapeScore;
      if (score > bestScore) { bestScore = score; best = p.lang; }
    }
    // THE ABSTENTION HONESTY (the NL board's UDHR lesson): a file the priors
    // cannot route must come back UNKNOWN and be counted as honest abstention,
    // never as a wrong name.
    if (fileMarkers.size === 0) { abstain++; continue; }
    if (best === lang) routed++; else cross.set(best ?? "?", (cross.get(best ?? "?") || 0) + 1);
  }
  const scored = files - abstain;
  const wrong = Math.max(...[...cross.values()], 0);
  rows.push({ lang, files, read: files ? Math.round(readShare / files * 100) : "—", strict: files ? Math.round(strictShare / files * 100) : "—", detect: scored ? Math.round(routed / scored * 100) + (abstain ? " · " + abstain + " abstain" : "") : "—", control: scored ? (wrong / scored * 100).toFixed(1) : "—", misroutes: (scored && wrong / scored > 0.2 ? [...cross.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l2, n2]) => l2 + "×" + n2).join(" ") : ""), lens: lens ? `camel ${lens.camel} · snake ${lens.snake} · kebab ${lens.kebab} · pascal ${lens.pascal} · upper ${lens.upper} (of ${lens.total})` : "—" });
  if (scored && wrong / scored > 0.2) controlViolations++;
}
console.log("=== CODE-LANGUAGE-COMPETENCY (mirrors the NL board) ===");
console.log("| lang | files | READ (all known) | READ strict | DETECT | CONTROL | lens |");
for (const r of rows) console.log(`| ${r.lang.padEnd(4)} | ${String(r.files ?? "—").padEnd(5)} | ${String(r.read).padEnd(6)} | ${String(r.strict ?? "—").padEnd(6)} | ${String(r.detect).padEnd(6)} | ${String(r.control).padEnd(6)} ${String(r.misroutes ?? "").padEnd(14)} | ${(r.lens ?? r.note ?? "").slice(0, 70)} |`);
console.log(`controls: wrong-family control must stay low — violations: ${controlViolations}`);
try { fs.mkdirSync(path.join(V3, "Zenodotus"), { recursive: true }); fs.writeFileSync(path.join(V3, "Zenodotus/CODE-LANGUAGE-COMPETENCY.md"), "### CODE-LANGUAGE-COMPETENCY — the scoreboard mirroring LANGUAGE-COMPETENCY.md (2026-10-10)\n\nGenerated by scripts/code-language-competency.mjs. READ = identifier marker coverage vs the family's own prior · DETECT = priors-only family identification · CONTROL = worst misroute rate · LENS = identifier casing convention.\n\n" + rows.map((r) => `| ${r.lang} | ${String(r.read)} | ${String(r.strict ?? "—")} | ${String(r.detect)} | ${String(r.control)} | ${r.lens ?? r.note ?? ""} |`).join("\n") + "\n"); } catch {}
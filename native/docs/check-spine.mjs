// native/docs/check-spine.mjs — verify THE-SPINE.md against the tree. READ-ONLY; writes nothing.
//
//   node native/docs/check-spine.mjs
//
// WHAT IT CHECKS (so a nomination doc cannot silently go false):
//   1. CITATIONS. Every `path[:line]` cited in THE-SPINE.md resolves to a real file, and a `:line` is within
//      the file. A citation that no longer resolves means the spine doc is STALE -> exit 1.
//   2. ONE OWNER PER NAME. For each SINGULAR name, every file with that basename is collected across the three
//      repos and grouped by EXPORT SIGNATURE (the sorted set of exported names):
//        - one signature, one file               -> CANONICAL
//        - one signature, many files, same body   -> DUPLICATE (a copy; body-identical modulo the leading
//                                                    archon epigraph block) — a standing migration gap
//        - many signatures                        -> DISTINCT MODULES sharing a basename (a NAME COLLISION)
//      A duplicate is not fatal (it is a tracked gap, usually a half-done repo extraction); a name collision
//      is reported as a collision. Neither is a failure of THIS document; only a stale citation is.
// The code wins any disagreement with the doc; this script is how the doc is held to that.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));      // .../khora/native/docs
const ROOT = path.resolve(HERE, "../../..");                    // .../3.0
const DOC = path.join(HERE, "THE-SPINE.md");
const REPOS = ["khora", "janus", "penelope"].map((d) => path.join(ROOT, d));
const SKIP = new Set(["node_modules", ".git", "vendor", ".venv", "dist", "build", "__pycache__"]);
const SHIM_BYTES = 700;                                         // a re-export shim is tiny; a copy is not

const SINGULAR = [
  { name: "hyperlexicon", files: ["hyperlexicon.js"] },
  { name: "self-record", files: ["self-record.js"] },
  { name: "notes", files: ["notes.js"] },
];

function walk(dir, out = []) {
  let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name.startsWith(".") || SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// The exported names, from `export const|function|class NAME`, `export { a, b as c }`, `export * from`.
function exportSig(src) {
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:const|function|class|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) for (const part of m[1].split(",")) { const n = part.trim().split(/\s+as\s+/).pop().trim(); if (n) names.add(n); }
  if (/export\s*\*/.test(src)) names.add("*");
  return [...names].sort().join(",");
}
// The body hash, ignoring a leading `/* … */` archon-epigraph block (repos use different epigraph conventions).
function bodyHash(src) {
  let s = src;
  if (s.startsWith("/*")) { const end = s.indexOf("*/"); if (end >= 0) s = s.slice(end + 2); }
  return createHash("sha256").update(s.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);
}

const doc = fs.readFileSync(DOC, "utf8");
const cited = [...new Set([...doc.matchAll(/`([\w./-]+\.(?:js|mjs|md|json))(?::(\d+))?`/g)].map((m) => [m[1], m[2] ? Number(m[2]) : null]))];

const prefixes = [ROOT, path.join(ROOT, "khora"), path.join(ROOT, "khora/native/docs"), path.join(ROOT, "khora/native"), path.join(ROOT, "janus"), path.join(ROOT, "penelope")];
const resolveCite = (rel) => prefixes.map((base) => path.join(base, rel)).find((p) => fs.existsSync(p) && fs.statSync(p).isFile());

let failures = 0;
console.log(`# check-spine — THE-SPINE.md against the tree\n`);
console.log(`## 1. citations (${cited.length})`);
for (const [rel, line] of cited) {
  const abs = resolveCite(rel);
  if (!abs) { console.log(`  MISSING  ${rel}${line ? ":" + line : ""}`); failures += 1; continue; }
  if (line != null) {
    const n = fs.readFileSync(abs, "utf8").split("\n").length;
    if (line > n) { console.log(`  OUT-OF-RANGE  ${rel}:${line} (file has ${n} lines)`); failures += 1; continue; }
  }
}

// NO DUPLICATE ORGANS. A shared module lives in exactly ONE home; a downstream repo IMPORTS it, never
// copies it. We find every basename that appears in more than one repo and, within it, any group of files
// with the SAME export signature and (modulo the leading archon epigraph) the same body — that is a
// duplicate organ. It is FATAL (exit 1): the canon must have none.
console.log(`\n## 2. no duplicate organs`);
// An ORGAN is a module under native/{kernel,organs,interpretation,the-fold,memory,adapters}. Eval drivers,
// tests, fixtures and within-repo shims are not organs and are out of scope for this rule.
const isOrgan = (rel) => /\/native\/(kernel|organs|interpretation|the-fold|memory|adapters)\//.test("/" + rel) && !/\/eval\//.test(rel);
const byBase = new Map();
for (const repo of REPOS) for (const f of walk(repo)) {
  const rel = path.relative(ROOT, f);
  if (!/\.(js|mjs)$/.test(f) || /\.test\.|check-spine/.test(f) || !isOrgan(rel)) continue;
  const base = path.basename(f);
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base).push({ rel, repo: path.relative(ROOT, repo), sig: exportSig(fs.readFileSync(f, "utf8")), body: bodyHash(fs.readFileSync(f, "utf8")), size: fs.statSync(f).size });
}
const duplicates = [];
for (const [base, files] of byBase) {
  if (files.length < 2) continue;
  const bySig = new Map();
  for (const x of files) { const k = x.sig; if (!bySig.has(k)) bySig.set(k, []); bySig.get(k).push(x); }
  for (const [sig, group] of bySig) {
    if (group.length < 2 || !sig) continue;
    const acrossRepo = new Set(group.map((x) => x.repo)).size > 1;
    if (!acrossRepo) continue;                                   // a within-repo shim is allowed, not a duplicate organ
    const sameBody = group.every((x) => x.body === group[0].body);
    duplicates.push({ base, sig, group, sameBody, acrossRepo });
  }
}
// A DECLARED EXCEPTION: same basename across repos, intentionally different (the seam requires two forms).
// Listed with the reason; a collision here is expected and not a defect.
const EXCEPTIONS = {
  "corroboration.js": "janus injects the witness-read (wireWitnessRead) so the reasoner never reaches into the reader's ledger (JANUS-EXTRACTION); khora binds notes.js directly. The seam requires two forms.",
};

if (!duplicates.length) console.log(`  no duplicate organs — every shared module has one home.`);
for (const d of duplicates) {
  const kind = d.sameBody ? "DUPLICATE (identical)" : "DIVERGED COPIES";
  const where = d.acrossRepo ? "across repos" : "within a repo";
  console.log(`  ${kind} ${where}: ${d.base}  [${d.sig.split(",").filter(Boolean).length} exports]`);
  for (const x of d.group) console.log(`      ${x.rel}  ${x.size}b`);
}

// FORKS: the SAME relative path under native/ in two repos, but different code (different exports). A shared
// module name in different DIRECTORIES is normal namespacing; a shim (export *) is the intended de-dup. Only a
// same-path, different-sig pair is a genuine fork — declare it (with the seam reason) or merge it.
const byRel = new Map();
for (const repo of REPOS) for (const f of walk(repo)) {
  const rel = path.relative(repo, f);
  if (!/\.(js|mjs)$/.test(f) || /\.test\.|check-spine/.test(f) || !isOrgan(rel.replace(/^native\//, "native/"))) continue;
  const key = rel.replace(/^native\//, "");
  const src = fs.readFileSync(f, "utf8");
  if (src.length < SHIM_BYTES && /export\s*\*\s*from/.test(src)) continue;   // a re-export shim is the de-dup, not a fork
  if (!byRel.has(key)) byRel.set(key, []);
  byRel.get(key).push({ rel: path.relative(ROOT, f), repo: path.relative(ROOT, repo), sig: exportSig(src) });
}
const collisions = [];
for (const [key, files] of byRel) {
  const distinctSigs = new Set(files.map((x) => x.sig));
  if (files.length >= 2 && distinctSigs.size >= 2 && duplicates.some((d) => d.base === path.basename(key)) === false) {
    collisions.push({ base: path.basename(key), key, files, declared: EXCEPTIONS[path.basename(key)] });
  }
}
console.log(`\n## 3. forks (same path, different code)`);
if (!collisions.length) console.log(`  none.`);
for (const c of collisions) {
  console.log(`  ${c.declared ? "declared exception" : "UNDECLARED FORK"}: ${c.base}`);
  if (c.declared) console.log(`      reason: ${c.declared}`);
  for (const x of c.files) console.log(`      ${x.rel}  [${x.sig.split(",").filter(Boolean).length} exports]`);
}
const undeclared = collisions.filter((c) => !c.declared).length;

console.log(`\nverdict: ${failures === 0 ? "citations RESOLVE" : `${failures} STALE citation(s)`}; ` +
  `${duplicates.length === 0 ? "no duplicate organs" : `${duplicates.length} duplicate organ group(s) — FATAL`}; ` +
  `${undeclared} undeclared fork(s).`);
process.exit(failures === 0 && duplicates.length === 0 ? 0 : 1);

// confirm-PM-R1-unit-initial-excess/select-data.mjs -- RESULT-BLIND, MECHANICAL data selection for the fresh confirmation of PM-R1 (unit-initial excess pInitX). New file.
// Nothing is computed from any feature here: it reads only file names, sizes, message counts, language headers and the used-day lists of earlier tests.
// Writes data/manifest.json (the data actually used by confirm.mjs; its sha256 is quoted in confirm.mjs's pre-registration) and data/lex/{js,py}-<i>.json.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { execFileSync } from "node:child_process"; import { fileURLToPath } from "node:url";
import { lexJs } from "../../../kinds-swarm/ant-code/lex_js.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), PM = path.join(HERE, "..", "polarity-map"), AC = path.join(HERE, "..", "..", "..", "kinds-swarm", "ant-code");
const LAWRES = path.join(HERE, "..", "..", "results"), IRC = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc", UDD = "/Users/mlacy/Documents/data/ud";
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const man = { made: "2026-10-07", uses: {} };

// ── 1. UD fresh: the TRAIN split of every treebank in /Users/mlacy/Documents/data/ud that has one (never read by any khora eval: grep "Documents/data/ud" over native/eval finds nothing) ──
const udFiles = {}; // treebank -> train file
for (const tb of fs.readdirSync(UDD).sort()) {
  const d = path.join(UDD, tb); if (!fs.statSync(d).isDirectory()) continue;
  const fs0 = fs.readdirSync(d).filter((f) => /-ud-train(-[a-z]+)?\.conllu$/.test(f)).sort();
  if (!fs0.length) continue;
  udFiles[tb] = path.join(d, fs0[0]); // multi-part treebanks (cs_pdt, ru_syntagrus): the first part in name order
}
man.ud = { rule: "one cell per treebank with a *-ud-train*.conllu (first part in name order if several); a contiguous window of sentences starting at a seeded random sentence and growing to >= 40000 non-PUNCT word units (whole file if smaller); window drawn in confirm.mjs from seedFor('pm-r1-confirm', treebank, 'window')", files: udFiles, n: Object.keys(udFiles).length, windowTokens: 40000 };
// the NON-fresh replicate tier: UD test.conllu (all 53 stems of ud-eval), already consumed by the scoper's own confirmation
man.udReplicate = { root: "/private/tmp/claude-501/ud-eval", split: "test.conllu", stems: fs.readdirSync("/private/tmp/claude-501/ud-eval").filter((d) => fs.existsSync(`/private/tmp/claude-501/ud-eval/${d}/test.conllu`) && d !== "cmn-hans").sort() };

// ── 2. IRC ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const hdr = (p) => { const h = fs.readFileSync(p, "utf8").slice(0, 400), m = /messages: "(\d+)"/.exec(h), l = /lang: "(\w+)"/.exec(h); return { n: m ? +m[1] : 0, lang: l ? l[1] : "?" }; };
const all = [];
for (const ch of fs.readdirSync(IRC)) { const d = path.join(IRC, ch); if (!fs.statSync(d).isDirectory()) continue; for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".txt")).sort()) all.push({ id: `${ch}/${f}`, ch, ...hdr(path.join(d, f)) }); }
const RE = /(?:ubuntu-server|ubuntu-de|ubuntu-es|ubuntu-it|kubuntu|xubuntu|ubuntu)\/\d{4}-\d{2}-\d{2}/g;
const addTxt = (a, p) => { for (const x of fs.readFileSync(p, "utf8").match(RE) ?? []) a.add(x + ".txt"); };
const pmSplit = J(path.join(PM, "results", "irc-split.json")), pm48 = new Set(Object.values(pmSplit).flatMap((l) => [...l.disc, ...l.conf]));
const earlier = new Set(); // days read by the earlier NAME tests (name-rule-informal, name-company, name-floor1) -- excluded
for (const f of [path.join(LAWRES, "name-rule-informal.irc.json"), path.join(LAWRES, "name-company", "report.json"), path.join(LAWRES, "name-company-pairblocks", "report.json"), path.join(LAWRES, "name-floor1", "records-V0.json"), path.join(LAWRES, "name-floor1", "records-V1.json"), path.join(LAWRES, "name-floor1", "records-V2.json")]) { try { addTxt(earlier, f); } catch {} }
const r2 = J(path.join(HERE, "..", "confirm-R2_first_mention_lookahead", "days.json")).parts; // partition made by a sibling lens: USED14 / SCOPER_DISCOVERY / SCOPER_CONFIRM / INELIGIBLE20
for (const d of r2.USED14) earlier.add(d);
const sibling = new Set([...r2.SCOPER_DISCOVERY, ...r2.SCOPER_CONFIRM]); // chat-scope's discovery/confirm days: read by a sibling lens for COMPANY/first-mention features, never for pInitX
for (const f of [path.join(HERE, "..", "ablation-scope", "days.json")]) { try { addTxt(sibling, f); } catch {} }
const fresh = all.filter((x) => x.lang === "en" && !pm48.has(x.id) && !earlier.has(x.id));
const neverRead = fresh.filter((x) => !sibling.has(x.id)), siblingRead = fresh.filter((x) => sibling.has(x.id));
man.irc = {
  rule: "FRESH-EN = every en-language day of the 7 ubuntu-irc channels that is NOT one of the 48 days the polarity-map scoper read for pInitX (results/irc-split.json disc+conf) and NOT read by the earlier name tests (name-rule-informal, name-company(+pairblocks), name-floor1, USED14); pooled into one stream (unit = message) = the primary set; per-channel pools = secondary sets. de/es/it: every one of the 32 days was read by the scoper (disc or conf) -> NO fresh day exists.",
  excludedPm48: [...pm48].sort(), excludedEarlierTests: [...earlier].sort(),
  freshEnAll: fresh.map((x) => ({ id: x.id, ch: x.ch, n: x.n, siblingRead: sibling.has(x.id) })),
  freshEnByChannel: Object.fromEntries([...new Set(fresh.map((x) => x.ch))].sort().map((c) => [c, fresh.filter((x) => x.ch === c).map((x) => x.id)])),
  neverReadByAnyone: neverRead.map((x) => x.id), siblingReadForOtherStatistics: siblingRead.map((x) => x.id),
  nonEnFreshDays: all.filter((x) => x.lang !== "en" && !pm48.has(x.id)).map((x) => x.id), allNonEnDays: all.filter((x) => x.lang !== "en").length,
  replicate: { note: "NON-fresh replicate tier: the scoper's reserved confirmation days, re-read by this independent pipeline", conf: Object.fromEntries(Object.entries(pmSplit).map(([k, v]) => [k, v.conf])) },
};

// ── 3. Books (English novels; none read by the scoper for pInitX; Dracula/Dorian Gray/Moby Dick/Sherlock Holmes are not in its list: W&P, P&P, ToTC, Tom Sawyer, Middlemarch, Frankenstein) ──
const G = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/";
man.books = [["book-dracula", "pg345_Dracula.txt"], ["book-dorian-gray", "pg174_The_Picture_of_Dorian_Gray.txt"], ["book-moby-dick", "pg2701_Moby_Dick.txt"], ["book-sherlock", "pg768_The_Adventures_of_Sherlock_Holmes.txt"]].map(([name, f]) => ({ name, file: G + f, sha: sha(fs.readFileSync(G + f)) }));

// ── 4. Code: same candidate pools and hash-order logic as ant-code/select_files.mjs and the scoper, but a NEW salt, and BOTH ant-code's 24 and the scoper's 24 files are excluded ──
const H = (p) => sha("pm-r1-confirm-fresh|" + p);
const walk = (d, test, out = []) => { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return out; } for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory()) { if (test.skipDir(p, e.name)) continue; walk(p, test, out); } else if (test.file(e.name)) out.push(p); } return out; };
const ok = (p, lo, hi) => { let st; try { st = fs.statSync(p); } catch { return false; } if (st.size < lo * 1024 || st.size > hi * 1024) return false; const s = fs.readFileSync(p, "utf8"); const n = s.split("\n").length; return n >= 500 && s.length / n <= 100 && !/@generated|sourceMappingURL|DO NOT EDIT/i.test(s.slice(0, 3000)); };
const NATIVE = "/Users/mlacy/Documents/3.0/khora/native", NM = "/Users/mlacy/Documents/jupyter/node_modules";
const PYLIB = "/opt/homebrew/Cellar/python@3.14/3.14.7/Frameworks/Python.framework/Versions/3.14/lib/python3.14";
const used = new Set([...Object.values(J(path.join(AC, "data", "files.json"))).flat().map((x) => x.file).filter(Boolean), ...[...J(path.join(PM, "results", "confirm-code-files.json")).js, ...J(path.join(PM, "results", "confirm-code-files.json")).py].map((x) => x.file)]);
const skipA = (p, n) => n === "node_modules" || n === "results" || n === "data" || n === "logs" || n === "kinds-swarm" || n === "provisional" || n.startsWith(".") || /tests?$|fixtures?$/.test(n);
const A = walk(NATIVE, { skipDir: skipA, file: (n) => /\.(m?js)$/.test(n) && !/\.min\./.test(n) }).filter((p) => !used.has(p) && ok(p, 20, 150));
const B = walk(NM, { skipDir: (p, n) => /^(tests?|__tests__|test-.*|fixtures?|esm|umd|browser|\.bin|\.cache)$/.test(n) || n.startsWith("."), file: (n) => /\.js$/.test(n) && !/\.min\.|\.d\./.test(n) }).filter((p) => !used.has(p) && ok(p, 20, 150));
const P = walk(PYLIB, { skipDir: (p, n) => /^(test|tests|idlelib|lib2to3|site-packages|turtledemo|__pycache__|config-.*|ensurepip|pydoc_data|_pyrepl|tkinter|distutils|encodings)$/.test(n), file: (n) => n.endsWith(".py") }).filter((p) => !used.has(p) && ok(p, 20, 120));
const lexPy = (p) => JSON.parse(execFileSync("python3", [path.join(AC, "lex_py.py"), p], { maxBuffer: 1 << 28 }));
const pick = (pool, n, keyOf, maxPer, lex) => { const order = pool.slice().sort((a, b) => H(a).localeCompare(H(b))); const per = new Map(), out = [], skipped = []; for (const p of order) { if (out.length >= n) break; const k = keyOf(p); if ((per.get(k) ?? 0) >= maxPer) continue; let d; try { d = lex(p); } catch (e) { skipped.push([p, String(e.message).slice(0, 60)]); continue; } if (d.units.length < 500) { skipped.push([p, `units ${d.units.length}`]); continue; } per.set(k, (per.get(k) ?? 0) + 1); out.push({ file: p, lex: d }); } return { out, skipped }; };
const ja = pick(A, 8, (p) => path.dirname(p), 1, lexJs), jb = pick(B, 8, (p) => p.slice(NM.length + 1).split("/")[0], 1, lexJs), py = pick(P, 16, (p) => p.slice(PYLIB.length + 1).split("/")[0], 2, lexPy);
fs.mkdirSync(path.join(HERE, "data", "lex"), { recursive: true });
const js = [...ja.out.map((x) => ({ ...x, pool: "khora" })), ...jb.out.map((x) => ({ ...x, pool: "node_modules" }))];
js.forEach((x, i) => fs.writeFileSync(path.join(HERE, "data", "lex", `js-${i}.json`), JSON.stringify(x.lex)));
py.out.forEach((x, i) => fs.writeFileSync(path.join(HERE, "data", "lex", `py-${i}.json`), JSON.stringify(x.lex)));
man.code = { rule: "ant-code hash order with salt 'pm-r1-confirm-fresh|', excluding ant-code's 24 and the scoper's 24 files; js 8 khora(<=1/dir)+8 node_modules(<=1/package), py 16 stdlib(<=2/subpackage); a file that fails to lex or has <500 units is skipped", counts: { A: A.length, B: B.length, P: P.length }, js: js.map((x) => ({ file: x.file, pool: x.pool, units: x.lex.units.length })), py: py.out.map((x) => ({ file: x.file, units: x.lex.units.length })), skipped: { ja: ja.skipped.length, jb: jb.skipped.length, py: py.skipped.length } };
fs.writeFileSync(path.join(HERE, "data", "manifest.json"), JSON.stringify(man, null, 1));
console.log("manifest sha256", sha(fs.readFileSync(path.join(HERE, "data", "manifest.json"), "utf8")));
console.log(JSON.stringify({ udTrainTreebanks: man.ud.n, udReplicateStems: man.udReplicate.stems.length, freshEnDays: fresh.length, neverRead: neverRead.length, siblingRead: siblingRead.length, byChannel: Object.fromEntries(Object.entries(man.irc.freshEnByChannel).map(([k, v]) => [k, v.length])), freshEnMsgs: fresh.reduce((a, x) => a + x.n, 0), nonEnFresh: man.irc.nonEnFreshDays.length, books: man.books.length, js: man.code.js.length, py: man.code.py.length, counts: man.code.counts }, null, 1));

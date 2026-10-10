// provisional/polarity-map/select-new-code.mjs — MECHANICAL, result-blind choice of UNUSED code files for the confirmation of the polarity map (written and run before any
// confirmation feature is computed). Same candidate rules and hash order as kinds-swarm/ant-code/select_files.mjs, but every file in ant-code's data/files.json is EXCLUDED:
// JS: 6 from khora/native (<=1 per directory) + 6 from jupyter/node_modules (<=1 per package); PY: 12 from the Homebrew python3.14 stdlib (<=2 per subpackage); a file that fails to
// lex or yields < 500 units is skipped. Output: results/confirm-code-files.json and the lexed files results/lex-confirm/<lg>-<i>.json (same JSON shape as ant-code/data/lex).
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { execFileSync } from "node:child_process"; import { fileURLToPath } from "node:url";
import { lexJs } from "../../../kinds-swarm/ant-code/lex_js.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), AC = path.join(HERE, "..", "..", "..", "kinds-swarm", "ant-code");
const H = (p) => crypto.createHash("sha256").update("ant-code-select|" + p).digest("hex");
const walk = (d, test, out = []) => { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return out; } for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory()) { if (test.skipDir(p, e.name)) continue; walk(p, test, out); } else if (test.file(e.name)) out.push(p); } return out; };
const ok = (p, lo, hi) => { let st; try { st = fs.statSync(p); } catch { return false; } if (st.size < lo * 1024 || st.size > hi * 1024) return false; const s = fs.readFileSync(p, "utf8"); const n = s.split("\n").length; return n >= 500 && s.length / n <= 100 && !/@generated|sourceMappingURL|DO NOT EDIT/i.test(s.slice(0, 3000)); };
const NATIVE = "/Users/mlacy/Documents/3.0/khora/native", NM = "/Users/mlacy/Documents/jupyter/node_modules";
const PYLIB = "/opt/homebrew/Cellar/python@3.14/3.14.7/Frameworks/Python.framework/Versions/3.14/lib/python3.14";
const used = new Set(Object.values(JSON.parse(fs.readFileSync(path.join(AC, "data", "files.json"), "utf8"))).flat().map((x) => x.file).filter(Boolean));
const skipA = (p, n) => n === "node_modules" || n === "results" || n === "data" || n === "logs" || n === "kinds-swarm" || n === "provisional" || n.startsWith(".") || /tests?$|fixtures?$/.test(n);
const A = walk(NATIVE, { skipDir: skipA, file: (n) => /\.(m?js)$/.test(n) && !/\.min\./.test(n) }).filter((p) => !used.has(p) && ok(p, 20, 150));
const B = walk(NM, { skipDir: (p, n) => /^(tests?|__tests__|test-.*|fixtures?|esm|umd|browser|\.bin|\.cache)$/.test(n) || n.startsWith("."), file: (n) => /\.js$/.test(n) && !/\.min\.|\.d\./.test(n) }).filter((p) => !used.has(p) && ok(p, 20, 150));
const P = walk(PYLIB, { skipDir: (p, n) => /^(test|tests|idlelib|lib2to3|site-packages|turtledemo|__pycache__|config-.*|ensurepip|pydoc_data|_pyrepl|tkinter|distutils|encodings)$/.test(n), file: (n) => n.endsWith(".py") }).filter((p) => !used.has(p) && ok(p, 20, 120));
const lexPy = (p) => JSON.parse(execFileSync("python3", [path.join(AC, "lex_py.py"), p], { maxBuffer: 1 << 28 }));
const pick = (pool, n, keyOf, maxPer, lex) => { const order = pool.slice().sort((a, b) => H(a).localeCompare(H(b))); const per = new Map(), out = [], skipped = []; for (const p of order) { if (out.length >= n) break; const k = keyOf(p); if ((per.get(k) ?? 0) >= maxPer) continue; let d; try { d = lex(p); } catch (e) { skipped.push([p, String(e.message).slice(0, 60)]); continue; } if (d.units.length < 500) { skipped.push([p, `units ${d.units.length}`]); continue; } per.set(k, (per.get(k) ?? 0) + 1); out.push({ file: p, lex: d }); } return { out, skipped }; };
const ja = pick(A, 6, (p) => path.dirname(p), 1, lexJs), jb = pick(B, 6, (p) => p.slice(NM.length + 1).split("/")[0], 1, lexJs), py = pick(P, 12, (p) => p.slice(PYLIB.length + 1).split("/")[0], 2, lexPy);
fs.mkdirSync(path.join(HERE, "results", "lex-confirm"), { recursive: true });
const js = [...ja.out.map((x) => ({ ...x, pool: "khora" })), ...jb.out.map((x) => ({ ...x, pool: "node_modules" }))];
js.forEach((x, i) => fs.writeFileSync(path.join(HERE, "results", "lex-confirm", `js-${i}.json`), JSON.stringify(x.lex)));
py.out.forEach((x, i) => fs.writeFileSync(path.join(HERE, "results", "lex-confirm", `py-${i}.json`), JSON.stringify(x.lex)));
const rec = { rule: "ant-code select_files hash order minus ant-code's 24 files", js: js.map((x) => ({ file: x.file, pool: x.pool, units: x.lex.units.length })), py: py.out.map((x) => ({ file: x.file, units: x.lex.units.length })), counts: { A: A.length, B: B.length, P: P.length }, skipped: { ja: ja.skipped.length, jb: jb.skipped.length, py: py.skipped.length } };
fs.writeFileSync(path.join(HERE, "results", "confirm-code-files.json"), JSON.stringify(rec, null, 1)); console.log(JSON.stringify(rec, null, 1));

// confirm-PM-R2-left-company-polarity/select-data.mjs -- RESULT-BLIND, MECHANICAL data selection for the fresh confirmation of PM-R2-left-company-polarity. NEW FILE.
// It reads only file names, sizes, message counts, language headers, token counts and the mentions of IRC day ids in earlier outputs. No feature, label or AUC is computed here.
// Writes data/manifest.json (sha256 quoted in confirm.mjs's pre-registration) and data/lex/{js,py,rb}-<i>.json (lexed code files, same JSON shape as ant-code/data/lex).
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { execFileSync } from "node:child_process"; import { fileURLToPath } from "node:url";
import { lexJs } from "../../../kinds-swarm/ant-code/lex_js.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), PM = path.join(HERE, "..", "polarity-map"), AC = path.join(HERE, "..", "..", "..", "kinds-swarm", "ant-code"), EVAL = path.join(HERE, "..", "..", "..");
const SIB = path.join(HERE, "..", "confirm-PM-R1-unit-initial-excess"); // concurrent sibling (Rule 1); its data lists are read ONLY to keep my code/book picks disjoint from it
const IRC = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc", UDD = "/Users/mlacy/Documents/data/ud", G2 = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gitenberg/";
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex"), J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const man = { made: "2026-10-07", uses: {} };
const sibMan = (() => { try { return J(path.join(SIB, "data", "manifest.json")); } catch { return null; } })();

// 1. UD fresh: the TRAIN split (first part in name order) of every treebank in /Users/mlacy/Documents/data/ud that has one. Windows are drawn in confirm.mjs.
const udFiles = {};
for (const tb of fs.readdirSync(UDD).sort()) { const d = path.join(UDD, tb); if (!fs.statSync(d).isDirectory()) continue; const f0 = fs.readdirSync(d).filter((f) => /-ud-train(-[a-z0-9]+)?\.conllu$/.test(f)).sort(); if (f0.length) udFiles[tb] = path.join(d, f0[0]); }
let udUsedElsewhere = []; try { udUsedElsewhere = execFileSync("grep", ["-rIl", "Documents/data/ud", EVAL, "--include=*.mjs", "--include=*.js", "--include=*.json"], { maxBuffer: 1 << 26 }).toString().split("\n").filter((x) => x && !x.includes("confirm-PM-R")); } catch {}
man.ud = { rule: "one register per treebank with a *-ud-train*.conllu (first part in name order); window of consecutive sentences from a seeded random start to >= 40000 non-PUNCT word units (whole file if smaller), drawn in confirm.mjs from seedFor('pm-r2-confirm', treebank, 'window')", files: udFiles, n: Object.keys(udFiles).length, windowTokens: 40000, filesOutsideConfirmDirsThatMentionTheUdDir: udUsedElsewhere };

// 2. IRC: English days only (the scoper read ALL 32 non-English days). Tiers by who mentioned the day id anywhere in the eval tree (outside my dir and the concurrent sibling's dir).
const hdr = (p) => { const h = fs.readFileSync(p, "utf8").slice(0, 400), m = /messages: "(\d+)"/.exec(h), l = /lang: "(\w+)"/.exec(h); return { n: m ? +m[1] : 0, lang: l ? l[1] : "?" }; };
const all = [];
for (const ch of fs.readdirSync(IRC)) { const d = path.join(IRC, ch); if (!fs.statSync(d).isDirectory()) continue; for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".txt")).sort()) all.push({ id: `${ch}/${f}`, ch, ...hdr(path.join(d, f)) }); }
const RE = "(ubuntu-server|ubuntu-de|ubuntu-es|ubuntu-it|kubuntu|xubuntu|ubuntu)/[0-9]{4}-[0-9]{2}-[0-9]{2}";
const mention = new Map(); // day id -> Set of top-level places
try {
  const out = execFileSync("grep", ["-rIoE", RE, EVAL, "--exclude-dir=node_modules", "--exclude-dir=confirm-PM-R2-left-company-polarity", "--exclude-dir=confirm-PM-R1-unit-initial-excess"], { maxBuffer: 1 << 28 }).toString();
  for (const ln of out.split("\n")) { const i = ln.indexOf(":"); if (i < 0) continue; const file = ln.slice(0, i), id = ln.slice(i + 1) + ".txt", rel = path.relative(EVAL, file).split(path.sep), place = rel[0] === "law" && rel[1] === "provisional" ? `provisional/${rel[2]}` : rel[0] === "law" ? `law/${rel[1].replace(/\.[a-z]+$/, "")}` : rel[0] === "kinds-swarm" ? `kinds-swarm/${rel[1]}` : rel[0]; (mention.get(id) ?? mention.set(id, new Set()).get(id)).add(place); }
} catch (e) { console.error("grep failed", String(e.message).slice(0, 100)); }
const only3 = (s) => [...s].every((p) => p.startsWith("provisional/") && p !== "provisional/polarity-map");
const en = all.filter((x) => x.lang === "en");
const tier = (x) => { const s = mention.get(x.id); return !s ? "T0_never" : s.has("provisional/polarity-map") || ![...s].every((p) => p.startsWith("provisional/")) ? "TX_excluded" : "T3_lens"; };
const cls = en.map((x) => ({ ...x, tier: tier(x) }));
man.irc = {
  rule: "English days of the 7 ubuntu-irc channels. T0_never = day id mentioned nowhere in the eval tree (outside my dir and the concurrent PM-R1 sibling's dir): PRIMARY chat register (pooled, bins from the pooled stream). T3_lens = mentioned only by other provisional scoping lenses (read for company/first-mention statistics, never for DLx or rareL_edge): SECONDARY registers, one per channel. TX_excluded = mentioned by the polarity-map scoper (disc/conf 48 days), an earlier name test (name-rule-informal, name-company, name-floor1), kinds-swarm or any non-provisional law file: EXCLUDED. Non-English days: all 32 were read by the scoper -> none fresh.",
  nEnDays: en.length, nNonEnDays: all.length - en.length, tierCounts: Object.fromEntries(["T0_never", "T3_lens", "TX_excluded"].map((t) => [t, cls.filter((x) => x.tier === t).length])),
  T0_never: cls.filter((x) => x.tier === "T0_never").map((x) => ({ id: x.id, n: x.n })),
  T3_lensByChannel: Object.fromEntries([...new Set(cls.filter((x) => x.tier === "T3_lens").map((x) => x.ch))].sort().map((c) => [c, cls.filter((x) => x.tier === "T3_lens" && x.ch === c).map((x) => ({ id: x.id, n: x.n }))])),
  TX_excluded: cls.filter((x) => x.tier === "TX_excluded").map((x) => x.id), sibling_neverReadByAnyone_for_crosscheck: sibMan?.irc?.neverReadByAnyone ?? null,
  allNonEnDaysExcluded: all.filter((x) => x.lang !== "en").map((x) => x.id),
};

// 3. Books: English novels of gitenberg/ (none used by the scoper, the discovery agents or the PM-R1 sibling). Fixed novel list written BEFORE any token count; >= 60000 word tokens; hash order; 6 books.
const NOVELS = ["pg120_Treasure-Island.txt", "pg1400_Great-Expectations.txt", "pg158_Emma.txt", "pg161_Sense-and-Sensibility.txt", "pg215_The-Call-of-the-Wild.txt", "pg2554_Crime-and-Punishment.txt", "pg35_The-Time-Machine.txt", "pg36_The-War-of-the-Worlds.txt", "pg45_Anne-of-Green-Gables.txt", "pg514_Little-Women.txt", "pg521_The-Life-and-Adventures-of-Robinson-Crusoe.txt", "pg55_The-Wonderful-Wizard-of-Oz.txt", "pg768_Wuthering-Heights.txt", "pg829_Gulliver-s-Travels.txt", "pg219_Heart-of-Darkness.txt", "pg236_The-Jungle-Book.txt"];
const nTok = (f) => { let t = fs.readFileSync(G2 + f, "utf8"); const a = t.indexOf("*** START OF"), b = t.indexOf("*** END OF"); if (a >= 0) t = t.slice(t.indexOf("\n", a) + 1, b > a ? b : undefined); return (t.match(/[\p{L}\p{M}\p{N}'’]+/gu) ?? []).length; };
const bk = NOVELS.filter((f) => fs.existsSync(G2 + f)).map((f) => ({ file: f, tokens: nTok(f), sha: sha(fs.readFileSync(G2 + f)) })).filter((x) => x.tokens >= 60000).sort((a, b) => sha("pm-r2-confirm-books|" + a.file).localeCompare(sha("pm-r2-confirm-books|" + b.file)));
man.books = { rule: "gitenberg NOVELS list (fixed in this file) with >= 60000 word tokens, hash order sha256('pm-r2-confirm-books|'+file), first 6", candidates: bk.map((x) => x.file), picked: bk.slice(0, 6).map((x) => ({ name: "book-" + x.file.replace(/^pg\d+_/, "").replace(/\.txt$/, "").toLowerCase(), file: G2 + x.file, tokens: x.tokens, sha: x.sha })) };

// 4. Code: ant-code's candidate pools and checks, NEW salt; EXCLUDED = ant-code's files (24 + 8 rb), the scoper's 24, the PM-R1 sibling's 32.
const H = (p) => sha("pm-r2-confirm-fresh|" + p);
const walk = (d, test, out = []) => { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return out; } for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory()) { if (test.skipDir(p, e.name)) continue; walk(p, test, out); } else if (test.file(e.name)) out.push(p); } return out; };
const ok = (p, lo, hi) => { let st; try { st = fs.statSync(p); } catch { return false; } if (st.size < lo * 1024 || st.size > hi * 1024) return false; const s = fs.readFileSync(p, "utf8"); const n = s.split("\n").length; return n >= 500 && s.length / n <= 100 && !/@generated|sourceMappingURL|DO NOT EDIT/i.test(s.slice(0, 3000)); };
const NATIVE = "/Users/mlacy/Documents/3.0/khora/native", NM = "/Users/mlacy/Documents/jupyter/node_modules", RB = "/System/Library/Frameworks/Ruby.framework/Versions/2.6/usr/lib/ruby/2.6.0";
const PYLIB = "/opt/homebrew/Cellar/python@3.14/3.14.7/Frameworks/Python.framework/Versions/3.14/lib/python3.14";
const used = new Set([...Object.values(J(path.join(AC, "data", "files.json"))).flat().map((x) => x?.file).filter(Boolean), ...[...J(path.join(PM, "results", "confirm-code-files.json")).js, ...J(path.join(PM, "results", "confirm-code-files.json")).py].map((x) => x.file), ...(sibMan?.code ? [...sibMan.code.js, ...sibMan.code.py].map((x) => x.file) : [])]);
const skipA = (p, n) => n === "node_modules" || n === "results" || n === "data" || n === "logs" || n === "kinds-swarm" || n === "provisional" || n.startsWith(".") || /tests?$|fixtures?$/.test(n);
const A = walk(NATIVE, { skipDir: skipA, file: (n) => /\.(m?js)$/.test(n) && !/\.min\./.test(n) }).filter((p) => !used.has(p) && ok(p, 20, 150));
const B = walk(NM, { skipDir: (p, n) => /^(tests?|__tests__|test-.*|fixtures?|esm|umd|browser|\.bin|\.cache)$/.test(n) || n.startsWith("."), file: (n) => /\.js$/.test(n) && !/\.min\.|\.d\./.test(n) }).filter((p) => !used.has(p) && ok(p, 20, 150));
const P = walk(PYLIB, { skipDir: (p, n) => /^(test|tests|idlelib|lib2to3|site-packages|turtledemo|__pycache__|config-.*|ensurepip|pydoc_data|_pyrepl|tkinter|distutils|encodings)$/.test(n), file: (n) => n.endsWith(".py") }).filter((p) => !used.has(p) && ok(p, 20, 120));
const R = walk(RB, { skipDir: (p, n) => /^(test|tests|rdoc|rubygems|bundler|rexml|racc|did_you_mean|irb|rake)$/.test(n), file: (n) => n.endsWith(".rb") }).filter((p) => !used.has(p) && ok(p, 20, 120));
const lexPy = (p) => JSON.parse(execFileSync("python3", [path.join(AC, "lex_py.py"), p], { maxBuffer: 1 << 28 }));
const lexRb = (p) => JSON.parse(execFileSync("ruby", [path.join(AC, "lex_rb.rb"), p], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }));
const pick = (pool, n, keyOf, maxPer, lex) => { const order = pool.slice().sort((a, b) => H(a).localeCompare(H(b))); const per = new Map(), out = [], skipped = []; for (const p of order) { if (out.length >= n) break; const k = keyOf(p); if ((per.get(k) ?? 0) >= maxPer) continue; let d; try { d = lex(p); } catch (e) { skipped.push([p, String(e.message).slice(0, 60)]); continue; } if (d.units.length < 500) { skipped.push([p, `units ${d.units.length}`]); continue; } per.set(k, (per.get(k) ?? 0) + 1); out.push({ file: p, lex: d }); } return { out, skipped }; };
const ja = pick(A, 6, (p) => path.dirname(p), 1, lexJs), jb = pick(B, 6, (p) => p.slice(NM.length + 1).split("/")[0], 1, lexJs), py = pick(P, 12, (p) => p.slice(PYLIB.length + 1).split("/")[0], 2, lexPy), rb = pick(R, 8, (p) => p.slice(RB.length + 1).split("/")[0], 2, lexRb);
fs.mkdirSync(path.join(HERE, "data", "lex"), { recursive: true });
const js = [...ja.out.map((x) => ({ ...x, pool: "khora" })), ...jb.out.map((x) => ({ ...x, pool: "node_modules" }))];
js.forEach((x, i) => fs.writeFileSync(path.join(HERE, "data", "lex", `js-${i}.json`), JSON.stringify(x.lex)));
py.out.forEach((x, i) => fs.writeFileSync(path.join(HERE, "data", "lex", `py-${i}.json`), JSON.stringify(x.lex)));
rb.out.forEach((x, i) => fs.writeFileSync(path.join(HERE, "data", "lex", `rb-${i}.json`), JSON.stringify(x.lex)));
man.code = { rule: "ant-code select_files hash order with salt 'pm-r2-confirm-fresh' minus ant-code's files, the scoper's 24 and the PM-R1 sibling's 32", counts: { A: A.length, B: B.length, P: P.length, R: R.length, excluded: used.size }, js: js.map((x) => ({ file: x.file, pool: x.pool, units: x.lex.units.length })), py: py.out.map((x) => ({ file: x.file, units: x.lex.units.length })), rb: rb.out.map((x) => ({ file: x.file, units: x.lex.units.length })), skipped: { ja: ja.skipped.length, jb: jb.skipped.length, py: py.skipped.length, rb: rb.skipped.length } };
fs.writeFileSync(path.join(HERE, "data", "manifest.json"), JSON.stringify(man, null, 1));
console.log(JSON.stringify({ ud: { n: man.ud.n, mentionedElsewhere: udUsedElsewhere.length }, irc: { nEn: man.irc.nEnDays, tiers: man.irc.tierCounts, T0: man.irc.T0_never.map((x) => `${x.id}:${x.n}`), T3ch: Object.fromEntries(Object.entries(man.irc.T3_lensByChannel).map(([k, v]) => [k, v.length])), sib: man.irc.sibling_neverReadByAnyone_for_crosscheck }, books: man.books.picked.map((b) => `${b.name}:${b.tokens}`), code: { counts: man.code.counts, js: man.code.js.length, py: man.code.py.length, rb: man.code.rb.length, skipped: man.code.skipped } }, null, 1));
console.log("manifest sha256", sha(fs.readFileSync(path.join(HERE, "data", "manifest.json"), "utf8")));

// select_rb.mjs -- ant-code: result-blind selection of 8 Ruby stdlib files (system ruby 2.6), same mechanical rule as select_files.mjs (size 20-120KB, >=500 lines, mean line <=100, <=2 per top-level
// module, hash order sha256("ant-code-select|"+path), lexer must give >= 500 units). EXPLORATORY third language: appended to data/files.json as "rb".
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { execFileSync } from "node:child_process";
const RB = "/System/Library/Frameworks/Ruby.framework/Versions/2.6/usr/lib/ruby/2.6.0", HERE = path.dirname(new URL(import.meta.url).pathname);
const H = (p) => crypto.createHash("sha256").update("ant-code-select|" + p).digest("hex");
const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(test|tests|rdoc|rubygems|bundler|rexml|racc|did_you_mean|irb|rake)$/.test(e.name)) walk(p, o); } else if (e.name.endsWith(".rb")) o.push(p); } return o; };
const ok = (p) => { const st = fs.statSync(p); if (st.size < 20 * 1024 || st.size > 120 * 1024) return false; const s = fs.readFileSync(p, "utf8"); const n = s.split("\n").length; return n >= 500 && s.length / n <= 100; };
const pool = walk(RB).filter(ok).sort((a, b) => H(a).localeCompare(H(b))), per = new Map(), out = [], skipped = [];
for (const p of pool) { if (out.length >= 8) break; const k = p.slice(RB.length + 1).split("/")[0]; if ((per.get(k) ?? 0) >= 2) continue;
  try { const d = JSON.parse(execFileSync("ruby", [path.join(HERE, "lex_rb.rb"), p], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] })); if (d.units.length < 500) { skipped.push([p, "units"]); continue; } } catch { skipped.push([p, "lexer"]); continue; }
  per.set(k, (per.get(k) ?? 0) + 1); out.push({ file: p, pool: "ruby-stdlib" }); }
const f = path.join(HERE, "data", "files.json"), j = JSON.parse(fs.readFileSync(f, "utf8")); j.rb = out; j.skipped.rb = skipped; fs.writeFileSync(f, JSON.stringify(j, null, 1));
console.log(out.map((x) => x.file.replace(RB + "/", "")).join(" "), "| candidates", pool.length, "skipped", skipped.length);

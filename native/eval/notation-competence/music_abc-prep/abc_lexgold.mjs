// Gold lexemes for ABC text: element spans from abcjs 6.7.1 (independent ABC parser, MIT). One JSON line per input file.
import abcjs from "/private/tmp/claude-501/notation/music_abc/tools/node_modules/abcjs/index.js";
import fs from "node:fs";
const out = {};
for (const f of process.argv.slice(2)) {
  const txt = fs.readFileSync(f, "utf8");
  try {
    const t = abcjs.parseOnly(txt)[0];
    const els = [];
    for (const line of t.lines) {
      if (!line.staff) continue;
      line.staff.forEach((st, si) => st.voices.forEach((v, vi) => v.forEach((el) => {
        if (el.startChar == null) return;
        els.push({ s: el.startChar, e: el.endChar, t: el.el_type, n: el.pitches ? el.pitches.length : 0, r: el.rest ? el.rest.type : null, st: si, v: vi });
      })));
    }
    out[f] = { ok: true, els };
  } catch (e) { out[f] = { ok: false, err: String(e.message).slice(0, 100) }; }
}
process.stdout.write(JSON.stringify(out));

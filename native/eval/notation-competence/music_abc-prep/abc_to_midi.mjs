// Independent ABC ENGINE as validator: abcjs 6.7.1 (MIT) renders each derived ABC line text to a MIDI file.
// The validation copy gets `%%MIDI gchord z` after the X: line (an all-rest chord pattern: abcjs does not honour gchordoff) so accompaniment tracks add no notes;
// the benchmarked ABC text itself is NOT modified.
import abcjs from "/private/tmp/claude-501/notation/music_abc/tools/node_modules/abcjs/index.js";
import fs from "node:fs";
import path from "node:path";
const ROOT = "/private/tmp/claude-501/notation/music_abc/derived";
const inDir = path.join(ROOT, "lines"), outDir = path.join(ROOT, "midi");
fs.mkdirSync(outDir, { recursive: true });
const only = process.argv[2] ? new Set(fs.readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean)) : null;
let ok = 0, bad = 0; const errs = {};
for (const f of fs.readdirSync(inDir)) {
  if (!f.endsWith(".abc")) continue;
  if (only && !only.has(f)) continue;
  const txt = fs.readFileSync(path.join(inDir, f), "utf8").replace(/^X:1\n/, "X:1\n%%MIDI gchord z\n");
  try {
    const midi = abcjs.synth.getMidiFile(txt, { midiOutputType: "binary" });
    fs.writeFileSync(path.join(outDir, f.replace(/\.abc$/, ".mid")), Buffer.from(midi[0]));
    ok++;
  } catch (e) { bad++; errs[e.message.slice(0, 80)] = (errs[e.message.slice(0, 80)] || 0) + 1; }
}
console.log(JSON.stringify({ ok, bad, errs }));

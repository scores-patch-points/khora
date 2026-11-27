// expression-library-build.mjs — build the phrase inventory from Zenodotus's casual-chat corpora (read only) and write it, with its provenance, to
// ~/.khora/expressions/casual.json. Three genres: the support channel (Ubuntu and Kubuntu IRC, writers are nicks), text messages (NUS SMS, writers are
// contributors), Singlish chat (CoSEM, writers are conversations). A phrase is kept when at least three different writers typed it.
//   node native/organs/expression-library-build.mjs [--zenodotus <dir>] [--out <file>] [--show]
// A first design built reply PAIRS from the IRC logs (a line that begins "nick," answers that nick's last line). It was measured and abandoned: after the
// same filters (three writers, ordinary-talk vocabulary, no particulars) 15 prompts and 16 replies were left, and the held-out logs gave 10 test pairs.
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import crypto from "node:crypto";
import { buildInventory, makeLibrary } from "./expression-library.js";
import { makeTrailStore } from "./trail-store.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const ZEN = arg("--zenodotus", path.resolve(new URL("../../../Zenodotus", import.meta.url).pathname));
const OUT = arg("--out", path.join(os.homedir(), ".khora", "expressions", "casual.json"));
const C = path.join(ZEN, "19-organic-community");

export function rowsOfCorpora() {
  const rows = [], files = [];
  for (const [genre, dir] of [["sms", "nus-sms/en"], ["singlish", "cosem"]]) { const d = path.join(C, dir); if (!fs.existsSync(d)) continue; for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".txt")).sort()) { files.push(`${dir}/${f}`); for (const line of fs.readFileSync(path.join(d, f), "utf8").split("\n").slice(9)) if (line.trim()) rows.push({ text: line, genre, writer: f }); } }
  for (const ch of ["ubuntu", "kubuntu"]) { const d = path.join(C, "ubuntu-irc", ch); if (!fs.existsSync(d)) continue; for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".txt")).sort()) { files.push(`ubuntu-irc/${ch}/${f}`); for (const raw of fs.readFileSync(path.join(d, f), "utf8").split("\n")) { if (!raw.startsWith("<")) continue; const e = raw.indexOf("> "); if (e > 0) rows.push({ text: raw.slice(e + 2), genre: "support-channel", writer: raw.slice(1, e).toLowerCase() }); } } }
  return { rows, files };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const { rows, files } = rowsOfCorpora(), sha = crypto.createHash("sha256").update(files.join("|")).digest("hex").slice(0, 16);
  const data = buildInventory(rows, { source: { corpus: "Zenodotus 19-organic-community (nus-sms/en, cosem, ubuntu-irc/ubuntu+kubuntu)", files: files.length, filesSha: sha, builtOn: new Date().toISOString().slice(0, 10) } });
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(data));
  const by = {}; for (const p of data.phrases) for (const [g, n] of Object.entries(p.genres)) if (n >= 2) by[g] = (by[g] ?? 0) + 1;
  console.log(`rows ${rows.length} from ${files.length} files; phrases typed by >= ${data.minWriters} different people: ${data.phrases.length}; with 2+ writers in a genre: ${JSON.stringify(by)}\nwrote ${OUT}`);
  if (process.argv.includes("--show")) {
    const { makeEmbedder } = await import("../adapters/text/embed-personhood.js"); const e = makeEmbedder({ prefix: "classification: " });
    const trails = makeTrailStore({ file: path.join(os.tmpdir(), `expr-demo-${process.pid}.json`) }), L = makeLibrary(data, { embed: (t) => e.embed(t), trails });
    for (const intent of ["you're welcome", "hello", "goodbye", "I don't know", "okay, got it", "no worries", "sorry about that", "that's funny"]) for (const genre of [null, "singlish", "support-channel"]) { const draws = []; for (let s = 1; s <= 12; s++) { const r = await L.say(intent, { seed: s, genre, thread: `demo-${s}` }); draws.push(r.gap ? "∅" : r.text); } console.log(`${intent.padEnd(18)} [${(genre ?? "any").padEnd(15)}] ${[...new Set(draws)].join(" | ")}`); }
    e.save(); process.exit(0);
  }
}

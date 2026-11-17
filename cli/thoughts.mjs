#!/usr/bin/env node
// cli/thoughts.mjs — the canonical thoughts-and-competence pipeline for one text (EXPERIMENTAL; native/docs/THOUGHTS.md).
//   node cli/thoughts.mjs --text book.txt [--weft book.weft.json] [--out result.json] [--pharos pointer.json --log name --dir logdir]
// 1. read the text through the one reader (native/the-fold/read-process.mjs::readToWeft), or take a weft already read;
// 2. attach every clause argument to a cast referent (adapters/text/clause-attach.js; the presence rung with its CHOSEN dials);
// 3. propose thoughts from the first two thirds, assess hindsight and foresight (organs/thoughts.js);
// 4. with --pharos: record the admitted thoughts into the pharos with byte-address citations, retract the ones that did not pay, then REPLAY the log.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i < 0 ? null : process.argv[i + 1]; };
const textFile = arg("text"); if (!textFile) { console.error("usage: node cli/thoughts.mjs --text book.txt [--weft w.json] [--out r.json] [--pharos pointer.json --log name --dir dir]"); process.exit(2); }
const text = fs.readFileSync(textFile, "utf8"); const { attachClauses } = await imp("native/adapters/text/clause-attach.js"); const T = await imp("native/organs/thoughts.js");
let weft; if (arg("weft")) weft = JSON.parse(fs.readFileSync(arg("weft"), "utf8")); else { const { readToWeft } = await imp("native/the-fold/read-process.mjs"); weft = readToWeft(text, { address: `book:${path.basename(textFile)}`, language: "eng" }); if (weft.error) { console.error("reader error:", weft.error); process.exit(1); } }
const tracked = attachClauses(text, weft); const B = T.streamOf({ text, weft, tracked }); const res = T.assessThoughts(B);
const adm = res.thoughts.filter((x) => x.admitted); const by = (k) => adm.filter((x) => x.kind === k).length;
console.log(`events ${res.events} | candidates ${res.thoughts.length}, admitted ${adm.length} (rule ${by("rule")}, wormhole ${by("wormhole")}, synapse ${by("synapse")}, expressway ${by("expressway")}) | hindsight ${res.jointHind.toFixed(1)} bits, foresight ${res.jointFore.toFixed(1)} of ${res.baseForeBits.toFixed(0)} (competence ${(100 * res.competence).toFixed(2)}%) | without the rule ${res.realNoRuleFore.toFixed(1)} bits, random null ${res.nullFore.toFixed(1)}`);
let rec = null;
if (arg("pharos")) {
  const { openDoor } = await imp("cli/pharos-door.mjs"); process.env.PHAROS_FORMAT ||= "phb";
  const dir = arg("dir") ?? path.join(path.dirname(arg("pharos")), "thoughts-log"); fs.mkdirSync(dir, { recursive: true });
  const door = await openDoor({ pointer: arg("pharos"), log: arg("log") ?? "thoughts", dir, writer: "thoughts" }); if (!door.on) { console.error("pharos door off:", door.why); process.exit(1); }
  const source = crypto.createHash("sha256").update(text).digest("hex"); T.recordThoughts({ door, B, res, source, bookId: path.basename(textFile) });
  rec = T.replayThoughts({ door, B, res }); console.log(`pharos: ${door.counts.woven} entries written; replay ${rec.replayMatch ? "EXACT" : "MISMATCH"}; retractions ${rec.retractions}`);
}
if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify({ ...res, replay: rec }, null, 1));

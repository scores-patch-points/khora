// prep-windows2.mjs: DATA PREPARATION for the round-2 replicate (no outcome is computed; not a test). For each stem, cut a SECOND contiguous TRAIN window of the same sentence count as window 1
// (windows/<stem>.json), disjoint from it (before or after, whichever side has room, offset seeded), to windows2/<stem>.json. Stems without room are listed and skipped.
//   NAME_COMPANY_PAIRBLOCK=1 node prep-windows2.mjs
import fs from "node:fs";
import path from "node:path";
import { HERE, TB, readConllu, rngFor, seedFor, describe, round } from "./lib.mjs";
const OUT = path.join(HERE, "windows2"); fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(path.join(HERE, "windows")).filter((x) => x.endsWith(".json")).sort()) {
  const w1 = JSON.parse(fs.readFileSync(path.join(HERE, "windows", f), "utf8")), stem = w1.stem, take = w1.taken, N = w1.trainSentences;
  const left = w1.offset, right = N - (w1.offset + take), side = right >= left ? "right" : "left", room = Math.max(left, right);
  if (room < take) { console.error(stem, "NO ROOM", { N, take, off1: w1.offset }); continue; }
  const tr = readConllu(path.join(TB, stem === "kor" ? "kor-gsd" : stem, "train.conllu")); if (tr.sents.length !== N) { console.error(stem, "SIZE MISMATCH", tr.sents.length, N); continue; }
  const slack = room - take, rel = Math.floor(rngFor(seedFor("confirm-R1", "window2", stem))() * (slack + 1)), off = side === "right" ? w1.offset + take + rel : rel;
  const sents = tr.sents.slice(off, off + take), upos = tr.upos.slice(off, off + take), d = describe(sents);
  fs.writeFileSync(path.join(OUT, stem + ".json"), JSON.stringify({ stem, side, offset: off, taken: take, trainSentences: N, window1Offset: w1.offset, sents, upos }));
  console.error(stem, "side", side, "off", off, "taken", take, "tokens", d.tokens, "fwc32", round(d.fwc32));
}
